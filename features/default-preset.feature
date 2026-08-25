Feature: Default preset semantics
  The default preset resolves its extends chain and sets the documented
  baseline for all Brave repositories.

  @preset:default
  Scenario: Resolved config contains the extends presets
    Given the preset "default"
    When the preset is resolved with extends
    Then the resolved config should contain options from "config:recommended"
    And the resolved config should contain options from ":pinDevDependencies"

  @preset:default
  Scenario: Repo baseline options are set
    Given the preset "default"
    When the preset is resolved with extends
    Then the resolved option "branchNameStrict" should be true
    And the resolved option "postUpdateOptions" should include "gomodTidyAll"
    And the resolved option "vulnerabilityAlerts.enabled" should be false

  @preset:default
  Scenario: Minimum release age gates every update type
    Given the preset "default"
    When the preset is resolved with extends
    Then the package rule matching all update types should set "minimumReleaseAge" to "7 days"
    And the package rule matching all update types should set "prCreation" to "not-pending"

  @preset:default
  Scenario: Github actions manager is enabled
    Given the preset "default"
    When the preset is resolved with extends
    Then the package rule for manager "github-actions" should set "enabled" to true
