
import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Bike, Mail, Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Send } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const data = await supabaseService.signInWithEmail(email, password);
        if (data.user) onAuthSuccess(data.user);
      } else if (mode === 'signup') {
        const data = await supabaseService.signUp(email, password);
        setMessage({ type: 'success', text: 'Compte créé ! Vérifiez vos emails pour confirmer.' });
      } else {
        await supabaseService.resetPasswordForEmail(email);
        setMessage({ type: 'success', text: 'Email de réinitialisation envoyé !' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Une erreur est survenue' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_0%,_#312e81_0%,_#020617_50%)]">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-[40px] p-8 md:p-12 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-600/30">
            <Bike className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">VeloCheck</h1>
          <p className="text-slate-400 font-medium italic">Votre garage intelligent synchronisé</p>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-medium"
                placeholder="nom@exemple.com"
              />
            </div>
          </div>

          {mode !== 'forgotPassword' && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setMode('forgotPassword')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl py-4 px-6 font-black text-lg transition-all shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 
              mode === 'login' ? 'Connexion' : 
              mode === 'signup' ? 'Créer mon compte' : 
              'Réinitialiser'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-800 text-center">
          {mode === 'login' ? (
            <p className="text-slate-400 font-medium">
              Nouveau sur VeloCheck ?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-indigo-400 font-black hover:text-indigo-300 transition-colors"
              >
                Créer un compte
              </button>
            </p>
          ) : (
            <button 
              onClick={() => setMode('login')}
              className="flex items-center gap-2 m-auto text-indigo-400 font-black hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthView;
