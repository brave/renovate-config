export type RuleRecord = Record<string, unknown>;

export type ConfigRecord = Record<string, unknown>;

function readPath(current: unknown, segments: string[]): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) {
    return current;
  }
  if (
    typeof current !== 'object' ||
    current === null ||
    !Object.prototype.hasOwnProperty.call(current, head)
  ) {
    return undefined;
  }
  const next = (current as Record<string, unknown>)[head];
  return rest.length === 0 ? next : readPath(next, rest);
}

export function effectiveOption(
  config: ConfigRecord | null | undefined,
  optionPath: string,
): unknown {
  if (!config) {
    return undefined;
  }
  return readPath(config, optionPath.split('.'));
}

export interface RuleMatchInput {
  manager?: string;
  packageName?: string;
  updateType?: string;
  currentAgeDays?: number;
}

export interface AgeConstraint {
  operator: '>' | '>=' | '<' | '<=' | '==';
  days: number;
}

const AGE_UNIT_TO_DAYS: Record<string, number> = {
  second: 1 / 86_400,
  seconds: 1 / 86_400,
  minute: 1 / 1_440,
  minutes: 1 / 1_440,
  hour: 1 / 24,
  hours: 1 / 24,
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
};

export function parseAgeToDays(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match =
    /^(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?)$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const factor = AGE_UNIT_TO_DAYS[match[2] as string];
  return factor === undefined ? null : amount * factor;
}

export function parseAgeConstraint(value: unknown): AgeConstraint | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^(>=|<=|==|>|<)\s*(.+)$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const days = parseAgeToDays(match[2]);
  return days === null
    ? null
    : { operator: match[1] as AgeConstraint['operator'], days };
}

export function ageSatisfies(
  currentAgeDays: number,
  constraint: AgeConstraint,
): boolean {
  switch (constraint.operator) {
    case '>':
      return currentAgeDays > constraint.days;
    case '>=':
      return currentAgeDays >= constraint.days;
    case '<':
      return currentAgeDays < constraint.days;
    case '<=':
      return currentAgeDays <= constraint.days;
    case '==':
      return currentAgeDays === constraint.days;
  }
}

function globMatch(pattern: string, value: string): boolean {
  if (pattern === '') {
    return value === '';
  }
  const head = pattern[0] as string;
  if (head === '*') {
    if (pattern[1] === '*') {
      const rest = pattern.slice(2);
      for (let i = 0; i <= value.length; i++) {
        if (globMatch(rest, value.slice(i))) {
          return true;
        }
      }
      return false;
    }
    const rest = pattern.slice(1);
    for (let i = 0; i <= value.length; i++) {
      if (globMatch(rest, value.slice(i))) {
        return true;
      }
      if (value[i] === '/') {
        return false;
      }
    }
    return false;
  }
  if (value[0] !== head) {
    return false;
  }
  return globMatch(pattern.slice(1), value.slice(1));
}

export function matchesPackagePattern(
  pattern: string,
  packageName: string,
): boolean {
  return globMatch(pattern, packageName);
}

function matchStringList(
  list: unknown,
  actual: string | undefined,
  predicate: (pattern: string, value: string) => boolean,
): boolean {
  if (!Array.isArray(list)) {
    return true;
  }
  if (actual === undefined) {
    return false;
  }
  return list.some(
    (pattern) =>
      typeof pattern === 'string' && predicate(pattern, actual as string),
  );
}

export function ruleMatchesInput(
  rule: RuleRecord,
  input: RuleMatchInput,
): boolean {
  if (!matchStringList(rule['matchManagers'], input.manager, (p, v) => p === v)) {
    return false;
  }
  if (
    !matchStringList(rule['matchUpdateTypes'], input.updateType, (p, v) => p === v)
  ) {
    return false;
  }
  if (
    !matchStringList(
      rule['matchPackageNames'],
      input.packageName,
      matchesPackagePattern,
    )
  ) {
    return false;
  }
  const currentAge = rule['matchCurrentAge'];
  if (typeof currentAge === 'string') {
    const constraint = parseAgeConstraint(currentAge);
    if (
      constraint === null ||
      input.currentAgeDays === undefined ||
      !ageSatisfies(input.currentAgeDays, constraint)
    ) {
      return false;
    }
  }
  return true;
}

export function applicableRules(
  rules: RuleRecord[],
  input: RuleMatchInput,
): RuleRecord[] {
  return rules.filter((rule) => ruleMatchesInput(rule, input));
}

function isMatcherKey(key: string): boolean {
  return key.startsWith('match') || key.startsWith('exclude');
}

export function mergeRuleOutcome(
  rules: RuleRecord[],
  input: RuleMatchInput,
): RuleRecord {
  const outcome: RuleRecord = {};
  for (const rule of applicableRules(rules, input)) {
    for (const [key, value] of Object.entries(rule)) {
      if (isMatcherKey(key)) {
        continue;
      }
      outcome[key] = value;
    }
  }
  return outcome;
}
