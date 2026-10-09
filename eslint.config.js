import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.ts',
      '*.config.js',
      'server.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
    },
  },
];
