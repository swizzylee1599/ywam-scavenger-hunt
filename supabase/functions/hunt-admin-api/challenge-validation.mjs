const MEDIA_KINDS = new Set(['photo', 'video', 'either']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, field, { min = 0, max, nullable = false } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized && nullable) return null;
  if (normalized.length < min) throw new Error(`${field} is required`);
  if (max && normalized.length > max) throw new Error(`${field} must be ${max} characters or fewer`);
  return normalized;
}

function integer(value, field, max) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new Error(`${field} must be a whole number from 0 to ${max}`);
  }
  return value;
}

export function validateChallengeId(value) {
  const id = String(value ?? '').trim();
  if (!UUID_PATTERN.test(id)) throw new Error('Invalid challenge id');
  return id;
}

export function validateChallenge(input) {
  const mediaKind = String(input?.media_kind ?? '').trim();
  if (!MEDIA_KINDS.has(mediaKind)) {
    throw new Error('Media requirement must be photo, video, or either');
  }

  if (typeof input?.is_active !== 'boolean') throw new Error('Active status must be true or false');

  const basePoints = integer(input.base_points, 'Base points', 10000);
  const bonusPoints = integer(input.bonus_points_per_unit, 'Bonus points per unit', 10000);
  const maxBonusUnits = integer(input.max_bonus_units, 'Maximum bonus units', 100);
  const sortOrder = integer(input.sort_order, 'Order position', 100000);
  const bonusEnabled = bonusPoints > 0 || maxBonusUnits > 0;

  if (bonusEnabled && (bonusPoints === 0 || maxBonusUnits === 0)) {
    throw new Error('Bonus points and maximum units must both be greater than 0, or both be 0');
  }

  const bonusLabel = text(input.bonus_label, 'Bonus label', {
    min: bonusEnabled ? 1 : 0,
    max: 100,
    nullable: !bonusEnabled,
  });

  return {
    title: text(input.title, 'Title', { min: 1, max: 120 }),
    description: text(input.description, 'Description', { max: 1000, nullable: true }),
    category: text(input.category, 'Category', { min: 1, max: 60 }),
    base_points: basePoints,
    media_kind: mediaKind,
    bonus_points_per_unit: bonusPoints,
    max_bonus_units: maxBonusUnits,
    bonus_label: bonusEnabled ? bonusLabel : null,
    sort_order: sortOrder,
    is_active: input.is_active,
  };
}

export function slugForTitle(title) {
  const base = String(title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'challenge';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
