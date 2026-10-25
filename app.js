// Nutrition Tracker — exchange-based daily log.
// Everything is stored in this browser's localStorage. Nothing is sent anywhere.

const STORE_KEY = 'nutrition-tracker:v1';

const GROUPS = [
  { key: 'carb', label: 'Carbs', hint: 'starch / fruit', short: 'C' },
  { key: 'protein', label: 'Protein', hint: '7 g each', short: 'P' },
  { key: 'fat', label: 'Fat', hint: '5 g each', short: 'F' },
  { key: 'veg', label: 'Veggies', hint: '1 cup raw', short: 'V' },
];

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'PM snack' },
  { key: 'dinner', label: 'Dinner' },
];

// Defaults come from the MV Nutrition plan (Sept 2026). Editable in Settings.
const DEFAULT_SETTINGS = {
  meals: {
    breakfast: { carb: 2, protein: 2, fat: 2, veg: 0 },
    lunch: { carb: 1, protein: 5, fat: 2, veg: 2 },
    snack: { carb: 1, protein: 3, fat: 0, veg: 0 },
    dinner: { carb: 1, protein: 5, fat: 2, veg: 2 },
  },
  trainingBonusMeal: 'lunch', // +1 carb on days with >60 min of exercise
  waterGoalOz: 70,
  kcalGoal: 1671,
};

// Rough calories per exchange, used only when a food has no kcal of its own.
const KCAL_PER = { carb: 75, protein: 65, fat: 45, veg: 25 };

// ---------- state & storage ----------

const state = {
  data: loadData(),
  view: 'today',
  date: todayKey(),
  sheet: null, // { meal, tab, query, selected, qty }
};

function loadData() {
  const fresh = { settings: structuredClone(DEFAULT_SETTINGS), logs: {}, customFoods: [] };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fresh;
    return normalize(JSON.parse(raw));
  } catch {
    return fresh;
  }
}

function normalize(d) {
  const meals = {};
  for (const m of MEALS) meals[m.key] = { ...DEFAULT_SETTINGS.meals[m.key], ...(d?.settings?.meals?.[m.key] || {}) };
  return {
    settings: { ...DEFAULT_SETTINGS, ...(d?.settings || {}), meals },
    logs: d?.logs && typeof d.logs === 'object' ? d.logs : {},
    customFoods: Array.isArray(d?.customFoods) ? d.customFoods : [],
  };
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
  } catch {
    toast('Could not save — storage is unavailable in this browser.');
  }
}

// ---------- helpers ----------

function todayKey() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

function shiftDate(key, days) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}

function prettyDate(key) {
  if (key === todayKey()) return 'Today';
  if (key === shiftDate(todayKey(), -1)) return 'Yesterday';
  return new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const roundHalf = (x) => Math.round(x * 2) / 2;
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace(/\.0$/, ''));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function emptyDay() {
  return { items: [], water: 0, vitD: false, creatine: false, trained: false };
}

function getDay(key) {
  return state.data.logs[key] || emptyDay();
}

// Returns the day's log, creating it so it can be mutated and saved.
function ensureDay(key) {
  if (!state.data.logs[key]) state.data.logs[key] = emptyDay();
  return state.data.logs[key];
}

function sum(items) {
  const t = { carb: 0, protein: 0, fat: 0, veg: 0, kcal: 0 };
  for (const it of items) for (const k in t) t[k] += Number(it[k]) || 0;
  return t;
}

function mealTargets(day) {
  const t = structuredClone(state.data.settings.meals);
  if (day.trained) t[state.data.settings.trainingBonusMeal].carb += 1;
  return t;
}

function dayTargets(day) {
  const t = { carb: 0, protein: 0, fat: 0, veg: 0 };
  for (const m of Object.values(mealTargets(day))) for (const k in t) t[k] += m[k];
  return t;
}

function estimateKcal(ex) {
  return Math.round(GROUPS.reduce((acc, g) => acc + (ex[g.key] || 0) * KCAL_PER[g.key], 0));
}

function status(eaten, target) {
  if (eaten > target + 0.5) return 'over';
  if (target - eaten <= 0.5) return 'done';
  return 'left';
}

function allFoods() {
  return [...state.data.customFoods, ...FOOD_LIBRARY];
}

