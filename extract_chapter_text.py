#!/usr/bin/env python3
"""Extract main article text from kapitel1-8 HTML for NotebookLM."""
import re
from pathlib import Path

BASE = Path(__file__).parent
OUT = BASE / "podcast"

def extract_article_text(html: str) -> str:
    """Extract text from <article>...</article>, strip tags, keep terms inside legal-term."""
    m = re.search(r'<article>(.*?)</article>', html, re.DOTALL)
    if not m:
        return ""
    raw = m.group(1)
    # Replace block elements with newlines before stripping
    raw = re.sub(r'</(p|div|h[1-6]|li|tr|th|td)>', '\n', raw, flags=re.IGNORECASE)
    # Remove script/style and their content
    raw = re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r'<style[^>]*>.*?</style>', '', raw, flags=re.DOTALL | re.IGNORECASE)
    # For legal-term: keep only inner text (content between > and <)
    # Simple approach: strip all tags and collapse spaces
    text = re.sub(r'<[^>]+>', ' ', raw)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    return text.strip()

def main():
    OUT.mkdir(exist_ok=True)
    for i in range(1, 9):
        p = BASE / f"kapitel{i}.html"
        if not p.exists():
            print(f"Skip (missing): {p}")
            continue
        html = p.read_text(encoding="utf-8")
        text = extract_article_text(html)
        out_path = OUT / f"kapitel{i}_tekst.txt"
        out_path.write_text(text, encoding="utf-8")
        print(f"Wrote {len(text)} chars -> {out_path}")

if __name__ == "__main__":
    main()
