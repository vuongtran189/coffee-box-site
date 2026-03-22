import pino from "pino";
import pinoHttp from "pino-http";

export function createLogger(env) {
  return pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.phone",
        "req.body.email"
      ],
      remove: true
    }
  });
}

export function createHttpLogger(logger) {
  return pinoHttp({
    logger,
    customSuccessMessage: function successMessage(req, res) {
      return `${req.method} ${req.url} ${res.statusCode}`;
    }
  });
}