// Foods used most recently, newest first, for quick re-adding.
function recentFoodIds(limit = 8) {
  const ids = [];
  const keys = Object.keys(state.data.logs).sort().reverse();
  for (const k of keys) {
    for (const it of [...state.data.logs[k].items].reverse()) {
      if (it.foodId && !ids.includes(it.foodId)) ids.push(it.foodId);
      if (ids.length >= limit) return ids;
    }
  }
  return ids;
}

function exchangeText(ex) {
  const parts = GROUPS.filter((g) => ex[g.key]).map((g) => `${fmt(ex[g.key])}${g.short}`);
  return parts.length ? parts.join(' · ') : 'free';
}

// ---------- rendering ----------

const $app = document.getElementById('app');

function render() {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
  if (state.view === 'today') $app.innerHTML = renderToday();
  else if (state.view === 'history') $app.innerHTML = renderHistory();
  else $app.innerHTML = renderSettings();
  renderSheet();
}

function renderToday() {
  const day = getDay(state.date);
  const totals = sum(day.items);
  const targets = dayTargets(day);
  const mTargets = mealTargets(day);
  const s = state.data.settings;

  const summary = GROUPS.map((g) => {
    const eaten = totals[g.key];
    const target = targets[g.key];
    const st = status(eaten, target);
    const pct = target ? Math.min(100, (eaten / target) * 100) : eaten ? 100 : 0;
    const note = st === 'over' ? `+${fmt(eaten - target)} over` : st === 'done' ? 'on target' : `${fmt(target - eaten)} left`;
    return `
      <div class="stat ${st}">
        <div class="stat-top"><span class="stat-label">${g.label}</span><span class="stat-num">${fmt(eaten)}<small>/${fmt(target)}</small></span></div>
        <div class="bar"><div class="bar-fill g-${g.key}" style="width:${pct}%"></div></div>
        <div class="stat-note">${note}</div>
      </div>`;
  }).join('');

  const meals = MEALS.map((m) => {
    const items = day.items.filter((it) => it.meal === m.key);
    const mt = sum(items);
    const target = mTargets[m.key];
    const chips = GROUPS.filter((g) => target[g.key] || mt[g.key])
      .map((g) => `<span class="chip ${status(mt[g.key], target[g.key])}">${fmt(mt[g.key])}/${fmt(target[g.key])} ${g.short}</span>`)
      .join('');
    const rows = items.map((it) => `
      <li class="item">
        <div class="item-main">
          <div class="item-name">${esc(it.name)}</div>
          <div class="item-sub">${it.unit ? `${fmt(it.qty)} × ${esc(it.unit)} · ` : ''}${exchangeText(it)} · ~${Math.round(it.kcal)} kcal</div>
        </div>
        <button class="icon-btn" data-action="remove-item" data-id="${it.id}" aria-label="Remove ${esc(it.name)}">×</button>
      </li>`).join('');
    return `
      <section class="card meal">
        <div class="meal-head">
          <h2>${m.label}</h2>
          <div class="chips">${chips}</div>
        </div>
        ${rows ? `<ul class="items">${rows}</ul>` : '<p class="empty">Nothing logged yet.</p>'}
        <button class="add-btn" data-action="open-sheet" data-meal="${m.key}">+ Add food</button>
      </section>`;
  }).join('');

  const waterPct = Math.min(100, (day.water / s.waterGoalOz) * 100);

  return `
    <div class="date-nav">
      <button class="icon-btn" data-action="prev-day" aria-label="Previous day">‹</button>
      <div class="date-label">${prettyDate(state.date)}<small>${state.date}</small></div>
      <button class="icon-btn" data-action="next-day" aria-label="Next day" ${state.date >= todayKey() ? 'disabled' : ''}>›</button>
    </div>

    <section class="card">
      <div class="summary">${summary}</div>
      <div class="kcal-line">~${totals.kcal ? Math.round(totals.kcal) : 0} of ${s.kcalGoal} kcal (estimate)</div>
    </section>

    <section class="card daily">
      <label class="toggle">
        <input type="checkbox" data-action="toggle" data-field="trained" ${day.trained ? 'checked' : ''}>
        <span><strong>Trained 60+ min today</strong><small>Check TrainingPeaks · adds +1 carb at ${esc(MEALS.find((m) => m.key === s.trainingBonusMeal).label.toLowerCase())}</small></span>
      </label>
      <label class="toggle">
        <input type="checkbox" data-action="toggle" data-field="vitD" ${day.vitD ? 'checked' : ''}>
        <span><strong>Vitamin D3</strong><small>2000 IU daily</small></span>
      </label>
      <label class="toggle">
        <input type="checkbox" data-action="toggle" data-field="creatine" ${day.creatine ? 'checked' : ''}>
        <span><strong>Creatine</strong><small>5 g after training</small></span>
      </label>
      <div class="water">
        <div class="water-top"><strong>Water</strong><span>${day.water} / ${s.waterGoalOz} oz</span></div>
        <div class="bar"><div class="bar-fill g-water" style="width:${waterPct}%"></div></div>
        <div class="water-btns">
          <button data-action="water" data-oz="-8">−8 oz</button>
          <button data-action="water" data-oz="8">+8 oz</button>
          <button data-action="water" data-oz="16">+16 oz</button>
        </div>
      </div>
    </section>

    ${meals}`;
}

