#!/bin/sh
# Builds the game and copies the deployable files into beta/ (published at <live address>/beta/ for phone testing).
cd "$(dirname "$0")" || exit 1
sh build.sh || exit 1
mkdir -p beta
cp index.html manifest.webmanifest beta/ || exit 1
rm -rf beta/icons
cp -r icons beta/icons || exit 1
echo "beta/ ready"
