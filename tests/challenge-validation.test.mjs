import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  slugForTitle,
  validateChallenge,
  validateChallengeId,
} from '../supabase/functions/hunt-admin-api/challenge-validation.mjs';

globalThis.crypto = webcrypto;

const valid = {
  title: 'Human Pyramid',
  description: 'Build a pyramid.',
  category: 'people',
  base_points: 40,
  media_kind: 'photo',
  bonus_points_per_unit: 10,
  max_bonus_units: 5,
  bonus_label: 'strangers added',
  sort_order: 70,
  is_active: true,
  is_mystery: false,
};

test('normalizes a valid challenge and preserves writable values', () => {
  assert.deepEqual(validateChallenge({ ...valid, title: '  Human Pyramid  ' }), valid);
});

test('allows a challenge without bonus settings and clears its label', () => {
  const challenge = validateChallenge({
    ...valid,
    bonus_points_per_unit: 0,
    max_bonus_units: 0,
    bonus_label: 'old label',
  });
  assert.equal(challenge.bonus_label, null);
});

test('older admin clients create ordinary challenges when mystery status is omitted', () => {
  const { is_mystery: _ignored, ...olderPayload } = valid;
  assert.equal(validateChallenge(olderPayload).is_mystery, false);
});

test('rejects invalid media kinds', () => {
  assert.throws(() => validateChallenge({ ...valid, media_kind: 'audio' }), /photo, video, or either/);
  assert.throws(() => validateChallenge({ ...valid, is_active: 'true' }), /true or false/);
  assert.throws(() => validateChallenge({ ...valid, is_mystery: 'true' }), /Mystery status/);
});

test('rejects fractional, negative, and excessive point values', () => {
  assert.throws(() => validateChallenge({ ...valid, base_points: 1.5 }), /whole number/);
  assert.throws(() => validateChallenge({ ...valid, bonus_points_per_unit: -1 }), /whole number/);
  assert.throws(() => validateChallenge({ ...valid, max_bonus_units: 101 }), /whole number/);
});

test('requires both bonus numbers and a label when bonuses are enabled', () => {
  assert.throws(() => validateChallenge({ ...valid, max_bonus_units: 0 }), /must both be greater/);
  assert.throws(() => validateChallenge({ ...valid, bonus_label: '' }), /Bonus label is required/);
});

test('validates challenge ids', () => {
  assert.equal(
    validateChallengeId('98a3768d-6c0b-43c4-87e1-db5baf99defb'),
    '98a3768d-6c0b-43c4-87e1-db5baf99defb',
  );
  assert.throws(() => validateChallengeId('not-an-id'), /Invalid challenge id/);
});

test('creates readable unique slugs without changing titles on edit', () => {
  const first = slugForTitle('Find the Dinosaur!');
  const second = slugForTitle('Find the Dinosaur!');
  assert.match(first, /^find-the-dinosaur-[0-9a-f]{8}$/);
  assert.notEqual(first, second);
});
