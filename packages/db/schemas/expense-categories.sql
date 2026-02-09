-- ============================================
-- Expense Categories Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Add new columns to expenses table for system tracking
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_sync_date DATE;

-- Add index for querying system expenses
CREATE INDEX IF NOT EXISTS idx_expenses_is_system ON expenses(is_system);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ============================================
-- EXPENSE_CATEGORIES (Custom category management)
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT, -- Optional color hex code for UI
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- System categories can't be deleted
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO expense_categories (name, slug, color, description, is_system, display_order)
VALUES
  ('Facebook Ads', 'facebook_ads', '#1877F2', 'Meta/Facebook advertising spend (auto-synced)', true, 1),
  ('Marketing', 'marketing', '#22c55e', 'Other marketing and advertising expenses', false, 2),
  ('Labor', 'labor', '#3b82f6', 'Team members and contractors', false, 3),
  ('Software', 'software', '#8b5cf6', 'Software subscriptions and tools', false, 4),
  ('Operations', 'operations', '#f59e0b', 'Operational expenses', false, 5)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON expense_categories FOR ALL USING (true);

-- Add updated_at trigger for expense_categories
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments
-- ============================================
COMMENT ON COLUMN expenses.is_system IS 'True for auto-synced expenses (e.g., Facebook Ads from Meta API)';
COMMENT ON COLUMN expenses.meta_sync_date IS 'Date of the synced Meta ad spend (for daily expense entries)';
COMMENT ON TABLE expense_categories IS 'Custom expense categories with system defaults';
