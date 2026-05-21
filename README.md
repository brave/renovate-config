# Brave Renovate Configuration

This repository contains the centralized Renovate configuration for Brave projects. It provides a standardized approach to dependency updates across our codebase.

## Overview

Renovate is an automated dependency update tool that helps keep your dependencies up-to-date. This configuration repository serves as the source of truth for Renovate settings across Brave projects.

## Features

- Standardized dependency update policies
- Automated GitHub Actions updates
- Controlled major version updates
- Weekly update schedule
- Concurrent PR limit management
- Custom package rules for different update types

## Configuration Details

The default configuration (`default.json`):

- Extends recommended Renovate configuration
- Pins GitHub Action digests to semantic versions
- Pins dev dependencies
- Updates minor and patch versions on Tuesday-Thursday
- Requires dashboard approval for major version updates
- Enables GitHub Actions updates with auto-approval and auto-merge
- Limits concurrent PRs to 1
- Disables vulnerability alerts

## Usage

To use this configuration in your repository, add a `renovate.json` file with:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "local>brave/renovate-config"
  ]
}
```

## Additional presets

Alongside the default configuration, this repo ships opt-in presets you can layer on top. See Renovate's [config presets](https://docs.renovatebot.com/config-presets/) docs for how preset references are resolved.

Reference a preset by appending its name after a colon, e.g.:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "local>brave/renovate-config",
    "local>brave/renovate-config:enable-vulnerability-alerts"
  ]
}
```

| Name                          | Example reference                                          | File                                                                       | Description                                                                                            |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `enable-vulnerability-alerts` | `local>brave/renovate-config:enable-vulnerability-alerts` | [`enable-vulnerability-alerts.json`](enable-vulnerability-alerts.json)     | Re-enables Renovate vulnerability alerts (the default preset disables them).                           |
| `lockfile-maintenance-auto`   | `local>brave/renovate-config:lockfile-maintenance-auto`   | [`lockfile-maintenance-auto.json`](lockfile-maintenance-auto.json)         | Enables lockfile maintenance PRs on the default schedule. Merging remains manual.                      |
| `lockfile-maintenance-manual` | `local>brave/renovate-config:lockfile-maintenance-manual` | [`lockfile-maintenance-manual.json`](lockfile-maintenance-manual.json)     | Same as above, but each lockfile maintenance run must be opted into via the dependency dashboard.      |

## Development

### Prerequisites

- Node.js
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/brave/renovate-config.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Testing

Run the configuration validator:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Contact

- GitHub Issues: [https://github.com/brave/renovate-config/issues](https://github.com/brave/renovate-config/issues)
