/* ══════════════════════════════════════════
   Column field definitions
══════════════════════════════════════════ */
const PAIRED_FIELDS = {
    date: { label: 'Date', pat: [/date/i] },
    item: { label: 'Item / Stock', pat: [/vehicle.*desc|description.*vehicle|item|stock|name|symbol|scrip|ticker/i] },
    buyQty: { label: 'Buy Quantity', pat: [/buy.*(qty|quan|unit|no\b|num)|qty.*buy/i] },
    buyPrice: { label: 'Buy Price', pat: [/buy.*(price|rate|cost|val)|price.*buy/i] },
    sellQty: { label: 'Sell Quantity', pat: [/sell.*(qty|quan|unit|no\b|num)|qty.*sell/i] },
    sellPrice: { label: 'Sell Price', pat: [/sell.*(price|rate|val)|price.*sell/i] },
};

const ACT_FIELDS = {
    date: { label: 'Date', pat: [/date/i] },
    item: { label: 'Stock / Vehicle', pat: [/vehicle.*desc|desc.*vehicle|item|stock|name|symbol|scrip|ticker/i] },
    activity: { label: 'Activity / Type', pat: [/activity|^type$|trans.*type|^action$/i] },
    qty: { label: 'Quantity', pat: [/^qty$|^quantity$|^units$|^shares$|no.*of.*shares/i] },
    price: { label: 'Price', pat: [/purchase.*sell|sell.*purchase|^price$|^rate$|unit.*price|price.*per/i] },
};

const BUY_WORDS = /^(buy|purchase|purchased|match|matched|acquire|acquired|subscri|allot)/i;
const SELL_WORDS = /^(sell|sold|redempt|redeem)/i;
const DIV_WORDS = /^(dividend|div\b|divid)/i;

/* ══════════════════════════════════════════
   State
══════════════════════════════════════════ */
let files = [];
let mapperQueue = [], mapperCurrent = null;

// Computed once on Calculate, updated live as prices change
let ledger = {};       // stock → { buyLots, totalBuyQty, totalBuyValue, soldQty, sellProceeds, sellLots, dividendTotal, monthlyBuys }
let allRows = [];
let stockSummaries = []; // array, mutated in-place by live price updates
let activeFilter = 'all'; // 'all' | 'purchase' | 'match'

/* ══════════════════════════════════════════
   Drag & drop / file input
══════════════════════════════════════════ */
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag'); processFileList(Array.from(e.dataTransfer.files)); });
function handleFiles(e) { processFileList(Array.from(e.target.files)); e.target.value = ''; }
function processFileList(list) { list.filter(f => /\.(xlsx|xls|csv)$/i.test(f.name)).forEach(readFile); }

/* ══════════════════════════════════════════
   File reading & parsing
══════════════════════════════════════════ */
function readFile(file) {
    const id = Date.now() + Math.random();
    files.push({ id, name: file.name, rows: [], status: 'loading', mode: null });
    renderFileList();

    const reader = new FileReader();
    reader.onload = e => {
        debugger
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!json.length) { markFile(id, 'error', 'empty'); return; }
            const headers = json[0].map(String);
            const rawRows = json.slice(1).filter(r => r.some(c => c !== ''));

            const isActivity = headers.some(h => /activity|^type$|trans.*type|^action$/i.test(h.trim()));
            const fields = isActivity ? ACT_FIELDS : PAIRED_FIELDS;
            const guesses = autoGuess(headers, fields);
            const allMapped = Object.keys(fields).every(f => guesses[f] !== undefined);

            if (allMapped) {
                const rows = isActivity ? extractActivityRows(rawRows, guesses) : extractPairedRows(rawRows, guesses);
                markFile(id, 'ok', null, rows, rawRows.length, isActivity ? 'activity' : 'paired');
            } else {
                markFile(id, 'mapping', null, [], 0, isActivity ? 'activity' : 'paired');
                mapperQueue.push({ id, name: file.name, headers, rawRows, guesses, mode: isActivity ? 'activity' : 'paired' });
                drainMapperQueue();
            }
        } catch (err) {
            markFile(id, 'error', 'parse error');
        }
        updateCalcBar(); renderFileList();
    };
    reader.readAsArrayBuffer(file);
}

