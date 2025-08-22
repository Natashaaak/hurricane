#!/bin/bash

# Deploy script for GitHub Pages
echo "Building project..."
npm run build

echo "Deploying to GitHub Pages..."
npm run deploy

echo "Deployment complete!"
echo "Your site should be available at: https://[your-username].github.io/hurricane/"
