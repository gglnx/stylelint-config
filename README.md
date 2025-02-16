# @gglnx/stylelint-config

This is my personal Stylelint shared configuration. It's based on the [`stylelint-config-sass-guidelines`](https://github.com/bjankord/stylelint-config-sass-guidelines).

## Installation

Install the configuration and all peer dependencies:

```bash
npm install --save-dev @gglnx/stylelint-config
```

## Usage

Create an `.stylelintrc` file in your project root:

```json
{
  "extends": "@gglnx/stylelint-config"
}
```

## Deviations

* `csstools/use-logical`: Use logical props (except for float)
* `selector-max-compound-selectors`: Limited to 4 compound selectors
* `selector-class-pattern`: Allows only the BEM naming scheme (`.block__element--modifier`) and helper and theming classes (`.has-*`, `.u-*`, `.js-*`, `.is-*`, `.t-*`)
* `max-nesting-depth`: Limits to one nesting level except for pseudo-classes, at-rules and theming classes (`.t-*`)
* `property-no-unknown`: Adds allowance for `:export` property (CSS modules)
* `order/properties-alphabetical-order`: Enforce alphabetical order for all properties
* `order/order`: Custom order inside selectors:
  1. SCSS variables
  2. `@extend` at-rules
  3. Custom properties
  4. Declarations
  5. Nested rules beginning with `&`
  6. Nested rules for pseudo-classes (like `:hover`)
  7. Nested rules for pseudo-elements (`::before/::after`)
  8. Other nested rules
  9. At-rules (like @media, @include or @container)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

Distributed under the [MIT License](https://opensource.org/license/mit). See `LICENSE` for more information.
