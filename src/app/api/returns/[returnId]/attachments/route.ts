// src/app/api/returns/[returnId]/attachments/route.ts
export const runtime = "edge"; // ✅ 关键：让 formData/File 在转发时更稳定（Edge 支持原生 Web API）

function getWorkerBaseUrl() {
  // ✅ 你可以在 .env.local 里配：NEXT_PUBLIC_D1_WORKER_URL=http://127.0.0.1:8787
  // 或者生产：NEXT_PUBLIC_D1_WORKER_URL=https://xxx.your-worker.workers.dev
  const u = process.env.NEXT_PUBLIC_D1_WORKER_URL || process.env.D1_WORKER_URL || "";
  return u.replace(/\/+$/, ""); // 去掉结尾 /
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

  // ✅ 必须是 multipart/form-data
  const ct = request.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return bad(400, "expect_multipart_form_data");
  }

  // 读取前端 formData
  const incoming = await request.formData();

  // ✅ 重新组装一份 formData 转发给 worker
  //（Next 的 FormData 里包含 File 对象，Edge runtime 下可直接转发）
  const fd = new FormData();

  // 1) 只转发 files（你的 worker 就是 form.getAll("files")）
  const files = incoming.getAll("files").filter((x) => x instanceof File) as File[];
  if (!files.length) {
    return bad(400, "no_files");
  }
  for (const f of files) fd.append("files", f, f.name);

  // 2) 如果你未来想带额外字段（比如 notes），也可以一起透传：
  // for (const [k, v] of incoming.entries()) {
  //   if (k === "files") continue;
  //   if (typeof v === "string") fd.append(k, v);
  // }

  const target = `${base}/returns/${rid}/attachments`;

  // ✅ 转发 cookie（如果你的 worker 将来需要登录态/鉴权，这一步很重要）
  const cookie = request.headers.get("cookie") || "";

  const resp = await fetch(target, {
    method: "POST",
    headers: {
      ...(cookie ? { cookie } : {}),
      // ❗不要手动设置 content-type，让 fetch 自动带 boundary
    },
    body: fd,
  });

  // 原样把 worker 响应转回前端
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: {
      "content-type": resp.headers.get("content-type") || "application/json; charset=utf-8",
    },
  });
}