export default class APIError extends Error {
  constructor(list, error) {
    super('API Error');
    this.source = error;
    this.errors = list ? list.map(o => o.message) : [];
  }
}
