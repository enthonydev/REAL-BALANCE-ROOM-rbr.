import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { type AmortizationGoal, type AmortizationMethod, type ExtraordinaryPayment, type FinancingInput } from "@shared/finance";
import { addAmortization, createFinancing, deleteFinancing, ensureFirebaseUser, ensureLocalUser, getFinancingWithAmortizations, listFinancings, openDatabase, removeAmortization, updateFinancing } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isMethod(value: unknown): value is AmortizationMethod {
  return value === "price" || value === "sac";
}

function isGoal(value: unknown): value is AmortizationGoal {
  return value === "term" || value === "payment";
}

function readFinancingInput(body: Record<string, unknown>): FinancingInput {
  const input = { principal: Number(body.principal), annualRate: Number(body.annualRate), termMonths: Number(body.termMonths), method: body.method };
  if (!Number.isFinite(input.principal) || input.principal <= 0 || input.principal > 1_000_000_000 || !Number.isFinite(input.annualRate) || input.annualRate < 0 || input.annualRate > 100 || !Number.isInteger(input.termMonths) || input.termMonths <= 0 || input.termMonths > 600 || !isMethod(input.method)) throw new Error("Dados do financiamento inválidos.");
  return input as FinancingInput;
}

function readAmortization(body: Record<string, unknown>) {
  const payment = { month: Number(body.month), amount: Number(body.amount) };
  const goal = body.goal ?? "term";
  if (!Number.isInteger(payment.month) || payment.month <= 0 || payment.month > 600 || !Number.isFinite(payment.amount) || payment.amount <= 0 || payment.amount > 1_000_000_000 || !isGoal(goal)) throw new Error("Dados da amortização inválidos.");
  return { payment, goal } as { payment: ExtraordinaryPayment; goal: AmortizationGoal };
}

function readAmortizations(value: unknown, goal: AmortizationGoal) {
  if (!Array.isArray(value)) throw new Error("Lista de amortizações inválida.");
  return value.map((item) => readAmortization({ ...(item as Record<string, unknown>), goal }).payment);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const database = openDatabase();
  const localUser = ensureLocalUser(database);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  const authRequired = process.env.AUTH_REQUIRED === "true";
  const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (firebaseServiceAccount && getApps().length === 0) initializeApp({ credential: cert(JSON.parse(firebaseServiceAccount)) });
  app.use("/api", async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      if (authRequired) return res.status(401).json({ error: "Autenticação necessária." });
      res.locals.userId = localUser.id;
      return next();
    }
    try {
      if (!getApps().length) return res.status(503).json({ error: "Autenticação externa não configurada." });
      const token = await getAuth().verifyIdToken(authorization.slice(7));
      if (!token.email_verified) return res.status(403).json({ error: "Verifique seu e-mail antes de acessar o RBR." });
      const user = ensureFirebaseUser(database, token.uid, token.email, token.name);
      res.locals.userId = user.id;
      return next();
    } catch {
      return res.status(401).json({ error: "Token de autenticação inválido." });
    }
  });

  app.get("/api/financings", (_req, res) => {
    res.json(listFinancings(database, res.locals.userId));
  });

  app.post("/api/financings", (req, res) => {
    try {
      const input = readFinancingInput(req.body as Record<string, unknown>);
      const name = typeof req.body.name === "string" ? req.body.name : "Meu financiamento";
      const goal = req.body.goal ?? "term";
      if (!isGoal(goal)) throw new Error("Objetivo de amortização inválido.");
      const financing = createFinancing(database, res.locals.userId, input, name);
      const amortizations = readAmortizations(req.body.extraPayments ?? [], goal);
      return res.status(201).json(updateFinancing(database, res.locals.userId, financing.id, input, amortizations, goal));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível salvar o financiamento." });
    }
  });

  app.put("/api/financings/:id", (req, res) => {
    try {
      const input = readFinancingInput(req.body as Record<string, unknown>);
      const goal = req.body.goal ?? "term";
      if (!isGoal(goal)) throw new Error("Objetivo de amortização inválido.");
      const amortizations = readAmortizations(req.body.extraPayments, goal);
      const name = typeof req.body.name === "string" ? req.body.name : undefined;
      const financing = updateFinancing(database, res.locals.userId, req.params.id, input, amortizations, goal, name);
      return financing ? res.json(financing) : res.status(404).json({ error: "Financiamento não encontrado." });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o financiamento." });
    }
  });

  app.get("/api/financings/:id", (req, res) => {
    const financing = getFinancingWithAmortizations(database, res.locals.userId, req.params.id);
    return financing ? res.json(financing) : res.status(404).json({ error: "Financiamento não encontrado." });
  });

  app.delete("/api/financings/:id", (req, res) => {
    return deleteFinancing(database, res.locals.userId, req.params.id) ? res.status(204).send() : res.status(404).json({ error: "Financiamento não encontrado." });
  });

  app.post("/api/financings/:id/amortizations", (req, res) => {
    try {
      const { payment, goal } = readAmortization(req.body as Record<string, unknown>);
      const amortization = addAmortization(database, res.locals.userId, req.params.id, payment, goal);
      return amortization ? res.status(201).json(amortization) : res.status(404).json({ error: "Financiamento não encontrado." });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível salvar a amortização." });
    }
  });

  app.delete("/api/financings/:id/amortizations/:amortizationId", (req, res) => {
    const removed = removeAmortization(database, res.locals.userId, req.params.id, req.params.amortizationId);
    return removed ? res.status(204).send() : res.status(404).json({ error: "Amortização não encontrada." });
  });



  const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(__dirname, "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}

startServer().catch(console.error);
