-- Add columns to store issued card details
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS card_number TEXT,
ADD COLUMN IF NOT EXISTS card_expiry TEXT,
ADD COLUMN IF NOT EXISTS card_cvv TEXT,
ADD COLUMN IF NOT EXISTS card_holder_name TEXT,
ADD COLUMN IF NOT EXISTS card_type TEXT;

-- Create index for card lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_card_id ON deposit_requests(issued_card_id);
