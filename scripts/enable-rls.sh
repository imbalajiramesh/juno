#!/bin/bash

# Script to enable RLS on all tables in Supabase database
# Make sure you have psql installed and your database connection details

# Database connection details
DB_HOST="supabase.juno.laxmint.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Check if password is provided as environment variable
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Please set the SUPABASE_DB_PASSWORD environment variable"
    echo "Example: export SUPABASE_DB_PASSWORD='your_password_here'"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "psql is not installed. Please install PostgreSQL client tools."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo "Enabling RLS on all tables in Supabase database..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Execute the SQL file
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    -U "$DB_USER" \
    -f "supabase/enable-rls.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RLS has been successfully enabled on all tables!"
    echo ""
    echo "Next steps:"
    echo "1. Test your application to ensure it still works correctly"
    echo "2. Verify tenant isolation is working as expected"
    echo "3. Update your Supabase client code to handle RLS if needed"
    echo ""
    echo "To verify RLS is working, you can run these queries in your Supabase SQL editor:"
    echo "-- Check which tables have RLS enabled:"
    echo "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
    echo ""
    echo "-- Check RLS policies:"
    echo "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';"
else
    echo ""
    echo "❌ Failed to enable RLS. Please check the error messages above."
    echo "Common issues:"
    echo "- Incorrect database credentials"
    echo "- Network connectivity issues"
    echo "- Insufficient permissions"
    exit 1
fi 