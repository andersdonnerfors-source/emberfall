#!/bin/sh
# Builds the single-file game (index.html) from the parts in src/.
cd "$(dirname "$0")"
{ cat src/00-head.html; for f in src/*.js; do cat "$f"; done; cat src/zz-tail.html; } > index.html
echo "built index.html ($(wc -l < index.html) lines)"
