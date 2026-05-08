/* =============================================
   ShodanIntel Dashboard JS
   ============================================= */

// ── State ──────────────────────────────────────
const state = {
  apiKey: localStorage.getItem('shodanKey') || '',
  results: [],
  metrics: { total: 0, critical: 0, high: 0, rdp: 0, ssh: 0, db: 0 },
  queries: 0,
  workers: Array(8).fill(null).map((_, i) => ({ id: i, status: 'idle', task: '', time: 0 }))
};

// Risk scoring by port
const PORT_RISK = {
  23: 'critical', 445: 'critical', 3389: 'critical', 5900: 'critical', 4444: 'critical',
  22: 'high', 3306: 'high', 5432: 'high', 27017: 'high', 6379: 'high',
  9200: 'high', 11211: 'high', 1433: 'high', 2375: 'critical',
  80: 'low', 443: 'low', 8080: 'medium', 8443: 'medium',
  21: 'medium', 25: 'medium', 53: 'low', 123: 'low'
};

function scoreHost(ports) {
  if (!ports || !ports.length) return 'low';
  for (const p of ports) {
    if (PORT_RISK[p] === 'critical') return 'critical';
  }
  for (const p of ports) {
    if (PORT_RISK[p] === 'high') return 'high';
  }
  for (const p of ports) {
    if (PORT_RISK[p] === 'medium') return 'medium';
  }
  return 'low';
}

// ── Clock ───────────────────────────────────────
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
  const el = document.getElementById('clock');
  if (el) el.textContent = t + ' ET';
}
setInterval(updateClock, 1000);
updateClock();

// ── API Key ─────────────────────────────────────
if (state.apiKey) {
  const inp = document.getElementById('apiKeyInput');
  if (inp) inp.value = state.apiKey;
  const st = document.getElementById('apiStatus');
  if (st) { st.textContent = '✓ Connected'; st.style.color = 'var(--green)'; }
}

function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) return;
  state.apiKey = val;
  localStorage.setItem('shodanKey', val);
  const st = document.getElementById('apiStatus');
  st.textContent = '✓ API key saved — ready for live queries';
  st.style.color = 'var(--green)';
}

// ── Charts ──────────────────────────────────────
let donutChart, timelineChart;

function initCharts() {
  // Donut
  const dCtx = document.getElementById('donutChart');
  if (!dCtx) return;
  donutChart = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: ['#ff3d3d', '#ffb800', '#4da6ff', '#2a4a35'],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#00ff88'
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: '#0f1316',
        borderColor: 'rgba(0,255,136,0.2)',
        borderWidth: 1,
        titleColor: '#00ff88',
        bodyColor: '#7a9980',
        titleFont: { family: "'Share Tech Mono'" },
        bodyFont: { family: "'Share Tech Mono'", size: 11 }
      }},
      animation: { animateRotate: true, duration: 800 }
    }
  });

  // Timeline - simulated 14-day data
  const labels = [];
  const crit = [], high = [], med = [], low_ = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }));
    const base = 800 + Math.random() * 400;
    crit.push(Math.round(base * 0.015 + Math.random() * 20));
    high.push(Math.round(base * 0.08 + Math.random() * 40));
    med.push(Math.round(base * 0.2 + Math.random() * 80));
    low_.push(Math.round(base * 0.7 + Math.random() * 200));
  }

  const tCtx = document.getElementById('timelineChart');
  if (!tCtx) return;
  timelineChart = new Chart(tCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Critical', data: crit, backgroundColor: '#ff3d3d', stack: 's' },
        { label: 'High', data: high, backgroundColor: '#ffb800', stack: 's' },
        { label: 'Medium', data: med, backgroundColor: '#4da6ff', stack: 's' },
        { label: 'Low', data: low_, backgroundColor: '#1a3d28', stack: 's' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#4a6650', font: { family: "'Share Tech Mono'", size: 9 } },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#4a6650', font: { family: "'Share Tech Mono'", size: 9 } },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f1316',
          borderColor: 'rgba(0,255,136,0.2)',
          borderWidth: 1,
          titleColor: '#00ff88',
          bodyColor: '#7a9980',
          titleFont: { family: "'Share Tech Mono'" },
          bodyFont: { family: "'Share Tech Mono'", size: 11 }
        }
      }
    }
  });
}

