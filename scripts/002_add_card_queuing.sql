-- Add columns to support card queuing when balance is insufficient
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS card_queued BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS card_issue_status TEXT DEFAULT 'pending', -- pending, pending_balance, completed, error
ADD COLUMN IF NOT EXISTS card_error_message TEXT;

-- Create index for faster queued card lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_card_status ON deposit_requests(card_issue_status);
