import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PresetWorld } from '../support/world.js';

Given('the preset {string}', async function (this: PresetWorld, name: string) {
  await this.selectPreset(name);
});

When(
  'the preset is validated in strict mode',
  async function (this: PresetWorld) {
    await this.validateStrict();
  },
);

Then(
  'validation reports no errors',
  function (this: PresetWorld) {
    assert.ok(this.validation, 'validation has not run');
    assert.deepEqual(
      this.validation.errors,
      [],
      `unexpected errors: ${JSON.stringify(this.validation.errors)}`,
    );
  },
);

Then(
  'validation reports no warnings',
  function (this: PresetWorld) {
    assert.ok(this.validation, 'validation has not run');
    assert.deepEqual(
      this.validation.warnings,
      [],
      `unexpected warnings: ${JSON.stringify(this.validation.warnings)}`,
    );
  },
);

Then(
  'validation reports no pending migrations',
  function (this: PresetWorld) {
    assert.ok(this.validation, 'validation has not run');
    assert.equal(
      this.validation.isMigrated,
      false,
      'config requires migration',
    );
  },
);
