import React from 'react';

interface GradientInputProps {
  children: React.ReactNode;
}

export const GradientInput: React.FC<GradientInputProps> = ({ children }) => {
  return (
    <div className="w-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-lg p-6">
      {children}
    </div>
  );
};
