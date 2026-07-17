import  { OcrEngine } from './ocr-engine';
import  { LlmFallbackRepository, LlmFields } from './llm-fallback.repository';
import  { cleanText } from './text-cleanup';
import { extractWithRegex, computeOverallConfidence, type ExtractedFields } from './regex-extractor';
import  { matchMerchantTemplate, applyMerchantTemplate } from './merchant-templates';
import  { validateFields } from './validator';
import  { categorize } from './categorizer';
import { config } from '../../core/config';
import type { OcrResult } from '../../types/constant_type';
import { any } from 'zod';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

// Only fills fields the regex pass left null/empty — an LLM invoked to
// resolve one weak field (say, a missing date) should never silently
// clobber a total or merchant regex already found confidently.
function fillGaps(fields: ExtractedFields, llm: LlmFields): ExtractedFields {
  return {
    merchant: fields.merchant ?? llm.merchant,
    invoiceNumber: fields.invoiceNumber ?? llm.invoiceNumber,
    date: fields.date ?? llm.date,
    currency: fields.currency ?? llm.currency,
    subtotal: fields.subtotal ?? llm.subtotal,
    tax: fields.tax ?? llm.tax,
    discount: fields.discount ?? llm.discount,
    total: fields.total ?? llm.total,
    items: fields.items.length > 0 ? fields.items : llm.items,
  };
}

export class OcrService {
  constructor(
    private ocrEngine: OcrEngine,
    private llmFallback: LlmFallbackRepository,
  ) {}

  async scan(file: UploadedFile): Promise<any> {
    // Step 1 — local, free OCR
    // const rawText = await this.ocrEngine.recognize(file.buffer);

    // OCR produced nothing at all. The AI router only accepts text, so there's
    // no fallback left to try here — return the empty, zero-confidence result
    // rather than silently reaching for some other path.
    // if (!rawText.trim()) {
    //   console.warn('[ocr] local OCR returned no text — nothing to send to the AI router, returning empty result');
    //   const empty = {
    //     merchant: null, invoiceNumber: null, date: null, currency: null,
    //     subtotal: null, tax: null, discount: null, total: null, items: [] as { name: string; amount: number | null }[],
    //   };
    //   return { ...empty, category: null, confidence: 0 };
    // }

    // // Step 2 — noise removal
    // const cleaned = cleanText(rawText);

    // // Step 3 — regex-first extraction
    // const regexResult = extractWithRegex(cleaned);

    // // Step 5 — merchant template, if this looks like a known chain (tried
    // // alongside/after generic regex; only overrides what it's confident about)
    // const template = matchMerchantTemplate(cleaned);
    // const { fields: templatedFields, fieldConfidence } = applyMerchantTemplate(
    //   regexResult.fields, regexResult.fieldConfidence, template, cleaned,
    // );

    // // Step 4 — confidence scoring
    // let fields = templatedFields;
    // const overallConfidence = computeOverallConfidence(fieldConfidence);

    // // Step 6 — LLM fallback, text-only, only when needed
    // let usedLLM = false;
    // if (overallConfidence < config.ocrConfidenceThreshold) {
    //   usedLLM = true;
    //   const reason = `overall confidence ${overallConfidence} below threshold ${config.ocrConfidenceThreshold}`;
    //   console.log(`[ocr] invoking LLM fallback — ${reason}`);
      try {
        const result = await this.llmFallback.extractFromImage(file.buffer,'image/jpeg');
        console.log(result);
        return result;
        // fields = fillGaps(fields, llmFields);
      } catch (e) {
        console.warn('[ocr] LLM fallback failed, continuing with regex-only result:', (e as Error).message);
      }
    // } else {
    //   console.log(`[ocr] confidence ${overallConfidence} met threshold — skipped LLM fallback (${template ? `matched ${template.name}` : 'generic regex'})`);
    // }

    // Step 7 — validation
    // const { fields: validated, issues } = validateFields(fields);
    // if (issues.length) console.warn('[ocr] validation issues:', issues);

    // Step 8 — categorization (never an LLM call)
    // const category = categorize(validated.merchant);

    // Step 10 — normalized output
    // const result: OcrResult = { ...validated, category, confidence: overallConfidence };
    // if (config.ocrDebug) result.rawText = rawText;

    // console.log(`[ocr] done — usedLLM=${usedLLM} confidence=${overallConfidence} merchant=${validated.merchant ?? 'null'} total=${validated.total ?? 'null'}`);
   
  }
}