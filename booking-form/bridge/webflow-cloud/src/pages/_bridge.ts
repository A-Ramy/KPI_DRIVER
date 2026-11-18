// Every route hands the request to the bridge in ../worker.js, with the environment's variables
// (HL_TOKEN secret, optional LOCATION_ID / CALENDAR_ID / ALLOWED_ORIGINS / TO_NOTIFY).
import type { APIRoute } from "astro";
// @ts-ignore plain JS module
import bridge from "../../../worker.js";

export const handle: APIRoute = ({ request, locals }) => {
  const env = ((locals as any).runtime && (locals as any).runtime.env) || {};
  return bridge.fetch(request, env);
};
