-- Add column to store encryption salt for private key decryption
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS sweep_salt TEXT;
