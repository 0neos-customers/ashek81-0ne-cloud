-- =============================================
-- CONTACTS TABLE MIGRATION
-- Add email, phone, first_name, last_name columns
-- Run this in Supabase SQL Editor
-- =============================================

-- Add columns if they don't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add indexes for matching
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(first_name, last_name);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND column_name IN ('email', 'phone', 'first_name', 'last_name');
