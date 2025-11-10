
import React from 'react';

interface InitialLandingProps {
  onStart: () => void;
}

// --- Helper Components for Glass UI ---
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}
const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(({ className, textClassName, children, ...props }, ref) => (
  <div className={`glass-button-wrap ${className}`}>
    <button className="glass-button relative isolate all-unset cursor-pointer rounded-full transition-all text-base font-semibold w-full" ref={ref} {...props}>
      <span className={`glass-button-text relative block select-none tracking-tight px-6 py-2.5 ${textClassName}`}>{children}</span>
    </button>
  </div>
));


const InitialLanding: React.FC<InitialLandingProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl w-full p-4 animate-fade-in text-center">
        <h1 className="font-serif text-6xl md:text-7xl font-light text-gray-900 tracking-tight">ARC AI Strategy Generator</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-lg">
        Unlock your market potential with AI-driven marketing strategies, tailored to your product.
        </p>
        <div className="mt-12 w-full max-w-xs">
            <GlassButton onClick={onStart}>
                Get Started Now
            </GlassButton>
        </div>
    </div>
  );
};

export default InitialLanding;
