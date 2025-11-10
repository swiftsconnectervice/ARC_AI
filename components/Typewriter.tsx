import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  as?: React.ElementType;
  enabled?: boolean;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 15, className, as: Component = 'p', enabled = true }) => {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : text);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      return;
    }
    
    setDisplayedText(''); // Reset when text prop changes for typing effect
    if (text) {
      let i = 0;
      const intervalId = setInterval(() => {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(intervalId);
        }
      }, speed);
      return () => clearInterval(intervalId);
    }
  }, [text, speed, enabled]);

  const isTyping = enabled && displayedText.length < text.length;

  return (
    <Component className={className}>
      {displayedText}
      {isTyping && <span className="inline-block w-[0.4rem] h-[1em] bg-gray-700 animate-pulse ml-1" style={{ verticalAlign: 'text-bottom' }}></span>}
    </Component>
  );
};

export default Typewriter;
