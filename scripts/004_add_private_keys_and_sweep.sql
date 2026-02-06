-- Add columns for private key storage and fund sweeping
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS derived_private_key TEXT,
ADD COLUMN IF NOT EXISTS sweep_status TEXT DEFAULT 'pending', -- pending, completed, failed
ADD COLUMN IF NOT EXISTS sweep_transaction_signature TEXT,
ADD COLUMN IF NOT EXISTS funds_swept BOOLEAN DEFAULT FALSE;

-- Create index for sweep status queries
CREATE INDEX IF NOT EXISTS idx_deposit_requests_sweep_status ON deposit_requests(sweep_status);
