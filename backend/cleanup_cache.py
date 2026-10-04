import argparse
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

MINIMUM_REPETITIONS = 20
MAXIMUM_NGRAM_LENGTH = 256
MINIMUM_NORMALIZED_REPEATED_CHARACTERS = 500

# uv run python cleanup-cache.py --dry-run --prefix "..." --files-folder "output" --archive-folder "archive"
# uv run python cleanup-cache.py --prefix "..." --files-folder "output" --archive-folder "archive"


@dataclass(frozen=True)
class RepetitionMetric:
    """Describe the strongest repeated character n-gram in a file."""

    ngram_length: int
    repetition_count: int
    start_offset: int
    ngram: str


def find_repetition_metric(
    text: str,
    minimum_repetitions: int = MINIMUM_REPETITIONS,
) -> RepetitionMetric | None:
    """Find exact or index-normalized n-gram repetition in generated text."""
    exact_metric = _find_exact_repetition_metric(text, minimum_repetitions)
    normalized_text = _normalize_variable_tokens(text)
    normalized_metric = _find_exact_repetition_metric(
        normalized_text,
        minimum_repetitions,
    )
    if normalized_metric is not None and (
        "<number>" not in normalized_metric.ngram
        or normalized_metric.ngram_length * normalized_metric.repetition_count
        < MINIMUM_NORMALIZED_REPEATED_CHARACTERS
    ):
        normalized_metric = None
    if exact_metric is None:
        return normalized_metric
    if normalized_metric is None:
        return exact_metric
    return (
        normalized_metric
        if _is_stronger(
            normalized_metric,
            exact_metric,
        )
        else exact_metric
    )


def _normalize_variable_tokens(text: str) -> str:
    """Replace numeric token values with a stable placeholder.

    The resulting match is accepted only for a long repeated span, preventing
    ordinary short numbered lists from being classified as broken output.
    """
    return re.sub(r"\d+(?:\.\d+)?", "<number>", text)


def _find_exact_repetition_metric(
    text: str,
    minimum_repetitions: int = MINIMUM_REPETITIONS,
) -> RepetitionMetric | None:
    """Find an n-gram repeated at least the required number of times.

    The scan compares adjacent chunks rather than counting occurrences anywhere
    in the file, so ordinary repeated words do not make a cache file broken.
    """
    if not text or minimum_repetitions < 2:
        return None

    maximum_ngram_length = min(
        MAXIMUM_NGRAM_LENGTH,
        len(text) // minimum_repetitions,
    )
    strongest_metric: RepetitionMetric | None = None

    for ngram_length in range(1, maximum_ngram_length + 1):
        repeated_pattern = re.compile(
            rf"(.{{{ngram_length}}})\1{{{minimum_repetitions - 1}}}",
            re.DOTALL,
        )
        for match in repeated_pattern.finditer(text):
            ngram = match.group(1)
            repetition_count = minimum_repetitions
            next_offset = match.start() + ngram_length * repetition_count
            while (
                next_offset + ngram_length <= len(text)
                and text[next_offset : next_offset + ngram_length] == ngram
            ):
                repetition_count += 1
                next_offset += ngram_length

            metric = RepetitionMetric(
                ngram_length=ngram_length,
                repetition_count=repetition_count,
                start_offset=match.start(),
                ngram=ngram,
            )
            if strongest_metric is None or _is_stronger(
                metric,
                strongest_metric,
            ):
                strongest_metric = metric

    return strongest_metric


def _is_stronger(
    candidate: RepetitionMetric,
    current: RepetitionMetric,
) -> bool:
    """Prefer the metric with the largest repeated character span."""
    candidate_span = candidate.ngram_length * candidate.repetition_count
    current_span = current.ngram_length * current.repetition_count
    candidate_values = (
        candidate_span,
        candidate.repetition_count,
        candidate.ngram_length,
    )
    current_values = (
        current_span,
        current.repetition_count,
        current.ngram_length,
    )
    return candidate_values > current_values


def format_ngram(ngram: str) -> str:
    """Return an escaped, compact representation suitable for CLI output."""
    return repr(ngram)


def inspect_file(file_path: Path) -> RepetitionMetric | None:
    """Read one cache file and return its broken-file metric, if any."""
    text = file_path.read_text(encoding="utf-8")
    return find_repetition_metric(text)


def clean_cache_files(
    files_folder: Path,
    archive_folder: Path,
    prefix: str,
    dry_run: bool,
) -> int:
    """Inspect files, report broken ones, and optionally move them."""
    if not files_folder.is_dir():
        print(
            f"error: files folder does not exist: {files_folder}",
            file=sys.stderr,
        )
        return 2

    for file_path in sorted(files_folder.iterdir()):
        if not file_path.is_file() or not file_path.name.startswith(prefix):
            continue

        try:
            metric = inspect_file(file_path)
        except (OSError, UnicodeError) as exception:
            print(
                f"error: could not inspect {file_path}: {exception}",
                file=sys.stderr,
            )
            continue

        if metric is None:
            continue

        destination_path = archive_folder / file_path.name
        repeated_characters = metric.ngram_length * metric.repetition_count
        metric_message = (
            f"{file_path} -> {destination_path}; "
            f"ngram_length={metric.ngram_length}, "
            f"repetition_count={metric.repetition_count}, "
            f"repeated_characters={repeated_characters}, "
            f"start_offset={metric.start_offset}, "
            f"ngram={format_ngram(metric.ngram)}"
        )

        if dry_run:
            print(f"would move: {metric_message}")
            continue

        try:
            archive_folder.mkdir(parents=True, exist_ok=True)
            shutil.move(str(file_path), str(destination_path))
            print(f"moved: {metric_message}")
        except OSError as exception:
            print(
                f"error: could not move {file_path}: {exception}",
                file=sys.stderr,
            )

    return 0


def build_argument_parser() -> argparse.ArgumentParser:
    """Build the command-line parser for cache cleanup."""
    parser = argparse.ArgumentParser(
        description="Move cache files containing repeated character n-grams.",
    )
    parser.add_argument(
        "--prefix",
        default="",
        help="Only inspect files whose names start with this prefix.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report broken files without moving them.",
    )
    parser.add_argument(
        "--files-folder",
        type=Path,
        default=Path("./output"),
        help="Folder containing cache files (default: ./output).",
    )
    parser.add_argument(
        "--archive-folder",
        type=Path,
        default=Path("./archive"),
        help="Folder receiving broken files (default: ./archive).",
    )
    return parser


def main() -> int:
    """Parse arguments and run cache cleanup."""
    parser = build_argument_parser()
    arguments = parser.parse_args()
    return clean_cache_files(
        files_folder=arguments.files_folder,
        archive_folder=arguments.archive_folder,
        prefix=arguments.prefix,
        dry_run=arguments.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