function updateDonut(c, h, m, l) {
  if (!donutChart) return;
  const total = c + h + m + l;
  donutChart.data.datasets[0].data = [c, h, m, l];
  donutChart.update();
  document.getElementById('donutTotal').textContent = total;
  document.getElementById('l-critical').textContent = c;
  document.getElementById('l-high').textContent = h;
  document.getElementById('l-med').textContent = m;
  document.getElementById('l-low').textContent = l;
}

// ── Worker Grid ─────────────────────────────────
function renderWorkers() {
  const grid = document.getElementById('workerGrid');
  if (!grid) return;
  grid.innerHTML = state.workers.map(w => `
    <div class="worker-card ${w.status !== 'idle' ? 'active' : ''}">
      <div class="worker-dot ${w.status === 'busy' ? 'busy' : w.status === 'done' ? 'active' : ''}"></div>
      <div class="worker-id">W${w.id}</div>
      <div class="worker-task">${w.task || '—'}</div>
      <span class="worker-badge ${w.status === 'busy' ? 'badge-analyze' : w.status === 'done' ? 'badge-done' : w.status === 'error' ? 'badge-error' : 'badge-idle'}">
        ${w.status.toUpperCase()}
      </span>
      ${w.time ? `<span class="worker-time">${w.time}s</span>` : ''}
    </div>
  `).join('');

  const active = state.workers.filter(w => w.status === 'busy').length;
  const el = document.getElementById('activeWorkers');
  if (el) el.textContent = `${active}/8 ACTIVE`;
  const bar = document.getElementById('workerBar');
  if (bar) bar.style.width = (active / 8 * 100) + '%';
}

