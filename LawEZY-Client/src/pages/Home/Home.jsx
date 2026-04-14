import React from 'react';
import HeroCarousel from './components/hero/HeroCarousel';
import ExpertEcosystem from './components/experts/ExpertEcosystem';
import ProfessionalNexus from './components/experts/ProfessionalNexus';
import AIFeature from './components/ai/AIFeature';
import WhyChooseUs from './components/whychooseus/WhyChooseUs';

import EResources from './components/resources/EResources';
import Newsroom from './components/news/Newsroom';
import CommunityShowcase from './components/community/CommunityShowcase';

const Home = () => {
  return (
    <div className="home-container">
      {/* SECTIONS IN CONTINUOUS FLOW */}
      <HeroCarousel />
      <WhyChooseUs />
      <ExpertEcosystem />
      <ProfessionalNexus />
      <AIFeature />
      <EResources />
      <Newsroom />
      <CommunityShowcase />
    </div>
  );
};

export default Home;
