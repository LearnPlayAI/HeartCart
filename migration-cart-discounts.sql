-- Add discount-related fields to cart_items table
ALTER TABLE cart_items 
ADD COLUMN discount_data JSONB DEFAULT NULL,
ADD COLUMN total_discount DOUBLE PRECISION DEFAULT 0,
ADD COLUMN item_price DOUBLE PRECISION DEFAULT NULL;

COMMENT ON COLUMN cart_items.discount_data IS 'Stores the discount adjustments applied to the cart item';
COMMENT ON COLUMN cart_items.total_discount IS 'Total discount amount applied to the cart item';
COMMENT ON COLUMN cart_items.item_price IS 'Final calculated price for the item (after adjustments and discounts)';