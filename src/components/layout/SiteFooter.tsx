// src/components/layout/SiteFooter.tsx
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 text-sm text-muted-foreground md:flex-row md:justify-between">
        {/* 左：品牌简介 */}
        <div className="space-y-2">
          <div className="text-base font-semibold text-foreground">
            SocialPlatform
          </div>
          <p className="max-w-xs leading-relaxed">
            A modern fashion &amp; lifestyle store.
          </p>
          <p className="text-xs text-muted-foreground/80">
            © {year} SocialPlatform. All rights reserved.
          </p>
        </div>

        {/* 中：帮助链接 */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Help
          </div>
          <ul className="space-y-2">
            <li>
              <Link
                href="/returns"
                className="hover:text-foreground hover:underline underline-offset-4"
              >
                Returns &amp; Exchanges
              </Link>
            </li>
          </ul>
        </div>

        {/* 右：联系方式 */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Contact
          </div>
          <ul className="space-y-2">
            <li>
              <a
                href="mailto:support@socialplatform.test"
                className="hover:text-foreground hover:underline underline-offset-4"
              >
                support@socialplatform.test
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
