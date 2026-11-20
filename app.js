const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'hishab.v1';
const CATS = {
  expense: ['Food', 'Transport', 'Bills', 'Shopping', 'Education', 'Health', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Gift', 'Other']
};
const ACCTS = ['Cash', 'bKash', 'Nagad', 'Bank'];
const PAL = ['#6c5ce7', '#a89cf2', '#16141f', '#c9c2f7', '#8b7cf0', '#4a4660', '#ddd8fa', '#5445d4'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function def() { return { name: 'Jahid', opening: 0, tx: [] }; }
function load() { try { return Object.assign(def(), JSON.parse(localStorage.getItem(KEY))); } catch { return def(); } }
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

let S = load(), type = 'expense', ai = 0, q = '', charts = {};

/* ---------- helpers ---------- */
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = () => iso(new Date());
const tk = n => (n < 0 ? '-' : '') + '৳' + Math.round(Math.abs(n)).toLocaleString('en-IN');
const sum = (l, t) => l.filter(x => x.type === t).reduce((a, x) => a + x.amount, 0);
const ymOf = (off = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return iso(d).slice(0, 7); };
const inM = ym => S.tx.filter(x => x.date.startsWith(ym));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const match = x => !q || (x.note + x.cat + x.acct).toLowerCase().includes(q);
const sorted = () => [...S.tx].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
const pct = (a, b) => b ? (a - b) / Math.abs(b) * 100 : (a ? 100 : 0);
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- render ---------- */
function renderHeader() {
  $('#uname').textContent = S.name;
  $('#avatar').textContent = (S.name[0] || '?').toUpperCase();
}

function renderStats() {
  const cur = inM(ymOf()), prv = inM(ymOf(-1));
  const ci = sum(cur, 'income'), ce = sum(cur, 'expense'), pi = sum(prv, 'income'), pe = sum(prv, 'expense');
  const bal = S.opening + sum(S.tx, 'income') - sum(S.tx, 'expense');
  const badge = (v, goodUp) => { const up = v >= 0; return `<span class="bd ${up === goodUp ? 'ok' : 'bad'}">${up ? '+' : ''}${v.toFixed(1)}%</span>`; };
  const items = [
    ['Total Balance', bal, 'Available funds', '<span class="bd">All time</span>', '৳'],
    ['Net Profit', ci - ce, 'This month', badge(pct(ci - ce, pi - pe), true), '↗'],
    ['Monthly Income', ci, 'This month', badge(pct(ci, pi), true), '↓'],
    ['Monthly Expenses', ce, 'This month', badge(pct(ce, pe), false), '↑']
  ];
  $('#stats').innerHTML = items.map(([l, v, s, b, ic]) =>
    `<div class="card stat"><div class="sh">${l}</div><div class="sb"><i class="ic">${ic}</i><div><b>${tk(v)}</b><small>${s}</small></div>${b}</div></div>`).join('');
}

function acctBal(a) {
  const l = S.tx.filter(x => x.acct === a);
  return (a === 'Cash' ? S.opening : 0) + sum(l, 'income') - sum(l, 'expense');
}

function renderWallet() {
  const a = ACCTS[ai], spent = sum(inM(ymOf()).filter(x => x.acct === a), 'expense');
  $('#wallet').innerHTML = `<div class="wcard">
    <svg class="wave" viewBox="0 0 300 160" preserveAspectRatio="none"><path d="M0 100C60 40 110 150 170 90S260 30 300 70V160H0Z" fill="#fff" opacity=".14"/><path d="M0 130C70 80 120 160 190 120S270 80 300 110V160H0Z" fill="#fff" opacity=".12"/></svg>
    <div class="wtop"><b>${a}</b><span>${ai + 1} / ${ACCTS.length}</span></div>
    <div class="wbal"><small>Balance</small><strong>${tk(acctBal(a))}</strong></div>
    <div class="wbot"><span>${esc(S.name)}</span><span>Spent this month ${tk(spent)}</span></div></div>`;
}

function renderLine() {
  const sel = $('#year');
  const ys = [...new Set(S.tx.map(x => +x.date.slice(0, 4)).concat(new Date().getFullYear()))].sort((a, b) => b - a);
  const cur = sel.value || ys[0];
  sel.innerHTML = ys.map(y => `<option ${y == cur ? 'selected' : ''}>${y}</option>`).join('');
  const y = sel.value;
  const m = t => MON.map((_, i) => sum(S.tx.filter(x => x.date.startsWith(y + '-' + String(i + 1).padStart(2, '0'))), t));
  const ds = (l, t, c, f) => ({ label: l, data: m(t), borderColor: c, backgroundColor: f, pointBackgroundColor: c, pointRadius: 4, tension: .4, fill: true, borderWidth: 2 });
  const data = { labels: MON, datasets: [ds('Income', 'income', '#16141f', '#16141f10'), ds('Expense', 'expense', '#6c5ce7', '#6c5ce720')] };
  if (charts.line) { charts.line.data = data; charts.line.update(); return; }
  charts.line = new Chart($('#line'), {
    type: 'line', data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${tk(c.parsed.y)}` } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#eceaf6' }, border: { display: false }, ticks: { callback: v => '৳' + (v >= 1000 ? v / 1000 + 'k' : v) } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderDonut() {
  const l = inM(ymOf()).filter(x => x.type === 'expense'), by = {};
  l.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
  const e = Object.entries(by).sort((a, b) => b[1] - a[1]), tot = l.reduce((a, x) => a + x.amount, 0);
  $('#dtotal').textContent = tk(tot);
  $('#legend').innerHTML = e.length
    ? e.map(([k, v], i) => `<li><i style="background:${PAL[i % 8]}"></i>${k}<b>${tk(v)}</b></li>`).join('')
    : '<li class="empty">No expenses this month</li>';
  const data = { labels: e.map(x => x[0]), datasets: [{ data: e.length ? e.map(x => x[1]) : [1], backgroundColor: e.length ? e.map((_, i) => PAL[i % 8]) : ['#eceaf6'], borderWidth: 0 }] };
  if (charts.donut) { charts.donut.data = data; charts.donut.options.plugins.tooltip.enabled = !!e.length; charts.donut.update(); return; }
  charts.donut = new Chart($('#donut'), {
    type: 'doughnut', data,
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: !!e.length, callbacks: { label: c => ` ${c.label}: ${tk(c.parsed)}` } } }
    }
  });
}

function renderRecent() {
  const l = sorted().filter(match).slice(0, 6);
  $('#recent').innerHTML = l.length ? l.map(x =>
    `<li><i class="dot">${esc(x.cat[0])}</i><div class="rt"><b>${esc(x.note || x.cat)}</b><small>${x.date} • ${x.acct}</small></div><span class="amt ${x.type}">${x.type === 'income' ? '+' : '-'}${tk(x.amount)}</span></li>`).join('')
    : '<li class="empty">Nothing here yet. Add your first transaction below.</li>';
}

function renderInsights() {
  const cur = inM(ymOf()), prv = inM(ymOf(-1));
  const ci = sum(cur, 'income'), ce = sum(cur, 'expense'), pe = sum(prv, 'expense'), out = [];
  if (ce) {
    const by = {}; cur.filter(x => x.type === 'expense').forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
    const [k, v] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    out.push(`<b>${k}</b> is your biggest expense this month: ${tk(v)} (${Math.round(v / ce * 100)}% of spending).`);
    if (pe) { const d = pct(ce, pe); out.push(`Spending is <b>${Math.abs(d).toFixed(0)}% ${d >= 0 ? 'higher' : 'lower'}</b> than last month.`); }
    out.push(`You spend about <b>${tk(ce / new Date().getDate())}</b> per day on average.`);
  }
  if (ci) out.push(`You've kept <b>${Math.max(0, Math.round((ci - ce) / ci * 100))}%</b> of this month's income.`);
  $('#insights').innerHTML = out.length ? out.map(t => `<li>${t}</li>`).join('') : '<li class="empty">Add transactions to see insights.</li>';
}

function renderTable() {
  const mf = $('#fmonth').value, tf = $('#ftype').value;
  const l = sorted().filter(x => match(x) && (!mf || x.date.startsWith(mf)) && (!tf || x.type === tf));
  $('#tcount').textContent = `(${l.length})`;
  $('#tbody').innerHTML = l.length ? l.map(x =>
    `<tr><td>${x.date}</td><td>${esc(x.note || '—')}</td><td>${x.cat}</td><td>${x.acct}</td><td class="r amt ${x.type}">${x.type === 'income' ? '+' : '-'}${tk(x.amount)}</td><td><button class="del" data-id="${x.id}" aria-label="Delete transaction">✕</button></td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">No transactions found</td></tr>';
}

function render() { renderHeader(); renderStats(); renderWallet(); renderLine(); renderDonut(); renderRecent(); renderInsights(); renderTable(); }

/* ---------- form ---------- */
function fillCats() { $('#cat').innerHTML = CATS[type].map(c => `<option>${c}</option>`).join(''); }
$$('.seg button').forEach(b => b.onclick = () => {
  type = b.dataset.t; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); fillCats();
});
$('#form').onsubmit = e => {
  e.preventDefault();
  const amount = parseFloat($('#amt').value);
  if (!(amount > 0)) return toast('Enter an amount greater than 0');
  S.tx.push({ id: Date.now(), type, amount, cat: $('#cat').value, acct: $('#acct').value, date: $('#date').value, note: $('#note').value.trim() });
  save(); $('#amt').value = ''; $('#note').value = ''; render();
  toast(type === 'income' ? 'Income added' : 'Expense added');
};

/* ---------- navigation & filters ---------- */
$$('.nav').forEach(b => b.onclick = () => {
  $$('.nav').forEach(x => x.classList.toggle('on', x === b));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + b.dataset.view));
  if (b.dataset.view === 'dashboard') { charts.line.resize(); charts.donut.resize(); }
  if (b.dataset.view === 'settings') { $('#sname').value = S.name; $('#sopen').value = S.opening; }
});
$('#search').oninput = e => { q = e.target.value.trim().toLowerCase(); renderRecent(); renderTable(); };
$('#year').onchange = renderLine;
$('#fmonth').onchange = $('#ftype').onchange = renderTable;
$('#prev').onclick = () => { ai = (ai + ACCTS.length - 1) % ACCTS.length; renderWallet(); };
$('#next').onclick = () => { ai = (ai + 1) % ACCTS.length; renderWallet(); };
$('#tbody').onclick = e => {
  const b = e.target.closest('.del'); if (!b || !confirm('Delete this transaction?')) return;
  S.tx = S.tx.filter(x => x.id != b.dataset.id); save(); render(); toast('Transaction deleted');
};

/* ---------- settings ---------- */
$('#ssave').onclick = () => {
  S.name = $('#sname').value.trim() || 'Jahid'; S.opening = parseFloat($('#sopen').value) || 0;
  save(); render(); toast('Saved');
};
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = `hishab-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#import').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.tx)) throw 0;
      S = Object.assign(def(), d); save(); render(); toast('Backup imported');
    } catch { toast('That file is not a valid Hishab backup'); }
  };
  r.readAsText(f); e.target.value = '';
};
$('#sample').onclick = () => {
  if (S.tx.length && !confirm('This adds sample data to your existing transactions. Continue?')) return;
  const now = new Date(); let id = Date.now(); const tx = [];
  for (let m = 5; m >= 0; m--) {
    const p = n => iso(new Date(now.getFullYear(), now.getMonth() - m, n));
    tx.push({ id: id++, type: 'income', amount: 45000, cat: 'Salary', acct: 'Bank', date: p(1), note: 'Monthly salary' });
    tx.push({ id: id++, type: 'expense', amount: 12000, cat: 'Bills', acct: 'Bank', date: p(5), note: 'House rent' });
    if (m % 2) tx.push({ id: id++, type: 'income', amount: 8000, cat: 'Freelance', acct: 'bKash', date: p(12), note: 'Freelance project' });
    for (let k = 0; k < 12; k++) tx.push({
      id: id++, type: 'expense', amount: Math.round((150 + Math.random() * 2500) / 10) * 10,
      cat: CATS.expense[Math.floor(Math.random() * 8)], acct: ACCTS[Math.floor(Math.random() * 4)],
      date: p(1 + Math.floor(Math.random() * 27)), note: ''
    });
  }
  S.tx.push(...tx.filter(x => x.date <= today())); save(); render(); toast('Sample data loaded');
};
$('#reset').onclick = () => {
  if (!confirm('Delete ALL your data? This cannot be undone.')) return;
  S = def(); save(); render(); toast('All data deleted');
};

/* ---------- init ---------- */
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
Chart.defaults.color = '#8a8799';
$('#acct').innerHTML = ACCTS.map(a => `<option>${a}</option>`).join('');
$('#date').value = today();
fillCats();
render();
