import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PresetWorld } from '../support/world.js';
import { effectiveOption } from '../../src/lib/rules.js';

When(
  'the preset is resolved with extends',
  async function (this: PresetWorld) {
    await this.resolveCurrent();
  },
);

When(
  'the presets are merged in selection order',
  function (this: PresetWorld) {
    this.mergeSelected();
  },
);

Then(
  'the resolved config should contain options from {string}',
  function (this: PresetWorld, presetName: string) {
    assert.ok(this.resolution, 'preset has not been resolved');
    assert.ok(
      this.resolution.visitedPresets.includes(presetName),
      `extends ${presetName} was not visited; visited: ${this.resolution.visitedPresets.slice(0, 10).join(', ')}...`,
    );
  },
);

function assertOption(
  world: PresetWorld,
  source: 'resolved' | 'merged',
  optionPath: string,
  expected: unknown,
): void {
  const config =
    source === 'resolved' ? world.resolution?.config : world.mergedConfig;
  assert.ok(config, `${source} config is not available`);
  const actual = effectiveOption(config, optionPath);
  assert.deepEqual(
    actual,
    expected,
    `${source} option ${optionPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

Then(
  'the resolved option {string} should be true',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'resolved', optionPath, true);
  },
);

Then(
  'the resolved option {string} should be false',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'resolved', optionPath, false);
  },
);

Then(
  'the resolved option {string} should be undefined',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'resolved', optionPath, undefined);
  },
);

Then(
  'the resolved option {string} should include {string}',
  function (
    this: PresetWorld,
    optionPath: string,
    expected: string,
  ) {
    assert.ok(this.resolution, 'preset has not been resolved');
    const actual = effectiveOption(this.resolution.config, optionPath);
    assert.ok(
      Array.isArray(actual),
      `${optionPath} is not an array: ${JSON.stringify(actual)}`,
    );
    assert.ok(
      (actual as unknown[]).includes(expected),
      `${optionPath} does not include ${expected}: ${JSON.stringify(actual)}`,
    );
  },
);

Then(
  'the merged option {string} should be true',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'merged', optionPath, true);
  },
);

Then(
  'the merged option {string} should be false',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'merged', optionPath, false);
  },
);

Then(
  'the merged option {string} should be undefined',
  function (this: PresetWorld, optionPath: string) {
    assertOption(this, 'merged', optionPath, undefined);
  },
);

interface PackageRule {
  matchUpdateTypes?: string[];
  matchManagers?: string[];
  [key: string]: unknown;
}

function currentRules(world: PresetWorld): PackageRule[] {
  assert.ok(world.currentConfig, 'no preset selected');
  const rules = world.currentConfig.packageRules;
  assert.ok(Array.isArray(rules), 'packageRules is not an array');
  return rules as PackageRule[];
}

Then(
  'the package rule matching all update types should set {string} to {string}',
  function (
    this: PresetWorld,
    key: string,
    expected: string,
  ) {
    const allTypes = ['minor', 'major', 'patch', 'pin', 'pinDigest', 'digest'];
    const rule = currentRules(this).find(
      (r) =>
        Array.isArray(r.matchUpdateTypes) &&
        r.matchUpdateTypes.length === allTypes.length &&
        allTypes.every((t) => r.matchUpdateTypes?.includes(t)),
    );
    assert.ok(rule, 'no package rule matches all update types');
    assert.deepEqual(rule[key], expected);
  },
);

Then(
  'the package rule for manager {string} should set {string} to true',
  function (
    this: PresetWorld,
    manager: string,
    key: string,
  ) {
    const rule = currentRules(this).find(
      (r) =>
        Array.isArray(r.matchManagers) &&
        r.matchManagers.length === 1 &&
        r.matchManagers[0] === manager &&
        key in r,
    );
    assert.ok(rule, `no package rule for manager ${manager} with ${key}`);
    assert.equal(rule[key], true);
  },
);
