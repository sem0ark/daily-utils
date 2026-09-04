import os

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,https://sem0ark.github.io"
)


HOST = os.getenv("DAILY_UTILS_HOST", "127.0.0.1")
PORT = int(os.getenv("DAILY_UTILS_PORT", "8888"))
MLX_PORT = int(os.getenv("MLX_SERVER_PORT", "11434"))
MODEL_PATH = os.getenv("MLX_MODEL", "mlx-community/DeepSeek-OCR-2-bf16")
MAX_FILE_SIZE = int(os.getenv("DAILY_UTILS_MAX_FILE_SIZE", str(100 * 1024 * 1024)))
JOB_TIMEOUT = int(os.getenv("DAILY_UTILS_JOB_TIMEOUT", "1800"))


def allowed_origins() -> list[str]:
    """Return configured browser origins without whitespace or empty values."""
    return [
        origin.strip()
        for origin in os.getenv(
            "DAILY_UTILS_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS
        ).split(",")
        if origin.strip()
    ]
