import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  applicableRules,
  ageSatisfies,
  matchesPackagePattern,
  mergeRuleOutcome,
  parseAgeConstraint,
  parseAgeToDays,
  type RuleRecord,
} from '../../src/lib/rules.js';

const segmentArb = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => !s.includes('/') && !s.includes('*'));

const packageNameArb = fc
  .tuple(segmentArb, segmentArb)
  .map(([org, name]) => `${org}/${name}`);

const updateTypes = [
  'minor',
  'major',
  'patch',
  'pin',
  'pinDigest',
  'digest',
] as const;

test('a package name always matches its own exact pattern', () => {
  fc.assert(
    fc.property(packageNameArb, (packageName) => {
      assert.equal(matchesPackagePattern(packageName, packageName), true);
    }),
  );
});

test('an org glob pattern matches any package inside the org', () => {
  fc.assert(
    fc.property(segmentArb, segmentArb, (org, name) => {
      assert.equal(
        matchesPackagePattern(`${org}/**`, `${org}/${name}`),
        true,
      );
    }),
  );
});

test('an org glob pattern does not match the bare org or sibling prefixes', () => {
  fc.assert(
    fc.property(
      segmentArb,
      segmentArb,
      fc.constantFrom('-', '_', '.', 'x'),
      (org, name, suffix) => {
        assert.equal(matchesPackagePattern(`${org}/**`, org), false);
        assert.equal(
          matchesPackagePattern(`${org}/**`, `${org}${suffix}/${name}`),
          false,
        );
      },
    ),
  );
});

test('a single star does not cross package name separators', () => {
  fc.assert(
    fc.property(segmentArb, segmentArb, (org, name) => {
      assert.equal(matchesPackagePattern(`${org}*`, `${org}/${name}`), false);
    }),
  );
});

const AGE_UNITS: Record<string, number> = {
  second: 1 / 86_400,
  seconds: 1 / 86_400,
  minute: 1 / 1_440,
  minutes: 1 / 1_440,
  hour: 1 / 24,
  hours: 1 / 24,
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
};

test('age strings parse to their day value', () => {
  fc.assert(
    fc.property(
      fc.nat(1000),
      fc.constantFrom(...Object.keys(AGE_UNITS)),
      (amount, unit) => {
        assert.equal(
          parseAgeToDays(`${amount} ${unit}`),
          amount * (AGE_UNITS[unit] as number),
        );
      },
    ),
  );
});

test('malformed age strings parse to null', () => {
  const badUnitArb = fc
    .string({ minLength: 1, maxLength: 10 })
    .filter(
      (s) =>
        !/^(seconds?|minutes?|hours?|days?|weeks?)$/.test(s) &&
        !s.includes(' '),
    );
  fc.assert(
    fc.property(
      fc.nat(1000),
      badUnitArb,
      fc.constantFrom('-', ' ', ''),
      (amount, unit, prefix) => {
        assert.equal(parseAgeToDays(`${prefix}${amount} ${unit}`), null);
      },
    ),
  );
});

test('age constraints parse and compare exactly', () => {
  const operators = ['>', '>=', '<', '<=', '=='] as const;
  fc.assert(
    fc.property(
      fc.constantFrom(...operators),
      fc.nat(60),
      fc.nat(60),
      (operator, bound, age) => {
        const constraint = parseAgeConstraint(`${operator} ${bound} days`);
        assert.deepEqual(constraint, { operator, days: bound });
        assert.ok(constraint);
        const expected: Record<(typeof operators)[number], boolean> = {
          '>': age > bound,
          '>=': age >= bound,
          '<': age < bound,
          '<=': age <= bound,
          '==': age === bound,
        };
        assert.equal(ageSatisfies(age, constraint), expected[operator]);
      },
    ),
  );
});

test('a later matching rule overrides an earlier one', () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.integer(), fc.boolean(), fc.string({ maxLength: 8 })),
      fc.oneof(fc.integer(), fc.boolean(), fc.string({ maxLength: 8 })),
      (early, late) => {
        const rules: RuleRecord[] = [
          { matchUpdateTypes: ['patch'], minimumReleaseAge: early },
          { matchUpdateTypes: ['patch'], minimumReleaseAge: late },
        ];
        const outcome = mergeRuleOutcome(rules, { updateType: 'patch' });
        assert.deepEqual(outcome['minimumReleaseAge'], late);
      },
    ),
  );
});

test('merged outcomes never contain matcher keys', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          matchUpdateTypes: fc.constantFrom(updateTypes),
          matchManagers: fc.constantFrom('npm', 'github-actions'),
          excludePackageNames: fc.array(fc.string({ maxLength: 4 }), {
            maxLength: 2,
          }),
          enabled: fc.boolean(),
          automerge: fc.option(fc.boolean(), { nil: undefined }),
        }),
        { maxLength: 5 },
      ),
      fc.constantFrom(...updateTypes),
      fc.constantFrom('npm', 'github-actions'),
      (rules, updateType, manager) => {
        const outcome = mergeRuleOutcome(rules, { updateType, manager });
        for (const key of Object.keys(outcome)) {
          assert.ok(
            !key.startsWith('match') && !key.startsWith('exclude'),
            `matcher key leaked into outcome: ${key}`,
          );
        }
      },
    ),
  );
});

test('rules with a different manager never apply', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...updateTypes),
      packageNameArb,
      (updateType, packageName) => {
        const rules: RuleRecord[] = [
          { matchManagers: ['npm'], enabled: false },
        ];
        assert.deepEqual(
          applicableRules(rules, {
            manager: 'github-actions',
            updateType,
            packageName,
          }),
          [],
        );
      },
    ),
  );
});
