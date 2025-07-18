#!/bin/bash

set -euo pipefail

DEST_DIR="./public/assets/data/states"
mkdir -p "$DEST_DIR"
TMP_DIR=$(mktemp -d)
BASE_URL="https://www.geoboundaries.org/api/current/gbOpen"

# Clean ISO3→ISO2 map
ISO_MAP_URL="https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv"

echo "Downloading ISO3 → ISO2 mapping..."
curl -s -L "$ISO_MAP_URL" -o "$TMP_DIR/iso.csv"

# Build ISO3 → ISO2 map
declare -A ISO2_MAP
while IFS=',' read -r _name alpha2 alpha3 _; do
    if [[ "$alpha2" =~ ^[A-Z]{2}$ && "$alpha3" =~ ^[A-Z]{3}$ ]]; then
        ISO2_MAP[$alpha3]=$alpha2
    fi
done < <(tail -n +2 "$TMP_DIR/iso.csv" | sed 's/\"[^\"]*\"/\"\"/')

echo "Fetching ISO3 codes from GeoBoundaries index..."
ISO3_LIST=$(curl -s "$BASE_URL/" | grep -oP '(?<=href=")[A-Z]{3}/(?=")' | sed 's|/||')

echo "Processing $(echo "$ISO3_LIST" | wc -l) countries..."

for iso3 in $ISO3_LIST; do
    iso2=${ISO2_MAP[$iso3]:-}
    if [[ -z "$iso2" ]]; then
        echo "❌ Skipping unknown ISO3: $iso3"
        continue
    fi

    OUTPUT_FILE="${DEST_DIR}/${iso2,,}.geojson"

    if [[ -f "$OUTPUT_FILE" ]]; then
        echo "  ⚠️  $OUTPUT_FILE already exists! Skipping..."
        continue
    fi

    META_URL="${BASE_URL}/${iso3}/ADM1/"
    echo "Checking $iso3 ($iso2) ..."

    # HEAD request to test if ADM1 exists
    if ! curl -s -f -I "$META_URL" > /dev/null; then
        echo "  ⚠️  Skipping: ADM1 directory not found for $iso3"
        continue
    fi

    METAFILE="$TMP_DIR/${iso3}.json"
    if ! curl -s -f -L "$META_URL" -H "Accept: application/json" -o "$METAFILE"; then
        echo "  ⚠️  Metadata download failed for $iso3"
        continue
    fi

    if ! jq -e . "$METAFILE" > /dev/null 2>&1; then
        echo "  ⚠️  Invalid JSON in $META_URL (likely HTML)"
        continue
    fi

    SIMPLIFIED_URL=$(jq -r '.simplifiedGeometryGeoJSON // empty' "$METAFILE")
    if [[ -z "$SIMPLIFIED_URL" ]]; then
        echo "  ⚠️  No simplifiedGeometryGeoJSON in metadata"
        continue
    fi

    echo "  Downloading to: $OUTPUT_FILE"
    if curl -s -f -L "$SIMPLIFIED_URL" -o "$OUTPUT_FILE"; then
        echo "  ✅ Saved"
    else
        echo "  ❌ Failed to download $SIMPLIFIED_URL"
        rm -f "$OUTPUT_FILE"
    fi
done

echo "✅ Done. Files saved in $DEST_DIR"
