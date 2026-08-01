#!/usr/bin/env tsx
/**
 * Dictionary Validation Script
 *
 * Validates translation dictionaries for:
 * - Structure parity between en.ts and fi.ts
 * - Unused translation keys
 * - Duplicate string values
 * - Unnecessary fallback patterns
 *
 * Usage:
 *   pnpm dict:validate        # Report mode
 *   pnpm dict:validate --fix  # Auto-fix parity issues
 */
import * as fs from 'fs';
import * as path from 'path';

import { serializeDictionaryValue } from './dict-format';

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const DICT_DIR = path.resolve(SRC_DIR, 'lib/dict');
const EN_PATH = path.resolve(DICT_DIR, 'en.ts');
const FI_PATH = path.resolve(DICT_DIR, 'fi.ts');

// Types are inferred from usage

// ============================================================================
// Dictionary Parsing
// ============================================================================

/**
 * Parse a dictionary TypeScript file and extract the object
 */
function parseDictFile(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract the object content between the first { and last }
  // This is a simplified parser - works for our dict format
  const match = content.match(/const \w+ = ({[\s\S]*});?\s*export default/);
  if (!match) {
    throw new Error(`Could not parse dictionary file: ${filePath}`);
  }

  // Use Function constructor to evaluate the object literal
  // This is safe as we control these files
  try {
    const fn = new Function(`return ${match[1]}`);
    return fn() as Record<string, unknown>;
  } catch {
    throw new Error(`Could not evaluate dictionary object in: ${filePath}`);
  }
}

/**
 * Recursively extract all keys from a nested object
 * Returns array of dot-separated paths like "common.loading"
 */
function extractKeys(
  obj: Record<string, unknown>,
  prefix = ''
): { keys: string[]; values: Map<string, string> } {
  const keys: string[] = [];
  const values = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = extractKeys(value as Record<string, unknown>, fullKey);
      keys.push(...nested.keys);
      for (const [k, v] of nested.values) {
        values.set(k, v);
      }
    } else if (typeof value === 'string') {
      keys.push(fullKey);
      values.set(fullKey, value);
    }
  }

  return { keys, values };
}

// ============================================================================
// File Scanning
// ============================================================================

/**
 * Recursively get all TypeScript files in a directory
 */
function getSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== '__tests__'
        ) {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        // Skip dictionary files themselves
        if (!fullPath.includes('/lib/dict/')) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Find all dict.x.y usages in source files
 * Handles both single-line and multi-line access patterns
 */
function findDictUsages(files: string[]): {
  usedKeys: Set<string>;
  dynamicPatterns: string[];
  fallbackPatterns: {
    file: string;
    line: number;
    pattern: string;
    key: string;
  }[];
} {
  const usedKeys = new Set<string>();
  const dynamicPatterns: string[] = [];
  const fallbackPatterns: {
    file: string;
    line: number;
    pattern: string;
    key: string;
  }[] = [];

  // Common JavaScript/TypeScript string methods that might be called on dict values
  const stringMethods = new Set([
    'replace',
    'replaceAll',
    'split',
    'trim',
    'trimStart',
    'trimEnd',
    'toLowerCase',
    'toUpperCase',
    'includes',
    'startsWith',
    'endsWith',
    'match',
    'slice',
    'substring',
    'substr',
    'charAt',
    'charCodeAt',
    'concat',
    'indexOf',
    'lastIndexOf',
    'localeCompare',
    'normalize',
    'padStart',
    'padEnd',
    'repeat',
    'toString',
    'valueOf',
    'at',
  ]);

  // Pattern to match dict.x.y.z access, capturing what follows
  const dictAccessWithContextPattern =
    /dict\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(\s*\()?/g;

  // Pattern to match dynamic access: as keyof typeof dict.x
  const dynamicPattern =
    /as keyof typeof dict\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

  // Pattern to match bracket notation access: dict.x.y[variable]
  // This indicates dynamic access to all keys under dict.x.y
  const bracketAccessPattern =
    /dict\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\[/g;

  // Pattern to match multi-line dict access like:
  // dict.consoleNavigation
  //   .staticSearchItems
  //   .description
  //   .workspaceDocumentation
  // Captures the full match and checks for trailing (
  const multiLineDictPattern =
    /dict(?:\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)+(\s*\()?/gs;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Find all dict.x.y accesses
    let match;
    while ((match = dictAccessWithContextPattern.exec(content)) !== null) {
      let keyPath = match[1];
      const hasMethodCall = match[2]; // Is there a ( after?

      // If followed by (, the last segment might be a method call
      if (hasMethodCall) {
        const parts = keyPath.split('.');
        if (parts.length > 1 && stringMethods.has(parts[parts.length - 1])) {
          parts.pop();
          keyPath = parts.join('.');
        }
      }

      if (keyPath) {
        usedKeys.add(keyPath);
      }
    }

    // Find multi-line dict accesses
    while ((match = multiLineDictPattern.exec(content)) !== null) {
      // Normalize: remove whitespace and extract the key path
      let normalized = match[0]
        .replace(/\s+/g, '') // Remove all whitespace
        .replace(/^dict\./, '') // Remove 'dict.' prefix
        .replace(/\($/, ''); // Remove trailing ( if present

      const hasMethodCall = match[1]; // Is there a ( after?

      // If followed by (, the last segment might be a method call
      if (hasMethodCall) {
        const parts = normalized.split('.');
        if (parts.length > 1 && stringMethods.has(parts[parts.length - 1])) {
          parts.pop();
          normalized = parts.join('.');
        }
      }

      if (normalized) {
        usedKeys.add(normalized);
      }
    }

    // Find dynamic patterns (as keyof typeof dict.x)
    while ((match = dynamicPattern.exec(content)) !== null) {
      dynamicPatterns.push(match[1]);
    }

    // Find bracket notation access (dict.x.y[variable])
    // These indicate dynamic access to all keys under that path
    while ((match = bracketAccessPattern.exec(content)) !== null) {
      dynamicPatterns.push(match[1]);
    }

    // Find fallback patterns with line numbers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = line.matchAll(
        /dict\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\?\?\s*['"`]([^'"`]*)/g
      );
      for (const m of lineMatches) {
        fallbackPatterns.push({
          file: path.relative(SRC_DIR, file),
          line: i + 1,
          pattern: m[0],
          key: m[1],
        });
      }
    }
  }

  return { usedKeys, dynamicPatterns, fallbackPatterns };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check parity between two dictionaries
 */
function checkParity(
  enKeys: string[],
  fiKeys: string[]
): { missingInFi: string[]; extraInFi: string[] } {
  const enSet = new Set(enKeys);
  const fiSet = new Set(fiKeys);

  const missingInFi = enKeys.filter((k) => !fiSet.has(k));
  const extraInFi = fiKeys.filter((k) => !enSet.has(k));

  return { missingInFi, extraInFi };
}

/**
 * Find unused keys
 */
function findUnusedKeys(
  allKeys: string[],
  usedKeys: Set<string>,
  dynamicPatterns: string[]
): string[] {
  // Expand dynamic patterns - if "workflow.pipeline" is dynamically accessed,
  // all keys under it should be considered used
  const dynamicPrefixes = new Set(dynamicPatterns);

  return allKeys.filter((key) => {
    // Check if directly used
    if (usedKeys.has(key)) return false;

    // Check if covered by a dynamic pattern
    for (const prefix of dynamicPrefixes) {
      if (key.startsWith(prefix + '.') || key === prefix) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Find duplicate string values
 */
function findDuplicates(
  values: Map<string, string>,
  usedKeys: Set<string>
): { value: string; keys: string[]; usageCounts: Map<string, number> }[] {
  // Build reverse map: value -> keys
  const valueToKeys = new Map<string, string[]>();

  for (const [key, value] of values) {
    // Skip very short strings that are likely intentionally duplicated
    if (value.length < 3) continue;

    const existing = valueToKeys.get(value) || [];
    existing.push(key);
    valueToKeys.set(value, existing);
  }

  // Filter to duplicates only
  const duplicates: {
    value: string;
    keys: string[];
    usageCounts: Map<string, number>;
  }[] = [];

  for (const [value, keys] of valueToKeys) {
    if (keys.length > 1) {
      // Count usages for each key
      const usageCounts = new Map<string, number>();
      for (const key of keys) {
        usageCounts.set(key, usedKeys.has(key) ? 1 : 0);
      }

      duplicates.push({ value, keys, usageCounts });
    }
  }

  // Sort by number of duplicates (descending)
  return duplicates.sort((a, b) => b.keys.length - a.keys.length);
}

// ============================================================================
// Fixing
// ============================================================================

/**
 * Add missing keys to fi.ts with TODO markers
 * Currently outputs instructions for manual intervention
 */
function fixParityIssues(
  missingInFi: string[],
  enValues: Map<string, string>
): void {
  if (missingInFi.length === 0) {
    console.log('No parity issues to fix.');
    return;
  }

  for (const key of missingInFi) {
    const enValue = enValues.get(key);
    if (!enValue) continue;

    const parts = key.split('.');
    const parentKey = parts.slice(0, -1).join('.');
    const leafKey = parts[parts.length - 1];
    const serializedValue = serializeDictionaryValue(enValue);

    // Log what needs to be added manually
    console.log(`  Add to ${parentKey}: ${leafKey}: ${serializedValue}`);
  }

  console.log(
    '\nManual intervention required - keys listed above need to be added to fi.ts'
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const outputJson = args.includes('--json');

  // Helper to log only in non-JSON mode
  const log = (...messages: unknown[]) => {
    if (!outputJson) console.log(...messages);
  };

  log('=== Dictionary Validation Report ===\n');

  // Parse dictionaries
  log('Loading dictionaries...');
  const enDict = parseDictFile(EN_PATH);
  const fiDict = parseDictFile(FI_PATH);

  const enExtracted = extractKeys(enDict);
  const fiExtracted = extractKeys(fiDict);

  log(`  EN: ${enExtracted.keys.length} keys`);
  log(`  FI: ${fiExtracted.keys.length} keys\n`);

  // Check parity
  log('[PARITY] Structure Check');
  const parity = checkParity(enExtracted.keys, fiExtracted.keys);

  if (parity.missingInFi.length === 0 && parity.extraInFi.length === 0) {
    log('  All keys match between en.ts and fi.ts');
  } else {
    if (parity.missingInFi.length > 0) {
      log(`  Missing in fi.ts (${parity.missingInFi.length}):`);
      for (const key of parity.missingInFi.slice(0, 10)) {
        log(`    - ${key}`);
      }
      if (parity.missingInFi.length > 10) {
        log(`    ... and ${parity.missingInFi.length - 10} more`);
      }
    }
    if (parity.extraInFi.length > 0) {
      log(`  Extra in fi.ts (${parity.extraInFi.length}):`);
      for (const key of parity.extraInFi.slice(0, 10)) {
        log(`    - ${key}`);
      }
      if (parity.extraInFi.length > 10) {
        log(`    ... and ${parity.extraInFi.length - 10} more`);
      }
    }
  }
  log();

  // Scan source files
  log('[USAGE] Scanning source files...');
  const sourceFiles = getSourceFiles(SRC_DIR);
  log(`  Found ${sourceFiles.length} source files`);

  const { usedKeys, dynamicPatterns, fallbackPatterns } =
    findDictUsages(sourceFiles);
  log(`  Found ${usedKeys.size} unique key usages`);
  log(`  Found ${dynamicPatterns.length} dynamic access patterns`);
  log();

  // Find unused keys
  log('[UNUSED] Unused Key Analysis');
  const unusedKeys = findUnusedKeys(
    enExtracted.keys,
    usedKeys,
    dynamicPatterns
  );

  if (unusedKeys.length === 0) {
    log('  All keys are used');
  } else {
    log(`  Potentially unused keys (${unusedKeys.length}):`);
    // Show all unused keys for easy copy-paste
    for (const key of unusedKeys) {
      log(`    - ${key}`);
    }
  }
  log();

  // Find duplicates
  log('[DUPLICATES] Duplicate Value Analysis');
  const duplicates = findDuplicates(enExtracted.values, usedKeys);

  if (duplicates.length === 0) {
    log('  No duplicate values found');
  } else {
    log(`  Found ${duplicates.length} duplicate values:`);
    for (const dup of duplicates.slice(0, 10)) {
      const displayValue =
        dup.value.length > 40 ? dup.value.substring(0, 40) + '...' : dup.value;
      log(`    "${displayValue}":`);
      for (const key of dup.keys) {
        const isUsed = usedKeys.has(key) ? '' : ' (unused)';
        log(`      - ${key}${isUsed}`);
      }
    }
    if (duplicates.length > 10) {
      log(`    ... and ${duplicates.length - 10} more`);
    }
  }
  log();

  // Find fallback patterns
  log('[FALLBACKS] Unnecessary Fallback Patterns');
  const unnecessaryFallbacks = fallbackPatterns.filter((f) =>
    enExtracted.values.has(f.key)
  );

  if (unnecessaryFallbacks.length === 0) {
    log('  No unnecessary fallbacks found');
  } else {
    log(`  Found ${unnecessaryFallbacks.length} unnecessary fallbacks:`);
    for (const fb of unnecessaryFallbacks) {
      log(`    ${fb.file}:${fb.line}`);
      log(`      ${fb.pattern.substring(0, 60)}...`);
      log(`      Key exists: dict.${fb.key}`);
    }
  }
  log();

  // Determine what constitutes an actual error vs informational
  const parityIssueCount = parity.missingInFi.length + parity.extraInFi.length;
  const hasErrors = parityIssueCount > 0 || unnecessaryFallbacks.length > 0;
  const hasWarnings = unusedKeys.length > 0 || duplicates.length > 0;

  // JSON output mode
  if (outputJson) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalKeys: enExtracted.keys.length,
        parityIssues: parityIssueCount,
        unusedKeys: unusedKeys.length,
        duplicateValues: duplicates.length,
        unnecessaryFallbacks: unnecessaryFallbacks.length,
      },
      parity: {
        missingInFi: parity.missingInFi,
        extraInFi: parity.extraInFi,
      },
      unusedKeys: unusedKeys,
      duplicates: duplicates.map((d) => ({
        value: d.value,
        keys: d.keys,
      })),
      fallbacks: unnecessaryFallbacks,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(hasErrors ? 1 : 0);
  }

  // Summary
  console.log('=== Summary ===');

  if (!hasErrors && !hasWarnings) {
    console.log('No issues found!');
    process.exit(0);
  }

  // Show errors (things that should fail CI)
  if (hasErrors) {
    console.log('ERRORS (must fix):');
    if (parityIssueCount > 0) {
      console.log(`  Parity issues: ${parityIssueCount}`);
    }
    if (unnecessaryFallbacks.length > 0) {
      console.log(`  Unnecessary fallbacks: ${unnecessaryFallbacks.length}`);
    }
  }

  // Show warnings (informational)
  if (hasWarnings) {
    console.log('WARNINGS (informational):');
    if (unusedKeys.length > 0) {
      console.log(`  Potentially unused keys: ${unusedKeys.length}`);
    }
    if (duplicates.length > 0) {
      console.log(`  Duplicate values: ${duplicates.length}`);
    }
  }

  if (shouldFix && parityIssueCount > 0) {
    console.log('\n=== Attempting Auto-Fix ===');
    fixParityIssues(parity.missingInFi, enExtracted.values);
  } else if (parityIssueCount > 0) {
    console.log('\nRun with --fix to attempt auto-fixing parity issues');
  }

  // Only exit with error code for actual errors (parity, fallbacks)
  // Unused keys and duplicates are informational warnings
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
