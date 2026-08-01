-- Title: Field Mapping and Renaming
-- Description: Maps source columns to new names and applies simple transformations.
-- Tags: mapping, rename, transform
-- Placeholders: source_file:$["demo-data;users.json@main"]

SELECT 
    id AS user_id,
    name AS full_name,
    lower(email) AS normalized_email,
    'Imported' AS status,
    company.name AS company_name
FROM {{source_file}};
