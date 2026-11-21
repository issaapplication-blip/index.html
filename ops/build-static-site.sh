#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist}"
if [[ "$OUT_DIR" != /* ]]; then OUT_DIR="$ROOT/$OUT_DIR"; fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

FILES=(
  index.html services.html regions.html announcements.html about.html faq.html caregivers.html 404.html
  elderly-care.html patient-care.html home-nursing.html physiotherapy.html
  lebanon.html tripoli.html dinniyeh.html zgharta.html koura.html batroun.html beirut.html
  guide.html guide-after-hospital.html guide-caregiver-vs-nurse.html guide-choose-caregiver.html guide-elderly-home.html
  manifest.webmanifest sw.js install-app.js robots.txt sitemap.xml
)

for file in "${FILES[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "Required public file is missing: $file" >&2
    exit 1
  fi
  cp "$ROOT/$file" "$OUT_DIR/$file"
done

cp -R "$ROOT/assets" "$OUT_DIR/assets"
cp "$ROOT/.nojekyll" "$OUT_DIR/.nojekyll"

for private_path in .github docs migrations ops supabase tests node_modules; do
  if [[ -e "$OUT_DIR/$private_path" ]]; then
    echo "Private source path leaked into deployment artifact: $private_path" >&2
    exit 1
  fi
done

echo "Built RAFIQ public artifact at $OUT_DIR"
echo "Files: $(find "$OUT_DIR" -type f | wc -l | tr -d ' ')"
