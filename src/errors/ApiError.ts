/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
export class ApiError extends Error {
  source: Error;
  errors: string[];

  constructor(list, error) {
    super('API Error');
    this.source = error;
    this.errors = list ? list.map((errorItem: Error) => errorItem.message) : [];
  }
}
