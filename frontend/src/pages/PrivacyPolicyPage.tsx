import { Link } from 'react-router'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-off-white px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-medium-gray transition-colors hover:text-black"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-black">Privacy Policy</h1>
        <p className="mb-10 text-sm text-medium-gray">Last updated: April 7, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-medium-gray">
          {/* 1 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">1. Who we are</h2>
            <p>
              Faro Safehouse is a nonprofit organization based in Santiago, Chile,
              dedicated to providing safe homes and rehabilitation services for girls
              who are survivors of sexual abuse and human trafficking. For any
              privacy-related inquiries, contact us at{' '}
              <a href="mailto:info@farosafehouse.org" className="underline hover:text-black">
                info@farosafehouse.org
              </a>.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">2. What data we collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Account information</strong> — email address, first and last name,
                and account role (Admin, Staff, or Donor) when you create an account.
              </li>
              <li>
                <strong>Authentication data</strong> — encrypted password hashes stored
                securely. If you sign in with Google, we receive your name and email from
                Google.
              </li>
              <li>
                <strong>Donation records</strong> — donation amounts, dates, types, and
                allocation preferences for donors.
              </li>
              <li>
                <strong>Case management data</strong> — accessible only to authorized
                Admin and Staff users. Includes resident demographics, counseling session
                notes, health and education records, home visitation reports, and
                intervention plans.
              </li>
              <li>
                <strong>Cookie consent preferences</strong> — whether you accepted or
                declined cookies.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">3. Why we collect your data</h2>
            <p>We process personal data for the following purposes:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To create and manage your user account</li>
              <li>To process and track donations</li>
              <li>To operate our case management system for resident care</li>
              <li>To display anonymized, aggregated impact data to the public</li>
              <li>To communicate with donors about their contributions and our impact</li>
              <li>To maintain the security and integrity of our systems</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">4. Legal basis for processing</h2>
            <p>Under the General Data Protection Regulation (GDPR), we process your data based on:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Consent</strong> (Article 6(1)(a)) — for cookie usage and optional
                marketing communications.
              </li>
              <li>
                <strong>Contractual necessity</strong> (Article 6(1)(b)) — to process
                donations and maintain donor accounts.
              </li>
              <li>
                <strong>Legitimate interest</strong> (Article 6(1)(f)) — to operate our
                case management system, improve our services, and ensure system security.
              </li>
              <li>
                <strong>Legal obligation</strong> (Article 6(1)(c)) — to comply with
                tax reporting and child protection laws.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">5. Protection of minors' data</h2>
            <p>
              Faro Safehouse serves minors who are survivors of abuse and trafficking.
              We treat all resident data as highly sensitive and apply heightened
              safeguards:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Resident data is accessible only to authenticated Admin and Staff users
                through role-based access controls.
              </li>
              <li>
                All public-facing data (landing page, impact dashboards) is fully
                anonymized and aggregated — no individual resident can be identified.
              </li>
              <li>
                Resident names and identifying details are never displayed to donors or
                the public.
              </li>
              <li>
                Case management records are stored in an encrypted database with access
                logging.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">6. Who we share your data with</h2>
            <p>We share personal data only with the following third-party service providers:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Microsoft Azure</strong> — cloud hosting for our application and
                operational database.
              </li>
              <li>
                <strong>Supabase</strong> — secure hosting for our authentication database.
              </li>
              <li>
                <strong>Google</strong> — only if you choose to sign in with Google OAuth.
              </li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or trade your personal data to any third party. We do
              not use your data for advertising purposes.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">7. Data retention</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Account data</strong> — retained for as long as your account is
                active. You may request deletion at any time.
              </li>
              <li>
                <strong>Donation records</strong> — retained for 7 years to comply with
                tax and nonprofit reporting requirements.
              </li>
              <li>
                <strong>Case management data</strong> — retained in accordance with Chilean
                child welfare regulations and organizational policy.
              </li>
              <li>
                <strong>Cookie consent</strong> — stored locally in your browser until you
                clear it or change your preference.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">8. Your rights</h2>
            <p>Under the GDPR, you have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification</strong> — request correction of inaccurate data.</li>
              <li><strong>Erasure</strong> — request deletion of your data ("right to be forgotten").</li>
              <li><strong>Restriction</strong> — request that we limit how we process your data.</li>
              <li><strong>Portability</strong> — request your data in a machine-readable format.</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interest.</li>
              <li><strong>Withdraw consent</strong> — withdraw consent at any time where processing is based on consent.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:info@farosafehouse.org" className="underline hover:text-black">
                info@farosafehouse.org
              </a>. We will respond within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">9. Cookies</h2>
            <p>
              We use essential cookies for authentication and a consent cookie to remember
              your cookie preference. For full details, see our{' '}
              <Link to="/cookies" className="underline hover:text-black">
                Cookie Policy
              </Link>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">10. Data security</h2>
            <p>We implement the following measures to protect your data:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>All connections are encrypted via HTTPS/TLS.</li>
              <li>Authentication cookies are httpOnly, Secure, and SameSite-protected.</li>
              <li>Passwords are hashed using industry-standard algorithms — we never store plain-text passwords.</li>
              <li>Role-based access controls restrict sensitive data to authorized personnel.</li>
              <li>Authentication data is stored in a separate, isolated database.</li>
              <li>Content Security Policy (CSP) headers protect against cross-site scripting attacks.</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">11. Changes to this policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted
              on this page with an updated "Last updated" date. We encourage you to review
              this policy periodically.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">12. Contact us</h2>
            <p>
              If you have questions about this privacy policy or wish to exercise your
              data rights, please contact us:
            </p>
            <ul className="mt-2 list-none space-y-1 pl-0">
              <li>Faro Safehouse</li>
              <li>Santiago, Chile</li>
              <li>
                <a href="mailto:info@farosafehouse.org" className="underline hover:text-black">
                  info@farosafehouse.org
                </a>
              </li>
              <li>
                <a href="tel:+56912345678" className="underline hover:text-black">
                  +56 9 1234 5678
                </a>
              </li>
            </ul>
            <p className="mt-4">
              If you believe your data protection rights have been violated, you have the
              right to lodge a complaint with your local data protection supervisory
              authority.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
