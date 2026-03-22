export function requireWidgetKey(env) {
  const requiredKey = String(env.WIDGET_PUBLIC_KEY || "").trim();
  return function widgetKeyMiddleware(req, res, next) {
    if (!requiredKey) return res.status(500).json({ ok: false, error: "Server misconfigured" });

    const provided = String(req.headers["x-widget-key"] || "").trim();
    if (!provided || provided !== requiredKey) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    next();
  };
}

