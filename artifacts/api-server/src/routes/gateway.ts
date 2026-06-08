import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/gateway/balance", requireAdmin, async (req, res): Promise<void> => {
  const token = process.env.GATEWAYAPI_TOKEN;
  if (!token) {
    res.status(502).json({ error: "GATEWAYAPI_TOKEN is not configured" });
    return;
  }

  let response: Response;
  let responseText: string;
  try {
    response = await fetch("https://gatewayapi.com/rest/me", {
      headers: { Authorization: `Token ${token}` },
    });
    responseText = await response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ msg }, "GatewayAPI /rest/me unreachable");
    res.status(502).json({ error: `GatewayAPI unreachable: ${msg}` });
    return;
  }

  if (!response.ok) {
    req.log.warn({ status: response.status, body: responseText }, "GatewayAPI /rest/me error");
    res.status(502).json({ error: `GatewayAPI returned ${response.status}` });
    return;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    res.status(502).json({ error: "Invalid JSON from GatewayAPI" });
    return;
  }

  res.json({
    credit: String(data.credit ?? "0"),
    currency: String(data.currency ?? "EUR"),
  });
});

export default router;
