// src/app/terms/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms & Conditions | SocialPlatform",
  description:
    "Read the terms and conditions for using SocialPlatform, including site usage, purchases, intellectual property, and user responsibilities.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updatedAt="2025-10-29">
      <section>
        <p>
          These Terms and Conditions (“Terms”) govern your access to and use of the{" "}
          <strong>SocialPlatform</strong> website (the “Website”) and related services. By accessing
          or using this Website, you agree to be bound by these Terms. If you do not agree, you must
          stop using the Website immediately.
        </p>
        <p>
          These Terms may be updated periodically, and any revisions will be published on this page.
          Your continued use of the Website after such changes indicates your acceptance of the
          revised Terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">1. Use of the Website</h2>
        <p>
          You may browse and use this Website for personal, non-commercial purposes only. You agree
          not to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the Website for any unlawful purpose or in violation of applicable laws</li>
          <li>Attempt to gain unauthorized access to the Website or its data</li>
          <li>Copy, modify, distribute, or exploit Website content without written permission</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate access to the Website at any time for
          violations of these Terms or misuse of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">2. Account Registration</h2>
        <p>
          To use certain features, you may be required to register for an account. You must provide
          accurate and up-to-date information and are responsible for maintaining the confidentiality
          of your account credentials. You agree to notify us immediately of any unauthorized use of
          your account.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">3. Pricing and Payments</h2>
        <p>
          Prices displayed on the Website are shown in the relevant currency and include applicable
          taxes where required by law. We reserve the right to correct pricing errors and update
          product information at any time without prior notice.
        </p>
        <p>
          All payments are processed securely through trusted third-party payment providers. You
          agree that by completing a purchase, you are authorizing the payment provider to process
          the transaction on your behalf.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">4. Discount Codes and Promotions</h2>
        <p>
          From time to time, we may offer promotional discount codes or campaigns. Unless stated
          otherwise:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each discount code is valid for one-time use only</li>
          <li>Codes apply to full-priced items unless explicitly stated</li>
          <li>Codes cannot be combined with other offers or applied after purchase</li>
          <li>Discounts exclude gift cards, delivery fees, and sale items</li>
        </ul>
        <p>
          By using a discount code, you agree to comply with the individual terms and conditions
          attached to that offer.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">5. Intellectual Property</h2>
        <p>
          All Website content, including text, images, graphics, logos, and code, is the property of{" "}
          <strong>SocialPlatform</strong> or its content providers and is protected by international
          copyright and trademark laws.
        </p>
        <p>
          You may view or print portions of the Website for personal use only. Reproduction,
          modification, or redistribution of any materials without prior written consent is strictly
          prohibited.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">6. Privacy</h2>
        <p>
          We value your privacy and are committed to protecting your personal information. Any
          personal data collected through this Website is handled in accordance with our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">7. Limitation of Liability</h2>
        <p>
          While we take reasonable steps to ensure the accuracy of Website information,{" "}
          <strong>SocialPlatform</strong> makes no warranties regarding the completeness or accuracy
          of any content. To the fullest extent permitted by law, we disclaim all liability for any
          loss or damage arising out of or in connection with your use of the Website or any linked
          third-party websites.
        </p>
        <p>
          This limitation includes, but is not limited to, indirect, incidental, consequential, or
          punitive damages, and loss of profits or data.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">8. Links to Third-Party Websites</h2>
        <p>
          The Website may contain links to third-party websites. These links are provided for your
          convenience only. We have no control over, and are not responsible for, the content or
          practices of those websites. Use of third-party sites is at your own risk.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">9. User Content and Reviews</h2>
        <p>
          If you submit reviews, comments, or other content to the Website, you grant{" "}
          <strong>SocialPlatform</strong> a non-exclusive, royalty-free, perpetual, and worldwide
          license to use, reproduce, modify, or publish that content in any form or media. You are
          solely responsible for the legality and accuracy of your submitted content.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">10. Competitions and Promotions</h2>
        <p>
          From time to time, we may run online competitions or promotions. By entering, you agree to
          comply with the specific terms of each event as published on the relevant page. All prizes
          are non-transferable and not redeemable for cash. Promotional codes and giveaways are
          subject to availability and applicable laws.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">11. Disclaimer</h2>
        <p>
          The Website and all content are provided on an “as is” and “as available” basis. We make no
          guarantees that the Website will be uninterrupted or error-free. While we take reasonable
          precautions, we cannot guarantee that our site or files are free from viruses or harmful
          components.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">12. Governing Law</h2>
        <p>
          These Terms are governed by and interpreted in accordance with the laws of the
          jurisdiction where you reside, without regard to conflict of law principles. Any disputes
          arising from these Terms shall be subject to the exclusive jurisdiction of the courts in
          that jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">13. Contact Us</h2>
        <p>
          If you have any questions or concerns about these Terms and Conditions, please contact us
          at:
        </p>
        <p className="mt-2">
          <strong>Email:</strong>{" "}
          <a href="mailto:lancechen1998@gmail.com" className="underline">
            lancechen1998@gmail.com
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
