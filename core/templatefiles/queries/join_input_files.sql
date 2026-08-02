-- Title: Join Data from Input Files
-- Description: Demonstrates joining data from multiple input files loaded as virtual tables. Configure input files in the Inputs tab (e.g., /data/customers.csv becomes 'data_customers_csv' table).
-- Tags: join, input, virtual-tables, aggregate
-- Inputs: This query expects input files to be configured in the Inputs tab. Example: customers.csv at /data/customers.csv and orders.json at /data/orders.json

-- Example: Join customer data with order data
-- Input files are automatically loaded as virtual tables based on their path:
-- - /data/customers.csv → data_customers_csv
-- - /data/orders.json → data_orders_json

SELECT 
    c.customer_id,
    c.customer_name,
    c.email,
    c.country,
    COUNT(o.order_id) AS total_orders,
    SUM(o.amount) AS total_spent,
    AVG(o.amount) AS avg_order_value,
    MAX(o.order_date) AS last_order_date
FROM data_customers_csv AS c
LEFT JOIN data_orders_json AS o 
    ON c.customer_id = o.customer_id
GROUP BY 
    c.customer_id, 
    c.customer_name, 
    c.email, 
    c.country
ORDER BY total_spent DESC
LIMIT 100;

-- NOTE: Virtual table names are derived from input file paths:
-- - Path: /data/customers.csv → Table: data_customers_csv
-- - Path: /sales/orders.json → Table: sales_orders_json
-- - Path: /reports/inventory.parquet → Table: reports_inventory_parquet
--
-- Supported file formats: CSV, TSV, JSON, Parquet
-- Configure inputs in the "Inputs" tab before running this query.
