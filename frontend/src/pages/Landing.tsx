import { useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import ProblemSection from '../components/ProblemSection'
import SolutionSection from '../components/SolutionSection'
import ImageReveal from '../components/ImageReveal'
import ImpactSection from '../components/ImpactSection'
import DonateSection from '../components/DonateSection'
import Footer from '../components/Footer'

export default function Landing() {
  const [videoReady, setVideoReady] = useState(false)

  return (
    <>
      <LoadingScreen visible={!videoReady} />
      <Navbar />
      <a href="#about" className="skip-link">
        Skip to main content
      </a>
      <main id="main-content">
        <Hero onVideoReady={() => setVideoReady(true)} />
        <ProblemSection />
        <SolutionSection />
        <ImageReveal />
        <ImpactSection />
        <DonateSection />
      </main>
      <Footer />
    </>
  )
}
