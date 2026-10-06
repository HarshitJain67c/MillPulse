from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_IDS = {
    "dashboard", "production", "quality", "orders", "output-value",
    "line-table", "record-dialog", "production-form", "bar-chart",
}


class Parser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.assets: list[str] = []
        self.buttons: list[str | None] = []
        self.title = ""
        self.in_title = False
        self.description = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"] or "")
        if tag in {"script", "link"}:
            asset = values.get("src") or values.get("href")
            if asset:
                self.assets.append(asset)
        if tag == "button":
            self.buttons.append(values.get("type"))
        if tag == "title":
            self.in_title = True
        if tag == "meta" and values.get("name") == "description":
            self.description = values.get("content") or ""

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data


def main() -> int:
    parser = Parser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    errors: list[str] = []
    missing = REQUIRED_IDS - parser.ids
    if missing:
        errors.append(f"missing required ids: {', '.join(sorted(missing))}")
    if "MillPulse" not in parser.title:
        errors.append("page title must identify MillPulse")
    if len(parser.description) < 60:
        errors.append("meta description is missing or too short")
    if any(button_type != "button" and button_type != "submit" for button_type in parser.buttons):
        errors.append("every button must declare a safe type")
    for asset in parser.assets:
        parsed = urlparse(asset)
        if parsed.scheme or asset.startswith(("data:", "//")):
            continue
        if not (ROOT / parsed.path).is_file():
            errors.append(f"missing local asset: {asset}")
    script = (ROOT / "app.js").read_text(encoding="utf-8")
    for marker in ["renderAll()", "registerWebMcpTools()", "exportCsv()", "localStorage"]:
        if marker not in script:
            errors.append(f"missing application behavior: {marker}")
    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Validation passed: {len(parser.ids)} ids, {len(parser.buttons)} buttons, {len(parser.assets)} assets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
