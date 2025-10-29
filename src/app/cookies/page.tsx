// src/app/cookies/page.tsx
import type { Metadata } from "next";
import LegalShell from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Cookie Policy | SocialPlatform",
  description:
    "Learn how SocialPlatform uses cookies and similar technologies to enhance your browsing experience.",
};

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updatedAt="2025-10-29">
      <section>
        <p>
          At <strong>SocialPlatform</strong>, we take your privacy seriously and are committed to
          providing a transparent experience regarding how we use cookies and similar technologies.
          This Cookie Policy explains what cookies are, how we use them, and how you can manage your
          preferences.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. What Are Cookies and Similar Technologies
        </h2>
        <p>
          Cookies are small text files stored on your computer or device when you visit a website.
          They allow the website to recognize your device and remember certain information about
          your visit — for example, your preferences, login status, or shopping cart contents.
        </p>
        <p>
          In addition to cookies, we may use technologies such as <strong>web beacons</strong>,{" "}
          <strong>pixels</strong>, and <strong>local storage</strong>. These tools help us measure
          engagement, personalize experiences, and improve website functionality.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Why We Use Cookies
        </h2>
        <p>We use cookies and similar technologies for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Essential cookies</strong> – Required for the operation of our Website (e.g.,
            enabling navigation, account login, and checkout functionality).
          </li>
          <li>
            <strong>Performance and analytics cookies</strong> – Help us analyze how users interact
            with the Website, measure marketing effectiveness, and improve site performance.
          </li>
          <li>
            <strong>Preference cookies</strong> – Remember your choices, such as language,
            currency, or region, to make future visits more convenient.
          </li>
          <li>
            <strong>Advertising cookies</strong> – Deliver relevant ads and promotional content
            based on your interests. These may be placed by us or third-party partners (e.g.,
            Google, Meta).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Managing or Blocking Cookies
        </h2>
        <p>
          You can control or delete cookies at any time by adjusting your browser settings. Most
          browsers allow you to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Delete existing cookies</li>
          <li>Block all cookies</li>
          <li>Block cookies from specific sites</li>
          <li>Receive notifications when cookies are being set</li>
        </ul>
        <p>
          Please note that disabling certain cookies may affect the functionality or performance of
          the Website. Some features (such as login or checkout) may not work properly without
          essential cookies.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Google Analytics and Similar Tools
        </h2>
        <p>
          We use <strong>Google Analytics</strong> and similar tools to collect information about
          how visitors use our Website. These tools help us understand traffic patterns and improve
          user experience. Data collected includes, for example, which pages are visited, how long
          users stay, and how they reached our site.
        </p>
        <p>
          Google Analytics cookies operate anonymously and do not identify individual users. You can
          learn more about Google’s data practices at{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            https://policies.google.com/privacy
          </a>{" "}
          and opt out by visiting{" "}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            https://tools.google.com/dlpage/gaoptout
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Advertising Cookies and Third Parties
        </h2>
        <p>
          We may partner with third-party platforms (such as Google, Meta, and others) that use
          cookies and pixels to display personalized ads and measure marketing effectiveness. These
          tools help us understand when you visit our Website and which content you engage with.
        </p>
        <p>
          The information collected through these technologies is used in accordance with our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>{" "}
          and the privacy policies of the third parties involved. You may still see general ads even
          if you choose to disable these cookies, but they will not be tailored to your interests.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Duration of Cookies
        </h2>
        <p>
          Some cookies are <strong>session cookies</strong>, which expire automatically when you
          close your browser. Others are <strong>persistent cookies</strong>, which remain on your
          device until deleted manually or expired according to their set duration.
        </p>
        <p>
          By continuing to use our Website, you consent to the placement of cookies and similar
          technologies on your device as described in this policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Updates to This Cookie Policy
        </h2>
        <p>
          We may update this Cookie Policy periodically to reflect changes in technology, law, or
          our data practices. The latest version will always be available on this page, with the
          date of the most recent update displayed at the top.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">8. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Cookie Policy or how we use cookies,
          please contact us at:
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
