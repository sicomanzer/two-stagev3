-- Add missing columns to portfolio table if they don't exist
DO $$
BEGIN
    -- d0
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'd0') THEN
        ALTER TABLE portfolio ADD COLUMN d0 NUMERIC;
    END IF;

    -- dividend_yield
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'dividend_yield') THEN
        ALTER TABLE portfolio ADD COLUMN dividend_yield NUMERIC;
    END IF;

    -- pe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'pe') THEN
        ALTER TABLE portfolio ADD COLUMN pe NUMERIC;
    END IF;

    -- pbv
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'pbv') THEN
        ALTER TABLE portfolio ADD COLUMN pbv NUMERIC;
    END IF;

    -- de (debt_to_equity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'de') THEN
        ALTER TABLE portfolio ADD COLUMN de NUMERIC;
    END IF;

    -- roe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'roe') THEN
        ALTER TABLE portfolio ADD COLUMN roe NUMERIC;
    END IF;

    -- roa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'roa') THEN
        ALTER TABLE portfolio ADD COLUMN roa NUMERIC;
    END IF;

    -- eps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'eps') THEN
        ALTER TABLE portfolio ADD COLUMN eps NUMERIC;
    END IF;

    -- current_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'current_price') THEN
        ALTER TABLE portfolio ADD COLUMN current_price NUMERIC;
    END IF;
    
    -- fair_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'portfolio' AND column_name = 'fair_price') THEN
        ALTER TABLE portfolio ADD COLUMN fair_price NUMERIC;
    END IF;

END $$;
