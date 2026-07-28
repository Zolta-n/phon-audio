import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSubmit,
  canEditComponent,
  canViewComponent,
  type Viewer,
} from "../web/lib/permissions";

const anon: Viewer = { userId: null, admin: false, tier: "free" };
const free: Viewer = { userId: "user-1", admin: false, tier: "free" };
const paid: Viewer = { userId: "user-1", admin: false, tier: "paid" };
const other: Viewer = { userId: "user-2", admin: false, tier: "paid" };
const admin: Viewer = { userId: "admin-1", admin: true, tier: "free" };

const curated = { created_by: null, verified: false };
const approved = { created_by: "user-1", verified: true };
const pending = { created_by: "user-1", verified: false };

// ---- canSubmit ------------------------------------------------------------

test("submitting requires a paid tier; admins always qualify", () => {
  assert.equal(canSubmit(anon), false);
  assert.equal(canSubmit(free), false);
  assert.equal(canSubmit(paid), true);
  // Admin on the free tier still qualifies — the allowlist overrides billing.
  assert.equal(canSubmit(admin), true);
});

// ---- canViewComponent -----------------------------------------------------

test("curated and approved components are visible to everyone", () => {
  assert.equal(canViewComponent(anon, curated), true);
  assert.equal(canViewComponent(anon, approved), true);
  assert.equal(canViewComponent(free, curated), true);
});

test("a pending submission is visible only to its submitter and admins", () => {
  assert.equal(canViewComponent(paid, pending), true, "submitter sees own");
  assert.equal(canViewComponent(admin, pending), true, "admin sees all");
  assert.equal(canViewComponent(other, pending), false, "other user does not");
  assert.equal(canViewComponent(anon, pending), false, "signed-out does not");
});

// ---- canEditComponent -----------------------------------------------------

test("only admins may edit curated catalog components", () => {
  assert.equal(canEditComponent(admin, curated), true);
  assert.equal(canEditComponent(paid, curated), false);
  assert.equal(canEditComponent(free, curated), false);
  assert.equal(canEditComponent(anon, curated), false);
});

test("a submitter may edit their own component only while it awaits review", () => {
  assert.equal(canEditComponent(paid, pending), true);
  // Once approved it belongs to the public catalog — author loses write access,
  // otherwise "submit clean, vandalize after approval" would be open.
  assert.equal(canEditComponent(paid, approved), false);
  assert.equal(canEditComponent(admin, approved), true);
});

test("one user may not edit another user's pending submission", () => {
  assert.equal(canEditComponent(other, pending), false);
});

test("a null verified flag counts as not-yet-approved", () => {
  const nullVerified = { created_by: "user-1", verified: null };
  assert.equal(canEditComponent(paid, nullVerified), true);
  assert.equal(canViewComponent(other, nullVerified), false);
});
