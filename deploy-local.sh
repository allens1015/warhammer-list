#!/bin/bash
set -e

DRUPAL_MODULE=~/GitHub/rpgbookshelf/web/modules/custom/rpgbookshelf_tools
DRUPAL_ASSETS=$DRUPAL_MODULE/tools/warhammer-list/assets

if [ ! -d "$DRUPAL_MODULE" ]; then
  echo "Drupal module not found at $DRUPAL_MODULE" >&2
  exit 1
fi

VITE_BASE_URL=/modules/custom/rpgbookshelf_tools/tools/warhammer-list/ npm run build

mkdir -p "$DRUPAL_ASSETS"
cp -r dist/assets/. "$DRUPAL_ASSETS/"

echo "Deployed to $DRUPAL_ASSETS"

if ! grep -q '^warhammer-list:' "$DRUPAL_MODULE/rpgbookshelf_tools.libraries.yml"; then
  echo "Note: no warhammer-list library in rpgbookshelf_tools.libraries.yml yet — Drupal won't load these assets until one is added."
fi
