#!/usr/bin/env python3
"""Set <lastmod> in sitemap.xml from each page's last git change.

A page with uncommitted (staged or unstaged) changes gets today's date, so
running this from the pre-commit hook dates the pages in the commit being made.

Usage: python3 scripts/update-sitemap.py
"""

import datetime
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITEMAP = ROOT / "sitemap.xml"
BASE_URL = "https://feascript.com/"


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.strip()


def last_modified(path):
    if git("status", "--porcelain", "--", path):
        return datetime.date.today().isoformat()
    return git("log", "-1", "--format=%cs", "--", path) or datetime.date.today().isoformat()


def page_path(loc):
    rel = loc.removeprefix(BASE_URL)
    return rel + "index.html" if rel == "" or rel.endswith("/") else rel


def update_entry(match):
    entry = match.group(0)
    loc = re.search(r"<loc>(.*?)</loc>", entry).group(1)
    path = page_path(loc)
    if not (ROOT / path).exists():
        raise SystemExit(f"sitemap.xml lists {loc} but {path} does not exist")
    entry = re.sub(r"\s*<lastmod>.*?</lastmod>", "", entry)
    return entry.replace(
        "</loc>", f"</loc>\n    <lastmod>{last_modified(path)}</lastmod>", 1
    )


def main():
    text = SITEMAP.read_text()
    new = re.sub(r"<url>.*?</url>", update_entry, text, flags=re.S)
    if new != text:
        SITEMAP.write_text(new)


if __name__ == "__main__":
    main()
