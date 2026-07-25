import { test } from "node:test";
import assert from "node:assert/strict";
import { findChartImages } from "../web/lib/chartImages";

test("keeps measurement charts, drops chrome and non-images", () => {
  const html = `
    <img src="/logo.png" alt="site logo">
    <img src="https://cdn.example.com/frequency-response.png" alt="Frequency Response">
    <img src="/img/impedance-curve.jpg" alt="impedance">
    <img src="/ad-banner-thd.png" alt="THD ad">
    <img src="https://track.example.com/pixel?thd=1" alt="distortion">
  `;
  const urls = findChartImages(html, "https://reviews.example.com/amp");
  assert.ok(urls.includes("https://cdn.example.com/frequency-response.png"));
  // Relative impedance chart resolves against baseUrl.
  assert.ok(urls.includes("https://reviews.example.com/img/impedance-curve.jpg"));
  // logo (junk), ad-banner (junk), and the extension-less tracking pixel are dropped.
  assert.ok(!urls.some((u) => u.includes("logo")));
  assert.ok(!urls.some((u) => u.includes("ad-banner")));
  assert.ok(!urls.some((u) => u.includes("track.example.com")));
});

test("ignores non-chart images even with an image extension", () => {
  const html = `<img src="https://x.com/hero-photo.jpg" alt="product hero shot">`;
  assert.deepEqual(findChartImages(html, "https://x.com/"), []);
});

test("dedupes and caps results", () => {
  const many = Array.from({ length: 10 }, (_, i) => `<img src="https://x.com/frequency-${i}.png" alt="frequency response">`).join("");
  const dup = `<img src="https://x.com/frequency-0.png" alt="frequency">`;
  const urls = findChartImages(many + dup, "https://x.com/");
  assert.ok(urls.length <= 6, "capped at 6");
  assert.equal(new Set(urls).size, urls.length, "no duplicates");
});

test("reads data-src (lazy-loaded) charts", () => {
  const html = `<img data-src="https://x.com/spinorama.png" alt="spinorama">`;
  assert.deepEqual(findChartImages(html, "https://x.com/"), ["https://x.com/spinorama.png"]);
});
