#!/bin/sh
# Régénère les fichiers minifiés après toute modification du CSS ou du JS.
# Usage : sh build-min.sh   (nécessite Node.js ; esbuild est téléchargé via npx)
set -e
cd "$(dirname "$0")"
npx -y esbuild@0.24.0 css/style.css --minify --log-level=warning --outfile=css/style.min.css
npx -y esbuild@0.24.0 css/consent.css --minify --log-level=warning --outfile=css/consent.min.css
npx -y esbuild@0.24.0 js/main.js --minify --log-level=warning --outfile=js/main.min.js
npx -y esbuild@0.24.0 js/consent.js --minify --log-level=warning --outfile=js/consent.min.js
echo "Fichiers minifiés régénérés."
