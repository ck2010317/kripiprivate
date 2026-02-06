-- Create tables for payment tracking and HD wallet management

-- Table to store deposit requests with unique addresses
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  deposit_address TEXT NOT NULL UNIQUE,
  derivation_index INTEGER NOT NULL,
  expected_amount BIGINT NOT NULL, -- in lamports
  card_value DECIMAL(10, 2) NOT NULL, -- card amount in USD/SOL
  actual_amount_received BIGINT DEFAULT 0,
  payment_verified BOOLEAN DEFAULT FALSE,
  card_issued BOOLEAN DEFAULT FALSE,
  issued_card_id TEXT,
  transaction_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table to store issued cards
CREATE TABLE IF NOT EXISTS issued_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_request_id UUID NOT NULL REFERENCES deposit_requests(id),
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  card_value DECIMAL(10, 2) NOT NULL,
  card_status TEXT DEFAULT 'pending', -- pending, active, used, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_deposit_requests_address ON deposit_requests(deposit_address);
CREATE INDEX idx_deposit_requests_verified ON deposit_requests(payment_verified);
CREATE INDEX idx_issued_cards_user_id ON issued_cards(user_id);
