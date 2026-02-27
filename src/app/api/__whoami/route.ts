// src/app/api/__whoami/route.ts
import { NextResponse } from "next/server";

const API_PROXY = process.env.API_PROXY || "http://localhost:8787";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const upstreamUrl = `${API_PROXY.replace(/\/$/, "")}/__whoami${url.search}`;
  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers: { accept: "application/json", origin: "http://localhost:3000" },
    redirect: "manual",
  });

  const res = new NextResponse(await upstream.text(), {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((v, k) => {
    if (["content-type", "x-worker-version"].includes(k.toLowerCase())) {
      res.headers.set(k, v);
    }
  });

  return res;
}
