export declare class ApiError extends Error {
    source: Error;
    errors: string[];
    constructor(list: any, error: any);
}
