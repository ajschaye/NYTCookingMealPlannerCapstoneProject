#!/bin/bash

echo "Running build process..."
npm run build

echo "Checking build output..."
if [ -d "dist/public" ]; then
    echo "Moving files from dist/public to dist..."
    
    # Move all files from dist/public to dist
    mv dist/public/* dist/ 2>/dev/null || true
    
    # Remove the empty public directory
    rmdir dist/public 2>/dev/null || true
    
    echo "Build files moved successfully"
else
    echo "No dist/public directory found"
fi

# Verify index.html exists in dist
if [ -f "dist/index.html" ]; then
    echo "✓ index.html found in dist/ - ready for deployment"
else
    echo "✗ index.html not found in dist/"
    exit 1
fi