Feature: Test suite smoke
  The test harness itself must be wired correctly before any preset semantics
  are verified.

  Scenario: All preset files are present
    Given the committed preset files
    Then the presets "default", "enable-vulnerability-alerts", "lockfile-maintenance-auto" and "lockfile-maintenance-manual" should exist
