import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/src/graphdown/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  },
  {
    files: ['apps/web/src/graphdown/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../components/*',
            '../components/**',
            '../routes/*',
            '../routes/**',
            '../state/*',
            '../state/**',
            '../persistence/*',
            '../persistence/**',
            '../storage/*',
            '../storage/**',
            '../features/*',
            '../features/**',
            '../utils/*',
            '../utils/**'
          ],
          paths: [
            { name: 'react', message: 'graphdown must remain framework-agnostic.' },
            {
              name: 'react-router-dom',
              message: 'graphdown must remain framework-agnostic.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['apps/web/src/graphdown/**/*.{ts,tsx}'],
    ignores: [
      'apps/web/src/graphdown/**/__tests__/**',
      'apps/web/src/graphdown/**/*.test.*',
      'apps/web/src/graphdown/**/*.spec.*'
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
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/graphdown/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../graphdown/*',
            '../graphdown/**',
            '../../graphdown/*',
            '../../graphdown/**',
            '../../../graphdown/*',
            '../../../graphdown/**'
          ],
          message: 'Import from the graphdown barrel (../graphdown) instead of deep paths.'
        }
      ]
    }
  }
];
