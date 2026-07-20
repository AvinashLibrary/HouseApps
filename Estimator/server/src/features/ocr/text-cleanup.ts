// Step 2 of the pipeline — discard junk lines, keep everything that could be
// a real receipt field. Patterns are deliberately narrow: e.g. we strip
// "GSTIN: 27AAAAA..." (a registration number) and legal disclaimer sentences
// mentioning GST, but never a real "GST 5%: 18.00" tax line — regex_extractor
// still needs that line intact.
const NOISE_PATTERNS: RegExp[] = [
    /^https?:\/\//i,                                    // browser URL
    /^www\./i,
    /^\d{1,2}:\d{2}\s*(am|pm)?$/i,                       // bare clock time (status bar)
    /^\d{1,3}\s*%$/,                                     // bare battery percentage
    /wi-?fi/i,
    /registered office/i,
    /corporate office/i,
    /\bcin\b\s*:/i,                                      // Corporate Identification Number
    /\bgstin\b\s*:?\s*[0-9a-z]/i,                        // GST registration number line, not a tax amount
    /terms\s*(and|&)\s*conditions/i,
    /this is a computer generated/i,
    /goods once sold/i,
    /\bfssai\s*(lic(ense)?)?\s*(no\.?|number)?\s*:/i,
    /not valid for legal/i,
    /thank you for (shopping|visiting)/i,
  ];
  
  export function cleanText(rawText: string): string {
    const lines = rawText.split(/\r?\n/);
    return lines
      .filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        return !NOISE_PATTERNS.some(p => p.test(trimmed));
      })
      .join('\n');
  }