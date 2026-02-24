#!/bin/bash
set -e

DB_URL=${1:-$DATABASE_URL}
TEST_SCHEMA=$2

if [ -z "$DB_URL" ] || [ -z "$TEST_SCHEMA" ]; then
    echo "Usage: ./test-pipeline.sh [db_url] <test_schema>"
    echo "Note: If db_url is omitted, DATABASE_URL from environment will be used."
    exit 1
fi

echo "--- Testing pg_dump Pipeline ---"
echo "Target Schema: $TEST_SCHEMA"

# Remove query params for pg_dump/psql
CLEAN_URL=$(echo $DB_URL | sed 's/\?.*//')

echo "Running: pg_dump \"<url>\" --schema=tenant_template --no-owner --no-acl | sed \"s/tenant_template/$TEST_SCHEMA/g\" | psql \"<url>\""

pg_dump "$CLEAN_URL" --schema=tenant_template --no-owner --no-acl | sed "s/tenant_template/$TEST_SCHEMA/g" | psql "$CLEAN_URL"

echo "--- Pipeline completed successfully! ---"

# Verify schema exists
psql "$CLEAN_URL" -c "\dn" | grep "$TEST_SCHEMA" && echo "✅ Schema $TEST_SCHEMA verified in DB."
