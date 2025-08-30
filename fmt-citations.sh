#!/bin/bash

# DEPENDENCIES: pandoc, sed (macOS/BSD version)
#
# version info provided below just in case:
#
# pandoc --version:
# 3.7.0.2
# Features: +server +lua
# Scripting engine: Lua 5.4
#
# sed: macOS 15.5

cp -r notebooks/ docs/
cd notebooks/

for i in **/*.mdx; do
    [ -f "$i" ] || break
    echo "$i"
    OUTPUT_PATH="../docs/${i}"

    # the actual magic
    pandoc \
        -f markdown \
        -t gfm+smart+hard_line_breaks \
        --citeproc \
        --csl ../vendor/vancouver-brackets.csl \
        --bibliography=../litdb.bib \
        -o "$OUTPUT_PATH" \
        <<< cat "$i"

    # find the line where citation info starts, to prevent false hits
    CITATIONS_START_AT=$(sed -n '/<div id="refs" class="references csl-bib-body">/=' "$OUTPUT_PATH")

    if [ -n "$CITATIONS_START_AT" ]; then
        # remove html comments around custom blocks (scans above citation info
        # to prevent false hits)
        sed \
            -i '' -e "1,${CITATIONS_START_AT}s/<!--//g" \
            -i '' -e "1,${CITATIONS_START_AT}s/-->//g" \
            "${OUTPUT_PATH}"
        # remove angle brackets around links in citation info, which break MDX
        # (scans below citation info start to prevent false hits)
        sed \
            -i '' -e "${CITATIONS_START_AT},\$s/<http/http/g" \
            -i '' -e "${CITATIONS_START_AT},\$s/><\/span>$/<\/span>/g" \
            "${OUTPUT_PATH}"
    else
        # remove html comments around custom blocks
        sed \
            -i '' -e "s/<!--//g" \
            -i '' -e "s/-->//g" \
            "${OUTPUT_PATH}"
    fi
done

