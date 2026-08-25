Feature: Lockfile maintenance presets
  The auto and manual lockfile maintenance presets both enable lockfile
  maintenance, but differ in dependency dashboard approval. When both are
  extended, the last one wins.

  @preset:lockfile-maintenance-auto
  Scenario: Auto preset enables maintenance without approval gate
    Given the preset "lockfile-maintenance-auto"
    When the preset is resolved with extends
    Then the resolved option "lockFileMaintenance.enabled" should be true
    And the resolved option "lockFileMaintenance.dependencyDashboardApproval" should be undefined

  @preset:lockfile-maintenance-manual
  Scenario: Manual preset gates maintenance behind dashboard approval
    Given the preset "lockfile-maintenance-manual"
    When the preset is resolved with extends
    Then the resolved option "lockFileMaintenance.enabled" should be true
    And the resolved option "lockFileMaintenance.dependencyDashboardApproval" should be true

  @preset:lockfile-maintenance-auto @preset:lockfile-maintenance-manual
  Scenario: Manual preset wins when extended after auto preset
    Given the preset "lockfile-maintenance-auto"
    And the preset "lockfile-maintenance-manual"
    When the presets are merged in selection order
    Then the merged option "lockFileMaintenance.enabled" should be true
    And the merged option "lockFileMaintenance.dependencyDashboardApproval" should be true

  @preset:lockfile-maintenance-auto @preset:lockfile-maintenance-manual
  Scenario: Manual approval persists when auto preset is extended afterwards
    Renovate merges presets deeply, so the manual preset's approval gate
    cannot be unset by extending the auto preset later.
    Given the preset "lockfile-maintenance-manual"
    And the preset "lockfile-maintenance-auto"
    When the presets are merged in selection order
    Then the merged option "lockFileMaintenance.enabled" should be true
    And the merged option "lockFileMaintenance.dependencyDashboardApproval" should be true
