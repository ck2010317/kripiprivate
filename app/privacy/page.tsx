export const metadata = {
  title: "Privacy Policy - PrivatePay",
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0d0b18] text-gray-300 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: February 27, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Introduction</h2>
          <p>
            PrivatePay (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the PrivatePay mobile application and website
            (privatepay.site). This Privacy Policy explains how we collect, use, and protect your
            information when you use our services.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Information We Collect</h2>
          <p className="mb-2">We collect the following information when you use our services:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">Account Information:</strong> Email address, name, and encrypted password when you create an account.</li>
            <li><strong className="text-white">Card Information:</strong> Virtual card details issued through our platform for payment purposes.</li>
            <li><strong className="text-white">Transaction Data:</strong> Payment amounts, wallet addresses, and transaction history.</li>
            <li><strong className="text-white">Device Information:</strong> Device type, operating system, and app version for troubleshooting.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To create and manage your account</li>
            <li>To issue and manage virtual payment cards</li>
            <li>To process payments and top-ups via Solana</li>
            <li>To provide customer support</li>
            <li>To detect and prevent fraud</li>
            <li>To comply with legal obligations</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using industry-standard encryption. Passwords are hashed and
            never stored in plain text. We use HTTPS for all data transmission. Card details are managed
            through our secure card issuance partner.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Third-Party Services</h2>
          <p className="mb-2">We use the following third-party services:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">Solana Blockchain:</strong> For processing cryptocurrency payments.</li>
            <li><strong className="text-white">Card Issuance Partner:</strong> For issuing and managing virtual payment cards.</li>
            <li><strong className="text-white">Vercel Analytics:</strong> For anonymous usage analytics.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Sharing</h2>
          <p>
            We do not sell your personal information. We only share data with third parties when
            necessary to provide our services (e.g., card issuance), when required by law, or with
            your explicit consent.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Export your data</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Children&apos;s Privacy</h2>
          <p>
            Our services are not intended for users under the age of 18. We do not knowingly collect
            information from children.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes through the app or via email.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:support@privatepay.site" className="text-purple-400 hover:underline">
              support@privatepay.site
            </a>.
          </p>
        </div>
      </section>
    </div>
  )
}
