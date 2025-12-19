-- Title: Filter and Select Records
-- Description: Selects specific fields from a dataset with filtering and a limit.
-- Tags: select, filter, simple
-- Placeholders: source_file:$["demo-data;posts.json@main"], limit:100

SELECT 
  p.id AS post_id,
  p.title,
  p.body,
  p.userId
FROM {{source_file}} AS p
LIMIT {{limit}};
