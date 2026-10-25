import express, { type ErrorRequestHandler } from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";
import { z } from "zod";
import { validate } from "./validate.middleware";
import { loginSchema } from "../validators/auth.validators";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.post("/login", validate(loginSchema), (req, res) => res.json(req.body));
  app.post("/items/:id", validate(z.object({
    body: z.object({ fields: z.record(z.string(), z.string()) }),
    query: z.object({ limit: z.coerce.number().int().min(1).max(20) }),
    params: z.object({ id: z.string().uuid() }),
  })), (req, res) => res.json({ body: req.body, query: req.query, params: req.params }));
  app.post("/partial/:id", validate(z.object({ body: z.object({ name: z.string() }) })),
    (req, res) => res.json({ params: req.params, query: req.query }));
  app.use(((error, _req, res, _next) => res.status(error.statusCode ?? 500).json({ code: error.code })) as ErrorRequestHandler);
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

it("rejects invalid auth input and strips unexpected security fields", async () => {
  expect((await post("/login", { email: "invalid", password: "x" })).status).toBe(400);
  const response = await post("/login", { email: "user@example.com", password: "long-password", role: "admin" });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ email: "user@example.com", password: "long-password" });
});

it("validates dynamic records, params and query on a real Express 5 request", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const response = await post(`/items/${id}?limit=2`, { fields: { custom: "value" } });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ body: { fields: { custom: "value" } }, params: { id }, query: { limit: 2 } });
  expect((await post(`/items/${id}?limit=100`, { fields: { custom: "value" } })).status).toBe(400);
});

it("preserves route params/query for schemas validating only the body", async () => {
  const response = await post("/partial/keep?search=value", { name: "User" });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ params: { id: "keep" }, query: { search: "value" } });
});
