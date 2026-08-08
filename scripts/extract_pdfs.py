from pathlib import Path

from pypdf import PdfReader


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR_CANDIDATES = (
    PROJECT_ROOT / "documentation",
    PROJECT_ROOT / "document",
)
OUTPUT_DIR = PROJECT_ROOT / "documentation" / "extracted"


def normalize_title(path: Path) -> str:
    return path.stem.replace("_", " ").strip()


def extract_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    parts: list[str] = [f"# {normalize_title(pdf_path)}", ""]

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        parts.extend([f"## Page {index}", "", text or "[No extractable text]", ""])

    return "\n".join(parts).strip() + "\n"


def main() -> None:
    source_dir = next(
        (path for path in SOURCE_DIR_CANDIDATES if any(path.glob("*.pdf"))),
        None,
    )
    if source_dir is None:
        candidates = ", ".join(str(path) for path in SOURCE_DIR_CANDIDATES)
        raise SystemExit(f"No PDFs found in: {candidates}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(source_dir.glob("*.pdf"))

    for pdf_path in pdfs:
        output_path = OUTPUT_DIR / f"{pdf_path.stem}.md"
        output_path.write_text(extract_pdf(pdf_path), encoding="utf-8")
        print(f"Wrote {output_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
