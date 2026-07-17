export interface ExtractedItem {
    name: string;
    amount: number | null;
    /** Regex extraction never sets this; only present when merged in from an LLM fallback result. */
    category?: string | null;
  }
  
  export interface ExtractedFields {
    merchant: string | null;
    invoiceNumber: string | null;
    date: string | null;
    currency: string | null;
    subtotal: number | null;
    tax: number | null;
    discount: number | null;
    total: number | null;
    items: ExtractedItem[];
  }
  
  export interface FieldConfidence {
    merchant: number;
    date: number;
    invoiceNumber: number;
    total: number;
    discount: number;
    tax: number;
    items: number;
  }
  
  function findLastLabeledAmount(text: string, labelPattern: string): number | null {
    const re = new RegExp(`${labelPattern}[:\\s]*[₹$€£]?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)`, 'gi');
    let match: RegExpExecArray | null;
    let last: RegExpExecArray | null = null;
    while ((match = re.exec(text)) !== null) last = match;
    if (!last) return null;
    const n = parseFloat(last[1].replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  
  // Excludes "subtotal" via negative lookbehind so it never shadows the real total.
  function extractTotal(text: string): number | null {
    return findLastLabeledAmount(text, String.raw`(?:grand\s*total|amount\s*payable|net\s*amount|(?<!sub)\btotal\b)`);
  }
  function extractSubtotal(text: string): number | null {
    return findLastLabeledAmount(text, String.raw`sub\s*-?\s*total`);
  }
  function extractDiscount(text: string): number | null {
    return findLastLabeledAmount(text, String.raw`discount`);
  }
  // The optional "@N%" group plus the requirement that a digit immediately
  // follows (after only whitespace/colon) means "GSTIN: 27AAAAA..." never
  // matches here — "IN" (or any letters) between the label and the number
  // breaks the pattern before it reaches the capture group.
  function extractTax(text: string): number | null {
    return findLastLabeledAmount(text, String.raw`(?:gst|tax|vat)\s*(?:@?\s*\d+\s*%)?`);
  }
  
  function extractDate(text: string): string | null {
    const match = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b/);
    return match ? match[1] : null;
  }
  
  function extractInvoiceNumber(text: string): string | null {
    const match = text.match(/(?:invoice|bill|receipt)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Za-z0-9\-/]+)/i);
    return match ? match[1] : null;
  }
  
  // Heuristic: the first non-empty line after cleanup is usually the store
  // name/header. Merchant-template matching (merchant-templates.ts) can
  // override this with a more specific match when a known chain is detected.
  function extractMerchant(text: string): string | null {
    const line = text.split('\n').map(l => l.trim()).find(Boolean);
    return line || null;
  }
  
  function extractCurrency(text: string): string | null {
    if (/₹/.test(text)) return 'INR';
    if (/\$/.test(text)) return 'USD';
    if (/€/.test(text)) return 'EUR';
    if (/£/.test(text)) return 'GBP';
    return null;
  }
  
  const ITEM_SKIP_LABELS = /^(sub-?total|discount|gst|tax|vat|total|grand total|amount payable|net amount|invoice|date)/i;
  
  function extractItems(text: string): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || ITEM_SKIP_LABELS.test(line)) continue;
      // "Name ...(spaces/qty)... amount" at end of line
      const match = line.match(/^(.+?)\s{2,}(?:x\d+\s+)?[₹$€£]?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/);
      if (match) {
        const amount = parseFloat(match[2]);
        if (Number.isFinite(amount) && amount > 0) {
          items.push({ name: match[1].trim(), amount });
        }
      }
    }
    return items;
  }
  
  export function extractWithRegex(cleanedText: string): { fields: ExtractedFields; fieldConfidence: FieldConfidence } {
    const fields: ExtractedFields = {
      merchant: extractMerchant(cleanedText),
      invoiceNumber: extractInvoiceNumber(cleanedText),
      date: extractDate(cleanedText),
      currency: extractCurrency(cleanedText),
      subtotal: extractSubtotal(cleanedText),
      tax: extractTax(cleanedText),
      discount: extractDiscount(cleanedText),
      total: extractTotal(cleanedText),
      items: extractItems(cleanedText),
    };
  
    const fieldConfidence: FieldConfidence = {
      merchant: fields.merchant ? 0.6 : 0,       // boosted to 0.97 by merchant-templates.ts on a known-chain match
      date: fields.date ? 0.97 : 0,
      invoiceNumber: fields.invoiceNumber ? 0.92 : 0.5, // absence is common/normal on simple receipts, so not a hard 0
      total: fields.total ? 1.0 : 0,
      // No discount line is a very normal, valid state (not every receipt has
      // one) — treat "not found" as neutral rather than penalizing confidence.
      discount: fields.discount !== null ? 0.95 : 1.0,
      tax: fields.tax !== null ? 0.9 : 0.7,
      items: fields.items.length > 0 ? 0.88 : 0,
    };
  
    return { fields, fieldConfidence };
  }
  
  // Weighted toward the fields that actually matter for a budget-tracking
  // entry (total, merchant, date) over nice-to-haves (invoice number, items).
  const WEIGHTS: Record<keyof FieldConfidence, number> = {
    total: 0.35,
    merchant: 0.20,
    date: 0.15,
    invoiceNumber: 0.10,
    discount: 0.10,
    tax: 0.0, // informational — doesn't gate whether the LLM fallback fires
    items: 0.10,
  };
  
  export function computeOverallConfidence(fieldConfidence: FieldConfidence): number {
    let score = 0;
    (Object.keys(WEIGHTS) as Array<keyof FieldConfidence>).forEach(key => {
      score += fieldConfidence[key] * WEIGHTS[key];
    });
    return Math.round(score * 100) / 100;
  }