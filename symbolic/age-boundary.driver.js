"use strict";

const S$ = require("S$");
const rules = require("../dist-symbolic/lib/rules.js");

const age = S$.symbol("age", 30);
const constraint = rules.parseAgeConstraint("> 7 days");

if (constraint === null) {
  throw new Error("'> 7 days' must parse as an age constraint");
}

const satisfied = rules.ageSatisfies(age, constraint);

if (age > 7) {
  if (!satisfied) {
    throw new Error("ageSatisfies must hold for ages above the 7 day bound");
  }
} else {
  if (satisfied) {
    throw new Error("ageSatisfies must not hold for ages at or below the 7 day bound");
  }
}
