from backend.ocr.layout import OCRBlock, parse_deepseek_blocks, xy_cut_sort


def test_parse_deepseek_blocks_adds_heading_markdown() -> None:
    raw_text = "<|ref|>title<|/ref|><|det|>[[1, 2, 30, 40]]<|/det|>Report"

    blocks = parse_deepseek_blocks(raw_text)

    assert blocks[0].content == "# Report"
    assert blocks[0].bbox == (1, 2, 30, 40)


def test_xy_cut_sort_reads_left_column_before_right_column() -> None:
    blocks = [
        OCRBlock("text", (60, 0, 100, 40), "right"),
        OCRBlock("text", (0, 50, 40, 90), "left bottom"),
        OCRBlock("text", (0, 0, 40, 40), "left top"),
        OCRBlock("text", (60, 50, 100, 90), "right bottom"),
    ]

    ordered = xy_cut_sort(blocks)

    assert [block.content for block in ordered] == [
        "left top",
        "left bottom",
        "right",
        "right bottom",
    ]


def test_parse_deepseek_blocks_returns_no_blocks_for_plain_text() -> None:
    assert parse_deepseek_blocks("plain OCR output") == []
