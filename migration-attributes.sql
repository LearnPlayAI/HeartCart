-- New Attribute System Tables Migration

-- Core Attributes table
CREATE TABLE IF NOT EXISTS attributes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  attribute_type VARCHAR(50) NOT NULL,
  validation_rules JSONB,
  is_required BOOLEAN DEFAULT FALSE,
  is_filterable BOOLEAN DEFAULT FALSE,
  is_comparable BOOLEAN DEFAULT FALSE,
  is_swatch BOOLEAN DEFAULT FALSE,
  display_in_product_summary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT attributes_name_unique UNIQUE (name)
);

-- Attribute Options table
CREATE TABLE IF NOT EXISTS attribute_options (
  id SERIAL PRIMARY KEY,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  metadata JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT attribute_options_attr_value_unique UNIQUE (attribute_id, value)
);

-- Catalog Attributes table
CREATE TABLE IF NOT EXISTS catalog_attributes (
  id SERIAL PRIMARY KEY,
  catalog_id INTEGER NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  override_display_name VARCHAR(100),
  override_description TEXT,
  is_required BOOLEAN,
  is_filterable BOOLEAN,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_attributes_catalog_attr_unique UNIQUE (catalog_id, attribute_id)
);

-- Catalog Attribute Options table
CREATE TABLE IF NOT EXISTS catalog_attribute_options (
  id SERIAL PRIMARY KEY,
  catalog_attribute_id INTEGER NOT NULL REFERENCES catalog_attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  base_option_id INTEGER REFERENCES attribute_options(id),
  metadata JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_attribute_options_catalog_attr_value_unique UNIQUE (catalog_attribute_id, value)
);

-- Category Attributes table
CREATE TABLE IF NOT EXISTS category_attributes (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  catalog_attribute_id INTEGER REFERENCES catalog_attributes(id),
  override_display_name VARCHAR(100),
  override_description TEXT,
  is_required BOOLEAN,
  is_filterable BOOLEAN,
  inherit_from_parent BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT category_attributes_category_attr_unique UNIQUE (category_id, attribute_id)
);

-- Category Attribute Options table
CREATE TABLE IF NOT EXISTS category_attribute_options (
  id SERIAL PRIMARY KEY,
  category_attribute_id INTEGER NOT NULL REFERENCES category_attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  base_option_id INTEGER REFERENCES attribute_options(id),
  catalog_option_id INTEGER REFERENCES catalog_attribute_options(id),
  metadata JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT category_attribute_options_category_attr_value_unique UNIQUE (category_attribute_id, value)
);

-- Product Attributes table
CREATE TABLE IF NOT EXISTS product_attributes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  category_attribute_id INTEGER REFERENCES category_attributes(id),
  override_display_name VARCHAR(100),
  override_description TEXT,
  is_required BOOLEAN,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT product_attributes_product_attr_unique UNIQUE (product_id, attribute_id)
);

-- Product Attribute Options table
CREATE TABLE IF NOT EXISTS product_attribute_options (
  id SERIAL PRIMARY KEY,
  product_attribute_id INTEGER NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  display_value VARCHAR(255) NOT NULL,
  base_option_id INTEGER REFERENCES attribute_options(id),
  category_option_id INTEGER REFERENCES category_attribute_options(id),
  catalog_option_id INTEGER REFERENCES catalog_attribute_options(id),
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  metadata JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT product_attribute_options_product_attr_value_unique UNIQUE (product_attribute_id, value)
);

-- Product Attribute Values table
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES product_attribute_options(id),
  text_value TEXT,
  date_value TIMESTAMP,
  numeric_value DECIMAL(10, 2),
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attributes_name ON attributes(name);
CREATE INDEX IF NOT EXISTS idx_attributes_type ON attributes(attribute_type);
CREATE INDEX IF NOT EXISTS idx_attribute_options_attribute_id ON attribute_options(attribute_id);

CREATE INDEX IF NOT EXISTS idx_catalog_attributes_catalog_id ON catalog_attributes(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_attributes_attribute_id ON catalog_attributes(attribute_id);
CREATE INDEX IF NOT EXISTS idx_catalog_attribute_options_catalog_attribute_id ON catalog_attribute_options(catalog_attribute_id);

CREATE INDEX IF NOT EXISTS idx_category_attributes_category_id ON category_attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_attribute_id ON category_attributes(attribute_id);
CREATE INDEX IF NOT EXISTS idx_category_attributes_catalog_attribute_id ON category_attributes(catalog_attribute_id);
CREATE INDEX IF NOT EXISTS idx_category_attribute_options_category_attribute_id ON category_attribute_options(category_attribute_id);

CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_attribute_id ON product_attributes(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_category_attribute_id ON product_attributes(category_attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_product_attribute_id ON product_attribute_options(product_attribute_id);

CREATE INDEX IF NOT EXISTS idx_product_attribute_values_product_id ON product_attribute_values(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute_id ON product_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_option_id ON product_attribute_values(option_id);