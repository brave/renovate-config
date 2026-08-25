import { World, IWorldOptions } from '@cucumber/cucumber';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadPreset,
  validatePreset,
  resolvePreset,
  mergePresets,
  type StrictValidationOutcome,
  type ResolutionOutcome,
} from '../../src/lib/presets.js';
import { mergeRuleOutcome, type RuleMatchInput } from '../../src/lib/rules.js';

export interface PresetFixture {
  name: string;
  raw: string;
  config: unknown;
}

export class PresetWorld extends World {
  presets: PresetFixture[] = [];
  selectedPresets: { name: string; config: Record<string, unknown> }[] = [];
  currentPresetName: string | null = null;
  currentConfig: Record<string, unknown> | null = null;
  validation: StrictValidationOutcome | null = null;
  resolution: ResolutionOutcome | null = null;
  mergedConfig: Record<string, unknown> | null = null;
  ruleOutcome: Record<string, unknown> | null = null;

  loadCommittedPresets(): void {
    const root = process.cwd();
    const names = [
      'default',
      'enable-vulnerability-alerts',
      'lockfile-maintenance-auto',
      'lockfile-maintenance-manual',
    ];
    this.presets = names.map((name) => {
      const file = path.join(root, `${name}.json`);
      const raw = fs.readFileSync(file, 'utf8');
      return { name, raw, config: JSON.parse(raw) as unknown };
    });
  }

  async selectPreset(name: string): Promise<void> {
    this.currentPresetName = name;
    this.currentConfig = loadPreset(name);
    this.selectedPresets.push({ name, config: this.currentConfig });
    this.validation = null;
    this.resolution = null;
    this.mergedConfig = null;
  }

  async validateStrict(): Promise<StrictValidationOutcome> {
    if (!this.currentConfig) {
      throw new Error('no preset selected');
    }
    this.validation = await validatePreset(this.currentConfig);
    return this.validation;
  }

  async resolveCurrent(): Promise<ResolutionOutcome> {
    if (!this.currentConfig) {
      throw new Error('no preset selected');
    }
    this.resolution = await resolvePreset(this.currentConfig);
    return this.resolution;
  }

  mergeSelected(): Record<string, unknown> {
    this.mergedConfig = mergePresets(
      ...this.selectedPresets.map((p) => p.config),
    );
    return this.mergedConfig;
  }

  evaluateRuleInput(input: RuleMatchInput): Record<string, unknown> {
    if (!this.currentConfig) {
      throw new Error('no preset selected');
    }
    const rules = Array.isArray(this.currentConfig.packageRules)
      ? (this.currentConfig.packageRules as Record<string, unknown>[])
      : [];
    this.ruleOutcome = mergeRuleOutcome(rules, input);
    return this.ruleOutcome;
  }
}

export function usePresetWorld(options: IWorldOptions): PresetWorld {
  return new PresetWorld(options);
}
