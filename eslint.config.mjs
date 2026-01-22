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
    files: ['packages/dataset/src/**/*.{ts,tsx}'],
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
    files: ['packages/dataset/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'dataset must remain framework-agnostic.' },
            {
              name: 'react-dom',
              message: 'dataset must remain framework-agnostic.'
            },
            {
              name: 'react-router-dom',
              message: 'dataset must remain framework-agnostic.'
            }
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
    files: ['packages/dataset/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/dataset/src/**/__tests__/**',
      'packages/dataset/src/**/__fixtures__/**',
      'packages/dataset/src/**/*.test.*',
      'packages/dataset/src/**/*.spec.*'
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
                '@graphdown/dataset/*',
                '@graphdown/dataset/src/*',
                '@graphdown/dataset/src/**',
                '../dataset/*',
                '../dataset/**',
                '../../dataset/*',
                '../../dataset/**',
                '../../dataset/src/**',
                '../../../dataset/*',
                '../../../dataset/**',
                '../../../../dataset/**',
                '**/packages/dataset/**'
              ],
              message: 'Runtime must import @graphdown/dataset via the package barrel only.'
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
      'packages/dataset/src/**/__tests__/**/*.{ts,tsx}',
      'packages/core/src/**/*.test.{ts,tsx}',
      'packages/core/src/**/*.spec.{ts,tsx}',
      'packages/runtime/src/**/*.test.{ts,tsx}',
      'packages/runtime/src/**/*.spec.{ts,tsx}',
      'apps/web/src/**/*.test.{ts,tsx}',
      'apps/web/src/**/*.spec.{ts,tsx}',
      'packages/dataset/src/**/*.test.{ts,tsx}',
      'packages/dataset/src/**/*.spec.{ts,tsx}'
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
                '@graphdown/dataset/*',
                '@graphdown/dataset/src/*',
                '@graphdown/dataset/src/**',
                '../dataset/*',
                '../dataset/**',
                '../../dataset/*',
                '../../dataset/**',
                '../../dataset/src/**',
                '../../../dataset/*',
                '../../../dataset/**',
                '../../../../dataset/**',
                '**/packages/dataset/**'
              ],
              message: 'Import from @graphdown/dataset (package barrel) only.'
            }
          ]
        }
      ]
    }
  }
];
