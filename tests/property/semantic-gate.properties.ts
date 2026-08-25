import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  checkSemanticCoverage,
  flattenKeyPaths,
  IGNORED_KEYS,
  type FeatureScenario,
  type SemanticManifest,
} from '../../src/lib/semantic.js';

const FEATURE = 'f.feature';
const SCENARIO = 's0';
const PRESET = 'p0';

const keyArb = fc
  .string({ minLength: 1, maxLength: 5 })
  .filter((key) => !IGNORED_KEYS.has(key));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const leafArb = fc.oneof(
  fc.boolean(),
  fc.integer({ min: 0, max: 99 }),
  fc.string({ maxLength: 4 }),
  fc.array(fc.string({ maxLength: 4 }), { maxLength: 3 }),
);

const valueArb: fc.Arbitrary<unknown> = fc.oneof(
  leafArb,
  fc.constant({}),
  fc.array(fc.record({ k: leafArb }), { maxLength: 2 }),
  fc.uniqueArray(keyArb, { minLength: 1, maxLength: 3 }).chain((keys) =>
    fc
      .tuple(...keys.map(() => leafArb))
      .map((values) =>
        Object.fromEntries(keys.map((key, i) => [key, values[i]])),
      ),
  ),
);

const configArb = fc
  .uniqueArray(keyArb, { minLength: 1, maxLength: 4 })
  .chain((keys) =>
    fc
      .tuple(...keys.map(() => valueArb))
      .map((values) =>
        Object.fromEntries(keys.map((key, i) => [key, values[i]])),
      ),
  );

function countLeaves(value: unknown): number {
  if (Array.isArray(value)) {
    if (!value.some((element) => isPlainObject(element))) {
      return 1;
    }
    let total = 0;
    for (const element of value) {
      total += isPlainObject(element) ? objectLeaves(element) : 1;
    }
    return total;
  }
  if (isPlainObject(value)) {
    return objectLeaves(value);
  }
  return 0;
}

function objectLeaves(object: Record<string, unknown>): number {
  const entries = Object.entries(object).filter(
    ([key]) => !IGNORED_KEYS.has(key),
  );
  if (entries.length === 0) {
    return 1;
  }
  let total = 0;
  for (const [, child] of entries) {
    total += isPlainObject(child) || Array.isArray(child) ? countLeaves(child) : 1;
  }
  return total;
}

function taggedScenario(preset: string): FeatureScenario {
  return { feature: FEATURE, name: SCENARIO, tags: [`@preset:${preset}`] };
}

function completeManifest(
  preset: string,
  config: Record<string, unknown>,
): SemanticManifest {
  const entry: Record<string, { feature: string; scenario: string }> = {};
  for (const keyPath of flattenKeyPaths(config)) {
    entry[keyPath] = { feature: FEATURE, scenario: SCENARIO };
  }
  return { [preset]: entry };
}

test('flattenKeyPaths yields one path per leaf and skips ignored keys', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const paths = flattenKeyPaths(config);
      assert.equal(paths.length, countLeaves(config));
      assert.equal(new Set(paths).size, paths.length);
    }),
  );
});

test('flattenKeyPaths ignores description and $schema at any depth', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const noisy = {
        description: 'doc',
        $schema: 'schema.json',
        ...config,
      };
      assert.deepEqual(flattenKeyPaths(noisy), flattenKeyPaths(config));
    }),
  );
});

test('a complete manifest with a correctly tagged scenario produces no issues', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const manifest = completeManifest(PRESET, config);
      const issues = checkSemanticCoverage(
        manifest,
        { [PRESET]: config },
        [taggedScenario(PRESET)],
      );
      assert.deepEqual(issues, []);
    }),
  );
});

test('dropping one manifest entry reports exactly one untested key', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const manifest = completeManifest(PRESET, config);
      const removed = flattenKeyPaths(config)[0];
      if (removed === undefined) {
        return;
      }
      delete manifest[PRESET]?.[removed];
      const issues = checkSemanticCoverage(
        manifest,
        { [PRESET]: config },
        [taggedScenario(PRESET)],
      );
      assert.deepEqual(
        issues.map((issue) => issue.kind),
        ['untested-key'],
      );
      assert.equal(issues[0]?.keyPath, removed);
    }),
  );
});

test('an extra manifest entry is reported as a stale key', () => {
  fc.assert(
    fc.property(configArb, fc.string({ minLength: 1 }), (config, extraKey) => {
      const manifest = completeManifest(PRESET, config);
      const keyPaths = flattenKeyPaths(config);
      const fresh = extraKey === 'stale' || !keyPaths.includes(extraKey);
      if (!fresh) {
        return;
      }
      manifest[PRESET]![extraKey] = { feature: FEATURE, scenario: SCENARIO };
      const issues = checkSemanticCoverage(
        manifest,
        { [PRESET]: config },
        [taggedScenario(PRESET)],
      );
      const stale = issues.filter((issue) => issue.kind === 'stale-key');
      assert.equal(stale.length, 1);
      assert.equal(stale[0]?.keyPath, extraKey);
    }),
  );
});

test('evidence pointing at a missing feature, scenario or tag is reported', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const presets = { [PRESET]: config };
      const keyCount = flattenKeyPaths(config).length;

      const wrongFeature = completeManifest(PRESET, config);
      for (const evidence of Object.values(wrongFeature[PRESET]!)) {
        evidence.feature = 'nope.feature';
      }
      assert.deepEqual(
        checkSemanticCoverage(wrongFeature, presets, [
          taggedScenario(PRESET),
        ]).map((issue) => issue.kind),
        Array.from({ length: keyCount }, () => 'missing-feature'),
      );

      const wrongScenario = completeManifest(PRESET, config);
      for (const evidence of Object.values(wrongScenario[PRESET]!)) {
        evidence.scenario = 'nope';
      }
      assert.deepEqual(
        checkSemanticCoverage(wrongScenario, presets, [
          taggedScenario(PRESET),
        ]).map((issue) => issue.kind),
        Array.from({ length: keyCount }, () => 'missing-scenario'),
      );

      const untagged = completeManifest(PRESET, config);
      const kinds = checkSemanticCoverage(
        untagged,
        presets,
        [{ feature: FEATURE, name: SCENARIO, tags: [] }],
      ).map((issue) => issue.kind);
      assert.deepEqual(
        kinds.sort(),
        [
          ...Array.from({ length: keyCount }, () => 'missing-tag'),
          'preset-without-coverage',
        ].sort(),
      );
    }),
  );
});

test('unknown presets on either side are reported', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const manifest = completeManifest(PRESET, config);
      manifest.bogus = { anyKey: { feature: FEATURE, scenario: SCENARIO } };
      const issues = checkSemanticCoverage(
        manifest,
        { [PRESET]: config },
        [
          taggedScenario(PRESET),
          { feature: FEATURE, name: 'other', tags: ['@preset:ghost'] },
        ],
      );
      assert.deepEqual(
        issues.map((issue) => issue.kind).sort(),
        ['unknown-preset', 'unknown-preset-tag'].sort(),
      );
    }),
  );
});

test('a preset without any tagged scenario is reported', () => {
  fc.assert(
    fc.property(configArb, (config) => {
      const manifest = completeManifest(PRESET, config);
      const issues = checkSemanticCoverage(manifest, { [PRESET]: config }, [
        { feature: FEATURE, name: SCENARIO, tags: ['@preset:something-else'] },
      ]);
      assert.ok(issues.some((issue) => issue.kind === 'preset-without-coverage'));
      assert.ok(issues.some((issue) => issue.kind === 'unknown-preset-tag'));
    }),
  );
});
