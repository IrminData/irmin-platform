-- Title: Filter and Transform Input Data
-- Description: Filter and transform data from an input file with calculations and conditional logic. Configure the input file in the Inputs tab.
-- Tags: filter, transform, input, calculations
-- Inputs: This query expects an input file configured in the Inputs tab. Example: sales_data.csv at /data/sales_data.csv

-- Example: Filter and enrich sales data from input file
-- Input file path: /data/sales_data.csv → Virtual table: data_sales_data_csv

SELECT 
    product_id,
    product_name,
    category,
    quantity,
    unit_price,
    quantity * unit_price AS total_amount,
    sale_date,
    region,
    -- Add calculated fields
    CASE 
        WHEN quantity * unit_price > 1000 THEN 'High Value'
        WHEN quantity * unit_price > 500 THEN 'Medium Value'
        ELSE 'Low Value'
    END AS order_category,
    -- Extract date components
    EXTRACT(YEAR FROM sale_date) AS sale_year,
    EXTRACT(MONTH FROM sale_date) AS sale_month,
    EXTRACT(QUARTER FROM sale_date) AS sale_quarter
FROM data_sales_data_csv
WHERE 
    -- Filter conditions
    category IN ('Electronics', 'Computers', 'Mobile')
    AND quantity > 0
    AND unit_price > 0
    AND sale_date >= '2024-01-01'
ORDER BY 
    sale_date DESC,
    total_amount DESC;

-- NOTE: Virtual table name is derived from the input file path:
-- - Configure input: Repository → Branch → Path (/data/sales_data.csv)
-- - Virtual table: data_sales_data_csv
--
-- Supported formats: CSV, TSV, JSON, Parquet
-- Binary files (images, PDFs, etc.) are automatically skipped.
