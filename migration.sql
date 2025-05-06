-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'South Africa',
  notes TEXT,
  logo TEXT,
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create catalogs table
CREATE TABLE IF NOT EXISTS catalogs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  supplier_id INTEGER REFERENCES suppliers(id),
  default_markup_percentage INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  cover_image TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add catalog_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS catalog_id INTEGER REFERENCES catalogs(id);