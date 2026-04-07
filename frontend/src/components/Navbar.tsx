import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Our Work', href: '#work' },
  { label: 'Impact', href: '#impact' },
]

export default function Navbar() {
  const { isAuthenticated, authSession } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
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

  const isAdminOrStaff = authSession.roles.some(r => r === 'Admin' || r === 'Staff')
  const isDonor = authSession.roles.includes('Donor')
  const portalRole = authSession.roles.includes('Admin') ? 'Admin' : authSession.roles.includes('Staff') ? 'Staff' : 'Donor'
  const portalTo = isAdminOrStaff ? '/admin' : '/donor'

  return (
    <header
      role="banner"
      className="fixed top-0 left-0 w-full z-50 px-4 pt-4 md:px-6 md:pt-5"
    >
      <nav
        aria-label="Main navigation"
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-6 py-3 md:px-8 md:py-3.5 transition-all duration-500 border ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-border shadow-sm'
            : 'bg-white/10 backdrop-blur-md border-white/10'
        }`}
      >
        {/* Logo */}
        <Link
          to="/"
          className={`text-3xl font-normal transition-colors duration-300 ${
            scrolled ? 'text-black' : 'text-white'
          }`}
          style={{ fontFamily: "'EB Garamond', serif" }}
          aria-label="Faro Safehouse - Home"
        >
          Faro Safehouse
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7 list-none m-0 p-0">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`text-[13px] font-medium transition-colors duration-300 hover:opacity-60 ${
                  scrolled ? 'text-black' : 'text-white'
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
          {(isAdminOrStaff || isDonor) && (
            <li>
              <Link
                to={portalTo}
                className={`group flex items-center text-[13px] font-medium transition-opacity duration-300 hover:opacity-60 ${
                  scrolled ? 'text-black' : 'text-white'
                }`}
              >
                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-[4rem] group-hover:opacity-100">
                  {portalRole}{' '}
                </span>
                Portal
              </Link>
            </li>
          )}
          <li>
            {isAuthenticated ? (
              <Link
                to="/logout"
                className={`text-[13px] font-medium transition-colors duration-300 hover:opacity-60 ${
                  scrolled ? 'text-black' : 'text-white'
                }`}
              >
                Log out
              </Link>
            ) : (
              <Link
                to="/login"
                className={`text-[13px] font-medium transition-colors duration-300 hover:opacity-60 ${
                  scrolled ? 'text-black' : 'text-white'
                }`}
              >
                Log in
              </Link>
            )}
          </li>
          <li>
            <Link
              to={isDonor ? '/donor' : '/login'}
              className={`btn-wipe rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-300 ${
                scrolled
                  ? 'bg-black text-white'
                  : 'bg-white text-black'
              }`}
            >
              Donate
            </Link>
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-9 h-9"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`block h-[1.5px] w-5 transition-all duration-300 ${scrolled ? 'bg-black' : 'bg-white'} ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`} />
          <span className={`block h-[1.5px] w-5 transition-all duration-300 ${scrolled ? 'bg-black' : 'bg-white'} ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-[1.5px] w-5 transition-all duration-300 ${scrolled ? 'bg-black' : 'bg-white'} ${menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
        </button>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col items-start justify-center gap-6 bg-black px-10 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-4xl font-display text-white hover:opacity-60 transition-opacity"
              >
                {link.label}
              </a>
            ))}
            {(isAdminOrStaff || isDonor) && (
              <Link
                to={portalTo}
                onClick={() => setMenuOpen(false)}
                className="text-4xl font-display text-white hover:opacity-60 transition-opacity"
              >
                {portalRole} Portal
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                to="/logout"
                onClick={() => setMenuOpen(false)}
                className="text-4xl font-display text-white hover:opacity-60 transition-opacity"
              >
                Log out
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="text-4xl font-display text-white hover:opacity-60 transition-opacity"
              >
                Log in
              </Link>
            )}
            <Link
              to={isDonor ? '/donor' : '/login'}
              onClick={() => setMenuOpen(false)}
              className="mt-6 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black"
            >
              Donate
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