function renderHistory() {
  const keys = [];
  for (let i = 0; i < 14; i++) keys.push(shiftDate(todayKey(), -i));
  const logged = keys.filter((k) => state.data.logs[k]?.items.length);

  if (!logged.length) return '<section class="card"><h2>History</h2><p class="empty">Log a few days and your trends will show up here.</p></section>';

  const avg = { carb: 0, protein: 0, fat: 0, veg: 0, kcal: 0, water: 0 };
  const rows = logged.map((k) => {
    const day = state.data.logs[k];
    const t = sum(day.items);
    const tg = dayTargets(day);
    for (const g of GROUPS) avg[g.key] += t[g.key] / logged.length;
    avg.kcal += t.kcal / logged.length;
    avg.water += day.water / logged.length;
    const cells = GROUPS.map((g) => `<td class="${status(t[g.key], tg[g.key])}">${fmt(t[g.key])}<small>/${fmt(tg[g.key])}</small></td>`).join('');
    return `<tr data-action="goto-day" data-date="${k}"><th>${prettyDate(k)}</th>${cells}<td>${Math.round(t.kcal)}</td><td>${day.water}</td></tr>`;
  }).join('');

  const avgCells = GROUPS.map((g) => `<div class="avg"><span>${g.label}</span><strong>${fmt(roundHalf(avg[g.key]))}</strong></div>`).join('');

  return `
    <section class="card">
      <h2>Last ${logged.length} logged day${logged.length > 1 ? 's' : ''} · daily average</h2>
      <div class="avgs">${avgCells}
        <div class="avg"><span>kcal</span><strong>${Math.round(avg.kcal)}</strong></div>
        <div class="avg"><span>Water</span><strong>${Math.round(avg.water)} oz</strong></div>
      </div>
    </section>
    <section class="card">
      <h2>Day by day</h2>
      <div class="table-wrap">
        <table class="history">
          <thead><tr><th></th>${GROUPS.map((g) => `<th>${g.short}</th>`).join('')}<th>kcal</th><th>oz</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="hint">Tap a day to open it. Green = on target, amber = under, red = over.</p>
    </section>`;
}

