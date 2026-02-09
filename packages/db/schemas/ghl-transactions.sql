-- GHL Transactions Schema
-- Stores payment transactions from GoHighLevel for one-time revenue tracking
-- Run: psql "$DATABASE_URL" -f packages/db/schemas/ghl-transactions.sql

-- =============================================================================
-- GHL TRANSACTIONS TABLE
-- =============================================================================
-- Stores synced payment transactions from GHL Payments API

CREATE TABLE IF NOT EXISTS ghl_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- GHL identifiers
  ghl_transaction_id TEXT UNIQUE NOT NULL,
  ghl_contact_id TEXT,
  ghl_invoice_id TEXT,
  ghl_subscription_id TEXT,

  -- Contact info (denormalized for query convenience)
  contact_name TEXT,
  contact_email TEXT,

  -- Transaction details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- 'succeeded', 'pending', 'failed', 'refunded'

  -- Type and source
  entity_type TEXT, -- 'invoice', 'subscription', 'one-time', etc.
  entity_source_type TEXT, -- 'funnel', 'website', 'api', etc.
  entity_source_name TEXT, -- Name of the funnel/product

  -- Payment metadata
  payment_method TEXT, -- 'card', 'bank', etc.
  invoice_number TEXT,
  is_live_mode BOOLEAN DEFAULT true,

  -- Timestamps
  transaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ghl_transactions_date
  ON ghl_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_ghl_transactions_status
  ON ghl_transactions(status);

CREATE INDEX IF NOT EXISTS idx_ghl_transactions_contact
  ON ghl_transactions(ghl_contact_id);

CREATE INDEX IF NOT EXISTS idx_ghl_transactions_date_status
  ON ghl_transactions(transaction_date, status);

-- =============================================================================
-- SYNC TRACKING TABLE
-- =============================================================================
-- Tracks when syncs were last run

CREATE TABLE IF NOT EXISTS ghl_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'transactions', 'invoices', 'contacts'
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghl_sync_log_type
  ON ghl_sync_log(sync_type, started_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get one-time revenue for a date range
CREATE OR REPLACE FUNCTION get_onetime_revenue(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_revenue DECIMAL,
  transaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount), 0)::DECIMAL as total_revenue,
    COUNT(*)::INTEGER as transaction_count
  FROM ghl_transactions
  WHERE status = 'succeeded'
    AND transaction_date >= p_start_date
    AND transaction_date <= p_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Get daily one-time revenue for charts
CREATE OR REPLACE FUNCTION get_onetime_revenue_daily(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  date DATE,
  revenue DECIMAL,
  transaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(transaction_date) as date,
    COALESCE(SUM(amount), 0)::DECIMAL as revenue,
    COUNT(*)::INTEGER as transaction_count
  FROM ghl_transactions
  WHERE status = 'succeeded'
    AND transaction_date >= p_start_date
    AND transaction_date <= p_end_date + INTERVAL '1 day'
  GROUP BY DATE(transaction_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- =============================================================================
-- Uncomment to insert sample data:
/*
INSERT INTO ghl_transactions (
  ghl_transaction_id, ghl_contact_id, contact_name, contact_email,
  amount, status, entity_type, entity_source_name, transaction_date
) VALUES
  ('txn_test_001', 'contact_001', 'John Doe', 'john@example.com', 997.00, 'succeeded', 'invoice', 'VIP Setup Fee', '2026-02-01 10:00:00'),
  ('txn_test_002', 'contact_002', 'Jane Smith', 'jane@example.com', 497.00, 'succeeded', 'invoice', 'Premium Setup', '2026-02-03 14:30:00'),
  ('txn_test_003', 'contact_003', 'Bob Johnson', 'bob@example.com', 2500.00, 'succeeded', 'invoice', 'Success Fee', '2026-02-05 09:15:00');
*/
