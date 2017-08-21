export class ApiError extends Error {
  source: Error;
  errors: string[];
  
  constructor(list, error) {
    super('API Error');
    this.source = error;
    this.errors = list ? list.map((errorItem: Error) => errorItem.message) : [];
  }
}
