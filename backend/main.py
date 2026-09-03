import argparse

import uvicorn

from backend.api import create_app
from backend.config import HOST, PORT
from backend.processors import PROCESSOR_FACTORIES

app = create_app([])


def parse_arguments() -> argparse.Namespace:
    """Parse the processors that the local server should expose."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "processors",
        nargs="*",
        choices=PROCESSOR_FACTORIES,
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_arguments()
    uvicorn.run(create_app(arguments.processors), host=HOST, port=PORT)
