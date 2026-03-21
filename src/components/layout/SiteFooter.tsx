import Link from "next/link";
import { BRAND } from "@/lib/brand";
import FooterLogo from "@/components/brand/FooterLogo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* 左：品牌区 */}
          <div className="space-y-4">
            <div className="mb-3">
              <FooterLogo />
            </div>

            <p className="max-w-xs text-sm leading-6 text-muted-foreground/80">
              {BRAND.tagline}
            </p>

            <p className="text-xs text-muted-foreground/80">
              © {year} {BRAND.legalName}. All rights reserved.
            </p>
          </div>

          {/* 中：帮助链接 */}
          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-wide text-foreground">
              Help
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/returns"
                  className="hover:text-foreground transition-colors"
                >
                  Returns &amp; Exchanges
                </Link>
              </li>
              <li>
                <Link
                  href="/returns-policy"
                  className="hover:text-foreground transition-colors"
                >
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* 右：联系方式 */}
          <div className="space-y-4">
            <div className="text-sm font-semibold tracking-wide text-foreground">
              Contact
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="hover:text-foreground transition-colors"
                >
                  {BRAND.supportEmail}
                </a>
              </li>
            </ul>

            {/* ✅ 以后这里可以继续扩展 social links */}
            <div className="pt-2 text-xs text-muted-foreground/70">
              Customer support available via email.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}