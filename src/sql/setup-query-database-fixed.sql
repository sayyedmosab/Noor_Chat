-- Setup SQL for Query Database (run in Supabase Query DB)
-- This enables SQL execution from the application

-- Create a function to execute arbitrary SQL (READ-ONLY)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  rec RECORD;
  results JSON[] DEFAULT '{}';
BEGIN
  -- Security check: only allow SELECT statements
  IF LOWER(TRIM(sql_query)) NOT LIKE 'select%' AND LOWER(TRIM(sql_query)) NOT LIKE 'with%' THEN
    RAISE EXCEPTION 'Only SELECT and WITH queries are allowed';
  END IF;

  -- Execute the query and collect results
  FOR rec IN EXECUTE sql_query LOOP
    results := array_append(results, row_to_json(rec));
  END LOOP;

  -- Return as JSON array
  RETURN array_to_json(results);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO anon;

-- Create some sample data tables for testing

-- Sample customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(50),
  state VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  items_count INTEGER DEFAULT 1,
  shipping_city VARCHAR(50),
  shipping_state VARCHAR(2)
);

-- Sample products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Insert sample data - ONLY using columns that actually exist

-- Sample customers (only using columns that exist in the table)
INSERT INTO customers (name, email, phone, city, state) 
VALUES 
  ('John Smith', 'john.smith@email.com', '555-0101', 'New York', 'NY'),
  ('Sarah Johnson', 'sarah.j@email.com', '555-0102', 'Los Angeles', 'CA'),
  ('Mike Brown', 'mike.brown@email.com', '555-0103', 'Chicago', 'IL'),
  ('Emily Davis', 'emily.davis@email.com', '555-0104', 'Houston', 'TX'),
  ('David Wilson', 'david.w@email.com', '555-0105', 'Phoenix', 'AZ')
ON CONFLICT (email) DO NOTHING;

-- Sample products (using only existing columns)
INSERT INTO products (name, category, price, stock_quantity, is_active)
VALUES 
  ('Laptop Pro 15"', 'Electronics', 1299.99, 25, true),
  ('Wireless Headphones', 'Electronics', 199.99, 50, true),
  ('Office Chair', 'Furniture', 299.99, 15, true),
  ('Standing Desk', 'Furniture', 499.99, 8, true),
  ('Coffee Mug', 'Accessories', 19.99, 100, true),
  ('Notebook Set', 'Office Supplies', 24.99, 75, true),
  ('Smartphone Case', 'Electronics', 39.99, 200, true);

-- Sample orders (using only existing columns)
INSERT INTO orders (customer_id, order_date, status, total_amount, items_count, shipping_city, shipping_state)
VALUES 
  (1, CURRENT_TIMESTAMP - INTERVAL '5 days', 'completed', 1299.99, 1, 'New York', 'NY'),
  (1, CURRENT_TIMESTAMP - INTERVAL '3 days', 'completed', 199.99, 2, 'New York', 'NY'),
  (2, CURRENT_TIMESTAMP - INTERVAL '7 days', 'completed', 299.99, 1, 'Los Angeles', 'CA'),
  (2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'shipped', 519.98, 2, 'Los Angeles', 'CA'),
  (3, CURRENT_TIMESTAMP - INTERVAL '10 days', 'completed', 499.99, 1, 'Chicago', 'IL'),
  (3, CURRENT_TIMESTAMP - INTERVAL '6 days', 'completed', 59.98, 3, 'Chicago', 'IL'),
  (3, CURRENT_TIMESTAMP - INTERVAL '1 day', 'processing', 824.97, 4, 'Chicago', 'IL'),
  (4, CURRENT_TIMESTAMP - INTERVAL '8 days', 'completed', 345.20, 2, 'Houston', 'TX'),
  (5, CURRENT_TIMESTAMP - INTERVAL '4 days', 'completed', 675.80, 3, 'Phoenix', 'AZ');

-- Create useful views for analysis
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.city,
  c.state,
  c.created_at,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_spent,
  COALESCE(AVG(o.total_amount), 0) as avg_order_value,
  MAX(o.order_date) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email, c.city, c.state, c.created_at;

CREATE OR REPLACE VIEW order_analytics AS
SELECT 
  DATE(order_date) as order_date,
  COUNT(*) as total_orders,
  SUM(total_amount) as daily_revenue,
  AVG(total_amount) as avg_order_value,
  SUM(items_count) as total_items
FROM orders 
GROUP BY DATE(order_date)
ORDER BY order_date DESC;

-- Grant access to all objects
GRANT SELECT ON customer_summary TO authenticated, anon;
GRANT SELECT ON order_analytics TO authenticated, anon;
GRANT SELECT ON customers TO authenticated, anon;
GRANT SELECT ON orders TO authenticated, anon;
GRANT SELECT ON products TO authenticated, anon;

-- Test the function
SELECT execute_sql('SELECT COUNT(*) as total_customers FROM customers');

-- Success message
SELECT 'Query database setup completed successfully!' as status;