import re
from dataclasses import dataclass


@dataclass
class OCRBlock:
    """Represent one detected OCR region and its page coordinates."""

    block_type: str
    bbox: tuple[int, int, int, int]
    content: str

    @property
    def x0(self) -> int:
        return self.bbox[0]

    @property
    def y0(self) -> int:
        return self.bbox[1]

    @property
    def x1(self) -> int:
        return self.bbox[2]

    @property
    def y1(self) -> int:
        return self.bbox[3]


DEEPSEEK_BLOCK_PATTERN = re.compile(
    r"<\|ref\|>(.*?)<\|/ref\|>\s*"
    r"<\|det\|>\[\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]\]"
    r"<\|/det\|>(.*?)(?=<\|ref\|>|\Z)",
    re.DOTALL,
)


def parse_deepseek_blocks(raw_text: str) -> list[OCRBlock]:
    """Extract DeepSeek detection tags and their associated markdown."""
    blocks: list[OCRBlock] = []
    for match in DEEPSEEK_BLOCK_PATTERN.finditer(raw_text):
        block_type = match.group(1).strip()
        coordinates = tuple(int(coordinate) for coordinate in match.groups()[1:5])
        content = match.group(6).strip()

        if block_type == "sub_title" and not content.startswith("#"):
            content = f"## {content}"
        elif block_type == "title" and not content.startswith("#"):
            content = f"# {content}"

        blocks.append(OCRBlock(block_type, coordinates, content))
    return blocks


def xy_cut_sort(blocks: list[OCRBlock]) -> list[OCRBlock]:
    """Sort detected blocks into their approximate reading order."""
    if len(blocks) <= 1:
        return blocks

    blocks_by_x = sorted(blocks, key=lambda block: block.x0)
    for index in range(len(blocks_by_x) - 1):
        if blocks_by_x[index + 1].x0 >= blocks_by_x[index].x1:
            return xy_cut_sort(blocks_by_x[: index + 1]) + xy_cut_sort(
                blocks_by_x[index + 1 :]
            )

    blocks_by_y = sorted(blocks, key=lambda block: block.y0)
    for index in range(len(blocks_by_y) - 1):
        if blocks_by_y[index + 1].y0 >= blocks_by_y[index].y1:
            return xy_cut_sort(blocks_by_y[: index + 1]) + xy_cut_sort(
                blocks_by_y[index + 1 :]
            )

    return sorted(blocks_by_y, key=lambda block: block.x0)
