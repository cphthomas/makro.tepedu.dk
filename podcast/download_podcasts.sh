#!/usr/bin/env bash
# Download 8 podcast M4A files from NotebookLM audio overview URLs into podcast/
# Usage: ./download_podcasts.sh "URL1" "URL2" "URL3" "URL4" "URL5" "URL6" "URL7" "URL8"

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ $# -ne 8 ]; then
  echo "Brug: $0 \"URL1\" \"URL2\" … \"URL8\""
  echo "URLs får du fra NotebookLM Studio (Audio overview → Download) eller ved at spørge Cursor om studio_status."
  exit 1
fi

for i in 1 2 3 4 5 6 7 8; do
  eval url=\${$i}
  echo "Downloader kapitel$i.m4a ..."
  curl -L -o "kapitel$i.m4a" "$url"
done
echo "Færdig. Filer i: $DIR"
