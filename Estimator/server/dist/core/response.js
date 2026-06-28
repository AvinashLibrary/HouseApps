"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.err = err;
function ok(data) {
    return { success: true, data, error: null };
}
function err(e) {
    const message = e instanceof Error ? e.message : String(e);
    return { success: false, data: null, error: message };
}
//# sourceMappingURL=response.js.map