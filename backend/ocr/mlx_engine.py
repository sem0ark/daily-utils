import asyncio
import base64
import logging
import os
import shlex
import signal
import subprocess
from pathlib import Path

import httpx
from openai import OpenAI

from backend.config import JOB_TIMEOUT, MLX_PORT, MODEL_PATH
from backend.ocr.layout import parse_deepseek_blocks, xy_cut_sort

LOG = logging.getLogger("daily-utils.mlx")


class MLXEngine:
    """Manages an MLX server as a detached background process."""

    def __init__(self) -> None:
        self.client = OpenAI(
            base_url=f"http://127.0.0.1:{MLX_PORT}/v1", api_key="local"
        )
        self._start_lock = asyncio.Lock()
        self.model_type = "deepseek" if "deepseek" in MODEL_PATH.lower() else "generic"
        LOG.info("Initialized MLXEngine with model type: %s", self.model_type)

    def _get_pids_by_port(self) -> list[int]:
        """Find every process listening on the configured port."""
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{MLX_PORT}"],
                capture_output=True,
                text=True,
                check=False,
            )
            return [
                int(pid) for pid in result.stdout.splitlines() if pid.strip().isdigit()
            ]
        except (OSError, ValueError):
            return []

    def _start_server(self) -> None:
        """Start the MLX server in the backend virtual environment."""
        command = (
            "source .venv/bin/activate && exec mlx_vlm.server "
            f"--port {MLX_PORT} --model {shlex.quote(MODEL_PATH)}"
        )
        subprocess.Popen(
            ["bash", "-c", command],
            start_new_session=True,
        )

    def _kill_by_port(self) -> None:
        """Terminate every process currently using the MLX port."""
        for pid in self._get_pids_by_port():
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass

    async def is_healthy(self) -> bool:
        """Check whether the MLX server is accepting health requests."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://127.0.0.1:{MLX_PORT}/health", timeout=2
                )
                return response.status_code == 200
        except (httpx.HTTPError, OSError):
            return False

    async def ensure_running(self) -> None:
        """Starts the MLX server if it's not already running on the port."""
        if await self.is_healthy():
            return

        async with self._start_lock:
            # Double check after acquiring lock
            if await self.is_healthy():
                return

            # Clean up any zombie process on this port
            existing_pids = await asyncio.to_thread(self._get_pids_by_port)
            if existing_pids:
                LOG.info(
                    f"Cleaning up stale processes {existing_pids} on port {MLX_PORT}"
                )
                await asyncio.to_thread(self._kill_by_port)
                await asyncio.sleep(1)

            LOG.info(f"Starting detached MLX server: {MODEL_PATH} on port {MLX_PORT}")

            await asyncio.to_thread(self._start_server)

            # Wait for health check
            for i in range(60):
                if await self.is_healthy():
                    LOG.info(f"MLX server is ready (Attempt {i + 1})")
                    return
                await asyncio.sleep(1)

            raise RuntimeError("MLX server failed to start. Check the terminal output.")

    async def ocr(self, image_path: Path) -> str:
        """Convert one image to markdown using the shared MLX model."""
        await self.ensure_running()

        image_type = image_path.suffix.lstrip(".").lower() or "png"
        image_bytes = await asyncio.to_thread(image_path.read_bytes)
        encoded = base64.b64encode(image_bytes).decode("ascii")

        raw_output = await asyncio.wait_for(
            asyncio.to_thread(
                self._complete, f"data:image/{image_type};base64,{encoded}"
            ),
            timeout=JOB_TIMEOUT,
        )
        if self.model_type == "deepseek":
            return self._process_structured_output(raw_output)
        return raw_output

    def _process_structured_output(self, raw_text: str) -> str:
        """Parse, order, and reconstruct DeepSeek's detected page regions."""
        blocks = parse_deepseek_blocks(raw_text)
        if not blocks:
            return raw_text
        return "\n\n".join(
            block.content for block in xy_cut_sort(blocks) if block.content
        )

    def _complete(self, image_url: str) -> str:
        """Send completion request to the detached server."""
        response = self.client.chat.completions.create(
            model=MODEL_PATH,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "<|grounding|>Convert the document to markdown.",
                        },
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            max_tokens=4096,
            temperature=0.0,
        )
        return response.choices[0].message.content or ""

    async def stop(self) -> None:
        """Stop every MLX server process using the configured port."""
        pids = await asyncio.to_thread(self._get_pids_by_port)
        if pids:
            LOG.info(f"Stopping MLX server processes {pids}")
            await asyncio.to_thread(self._kill_by_port)
