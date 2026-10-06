const STORAGE_KEY = 'millpulse-production-v1';

const demoLines = [
  { id: 'line-01', line: 'Line 01', facility: 'North Mill', fabric: 'Cotton Poplin', batch: 'BT-24018', planned: 1800, completed: 1526, defects: 18, status: 'running', updated: '4 min ago' },
  { id: 'line-02', line: 'Line 02', facility: 'North Mill', fabric: 'Viscose Blend', batch: 'BT-24021', planned: 1600, completed: 1184, defects: 31, status: 'attention', updated: '9 min ago' },
  { id: 'line-03', line: 'Line 03', facility: 'South Mill', fabric: 'Cotton Twill', batch: 'BT-24015', planned: 2100, completed: 1762, defects: 12, status: 'running', updated: '6 min ago' },
  { id: 'line-04', line: 'Line 04', facility: 'North Mill', fabric: 'Linen Plain', batch: 'BT-24026', planned: 1400, completed: 612, defects: 7, status: 'idle', updated: '22 min ago' },
  { id: 'line-05', line: 'Line 05', facility: 'South Mill', fabric: 'Poly Cotton', batch: 'BT-24029', planned: 1750, completed: 1395, defects: 15, status: 'running', updated: '3 min ago' },
  { id: 'line-06', line: 'Line 06', facility: 'South Mill', fabric: 'Organic Cotton', batch: 'BT-24031', planned: 1900, completed: 1048, defects: 39, status: 'attention', updated: '7 min ago' },
];

const weeklyOutput = [1210, 1480, 1375, 1660, 1540, 1725, 1840];
const shiftLabels = ['M', 'E', 'N', 'M', 'E', 'N', 'Now'];
const orders = [
  { id: 'ORD-7428', customer: 'Northstar Apparel', detail: 'Organic Cotton · 8,400 units', due: 'Today, 18:00', risk: 'Line 06 quality hold' },
  { id: 'ORD-7435', customer: 'Meridian Home', detail: 'Linen Plain · 5,200 units', due: 'Tomorrow, 09:00', risk: 'Line 04 downtime' },
  { id: 'ORD-7441', customer: 'Aster Workwear', detail: 'Viscose Blend · 6,800 units', due: 'Tomorrow, 14:00', risk: 'Defect rate above target' },
];

const elements = {
  output: document.querySelector('#output-value'),
  target: document.querySelector('#target-value'),
  outputProgress: document.querySelector('#output-progress'),
  active: document.querySelector('#active-value'),
  totalLines: document.querySelector('#total-lines'),
  lineStatus: document.querySelector('#line-status-summary'),
  quality: document.querySelector('#quality-value'),
  defects: document.querySelector('#defect-value'),
  risk: document.querySelector('#risk-value'),
  weeklyTotal: document.querySelector('#weekly-total'),
  chart: document.querySelector('#bar-chart'),
  alertList: document.querySelector('#alert-list'),
  alertCount: document.querySelector('#alert-count'),
  lineTable: document.querySelector('#line-table'),
  emptyState: document.querySelector('#empty-state'),
  orderGrid: document.querySelector('#order-grid'),
  search: document.querySelector('#line-search'),
  statusFilter: document.querySelector('#status-filter'),
  plantFilter: document.querySelector('#plant-filter'),
  dialog: document.querySelector('#record-dialog'),
  form: document.querySelector('#production-form'),
  toast: document.querySelector('#toast'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
};

let lines = loadLines();
let toastTimer;

function loadLines() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : structuredClone(demoLines);
  } catch {
    return structuredClone(demoLines);
  }
}

function saveLines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function getVisibleLines() {
  const query = elements.search.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const facility = elements.plantFilter.value;
  return lines.filter((line) => {
    const matchesQuery = !query || `${line.line} ${line.fabric} ${line.batch}`.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || line.status === status;
    const matchesFacility = facility === 'all' || line.facility === facility;
    return matchesQuery && matchesStatus && matchesFacility;
  });
}

function summarize(source = lines) {
  const planned = source.reduce((sum, line) => sum + Number(line.planned), 0);
  const completed = source.reduce((sum, line) => sum + Number(line.completed), 0);
  const defects = source.reduce((sum, line) => sum + Number(line.defects), 0);
  const active = source.filter((line) => line.status === 'running').length;
  const passRate = completed ? Math.max(0, ((completed - defects) / completed) * 100) : 100;
  const atRisk = source.filter((line) => line.status === 'attention' || (line.completed / line.planned) < 0.5).length;
  return { planned, completed, defects, active, passRate, atRisk };
}

