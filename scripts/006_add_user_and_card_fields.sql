-- Add missing columns for user details and card information
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS derived_private_key TEXT,
ADD COLUMN IF NOT EXISTS sweep_status TEXT DEFAULT 'pending';
