#!/bin/bash

set -euo pipefail

CITIES_FILE="${1:-cities15000}"

DEST_DIR="./examples/data"
mkdir -p "$DEST_DIR"
TMP_DIR=$(mktemp -d)

CITIES_URL="https://download.geonames.org/export/dump/$CITIES_FILE.zip"

echo "Downloading cities location DB..."
curl -s -L "$CITIES_URL" -o "$TMP_DIR/cities.zip"
unzip "$TMP_DIR/cities.zip" "$CITIES_FILE.txt" -d "$TMP_DIR"

CITY_TEMPLATE="\t{
\t\t\"type\": \"pointer\",
\t\t\"pointer_scale\": 0.3,
\t\t\"lat\": %s,
\t\t\"lon\": %s,
\t\t\"display_text\": \"%s\",
\t\t\"display_text_hover_only\": true
\t}"

echo "Writing resulting JSON into temp file: $TMP_DIR/$CITIES_FILE.json"
echo "[" > "$TMP_DIR/$CITIES_FILE.json"
CITIES_COUNT=0
while IFS=$'\t' read -r _id name _ascii _alternate lat lon _fclass fcode _; do
    if [[ $fcode == "PPLC" ]]; then
        if (( CITIES_COUNT > 0 )); then
            echo "," >> "$TMP_DIR/$CITIES_FILE.json"
        fi
        CITIES_COUNT=$(( CITIES_COUNT + 1 ))
        printf "$CITY_TEMPLATE" "$lat" "$lon" "$name" >> "$TMP_DIR/$CITIES_FILE.json"
    fi
done < "$TMP_DIR/$CITIES_FILE.txt"
echo "" >> "$TMP_DIR/$CITIES_FILE.json"
echo "]" >> "$TMP_DIR/$CITIES_FILE.json"

mv "$TMP_DIR/$CITIES_FILE.json" "$DEST_DIR/$CITIES_FILE.json"

echo "✅ Done. $CITIES_COUNT cities saved in $DEST_DIR/$CITIES_FILE.json"
