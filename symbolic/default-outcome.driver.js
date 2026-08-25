"use strict";

const S$ = require("S$");
const rules = require("../dist-symbolic/lib/rules.js");
const defaultConfig = require("../default.json");

const age = S$.symbol("age", 30);

const outcome = rules.mergeRuleOutcome(defaultConfig.packageRules, {
  manager: "github-actions",
  updateType: "pin",
  packageName: "actions/checkout",
  currentAgeDays: age,
});

if (age > 7) {
  if (outcome.minimumReleaseAge !== "14 days") {
    throw new Error("old trusted pin updates must wait 14 days");
  }
  if (outcome.automerge !== true) {
    throw new Error("old trusted pin updates must automerge");
  }
} else {
  if (outcome.minimumReleaseAge !== "7 days") {
    throw new Error("recent updates must keep the 7 day baseline");
  }
  if (outcome.automerge !== undefined) {
    throw new Error("recent updates must not automerge");
  }
}
