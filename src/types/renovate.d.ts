declare module 'renovate/dist/config/migration.js' {
  export interface MigrationResult {
    isMigrated: boolean;
    migratedConfig: Record<string, unknown>;
  }
  export function migrateConfig(config: unknown): MigrationResult;
  export function fixShortHours(input: string): string;
}

declare module 'renovate/dist/config/massage.js' {
  export function massageConfig(config: unknown): Record<string, unknown>;
}

declare module 'renovate/dist/config/validation.js' {
  export interface ValidationMessage {
    topic: string;
    message: string;
  }
  export interface ValidationResult {
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
  }
  export function validateConfig(
    configType: 'global' | 'repo',
    config: unknown,
    isPreset?: boolean,
    parentPath?: string,
  ): Promise<ValidationResult>;
}

declare module 'renovate/dist/config/index.js' {
  export function mergeChildConfig(
    parent: unknown,
    child: unknown,
  ): Record<string, unknown>;
  export function filterConfig(
    configType: string,
    config: unknown,
  ): Record<string, unknown>;
  export function removeGlobalConfig(
    config: unknown,
  ): Record<string, unknown>;
}

declare module 'renovate/dist/config/presets/index.js' {
  export interface VisitedPresets {
    merged: string[];
    unmerged: string[];
  }
  export function getPreset(
    preset: string,
    optionalConfig?: unknown,
  ): Promise<Record<string, unknown>>;
  export function resolveConfigPresets(
    config: unknown,
    ignorePresets?: unknown,
    existingPresets?: unknown,
    basePrecedence?: number,
  ): Promise<{
    config: Record<string, unknown>;
    visitedPresets: VisitedPresets;
  }>;
  export function replaceArgs(
    config: unknown,
    args: unknown,
  ): Record<string, unknown>;
}
