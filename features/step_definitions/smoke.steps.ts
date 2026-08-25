import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PresetWorld } from '../support/world.js';

Given('the committed preset files', function (this: PresetWorld) {
  this.loadCommittedPresets();
});

Then(
  'the presets {string}, {string}, {string} and {string} should exist',
  function (
    this: PresetWorld,
    a: string,
    b: string,
    c: string,
    d: string,
  ) {
    const expected = [a, b, c, d].sort();
    const actual = this.presets.map((p) => p.name).sort();
    assert.deepEqual(actual, expected);
  },
);
