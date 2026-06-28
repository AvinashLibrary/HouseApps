"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: Number(process.env.PORT ?? 4000),
    dataDir: process.env.DATA_DIR ?? './data',
    allowedOrigin: process.env.ALLOWED_ORIGIN ?? 'http://127.0.0.1:5500',
};
//# sourceMappingURL=config.js.map