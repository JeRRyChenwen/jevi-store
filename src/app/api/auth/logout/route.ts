// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const past = new Date(0);

  res.cookies.set({ name: "sp_has_session", value: "", path: "/", expires: past });
  res.cookies.set({ name: "sp_user", value: "", path: "/", expires: past });

  return res;
}
