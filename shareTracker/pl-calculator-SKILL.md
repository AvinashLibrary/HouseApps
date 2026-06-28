---
name: pl-calculator
description: Use this skill before making ANY edit to pl-calculator.html, logic.js, or main.css. Load it first every time — it contains the full map of globals, functions, DOM IDs, data shapes, and change log needed to make surgical edits without re-reading source files.
---

# P&L Calculator — Dev Skill

## FILES
```
pl-calculator.html   structure + DOM IDs (no logic)
logic.js             all JS — globals, compute, render
main.css             styles only
```
External: `xlsx.full.min.js` (CDN, SheetJS 0.18.5)

---

## GLOBAL STATE — never rename
```
files[]           file objects; status drives all UI
mapperQueue[]     files awaiting manual column mapping
mapperCurrent     active modal context (null when idle)
ledger{}          keyed by UPPERCASE stock string; built in computeAndShow()
allRows[]         flat merge of all files[n].rows + fileName
stockSummaries[]  derived from ledger; curPrice mutated live by renderLive()
activeFilter      'all'|'purchase'|'match'
```

---

## DATA SHAPES

### files[n]
```
{ id, name, rows[], status, mode, rowCount, errMsg }
status: 'loading'|'ok'|'mapping'|'skip'|'error'
mode:   'activity'|'paired'
```

### ledger[stock]
```
{ buyLots[{qty,price,date}], totalBuyQty, totalBuyValue,
  purchaseBuyValue, purchaseBuyQty,   // own contributions
  matchBuyValue, matchBuyQty,         // employer/match
  soldQty, sellProceeds, sellLots[{date,qty,price}],
  dividendTotal, monthlyBuys{mKey:{qty,cost}} }
```

### stockSummaries[n]
```
{ stock, totalBuyQty, avgBuyPrice,  // FIFO: avg of REMAINING lots only
  soldQty, remainQty, sellProceeds,
  realised,           // FIFO: proceeds − cost of consumed lots
  fifoRemainingLots[{qty,price}],
  curPrice }          // null until renderLive() sets it
```

### Normalised row (output of both extract fns)
```
{ date, item, activityType('buy'|'sell'|'dividend'|null),
  activityRaw, qty, price,
  buyQty, buyPrice, sellQty, sellPrice,
  divAmount, fileName }
```

---

## FILE MODES
```
Activity mode  → header matches /activity|^type$|trans.*type|^action$/i
               → ACT_FIELDS → extractActivityRows()
               → BUY_WORDS / SELL_WORDS / DIV_WORDS classify each row

Paired mode    → no activity header
               → PAIRED_FIELDS → extractPairedRows()
               → buy + sell can appear on same row
```

---

## FUNCTION MAP

### Pipeline
```
processFileList(list)                         filter + loop → readFile()
readFile(file)                                FileReader → XLSX → mode detect → autoGuess or modal
autoGuess(headers, fields) → {key:colIdx}
extractPairedRows(rawRows, m) → rows[]
extractActivityRows(rawRows, m) → rows[]
markFile(id, status, errMsg, rows, rawCount, mode)
removeFile(id)
```

### Modal
```
drainMapperQueue()     pop queue → showMapper(); gate: mapperCurrent
showMapper(ctx)        build selects from ctx.headers + ctx.guesses
confirmMapper()        read selects → extract → markFile('ok') → closeModal()
cancelMapper()         markFile('skip') → closeModal()
closeModal()           hide modal, null mapperCurrent, drain next
```

### Compute + Render
```
computeAndShow()              build ledger, allRows, stockSummaries → render all
renderCurrentPricePanel()     build .cp-input grid — called ONCE
renderLive()                  read prices → curPrice → 4 sub-renders
renderSummaryCards(r,u,has,pnl,purchaseUnrealised)
renderMetrics(inv,sp,r,u,has,pnl)
renderHoldingsTable(hasUnrealised)   full innerHTML rebuild each price change
renderMonthlyChart(prices)           skipped if no prices entered
renderTransactionLog()               allRows → #tx-body — called ONCE
calcPurchaseUnrealised() → float     proportional unrealised for own units
```

### Utilities
```
getCurrentPrices() → {stock:float}   reads .cp-input DOM
parseNum(v) → float
parseDate(v) → Date|null
monthKey(d) → "Jun 26"
monthSortKey(mk) → int
fmtC(n, sym='€') → "€1.234,56"
fmtShort(n, sym='€') → "€1.2K"/"€1.23M"
fmtQty(n) → up to 6dp
renderFileList()
updateCalcBar()
goBack()
```

---

## DOM IDs
```
#drop-zone            drag events
#file-input           file picker
#file-list            renderFileList()
#calc-bar             updateCalcBar() show/hide
#calc-bar-info        updateCalcBar() text
#calc-btn             disabled toggle
#modal                show/hide
#modal-fname          showMapper()
#modal-map-grid       showMapper() selects
#upload-section       view toggle
#results-section      view toggle
#results-meta         file/row/stock count
#cur-price-grid       renderCurrentPricePanel() + input listener
#summary-row          renderSummaryCards()
#metrics              renderMetrics()
#filter-tabs          hidden — Bug #1
#holdings-section     renderHoldingsTable()
#realised-section     NOT written — Bug #2
#monthly-section      renderMonthlyChart()
#tx-body              renderTransactionLog()
```

---

## HOW TO MAKE CHANGES

**Rule:** edit one function at a time. All state is global — side effects are predictable.

**Adding a new render section:**
1. Add `<div id="new-section"></div>` in `pl-calculator.html` inside `#results-section`
2. Write `renderNewSection()` in `logic.js`
3. Call from `computeAndShow()` (once-only) or `renderLive()` (price-reactive)

**Adding a new ledger field:**
1. Initialise in the `ledger[s] = { ... }` block in `computeAndShow()`
2. Populate in the `allRows.forEach` loop
3. Read in the relevant render function

**Adding a new column field:**
1. Add pattern to `PAIRED_FIELDS` or `ACT_FIELDS`
2. Extract in `extractPairedRows()` or `extractActivityRows()`
3. Add to normalised row shape above

---

## CHANGE LOG

| # | Description | Status |
|---|-------------|--------|
| Bug #6 | FIFO cost basis — `avgBuyPrice` is now avg of remaining lots; `realised` uses oldest lots first; `fifoRemainingLots[]` on stockSummaries | ✅ Fixed |
| Bug #1 | `setFilter()` missing; `#filter-tabs` always hidden; `activeFilter` never applied | ⬜ Open |
| Bug #2 | `#realised-section` never populated; `sellLots[]` and `dividendTotal` unused in UI | ⬜ Open |
| Bug #3 | `goBack()` doesn't clear ledger/allRows/stockSummaries | ⬜ Open |
| Bug #4 | `parseDate()` locale-ambiguous for DD/MM/YYYY CSV strings | ⬜ Open |
| Bug #5 | Dividend `qty×price` silently returns 0 when one column is empty | ⬜ Open |
| Perf  | `renderHoldingsTable` rebuilds on every keystroke — needs 120ms debounce | ⬜ Open |