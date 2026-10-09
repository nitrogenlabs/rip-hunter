import { EventEmitter } from "node:events";
import {Socket} from "node:net";
import { describe, expect, it, vi } from "vitest";

import { HttpsBytesError, httpsBytesRequest } from "./nodeHttps.js";

import type { IncomingMessage } from "node:http";
import type { request } from "node:https";

const fixture = (status = 200) => {
  const response = Object.assign(new EventEmitter(), {
    headers: {},
    resume: vi.fn(),
    statusCode: status,
  });
  const outgoing = Object.assign(new EventEmitter(), {
    destroy: vi.fn(),
    end: vi.fn(),
  });
  const binding = vi.fn((_url, _options, callback) => {
    callback(response);
    return outgoing;
  });
  return {
    binding,
    outgoing,
    response,
    requestImplementation: binding as unknown as typeof request,
  };
};
const options = {
  idleTimeout: 180000,
  maxBytes: 256,
  method: "POST",
  payload: Buffer.from([0, 128, 255]),
};

describe("Node HTTPS socket idle byte lifecycle", () => {
  it("preserves every byte, payload and socket idle option with immutable headers", async () => {
    const f = fixture();
    const headers = { "x-fixture": "original", "x-values": ["first"] };
    const pending = httpsBytesRequest("https://fixture.invalid/audio", {
      ...options,
      headers,
      requestImplementation: f.requestImplementation,
    });
    headers["x-fixture"] = "changed";
    headers["x-values"].push("changed");
    const bytes = Buffer.from(
      Array.from({ length: 256 }, (_value, index) => index),
    );
    f.response.emit("data", bytes.subarray(0, 123));
    f.response.emit("data", bytes.subarray(123));
    f.response.emit("end");
    expect(await pending).toEqual(bytes);
    expect(f.binding).toHaveBeenCalledWith(
      "https://fixture.invalid/audio",
      expect.objectContaining({
        headers: { "x-fixture": "original", "x-values": ["first"] },
        method: "POST",
        timeout: 180000,
      }),
      expect.any(Function),
    );
    expect(f.outgoing.end).toHaveBeenCalledExactlyOnceWith(options.payload);
  });
  it("accepts empty body and zero cap", async () => {
    const f = fixture(201);
    const pending = httpsBytesRequest("https://fixture.invalid", {
      ...options,
      maxBytes: 0,
      requestImplementation: f.requestImplementation,
    });
    f.response.emit("end");
    expect(await pending).toEqual(Buffer.alloc(0));
  });
  it("inspects status before reading and retains domain rejection identity", async () => {
    const f = fixture(429);
    const failure = new Error("domain rejection");
    const pending = httpsBytesRequest("https://fixture.invalid", {
      ...options,
      inspectResponse: (response: IncomingMessage) => {
        expect(response.statusCode).toBe(429);
        throw failure;
      },
      requestImplementation: f.requestImplementation,
    });
    await expect(pending).rejects.toBe(failure);
    expect(f.response.resume).toHaveBeenCalledOnce();
    f.response.emit("error", new Error("late"));
  });
  it("rejects oversize output without returning partial bytes", async () => {
    const f = fixture();
    const pending = httpsBytesRequest("https://fixture.invalid", {
      ...options,
      maxBytes: 1,
      requestImplementation: f.requestImplementation,
    });
    f.response.emit("data", Buffer.from([0]));
    f.response.emit("data", Buffer.from([255]));
    f.response.emit("end");
    await expect(pending).rejects.toMatchObject({ kind: "limit" });
    expect(f.outgoing.destroy).toHaveBeenCalledOnce();
  });
  it("uses socket timeout event rather than an absolute wall-clock deadline", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture();
      const pending = httpsBytesRequest("https://fixture.invalid", {
        ...options,
        idleTimeout: 10,
        requestImplementation: f.requestImplementation,
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(f.outgoing.destroy).not.toHaveBeenCalled();
      f.outgoing.emit("timeout");
      await expect(pending).rejects.toMatchObject({ kind: "timeout" });
      expect(f.outgoing.destroy).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
  it.each(["error", "aborted"] as const)(
    "rejects response %s even if end follows",
    async (event) => {
      const f = fixture();
      const pending = httpsBytesRequest("https://fixture.invalid", {
        ...options,
        requestImplementation: f.requestImplementation,
      });
      const failure = new Error("body failed");
      f.response.emit(event, failure);
      f.response.emit("end");
      if (event === "error") await expect(pending).rejects.toBe(failure);
      else await expect(pending).rejects.toBeInstanceOf(HttpsBytesError);
    },
  );
  it("retains request and synchronous binding failures", async () => {
    const f = fixture();
    const pending = httpsBytesRequest("https://fixture.invalid", {
      ...options,
      requestImplementation: f.requestImplementation,
    });
    const failure = new Error("connection failed");
    f.outgoing.emit("error", failure);
    await expect(pending).rejects.toBe(failure);
    const throws = (() => {
      throw failure;
    }) as unknown as typeof request;
    await expect(
      httpsBytesRequest("https://fixture.invalid", {
        ...options,
        requestImplementation: throws,
      }),
    ).rejects.toBe(failure);
  });
  it.each([-1, Infinity, NaN, 1.5])(
    "rejects invalid cap %s before sending",
    async (maxBytes) => {
      const f = fixture();
      await expect(
        httpsBytesRequest("https://fixture.invalid", {
          ...options,
          maxBytes,
          requestImplementation: f.requestImplementation,
        }),
      ).rejects.toBeInstanceOf(RangeError);
      expect(f.binding).not.toHaveBeenCalled();
    },
  );
  it.each([-1, Infinity, NaN, 1.5, 2147483648])(
    "rejects unsupported idle timeout %s before sending",
    async (idleTimeout) => {
      const f = fixture();
      await expect(
        httpsBytesRequest("https://fixture.invalid", {
          ...options,
          idleTimeout,
          requestImplementation: f.requestImplementation,
        }),
      ).rejects.toBeInstanceOf(RangeError);
      expect(f.binding).not.toHaveBeenCalled();
    },
  );
  it("supports omitted headers/method/idle timeout and ignores events after success", async () => {
    const f = fixture();
    const pending = httpsBytesRequest("https://fixture.invalid", {
      maxBytes: 1,
      payload: Buffer.alloc(0),
      requestImplementation: f.requestImplementation,
    });
    f.response.emit("end");
    await pending;
    f.response.emit("data", Buffer.from([1, 2]));
    f.response.emit("aborted");
    f.outgoing.emit("timeout");
    expect(f.outgoing.destroy).not.toHaveBeenCalled();
  });
});


it.each([false, true])('keeps rejected response cleanup separate from settlement (drained=%s)', async drained => {
  const guard = vi.spyOn(Socket.prototype, 'connect').mockImplementation(() => {throw new Error('Outbound connections forbidden');});
  try {
    const f = fixture(429);
    const rejection = new Error('original domain rejection');
    const pending = httpsBytesRequest('https://fixture.invalid/audio', {...options, inspectResponse: () => {throw rejection;}, requestImplementation: f.requestImplementation});
    await expect(pending).rejects.toBe(rejection);
    if(drained) f.response.emit('end');
    f.outgoing.emit('timeout');
    expect(f.outgoing.destroy).toHaveBeenCalledTimes(drained ? 0 : 1);
    await expect(pending).rejects.toBe(rejection);
    expect(f.response.resume).toHaveBeenCalledOnce();
    expect(f.outgoing.end).toHaveBeenCalledExactlyOnceWith(options.payload);
    expect(guard).not.toHaveBeenCalled();
  } finally {guard.mockRestore();}
});
