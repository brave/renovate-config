import { test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert/strict';
import { listPresets, loadPreset } from '../../src/lib/presets.js';
import {
  checkSemanticCoverage,
  loadFeatureScenarios,
} from '../../src/lib/semantic.js';
import { manifest } from './manifest.js';

const FEATURES_DIR = path.resolve('features');

function featureFiles(): { file: string; source: string }[] {
  return fs
    .readdirSync(FEATURES_DIR)
    .filter((file) => file.endsWith('.feature'))
    .map((file) => ({
      file,
      source: fs.readFileSync(path.join(FEATURES_DIR, file), 'utf8'),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

test('every config key of every preset is covered by tagged BDD evidence', () => {
  const presets: Record<string, Record<string, unknown>> = {};
  for (const name of listPresets()) {
    presets[name] = loadPreset(name);
  }
  const { scenarios, parseErrors } = loadFeatureScenarios(featureFiles());
  assert.deepEqual(
    parseErrors,
    [],
    `feature files must parse cleanly: ${parseErrors.join('; ')}`,
  );

  const issues = checkSemanticCoverage(manifest, presets, scenarios);
  assert.deepEqual(
    issues.map((issue) => `${issue.kind}: ${issue.message}`),
    [],
    'semantic manifest gate must pass — every config key needs a tagged scenario, ' +
      'every manifest entry must reference existing keys and correctly tagged scenarios',
  );
});
