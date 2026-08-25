import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { mergeRuleOutcome } from '../../src/lib/rules.js';
import {
  loadPreset,
  mergePresets,
} from '../../src/lib/presets.js';

const defaultConfig = loadPreset('default');
const defaultRules = Array.isArray(defaultConfig.packageRules)
  ? (defaultConfig.packageRules as Record<string, unknown>[])
  : [];

const updateTypes = [
  'minor',
  'major',
  'patch',
  'pin',
  'pinDigest',
  'digest',
] as const;

const trustedOrgPrefixes = ['actions/', 'github/', 'aws-actions/'];

const packageNameArb = fc
  .tuple(
    fc.constantFrom(
      'actions',
      'github',
      'aws-actions',
      'some-other-org',
      'acme',
    ),
    fc
      .string({ minLength: 1, maxLength: 12 })
      .filter((s) => !s.includes('/') && !s.includes('*')),
  )
  .map(([org, name]) => `${org}/${name}`);

function isTrusted(packageName: string): boolean {
  return trustedOrgPrefixes.some((prefix) => packageName.startsWith(prefix));
}

function isEligibleForAutomerge(updateType: string): boolean {
  return ['patch', 'minor', 'pin', 'pinDigest'].includes(updateType);
}

test('every update keeps a minimum release age of 7 or 14 days', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('github-actions', 'npm'),
      fc.constantFrom(...updateTypes),
      packageNameArb,
      fc.nat(60),
      (manager, updateType, packageName, currentAgeDays) => {
        const outcome = mergeRuleOutcome(defaultRules, {
          manager,
          updateType,
          packageName,
          currentAgeDays,
        });
        assert.ok(
          outcome['minimumReleaseAge'] === '7 days' ||
            outcome['minimumReleaseAge'] === '14 days',
          `unexpected minimumReleaseAge ${JSON.stringify(outcome['minimumReleaseAge'])} for ${manager}/${packageName}/${updateType}@${currentAgeDays}d`,
        );
      },
    ),
  );
});

test('automerge applies exactly to old trusted github-actions updates', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('github-actions', 'npm'),
      fc.constantFrom(...updateTypes),
      packageNameArb,
      fc.nat(60),
      (manager, updateType, packageName, currentAgeDays) => {
        const outcome = mergeRuleOutcome(defaultRules, {
          manager,
          updateType,
          packageName,
          currentAgeDays,
        });
        const expected =
          manager === 'github-actions' &&
          isTrusted(packageName) &&
          isEligibleForAutomerge(updateType) &&
          currentAgeDays > 7;
        assert.equal(
          outcome['automerge'] === true,
          expected,
          `automerge mismatch for ${manager}/${packageName}/${updateType}@${currentAgeDays}d: got ${JSON.stringify(outcome['automerge'])}`,
        );
      },
    ),
  );
});

test('updates are disabled exactly for github-actions digests', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('github-actions', 'npm'),
      fc.constantFrom(...updateTypes),
      packageNameArb,
      fc.nat(60),
      (manager, updateType, packageName, currentAgeDays) => {
        const outcome = mergeRuleOutcome(defaultRules, {
          manager,
          updateType,
          packageName,
          currentAgeDays,
        });
        const expected = manager === 'github-actions' && updateType === 'digest';
        assert.equal(
          outcome['enabled'] === false,
          expected,
          `enabled mismatch for ${manager}/${packageName}/${updateType}: got ${JSON.stringify(outcome['enabled'])}`,
        );
      },
    ),
  );
});

test('14 day age only applies to old trusted github-actions updates', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('github-actions', 'npm'),
      fc.constantFrom(...updateTypes),
      packageNameArb,
      fc.nat(60),
      (manager, updateType, packageName, currentAgeDays) => {
        const outcome = mergeRuleOutcome(defaultRules, {
          manager,
          updateType,
          packageName,
          currentAgeDays,
        });
        const expected =
          manager === 'github-actions' &&
          isTrusted(packageName) &&
          isEligibleForAutomerge(updateType) &&
          currentAgeDays > 7;
        assert.equal(
          outcome['minimumReleaseAge'] === '14 days',
          expected,
          `14-day age mismatch for ${manager}/${packageName}/${updateType}@${currentAgeDays}d: got ${JSON.stringify(outcome['minimumReleaseAge'])}`,
        );
      },
    ),
  );
});

test('merging presets is associative', () => {
  const configArb = fc.record({
    summary: fc.string({ maxLength: 6 }),
    labels: fc.array(fc.string({ maxLength: 3 }), { maxLength: 3 }),
    nested: fc.record({
      enabled: fc.boolean(),
      depth: fc.nat(10),
    }),
    packageRules: fc.array(
      fc.record({
        matchUpdateTypes: fc.array(fc.constantFrom(...updateTypes), {
          maxLength: 3,
        }),
        enabled: fc.boolean(),
      }),
      { maxLength: 3 },
    ),
  });
  fc.assert(
    fc.property(
      configArb,
      configArb,
      configArb,
      (a, b, c) => {
        const left = mergePresets(a, mergePresets(b, c));
        const right = mergePresets(mergePresets(a, b), c);
        assert.deepEqual(left, right);
      },
    ),
  );
});

const presetCache = new Map<string, Record<string, unknown>>();
function cachedPreset(name: string): Record<string, unknown> {
  let config = presetCache.get(name);
  if (!config) {
    config = loadPreset(name);
    presetCache.set(name, config);
  }
  return config;
}

test('the last selected preset decides vulnerability alerts', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.constantFrom('default', 'enable-vulnerability-alerts'),
        { minLength: 1, maxLength: 8 },
      ),
      (selection) => {
        const merged = mergePresets(
          ...selection.map((name) => cachedPreset(name)),
        );
        const last = selection[selection.length - 1] as string;
        assert.equal(
          (merged.vulnerabilityAlerts as Record<string, unknown>)?.['enabled'],
          last === 'enable-vulnerability-alerts',
        );
      },
    ),
  );
});

test('dashboard approval persists once a manual preset is selected', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.constantFrom(
          'lockfile-maintenance-auto',
          'lockfile-maintenance-manual',
        ),
        { minLength: 1, maxLength: 8 },
      ),
      (selection) => {
        const merged = mergePresets(
          ...selection.map((name) => cachedPreset(name)),
        );
        const lockFileMaintenance = merged.lockFileMaintenance as Record<
          string,
          unknown
        >;
        assert.equal(lockFileMaintenance?.['enabled'], true);
        assert.equal(
          lockFileMaintenance?.['dependencyDashboardApproval'] === true,
          selection.includes('lockfile-maintenance-manual'),
        );
      },
    ),
  );
});
