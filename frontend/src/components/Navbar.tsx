import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Our Work', href: '#work' },
  { label: 'Impact', href: '#impact' },
  { label: 'Donate', href: '#donate' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header
      role="banner"
      className="fixed top-0 left-0 w-full z-50 px-4 pt-4 md:px-6 md:pt-5"
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-warm-white/95 backdrop-blur-md shadow-lg px-6 py-3 md:px-8 md:py-4"
      >
        {/* Logo */}
        <a
          href="#"
          className="text-xl font-bold tracking-tight text-dark"
          aria-label="Faro Safehouse - Home"
        >
          Faro Safehouse
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-dark transition-colors duration-300 hover:text-amber-500"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#donate"
              className="inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-amber-500"
            >
              Support Us
            </a>
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span
            className={`block h-0.5 w-6 bg-dark transition-all duration-300 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 bg-dark transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 bg-dark transition-all duration-300 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}
          />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-0 z-40 flex flex-col items-center justify-center gap-8 bg-charcoal/95 backdrop-blur-md md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-semibold text-white hover:text-amber-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#donate"
              onClick={() => setMenuOpen(false)}
              className="mt-4 inline-block rounded-lg bg-amber-500 px-8 py-3 text-lg font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Support Us
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
