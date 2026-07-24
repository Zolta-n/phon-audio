import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIDENCE_RANK,
  measurementSourcesFor,
  isMeasurementUrl,
  confidenceForUrl,
  strongerConfidence,
} from "../web/lib/sources";

test("confidence ranking: measured beats rated beats inferred beats derived", () => {
  assert.ok(CONFIDENCE_RANK.measured > CONFIDENCE_RANK.rated);
  assert.ok(CONFIDENCE_RANK.rated > CONFIDENCE_RANK.inferred);
  assert.ok(CONFIDENCE_RANK.inferred > CONFIDENCE_RANK.derived);
  assert.ok(CONFIDENCE_RANK.derived > CONFIDENCE_RANK.typical_for_chipset);
  assert.ok(CONFIDENCE_RANK.typical_for_chipset > CONFIDENCE_RANK.estimated_typical);
});

test("strongerConfidence picks the higher-authority tier", () => {
  assert.equal(strongerConfidence("inferred", "measured"), "measured");
  assert.equal(strongerConfidence("rated", "derived"), "rated");
  assert.equal(strongerConfidence("derived", "derived"), "derived");
});

test("measurementSourcesFor falls back for an unknown category", () => {
  const hosts = measurementSourcesFor(undefined);
  assert.ok(hosts.includes("audiosciencereview.com"));
});

test("headphone category routes to headphone measurement sources", () => {
  const hosts = measurementSourcesFor("headphone");
  assert.ok(hosts.includes("squig.link"));
  assert.ok(hosts.includes("rtings.com"));
});

test("isMeasurementUrl recognizes known hosts and subdomains, rejects others", () => {
  assert.ok(isMeasurementUrl("https://www.audiosciencereview.com/forum/review-x"));
  assert.ok(isMeasurementUrl("https://reviews.audioholics.com/x"));
  assert.ok(!isMeasurementUrl("https://www.some-retailer.com/product"));
  assert.ok(!isMeasurementUrl("not a url"));
});

test("confidenceForUrl tags measurement hosts measured, else inferred", () => {
  assert.equal(confidenceForUrl("https://stereophile.com/x"), "measured");
  assert.equal(confidenceForUrl("https://retailer.example/x"), "inferred");
  assert.equal(confidenceForUrl(undefined), "inferred");
});
