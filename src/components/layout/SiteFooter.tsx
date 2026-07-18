import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { POLICY_LINKS } from "@/lib/legal/policy-links";
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
                  href={POLICY_LINKS.returnsRequest}
                  className="transition-colors hover:text-foreground"
                >
                  Returns &amp; Exchanges
                </Link>
              </li>

              <li>
                <Link
                  href={POLICY_LINKS.shippingPolicy}
                  className="transition-colors hover:text-foreground"
                >
                  Shipping Policy
                </Link>
              </li>

              <li>
                <Link
                  href={POLICY_LINKS.returnsPolicy}
                  className="transition-colors hover:text-foreground"
                >
                  Returns Policy
                </Link>
              </li>

              <li>
                <Link
                  href={POLICY_LINKS.privacy}
                  className="transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link
                  href={POLICY_LINKS.terms}
                  className="transition-colors hover:text-foreground"
                >
                  Terms &amp; Conditions
                </Link>
              </li>

              <li>
                <Link
                  href={POLICY_LINKS.cookies}
                  className="transition-colors hover:text-foreground"
                >
                  Cookie Policy &amp; Cookie Settings
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
                <Link
                  href={POLICY_LINKS.contact}
                  className="transition-colors hover:text-foreground"
                >
                  Contact Us
                </Link>
              </li>

              <li>
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="transition-colors hover:text-foreground"
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
