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

The default configuration (`default.json`) includes:

- Extends recommended Renovate configuration
- Pins GitHub Action digests to semantic versions
- Pins dev dependencies
- Updates minor and patch versions on Tuesday-Thursday
- Disables major version updates by default
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
