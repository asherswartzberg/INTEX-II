import { Link } from 'react-router'

export default function CookiePolicyPage() {
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

        <h1 className="mb-6 text-3xl font-bold text-black">Cookie Policy</h1>

        <div className="space-y-6 text-sm leading-relaxed text-medium-gray">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit.
              They are widely used to make websites work efficiently and to provide
              information to site operators.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">How we use cookies</h2>
            <p>Faro Safehouse uses the following types of cookies:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Essential / Authentication cookies</strong> — These keep you signed
                in and are required for the application to function. They are set when you
                log in and cleared when you log out.
              </li>
              <li>
                <strong>Consent cookie</strong> — Remembers whether you accepted or
                declined this cookie notice so we don't ask again.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">Third-party cookies</h2>
            <p>
              If you sign in with Google, Google may set its own cookies during the
              authentication flow. Please refer to{' '}
              <a
                href="https://policies.google.com/technologies/cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-black"
              >
                Google's cookie policy
              </a>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-black">Managing cookies</h2>
            <p>
              You can control cookies through your browser settings. Disabling essential
              cookies will prevent you from signing in to the application.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
