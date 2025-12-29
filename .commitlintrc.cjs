// Commitlint configuration for semantic versioning
// Follows Centroid git standards - single authorship, no external attribution

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Header length limit
    'header-max-length': [2, 'always', 100],

    // Body is required - every commit must explain the change
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'body-min-length': [2, 'always', 10],

    // Footer line length
    'footer-max-line-length': [2, 'always', 100],

    // Type validation - must use conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'perf',     // Performance improvement
        'refactor', // Code refactoring
        'docs',     // Documentation only
        'chore',    // Maintenance tasks
        'test',     // Test additions/updates
        'build',    // Build system changes
        'ci',       // CI configuration changes
        'style',    // Code style changes (formatting)
        'revert'    // Revert previous commit
      ]
    ],

    // Ensure type is always lowercase
    'type-case': [2, 'always', 'lower-case'],

    // Subject shouldn't be empty
    'subject-empty': [2, 'never'],

    // Subject shouldn't end with period
    'subject-full-stop': [2, 'never', '.'],

    // No external attribution (Co-Authored-By, Generated with, etc.)
    'trailer-exists': [0],  // Disable default trailer checking

    // Custom rules would go here if needed
  },
  plugins: [
    {
      rules: {
        // Custom rule: no external attribution
        'no-external-attribution': ({ raw }) => {
          const forbiddenPatterns = [
            /Co-Authored-By:/i,
            /Generated with/i,
            /Thanks to/i,
            /Pair-Programmed-With:/i,
            /Helped-By:/i,
            /claude\.com/i,
            /anthropic\.com/i
          ];

          for (const pattern of forbiddenPatterns) {
            if (pattern.test(raw)) {
              return [
                false,
                'Commits must have single authorship - no external attribution. ' +
                'Remove ALL attribution (Co-Authored-By, Generated with, Thanks to, etc.). ' +
                'Git already tracks authorship. Additional attribution dilutes responsibility. ' +
                'One commit = one author = clear ownership.'
              ];
            }
          }
          return [true];
        },

        // Custom rule: no email addresses
        'no-emails-anywhere': ({ raw }) => {
          const emailPattern = /<[^>]+@[^>]+>|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
          if (emailPattern.test(raw)) {
            return [
              false,
              'No email addresses in commits (privacy & single authorship). ' +
              'Git already records your email in commit metadata. ' +
              'Use @username or issue #123 for references.'
            ];
          }
          return [true];
        }
      }
    }
  ]
};
