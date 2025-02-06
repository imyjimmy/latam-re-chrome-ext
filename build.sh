#!/bin/zsh

filename="bitcoin-real-estate"

# Check if zip already exists
if [ -f "${filename}.zip" ]; then
    echo "Error: ${filename}.zip already exists"
    exit 1
fi

# Create zip file excluding .md and .zip files
find . -type f \( ! -name "*.md" -a ! -name "*.zip" -a ! -name ".*" \) ! -path "*/\.*/*" ! -path "*/.git/*" -print0 | xargs -0 zip "${filename}.zip"

if [ $? -eq 0 ]; then
    echo "Successfully created ${filename}.zip"
else
    echo "Error creating zip file"
    exit 1
fi
