import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-plugin-prettier/recommended';
import promisePlugin from 'eslint-plugin-promise';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'public/**',
    '*.config.js',
    '*.config.ts',
    '*.config.mjs',
    'register.mjs',
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['src/**/*.ts'],
    extends: [
      promisePlugin.configs['flat/recommended'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
      'import-x/resolver-typescript': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      'no-console': 'off',
      'prefer-const': 'error',
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'off', // This is a server, so we need to use nodejs modules
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
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      // Preserve parserOptions from disableTypeChecked (program: null,
      // project: false, projectService: false) — these are what actually turn
      // off type-aware linting for non-TS files. Dropping them would make the
      // parser try to attach .mjs/.js files to the TS project and fail.
      ...tseslint.configs.disableTypeChecked.languageOptions,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...tseslint.configs.disableTypeChecked.languageOptions?.globals,
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
  },
  prettierConfig,
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', '*.config.mjs'],
  }
);