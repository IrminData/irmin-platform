import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import tsParser from '@typescript-eslint/parser';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';
import { importX } from 'eslint-plugin-import-x';
import jsxA11Y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-plugin-prettier/recommended';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import { configs as reactCompilerConfigs } from 'eslint-plugin-react-compiler';
import * as reactHooks from 'eslint-plugin-react-hooks';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint, { configs as tseslintConfigs } from 'typescript-eslint';

export default tseslint.config(
  globalIgnores([
    'public',
    '.claude',
    '.github',
    '.vscode',
    'node_modules',
    'tmp',
    'playwright-report',
    'test-results',
    'certificates',
    '.git',
    '.next',
    'tests',
    '**/*.config.{js,ts,mjs}',
    '**/*.config.js',
    '**/*.config.ts',
    '**/*.config.mjs',
    '**/*.d.ts',
  ]),
  js.configs.recommended,
  tseslintConfigs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
      'import-x/no-cycle': ['warn', { maxDepth: Infinity }],
      'import-x/no-duplicates': 'error',
      'import-x/no-unused-modules': [
        'warn',
        {
          unusedExports: true,
          missingExports: true,
        },
      ],
    },
  },
  {
    files: [
      'src/app/**/*.{js,jsx,ts,tsx}',
      'src/pages/**/*.{js,jsx,ts,tsx}',
      'src/middleware.{js,ts}',
      'src/instrumentation.{js,ts}',
      'src/instrumentation-client.{js,ts}',
    ],
    rules: {
      'import-x/no-unused-modules': 'off', // Next.js system files need to create exports, which would otherwise be flagged as unused
    },
  },
  {
    files: ['src/components/ui/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'import-x/no-unused-modules': 'off', // UI component files may have unused exports for component libraries
    },
  },
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
    rules: {
      ...eslintPluginBetterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/enforce-consistent-line-wrapping': 'warn',
      'better-tailwindcss/enforce-consistent-class-order': 'warn',
      'better-tailwindcss/enforce-consistent-variable-syntax': 'warn',
      'better-tailwindcss/enforce-shorthand-classes': 'warn',
      'better-tailwindcss/no-duplicate-classes': 'warn',
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unregistered-classes': [
        'error',
        {
          ignore: [
            'scrollbar-hide',
            'pattern-bg',
            'data-sheet-grid',
            'codemirror-editor',
            'mdx-viewer',
            'content-visibility-auto',
            'content-visibility-auto-lg',
            'content-visibility-auto-message',
          ],
        },
      ],
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-restricted-classes': 'error',
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/app/globals.css',
      },
    },
  },
  tanstackQuery.configs['flat/recommended'],
  reactPlugin.configs.flat.recommended,
  jsxA11Y.flatConfigs.recommended,
  promisePlugin.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-irregular-whitespace': 'off',
      'no-unused-vars': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/no-array-index-key': 'off',
      'react/display-name': 'warn',
      'react/self-closing-comp': 'warn',
      'react/jsx-no-target-blank': 'warn',
    },
  },
  reactCompilerConfigs.recommended,
  {
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },
  prettierConfig,
  next.configs.recommended
);
