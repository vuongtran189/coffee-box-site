import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./config.js";
import { createHttpLogger, createLogger } from "./logger.js";
import { healthRouter } from "./routes/health.js";
import { v1Router } from "./routes/v1.js";
import { getMongo } from "./mongo.js";

const env = loadEnv();
const logger = createLogger(env);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetDistDir = path.resolve(__dirname, "../../../packages/widget/dist");

app.disable("x-powered-by");
app.use(createHttpLogger(logger));
// Allow this API to serve embeddable assets (widget.js/widget.css) cross-origin.
// Helmet defaults to Cross-Origin-Resource-Policy: same-origin which blocks <script src="..."> from other sites.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
const corsOptions = {
  origin: function corsOrigin(origin, cb) {
    if (!origin) return cb(null, true);
    // If CORS_ORIGINS isn't configured, default to allow-all to avoid breaking the public widget.
    if (env.corsOrigins.length === 0) return cb(null, true);
    return cb(null, env.corsOrigins.includes(origin));
  },
  credentials: false,
  methods: ["GET", "HEAD", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-widget-key"],
  optionsSuccessStatus: 204,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// Serves the embeddable widget assets after `npm run build:widget`.
app.use(express.static(widgetDistDir, { index: false, fallthrough: true }));

app.use(healthRouter());
app.use(v1Router({ env }));

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found", path: req.path });
});

app.use((err, _req, res, _next) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ ok: false, error: "Server error" });
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API listening");
});

// Warm up DB connection (best-effort).
getMongo(env).catch((err) => {
  logger.error({ err }, "MongoDB connection failed");
});
