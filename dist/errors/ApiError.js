export class ApiError extends Error {
    constructor(list, error) {
        super('API Error');
        this.source = error;
        this.errors = list ? list.map((errorItem) => errorItem.message) : [];
    }
}
//# sourceMappingURL=ApiError.js.map