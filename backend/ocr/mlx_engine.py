import asyncio
import base64
import logging
from pathlib import Path

import httpx
from openai import OpenAI

from backend.config import JOB_TIMEOUT, MLX_PORT, MODEL_PATH

LOG = logging.getLogger("daily-utils.mlx")


class MLXEngine:
    """Owns one MLX server process and reuses its loaded model for jobs."""

    def __init__(self) -> None:
        """Prepare the local client without starting an expensive model process."""
        self.process: asyncio.subprocess.Process | None = None
        self.client = OpenAI(
            base_url=f"http://127.0.0.1:{MLX_PORT}/v1", api_key="local"
        )
        self._start_lock = asyncio.Lock()

    async def is_healthy(self) -> bool:
        """Check whether the MLX server is accepting health requests."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://127.0.0.1:{MLX_PORT}/health", timeout=1
                )
                return response.is_success
        except (httpx.HTTPError, OSError):
            return False

    async def ensure_running(self) -> None:
        """Start the MLX server once and wait until its HTTP endpoint is ready."""
        if await self.is_healthy():
            return
        async with self._start_lock:
            if await self.is_healthy():
                return
            LOG.info("Starting MLX server with model %s", MODEL_PATH)
            self.process = await asyncio.create_subprocess_exec(
                "mlx_vlm.server",
                "--port",
                str(MLX_PORT),
                "--model",
                MODEL_PATH,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.STDOUT,
            )
            for _ in range(60):
                if await self.is_healthy():
                    LOG.info("MLX server is ready")
                    return
                await asyncio.sleep(1)
            raise RuntimeError("MLX server failed to start within 60 seconds")

    async def ocr(self, image_path: Path) -> str:
        """Convert one image to markdown using the shared MLX model."""
        await self.ensure_running()
        image_type = image_path.suffix.lstrip(".").lower() or "png"
        image_bytes = await asyncio.to_thread(image_path.read_bytes)
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return await asyncio.wait_for(
            asyncio.to_thread(
                self._complete, f"data:image/{image_type};base64,{encoded}"
            ),
            timeout=JOB_TIMEOUT,
        )

    def _complete(self, image_url: str) -> str:
        """Send one multimodal completion request through the OpenAI client."""
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
        )
        return response.choices[0].message.content or ""

    async def stop(self) -> None:
        """Terminate and reap the child server when the API shuts down."""
        if self.process is None or self.process.returncode is not None:
            return
        self.process.terminate()
        try:
            await asyncio.wait_for(self.process.wait(), timeout=5)
        except TimeoutError:
            self.process.kill()
            await self.process.wait()
        finally:
            self.process = None
