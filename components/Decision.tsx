
import React from 'react';
import { StrategyBrief } from '../types';

interface DecisionProps {
  briefs: StrategyBrief[];
  onSelect: (brief: StrategyBrief) => void;
  error: string | null;
  campaignName: string | null;
}

const Decision: React.FC<DecisionProps> = ({ briefs, onSelect, error, campaignName }) => {
  return (
    <div className="w-full max-w-5xl p-4 animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-gray-800">
            {campaignName ? `Strategies for: ${campaignName}` : "We've designed 3 strategies for you."}
        </h2>
        <p className="text-lg text-gray-600 mt-2">Choose your favorite to build the full campaign kit.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {briefs.map((brief, index) => (
          <div key={index} className="flex flex-col p-6 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-800">{brief.title}</h3>
                <p className="text-gray-600 mt-2 mb-4">{brief.description}</p>
                <div className="flex flex-wrap gap-2">
                    {brief.keywords.map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">{keyword}</span>
                    ))}
                </div>
            </div>
            <button 
                onClick={() => onSelect(brief)}
                className="mt-6 w-full px-4 py-2 bg-gray-800 text-white font-semibold rounded-full hover:bg-black transition-colors"
            >
                Select & Build Campaign
            </button>
          </div>
        ))}
      </div>
       {error && <p className="text-red-500 mt-6 text-center">{error}</p>}
    </div>
  );
};

export default Decision;