function autoGuess(headers, fields) {
    const g = {};
    Object.keys(fields).forEach(f => {
        const idx = headers.findIndex(h => fields[f].pat.some(p => p.test(h.trim())));
        if (idx >= 0) g[f] = idx;
    });
    return g;
}

function parseNum(v) { return parseFloat(String(v).replace(/[^\d.\-]/g, '')) || 0; }
function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    const d = new Date(v); return isNaN(d) ? null : d;
}

function extractPairedRows(rawRows, m) {
    debugger
    let k = rawRows.map(r => ({
        date: parseDate(r[m.date]), item: String(r[m.item] || '—'),
        activityType: null, activityRaw: null,
        qty: 0, price: 0,
        buyQty: parseNum(r[m.buyQty]), buyPrice: parseNum(r[m.buyPrice]),
        sellQty: parseNum(r[m.sellQty]), sellPrice: parseNum(r[m.sellPrice]),
    }))
    console.log(k)
    return k;
}

function extractActivityRows(rawRows, m) {
    const rows = [];
    rawRows.forEach(r => {
        const actRaw = String(r[m.activity] || '').trim();
        const qty = parseNum(r[m.qty]);
        const price = parseNum(r[m.price]);
        const date = parseDate(r[m.date]);
        const item = "SAP";
        if (!actRaw) return;
        const isBuy = BUY_WORDS.test(actRaw);
        const isSell = SELL_WORDS.test(actRaw);
        const isDiv = DIV_WORDS.test(actRaw);
        if (!isBuy && !isSell && !isDiv) return;
        rows.push({
            date, item, activityType: isBuy ? 'buy' : isSell ? 'sell' : 'dividend', activityRaw: actRaw,
            qty, price,
            buyQty: isBuy ? qty : 0, buyPrice: isBuy ? price : 0,
            sellQty: isSell ? qty : 0, sellPrice: isSell ? price : 0,
            divAmount: isDiv ? qty * price : 0,
        });
    });
    return rows;
}

function markFile(id, status, errMsg, rows, rawCount, mode) {
    const f = files.find(f => f.id === id);
    if (!f) return;
    f.status = status; f.errMsg = errMsg || null;
    f.rows = rows || f.rows;
    f.rowCount = rawCount || (rows ? rows.length : 0);
    if (mode) f.mode = mode;
}

function removeFile(id) {
    files = files.filter(f => f.id !== id);
    mapperQueue = mapperQueue.filter(q => q.id !== id);
    renderFileList(); updateCalcBar();
}

/* ══════════════════════════════════════════
   Mapper modal
══════════════════════════════════════════ */
function drainMapperQueue() {
    if (mapperCurrent || !mapperQueue.length) return;
    mapperCurrent = mapperQueue.shift();
    showMapper(mapperCurrent);
}
function showMapper(ctx) {
    document.getElementById('modal-fname').textContent = ctx.name;
    const fields = ctx.mode === 'activity' ? ACT_FIELDS : PAIRED_FIELDS;
    const grid = document.getElementById('modal-map-grid');
    grid.innerHTML = '';
    Object.keys(fields).forEach(f => {
        const w = document.createElement('div');
        w.innerHTML = `<label>${fields[f].label}</label>
      <select id="mmap-${f}">
        <option value="">— select —</option>
        ${ctx.headers.map((h, i) => `<option value="${i}" ${ctx.guesses[f] === i ? 'selected' : ''}>${h || ('' + (i + 1))}</option>`).join('')}
      </select>`;
        grid.appendChild(w);
    });
    document.getElementById('modal').style.display = 'flex';
}
function confirmMapper() {
    const ctx = mapperCurrent;
    const fields = ctx.mode === 'activity' ? ACT_FIELDS : PAIRED_FIELDS;
    const colMap = {}; const errors = [];
    Object.keys(fields).forEach(f => {
        const v = document.getElementById('mmap-' + f).value;
        if (!v) errors.push(fields[f].label); else colMap[f] = parseInt(v);
    });
    if (errors.length) return alert('Please map: ' + errors.join(', '));
    const rows = ctx.mode === 'activity' ? extractActivityRows(ctx.rawRows, colMap) : extractPairedRows(ctx.rawRows, colMap);
    markFile(ctx.id, 'ok', null, rows, ctx.rawRows.length, ctx.mode);
    closeModal();
}
function cancelMapper() { if (mapperCurrent) markFile(mapperCurrent.id, 'skip', 'skipped'); closeModal(); }
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    mapperCurrent = null;
    renderFileList(); updateCalcBar(); drainMapperQueue();
}

