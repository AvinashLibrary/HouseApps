"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonStore = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
class JsonStore {
    constructor(root = config_1.config.dataDir) {
        this.root = root;
    }
    resolve(key) {
        return path_1.default.join(this.root, `${key}.json`);
    }
    async read(key) {
        try {
            const raw = await promises_1.default.readFile(this.resolve(key), 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async write(key, data) {
        const file = this.resolve(key);
        await promises_1.default.mkdir(path_1.default.dirname(file), { recursive: true });
        await promises_1.default.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
    }
}
exports.JsonStore = JsonStore;
//# sourceMappingURL=store.js.map