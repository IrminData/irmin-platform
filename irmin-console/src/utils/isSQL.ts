/**
 * Detects if content is SQL or plain text
 *
 * @param content - The content to check
 * @returns true if content appears to be SQL, false otherwise
 */
export function isSQL(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const trimmed = content.trim();

  // Empty content is not SQL
  if (!trimmed) {
    return false;
  }

  // Common SQL keywords that indicate SQL queries
  const sqlKeywords = [
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE',
    'DROP',
    'ALTER',
    'FROM',
    'WHERE',
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'FULL',
    'OUTER',
    'GROUP BY',
    'ORDER BY',
    'HAVING',
    'UNION',
    'EXCEPT',
    'INTERSECT',
    'WITH',
    'AS',
    'ON',
    'AND',
    'OR',
    'NOT',
    'IN',
    'EXISTS',
    'LIKE',
    'ILIKE',
    'CAST',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'COUNT',
    'SUM',
    'AVG',
    'MAX',
    'MIN',
    'DISTINCT',
    'LIMIT',
    'OFFSET',
    'FETCH',
    'TOP',
  ];

  // Check if content starts with or contains SQL keywords
  // More lenient check - if it contains multiple SQL keywords, it's likely SQL
  // Use word boundaries to avoid false positives (e.g., "information" containing "IN" and "ON")
  let sqlKeywordCount = 0;
  for (const keyword of sqlKeywords) {
    // For multi-word keywords like "GROUP BY", use a regex that matches the phrase
    // For single-word keywords, use word boundaries to match whole words only
    if (keyword.includes(' ')) {
      // Multi-word keyword: match as phrase with word boundaries
      const pattern = new RegExp(
        `\\b${keyword.replace(/\s+/g, '\\s+')}\\b`,
        'i'
      );
      if (pattern.test(trimmed)) {
        sqlKeywordCount++;
      }
    } else {
      // Single-word keyword: use word boundaries to avoid substring matches
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(trimmed)) {
        sqlKeywordCount++;
      }
    }
  }

  // If we find multiple SQL keywords, it's likely SQL
  if (sqlKeywordCount >= 2) {
    return true;
  }

  // Check for SQL statement patterns (SELECT ... FROM, INSERT INTO, etc.)
  const sqlPatterns = [
    /\bSELECT\s+.+\s+FROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+.+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+(TABLE|VIEW|INDEX|DATABASE)\b/i,
    /\bDROP\s+(TABLE|VIEW|INDEX|DATABASE)\b/i,
    /\bALTER\s+(TABLE|VIEW)\b/i,
    /\bWITH\s+.+\s+AS\b/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Check for SQL-like structure (parentheses, commas, quotes typical of SQL)
  const hasSQLStructure =
    (trimmed.includes('(') && trimmed.includes(')')) ||
    trimmed.includes('`') ||
    trimmed.includes('"') ||
    trimmed.includes("'") ||
    (trimmed.includes(',') && sqlKeywordCount > 0);

  // If it has SQL structure and at least one keyword, likely SQL
  if (hasSQLStructure && sqlKeywordCount >= 1) {
    return true;
  }

  return false;
}
