import React from 'react';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface-container-lowest/90 backdrop-blur-xl rounded-t-3xl border-t border-outline-variant/20 shadow-[0_-8px_24px_rgba(24,29,21,0.04)] no-print">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center transition-all active:scale-90 px-3 py-1 rounded-xl ${
              isActive 
                ? 'text-primary bg-primary-fixed/30' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <Icon size={isActive ? 28 : 24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-body text-[10px] font-bold uppercase tracking-wider mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
