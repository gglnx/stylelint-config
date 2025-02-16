/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-sass-guidelines',
  plugins: [
    'stylelint-order',
    'stylelint-use-logical',
    'stylelint-scss',
  ],
  rules: {
    'csstools/use-logical': [true, {
      except: ['float'],
    }],
    'selector-max-compound-selectors': 4,
    // eslint-disable-next-line max-len
    'selector-class-pattern': ['^(?:(?:(?<type>has|u|js|is)-(?<util>(?!(has|u|js|is|t)-+)(?:[a-z]|(?<!-)-(?!-))+))|(?:t-(?<theme>(?!t-+)(?:[a-z0-9]|(?<!-)-(?!-))+))|(?<block>(?!(has|u|js|t)-+)(?:[a-z]|(?<!-)-(?!-))+)(?:__(?<element>(?:[a-z]|(?<!-)-(?!-))+))?(?:--(?<modifier>(?:[a-z0-9]|(?<!-)-(?!-))+))?)$', {
      resolveNestedSelectors: true,
      message: "Class pattern \"%s\" doesn't match BEM rules",
    }],
    'max-nesting-depth': [1, {
      ignore: ['blockless-at-rules', 'pseudo-classes'],
      ignoreAtRules: ['media', 'each', 'if', 'include', 'supports', 'container'],
      ignoreRules: ['/^.t-.+$/', '/::before/', '/::after/'],
    }],
    'property-no-unknown': [true, {
      ignoreSelectors: [':export'],
    }],
    'order/properties-alphabetical-order': true,
    'order/order': [
      [
        'dollar-variables',
        {
          type: 'at-rule',
          name: 'extend',
        },
        'custom-properties',
        'declarations',
        {
          type: 'rule',
          selector: '&$',
        },
        {
          type: 'rule',
          selector: '&:[\\w-]+|&\\[(.*?)\\]',
        },
        {
          type: 'rule',
          selector: '&::[\\w-]+',
        },
        'rules',
        {
          type: 'at-rule',
        },
      ],
    ],
  },
  overrides: [
    {
      files: ['*.scss', '**/*.scss'],
      customSyntax: 'postcss-scss',
    },
  ],
};
