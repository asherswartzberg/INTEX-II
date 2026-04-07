import { Link } from 'react-router'

const currentYear = new Date().getFullYear()

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Our Work', href: '#work' },
  { label: 'Impact', href: '#impact' },
  { label: 'Donate', href: '#donate' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms', href: '#' },
]

export default function Footer() {
  return (
    <footer role="contentinfo" className="bg-black py-20 text-white">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <p
              className="text-2xl text-white"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Faro Safehouse
            </p>
            <p className="mt-4 max-w-sm text-sm leading-[1.7] text-white/40">
              A beacon of hope for children in Chile. We provide safe homes,
              professional counseling, education, and a path to recovery for
              girls who are survivors of abuse and trafficking.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Navigation
            </p>
            <nav aria-label="Footer navigation" className="mt-4">
              <ul className="space-y-3 list-none m-0 p-0">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    to="/login"
                    className="text-sm text-white/50 transition-colors hover:text-white"
                  >
                    Log in
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Contact
            </p>
            <address className="mt-4 not-italic">
              <ul className="space-y-3 list-none m-0 p-0 text-sm text-white/50">
                <li>
                  <a href="mailto:info@farosafehouse.org" className="hover:text-white transition-colors">
                    info@farosafehouse.org
                  </a>
                </li>
                <li>
                  <a href="tel:+56912345678" className="hover:text-white transition-colors">
                    +56 9 1234 5678
                  </a>
                </li>
                <li>Santiago, Chile</li>
              </ul>
            </address>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center">
          <p className="text-xs text-white/30">
            &copy; {currentYear} Faro Safehouse. All rights reserved.
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-white/30 transition-colors hover:text-white/60"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
