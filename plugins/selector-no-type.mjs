/**
 * Disallows type selectors, except as the subject of a `:is()`, `:not()` or `:has()`
 * that is attached to a class, id or attribute selector.
 *
 * Allowed:    `.foo:is(button, a)`, `.foo:not(button)`, `.foo:has(> img)`, `.foo { &:is(button) {} }`
 * Disallowed: `button`, `.foo button`, `button.foo`, `:is(a, button)`, `.foo:where(button)`,
 *             `button:is(.foo)`, `.foo:is(button.bar)`, `.foo:is(button .bar)`
 *
 * Options:
 *   ignoreStandaloneTypes: Array<string | RegExp> – type selectors allowed without a qualifier
 *                          (e.g. `['html', 'body']` allows `html {}`, but not `body.foo {}`)
 */
import selectorParser from 'postcss-selector-parser';
import stylelint from 'stylelint';
import getRuleSelector from 'stylelint/lib/utils/getRuleSelector.mjs';
import isKeyframeRule from 'stylelint/lib/utils/isKeyframeRule.mjs';
import isStandardSyntaxRule from 'stylelint/lib/utils/isStandardSyntaxRule.mjs';
import optionsMatches from 'stylelint/lib/utils/optionsMatches.mjs';
import isStandardSyntaxTypeSelector from 'stylelint/lib/utils/isStandardSyntaxTypeSelector.mjs';
import parseSelector from 'stylelint/lib/utils/parseSelector.mjs';
import resolveNestedSelectorsForRule from 'stylelint/lib/utils/resolveNestedSelectorsForRule.mjs';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = 'gglnx/selector-no-type';

const messages = ruleMessages(ruleName, {
  rejected: (type) => (
    `Unexpected type selector "${type}" `
    + '(only allowed inside :is(), :not() or :has() attached to a class, id or attribute)'
  ),
});

const meta = {
  url: 'https://github.com/gglnx/stylelint-config#deviations',
};

/** Pseudo-classes in which type selectors are allowed */
const ALLOWED_PSEUDO_CLASSES = new Set([':is', ':not', ':has']);

/** Pseudo-classes that qualify a compound selector if all of their arguments are qualified */
const MATCHING_PSEUDO_CLASSES = new Set([':is', ':where', ':matches']);

/**
 * @param {selectorParser.Node} node
 * @returns {boolean}
 */
function isCompoundBoundary(node) {
  return selectorParser.isCombinator(node) || selectorParser.isPseudoElement(node);
}

/**
 * Returns the nodes of the compound selector the node is part of (without the node itself).
 *
 * @param {selectorParser.Node} node
 * @returns {Array<selectorParser.Node>}
 */
function getCompoundSiblings(node) {
  const result = [];

  for (let sibling = node.prev(); sibling && !isCompoundBoundary(sibling); sibling = sibling.prev()) {
    result.push(sibling);
  }

  for (let sibling = node.next(); sibling && !isCompoundBoundary(sibling); sibling = sibling.next()) {
    result.push(sibling);
  }

  return result;
}

/**
 * Checks whether the node is part of the last (subject) compound selector.
 *
 * @param {selectorParser.Node} node
 * @returns {boolean}
 */
function isInSubjectCompound(node) {
  for (let sibling = node.next(); sibling; sibling = sibling.next()) {
    if (selectorParser.isCombinator(sibling)) return false;
  }

  return true;
}

/**
 * Returns the nodes of the last (subject) compound selector.
 *
 * @param {selectorParser.Selector} selector
 * @returns {Array<selectorParser.Node>}
 */
function getSubjectCompound(selector) {
  const index = selector.nodes.findLastIndex((node) => selectorParser.isCombinator(node));

  return selector.nodes.slice(index + 1);
}

/**
 * Returns the pseudo-class whose argument directly contains the node.
 *
 * @param {selectorParser.Node} node
 * @returns {selectorParser.Pseudo | undefined}
 */
function getEnclosingPseudoClass(node) {
  const container = node.parent?.parent;

  return selectorParser.isPseudoClass(container) ? container : undefined;
}

/**
 * @param {(node: selectorParser.Nesting) => boolean} isNestingQualified
 */
