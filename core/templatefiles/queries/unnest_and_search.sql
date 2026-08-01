-- Title: Search Within Arrays (Unnest)
-- Description: Unnests an array field (e.g. vehicles list) to search and filter individual items.
-- Tags: unnest, array, search, complex-data
-- Placeholders: source_file:$["kiesi-master-data;search.json@main"], array_column:vehicles, make_1:Toyota, make_2:Tesla

SELECT elem.MAKE, elem.MODEL, elem.YEAR, elem.MILEAGE, elem.PRICE
FROM {{source_file}}, 
unnest({{array_column}}) AS u(elem) 
WHERE elem.MAKE IN ('{{make_1}}', '{{make_2}}') 
ORDER BY elem.PRICE
LIMIT 100;
