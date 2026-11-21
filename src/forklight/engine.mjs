/** Pure decision math. Scores are subjective, ordinal inputs, not probabilities. */
export function example() {
  return {
    version: 1,
    title: 'Where should we host our game night?',
    context: 'Six friends, one Friday evening. Find a place that works for everyone.',
    options: [{ id: 'home', name: 'At home' }, { id: 'cafe', name: 'Board game café' }, { id: 'studio', name: 'Community room' }],
    criteria: [
      { id: 'cost', name: 'Affordability', weight: 8 },
      { id: 'travel', name: 'Easy to get to', weight: 6 },
      { id: 'space', name: 'Space & comfort', weight: 7 },
      { id: 'vibe', name: 'Atmosphere', weight: 5 },
    ],
    scores: { home: { cost: 5, travel: 2, space: 3, vibe: 4 }, cafe: { cost: 2, travel: 5, space: 4, vibe: 5 }, studio: { cost: 4, travel: 3, space: 5, vibe: 2 } },
    chosen: '', rationale: '', decidedAt: '', outcome: '', reviewedAt: '',
  };
}

export function blank() {
  return { version: 1, title: 'Untitled decision', context: '', options: [{ id: 'a', name: 'Option A' }, { id: 'b', name: 'Option B' }], criteria: [{ id: 'value', name: 'Value', weight: 5 }, { id: 'effort', name: 'Ease', weight: 5 }], scores: {}, chosen: '', rationale: '', decidedAt: '', outcome: '', reviewedAt: '' };
}

/** Validate persisted documents as well as form data. Missing ratings are allowed in drafts. */
export function validate(d) {
  const errors = [];
  if (!d || typeof d !== 'object') return ['Decision must be an object.'];
  if (d.version !== 1) errors.push('Unsupported decision version.');
  if (typeof d.title !== 'string' || !d.title.trim() || d.title.length > 160) errors.push('Use a title of 1–160 characters.');
  for (const key of ['context', 'rationale', 'outcome']) if (typeof d[key] !== 'string' || d[key].length > 4000) errors.push(`${key} must be text under 4,001 characters.`);
  for (const [key, min, max] of [['options', 2, 6], ['criteria', 2, 8]]) {
    const rows = d[key];
    if (!Array.isArray(rows) || rows.length < min || rows.length > max) { errors.push(`Use ${min}–${max} ${key}.`); continue; }
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id)) errors.push(`Invalid or duplicate ${key} identifier.`);
      ids.add(row?.id);
      if (typeof row?.name !== 'string' || !row.name.trim() || row.name.length > 80) errors.push(`Give each ${key === 'options' ? 'option' : 'criterion'} a name of 1–80 characters.`);
      if (key === 'criteria' && (!Number.isInteger(row?.weight) || row.weight < 1 || row.weight > 10)) errors.push('Weights must be integers from 1 to 10.');
    }
  }
  // Do not traverse malformed row collections or numeric fields after structural failures.
  if (errors.length) return [...new Set(errors)];
  if (!d.scores || typeof d.scores !== 'object' || Array.isArray(d.scores)) errors.push('Scores must be an object.');
  if (Array.isArray(d.options) && Array.isArray(d.criteria)) {
    for (const o of d.options) for (const c of d.criteria) {
      const value = d.scores?.[o.id]?.[c.id];
      if (value != null && (!Number.isInteger(value) || value < 1 || value > 5)) errors.push('Ratings must be integers from 1 to 5, or unanswered.');
    }
  }
  if (typeof d.chosen !== 'string' || (d.chosen && !d.options?.some(o => o.id === d.chosen))) errors.push('Choose an existing option.');
  for (const key of ['decidedAt', 'reviewedAt']) if (typeof d[key] !== 'string' || (d[key] && !Number.isFinite(Date.parse(d[key])))) errors.push(`Invalid ${key} date.`);
  if (d.decidedAt && (!d.chosen || !d.rationale?.trim())) errors.push('A recorded decision needs a choice and a rationale.');
  return [...new Set(errors)];
}

export function rank(d) {
  const errors = validate(d);
  if (errors.length) return { complete: false, errors, rows: [], winners: [], missing: 0 };
  const missing = d.options.reduce((sum, o) => sum + d.criteria.filter(c => d.scores[o.id]?.[c.id] == null).length, 0);
  if (missing) return { complete: false, errors: [], rows: [], winners: [], missing };
  const weight = d.criteria.reduce((sum, c) => sum + c.weight, 0);
  // Rank on the integer numerator; rounding the displayed score must never create a tie.
  const rows = d.options.map(o => {
    const numerator = d.criteria.reduce((sum, c) => sum + c.weight * d.scores[o.id][c.id], 0);
    return { ...o, numerator, score: numerator / (weight * 5) * 100 };
  }).sort((a, b) => b.numerator - a.numerator);
  return { complete: true, errors: [], missing: 0, rows, winners: rows.filter(o => o.numerator === rows[0].numerator).map(o => o.id) };
}

/** One-at-a-time sweep, not an exhaustive or probabilistic robustness guarantee. */
export function sensitivity(d, criterionId) {
  if (!rank(d).complete || !d.criteria.some(c => c.id === criterionId)) return [];
  return Array.from({ length: 10 }, (_, i) => {
    const result = rank({ ...d, criteria: d.criteria.map(c => c.id === criterionId ? { ...c, weight: i + 1 } : c) });
    return { weight: i + 1, winners: result.winners, rows: result.rows };
  });
}

export function recordDecision(d, now = new Date().toISOString()) {
  const result = rank(d);
  if (!result.complete) throw new Error('Rate every option before recording a decision.');
  if (!d.chosen || !d.rationale.trim()) throw new Error('Choose an option and explain your reasoning.');
  if (d.decidedAt) throw new Error('This decision is already recorded. Duplicate it to explore another path.');
  const next = { ...structuredClone(d), decidedAt: now };
  const errors = validate(next);
  if (errors.length) throw new Error(errors.join(' '));
  return next;
}

export function duplicate(d) {
  return { ...structuredClone(d), title: `${d.title.slice(0, 148)} (copy)`, chosen: '', rationale: '', decidedAt: '', outcome: '', reviewedAt: '' };
}