/* ══════════════════════════════════════════
   UI helpers
══════════════════════════════════════════ */
function renderFileList() {
    const list = document.getElementById('file-list');
    list.innerHTML = files.map(f => {
        const s = { ok: `<span class="chip-status ok">${f.rowCount} rows</span>`, loading: `<span class="chip-status mapping">reading…</span>`, mapping: `<span class="chip-status mapping">needs mapping</span>`, skip: `<span class="chip-status error">skipped</span>`, error: `<span class="chip-status error">${f.errMsg || 'error'}</span>` };
        return `<div class="file-chip"><span class="chip-icon">📄</span><span class="chip-name" title="${f.name}">${f.name}</span>${s[f.status] || ''}<button class="chip-remove" onclick="removeFile(${f.id})">×</button></div>`;
    }).join('');
}
function updateCalcBar() {
    const bar = document.getElementById('calc-bar');
    const ready = files.filter(f => f.status === 'ok');
    const pending = files.filter(f => f.status === 'loading' || f.status === 'mapping');
    if (!files.length) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    const totalRows = ready.reduce((s, f) => s + f.rows.length, 0);
    document.getElementById('calc-bar-info').innerHTML = `<strong>${ready.length} file${ready.length !== 1 ? 's' : ''} ready</strong> · ${totalRows} rows` + (pending.length ? ` · ${pending.length} still loading` : '');
    document.getElementById('calc-btn').disabled = !ready.length;
}

