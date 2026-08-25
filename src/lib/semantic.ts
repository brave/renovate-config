import { generateMessages } from '@cucumber/gherkin';
import { IdGenerator, SourceMediaType } from '@cucumber/messages';
import type * as messages from '@cucumber/messages';

export interface ScenarioEvidence {
  feature: string;
  scenario: string;
}

export type SemanticManifest = Record<string, Record<string, ScenarioEvidence>>;

export const IGNORED_KEYS: ReadonlySet<string> = new Set([
  '$schema',
  'description',
]);

export interface FeatureScenario {
  feature: string;
  name: string;
  tags: string[];
}

export type SemanticIssueKind =
  | 'untested-key'
  | 'stale-key'
  | 'unknown-preset'
  | 'missing-feature'
  | 'missing-scenario'
  | 'missing-tag'
  | 'preset-without-coverage'
  | 'unknown-preset-tag'
  | 'feature-parse-error';

export interface SemanticIssue {
  kind: SemanticIssueKind;
  preset: string;
  keyPath?: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function joinPath(parent: string, segment: string): string {
  return parent === '' ? segment : `${parent}.${segment}`;
}

function joinIndex(parent: string, index: number): string {
  return `${parent}[${index}]`;
}

export function flattenKeyPaths(value: unknown, prefix = ''): string[] {
  const paths: string[] = [];
  if (Array.isArray(value)) {
    if (!value.some((element) => isPlainObject(element))) {
      paths.push(prefix);
      return paths;
    }
    value.forEach((element, index) => {
      const elementPath = joinIndex(prefix, index);
      if (isPlainObject(element)) {
        const nested = flattenKeyPaths(element, elementPath);
        if (nested.length === 0) {
          paths.push(elementPath);
        } else {
          paths.push(...nested);
        }
      } else {
        paths.push(elementPath);
      }
    });
    return paths;
  }
  if (!isPlainObject(value)) {
    return prefix === '' ? [] : [prefix];
  }
  for (const [key, child] of Object.entries(value)) {
    if (IGNORED_KEYS.has(key)) {
      continue;
    }
    const childPath = joinPath(prefix, key);
    if (isPlainObject(child)) {
      const nested = flattenKeyPaths(child, childPath);
      if (nested.length === 0) {
        paths.push(childPath);
      } else {
        paths.push(...nested);
      }
    } else if (Array.isArray(child)) {
      paths.push(...flattenKeyPaths(child, childPath));
    } else {
      paths.push(childPath);
    }
  }
  return paths;
}

function scenarioNamesFromDocument(
  document: messages.GherkinDocument,
): { name: string; tags: string[] }[] {
  const scenarios: { name: string; tags: string[] }[] = [];
  const feature = document.feature;
  if (!feature) {
    return scenarios;
  }
  for (const child of feature.children) {
    const scenario = child.scenario;
    if (!scenario) {
      continue;
    }
    scenarios.push({
      name: scenario.name,
      tags: scenario.tags.map((tag) => tag.name),
    });
  }
  return scenarios;
}

export function loadFeatureScenarios(
  featureFiles: { file: string; source: string }[],
): { scenarios: FeatureScenario[]; parseErrors: string[] } {
  const scenarios: FeatureScenario[] = [];
  const parseErrors: string[] = [];
  for (const { file, source } of featureFiles) {
    const envelopes = generateMessages(
      source,
      file,
      SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
      {
        includeGherkinDocument: true,
        includePickles: false,
        includeSource: false,
        newId: IdGenerator.incrementing(),
      },
    );
    for (const envelope of envelopes) {
      if (envelope.parseError) {
        parseErrors.push(
          `${file}: ${envelope.parseError.message ?? 'parse error'}`,
        );
        continue;
      }
      const document = envelope.gherkinDocument;
      if (!document?.feature) {
        continue;
      }
      const fileName = file.split(/[\\/]/).pop() ?? file;
      for (const { name, tags } of scenarioNamesFromDocument(document)) {
        scenarios.push({ feature: fileName, name, tags });
      }
    }
  }
  return { scenarios, parseErrors };
}

export function checkSemanticCoverage(
  manifest: SemanticManifest,
  presetConfigs: Record<string, Record<string, unknown>>,
  scenarios: FeatureScenario[],
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];
  const presetNames = Object.keys(presetConfigs);
  const presetSet = new Set(presetNames);
  const flattenedByPreset = new Map<string, Set<string>>();
  for (const [preset, config] of Object.entries(presetConfigs)) {
    flattenedByPreset.set(preset, new Set(flattenKeyPaths(config)));
  }

  for (const preset of presetNames) {
    const flattened = flattenedByPreset.get(preset) ?? new Set<string>();
    const manifestEntry = manifest[preset];
    if (!manifestEntry) {
      for (const keyPath of flattened) {
        issues.push({
          kind: 'untested-key',
          preset,
          keyPath,
          message: `config key "${keyPath}" of preset "${preset}" has no manifest entry`,
        });
      }
      continue;
    }
    for (const keyPath of flattened) {
      if (!(keyPath in manifestEntry)) {
        issues.push({
          kind: 'untested-key',
          preset,
          keyPath,
          message: `config key "${keyPath}" of preset "${preset}" has no manifest entry`,
        });
      }
    }
    for (const [keyPath, evidence] of Object.entries(manifestEntry)) {
      if (!flattened.has(keyPath)) {
        issues.push({
          kind: 'stale-key',
          preset,
          keyPath,
          message: `manifest entry "${keyPath}" does not exist in preset "${preset}"`,
        });
        continue;
      }
      const matching = scenarios.filter(
        (scenario) => scenario.feature === evidence.feature,
      );
      if (matching.length === 0) {
        issues.push({
          kind: 'missing-feature',
          preset,
          keyPath,
          message: `evidence feature "${evidence.feature}" for "${keyPath}" not found`,
        });
        continue;
      }
      const scenario = matching.find((s) => s.name === evidence.scenario);
      if (!scenario) {
        issues.push({
          kind: 'missing-scenario',
          preset,
          keyPath,
          message: `evidence scenario "${evidence.scenario}" not found in ${evidence.feature}`,
        });
        continue;
      }
      const requiredTag = `@preset:${preset}`;
      if (!scenario.tags.includes(requiredTag)) {
        issues.push({
          kind: 'missing-tag',
          preset,
          keyPath,
          message: `scenario "${evidence.scenario}" in ${evidence.feature} is not tagged ${requiredTag}`,
        });
      }
    }
  }

  for (const preset of Object.keys(manifest)) {
    if (!presetSet.has(preset)) {
      issues.push({
        kind: 'unknown-preset',
        preset,
        message: `manifest references unknown preset "${preset}"`,
      });
    }
  }

  for (const scenario of scenarios) {
    for (const tag of scenario.tags) {
      if (!tag.startsWith('@preset:')) {
        continue;
      }
      const preset = tag.slice('@preset:'.length);
      if (!presetSet.has(preset)) {
        issues.push({
          kind: 'unknown-preset-tag',
          preset,
          message: `scenario "${scenario.name}" in ${scenario.feature} is tagged for unknown preset "${preset}"`,
        });
      }
    }
  }

  for (const preset of presetNames) {
    const tagged = scenarios.some((scenario) =>
      scenario.tags.includes(`@preset:${preset}`),
    );
    if (!tagged) {
      issues.push({
        kind: 'preset-without-coverage',
        preset,
        message: `no scenario is tagged @preset:${preset}`,
      });
    }
  }

  return issues;
}
