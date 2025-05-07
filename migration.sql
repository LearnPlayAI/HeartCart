-- Create a new table to manage the relationship between products and global attributes
CREATE TABLE IF NOT EXISTS product_global_attributes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES global_attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

-- Create a table to manage product global attribute options (which options are selected)
CREATE TABLE IF NOT EXISTS product_global_attribute_options (
  id SERIAL PRIMARY KEY,
  product_attribute_id INTEGER NOT NULL REFERENCES product_global_attributes(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES global_attribute_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_attribute_id, option_id)
);
