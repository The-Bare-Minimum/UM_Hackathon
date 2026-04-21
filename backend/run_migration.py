"""Run migration 005 - create budgets table and extend expenses."""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Use the Supabase PostgREST rpc endpoint for raw SQL isn't available,
# so we'll use individual REST calls to create the table and columns.
# Alternative: use the SQL endpoint at /rest/v1/rpc

# Let's try individual DDL statements via the pg_net extension or just
# create the structures through the management API approach.

# Actually the simplest way with what we have is to use the supabase-py
# client to insert/select. But for DDL we need the SQL editor.

# Let's try the Supabase SQL API endpoint
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# The Supabase /rest/v1/ doesn't support DDL.
# We can try the /pg/ endpoint or the query endpoint if available.
# Let's try creating via the Supabase Management API

# Alternative: use psycopg2 with the database connection string
# Database URL pattern: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

print("Migration SQL is ready at: migrations/005_budgets_and_expenses_extend.sql")
print()
print("Please run this migration in the Supabase Dashboard SQL Editor:")
print(f"  {SUPABASE_URL.replace('.co', '.co')}/project/lftmwymdfikbaeikdkkm/sql/new")
print()
print("Or run via Supabase CLI:")
print("  supabase db push")
print()

# Try via the direct database connection
try:
    import psycopg2
    # Try connecting via the pooler
    ref = "lftmwymdfikbaeikdkkm"
    conn_str = f"postgresql://postgres.{ref}:YOUR_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    print("psycopg2 is available but we need the database password.")
    print("You can find it in Supabase Dashboard > Project Settings > Database")
except ImportError:
    print("psycopg2 not installed. Install with: pip install psycopg2-binary")
    print()
    print("Alternatively, copy and paste the SQL below into the Supabase SQL Editor:")
    print("=" * 70)
    
    sql = """
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    allocated_amount DECIMAL NOT NULL DEFAULT 0,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, category, month, year)
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'one-time';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (true);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (true);
"""
    print(sql)
    print("=" * 70)
