import { blank, example, rank, sensitivity, validate, recordDecision, duplicate } from './engine.mjs';

// Only this module touches the DOM. Both the demo and DeepSpace use this exact interface.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const id = () => crypto.randomUUID();
const date = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function mount(root, adapter) {
  let current = example(), recordId = null, rows = [], dirty = false, busy = false, disposed = false;
  let sweepId = current.criteria[0].id, message = '', isError = false, external = false, loading = true;

  function announce(text, error = false) { message = text; isError = error; render(); }
  function changed() { dirty = true; message = ''; }
  function focusAfterRender(focusId, selection) {
    render();
    const element = root.querySelector(`[data-focus="${focusId}"]`);
    element?.focus();
    if (selection != null && element?.setSelectionRange) element.setSelectionRange(selection, selection);
  }
  function open(doc, nextId = null) {
    current = structuredClone(doc); recordId = nextId; dirty = false; external = false;
    sweepId = current.criteria[0]?.id; message = ''; render();
  }
  function canLeave() { return !dirty || window.confirm('Discard your unsaved changes?'); }
  async function loadRows() {
    const records = await adapter.list();
    if (!Array.isArray(records) || records.some(row => !row || typeof row.id !== 'string' || validate(row.document).length)) {
      throw new Error('A notebook record is invalid. Your current edits are still here. Restore the record before loading this notebook.');
    }
    return records;
  }
  async function refresh() {
    try { rows = await loadRows(); loading = false; if (!disposed) render(); }
    catch (error) { loading = false; if (!disposed) announce(error.message || 'Could not load decisions.', true); }
  }
  async function persist(document) {
    if (!adapter.ready || busy || external) return;
    const errors = validate(document);
    if (errors.length) { announce(errors.join(' '), true); return; }
    busy = true; render();
    try {
      const savedId = await adapter.save(recordId, structuredClone(document));
      // Only display a recorded state after the persistence adapter confirms acceptance.
      recordId = savedId; current = structuredClone(document); dirty = false; busy = false; external = false;
      rows = await loadRows();
      announce(document.decidedAt ? 'Decision saved. Your reasoning is ready to revisit.' : 'Draft saved. You can come back to it any time.');
    } catch (error) { busy = false; announce(error.message || 'Save failed. Your changes are still here; try again.', true); }
  }
  function render() {
    if (disposed) return;
    const frozen = Boolean(current.decidedAt), result = rank(current), complete = result.complete;
    const total = current.criteria.reduce((sum, c) => sum + c.weight, 0);
    const writable = adapter.ready && !busy && !loading && !external;
    const disabled = frozen || busy;
    const selected = current.criteria.find(c => c.id === sweepId) || current.criteria[0];
    const sweep = sensitivity(current, selected?.id);
    const changes = sweep.filter(point => point.winners.join(',') !== result.winners.join(','));
    root.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <a class="brand" href="#" aria-label="Forklight home"><span class="brand-mark">⑂</span> forklight<span class="brand-dot">.</span></a>
          <p class="tagline">Make room for a clear choice.</p>
          <button class="new-button" data-action="new">＋ New decision</button>
          <div class="nav-label">YOUR NOTEBOOK <span>${rows.length.toString().padStart(2, '0')}</span></div>
          <nav aria-label="Saved decisions">${loading ? '<p class="muted">Loading notebook…</p>' : rows.length ? rows.map(r => `<button class="notebook-item ${r.id === recordId ? 'active' : ''}" data-action="open" data-id="${esc(r.id)}"><span class="small-dot ${r.document.decidedAt ? 'done' : ''}"></span><span>${esc(r.document.title)}<small>${r.document.decidedAt ? 'Recorded ' + date(r.document.decidedAt) : 'Draft · still thinking'}</small></span></button>`).join('') : '<p class="empty">A home for the choices<br>you want to think through.<br><br>Save your first draft to begin.</p>'}</nav>
          <div class="sidebar-bottom"><span class="sun">✳</span><p>A score starts a conversation.<br>Your judgment finishes it.</p><button class="text-button" data-action="example">Explore the example ↗</button></div>
        </aside>
        <main>
          <header class="topbar"><span>THE DECISION STUDIO</span><span class="connection"><i class="${adapter.ready ? '' : 'offline'}"></i>${esc(adapter.mode)}</span></header>
          <div class="workspace">
            <div class="eyebrow"><span class="pill">${frozen ? 'RECORDED' : 'WORK IN PROGRESS'}</span><span>${dirty ? 'Unsaved changes' : recordId ? 'Saved in your notebook' : 'An example to make your own'}</span></div>
            <div class="title-row"><h1>${frozen ? 'A choice, made thoughtfully.' : 'Good choices start\nwith better questions.'}</h1><span class="sketch" aria-hidden="true">↗</span></div>
            <p class="intro">Lay out your options. Weigh what matters. See what changes your mind.</p>
            ${message ? `<div class="notice ${isError ? 'error' : 'success'}" role="${isError ? 'alert' : 'status'}">${esc(message)}</div>` : ''}
            ${external ? '<div class="notice error" role="alert">This notebook changed in another tab. Save is paused to protect your work. Copy your notes, then reopen the saved decision to load the latest version. Simultaneous saves are not supported.</div>' : ''}
            ${!adapter.ready ? '<div class="notice" role="status">Connecting to your notebook. Saving will be available when the connection is ready.</div>' : ''}
            <section class="question-card" aria-labelledby="question-heading"><div class="section-kicker" id="question-heading">01 / FRAME THE QUESTION</div>
              <label class="sr-only" for="decision-title">Decision title</label><input id="decision-title" class="question-input" data-field="title" data-focus="title" value="${esc(current.title)}" maxlength="160" ${disabled ? 'disabled' : ''}>
              <label class="sr-only" for="decision-context">Context</label><textarea id="decision-context" class="context-input" data-field="context" data-focus="context" rows="2" maxlength="4000" placeholder="What are you deciding, and why does it matter?" ${disabled ? 'disabled' : ''}>${esc(current.context)}</textarea>
            </section>
            <div class="section-heading"><div><div class="section-kicker">02 / COMPARE YOUR OPTIONS</div><h2>What matters to you?</h2></div><span class="hint">Rate 1–5 · higher is always better</span></div>
            <p class="helper">Use positive criteria like “affordability” or “ease.” Give more weight to what matters most.</p>
            <div class="matrix-wrap"><table class="matrix"><caption class="sr-only">Weighted decision matrix. Each option receives a rating from 1 to 5 for every criterion.</caption><thead><tr><th scope="col" class="criterion-header">Your criteria <span>Importance</span></th>${current.options.map((o, i) => `<th scope="col"><span class="option-letter">${String.fromCharCode(65 + i)}</span><label class="sr-only" for="option-${esc(o.id)}">Option ${i + 1} name</label><input id="option-${esc(o.id)}" data-option="${esc(o.id)}" data-focus="o-${esc(o.id)}" maxlength="80" value="${esc(o.name)}" ${disabled ? 'disabled' : ''}>${!frozen && current.options.length > 2 ? `<button class="remove" data-action="remove-option" data-id="${esc(o.id)}" aria-label="Remove option ${esc(o.name)}">×</button>` : ''}</th>`).join('')}</tr></thead><tbody>
              ${current.criteria.map(c => `<tr><th scope="row"><div class="criterion-name"><label class="sr-only" for="criterion-${esc(c.id)}">Criterion name</label><input id="criterion-${esc(c.id)}" data-criterion="${esc(c.id)}" data-focus="c-${esc(c.id)}" maxlength="80" value="${esc(c.name)}" ${disabled ? 'disabled' : ''}>${!frozen && current.criteria.length > 2 ? `<button class="remove" data-action="remove-criterion" data-id="${esc(c.id)}" aria-label="Remove criterion ${esc(c.name)}">×</button>` : ''}</div><div class="weight-row"><label class="sr-only" for="weight-${esc(c.id)}">Importance of ${esc(c.name)}</label><input id="weight-${esc(c.id)}" type="range" min="1" max="10" step="1" data-weight="${esc(c.id)}" data-focus="w-${esc(c.id)}" value="${c.weight}" ${disabled ? 'disabled' : ''}><span>${c.weight}<small>/10</small></span></div></th>${current.options.map(o => `<td><label class="sr-only" for="score-${esc(o.id)}-${esc(c.id)}">${esc(o.name)}: ${esc(c.name)} rating</label><select id="score-${esc(o.id)}-${esc(c.id)}" data-score-option="${esc(o.id)}" data-score-criterion="${esc(c.id)}" data-focus="s-${esc(o.id)}-${esc(c.id)}" ${disabled ? 'disabled' : ''} class="rating rating-${current.scores[o.id]?.[c.id] || 0}"><option value="">—</option>${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${current.scores[o.id]?.[c.id] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}
            </tbody><tfoot><tr><th scope="row">Weighted score <small>out of 100 · ${total} total weight</small></th>${current.options.map(o => `<td class="total ${complete && result.winners.includes(o.id) ? 'leading' : ''}">${complete ? result.rows.find(r => r.id === o.id).score.toFixed(1) : '—'}${complete && result.winners.includes(o.id) ? '<small>LEADING</small>' : ''}</td>`).join('')}</tr></tfoot></table></div>
            ${!frozen ? `<div class="matrix-actions"><button class="text-button" data-action="add-criterion" ${current.criteria.length >= 8 || busy ? 'disabled' : ''}>＋ Add criterion</button><button class="text-button" data-action="add-option" ${current.options.length >= 6 || busy ? 'disabled' : ''}>＋ Add option</button><span>2–6 options · 2–8 criteria</span></div>` : ''}
            <div class="insight-grid"><section class="insight-card" aria-labelledby="ranking-title"><div class="section-kicker">THE BIG PICTURE</div><h2 id="ranking-title">${!complete ? 'A few blanks to fill.' : result.winners.length > 1 ? 'It’s a close call. A tie, actually.' : `${esc(result.rows[0].name)} has the edge.`}</h2><p>${!complete ? result.errors.length ? esc(result.errors[0]) : `${result.missing} unanswered rating${result.missing === 1 ? '' : 's'}. Complete the matrix to compare fairly.` : result.winners.length > 1 ? 'The top weighted scores match exactly. Your context can break the tie.' : `A ${(result.rows[0].score - result.rows[1].score).toFixed(1)} point lead with your current priorities. This reflects your ratings, not an objective verdict.`}</p>
              ${complete ? `<div class="ranking">${result.rows.map((o, i) => `<div class="rank-row"><span>${i + 1}</span><div><div class="rank-label"><strong>${esc(o.name)}</strong><b>${o.score.toFixed(1)}</b></div><div class="track"><div style="width:${o.score}%" class="bar bar-${i}"></div></div></div></div>`).join('')}</div>` : '<div class="unfinished-art" aria-hidden="true">· · ·</div>'}
            </section><section class="sensitivity-card" aria-labelledby="sensitivity-title"><div class="section-kicker">03 / CHALLENGE YOUR ASSUMPTIONS</div><h2 id="sensitivity-title">What would change your mind?</h2><p>Change one priority at a time. See who leads as its weight moves from 1 to 10.</p><label for="sweep">Test a priority</label><select id="sweep" data-sweep data-focus="sweep">${current.criteria.map(c => `<option value="${esc(c.id)}" ${c.id === selected?.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
              <div class="sweep" aria-label="Leading option at each priority weight">${sweep.length ? sweep.map(p => `<div class="sweep-point ${p.weight === selected.weight ? 'current' : ''}"><span>${p.weight}</span><b title="${esc(p.winners.map(w => current.options.find(o => o.id === w).name).join(' + '))}">${p.winners.length > 1 ? '=' : String.fromCharCode(65 + current.options.findIndex(o => o.id === p.winners[0]))}</b></div>`).join('') : '<p class="muted">Complete the ratings to run this test.</p>'}</div>
              <p class="sweep-note">${complete ? changes.length ? `The leader or tie changes at ${changes.length} of 10 tested weights. Your choice depends on this priority.` : 'The same leader holds at all 10 tested weights for this priority.' : 'Missing ratings stay unknown; they never count as zero.'}</p><small class="muted">Letters match option headers. = means a tie. This tests one weight, with every other input held fixed.</small>
            </section></div>
            <section class="decision-card" aria-labelledby="commit-title"><div><div class="section-kicker">04 / KEEP THE WHY</div><h2 id="commit-title">${frozen ? 'A note to your future self.' : 'You get the final say.'}</h2><p>${frozen ? `Recorded ${date(current.decidedAt)}. Duplicate this decision to explore different assumptions.` : 'Choose the option you believe in, even if the numbers disagree.'}</p></div><div class="decision-form"><label for="chosen">My choice</label><select id="chosen" data-field="chosen" data-focus="chosen" ${disabled ? 'disabled' : ''}><option value="">Choose an option…</option>${current.options.map(o => `<option value="${esc(o.id)}" ${current.chosen === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select><label for="rationale">Why this choice?</label><textarea id="rationale" data-field="rationale" data-focus="rationale" maxlength="4000" rows="3" placeholder="What tipped the balance? What are you accepting or giving up?" ${disabled ? 'disabled' : ''}>${esc(current.rationale)}</textarea>
            ${frozen ? `<label for="outcome">Looking back, how did it go?</label><textarea id="outcome" data-field="outcome" data-focus="outcome" rows="3" maxlength="4000" ${busy ? 'disabled' : ''} placeholder="What worked? What would you weigh differently next time?">${esc(current.outcome)}</textarea>${current.reviewedAt ? `<small>Reflection saved ${date(current.reviewedAt)}</small>` : ''}<button class="primary" data-action="review" ${!writable ? 'disabled' : ''}>Save reflection ↗</button>` : `<button class="primary" data-action="record" ${!writable || !complete || !current.chosen || !current.rationale.trim() ? 'disabled' : ''}>${busy ? 'Saving…' : 'Record my decision ↗'}</button><small>The matrix becomes read-only here after you record it.</small>`}</div></section>
            <footer class="workspace-footer"><span>${frozen ? 'Reflection turns a decision into a lesson.' : 'Clarity is a practice, not a perfect score.'}</span><div><button class="text-button" data-action="duplicate" ${busy ? 'disabled' : ''}>Duplicate</button><button class="save-button" data-action="save" ${!writable || frozen ? 'disabled' : ''}>${busy ? 'Saving…' : 'Save draft'}</button></div></footer>
          </div>
        </main>
      </div>`;
  }

  function onInput(event) {
    const el = event.target;
    if (busy) return;
    if (el.matches('[data-field]')) {
      if (current.decidedAt && el.dataset.field !== 'outcome') return;
      current[el.dataset.field] = el.value; changed();
      // Keep caret position across render; update derived controls without delaying validation.
      focusAfterRender(el.dataset.focus, el.selectionStart);
    } else if (!current.decidedAt && el.dataset.option) {
      current.options.find(o => o.id === el.dataset.option).name = el.value; changed(); focusAfterRender(el.dataset.focus, el.selectionStart);
    } else if (!current.decidedAt && el.dataset.criterion) {
      current.criteria.find(c => c.id === el.dataset.criterion).name = el.value; changed(); focusAfterRender(el.dataset.focus, el.selectionStart);
    }
  }
  function onChange(event) {
    const el = event.target;
    if (busy) return;
    if (el.hasAttribute('data-sweep')) { sweepId = el.value; focusAfterRender('sweep'); }
    else if (!current.decidedAt && el.dataset.weight) {
      current.criteria.find(c => c.id === el.dataset.weight).weight = Number(el.value); changed(); focusAfterRender(el.dataset.focus);
    } else if (!current.decidedAt && el.dataset.scoreOption) {
      const option = el.dataset.scoreOption;
      current.scores[option] ||= {}; current.scores[option][el.dataset.scoreCriterion] = el.value ? Number(el.value) : null;
      changed(); focusAfterRender(el.dataset.focus);
    }
  }
  async function onClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled || busy) return;
    const action = button.dataset.action;
    if (action === 'new' && canLeave()) { open(blank()); dirty = true; render(); }
    if (action === 'example' && canLeave()) open(example());
    if (action === 'open' && canLeave()) {
      const row = rows.find(r => r.id === button.dataset.id);
      const errors = validate(row.document);
      if (errors.length) announce('This saved decision cannot be opened: ' + errors.join(' '), true);
      else open(row.document, row.id);
    }
    if (action === 'duplicate' && canLeave()) { open(duplicate(current)); dirty = true; render(); }
    if (action === 'save' && !current.decidedAt) await persist(current);
    if (action === 'record') { try { await persist(recordDecision(current)); } catch (error) { announce(error.message, true); } }
    if (action === 'review' && current.decidedAt) await persist({ ...current, reviewedAt: new Date().toISOString() });
    if (current.decidedAt) return;
    if (action === 'add-option' && current.options.length < 6) { current.options.push({ id: id(), name: 'New option' }); changed(); render(); }
    if (action === 'add-criterion' && current.criteria.length < 8) { current.criteria.push({ id: id(), name: 'New criterion', weight: 5 }); changed(); render(); }
    if (action === 'remove-option' && current.options.length > 2) {
      current.options = current.options.filter(o => o.id !== button.dataset.id); delete current.scores[button.dataset.id];
      if (current.chosen === button.dataset.id) current.chosen = ''; changed(); render();
    }
    if (action === 'remove-criterion' && current.criteria.length > 2) {
      current.criteria = current.criteria.filter(c => c.id !== button.dataset.id);
      for (const option of Object.values(current.scores)) delete option[button.dataset.id];
      changed(); render();
    }
  }
  const beforeUnload = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  root.addEventListener('input', onInput); root.addEventListener('change', onChange); root.addEventListener('click', onClick);
  window.addEventListener('beforeunload', beforeUnload);
  const unsubscribe = adapter.subscribe?.(async () => {
    if (busy || disposed) return;
    // Never overwrite a working draft when a remote tab changes its source.
    let next;
    try { next = await loadRows(); } catch (error) { announce('Notebook sync failed. ' + error.message, true); return; }
    if (recordId) {
      const saved = next.find(r => r.id === recordId);
      const previous = rows.find(r => r.id === recordId);
      if (JSON.stringify(saved) !== JSON.stringify(previous)) {
        if (dirty) external = true;
        else if (saved && !validate(saved.document).length) current = structuredClone(saved.document);
      }
    }
    rows = next; render();
  });
  render(); refresh();
  return { refresh, destroy() { disposed = true; unsubscribe?.(); window.removeEventListener('beforeunload', beforeUnload); root.removeEventListener('input', onInput); root.removeEventListener('change', onChange); root.removeEventListener('click', onClick); root.replaceChildren(); } };
}
