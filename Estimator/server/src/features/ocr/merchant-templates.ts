import type { ExtractedFields, FieldConfidence } from './regex-extractor';

export interface MerchantTemplate {
  name: string;
  /** Matches against the cleaned receipt text to detect this chain. */
  test: (text: string) => boolean;
  /**
   * Returns overrides to merge over the generic regex result — only for
   * fields this template can extract more reliably than the generic parser.
   * Return {} to just confirm the merchant identity without changing fields.
   */
  parse: (text: string) => Partial<ExtractedFields>;
}

// Pluggable by design — add a new template here rather than special-casing
// merchants inside the generic extractor. Each template only needs to define
// what it improves on; anything omitted falls back to the generic regex pass.
export const MERCHANT_TEMPLATES: MerchantTemplate[] = [
  {
    name: 'DMart',
    test: (t) => /\bd-?mart\b/i.test(t) || /avenue supermarts/i.test(t),
    parse: () => ({ merchant: 'DMart' }),
  },
  {
    name: 'Star Bazaar',
    test: (t) => /star bazaar/i.test(t),
    parse: () => ({ merchant: 'Star Bazaar' }),
  },
  {
    name: 'Reliance Smart',
    test: (t) => /reliance\s*(smart|fresh|mart)/i.test(t),
    parse: (t) => ({ merchant: /fresh/i.test(t) ? 'Reliance Fresh' : 'Reliance Smart' }),
  },
  {
    name: 'More',
    test: (t) => /\bmore\s*(supermarket|megastore|retail)\b/i.test(t),
    parse: () => ({ merchant: 'More' }),
  },
  {
    name: 'Amazon',
    test: (t) => /amazon\.in|amazon\.com/i.test(t) || /\btax invoice\b/i.test(t) && /amazon/i.test(t),
    // Amazon invoices label the final line "Grand Total" reliably, and often
    // include an explicit "Order ID" the generic invoiceNumber regex misses.
    parse: (t) => {
      const orderMatch = t.match(/order\s*(?:id|number|#)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
      return {
        merchant: 'Amazon',
        ...(orderMatch ? { invoiceNumber: orderMatch[1] } : {}),
      };
    },
  },
];

export function matchMerchantTemplate(cleanedText: string): MerchantTemplate | null {
  return MERCHANT_TEMPLATES.find(t => t.test(cleanedText)) ?? null;
}

// Merges a template's overrides over the generic regex fields, and boosts
// merchant confidence since a known-chain match is a strong, low-risk signal.
export function applyMerchantTemplate(
  fields: ExtractedFields,
  fieldConfidence: FieldConfidence,
  template: MerchantTemplate | null,
  cleanedText: string,
): { fields: ExtractedFields; fieldConfidence: FieldConfidence } {
  if (!template) return { fields, fieldConfidence };

  const overrides = template.parse(cleanedText);
  const mergedFields: ExtractedFields = { ...fields, ...overrides };
  const mergedConfidence: FieldConfidence = {
    ...fieldConfidence,
    merchant: 0.97,
    ...(overrides.invoiceNumber ? { invoiceNumber: 0.92 } : {}),
  };
  return { fields: mergedFields, fieldConfidence: mergedConfidence };
}