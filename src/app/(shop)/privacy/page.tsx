// src/app/privacy/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND.displayName}`,
  description: `Learn how ${BRAND.displayName} collects, uses, and protects your personal information.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updatedAt="2025-10-29"
      intro={
        <>
          <p>
            This Privacy Policy explains how <strong>{BRAND.displayName}</strong> (“we”, “us”, or “our”)
            collects, uses, stores, and protects your personal information when you use our website
            and related services (collectively, the “Service”).
          </p>
          <p>
            We are committed to safeguarding your privacy and complying with applicable data
            protection laws, including the EU General Data Protection Regulation (GDPR), the
            California Consumer Privacy Act (CCPA), and other relevant international privacy laws.
          </p>
        </>
      }
    >
      <section>
        <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
        <p>We may collect the following types of personal information from you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your name and contact information (e.g., email address)</li>
          <li>Account login credentials (such as username and password)</li>
          <li>Billing, shipping, and payment information (if applicable)</li>
          <li>Information provided when you contact us or participate in surveys or promotions</li>
          <li>Usage data such as IP address, browser type, and device information</li>
          <li>Cookies and similar tracking technologies (see our Cookie Policy for details)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">2. How We Collect Information</h2>
        <p>We collect information from you in several ways, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>When you register or create an account on {BRAND.displayName}</li>
          <li>When you make a purchase, submit a form, or contact us</li>
          <li>When you interact with our marketing emails or ads</li>
          <li>Automatically through cookies and analytics tools</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">3. How We Use Your Information</h2>
        <p>We use your personal information for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and maintain our Service</li>
          <li>To process transactions and send confirmations or receipts</li>
          <li>To communicate with you about updates, support, or marketing</li>
          <li>To personalize user experience and improve our platform</li>
          <li>To comply with legal obligations and prevent fraud or misuse</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">4. Marketing Communications</h2>
        <p>
          With your consent, we may send you promotional materials about our products, services, or
          offers. You can opt out at any time by clicking the “unsubscribe” link in our emails or
          contacting us at{" "}
          <a href="mailto:{BRAND.supportEmail}" className="underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">5. Sharing Your Information</h2>
        <p>
          We may share your personal information only in the following circumstances and always with
          appropriate safeguards:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>With service providers who help operate our platform or process transactions</li>
          <li>When required by law, regulation, or court order</li>
          <li>To protect our rights, property, or safety and that of our users</li>
        </ul>
        <p>
          We do not sell or rent your personal data to third parties for marketing or advertising
          purposes.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">6. Data Storage and Security</h2>
        <p>
          We take reasonable steps to protect your personal information against unauthorized access,
          alteration, disclosure, or destruction. We store your data securely using encryption and
          access control measures. However, no online service can be completely secure, and we
          cannot guarantee absolute security of your data.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">7. International Data Transfers</h2>
        <p>
          Your information may be stored or processed in countries other than your own, including
          regions such as the United States, Europe, or Australia. We ensure that such transfers are
          conducted in compliance with applicable data protection laws and appropriate safeguards.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">8. Your Rights</h2>
        <p>You may have certain rights under applicable privacy laws, including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The right to access and obtain a copy of your data</li>
          <li>The right to correct inaccurate or incomplete information</li>
          <li>The right to request deletion (“right to be forgotten”)</li>
          <li>The right to object to or restrict certain types of processing</li>
          <li>The right to withdraw consent for marketing communications</li>
        </ul>
        <p>
          To exercise these rights, please contact us at{" "}
          <a href="mailto:{BRAND.supportEmail}" className="underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">9. Data Retention</h2>
        <p>
          We retain your personal information only as long as necessary to provide our services,
          comply with our legal obligations, or resolve disputes. When data is no longer required,
          it will be securely deleted or anonymized.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">10. Cookies</h2>
        <p>
          We use cookies and similar tracking technologies to personalize content, analyze traffic,
          and improve your browsing experience. For details on how we use cookies and how to manage
          them, please visit our{" "}
          <a href="/cookies" className="underline">
            Cookie Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or
          for other operational, legal, or regulatory reasons. The updated version will be posted on
          this page with a new “Last updated” date.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">12. Contact Us</h2>
        <p>
          If you have any questions, concerns, or complaints about this Privacy Policy or how your
          data is handled, please contact us at:
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a href="mailto:{BRAND.supportEmail}" className="underline">
            {BRAND.supportEmail}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
