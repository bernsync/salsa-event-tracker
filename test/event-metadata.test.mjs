import test from "node:test";
import assert from "node:assert/strict";
import { formatStyles, normalizeDanceStyles } from "../web/event-metadata.js";

test("normalizeDanceStyles uses Supabase-provided style taxonomy", () => {
  const styles = normalizeDanceStyles(["salsa", "zouk", "unknown"], [
    { name: "Salsa" },
    { name: "Bachata" },
    { name: "Zouk" }
  ]);

  assert.deepEqual(styles, ["Salsa", "Zouk"]);
});

test("formatStyles falls back to raw event styles when taxonomy is unavailable", () => {
  assert.equal(formatStyles({ styles: ["Salsa", "Zouk"] }), "Salsa, Zouk");
});
