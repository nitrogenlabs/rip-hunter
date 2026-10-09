import { readFileSync } from "node:fs";
import { createServer, request } from "node:https";
import { afterEach, describe, expect, it } from "vitest";

import { httpsBytesRequest } from "./nodeHttps.js";

import type { Server } from "node:https";

const key = readFileSync(new URL("./test-fixtures/key.pem", import.meta.url));
const cert = readFileSync(new URL("./test-fixtures/cert.pem", import.meta.url));
let server: Server | undefined;
afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
});
const requestImplementation = ((url, options, callback) =>
  request(
    url,
    { ...options, rejectUnauthorized: false },
    callback,
  )) as typeof request;

describe("real local TLS byte transport", () => {
  it("keeps an active socket alive beyond its idle setting, preserving all bytes", async () => {
    const bytes = Buffer.from(
      Array.from({ length: 256 }, (_value, index) => index),
    );
    server = createServer({ cert, key }, (incoming, response) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
      incoming.on("end", () => {
        expect(Buffer.concat(chunks)).toEqual(Buffer.from([0, 128, 255]));
        response.write(bytes.subarray(0, 64));
        const second = setTimeout(
          () => response.write(bytes.subarray(64, 128)),
          50,
        );
        const third = setTimeout(
          () => response.write(bytes.subarray(128, 192)),
          100,
        );
        const last = setTimeout(() => response.end(bytes.subarray(192)), 150);
        response.on("close", () => {
          clearTimeout(second);
          clearTimeout(third);
          clearTimeout(last);
        });
      });
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing local port");
    const started = Date.now();
    const result = await httpsBytesRequest(
      `https://127.0.0.1:${address.port}`,
      {
        idleTimeout: 100,
        maxBytes: 256,
        method: "POST",
        payload: Buffer.from([0, 128, 255]),
        requestImplementation,
      },
    );
    expect(result).toEqual(bytes);
    expect(Date.now() - started).toBeGreaterThanOrEqual(140);
  });
  it("rejects a genuinely idle socket without replay", async () => {
    let calls = 0;
    server = createServer({ cert, key }, (_incoming, response) => {
      calls++;
      response.write(Buffer.from([0]));
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing local port");
    await expect(
      httpsBytesRequest(`https://127.0.0.1:${address.port}`, {
        idleTimeout: 30,
        maxBytes: 256,
        payload: Buffer.alloc(0),
        requestImplementation,
      }),
    ).rejects.toMatchObject({ kind: "timeout" });
    expect(calls).toBe(1);
  });
});
