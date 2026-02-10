import { NextResponse } from "next/server"

const DEFAULT_PAY_URL = "https://credit.linux.do/epay/pay/submit.php"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL("/", url))
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const payUrl = process.env.PAY_URL || DEFAULT_PAY_URL

  let inputs = ""
  for (const [key, value] of formData.entries()) {
    if (key === "url" || key === "action") continue
    if (typeof value !== "string") continue
    inputs += `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to payment</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 32px; color: #111; }
      .hint { max-width: 420px; margin: 0 auto; text-align: center; }
      .title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
      .desc { font-size: 13px; color: #666; }
      button { margin-top: 16px; padding: 10px 16px; border: 0; background: #111; color: #fff; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="hint">
      <div class="title">Redirecting to payment…</div>
      <div class="desc">If you are not redirected automatically, click continue.</div>
    </div>
    <form id="pay-form" method="POST" action="${escapeHtml(payUrl)}">
      ${inputs}
      <noscript><button type="submit">Continue</button></noscript>
    </form>
    <script>
      const form = document.getElementById('pay-form');
      if (form) form.submit();
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  })
}
