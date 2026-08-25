Feature: Github actions package rule outcomes
  The github-actions package rules in the default preset combine so that
  pinned-action updates from trusted orgs are held to a longer minimum
  release age and automerged, while digest updates are disabled and all
  other updates keep the 7 day baseline.

  @preset:default
  Scenario: Digest updates for github-actions are disabled
    Given the preset "default"
    When a "github-actions" "digest" update is evaluated for package "actions/checkout" with current age 30 days
    Then the merged rule outcome should set "enabled" to false
    And the merged rule outcome should set "minimumReleaseAge" to "7 days"

  @preset:default
  Scenario: Old pin updates for trusted actions orgs wait 14 days and automerge
    Given the preset "default"
    When a "github-actions" "pin" update is evaluated for package "actions/checkout" with current age 30 days
    Then the merged rule outcome should set "minimumReleaseAge" to "14 days"
    And the merged rule outcome should set "autoApprove" to true
    And the merged rule outcome should set "automerge" to true

  @preset:default
  Scenario Outline: Patch and minor updates for trusted actions orgs wait 14 days and automerge
    Given the preset "default"
    When a "github-actions" "<updateType>" update is evaluated for package "<packageName>" with current age 30 days
    Then the merged rule outcome should set "minimumReleaseAge" to "14 days"
    And the merged rule outcome should set "autoApprove" to true
    And the merged rule outcome should set "automerge" to true

    Examples:
      | updateType | packageName          |
      | patch      | actions/checkout     |
      | minor      | github/codeql-action |
      | patch      | aws-actions/configure-aws-credentials |

  @preset:default
  Scenario: Recent pin updates for trusted actions orgs keep the 7 day baseline
    Given the preset "default"
    When a "github-actions" "pin" update is evaluated for package "actions/checkout" with current age 3 days
    Then the merged rule outcome should set "minimumReleaseAge" to "7 days"
    And the merged rule outcome should not set "autoApprove"
    And the merged rule outcome should not set "automerge"

  @preset:default
  Scenario: Updates for packages outside trusted actions orgs keep the 7 day baseline
    Given the preset "default"
    When a "github-actions" "patch" update is evaluated for package "some-other-org/my-action" with current age 30 days
    Then the merged rule outcome should set "minimumReleaseAge" to "7 days"
    And the merged rule outcome should not set "automerge"
    And the merged rule outcome should set "enabled" to true

  @preset:default
  Scenario: Digest updates outside the github-actions manager keep the 7 day baseline
    Given the preset "default"
    When a "npm" "digest" update is evaluated for package "lodash" with current age 30 days
    Then the merged rule outcome should set "minimumReleaseAge" to "7 days"
    And the merged rule outcome should not set "enabled"
