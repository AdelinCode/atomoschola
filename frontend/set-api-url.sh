#!/bin/bash
# Script to set API URL in production
# Usage: ./set-api-url.sh https://your-backend.vercel.app/api

if [ -z "$1" ]; then
  echo "Usage: ./set-api-url.sh <API_URL>"
  echo "Example: ./set-api-url.sh https://your-backend.vercel.app/api"
  exit 1
fi

API_URL=$1

# Replace placeholder in env.js
sed -i "s|__API_URL__|$API_URL|g" env.js

echo "✅ API URL set to: $API_URL"
