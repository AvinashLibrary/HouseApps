// Natural-language expense entry — parses a free-text sentence like
// "₹450 at Big Bazaar for groceries, paid by UPI #reimbursable" into
// structured bill fields the user can review before saving.
//
// Implementation note: this is a local, heuristic keyword/regex parser, not a
// call to an external AI model — this project has no AI backend endpoint to
// call. It's intentionally conservative: every field it fills is meant to be
// checked and corrected in the form, not trusted blindly.

const CATEGORY_KEYWORDS = {
    housing:       ['rent', 'maintenance', 'society fee', 'mortgage', 'housing'],
    food:          ['groceries', 'grocery', 'supermarket', 'vegetables', 'kirana'],
    transport:     ['uber', 'ola', 'cab', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'bus fare', 'parking'],
    utilities:     ['electricity', 'electric bill', 'wifi', 'internet', 'broadband', 'water bill', 'gas bill', 'mobile recharge', 'phone bill'],
    health:        ['doctor', 'medicine', 'pharmacy', 'hospital', 'gym', 'fitness', 'insurance premium'],
    entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'concert', 'subscription', 'streaming', 'game', 'gaming'],
    dining:        ['restaurant', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'zomato', 'swiggy', 'food delivery'],
    shopping:      ['clothes', 'clothing', 'shoes', 'amazon', 'flipkart', 'myntra', 'gift', 'decor'],
    emergency:     ['emergency fund', 'emergency deposit'],
    investments:   ['sip', 'mutual fund', 'fd', 'fixed deposit', 'rd', 'stocks', 'investment'],
  };
  
  const PAYMENT_KEYWORDS = {
    cash:       ['cash'],
    card:       ['card', 'credit card', 'debit card'],
    upi:        ['upi', 'gpay', 'google pay', 'phonepe', 'paytm upi'],
    netbanking: ['net banking', 'netbanking', 'neft', 'imps', 'bank transfer'],
    wallet:     ['wallet', 'paytm wallet', 'amazon pay'],
  };
  
  function findAmount(text) {
    // First number-looking token, optionally preceded by a currency symbol/code.
    const match = text.match(/(?:₹|\$|€|£|rs\.?|inr|usd)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
    if (!match) return null;
    const n = parseFloat(match[1].replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  
  function findMerchant(text) {
    const match = text.match(/\b(?:at|from|to)\s+([A-Z][A-Za-z0-9&'.\- ]{1,40}?)(?=\s+(?:for|on|via|using|paid|with|,|\.|$)|[,.]|$)/);
    return match ? match[1].trim() : null;
  }
  
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Word-boundary match so short keywords like "rd" or "cab" don't false-positive
  // inside unrelated words (e.g. "words", "cabin").
  function hasKeyword(lower, keyword) {
    return new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(lower);
  }
  
  function findPaymentMode(lower) {
    for (const [mode, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
      if (keywords.some(k => hasKeyword(lower, k))) return mode;
    }
    return null;
  }
  
  function findCategory(lower) {
    for (const [subKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(k => hasKeyword(lower, k))) return subKey;
    }
    return null;
  }
  
  function findTags(text) {
    const matches = text.match(/#([a-zA-Z0-9_-]+)/g) || [];
    return matches.map(t => t.slice(1));
  }
  
  function findRecurring(lower) {
    return /\b(every month|monthly|recurring|each month)\b/.test(lower);
  }
  
  // Returns a best-effort, partial bill draft. Any field it can't confidently
  // determine is left null/empty rather than guessed.
  export function parseExpenseText(text) {
    const trimmed = (text || '').trim();
    const lower = trimmed.toLowerCase();
  
    return {
      amount: findAmount(trimmed),
      merchant: findMerchant(trimmed),
      subCatKey: findCategory(lower),
      paymentMode: findPaymentMode(lower),
      tags: findTags(trimmed),
      recurring: findRecurring(lower),
      raw: trimmed,
    };
  }