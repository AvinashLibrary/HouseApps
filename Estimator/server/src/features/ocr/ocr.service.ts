import type { OcrRepository } from './ocr.repository';
import type { OcrResult } from '../../types/constant_type';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export class OcrService {
  constructor(private repo: OcrRepository) {}

  // Gemini returns already-validated structured fields (see
  // ocr.repository.ts's parseModelJson), so there's no regex/heuristic
  // parsing left to do here — this stays a thin pass-through on purpose.
  async scan(file: UploadedFile): Promise<OcrResult> {
    return this.repo.extractReceiptData(file.buffer, file.mimetype);
  }
}