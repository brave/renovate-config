Feature: Strict preset validation
  Every committed preset must pass renovate's strict validation: no errors,
  no warnings, and no pending migrations. This mirrors what
  renovate-config-validator --strict enforces in CI.

  @preset-validation @preset:default
  Scenario Outline: Preset passes strict validation
    Given the preset "<preset>"
    When the preset is validated in strict mode
    Then validation reports no errors
    And validation reports no warnings
    And validation reports no pending migrations

    Examples:
      | preset                        |
      | default                       |
      | enable-vulnerability-alerts   |
      | lockfile-maintenance-auto     |
      | lockfile-maintenance-manual   |
