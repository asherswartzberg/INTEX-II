import { Link } from 'react-router'
import { useCookieConsent } from '../context/CookieConsentContext'

export default function CookieConsentBanner() {
  const { consent, accept, decline } = useCookieConsent()

  if (consent !== 'pending') return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-border bg-white px-6 py-5 shadow-lg sm:flex-row sm:justify-between">
        <p className="text-sm text-medium-gray text-center sm:text-left">
          We use essential cookies to keep you signed in and provide core functionality.{' '}
          <Link to="/cookies" className="underline hover:text-black">
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={decline}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-off-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/80"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
