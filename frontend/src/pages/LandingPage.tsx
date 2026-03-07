import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import ChallengesSolutions from '../components/ChallengesSolutions';
import Features from '../components/Features';
import Workflow from '../components/Workflow';
import CTA from '../components/CTA';
import Footer from '../components/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <Header />
      <main>
        <Hero />
        <ChallengesSolutions />
        <Features />
        <Workflow />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
