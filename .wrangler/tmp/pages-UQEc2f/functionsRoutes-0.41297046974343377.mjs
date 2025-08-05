import { onRequestPost as __api_register_ts_onRequestPost } from "D:\\前端练习\\social-platform\\functions\\api\\register.ts"

export const routes = [
    {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_ts_onRequestPost],
    },
  ]