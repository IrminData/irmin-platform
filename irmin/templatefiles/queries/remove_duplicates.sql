-- Title: Remove Duplicates (Deduplicate)
-- Description: Returns unique records from the dataset.
-- Tags: deduplicate, distinct, unique
-- Placeholders: source_file:$["demo-data;users.json@main"]

-- Select distinct rows (deduplicate all columns)
SELECT DISTINCT * 
FROM {{source_file}};

-- Alternative: Deduplicate by specific column (uncomment to use)
-- SELECT * FROM (
--     SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id DESC) as rn
--     FROM {{source_file}}
-- ) WHERE rn = 1;
