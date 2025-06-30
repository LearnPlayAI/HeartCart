-- Sales Rep Commission System Migration
-- Creates tables for sales representatives, commissions, and payments

-- Create sales_reps table
CREATE TABLE IF NOT EXISTS sales_reps (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    rep_code VARCHAR(50) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.03, -- 3% default commission rate
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rep_commissions table
CREATE TABLE IF NOT EXISTS rep_commissions (
    id SERIAL PRIMARY KEY,
    rep_id INTEGER NOT NULL REFERENCES sales_reps(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commission_amount DECIMAL(10,2) NOT NULL,
    order_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rep_payments table
CREATE TABLE IF NOT EXISTS rep_payments (
    id SERIAL PRIMARY KEY,
    rep_id INTEGER NOT NULL REFERENCES sales_reps(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    reference_number VARCHAR(255),
    notes TEXT,
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add rep_code column to users table (nullable for existing users)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='rep_code') THEN
        ALTER TABLE users ADD COLUMN rep_code VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_users_rep_code ON users(rep_code);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_reps_rep_code ON sales_reps(rep_code);
CREATE INDEX IF NOT EXISTS idx_sales_reps_email ON sales_reps(email);
CREATE INDEX IF NOT EXISTS idx_sales_reps_is_active ON sales_reps(is_active);

CREATE INDEX IF NOT EXISTS idx_rep_commissions_rep_id ON rep_commissions(rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_commissions_order_id ON rep_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_rep_commissions_user_id ON rep_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_rep_commissions_status ON rep_commissions(status);
CREATE INDEX IF NOT EXISTS idx_rep_commissions_created_at ON rep_commissions(created_at);

CREATE INDEX IF NOT EXISTS idx_rep_payments_rep_id ON rep_payments(rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_payments_created_at ON rep_payments(created_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_sales_reps_updated_at ON sales_reps;
CREATE TRIGGER update_sales_reps_updated_at
    BEFORE UPDATE ON sales_reps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rep_commissions_updated_at ON rep_commissions;
CREATE TRIGGER update_rep_commissions_updated_at
    BEFORE UPDATE ON rep_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rep_payments_updated_at ON rep_payments;
CREATE TRIGGER update_rep_payments_updated_at
    BEFORE UPDATE ON rep_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample sales rep for testing (optional)
INSERT INTO sales_reps (first_name, last_name, email, phone_number, rep_code, commission_rate, notes)
VALUES 
    ('John', 'Smith', 'john.smith@example.com', '+27123456789', 'REP001', 0.03, 'Sample sales rep for testing')
ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sales_reps TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rep_commissions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rep_payments TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE sales_reps_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE rep_commissions_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE rep_payments_id_seq TO your_app_user;

COMMIT;