import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { OcrService } from './ocr.service';
import type { GroupIdParam } from '../../types/constant_type';
import { ok, err } from '../../core/response';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — plenty for a phone photo of a receipt
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files can be scanned (JPG, PNG, etc.) — PDFs are not supported by OCR.'));
    }
    cb(null, true);
  },
});

// multer reports errors (wrong type, too large) via the callback rather than
// a thrown exception the route handler's try/catch would see, so it needs its
// own wrapper to keep every response in the same { success, data, error } shape.
function uploadReceipt(req: Request, res: Response, next: NextFunction) {
  upload.single('receipt')(req, res, (uploadErr: unknown) => {
    if (uploadErr) return res.status(400).json(err(uploadErr));
    next();
  });
}

export function ocrRoutes(service: OcrService): Router {
  const router = Router({ mergeParams: true });

  // POST /api/groups/:groupId/ocr  — multipart/form-data, file field named "receipt"
  router.post('/', uploadReceipt, async (req: Request<GroupIdParam>, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json(err('No receipt image uploaded — expected a multipart field named "receipt".'));
      }
      const data = await service.scan(req.file);
      res.status(200).json(ok(data));
    } catch (e) {
      res.status(500).json(err(e));
    }
  });

  return router;
}