function renderSettings() {
  const s = state.data.settings;
  const grid = MEALS.map((m) => `
    <tr><th>${m.label}</th>${GROUPS.map((g) => `
      <td><input type="number" inputmode="decimal" step="0.5" min="0" value="${s.meals[m.key][g.key]}"
        data-change="target" data-meal="${m.key}" data-group="${g.key}" aria-label="${m.label} ${g.label}"></td>`).join('')}
    </tr>`).join('');

  const custom = state.data.customFoods.map((f) => `
    <li class="item">
      <div class="item-main"><div class="item-name">${esc(f.name)}</div><div class="item-sub">${esc(f.unit)} · ${exchangeText(f)}</div></div>
      <button class="icon-btn" data-action="delete-food" data-id="${f.id}" aria-label="Delete ${esc(f.name)}">×</button>
    </li>`).join('');

  return `
    <section class="card">
      <h2>Servings per meal</h2>
      <div class="table-wrap">
        <table class="targets">
          <thead><tr><th></th>${GROUPS.map((g) => `<th>${g.label}</th>`).join('')}</tr></thead>
          <tbody>${grid}</tbody>
        </table>
      </div>
      <div class="field-row">
        <label>Training day +1 carb goes to
          <select data-change="setting" data-field="trainingBonusMeal">
            ${MEALS.map((m) => `<option value="${m.key}" ${m.key === s.trainingBonusMeal ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </label>
        <label>Water goal (oz)
          <input type="number" inputmode="numeric" min="0" step="1" value="${s.waterGoalOz}" data-change="setting" data-field="waterGoalOz">
        </label>
        <label>Calorie goal
          <input type="number" inputmode="numeric" min="0" step="1" value="${s.kcalGoal}" data-change="setting" data-field="kcalGoal">
        </label>
      </div>
      <p class="hint">Label math: 15 g carbs = 1 carb · 7 g protein = 1 protein · 5 g fat = 1 fat.</p>
    </section>

    <section class="card">
      <h2>My foods</h2>
      ${custom ? `<ul class="items">${custom}</ul>` : '<p class="empty">Foods you save from a label show up here.</p>'}
    </section>

    <section class="card">
      <h2>Backup</h2>
      <p class="hint">Your log lives only on this device. Export a backup to move it to another phone or browser.</p>
      <div class="btn-row">
        <button data-action="export">Export backup</button>
        <label class="btn">Import backup<input type="file" accept="application/json" data-change="import" hidden></label>
        <button class="danger" data-action="reset">Erase all data</button>
      </div>
    </section>`;
}

// ---------- add-food sheet ----------

const $sheet = document.getElementById('sheet');

function openSheet(meal) {
  state.sheet = { meal, tab: 'library', query: '', selected: null, qty: 1 };
  renderSheet();
  $sheet.showModal();
  $sheet.querySelector('input[type=search]')?.focus();
}

function closeSheet() {
  state.sheet = null;
  if ($sheet.open) $sheet.close();
}

function renderSheet() {
  const sh = state.sheet;
  if (!sh) return;
  const mealLabel = MEALS.find((m) => m.key === sh.meal).label;
  const tabs = [['library', 'Foods'], ['label', 'From label'], ['servings', 'Servings']]
    .map(([k, l]) => `<button class="seg ${sh.tab === k ? 'active' : ''}" data-action="sheet-tab" data-tab="${k}">${l}</button>`)
    .join('');

  let body = '';
  if (sh.tab === 'library') body = sheetLibrary(sh);
  else if (sh.tab === 'label') body = sheetLabel();
  else body = sheetServings();

  $sheet.innerHTML = `
    <div class="sheet-head">
      <h2>Add to ${mealLabel}</h2>
      <button class="icon-btn" data-action="close-sheet" aria-label="Close">×</button>
    </div>
    <div class="segs">${tabs}</div>
    <div class="sheet-body">${body}</div>`;
}

function sheetLibrary(sh) {
  if (sh.selected) {
    const f = allFoods().find((x) => x.id === sh.selected);
    const ex = scaleFood(f, sh.qty);
    return `
      <button class="link" data-action="unselect">‹ Back to foods</button>
      <div class="picked">
        <div class="item-name">${esc(f.name)}</div>
        <div class="item-sub">per ${esc(f.unit)}: ${exchangeText(f)}</div>
        <div class="stepper">
          <button data-action="qty" data-delta="-0.5" aria-label="Less">−</button>
          <div class="qty">${fmt(sh.qty)}<small>× ${esc(f.unit)}</small></div>
          <button data-action="qty" data-delta="0.5" aria-label="More">+</button>
        </div>
        <div class="preview">${exchangeText(ex)} · ~${Math.round(ex.kcal)} kcal</div>
        <button class="primary" data-action="add-selected">Add</button>
      </div>`;
  }

  const q = sh.query.trim().toLowerCase();
  const foods = allFoods();
  let list;
  if (q) {
    list = foods.filter((f) => f.name.toLowerCase().includes(q) || (f.cat || '').toLowerCase().includes(q));
  } else {
    const recent = recentFoodIds().map((id) => foods.find((f) => f.id === id)).filter(Boolean);
    list = [...recent, ...foods.filter((f) => !recent.includes(f))];
  }
  const rows = list.map((f) => `
    <li><button class="food-row" data-action="select-food" data-id="${f.id}">
      <span><span class="item-name">${esc(f.name)}</span><span class="item-sub">${esc(f.unit)}</span></span>
      <span class="ex">${exchangeText(f)}</span>
    </button></li>`).join('');

  return `
    <input type="search" placeholder="Search foods…" value="${esc(sh.query)}" data-change="query" autocomplete="off">
    <ul class="food-list">${rows || '<li class="empty">No match — try the “From label” tab.</li>'}</ul>`;
}

function sheetLabel() {
  return `
    <form data-form="label" class="form">
      <label>Food name<input name="name" required placeholder="e.g. Kodiak waffles"></label>
      <p class="hint">Numbers per serving, straight from the nutrition label.</p>
      <div class="grid3">
        <label>Carbs (g)<input name="carbG" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        <label>Protein (g)<input name="proteinG" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        <label>Fat (g)<input name="fatG" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
      </div>
      <div class="grid3">
        <label>Fiber (g)<input name="fiberG" type="number" inputmode="decimal" min="0" step="0.1" value="0"></label>
        <label>Calories<input name="kcal" type="number" inputmode="numeric" min="0" step="1" placeholder="optional"></label>
        <label>Servings eaten<input name="qty" type="number" inputmode="decimal" min="0.5" step="0.5" value="1"></label>
      </div>
      <label>Serving size (for your list)<input name="unit" placeholder="e.g. 2 waffles"></label>
      <label class="check"><input type="checkbox" name="saveFood" checked> Save to My foods</label>
      <div class="preview" data-preview>—</div>
      <button class="primary" type="submit">Add</button>
    </form>`;
}

function sheetServings() {
  return `
    <form data-form="servings" class="form">
      <label>What was it?<input name="name" required placeholder="e.g. Restaurant salad"></label>
      <p class="hint">Enter exchanges directly, like your plan counts them.</p>
      <div class="grid4">
        ${GROUPS.map((g) => `<label>${g.label}<input name="${g.key}" type="number" inputmode="decimal" min="0" step="0.5" value="0"></label>`).join('')}
      </div>
      <label>Calories<input name="kcal" type="number" inputmode="numeric" min="0" step="1" placeholder="optional — estimated if blank"></label>
      <button class="primary" type="submit">Add</button>
    </form>`;
}

// Exchanges from label grams. Fiber is subtracted from carbs (net carbs).
function labelToExchanges(v) {
  return {
    carb: roundHalf(Math.max(0, v.carbG - v.fiberG) / 15),
    protein: roundHalf(v.proteinG / 7),
    fat: roundHalf(v.fatG / 5),
    veg: 0,
  };
}

function scaleFood(f, qty) {
  const ex = {};
  for (const g of GROUPS) ex[g.key] = (f[g.key] || 0) * qty;
  ex.kcal = (f.kcal ?? estimateKcal(f)) * qty;
  return ex;
}

function addItem(item) {
  const day = ensureDay(state.date);
  day.items.push({ id: uid(), meal: state.sheet.meal, ...item });
  save();
  closeSheet();
  render();
  toast(`Added ${item.name}`);
}

function readNums(form, names) {
  const out = {};
  for (const n of names) out[n] = Math.max(0, parseFloat(form.elements[n].value) || 0);
  return out;
}

// ---------- events ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const day = () => ensureDay(state.date);

  switch (a) {
    case 'nav':
      state.view = el.dataset.view;
      if (state.view === 'today') state.date = state.date || todayKey();
      render();
      window.scrollTo(0, 0);
      break;
    case 'prev-day': state.date = shiftDate(state.date, -1); render(); break;
    case 'next-day': if (state.date < todayKey()) { state.date = shiftDate(state.date, 1); render(); } break;
    case 'goto-day': state.date = el.dataset.date; state.view = 'today'; render(); window.scrollTo(0, 0); break;
    case 'water': {
      const d = day();
      d.water = Math.max(0, d.water + Number(el.dataset.oz));
      save(); render();
      break;
    }
    case 'remove-item': {
      const d = day();
      d.items = d.items.filter((it) => it.id !== el.dataset.id);
      save(); render();
      break;
    }
    case 'open-sheet': openSheet(el.dataset.meal); break;
    case 'close-sheet': closeSheet(); break;
    case 'sheet-tab': state.sheet.tab = el.dataset.tab; state.sheet.selected = null; renderSheet(); break;
    case 'select-food': state.sheet.selected = el.dataset.id; state.sheet.qty = 1; renderSheet(); break;
    case 'unselect': state.sheet.selected = null; renderSheet(); break;
    case 'qty': state.sheet.qty = Math.max(0.5, state.sheet.qty + Number(el.dataset.delta)); renderSheet(); break;
    case 'add-selected': {
      const f = allFoods().find((x) => x.id === state.sheet.selected);
      addItem({ foodId: f.id, name: f.name, unit: f.unit, qty: state.sheet.qty, ...scaleFood(f, state.sheet.qty) });
      break;
    }
    case 'delete-food':
      state.data.customFoods = state.data.customFoods.filter((f) => f.id !== el.dataset.id);
      save(); render();
      break;
    case 'export': exportData(); break;
    case 'reset':
      if (confirm('Erase every logged day, custom food and setting on this device?')) {
        state.data = normalize({});
        save(); render(); toast('All data erased');
      }
      break;
  }
});

// Close the sheet when tapping the dimmed backdrop.
$sheet.addEventListener('click', (e) => { if (e.target === $sheet) closeSheet(); });
$sheet.addEventListener('close', () => { state.sheet = null; });

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.action === 'toggle') {
    ensureDay(state.date)[el.dataset.field] = el.checked;
    save(); render();
    return;
  }
  const c = el.dataset.change;
  if (c === 'target') {
    state.data.settings.meals[el.dataset.meal][el.dataset.group] = Math.max(0, parseFloat(el.value) || 0);
    save();
  } else if (c === 'setting') {
    const f = el.dataset.field;
    state.data.settings[f] = f === 'trainingBonusMeal' ? el.value : Math.max(0, parseFloat(el.value) || 0);
    save();
  } else if (c === 'import' && el.files[0]) {
    importData(el.files[0]);
  }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.change === 'query') {
    state.sheet.query = el.value;
    const pos = el.selectionStart;
    renderSheet();
    const input = $sheet.querySelector('input[type=search]');
    input.focus();
    input.setSelectionRange(pos, pos);
  }
  const form = el.closest('form[data-form="label"]');
  if (form) {
    const v = readNums(form, ['carbG', 'proteinG', 'fatG', 'fiberG', 'qty']);
    const ex = labelToExchanges(v);
    const scaled = {};
    for (const g of GROUPS) scaled[g.key] = ex[g.key] * v.qty;
    form.querySelector('[data-preview]').textContent = `Counts as ${exchangeText(scaled)}`;
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const name = form.elements.name.value.trim();
  if (!name) return;
  const kcalRaw = parseFloat(form.elements.kcal.value);

  if (form.dataset.form === 'label') {
    const v = readNums(form, ['carbG', 'proteinG', 'fatG', 'fiberG', 'qty']);
    const qty = v.qty || 1;
    const per = labelToExchanges(v);
    const unit = form.elements.unit.value.trim() || '1 serving';
    const food = { id: 'custom-' + uid(), name, unit, cat: 'My foods', ...per };
    if (!Number.isNaN(kcalRaw)) food.kcal = kcalRaw;
    if (form.elements.saveFood.checked) state.data.customFoods.unshift(food);
    addItem({ foodId: food.id, name, unit, qty, ...scaleFood(food, qty) });
  } else {
    const ex = readNums(form, GROUPS.map((g) => g.key));
    addItem({ name, qty: 1, ...ex, kcal: Number.isNaN(kcalRaw) ? estimateKcal(ex) : kcalRaw });
  }
});

// ---------- backup ----------

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutrition-backup-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object' || !parsed.logs) throw new Error('bad file');
      if (!confirm('Replace the data on this device with this backup?')) return;
      state.data = normalize(parsed);
      save(); render(); toast('Backup imported');
    } catch {
      toast('That file doesn’t look like a tracker backup.');
    }
  };
  reader.readAsText(file);
}

// ---------- misc ----------

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Roll over to the new day if the app was left open overnight on "Today".
let lastToday = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = todayKey();
  if (now !== lastToday && state.date === lastToday && !state.sheet) {
    state.date = now;
    render();
  }
  lastToday = now;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
