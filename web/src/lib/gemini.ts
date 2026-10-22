// Gemini calls with retry + model fallback.
// Google returns 503 ("high demand") / 429 (rate limit) during spikes; these are temporary,
// so we retry briefly and then fall back to lighter models instead of failing the user.

export const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

export const AI_BUSY_MESSAGE =
  "Our AI assistant is very busy right now. Please try again in a minute.";

function isTemporary(err: any): boolean {
  const msg = String(err?.message || "");
  const status = err?.status ?? Number(msg.match(/\[(\d{3})[^\]]*\]/)?.[1]);
  return [429, 500, 502, 503, 504].includes(status) || /overloaded|high demand|unavailable|quota|rate limit/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `call(modelName)` on each model in turn, retrying temporary errors.
 * Returns the result and the model that produced it; throws AiBusyError if all are busy.
 */
export async function withGeminiFallback<T>(call: (model: string) => Promise<T>): Promise<{ result: T; model: string }> {
  let lastErr: any;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return { result: await call(model), model };
      } catch (err: any) {
        lastErr = err;
        if (!isTemporary(err)) throw err;
        console.warn(`[gemini] ${model} attempt ${attempt + 1} failed: ${String(err?.message).slice(0, 120)}`);
        await sleep(attempt === 0 ? 800 : 1600);
      }
    }
  }
  throw new AiBusyError(lastErr);
}

export class AiBusyError extends Error {
  constructor(public cause?: unknown) {
    super(AI_BUSY_MESSAGE);
  }
}
