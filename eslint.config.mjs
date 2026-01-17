import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/core/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  },
  {
    files: ['packages/core/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'core must remain framework-agnostic.' },
            { name: 'react-dom', message: 'core must remain framework-agnostic.' },
            { name: 'react-router-dom', message: 'core must remain framework-agnostic.' }
          ]
        }
      ]
    }
  },
  {
    files: ['packages/core/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/core/src/**/__tests__/**',
      'packages/core/src/**/__fixtures__/**',
      'packages/core/src/**/*.test.*',
      'packages/core/src/**/*.spec.*'
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['**/__tests__/**', '**/__fixtures__/**']
        }
      ]
    }
  },
  {
    files: ['packages/runtime/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@graphdown/core/*',
                '@graphdown/core/src/*',
                '@graphdown/core/src/**',
                '../core/*',
                '../core/**',
                '../../core/*',
                '../../core/**',
                '../../core/src/**',
                '../../../core/*',
                '../../../core/**',
                '../../../../core/**',
                '**/packages/core/**'
              ],
              message: 'Runtime must import @graphdown/core via the package barrel only.'
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      'packages/core/src/**/__tests__/**/*.{ts,tsx}',
      'packages/runtime/src/**/__tests__/**/*.{ts,tsx}',
      'apps/web/src/**/__tests__/**/*.{ts,tsx}',
      'packages/core/src/**/*.test.{ts,tsx}',
      'packages/core/src/**/*.spec.{ts,tsx}',
      'packages/runtime/src/**/*.test.{ts,tsx}',
      'packages/runtime/src/**/*.spec.{ts,tsx}',
      'apps/web/src/**/*.test.{ts,tsx}',
      'apps/web/src/**/*.spec.{ts,tsx}'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@graphdown/core/*',
                '@graphdown/core/src/*',
                '@graphdown/core/src/**',
                '../core/*',
                '../core/**',
                '../../core/*',
                '../../core/**',
                '../../../core/*',
                '../../../core/**',
                '../../../../core/**',
                '**/packages/core/**'
              ],
              message: 'Import from @graphdown/core (package barrel) only.'
            }
          ]
        }
      ]
    }
  }
];
