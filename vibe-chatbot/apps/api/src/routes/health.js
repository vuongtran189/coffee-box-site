import express from "express";

export function healthRouter() {
  const router = express.Router();

  router.get("/health", async (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}

