import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB_D1: D1Database;
}

interface Context {
  request: Request;
  env: Env;
}

export async function onRequestPost(context: Context) {
  try {
    const { username, email, password } = await context.request.json();
    const DB = context.env.DB_D1;

    if (!username || !email || !password) {
      return new Response(JSON.stringify({ message: "缺少字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (existing) {
      return new Response(JSON.stringify({ message: "该邮箱已被注册" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    await DB.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
      .bind(username, email, password)
      .run();

    return new Response(JSON.stringify({ message: "注册成功" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "未知错误";

    console.error("注册出错：", error);
    return new Response(
      JSON.stringify({ message: "注册失败", error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
