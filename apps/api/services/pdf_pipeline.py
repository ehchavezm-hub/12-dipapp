"""PDF ingestion pipeline: extraction, chunking, and sanitization."""
from __future__ import annotations

import io
import re
import unicodedata
from dataclasses import dataclass

import pdfplumber
import tiktoken


@dataclass
class DocumentChunk:
    """A single chunk of text extracted from a document."""

    content: str
    source: str
    chunk_index: int


async def extract_text_pdfplumber(data: bytes) -> str:
    """Open with pdfplumber, concatenate all page text."""
    try:
        text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception:
        return ""  # Let OCR fallback handle it; corrupt PDF handled upstream


async def extract_text_ocr(data: bytes) -> str:
    """Fallback: convert PDF pages to images, run pytesseract OCR.

    Only called if pdfplumber returns empty string.
    Returns empty string gracefully if tesseract or pdf2image is unavailable.
    """
    try:
        import pdf2image
        import pytesseract
    except ImportError:
        return ""

    try:
        images = pdf2image.convert_from_bytes(data)
        texts = [pytesseract.image_to_string(img) for img in images]
        return "\n".join(texts)
    except Exception:
        return ""


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
    """Split text into chunks of at most chunk_size tokens (cl100k_base).

    Each successive chunk overlaps the previous by `overlap` tokens.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)

    if not tokens:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        if end >= len(tokens):
            break
        start = end - overlap

    return chunks


def sanitize_chunks(chunks: list[DocumentChunk]) -> list[DocumentChunk]:
    """For each chunk:
    1. NFC normalize Unicode
    2. Strip non-printable chars (\\x00-\\x1f except \\n and \\t)
    3. Remove lines matching r"(?i)ignore\\s+(previous|all)\\s+instructions"
    """
    _injection_pattern = re.compile(r"(?i)ignore\s+(previous|all)\s+instructions")
    _nonprintable_pattern = re.compile(r"[\x00-\x08\x0b-\x1f]")

    result: list[DocumentChunk] = []
    for chunk in chunks:
        # 1. NFC normalize
        content = unicodedata.normalize("NFC", chunk.content)

        # 2. Strip non-printable chars (keep \n=0x0a and \t=0x09)
        content = _nonprintable_pattern.sub("", content)

        # 3. Remove lines matching prompt injection patterns
        lines = content.split("\n")
        lines = [line for line in lines if not _injection_pattern.search(line)]
        content = "\n".join(lines)

        result.append(DocumentChunk(
            content=content,
            source=chunk.source,
            chunk_index=chunk.chunk_index,
        ))

    return result


async def ingest_pdf_bytes(data: bytes, filename: str) -> list[DocumentChunk]:
    """Orchestrate: extract_text → chunk_text → sanitize_chunks → return list[DocumentChunk]."""
    # Extract text
    text = await extract_text_pdfplumber(data)

    # Fallback to OCR if pdfplumber returned nothing
    if not text.strip():
        text = await extract_text_ocr(data)

    # If still empty after both extractors, the PDF is likely corrupt/unreadable
    if not text.strip():
        raise ValueError(f"Could not extract text from PDF: {filename!r} (corrupt or image-only with no OCR)")

    # Chunk the text
    raw_chunks = chunk_text(text)

    # Build DocumentChunk objects
    doc_chunks = [
        DocumentChunk(content=chunk, source=filename, chunk_index=i)
        for i, chunk in enumerate(raw_chunks)
    ]

    # Sanitize
    return sanitize_chunks(doc_chunks)
