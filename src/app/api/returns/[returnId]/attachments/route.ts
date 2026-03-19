// src/app/api/returns/[returnId]/attachments/route.ts
export const runtime = "edge"; // ✅ 关键：让 formData/File 在转发时更稳定（Edge 支持原生 Web API）

function getWorkerBaseUrl() {
  const u = process.env.NEXT_PUBLIC_D1_WORKER_URL || process.env.D1_WORKER_URL || "";
  return u.replace(/\/+$/, "");
}

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ returnId: string }> }
) {
  const { returnId } = await ctx.params;

  const rid = Number(returnId);
  if (!Number.isFinite(rid) || rid <= 0) {
    return bad(400, "bad_return_id");
  }

  const base = getWorkerBaseUrl();
  if (!base) {
    return bad(500, "missing_worker_base_url");
  }

  const ct = request.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return bad(400, "expect_multipart_form_data");
  }

  const incoming = await request.formData();
  const fd = new FormData();

  const files = incoming.getAll("files").filter((x) => x instanceof File) as File[];
  if (!files.length) {
    return bad(400, "no_files");
  }

  for (const f of files) {
    fd.append("files", f, f.name);
  }

  const target = `${base}/returns/${rid}/attachments`;

  // ✅ 转发 cookie（已登录用户）
  const cookie = request.headers.get("cookie") || "";

  // ✅ 转发 return owner email（游客兜底）
  const returnEmail = (request.headers.get("x-return-email") || "").trim();

  const resp = await fetch(target, {
    method: "POST",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(returnEmail ? { "x-return-email": returnEmail } : {}),
      // ❗不要手动设置 content-type，让 fetch 自动带 boundary
    },
    body: fd,
  });

  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: {
      "content-type":
        resp.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}