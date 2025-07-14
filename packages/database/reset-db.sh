#!/bin/bash

# Reset database script
# WARNING: This will delete all existing data

echo "⚠️  WARNING: This will delete all existing data in the database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo "🔄 Resetting database..."

# Drop all tables (this removes all data and schema)
echo "Dropping all tables..."
bun run drizzle-kit drop

# Push the new schema with UUIDs
echo "Applying new schema with UUIDs..."
bun run drizzle-kit push

echo "✅ Database reset complete with UUID schema!" 