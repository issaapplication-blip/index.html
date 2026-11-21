#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ACTIVE = ["index.html", "services.html", "regions.html", "announcements.html", "about.html", "faq.html", "caregivers.html", "404.html"]
LEGACY_REDIRECTS = {
    "elderly-care.html": "services.html",
    "patient-care.html": "services.html",
    "home-nursing.html": "services.html",
    "physiotherapy.html": "services.html",
    "lebanon.html": "regions.html",
    "tripoli.html": "regions.html",
    "dinniyeh.html": "regions.html",
    "zgharta.html": "regions.html",
    "koura.html": "regions.html",
    "batroun.html": "regions.html",
    "beirut.html": "regions.html",
    "guide.html": "faq.html",
    "guide-after-hospital.html": "faq.html",
    "guide-caregiver-vs-nurse.html": "faq.html",
    "guide-choose-caregiver.html": "faq.html",
    "guide-elderly-home.html": "faq.html",
}
errors = []

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ("href", "src", "poster", "action"):
            value = attrs.get(key)
            if value:
                self.refs.append((tag, key, value))

for name in ACTIVE:
    path = ROOT / name
    if not path.is_file():
        errors.append(f"missing active page: {name}")
        continue
    parser = Links()
    try:
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
    except Exception as exc:
        errors.append(f"HTML parse failure {name}: {exc}")
        continue
    for tag, key, raw in parser.refs:
        value = raw.strip()
        if not value or value.startswith(("#", "//")):
            continue
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc:
            continue
        target = parsed.path
        if not target:
            continue
        candidate = (ROOT / target.lstrip("/")) if target.startswith("/") else (path.parent / target)
        candidate = candidate.resolve()
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.is_file():
            errors.append(f"broken local {key} in {name}: {value}")

manifest_path = ROOT / "manifest.webmanifest"
try:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for item in manifest.get("icons", []):
        icon = ROOT / item["src"].lstrip("/")
        if not icon.is_file():
            errors.append(f"missing PWA icon: {item['src']}")
except Exception as exc:
    errors.append(f"invalid manifest.webmanifest: {exc}")

try:
    tree = ET.parse(ROOT / "sitemap.xml")
    locs = [el.text or "" for el in tree.findall(".//{*}loc")]
    for loc in locs:
        if any(old in loc for old in LEGACY_REDIRECTS):
            errors.append(f"retired URL remains in sitemap: {loc}")
    if not any(loc.rstrip("/").endswith("workers.dev") for loc in locs):
        errors.append("sitemap has no canonical homepage")
except Exception as exc:
    errors.append(f"invalid sitemap.xml: {exc}")

sw = (ROOT / "sw.js").read_text(encoding="utf-8")
for old in LEGACY_REDIRECTS:
    if old in sw:
        errors.append(f"retired page still pre-cached by service worker: {old}")

for name, target in LEGACY_REDIRECTS.items():
    path = ROOT / name
    if not path.is_file():
        errors.append(f"missing legacy redirect: {name}")
        continue
    content = path.read_text(encoding="utf-8")
    if f'./{target}' not in content or 'noindex,follow' not in content:
        errors.append(f"invalid legacy redirect page: {name} -> {target}")

for name in ["index.html", "services.html", "regions.html", "about.html", "faq.html"]:
    content = (ROOT / name).read_text(encoding="utf-8")
    for old in LEGACY_REDIRECTS:
        if f'href="./{old}"' in content or f'href="{old}"' in content:
            errors.append(f"active page {name} links to retired page {old}")

if errors:
    print("\n".join("ERROR: " + item for item in errors))
    sys.exit(1)
print(f"RAFIQ static-site checks passed: {len(ACTIVE)} active pages, {len(LEGACY_REDIRECTS)} legacy redirects, manifest, sitemap, PWA cache and local links.")
