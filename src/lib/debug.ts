// src/lib/debug.ts
export const ADMIN_DEBUG = true; // 用完改 false
export const adlog = (...args: any[]) => {
  if (!ADMIN_DEBUG) return;
  // 统一前缀，方便 Console 过滤
  console.log("[ADMIN]", ...args);
};