function deriveAlerts() {
  const alerts = [];
  lines.forEach((line) => {
    const quality = line.completed ? ((line.completed - line.defects) / line.completed) * 100 : 100;
    if (line.status === 'attention') {
      alerts.push({ level: 'critical', icon: '!', title: `${line.line} needs attention`, detail: `${line.fabric} · ${line.facility}` });
    } else if (line.status === 'idle') {
      alerts.push({ level: 'warning', icon: 'Ⅱ', title: `${line.line} is idle`, detail: `Last update ${line.updated}` });
    } else if (quality < 98) {
      alerts.push({ level: 'warning', icon: '◇', title: `${line.line} quality below target`, detail: `${quality.toFixed(1)}% pass rate` });
    }
  });
  return alerts.slice(0, 4);
}

function renderKpis() {
  const totals = summarize();
  const progress = totals.planned ? Math.min(100, (totals.completed / totals.planned) * 100) : 0;
  elements.output.textContent = formatNumber(totals.completed);
  elements.target.textContent = formatNumber(totals.planned);
  elements.outputProgress.style.width = `${progress}%`;
  elements.active.textContent = totals.active;
  elements.totalLines.textContent = lines.length;
  elements.quality.textContent = `${totals.passRate.toFixed(1)}%`;
  elements.defects.textContent = formatNumber(totals.defects);
  elements.risk.textContent = totals.atRisk;
  elements.lineStatus.innerHTML = lines.map((line) => `<span class="${escapeHtml(line.status)}" title="${escapeHtml(line.line)}: ${escapeHtml(line.status)}"></span>`).join('');
}

function renderChart() {
  const today = Math.round(summarize().completed / Math.max(1, lines.length));
  const chartData = [...weeklyOutput.slice(0, -1), today];
  const maxValue = Math.max(2200, ...chartData);
  const target = 1800;
  elements.weeklyTotal.textContent = formatNumber(chartData.reduce((sum, value) => sum + value, 0));
  elements.chart.innerHTML = `
    <div class="target-line" style="bottom:${25 + (target / maxValue) * 175}px" title="Target: ${target} units"></div>
    ${chartData.map((value, index) => `
      <div class="bar-column ${index === chartData.length - 1 ? 'current' : ''}" title="${shiftLabels[index]} shift: ${formatNumber(value)} units">
        <div class="chart-bar" style="height:${Math.max(4, (value / maxValue) * 175)}px"></div>
        <label>${shiftLabels[index]}</label>
      </div>
    `).join('')}`;
}

function renderAlerts() {
  const alerts = deriveAlerts();
  elements.alertCount.textContent = alerts.length;
  if (!alerts.length) {
    elements.alertList.innerHTML = '<p class="all-clear">No active alerts. All lines are within operating thresholds.</p>';
    return;
  }
  elements.alertList.innerHTML = alerts.map((alert) => `
    <article class="alert-item">
      <span class="alert-symbol ${alert.level}">${escapeHtml(alert.icon)}</span>
      <div><strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(alert.detail)}</span></div>
    </article>
  `).join('');
}

function renderTable() {
  const visible = getVisibleLines();
  elements.emptyState.hidden = visible.length > 0;
  elements.lineTable.innerHTML = visible.map((line) => {
    const progress = Math.min(100, (line.completed / line.planned) * 100);
    const quality = line.completed ? ((line.completed - line.defects) / line.completed) * 100 : 100;
    return `
      <tr>
        <td>${escapeHtml(line.line)}</td>
        <td>${escapeHtml(line.facility)}</td>
        <td class="fabric-cell">${escapeHtml(line.fabric)}<small>${escapeHtml(line.batch)}</small></td>
        <td><span class="status-pill ${escapeHtml(line.status)}">${escapeHtml(line.status)}</span></td>
        <td><div class="table-progress"><div><i style="width:${progress}%"></i></div><span>${formatNumber(line.completed)} / ${formatNumber(line.planned)}</span></div></td>
        <td class="${quality >= 98 ? 'quality-good' : 'quality-watch'}">${quality.toFixed(1)}%</td>
        <td>${escapeHtml(line.updated)}</td>
      </tr>`;
  }).join('');
}

function renderOrders() {
  elements.orderGrid.innerHTML = orders.map((order) => `
    <article class="order-card">
      <div class="order-top"><strong>${escapeHtml(order.id)}</strong><span>At risk</span></div>
      <p><strong>${escapeHtml(order.customer)}</strong><br>${escapeHtml(order.detail)}</p>
      <div class="order-meta"><span>${escapeHtml(order.due)}</span><span>${escapeHtml(order.risk)}</span></div>
    </article>
  `).join('');
}

