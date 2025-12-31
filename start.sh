#!/bin/sh
set -e

echo "DATABASE_URL is: $DATABASE_URL"
echo "Running prisma db push..."
npx prisma db push --url "$DATABASE_URL"

echo "Starting Next.js..."
npm run start
