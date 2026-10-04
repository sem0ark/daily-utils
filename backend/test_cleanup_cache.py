from pathlib import Path

import pytest

from backend import cleanup_cache


def test_find_repetition_metric_returns_strongest_repeated_ngram() -> None:
    text = "prefix " + "\\dots" * 40 + " suffix"

    metric = cleanup_cache.find_repetition_metric(text)

    assert metric is not None
    assert metric.ngram == "\\dots"
    assert metric.ngram_length == 5
    assert metric.repetition_count == 40
    assert metric.start_offset == 7


def test_find_repetition_metric_ignores_short_repetition() -> None:
    text = "ordinary repeated words " * 10

    metric = cleanup_cache.find_repetition_metric(text)

    assert metric is None


def test_find_repetition_metric_normalizes_changing_latex_indices() -> None:
    text = "\\( \\alpha_{1} = " + " ".join(
        f"\\sin \\varphi_{{{index}}}" for index in range(1, 41)
    )

    metric = cleanup_cache.find_repetition_metric(text)

    assert metric is not None
    assert "<number>" in metric.ngram
    assert metric.repetition_count >= 20


def test_find_repetition_metric_ignores_short_numbered_pattern() -> None:
    text = " ".join(f"item {index}" for index in range(1, 21))

    metric = cleanup_cache.find_repetition_metric(text)

    assert metric is None


def test_clean_cache_files_applies_prefix_and_dry_run(tmp_path: Path) -> None:
    files_folder = tmp_path / "output"
    archive_folder = tmp_path / "archive"
    files_folder.mkdir()
    broken_file = files_folder / "target-cache.md"
    ignored_file = files_folder / "other-cache.md"
    broken_file.write_text("ab" * 40, encoding="utf-8")
    ignored_file.write_text("cd" * 40, encoding="utf-8")

    result = cleanup_cache.clean_cache_files(
        files_folder=files_folder,
        archive_folder=archive_folder,
        prefix="target",
        dry_run=True,
    )

    assert result == 0
    assert broken_file.exists()
    assert not archive_folder.exists()
    assert ignored_file.exists()


def test_clean_cache_files_moves_broken_file(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    files_folder = tmp_path / "output"
    archive_folder = tmp_path / "archive"
    files_folder.mkdir()
    broken_file = files_folder / "target-cache.md"
    broken_file.write_text("ab" * 40, encoding="utf-8")

    result = cleanup_cache.clean_cache_files(
        files_folder=files_folder,
        archive_folder=archive_folder,
        prefix="target",
        dry_run=False,
    )

    output = capsys.readouterr().out
    assert result == 0
    assert not broken_file.exists()
    assert (archive_folder / broken_file.name).exists()
    assert "moved:" in output
    assert "repetition_count=40" in output


def test_clean_cache_files_overwrites_archive_file(
    tmp_path: Path,
) -> None:
    files_folder = tmp_path / "output"
    archive_folder = tmp_path / "archive"
    files_folder.mkdir()
    archive_folder.mkdir()
    broken_file = files_folder / "target-cache.md"
    archived_file = archive_folder / broken_file.name
    broken_file.write_text("ab" * 40, encoding="utf-8")
    archived_file.write_text("old archive", encoding="utf-8")

    result = cleanup_cache.clean_cache_files(
        files_folder=files_folder,
        archive_folder=archive_folder,
        prefix="target",
        dry_run=False,
    )

    assert result == 0
    assert not broken_file.exists()
    assert archived_file.read_text(encoding="utf-8") == "ab" * 40


def test_clean_cache_files_returns_error_for_missing_folder(
    tmp_path: Path,
) -> None:
    result = cleanup_cache.clean_cache_files(
        files_folder=tmp_path / "missing",
        archive_folder=tmp_path / "archive",
        prefix="",
        dry_run=True,
    )

    assert result == 2
