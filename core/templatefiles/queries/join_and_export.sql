-- Title: Export Joined Data to S3
-- Description: Joins two datasets (e.g. posts and users) and exports the result to S3 as a CSV file.
-- Tags: export, join, s3, csv
-- Placeholders: posts_file:$["demo-data;posts.json@main"], users_file:$["demo-data;users.json@main"], output_path:s3://bucket/export.csv

COPY (
 SELECT 
    p.id AS post_id,
    p.title,
    p.body,
    p.userId,
    u.name AS author_name,
    u.email AS author_email
 FROM {{posts_file}} AS p
 LEFT JOIN {{users_file}} AS u ON p.userId = u.id
) TO '{{output_path}}' (FORMAT CSV);
