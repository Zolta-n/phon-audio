import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonObjectReply, stripCodeFences } from "../web/lib/scrape-shared";

const CTX = "test";

test("parses a clean JSON object", () => {
  const out = parseJsonObjectReply('{"name":"SA30","category":"integrated"}', CTX);
  assert.equal(out.name, "SA30");
});

test("parses a fenced JSON object", () => {
  const out = parseJsonObjectReply('```json\n{"name":"SA30"}\n```', CTX);
  assert.equal(out.name, "SA30");
});

test("recovers an object the model wrapped in prose", () => {
  const reply = 'Here are the specs I found:\n{"name":"SA30","category":"integrated"}\nHope that helps!';
  const out = parseJsonObjectReply(reply, CTX);
  assert.equal(out.name, "SA30");
  assert.equal(out.category, "integrated");
});

test("a prose-only reply raises an actionable error, not a parser error", () => {
  // The real failure: asked for a product that does not exist, the model
  // answers in prose and JSON.parse surfaced `Unexpected token 'T'` to the UI.
  const reply = "The product page does not contain specifications for this model.";
  assert.throws(
    () => parseJsonObjectReply(reply, CTX),
    (err: Error) => {
      assert.match(err.message, /could not identify a product/i);
      assert.doesNotMatch(err.message, /JSON|Unexpected token/i);
      return true;
    },
  );
});

test("malformed JSON inside prose still yields the readable error", () => {
  assert.throws(
    () => parseJsonObjectReply('Sure thing: {"name": } trailing', CTX),
    /could not identify a product/i,
  );
});

test("stripCodeFences leaves unfenced text untouched", () => {
  assert.equal(stripCodeFences('{"a":1}'), '{"a":1}');
});
