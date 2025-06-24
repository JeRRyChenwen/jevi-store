export const navItems = [
  { label: "首页", href: "/", public: true },
  { label: "发现", href: "/explore", public: true },
  { label: "登录", href: "/auth/login", public: true },
  { label: "注册", href: "/auth/register", public: true },
  { label: "我的主页", href: "/profile", requiresAuth: true },
  { label: "发布内容", href: "/create-post", requiresAuth: true },
  { label: "登出", href: "/logout", requiresAuth: true },
]