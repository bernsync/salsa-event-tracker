import test from "node:test";
import assert from "node:assert/strict";
import { normalizeExternalUrl, sourceLink } from "../web/link-utils.js";

test("normalizes Instagram handles and upgrades http links", () => {
  assert.equal(normalizeExternalUrl("@example"), "https://instagram.com/example");
  assert.equal(normalizeExternalUrl("http://example.com/path"), "https://example.com/path");
});

test("rejects unsafe or malformed links", () => {
  assert.equal(normalizeExternalUrl("javascript:alert(1)"), "");
  assert.equal(normalizeExternalUrl("not a url"), "");
});

test("sourceLink escapes labels and hrefs", () => {
  assert.equal(
    sourceLink("<Website>", "https://example.com/?a=1&b=2"),
    "<a href=\"https://example.com/?a=1&amp;b=2\" target=\"_blank\" rel=\"noreferrer\">&lt;Website&gt;</a>"
  );
});
