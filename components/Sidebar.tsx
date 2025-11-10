
import React from 'react';
import { ArcLogo } from './icons';

interface SidebarProps {
    onNewCampaign: () => void;
    onShowDashboard: () => void;
    onLogout: () => void;
}

const NavButton: React.FC<{ onClick: () => void, children: React.ReactNode, isActive?: boolean }> = ({ onClick, children, isActive }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive 
            ? 'bg-black/5 text-gray-900' 
            : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
        }`}
    >
        {children}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ onNewCampaign, onShowDashboard, onLogout }) => {
    return (
        <aside className="w-60 bg-slate-100/60 backdrop-blur-sm border-r border-slate-200/80 flex flex-col flex-shrink-0">
            <div className="flex items-center gap-2 h-20 px-4 border-b border-slate-200/80">
                <ArcLogo className="w-7 h-7 text-gray-800" />
                <span className="font-bold text-lg text-gray-800 tracking-tight">ARC AI Studio</span>
            </div>
            <div className="flex-grow p-4">
                <nav className="space-y-1">
                    <NavButton onClick={onNewCampaign}>
                         <span className="text-lg">+</span>
                         <span>New Campaign</span>
                    </NavButton>
                    <NavButton onClick={onShowDashboard}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 11a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>My Campaigns</span>
                    </NavButton>
                </nav>
            </div>
            <div className="p-4 border-t border-slate-200/80">
                 <NavButton onClick={onLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span>Log Out</span>
                 </NavButton>
            </div>
        </aside>
    );
};

export default Sidebar;
