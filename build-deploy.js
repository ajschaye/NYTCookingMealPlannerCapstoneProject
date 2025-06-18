#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting deployment build process...');

// Check if dist/public exists (created by vite build)
const distPublicPath = path.join(__dirname, 'dist', 'public');
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPublicPath)) {
  console.log('Moving files from dist/public to dist...');
  
  const files = fs.readdirSync(distPublicPath);
  
  files.forEach(file => {
    const sourcePath = path.join(distPublicPath, file);
    const destPath = path.join(distPath, file);
    
    // If destination exists, remove it first
    if (fs.existsSync(destPath)) {
      if (fs.statSync(destPath).isDirectory()) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(destPath);
      }
    }
    
    // Move the file/directory
    fs.renameSync(sourcePath, destPath);
    console.log(`Moved: ${file}`);
  });
  
  // Remove the now-empty public directory
  fs.rmdirSync(distPublicPath);
  console.log('Removed empty dist/public directory');
  
  console.log('Build files successfully moved to dist/ for deployment');
} else {
  console.log('No dist/public directory found - build may have already output to correct location');
}

// Verify index.html is in the right place
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('✓ index.html found in dist/ - ready for deployment');
} else {
  console.error('✗ index.html not found in dist/ - deployment may fail');
  process.exit(1);
}