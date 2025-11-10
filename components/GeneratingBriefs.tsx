
import React, { useState, useEffect } from 'react';

const thinkingSteps = [
  'Analyzing your product...',
  'Consulting marketing frameworks...',
  'Identifying value propositions...',
  'Generating creative angles...',
  'Finalizing strategy briefs...',
];

const GeneratingBriefs: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % thinkingSteps.length);
    }, 1500); // Change text every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 animate-fade-in">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mb-6"></div>
      <h2 className="text-2xl font-semibold text-gray-800">Designing Your Strategies</h2>
      <p className="mt-2 text-gray-600 w-64 h-8 transition-opacity duration-500">
        {thinkingSteps[currentStep]}
      </p>
    </div>
  );
};

export default GeneratingBriefs;