// ── Shodan API Calls ─────────────────────────────
async function shodanFetch(endpoint, params = {}) {
  if (!state.apiKey) throw new Error('No API key');
  const url = new URL(`https://api.shodan.io${endpoint}`);
  url.searchParams.set('key', state.apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Shodan ${res.status}`);
  return res.json();
}

function updateMetrics(data, source) {
  if (!data || !data.matches) return;
  const hosts = data.matches;
  state.results.push(...hosts);
  state.metrics.total += hosts.length;

  let c = 0, h = 0, m = 0, l = 0;
  for (const host of hosts) {
    const risk = scoreHost(host.port ? [host.port] : host.ports || []);
    if (risk === 'critical') { c++; state.metrics.critical++; }
    else if (risk === 'high') { h++; state.metrics.high++; }
    else if (risk === 'medium') m++;
    else l++;
  }

  document.getElementById('m-total').textContent = state.metrics.total.toLocaleString();
  document.getElementById('m-critical').textContent = state.metrics.critical.toLocaleString();
  document.getElementById('m-high').textContent = state.metrics.high.toLocaleString();
  document.getElementById('m-queries').textContent = ++state.queries;

  updateDonut(state.metrics.critical, state.metrics.high, m + (state.metrics.high * 0.5 | 0), l);
  renderResultsTable();
}

function renderResultsTable() {
  const tbody = document.getElementById('resultsBody');
  const countEl = document.getElementById('resultCount');
  if (!tbody) return;

  const recent = state.results.slice(-50).reverse();
  if (countEl) countEl.textContent = `${state.results.length} results`;

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No results yet</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(h => {
    const ports = h.port ? [h.port] : (h.ports || []);
    const risk = scoreHost(ports);
    const portStr = ports.slice(0, 5).join(', ') + (ports.length > 5 ? '…' : '');
    const ts = h.timestamp ? new Date(h.timestamp).toLocaleDateString() : '—';
    return `<tr>
      <td style="color:var(--green)">${h.ip_str || '—'}</td>
      <td style="color:var(--text-secondary);max-width:140px;overflow:hidden;text-overflow:ellipsis">${h.org || '—'}</td>
      <td>${h.location?.country_code || '—'}</td>
      <td style="font-size:10px">${portStr || '—'}</td>
      <td><span class="risk-tag risk-${risk}">${risk.toUpperCase()}</span></td>
      <td style="color:var(--text-dim)">${ts}</td>
    </tr>`;
  }).join('');
}

// ── Live Scan ───────────────────────────────────
const SCAN_QUERIES = [
  { q: 'port:3389', label: 'RDP scan', metricId: 'm-rdp' },
  { q: 'port:22', label: 'SSH scan', metricId: 'm-ssh' },
  { q: 'port:27017 OR port:6379 OR port:9200', label: 'DB exposure', metricId: 'm-db' }
];

async function runLiveScan() {
  if (!state.apiKey) {
    alert('Please enter your Shodan API key first.');
    return;
  }

  const btn = document.querySelector('.btn-trigger');
  if (btn) btn.disabled = true;

  document.getElementById('lastScan').textContent = new Date().toLocaleTimeString();
  document.getElementById('nextScan').textContent = 'running...';

  state.results = [];
  state.metrics = { total: 0, critical: 0, high: 0, rdp: 0, ssh: 0, db: 0 };

  // Spin up workers
  for (let i = 0; i < SCAN_QUERIES.length; i++) {
    state.workers[i] = { id: i, status: 'busy', task: SCAN_QUERIES[i].label, time: 0 };
  }
  renderWorkers();

  const timers = {};
  for (let i = 0; i < SCAN_QUERIES.length; i++) {
    const start = Date.now();
    timers[i] = setInterval(() => {
      state.workers[i].time = Math.round((Date.now() - start) / 1000);
      renderWorkers();
    }, 1000);
  }

  await Promise.all(SCAN_QUERIES.map(async ({ q, label, metricId }, i) => {
    try {
      const data = await shodanFetch('/shodan/host/search', { query: q, minify: true });
      clearInterval(timers[i]);
      state.workers[i].status = 'done';
      state.workers[i].task = label;
      if (metricId && data.total !== undefined) {
        document.getElementById(metricId).textContent = data.total.toLocaleString();
      }
      updateMetrics(data, label);
    } catch (e) {
      clearInterval(timers[i]);
      state.workers[i].status = 'error';
      state.workers[i].task = `${label}: ${e.message}`;
    }
    renderWorkers();
  }));

  document.getElementById('nextScan').textContent = 'manual';
  if (btn) btn.disabled = false;
}

// ── Demo data for display without key ───────────
function loadDemoData() {
  const demoHosts = [
    { ip_str: '185.220.101.45', org: 'Tor Project', location: { country_code: 'DE' }, port: 443, timestamp: new Date().toISOString() },
    { ip_str: '192.241.145.11', org: 'DigitalOcean', location: { country_code: 'US' }, port: 3389, timestamp: new Date().toISOString() },
    { ip_str: '45.33.32.156', org: 'Linode', location: { country_code: 'US' }, port: 22, timestamp: new Date().toISOString() },
    { ip_str: '198.199.10.234', org: 'DigitalOcean', location: { country_code: 'US' }, port: 27017, timestamp: new Date().toISOString() },
    { ip_str: '37.59.99.230', org: 'OVH', location: { country_code: 'FR' }, port: 6379, timestamp: new Date().toISOString() },
    { ip_str: '104.21.32.18', org: 'Cloudflare', location: { country_code: 'US' }, port: 80, timestamp: new Date().toISOString() },
    { ip_str: '91.121.56.78', org: 'OVH', location: { country_code: 'FR' }, port: 23, timestamp: new Date().toISOString() },
    { ip_str: '167.99.158.254', org: 'DigitalOcean', location: { country_code: 'NL' }, port: 9200, timestamp: new Date().toISOString() },
  ];
  state.results = demoHosts;
  let c = 0, h = 0, m = 0, l = 0;
  for (const h of demoHosts) {
    const r = scoreHost([h.port]);
    if (r === 'critical') c++;
    else if (r === 'high') h++;
    else if (r === 'medium') m++;
    else l++;
  }
  document.getElementById('m-total').textContent = '3,906';
  document.getElementById('m-critical').textContent = '11';
  document.getElementById('m-high').textContent = '135';
  document.getElementById('m-rdp').textContent = '42,891';
  document.getElementById('m-ssh').textContent = '2.1M';
  document.getElementById('m-db').textContent = '18,432';
  updateDonut(11, 135, 412, 3348);
  renderResultsTable();
}

// ── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  renderWorkers();
  loadDemoData();
});