/* ══════════════════════════════════════════
   Formatting
══════════════════════════════════════════ */
function fmtC(n, sym = '€') {
    const sign = n < 0 ? '-' : '';
    const a = Math.abs(n);
    return sign + sym + a.toLocaleString('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtShort(n, sym = '€') {
    const sign = n < 0 ? '-' : ''; const a = Math.abs(n);
    if (a >= 1e6) return sign + sym + (a / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return sign + sym + (a / 1e3).toFixed(1) + 'K';
    return sign + sym + a.toFixed(2);
}
function fmtQty(n) { return n.toLocaleString('en-DE', { maximumFractionDigits: 6 }); }

/* ══════════════════════════════════════════
   Get current prices from the price panel inputs
══════════════════════════════════════════ */
function getCurrentPrices() {
    const out = {};
    document.querySelectorAll('.cp-input').forEach(el => {
        const stock = el.dataset.stock;
        const v = parseFloat(el.value);
        if (stock && !isNaN(v) && v > 0) out[stock] = v;
    });
    return out;
}

/* ══════════════════════════════════════════
   Core computation — builds ledger & stockSummaries
══════════════════════════════════════════ */
function computeAndShow() {
    const readyFiles = files.filter(f => f.status === 'ok');
    if (!readyFiles.length) return;

    // Build allRows
    allRows = [];
    readyFiles.forEach(f => f.rows.forEach(r => allRows.push({ ...r, fileName: f.name })));

    // Build per-stock ledger — also track monthly buy qty/cost per stock
    ledger = {};
    allRows.forEach(r => {
        r.sellQty = r.sellQty < 0 ? r.sellQty * -1 : r.sellQty;
        const s = String(r.item).trim().toUpperCase();;
        if (!ledger[s]) ledger[s] = {
            buyLots: [], totalBuyQty: 0, totalBuyValue: 0,
            purchaseBuyValue: 0, purchaseBuyQty: 0,  // own contributions
            matchBuyValue: 0, matchBuyQty: 0,      // employer/match contributions
            soldQty: 0, sellProceeds: 0, sellLots: [],
            dividendTotal: 0,
            monthlyBuys: {}
        };
        console.log(s);
        const L = ledger[s];
        if (r.buyQty > 0 && r.buyPrice > 0) {
            L.buyLots.push({ qty: r.buyQty, price: r.buyPrice, date: r.date });
            L.totalBuyQty += r.buyQty;
            L.totalBuyValue += r.buyQty * r.buyPrice;
            // Split by contribution type
            const isMatch = /^match/i.test(r.activityRaw || '');
            if (isMatch) { L.matchBuyValue += r.buyQty * r.buyPrice; L.matchBuyQty += r.buyQty; }
            else { L.purchaseBuyValue += r.buyQty * r.buyPrice; L.purchaseBuyQty += r.buyQty; }
            const mKey = r.date ? monthKey(r.date) : 'Unknown';
            if (!L.monthlyBuys[mKey]) L.monthlyBuys[mKey] = { qty: 0, cost: 0 };
            L.monthlyBuys[mKey].qty += r.buyQty;
            L.monthlyBuys[mKey].cost += r.buyQty * r.buyPrice;
        }
        
        if (r.sellQty > 0) {
            L.soldQty += r.sellQty;
            L.sellProceeds += r.sellQty * r.sellPrice;
            L.sellLots.push({ date: r.date, qty: r.sellQty, price: r.sellPrice });
        }
        if (r.divAmount > 0) {
            L.dividendTotal += r.divAmount;
        }
        console.log(L.sellLots)
    });

    // Build stockSummaries from ledger using FIFO cost basis (no current prices yet)
    stockSummaries = Object.entries(ledger).map(([stock, L]) => {
        // FIFO: consume sold qty from oldest lots first
        let remainingToSell = L.soldQty;
        let fifoRealisedCost = 0;
        const fifoRemainingLots = [];
        L.buyLots.sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const lot of L.buyLots) {
            if (remainingToSell <= 0) {
                fifoRemainingLots.push({ qty: lot.qty, price: lot.price });
            } else if (lot.qty <= remainingToSell) {
                fifoRealisedCost += lot.qty * lot.price;
                remainingToSell -= lot.qty;
            } else {
                fifoRealisedCost += remainingToSell * lot.price;
                fifoRemainingLots.push({ qty: lot.qty - remainingToSell, price: lot.price });
                remainingToSell = 0;
            }
        }

        const realised = L.soldQty > 0 ? L.sellProceeds - fifoRealisedCost : 0;
        const remainQty = fifoRemainingLots.reduce((s, l) => s + l.qty, 0);

        // Weighted avg of REMAINING lots only
        const remainCost = fifoRemainingLots.reduce((s, l) => s + l.qty * l.price, 0);
        const avgBuyPrice = remainQty > 0 ? remainCost / remainQty : 0;

        return {
            stock, totalBuyQty: L.totalBuyQty, avgBuyPrice,
            soldQty: L.soldQty, remainQty,
            sellProceeds: L.sellProceeds, realised,
            fifoRemainingLots,
            curPrice: null
        };
    });

    // Show results section
    document.getElementById('results-meta').textContent =
        readyFiles.length + ' file' + (readyFiles.length !== 1 ? 's' : '') + ' · ' + allRows.length + ' transactions · ' + stockSummaries.length + ' stocks';

    renderCurrentPricePanel();
    renderLive();
    renderTransactionLog();

    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function monthKey(d) { return d.toLocaleDateString('en-DE', { month: 'short', year: '2-digit' }); }
function monthSortKey(mk) {
    // e.g. "Jun 26" → sortable
    const [mon, yr] = mk.split(' ');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return parseInt(yr) * 12 + months.indexOf(mon);
}

/* ══════════════════════════════════════════
   Render current price panel (once)
══════════════════════════════════════════ */
function renderCurrentPricePanel() {
    const grid = document.getElementById('cur-price-grid');
    grid.innerHTML = stockSummaries.map(s => `
    <div class="cp-row">
      <span class="cp-label" title="${s.stock}">📈 ${s.stock}</span>
      <input type="number" class="cp-input" data-stock="${s.stock}"
             min="0" step="any" placeholder="e.g. 142.00" />
    </div>`).join('');
}

/* ══════════════════════════════════════════
   Own-purchase unrealised P&L (proportional split)
   Allocates remainQty to purchase vs match by their original buy ratio,
   then applies (curPrice − avgBuyPrice) to the purchase share only.
══════════════════════════════════════════ */
function calcPurchaseUnrealised() {
    let total = 0;
    stockSummaries.forEach(s => {
        if (!s.curPrice || s.remainQty <= 0) return;
        const L = ledger[s.stock];
        if (L.totalBuyQty <= 0) return;
        const purchaseRatio   = L.purchaseBuyQty / L.totalBuyQty;
        const purchaseRemainQty = s.remainQty * purchaseRatio;
        total += (s.curPrice - s.avgBuyPrice) * purchaseRemainQty;
    });
    return total;
}


function renderLive() {
    const prices = getCurrentPrices();

    // Update curPrice on each stockSummary
    stockSummaries.forEach(s => { s.curPrice = prices[s.stock] || null; });

    // Totals
    let totalRealised = 0, totalUnrealised = 0, totalInvested = 0, totalSellProceeds = 0;
    stockSummaries.forEach(s => {
        totalInvested += ledger[s.stock].totalBuyValue;
        totalSellProceeds += s.sellProceeds;
        totalRealised += s.realised;
        if (s.curPrice && s.remainQty > 0) {
            totalUnrealised += (s.curPrice - s.avgBuyPrice) * s.remainQty;
        }
    });
    const hasUnrealised = stockSummaries.some(s => s.curPrice && s.remainQty > 0);
    const totalPnL = totalRealised + (hasUnrealised ? totalUnrealised : 0);
    const purchaseUnrealised = hasUnrealised ? calcPurchaseUnrealised() : null;

    renderSummaryCards(totalRealised, totalUnrealised, hasUnrealised, totalPnL, purchaseUnrealised);
    renderMetrics(totalInvested, totalSellProceeds, totalRealised, totalUnrealised, hasUnrealised, totalPnL);
    renderHoldingsTable(hasUnrealised);
    renderMonthlyChart(prices);
}

/* ══════════════════════════════════════════
   Summary cards
══════════════════════════════════════════ */
function renderSummaryCards(totalRealised, totalUnrealised, hasUnrealised, totalPnL, purchaseUnrealised) {
    const realisedCls = totalRealised >= 0 ? 'profit' : 'loss';
    const unrealisedCls = hasUnrealised ? (totalUnrealised >= 0 ? 'profit' : 'loss') : 'neutral';
    const combinedCls = hasUnrealised ? (totalPnL >= 0 ? 'profit' : 'loss') : 'neutral';
    const purchaseCls = purchaseUnrealised === null ? 'neutral' : purchaseUnrealised >= 0 ? 'profit' : 'loss';
    document.getElementById('summary-row').innerHTML = `
    <div class="abs-card ${realisedCls}">
      <div class="abs-icon">${totalRealised >= 0 ? '✅' : '❌'}</div>
      <div class="abs-tag">Realised P&L</div>
      <div class="abs-amount">${fmtC(totalRealised)}</div>
      <div class="abs-sub">Completed buy → sell trades</div>
    </div>
    <div class="abs-card ${unrealisedCls}">
      <div class="abs-icon">${hasUnrealised ? (totalUnrealised >= 0 ? '📈' : '📉') : '⏳'}</div>
      <div class="abs-tag">Unrealised P&L</div>
      <div class="abs-amount">${hasUnrealised ? fmtC(totalUnrealised) : '—'}</div>
      <div class="abs-sub">${hasUnrealised ? 'On remaining holdings' : 'Enter current price above'}</div>
    </div>
    <div class="abs-card ${combinedCls}">
      <div class="abs-icon">${hasUnrealised ? (totalPnL >= 0 ? '💰' : '💸') : '⏳'}</div>
      <div class="abs-tag">Combined P&L</div>
      <div class="abs-amount">${hasUnrealised ? fmtC(totalPnL) : '—'}</div>
      <div class="abs-sub">Realised + unrealised</div>
    </div>
    <div class="abs-card ${purchaseCls}">
      <div class="abs-icon">${purchaseUnrealised === null ? '⏳' : purchaseUnrealised >= 0 ? '🟢' : '🔴'}</div>
      <div class="abs-tag">Own Investment P&L</div>
      <div class="abs-amount">${purchaseUnrealised !== null ? fmtC(purchaseUnrealised) : '—'}</div>
      <div class="abs-sub">Unrealised · your purchase units only</div>
    </div>`;
}

/* ══════════════════════════════════════════
   Metrics row
══════════════════════════════════════════ */
function renderMetrics(totalInvested, totalSellProceeds, totalRealised, totalUnrealised, hasUnrealised, totalPnL) {
    // Avg cost of remaining held units (weighted across all stocks)
    let heldCostTotal = 0, heldQtyTotal = 0;
    stockSummaries.forEach(s => {
        if (s.remainQty > 0) { heldCostTotal += s.remainQty * s.avgBuyPrice; heldQtyTotal += s.remainQty; }
    });
    const avgHoldingCost = heldQtyTotal > 0 ? heldCostTotal / heldQtyTotal : null;

    document.getElementById('metrics').innerHTML = [
        { label: 'Total invested', value: fmtShort(totalInvested), sub: 'all buy rows' },
        { label: 'Sell proceeds', value: fmtShort(totalSellProceeds), sub: 'completed sells' },
        { label: 'Avg cost (held units)', value: avgHoldingCost ? fmtC(avgHoldingCost) : '—', sub: 'weighted avg buy price of unsold qty' },
        { label: 'Realised P&L', value: fmtShort(totalRealised), sub: 'locked in', color: totalRealised >= 0 ? 'var(--profit-mid)' : 'var(--loss-mid)' },
        { label: 'Unrealised P&L', value: hasUnrealised ? fmtShort(totalUnrealised) : '—', sub: 'open holdings', color: hasUnrealised ? (totalUnrealised >= 0 ? 'var(--profit-mid)' : 'var(--loss-mid)') : 'var(--hint)' },
        { label: 'Combined P&L', value: hasUnrealised ? fmtShort(totalPnL) : '—', sub: 'realised + unrealised', color: hasUnrealised ? (totalPnL >= 0 ? 'var(--profit-mid)' : 'var(--loss-mid)') : 'var(--hint)' },
        { label: 'Stocks', value: stockSummaries.length, sub: 'unique holdings' },
    ].map(m => `<div class="metric"><div class="metric-label">${m.label}</div><div class="metric-value"${m.color ? ` style="color:${m.color}"` : ''}>${m.value}</div><div class="metric-sub">${m.sub}</div></div>`).join('');
}

/* ══════════════════════════════════════════
   Holdings table
══════════════════════════════════════════ */
function renderHoldingsTable(hasUnrealised) {
    document.getElementById('holdings-section').innerHTML = `
    <p class="section-title">Holdings breakdown</p>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Stock / Vehicle</th>
          <th>Total bought</th>
          <th>Avg buy price</th>
          <th>Units sold</th>
          <th>Units held</th>
          <th>Purchase value</th>
          <th>Current price</th>
          <th>Current value</th>
          <th>Realised P&L</th>
          <th>Unrealised P&L</th>
        </tr></thead>
        <tbody>${stockSummaries.map(s => {
        const purchaseValue = s.remainQty * s.avgBuyPrice;
        const currentValue = s.curPrice ? s.remainQty * s.curPrice : null;
        const unrealised = currentValue !== null ? currentValue - purchaseValue : null;
        const rc = s.realised >= 0 ? 'badge-profit' : 'badge-loss';
        const uc = unrealised === null ? 'badge-zero' : unrealised >= 0 ? 'badge-profit' : 'badge-loss';
        return `<tr>
            <td style="font-weight:500">${s.stock}</td>
            <td>${fmtQty(s.totalBuyQty)}</td>
            <td>${fmtC(s.avgBuyPrice)}</td>
            <td style="color:var(--loss-mid);font-weight:500">${s.soldQty > 0 ? fmtQty(s.soldQty) : '—'}</td>
            <td>${s.remainQty > 0 ? fmtQty(s.remainQty) : '—'}</td>
            <td>${s.remainQty > 0 ? fmtC(purchaseValue) : '—'}</td>
            <td>${s.curPrice ? fmtC(s.curPrice) : '<span style="color:var(--hint)">—</span>'}</td>
            <td>${currentValue !== null ? fmtC(currentValue) : '<span style="color:var(--hint)">—</span>'}</td>
            <td><span class="badge ${rc}">${fmtC(s.realised)}</span></td>
            <td><span class="badge ${uc}">${unrealised !== null ? fmtC(unrealised) : '—'}</span></td>
          </tr>`;
    }).join('')}</tbody>
      </table>
    </div>`;
}

/* ══════════════════════════════════════════
   Monthly P&L chart
   P&L for a month = (currentPrice − avgBuyPrice) × qty bought that month
   (cumulative cost basis per stock applied per-month buy batch)
══════════════════════════════════════════ */
function renderMonthlyChart(prices) {
    const section = document.getElementById('monthly-section');

    // Need at least one price entered to make the chart meaningful
    const hasPrices = Object.keys(prices).length > 0;
    if (!hasPrices) {
        section.innerHTML = `
      <p class="section-title">Monthly P&L</p>
      <div class="chart-wrap" style="text-align:center;color:var(--hint);font-size:13px;padding:2rem 1.5rem;">
        Enter a current price above to see monthly P&L
      </div>`;
        return;
    }

    // For each month: sum (currentPrice − avgBuyPrice) × qty for all buy rows in that month
    const monthlyPnL = {};
    stockSummaries.forEach(s => {
        const curPrice = prices[s.stock];
        if (!curPrice) return;
        const L = ledger[s.stock];
        Object.entries(L.monthlyBuys).forEach(([mKey, mb]) => {
            const monthAvgBuy = mb.qty > 0 ? mb.cost / mb.qty : 0;
            const pnl = (curPrice - monthAvgBuy) * mb.qty;
            monthlyPnL[mKey] = (monthlyPnL[mKey] || 0) + pnl;
        });
    });

    const months = Object.keys(monthlyPnL).sort((a, b) => monthSortKey(a) - monthSortKey(b));
    if (!months.length) { section.innerHTML = ''; return; }

    const maxAbs = Math.max(...months.map(m => Math.abs(monthlyPnL[m])));
    section.innerHTML = `
    <p class="section-title">Monthly P&L — (current price − that month's avg buy price) × qty bought</p>
    <div class="chart-wrap">${months.map(m => {
        const v = monthlyPnL[m];
        const pct = maxAbs ? (Math.abs(v) / maxAbs * 100).toFixed(1) : 0;
        const color = v >= 0 ? 'var(--profit-mid)' : 'var(--loss-mid)';
        return `<div class="bar-row">
        <span class="bar-label">${m}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="bar-val" style="color:${color}">${fmtShort(v)}</span>
      </div>`;
    }).join('')}</div>`;
}

/* ══════════════════════════════════════════
   Transaction log (rendered once)
══════════════════════════════════════════ */
function renderTransactionLog() {
    document.getElementById('tx-body').innerHTML = allRows.map(r => {
        const isSell = r.activityType === 'sell' || (!r.activityType && r.sellQty > 0);
        const actLabel = r.activityType
            ? (r.activityType === 'buy'
                ? `<span class="act-buy">${r.activityRaw || 'BUY'}</span>`
                : `<span class="act-sell">${r.activityRaw || 'SELL'}</span>`)
            : (r.buyQty > 0 && r.sellQty > 0 ? '<span class="act-buy">BUY</span>/<span class="act-sell">SELL</span>'
                : r.buyQty > 0 ? '<span class="act-buy">BUY</span>' : '<span class="act-sell">SELL</span>');
        const qty = r.activityType ? r.qty : (isSell ? r.sellQty : r.buyQty);
        const price = r.activityType ? r.price : (isSell ? r.sellPrice : r.buyPrice);
        const value = qty * price;
        const qtyCell = isSell
            ? `<span style="color:var(--loss-mid);font-weight:500">${fmtQty(qty)}</span>`
            : fmtQty(qty);
        return `<tr>
      <td style="font-size:12px;color:var(--muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.fileName}">${r.fileName}</td>
      <td>${r.date ? r.date.toLocaleDateString('en-DE') : '—'}</td>
      <td style="font-weight:500">${r.item}</td>
      <td>${actLabel}</td>
      <td>${qtyCell}</td>
      <td>${price ? fmtC(price) : '—'}</td>
      <td>${value ? fmtC(value) : '—'}</td>
    </tr>`;
    }).join('');
}

/* ══════════════════════════════════════════
   Live price input listener
══════════════════════════════════════════ */
document.getElementById('cur-price-grid').addEventListener('input', e => {
    if (!e.target.classList.contains('cp-input')) return;
    renderLive();
});

function goBack() {
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'block';
}