function createQualifierCheck(isNestingQualified) {
  /**
   * @param {selectorParser.Node} node
   * @returns {boolean}
   */
  const isQualifier = (node) => {
    if (selectorParser.isIdentifier(node) || selectorParser.isClassName(node) || selectorParser.isAttribute(node)) {
      return true;
    }

    if (selectorParser.isNesting(node)) {
      return isNestingQualified(node);
    }

    // e.g. `:is(.a, .b)` qualifies its compound
    if (
      selectorParser.isPseudoClass(node)
      && node.nodes.length > 0
      && MATCHING_PSEUDO_CLASSES.has(node.value.toLowerCase())
    ) {
      return node.nodes.every((selector) => getSubjectCompound(selector).some((child) => isQualifier(child)));
    }

    return false;
  };

  return isQualifier;
}

/**
 * Finds the closest parent rule (skipping at-rules like `@media`).
 *
 * @param {import('postcss').Rule} ruleNode
 * @returns {import('postcss').Rule | undefined}
 */
function getParentRule(ruleNode) {
  for (let parent = ruleNode.parent; parent; parent = parent.parent) {
    if (parent.type === 'rule') return parent;
  }
}

/** @type {import('stylelint').Rule} */
const rule = (primary, secondaryOptions) => (root, result) => {
  const validOptions = validateOptions(
    result,
    ruleName,
    {
      actual: primary,
      possible: [true],
    },
    {
      actual: secondaryOptions,
      possible: {
        ignoreStandaloneTypes: [(value) => typeof value === 'string' || value instanceof RegExp],
      },
      optional: true,
    },
  );

  if (!validOptions) {
    return;
  }

  /** @type {WeakMap<import('postcss').Rule, boolean>} */
  const qualifiedRules = new WeakMap();

  /**
   * Checks whether all selectors of the rule end with a qualified compound selector.
   *
   * @param {import('postcss').Rule} ruleNode
   * @returns {boolean}
   */
  const isRuleQualified = (ruleNode) => {
    if (!qualifiedRules.has(ruleNode)) {
      const isQualifier = createQualifierCheck(() => false);
      const qualified = isStandardSyntaxRule(ruleNode) && resolveNestedSelectorsForRule(ruleNode, result).every(
        ({ resolvedSelectors }) => resolvedSelectors.nodes.every(
          (selector) => getSubjectCompound(selector).some((node) => isQualifier(node)),
        ),
      );

      qualifiedRules.set(ruleNode, qualified);
    }

    return qualifiedRules.get(ruleNode);
  };

  root.walkRules((ruleNode) => {
    if (!isStandardSyntaxRule(ruleNode) || isKeyframeRule(ruleNode)) {
      return;
    }

    const parentRule = getParentRule(ruleNode);

    // `&` without a parent rule (e.g. inside a mixin) can't be resolved, so it counts as qualified
    const isQualifier = createQualifierCheck(() => !parentRule || isRuleQualified(parentRule));

    const hasQualifier = (nodes) => nodes.some((node) => isQualifier(node));

    /**
     * Checks whether the pseudo-class is `:is()`/`:not()`/`:has()` and attached to a qualified compound selector.
     *
     * @param {selectorParser.Pseudo} pseudo
     * @returns {boolean}
     */
    const isAnchoredPseudoClass = (pseudo) => {
      if (!ALLOWED_PSEUDO_CLASSES.has(pseudo.value.toLowerCase())) return false;

      if (hasQualifier(getCompoundSiblings(pseudo))) return true;

      // Nested pseudo-classes, e.g. `.foo:not(:is(button))`, `.foo:has(> :is(img, svg))`
      const enclosing = getEnclosingPseudoClass(pseudo);

      return Boolean(enclosing) && isInSubjectCompound(pseudo) && isAnchoredPseudoClass(enclosing);
    };

    /**
     * @param {selectorParser.Tag} tag
     * @returns {boolean}
     */
    const isAllowedTag = (tag) => {
      const compound = getCompoundSiblings(tag);

      if (optionsMatches(secondaryOptions, 'ignoreStandaloneTypes', tag.value) && !hasQualifier(compound)) {
        return true;
      }

      const enclosing = getEnclosingPseudoClass(tag);

      return Boolean(enclosing)
        && isInSubjectCompound(tag)
        && !hasQualifier(compound)
        && isAnchoredPseudoClass(enclosing);
    };

    const selectorRoot = parseSelector(getRuleSelector(ruleNode), result, ruleNode);

    selectorRoot?.walkTags((tag) => {
      if (!isStandardSyntaxTypeSelector(tag) || isAllowedTag(tag)) return;

      const index = tag.sourceIndex ?? 0;

      report({
        ruleName,
        result,
        node: ruleNode,
        message: messages.rejected,
        messageArgs: [tag.value],
        index,
        endIndex: index + tag.value.length,
      });
    });
  });
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export default createPlugin(ruleName, rule);
