import React, { useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Processa o retorno do redirect do Google
    setLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (!result) setLoading(false);
        // Se result existe, o onAuthStateChanged no App.tsx vai capturar o login
      })
      .catch((err) => {
        console.error('Erro no redirect:', err);
        setError('Erro ao autenticar. Tente novamente.');
        setLoading(false);
      });
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao iniciar login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center text-center max-w-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85] mb-12">
          GESTÃO <span className="text-primary">FLORESTAL</span>
        </h1>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="group relative w-full max-w-sm bg-white text-black py-6 rounded-full font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary hover:text-white transition-all duration-500 shadow-2xl active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          )}
          {loading ? 'Aguarde...' : 'Acessar Plataforma'}
        </button>

        {error && (
          <p className="mt-4 text-red-400 text-sm font-semibold">{error}</p>
        )}
        
        <div className="mt-20 flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">
            © 2026 GESTÃO FLORESTAL • v2.6
          </p>
          <div className="h-[1px] w-12 bg-white/10" />
        </div>
      </motion.div>

    </div>
  );
};