function renderAll() {
  renderKpis();
  renderChart();
  renderAlerts();
  renderTable();
  renderOrders();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2800);
}

function validateRecord(input) {
  const record = {
    line: String(input.line || '').trim(),
    facility: String(input.facility || '').trim(),
    fabric: String(input.fabric || '').trim(),
    planned: Number(input.planned),
    completed: Number(input.completed),
    defects: Number(input.defects),
    status: String(input.status || '').trim(),
  };
  if (!record.line || !record.fabric || !['North Mill', 'South Mill'].includes(record.facility)) throw new Error('Line, facility, and fabric are required.');
  if (!Number.isFinite(record.planned) || record.planned < 1) throw new Error('Planned units must be at least 1.');
  if (!Number.isFinite(record.completed) || record.completed < 0) throw new Error('Completed units cannot be negative.');
  if (!Number.isFinite(record.defects) || record.defects < 0 || record.defects > record.completed) throw new Error('Defects must be between 0 and completed units.');
  if (!['running', 'attention', 'idle'].includes(record.status)) throw new Error('Status is not supported.');
  return record;
}

function addRecord(input) {
  const record = validateRecord(input);
  const id = `line-${Date.now()}`;
  lines.unshift({ ...record, id, batch: `BT-${String(Date.now()).slice(-5)}`, updated: 'Just now' });
  saveLines();
  renderAll();
  return { id, line: record.line, status: record.status };
}

function exportCsv() {
  const headings = ['line', 'facility', 'fabric', 'batch', 'planned', 'completed', 'defects', 'status', 'updated'];
  const csv = [headings.join(','), ...lines.map((line) => headings.map((heading) => `"${String(line[heading]).replaceAll('"', '""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'millpulse-production.csv';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Production data exported as CSV.');
}

elements.search.addEventListener('input', renderTable);
elements.statusFilter.addEventListener('change', renderTable);
elements.plantFilter.addEventListener('change', renderTable);
document.querySelector('#export-button').addEventListener('click', exportCsv);
document.querySelector('#record-button').addEventListener('click', () => elements.dialog.showModal());
document.querySelector('#close-dialog').addEventListener('click', () => elements.dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const record = Object.fromEntries(new FormData(elements.form));
    const result = addRecord(record);
    elements.form.reset();
    elements.dialog.close();
    showToast(`${result.line} added to the production board.`);
  } catch (error) {
    showToast(error.message);
  }
});
document.querySelector('#reset-button').addEventListener('click', () => {
  lines = structuredClone(demoLines);
  saveLines();
  renderAll();
  showToast('Demo production data restored.');
});
document.querySelectorAll('[data-scroll-to]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.scrollTo}`).scrollIntoView({ behavior: 'smooth' }));
});
elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
  elements.mobileMenu.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
document.querySelectorAll('.primary-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    elements.sidebar.classList.remove('open');
    elements.mobileMenu.setAttribute('aria-expanded', 'false');
  });
});

document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
renderAll();

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const reportError = (error) => console.warn('WebMCP registration failed', error);

  Promise.resolve(context.registerTool({
    name: 'get_production_snapshot',
    title: 'Get production snapshot',
    description: 'Read the current MillPulse production totals, quality rate, active lines, and alerts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      return { ...summarize(), alerts: deriveAlerts(), lineCount: lines.length };
    },
  }, { signal: lifecycle.signal })).catch(reportError);

  Promise.resolve(context.registerTool({
    name: 'record_production_update',
    title: 'Record production update',
    description: 'Add one production line update to the local MillPulse prototype and refresh the visible dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        line: { type: 'string' }, facility: { type: 'string', enum: ['North Mill', 'South Mill'] },
        fabric: { type: 'string' }, planned: { type: 'number', minimum: 1 }, completed: { type: 'number', minimum: 0 },
        defects: { type: 'number', minimum: 0 }, status: { type: 'string', enum: ['running', 'attention', 'idle'] },
      },
      required: ['line', 'facility', 'fabric', 'planned', 'completed', 'defects', 'status'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const result = addRecord(input);
      showToast(`${result.line} added by assistant.`);
      return { success: true, ...result, summary: summarize() };
    },
  }, { signal: lifecycle.signal })).catch(reportError);
}

registerWebMcpTools();
