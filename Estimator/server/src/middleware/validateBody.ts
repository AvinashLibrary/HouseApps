import { Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ZodSchema } from "zod";

// Generic over P (route params) so validate can be chained with typed handlers:
//   router.post('/', validate<GroupIdParam>(schema), async (req: Request<GroupIdParam>) => ...)
// Without the generic, validate returns RequestHandler<ParamsDictionary> which is
// incompatible with RequestHandler<GroupIdParam> and TypeScript rejects the chain.
export function validate<P extends ParamsDictionary = ParamsDictionary>(schema: ZodSchema) {
  return (req: Request<P>, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
    }
    req.body = result.data;
    next();
  };
}
