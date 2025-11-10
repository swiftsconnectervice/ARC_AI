import React, { useState, useRef } from 'react';
import { MailIcon, ArrowRightIcon, LockIcon, EyeIcon, EyeOffIcon, ChevronUpIcon } from './icons';
import { auth } from '../services/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

interface LandingProps {
  onAuthSuccess: () => void;
}

// --- Helper Components for Glass UI ---
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}
const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(({ className, textClassName, children, ...props }, ref) => (
  <div className={`glass-button-wrap ${className}`}>
    <button className="glass-button relative isolate all-unset cursor-pointer rounded-full transition-all text-base font-semibold w-full disabled:opacity-50 disabled:cursor-not-allowed" ref={ref} {...props}>
      <span className={`glass-button-text relative block select-none tracking-tight px-6 py-2.5 ${textClassName}`}>{children}</span>
    </button>
  </div>
));

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isValid: boolean;
  onArrowClick: () => void;
  icon: React.ReactNode;
  arrowIcon?: React.ReactNode;
}
const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(({ isValid, onArrowClick, icon, arrowIcon, ...props }, ref) => (
    <div className="glass-input-wrap w-full relative">
        <div className="glass-input relative flex w-full items-center gap-2 rounded-full p-1.5">
            <div className="relative z-10 flex-shrink-0 flex items-center justify-center w-10 pl-1 text-gray-600">
                {icon}
            </div>
            <input
                ref={ref}
                className="relative z-10 h-full w-0 flex-grow bg-transparent text-gray-800 placeholder:text-gray-500/80 focus:outline-none text-lg pr-2"
                {...props}
            />
            <div className={`relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${isValid ? "w-11 pr-1" : "w-0"}`}>
                <GlassButton type="button" onClick={onArrowClick} aria-label="Continue" className="w-9 h-9" textClassName="flex items-center justify-center p-0 w-9 h-9">
                    {arrowIcon || <ArrowRightIcon className="w-5 h-5 text-gray-800" />}
                </GlassButton>
            </div>
        </div>
    </div>
));


const Landing: React.FC<LandingProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isEmailValid || !isPasswordValid || isLoading) return;

    setIsLoading(true);
    setAuthError(null);

    try {
        if (authMode === 'register') {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        onAuthSuccess();
    } catch (error: any) {
        let message = "An unexpected error occurred. Please try again.";
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'This email is already registered. Please log in.';
                break;
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
                message = 'Invalid email or password. Please check your credentials.';
                break;
            case 'auth/weak-password':
                message = 'The password is too weak. It must be at least 6 characters.';
                break;
        }
        setAuthError(message);
    } finally {
        setIsLoading(false);
    }
  };


  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
    setEmail('');
    setPassword('');
    setAuthError(null);
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-full max-w-md w-full p-4 animate-fade-in">
        <div className="w-full flex flex-col items-center gap-4">
            <h1 className="font-serif text-6xl md:text-7xl font-light text-gray-900 tracking-tight text-center">{authMode === 'login' ? 'Welcome Back' : 'Create an Account'}</h1>
            
            <p className="text-base font-medium text-gray-600 mt-4">
                Enter your details to continue
            </p>

            <div className="w-full max-w-sm space-y-4 mt-2">
                <form onSubmit={handleAuthSubmit} className="w-full space-y-4 animate-fade-in-fast">
                    <GlassInput
                        icon={<MailIcon className="w-6 h-6" />}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        isValid={false} // Hide arrow
                        onArrowClick={() => {}}
                    />

                    <GlassInput
                        icon={
                            <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)} className="text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-full">
                                {showPassword ? <EyeOffIcon className="w-6 h-6" /> : <LockIcon className="w-6 h-6" />}
                            </button>
                        }
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        isValid={false} // Hide arrow
                        onArrowClick={() => {}}
                    />

                    <GlassButton type="submit" disabled={!isEmailValid || !isPasswordValid || isLoading}>
                        {isLoading ? 'Processing...' : (authMode === 'login' ? 'Log In' : 'Register')}
                    </GlassButton>

                    <div className="text-center">
                        <button type="button" onClick={toggleAuthMode} className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
                           {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log In'}
                        </button>
                    </div>
                </form>
                {authError && <p className="text-red-500 text-sm text-center animate-fade-in-fast">{authError}</p>}
            </div>
            
            <div className="mt-8">
                <ChevronUpIcon className="w-6 h-6 text-gray-400 opacity-75" />
            </div>
        </div>
    </div>
  );
};

export default Landing;