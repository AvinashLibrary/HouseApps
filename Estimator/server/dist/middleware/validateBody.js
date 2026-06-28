"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
// Generic over P (route params) so validate can be chained with typed handlers:
//   router.post('/', validate<GroupIdParam>(schema), async (req: Request<GroupIdParam>) => ...)
// Without the generic, validate returns RequestHandler<ParamsDictionary> which is
// incompatible with RequestHandler<GroupIdParam> and TypeScript rejects the chain.
function validate(schema) {
    return (req, res, next) => {
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
//# sourceMappingURL=validateBody.js.map