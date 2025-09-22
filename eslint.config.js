// Flat ESLint config for ESLint v9+
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  { ignores: ['node_modules/**', 'web/dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: false, sourceType: 'module', ecmaVersion: 'latest' },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // General style
      'no-console': 'off',
      'no-alert': 'off',
      // TypeScript projects should disable no-undef (handled by TS)
      'no-undef': 'off',
      // Import rules
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external', 'internal'],
            ['parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
        },
      ],
      // TS specific
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // Prefer plugin for unuseds
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      // Reduce noise from escapes in template strings
      'no-useless-escape': 'warn',
    },
  },
  // Node config files
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js'],
    rules: {
      'no-undef': 'off',
    },
  },
  prettier,
];
