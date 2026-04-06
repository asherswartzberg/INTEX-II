import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProblemSection from './components/ProblemSection'
import SolutionSection from './components/SolutionSection'
import ImpactSection from './components/ImpactSection'
import DonateSection from './components/DonateSection'
import Footer from './components/Footer'

function App() {
  return (
    <>
      {/* Skip to main content — ADA compliance */}
      <a href="#about" className="skip-link">
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <ImpactSection />
        <DonateSection />
      </main>

      <Footer />
    </>
  )
}

export default App
