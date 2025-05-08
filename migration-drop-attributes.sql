-- Drop attribute-related tables in correct order to handle foreign key dependencies

-- First drop the junction tables that likely have foreign keys to other tables
DROP TABLE IF EXISTS product_global_attribute_options CASCADE;
DROP TABLE IF EXISTS product_global_attributes CASCADE;
DROP TABLE IF EXISTS product_attribute_values CASCADE;
DROP TABLE IF EXISTS product_attribute_combinations CASCADE;
DROP TABLE IF EXISTS category_attribute_options CASCADE;
DROP TABLE IF EXISTS category_attributes CASCADE;

-- Now drop the main tables
DROP TABLE IF EXISTS global_attribute_options CASCADE;
DROP TABLE IF EXISTS global_attributes CASCADE;