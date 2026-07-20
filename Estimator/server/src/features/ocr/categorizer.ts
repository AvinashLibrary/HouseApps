// Step 8 — categorization is a pure local lookup, never an LLM call. Matching
// is substring/regex against the merchant name already resolved by regex
// extraction or a merchant template.
const MERCHANT_CATEGORY_MAP: Array<{ match: RegExp; category: string }> = [
    { match: /d-?mart|avenue supermarts/i, category: 'Grocery' },
    { match: /star bazaar/i, category: 'Grocery' },
    { match: /reliance\s*(smart|fresh|mart)/i, category: 'Grocery' },
    { match: /\bmore\b/i, category: 'Grocery' },
    { match: /amazon/i, category: 'Shopping' },
    { match: /indian oil|bharat petroleum|\bhp\b petrol|shell/i, category: 'Fuel' },
    { match: /swiggy/i, category: 'Food' },
    { match: /zomato/i, category: 'Food' },
  ];
  
  export function categorize(merchant: string | null): string | null {
    if (!merchant) return null;
    const hit = MERCHANT_CATEGORY_MAP.find(m => m.match.test(merchant));
    return hit ? hit.category : null;
  }