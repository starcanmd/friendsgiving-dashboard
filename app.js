(function () {
  const D = window.DATA;
  const rows = D.rows;
  const N = rows.length;

  // Fixed categorical order and color slots for the seating map (never cycled)
  const PRIMARY_ORDER = D.primary.map(d => d.label);
  const COLORS = ['--c1','--c2','--c3','--c4','--c5','--c6','--c7','--c8','--c9','--c10','--c11','--c12'];
  const colorOf = label => `var(${COLORS[Math.max(0, PRIMARY_ORDER.indexOf(label))] || '--c12'})`;

  const $ = s => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '0%';

  // ---------- state ----------
  const state = { filter: null, hover: null };
  const matches = (r, f) => {
    if (!f) return true;
    if (f.type === 'primary') return r.p === f.value;
    if (f.type === 'tag') return r.t.includes(f.value);
    if (f.type === 'from') return r.from === f.value;
    if (f.type === 'grew') return r.grew === f.value;
    if (f.type === 'school') return r.s === f.value;
    if (f.type === 'firm') return r.f.includes(f.value);
    return true;
  };
  const active = () => state.hover || state.filter;
  const filteredRows = () => rows.filter(r => matches(r, state.filter));

  function setFilter(f) {
    state.filter = (state.filter && f && state.filter.type === f.type && state.filter.value === f.value) ? null : f;
    render();
  }
  function setHover(f) { state.hover = f; renderRoom(); }

  // ---------- tooltip ----------
  const tip = $('#tip');
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = x + 14, top = y + 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top + h > window.innerHeight - 8) top = y - h - 14;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // ---------- seating map ----------
  const seatOrder = (() => {
    // Deal attendees across tables so every table mixes backgrounds (deterministic)
    const byCat = {};
    rows.forEach((r, i) => { (byCat[r.p] = byCat[r.p] || []).push(i); });
    const lanes = PRIMARY_ORDER.map(k => byCat[k] || []);
    const out = [];
    let left = N;
    while (left > 0) {
      for (const lane of lanes) if (lane.length) { out.push(lane.shift()); left--; }
    }
    return out;
  })();

  const ROOM = { cols: 5, rowsT: 4, seatsPerTable: 8 };
  function buildRoom() {
    const svg = $('#room-svg');
    const W = 640, H = 420, padX = 26, padTop = 34, padBot = 20;
    const cw = (W - padX * 2) / ROOM.cols, rh = (H - padTop - padBot) / ROOM.rowsT;
    const tw = cw * 0.62, th = rh * 0.34, r = 6.5;
    let html = '';
    // "stage" strip at the top: welcome bites, photo spot
    html += `<rect class="stage" x="${padX}" y="8" width="${W - padX * 2}" height="18" rx="9"/>`;
    html += `<text class="stage-t" x="${W / 2}" y="21" text-anchor="middle">doors · welcome bites · photo spot</text>`;
    let seatIdx = 0;
    const totalSeats = ROOM.cols * ROOM.rowsT * ROOM.seatsPerTable;
    for (let ty = 0; ty < ROOM.rowsT; ty++) {
      for (let tx = 0; tx < ROOM.cols; tx++) {
        const cx = padX + cw * tx + cw / 2, cy = padTop + rh * ty + rh / 2;
        const x = cx - tw / 2, y = cy - th / 2;
        html += `<rect class="table" x="${x}" y="${y}" width="${tw}" height="${th}" rx="6"/>`;
        const tnum = ty * ROOM.cols + tx + 1;
        html += `<text class="tlabel" x="${cx}" y="${cy + 3}" text-anchor="middle">${tnum}</text>`;
        const per = ROOM.seatsPerTable / 2;
        for (let s = 0; s < ROOM.seatsPerTable; s++) {
          const side = s < per ? -1 : 1, k = s % per;
          const sx = x + tw * (k + 0.5) / per, sy = cy + side * (th / 2 + 10);
          const rowI = seatOrder[seatIdx];
          if (rowI != null) {
            const row = rows[rowI];
            html += `<circle class="seat" data-i="${rowI}" cx="${sx}" cy="${sy}" r="${r}" fill="${colorOf(row.p)}"/>`;
          } else {
            html += `<circle class="seat open" cx="${sx}" cy="${sy}" r="${r}" fill="none" stroke="var(--sky-deep)" stroke-width="1" stroke-dasharray="2 2" opacity=".55"/>`;
          }
          seatIdx++;
        }
      }
    }
    svg.innerHTML = html;
    svg.dataset.total = totalSeats;

    svg.addEventListener('mousemove', e => {
      const t = e.target;
      if (t.classList && t.classList.contains('seat')) {
        if (t.classList.contains('open')) { showTip('<b>Open seat</b>Could be your next coach, or your next customer.', e.clientX, e.clientY); return; }
        const row = rows[+t.dataset.i];
        const total = rows.filter(r => r.p === row.p).length;
        const extra = row.t.filter(x => x !== row.p && !row.p.startsWith(x)).slice(0, 3);
        showTip(`<b>${row.p}</b>1 of ${total} attendees${extra.length ? '<br>Also: ' + extra.join(', ') : ''}`, e.clientX, e.clientY);
      } else hideTip();
    });
    svg.addEventListener('mouseleave', hideTip);
  }

  function renderRoom() {
    const f = active();
    const seats = document.querySelectorAll('#room-svg .seat[data-i]');
    let n = 0;
    seats.forEach(s => {
      const ok = matches(rows[+s.dataset.i], f);
      s.classList.toggle('dim', !!f && !ok);
      s.classList.toggle('hot', !!f && ok);
      if (ok) n++;
    });
    const sub = $('#room-sub');
    if (f) sub.textContent = `${n} of ${N} attendees · ${f.value}`;
    else sub.textContent = `${N} attendees seated · ${$('#room-svg').dataset.total - N} open seats shown`;
    $('#room-clear').hidden = !state.filter;
    // legend pressed state
    document.querySelectorAll('#room-legend button').forEach(b => {
      b.setAttribute('aria-pressed', !!(state.filter && state.filter.type === 'primary' && state.filter.value === b.dataset.v));
    });
  }

  function buildLegend() {
    const lg = $('#room-legend');
    lg.innerHTML = '';
    D.primary.forEach(d => {
      const b = el('button', null, `<i style="background:${colorOf(d.label)}"></i>${d.label} <b>${d.n}</b>`);
      b.dataset.v = d.label; b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('mouseenter', () => setHover({ type: 'primary', value: d.label }));
      b.addEventListener('mouseleave', () => setHover(null));
      b.addEventListener('click', () => { state.hover = null; setFilter({ type: 'primary', value: d.label }); });
      lg.appendChild(b);
    });
    $('#room-clear').addEventListener('click', () => { state.filter = null; render(); });
  }

  // ---------- bar charts ----------
  function barChart(container, items, type, opts = {}) {
    const c = $(container); c.innerHTML = '';
    const fr = filteredRows();
    const max = Math.max(...items.map(i => i.n));
    items.forEach(it => {
      const total = it.n;
      const cur = state.filter ? fr.filter(r => matches(r, { type, value: it.label })).length : total;
      const row = el('div', 'bar-row');
      row.setAttribute('role', 'button'); row.tabIndex = 0;
      const isOn = state.filter && state.filter.type === type && state.filter.value === it.label;
      row.setAttribute('aria-pressed', !!isOn);
      if (state.filter && !isOn && cur === 0) row.classList.add('muted');
      const label = el('div', 'bar-label', it.label);
      const track = el('div', 'bar-track');
      if (state.filter && !isOn) {
        const ghost = el('div', 'bar-fill ghost'); ghost.style.width = pct(total, max); track.appendChild(ghost);
      }
      const fill = el('div', 'bar-fill'); fill.style.width = pct(cur, max); track.appendChild(fill);
      const val = el('div', 'bar-val', state.filter && !isOn ? `${cur}<small>/${total}</small>` : `${total}`);
      row.append(label, track, val);
      const f = { type, value: it.label };
      row.addEventListener('click', () => setFilter(f));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(f); } });
      row.addEventListener('mouseenter', () => setHover(f));
      row.addEventListener('mouseleave', () => setHover(null));
      row.addEventListener('mousemove', e => {
        const base = opts.base || N;
        showTip(`<b>${it.label}</b>${total} attendees · ${pct(total, base)} of ${opts.baseLabel || 'attendees'}${state.filter && !isOn ? `<br>${cur} also match “${state.filter.value}”` : ''}`, e.clientX, e.clientY);
      });
      row.addEventListener('mouseleave', hideTip);
      c.appendChild(row);
    });
  }

  function renderCharts() {
    barChart('#chart-primary', D.primary, 'primary');
    barChart('#chart-tags', D.tags, 'tag');
    barChart('#chart-from', D.from.filter(d => d.label !== 'Not listed'), 'from');
    barChart('#chart-grew', D.grew.filter(d => d.label !== 'Not listed' && d.label !== 'Other'), 'grew');
    barChart('#chart-schools', D.schools, 'school');
  }

  // ---------- callouts ----------
  function renderCallouts() {
    const fr = filteredRows();
    const base = state.filter ? fr : rows;
    const cnt = fn => base.filter(fn).length;
    const items = [
      { n: cnt(r => r.t.includes('Consulting')), lab: 'have consulting experience' },
      { n: cnt(r => ['Private Equity', 'Investment Banking', 'Venture Capital'].some(t => r.t.includes(t))), lab: 'have worked in PE, banking, or venture' },
      { n: cnt(r => r.f.some(f => ['McKinsey & Company', 'BCG', 'Bain & Company'].includes(f))), lab: 'are McKinsey, BCG, or Bain alumni' },
      { n: cnt(r => r.t.includes('AI & Data') || r.t.includes('Big Tech')), lab: 'come from big tech or AI and data roles' },
    ];
    const c = $('#callouts'); c.innerHTML = '';
    items.forEach(it => c.appendChild(el('div', 'callout', `<span class="num">${it.n}</span><span class="lab">${it.lab}${state.filter ? ` <em>(within “${state.filter.value}”)</em>` : ''}</span>`)));
  }

  // ---------- firms ----------
  function renderFirms() {
    const fr = filteredRows();
    const counts = {};
    fr.forEach(r => r.f.forEach(f => { counts[f] = (counts[f] || 0) + 1; }));
    const list = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const cloud = $('#firm-cloud'); cloud.innerHTML = '';
    const shown = state.filter ? list : list.filter(x => x[1] >= 2);
    shown.forEach(([name, n]) => {
      const s = n >= 8 ? 's3' : n >= 4 ? 's2' : n >= 2 ? 's1' : 's0';
      const chip = el('span', `firm ${s}`, `${name}${n > 1 ? ` <small>${n}</small>` : ''}`);
      chip.addEventListener('mousemove', e => showTip(`<b>${name}</b>${n} attendee${n > 1 ? 's' : ''} list${n > 1 ? '' : 's'} this employer`, e.clientX, e.clientY));
      chip.addEventListener('mouseleave', hideTip);
      cloud.appendChild(chip);
    });
    if (!state.filter) {
      const rest = list.filter(x => x[1] < 2).length;
      cloud.appendChild(el('span', 'firm s0', `+ ${rest} more employers named once`));
    }
    $('#firm-list').textContent = D.firms_all.join(' · ');
  }

  // ---------- Leland stats ----------
  function renderLeland() {
    const F = D.flags, M = D.meta;
    const coach = [
      [F.mbb, 'McKinsey, BCG, or Bain alumni, the single largest group in the room'],
      [F.bank, 'alumni of Goldman, Morgan Stanley, J.P. Morgan, and other banks'],
      [F.pe_any, 'have worked at a private equity fund, from Blackstone and TPG to family offices'],
      [F.bigtech, 'come from Google, Apple, Meta, Uber, Palantir, and other large tech companies'],
    ];
    const cust = [
      [M.mba1, 'MBA1s start recruiting for summer 2027 within weeks of this dinner'],
      [F.vc_any + F.founder, 'have been investors or founders and are weighing building vs. joining'],
      [F.intl_grew, 'grew up outside the US and are navigating a US recruiting cycle for the first time'],
      [M.class_size - M.mba1, 'more classmates will see Leland named as sponsor in the class-wide invitation'],
    ];
    const fill = (id, items) => { const u = $(id); u.innerHTML = ''; items.forEach(([n, t]) => u.appendChild(el('li', null, `<span class="num">${n}</span><span>${t}</span>`))); };
    fill('#lstats-coach', coach); fill('#lstats-cust', cust);
  }

  function renderMeta() {
    const M = D.meta;
    $('#hero-count').textContent = M.mba1;
    $('#stat-rsvp').textContent = M.rsvps_total;
    $('#stat-target').textContent = M.target;
    $('#stat-data').textContent = M.profiles_with_data;
    const d = new Date(M.as_of + 'T12:00:00');
    $('#asof').textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function render() { renderRoom(); renderCharts(); renderCallouts(); renderFirms(); }

  buildRoom(); buildLegend(); renderMeta(); renderLeland(); render();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.filter) { state.filter = null; render(); } });
})();
