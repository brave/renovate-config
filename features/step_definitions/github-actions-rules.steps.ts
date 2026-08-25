import { When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PresetWorld } from '../support/world.js';

When(
  'a {string} {string} update is evaluated for package {string} with current age {int} days',
  function (
    this: PresetWorld,
    manager: string,
    updateType: string,
    packageName: string,
    currentAgeDays: number,
  ) {
    this.evaluateRuleInput({
      manager,
      updateType,
      packageName,
      currentAgeDays,
    });
  },
);

function outcomeValue(world: PresetWorld, key: string): unknown {
  assert.ok(world.ruleOutcome, 'no rule outcome evaluated');
  return world.ruleOutcome[key];
}

Then(
  'the merged rule outcome should set {string} to {string}',
  function (this: PresetWorld, key: string, expected: string) {
    assert.deepEqual(
      outcomeValue(this, key),
      expected,
      `rule outcome ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(outcomeValue(this, key))}`,
    );
  },
);

Then(
  'the merged rule outcome should set {string} to true',
  function (this: PresetWorld, key: string) {
    assert.equal(outcomeValue(this, key), true);
  },
);

Then(
  'the merged rule outcome should set {string} to false',
  function (this: PresetWorld, key: string) {
    assert.equal(outcomeValue(this, key), false);
  },
);

Then(
  'the merged rule outcome should not set {string}',
  function (this: PresetWorld, key: string) {
    assert.ok(
      !(key in (this.ruleOutcome ?? {})),
      `rule outcome unexpectedly sets ${key} to ${JSON.stringify(outcomeValue(this, key))}`,
    );
  },
);
