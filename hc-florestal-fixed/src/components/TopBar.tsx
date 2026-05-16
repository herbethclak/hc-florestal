import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface TopBarProps {
  userAvatar: string;
  userName?: string;
  role?: string;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ userAvatar, userName, role, onOpenSettings }) => {
  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md shadow-sm flex items-center justify-between px-6 py-3 border-b border-outline-variant/10 no-print">
      <div className="flex items-center gap-4">
        <h1 className="text-primary font-headline font-extrabold text-lg tracking-tighter">
          Gestor Florestal
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-on-surface font-headline font-black text-sm tracking-tight">
            {userName || 'Gestor de Campo'}
          </span>
          {role && (
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {role}
            </span>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-fixed shadow-sm">
          <img 
            src={userAvatar} 
            alt="User Profile" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onOpenSettings}
            className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
            title="Configurações"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error/10"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
