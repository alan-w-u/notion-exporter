#!/bin/bash

cp -r notebooks/ docs/
cd notebooks/

for i in **/*.mdx; do
    [ -f "$i" ] || break
    echo "$i"
    OUTPUT_PATH="../docs/${i}"
    pandoc \
        -f markdown \
        -t gfm+smart+hard_line_breaks \
        --citeproc \
        --csl ../vendor/vancouver-brackets.csl \
        --bibliography=../litdb.bib \
        -o "$OUTPUT_PATH" \
        <<< cat "$i"
    CITATIONS_START_AT=$(sed -n '/<div id="refs" class="references csl-bib-body">/=' "$OUTPUT_PATH")
    if [ -n "$CITATIONS_START_AT" ]; then
        sed \
            -i '' -e "${CITATIONS_START_AT},\$s/<http/http/g" \
            -i '' -e "${CITATIONS_START_AT},\$s/><\/span>$/<\/span>/g" \
            "${OUTPUT_PATH}"
    fi
done

