import * as fs from 'node:fs';
import * as path from 'node:path';
import { migrateConfig } from 'renovate/dist/config/migration.js';
import { massageConfig } from 'renovate/dist/config/massage.js';
import { validateConfig } from 'renovate/dist/config/validation.js';
import type { ValidationMessage } from 'renovate/dist/config/validation.js';
import { mergeChildConfig } from 'renovate/dist/config/index.js';
import { resolveConfigPresets } from 'renovate/dist/config/presets/index.js';

export interface StrictValidationOutcome {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  isMigrated: boolean;
}

export interface ResolutionOutcome {
  config: Record<string, unknown>;
  visitedPresets: string[];
}

const PRESET_ROOT = '.';
const PRESET_FILE_PATTERNS = [
  /^default\.json$/,
  /^enable-.*\.json$/,
  /^lockfile-.*\.json$/,
];

function presetFile(name: string): string {
  return path.resolve(PRESET_ROOT, `${name}.json`);
}

export function listPresets(): string[] {
  return fs
    .readdirSync(path.resolve(PRESET_ROOT))
    .filter(
      (file) =>
        PRESET_FILE_PATTERNS.some((pattern) => pattern.test(file)) &&
        fs.statSync(path.resolve(PRESET_ROOT, file)).isFile(),
    )
    .map((file) => path.basename(file, '.json'))
    .sort();
}

export function loadPreset(name: string): Record<string, unknown> {
  const raw = fs.readFileSync(presetFile(name), 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function validatePreset(
  config: Record<string, unknown>,
): Promise<StrictValidationOutcome> {
  const { isMigrated, migratedConfig } = migrateConfig(config);
  const massaged = massageConfig(migratedConfig);
  const { errors, warnings } = await validateConfig('repo', massaged, true);
  return {
    errors,
    warnings,
    isMigrated,
  };
}

export async function resolvePreset(
  config: Record<string, unknown>,
): Promise<ResolutionOutcome> {
  const { config: resolved, visitedPresets } =
    await resolveConfigPresets(config);
  return {
    config: resolved,
    visitedPresets: visitedPresets.merged,
  };
}

export function mergePresets(
  ...configs: Record<string, unknown>[]
): Record<string, unknown> {
  if (configs.length === 0) {
    return {};
  }
  return configs.reduce(
    (merged, next) => mergeChildConfig(merged, next) as Record<string, unknown>,
  );
}
