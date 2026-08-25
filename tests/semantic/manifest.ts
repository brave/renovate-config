import type { SemanticManifest } from '../../src/lib/semantic.js';

const DEFAULT_FEATURE = 'default-preset.feature';
const GA_FEATURE = 'github-actions-rules.feature';
const VA_FEATURE = 'vulnerability-alerts-override.feature';
const LFM_FEATURE = 'lockfile-maintenance.feature';

export const manifest: SemanticManifest = {
  default: {
    extends: {
      feature: DEFAULT_FEATURE,
      scenario: 'Resolved config contains the extends presets',
    },
    branchNameStrict: {
      feature: DEFAULT_FEATURE,
      scenario: 'Repo baseline options are set',
    },
    postUpdateOptions: {
      feature: DEFAULT_FEATURE,
      scenario: 'Repo baseline options are set',
    },
    'vulnerabilityAlerts.enabled': {
      feature: DEFAULT_FEATURE,
      scenario: 'Repo baseline options are set',
    },
    'packageRules[0].matchUpdateTypes': {
      feature: DEFAULT_FEATURE,
      scenario: 'Minimum release age gates every update type',
    },
    'packageRules[0].minimumReleaseAge': {
      feature: DEFAULT_FEATURE,
      scenario: 'Minimum release age gates every update type',
    },
    'packageRules[0].prCreation': {
      feature: DEFAULT_FEATURE,
      scenario: 'Minimum release age gates every update type',
    },
    'packageRules[1].matchManagers': {
      feature: DEFAULT_FEATURE,
      scenario: 'Github actions manager is enabled',
    },
    'packageRules[1].enabled': {
      feature: DEFAULT_FEATURE,
      scenario: 'Github actions manager is enabled',
    },
    'packageRules[2].matchManagers': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].matchUpdateTypes': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].matchCurrentAge': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].matchPackageNames': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].minimumReleaseAge': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].autoApprove': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[2].automerge': {
      feature: GA_FEATURE,
      scenario: 'Old pin updates for trusted actions orgs wait 14 days and automerge',
    },
    'packageRules[3].matchManagers': {
      feature: GA_FEATURE,
      scenario: 'Digest updates for github-actions are disabled',
    },
    'packageRules[3].matchUpdateTypes': {
      feature: GA_FEATURE,
      scenario: 'Digest updates for github-actions are disabled',
    },
    'packageRules[3].enabled': {
      feature: GA_FEATURE,
      scenario: 'Digest updates for github-actions are disabled',
    },
  },
  'enable-vulnerability-alerts': {
    'vulnerabilityAlerts.enabled': {
      feature: VA_FEATURE,
      scenario: 'Opt-in preset re-enables vulnerability alerts',
    },
  },
  'lockfile-maintenance-auto': {
    'lockFileMaintenance.enabled': {
      feature: LFM_FEATURE,
      scenario: 'Auto preset enables maintenance without approval gate',
    },
  },
  'lockfile-maintenance-manual': {
    'lockFileMaintenance.enabled': {
      feature: LFM_FEATURE,
      scenario: 'Manual preset gates maintenance behind dashboard approval',
    },
    'lockFileMaintenance.dependencyDashboardApproval': {
      feature: LFM_FEATURE,
      scenario: 'Manual preset gates maintenance behind dashboard approval',
    },
  },
};
