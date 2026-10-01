/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
export class ApiError extends Error {
  readonly responseBody?: unknown;
  readonly status?: number;
  source: Error;
  errors: string[];

  constructor(list: Array<{message: string}>, error: Error, response?: {responseBody?: unknown; status: number}) {
    super('API Error');
    this.source = error;
    this.responseBody = response?.responseBody;
    this.status = response?.status;
    this.errors = list ? list.map((errorItem) => errorItem.message) : [];
  }
}
