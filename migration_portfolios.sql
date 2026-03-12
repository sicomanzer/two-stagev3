-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add portfolio_id to existing portfolio table
ALTER TABLE portfolio 
ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE;

-- Insert a default portfolio if none exists
INSERT INTO portfolios (name)
SELECT 'My First Portfolio'
WHERE NOT EXISTS (SELECT 1 FROM portfolios);

-- Update existing portfolio items to belong to the default portfolio
UPDATE portfolio
SET portfolio_id = (SELECT id FROM portfolios LIMIT 1)
WHERE portfolio_id IS NULL;
