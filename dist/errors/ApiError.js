"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiError extends Error {
    constructor(list, error) {
        super('API Error');
        this.source = error;
        this.errors = list ? list.map((errorItem) => errorItem.message) : [];
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=ApiError.js.map