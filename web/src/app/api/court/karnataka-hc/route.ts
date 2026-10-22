import { NextRequest, NextResponse } from "next/server";

// Court lookups and AI retries can take longer than the default serverless limit
export const maxDuration = 60;

// Proxy for the High Court of Karnataka public case-status search
// (https://judiciary.karnataka.gov.in/casemenu.php).
// The court's captcha is shown to the user and solved by them; we only relay it.
const HC = "https://judiciary.karnataka.gov.in";
const UA = "Mozilla/5.0 (EzLex case tracker)";

function sessionFrom(res: Response): string | null {
  const m = (res.headers.get("set-cookie") || "").match(/PHPSESSID=([^;]+)/);
  return m ? m[1] : null;
}

// Strip anything executable from the court's HTML and make its links absolute
function sanitize(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|nav|button|select|textarea)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|link|meta|base|input)[^>]*\/?>/gi, "")
    // Sections the court fills in later with its own scripts would stay empty here
    .replace(/<div[^>]*display\s*:\s*none[^>]*>\s*<\/div>/gi, "")
    .replace(/\s(on\w+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src|action|formaction)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (_m, attr: string, _v, dq?: string, sq?: string, uq?: string) => {
        const v = (dq ?? sq ?? uq ?? "").trim();
        if (/^(javascript|vbscript|data):/i.test(v.replace(/[\s\u0000-\u001f]/g, ""))) return ` ${attr}="#"`;
        const abs = /^(https?:|#|mailto:)/i.test(v) ? v : `${HC}/${v.replace(/^\.?\//, "")}`;
        return ` ${attr}="${abs.replace(/"/g, "&quot;")}"`;
      })
    .replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  try {
    if (action === "types") {
      const res = await fetch(`${HC}/loadcasetype.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "type=H",
        cache: "no-store",
      });
      const html = await res.text();
      const types = [...html.matchAll(/<option value='([^']+)'[^>]*>([^<]+)<\/option>/g)]
        .filter((m) => m[1] !== "0")
        .map((m) => ({ value: m[1], label: m[2].trim() }));
      return NextResponse.json({ types });
    }

    if (action === "captcha") {
      // A fresh captcha starts a fresh court session; the session id travels back with the search
      const res = await fetch(`${HC}/captcha.php`, { headers: { "User-Agent": UA }, cache: "no-store" });
      const session = sessionFrom(res);
      if (!res.ok || !session) throw new Error("Court website did not return a captcha.");
      const image = Buffer.from(await res.arrayBuffer()).toString("base64");
      return NextResponse.json({ session, image: `data:image/jpeg;base64,${image}` });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e: any) {
    console.error("[karnataka-hc GET]", e);
    return NextResponse.json({ error: "The High Court website is not responding. Please try again." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, bench, caseType, caseNo, caseYear, captcha } = await req.json();

    // Strict validation: these are joined with '*' for the court, so nothing else may slip in
    if (!/^[A-Za-z0-9,-]{10,128}$/.test(session || "")) return bad("Captcha expired. Please refresh it.");
    if (!/^[BDK]$/.test(bench || "")) return bad("Select a bench.");
    if (!/^[A-Za-z0-9.()\-]{1,20}$/.test(caseType || "")) return bad("Select a case type.");
    if (!/^\d{1,6}$/.test(caseNo || "")) return bad("Enter a valid case number.");
    if (!/^\d{4}$/.test(caseYear || "") || +caseYear < 1950 || +caseYear > new Date().getFullYear()) return bad("Enter a valid case year.");
    if (!/^\d{6}$/.test(captcha || "")) return bad("Enter the 6-digit captcha.");

    const res = await fetch(`${HC}/casestatus.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Cookie: `PHPSESSID=${session}`,
        Referer: `${HC}/casemenu.php`,
      },
      body: new URLSearchParams({ benchval: [bench, caseType, caseNo, caseYear, captcha].join("*") }).toString(),
      cache: "no-store",
    });
    const text = (await res.text()).trim();

    if (text === "2") {
      return NextResponse.json({ error: "Invalid captcha. A new one has been loaded.", code: "BAD_CAPTCHA" }, { status: 400 });
    }
    if (!res.ok || !text) throw new Error(`Court responded ${res.status}`);

    const notFound = /no\s+record|not\s+found|no\s+data/i.test(text) && text.length < 600;
    if (notFound) return NextResponse.json({ found: false, html: "", sections: [] });

    const sections = await loadSections(text, session);
    const { status, fields } = parseSummary(text);
    return NextResponse.json({ found: true, status, fields, html: fields.length ? "" : sanitize(text), sections });
  } catch (e: any) {
    console.error("[karnataka-hc POST]", e);
    return NextResponse.json({ error: "The High Court website is not responding. Please try again." }, { status: 502 });
  }
}

// The court lazy-loads each section (Prayer, Party, Daily Orders…) from case_details_div.php
// using encrypted ids embedded in the summary; fetch them all up front.
async function loadSections(raw: string, session: string) {
  const attr = (id: string) =>
    raw.match(new RegExp(`id=["']${id}["'][^>]*value=["']([^"']*)`))?.[1] ||
    raw.match(new RegExp(`value=["']([^"']*)["'][^>]*id=["']${id}["']`))?.[1] || "";
  const caseNum = attr("case_no_val");
  const frNum = attr("fr_no_val");
  const lda = (raw.match(/id=["']last_date_of_action["'][^>]*>([^<]*)/)?.[1] || "").trim();

  const list = [...raw.matchAll(/divopen\(\s*["'](\w+)["']\s*\)[^>]*>\s*([^<]+?)\s*</g)]
    .map((m) => ({ id: m[1], title: m[2].replace(/&amp;/g, "&").trim() }))
    .filter((s) => s.id !== "H"); // "Case Information" is the summary itself
  if (!caseNum || list.length === 0) return [];

  const fetchOne = async ({ id, title }: { id: string; title: string }) => {
    try {
      const res = await fetch(`${HC}/case_details_div.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Cookie: `PHPSESSID=${session}`,
          Referer: `${HC}/casemenu.php`,
        },
        body: new URLSearchParams({ casenum: id === "H8" ? frNum : caseNum, lda, div: id }).toString(),
        cache: "no-store",
      });
      const html = sanitize((await res.text()).trim());
      const plain = html.replace(/<[^>]+>|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      const empty = !plain || /RECORD_NOT_FOUND|no data found/i.test(plain) && plain.length < 120;
      return { id, title, html: empty ? "" : html };
    } catch {
      return { id, title, html: "", failed: true };
    }
  };

  // Small batches: be gentle with the court's server
  const out: Awaited<ReturnType<typeof fetchOne>>[] = [];
  for (let i = 0; i < list.length; i += 4) {
    out.push(...(await Promise.all(list.slice(i, i + 4).map(fetchOne))));
  }
  return out;
}

// Summary block is "<div class=col-sm-4> Label: <span>Value</span>" pairs; turn it into a compact list
function parseSummary(raw: string) {
  const clean = (v: string) => v.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const status = clean(raw.match(/Status:\s*<\/span>[\s\S]*?<b>([^<]*)<\/b>/i)?.[1] || "");
  const fields = [...raw.matchAll(/col-sm-\d+"?'?>\s*([^<:]{2,40}?):\s*<span[^>]*>([^<]*)/g)]
    .map((m) => ({ label: clean(m[1]), value: clean(m[2]) }))
    .filter((f) => f.label && f.value);
  return { status, fields };
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
