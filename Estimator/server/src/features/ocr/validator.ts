import type { ExtractedFields } from './regex-extractor';

export interface ValidationIssue {
  field: string;
  message: string;
}

const ROUNDING_TOLERANCE = 1; // currency units — allow for OCR/rounding noise

export function validateFields(input: ExtractedFields): { fields: ExtractedFields; issues: ValidationIssue[] } {
  const fields = { ...input };
  const issues: ValidationIssue[] = [];

  if (fields.total !== null && fields.total <= 0) {
    issues.push({ field: 'total', message: 'total must be positive' });
    fields.total = null;
  }
  if (fields.tax !== null && fields.tax < 0) {
    issues.push({ field: 'tax', message: 'tax cannot be negative' });
    fields.tax = null;
  }
  if (fields.discount !== null && fields.discount < 0) {
    issues.push({ field: 'discount', message: 'discount cannot be negative' });
    fields.discount = null;
  }
  if (fields.date !== null && Number.isNaN(Date.parse(fields.date))) {
    issues.push({ field: 'date', message: `"${fields.date}" is not a parseable date` });
    fields.date = null;
  }

  // subtotal - discount should reconcile with total, within rounding tolerance.
  // A mismatch doesn't necessarily mean `total` is wrong (tax could explain
  // the gap) — it's logged as a signal, not auto-corrected, since guessing
  // which of three numbers is the "wrong" one would be worse than leaving all
  // three as extracted and letting the user's own review catch it.
  if (fields.subtotal !== null && fields.discount !== null && fields.total !== null) {
    const expected = fields.subtotal - fields.discount;
    if (Math.abs(expected - fields.total) > ROUNDING_TOLERANCE + (fields.tax ?? 0)) {
      issues.push({
        field: 'total',
        message: `subtotal (${fields.subtotal}) minus discount (${fields.discount}) doesn't reconcile with total (${fields.total})`,
      });
    }
  }

  return { fields, issues };
}