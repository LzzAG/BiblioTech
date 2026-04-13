import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Library,
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { isAxiosError } from 'axios';
import api from '../../services/api';

interface FormErrors {
  identifier?: string;
  password?: string;
}

interface LoginProps {
  onLoginSuccess: (user: { name: string; email: string }, newToken: string, refreshToken: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    if (!identifier.trim()) newErrors.identifier = 'Usuário ou e-mail é obrigatório';
    if (!password) newErrors.password = 'A senha é obrigatória';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setIsLoading(true);
    try {
      const response = await api.post('token/', { username: identifier, password });
      onLoginSuccess({ name: identifier, email: identifier }, response.data.access, response.data.refresh);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setErrors({ identifier: 'Usuário ou senha incorretos.' });
      } else {
        setErrors({ identifier: 'Falha na conexão com o servidor.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] font-sans selection:bg-blue-900/30">

      <main className="w-full max-w-[1000px] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-700">

        <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e1b4b] p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-0 -left-10 w-72 h-72 bg-blue-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 -right-10 w-72 h-72 bg-indigo-600 rounded-full blur-[100px]"></div>
          </div>
          <div className="z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-12">
              <Library size={24} className="text-blue-400" />
              <span className="font-bold tracking-tight text-lg">BiblioTech</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-semibold leading-[1.1] tracking-tight mb-6">
              Gestão inteligente para sua <span className="text-blue-400">biblioteca.</span>
            </h2>
            <p className="text-slate-400 text-base lg:text-lg leading-relaxed max-w-sm">
              Controle de acervo, empréstimos e relatórios em uma única plataforma moderna.
            </p>
          </div>
          <div className="z-10">
            <div className="h-1 w-36 bg-blue-500 rounded-full mb-4"></div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Acesso Restrito</p>
          </div>
        </div>

        <div className="w-full md:w-[55%] p-6 md:p-8 lg:p-16 flex flex-col justify-center bg-[#1e293b]">
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <Library size={20} className="text-blue-400" />
            <span className="font-bold text-white text-lg tracking-tight">BiblioTech</span>
          </div>
          <header className="mb-8 md:mb-10 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Login</h3>
            <p className="text-slate-400 text-sm md:text-base">Bem-vindo(a) ao painel administrativo.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                Usuário
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Seu usuário"
                  className={`w-full pl-11 pr-4 py-3 md:py-3.5 bg-slate-900/40 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-white placeholder:text-slate-500 ${errors.identifier ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.identifier && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-400 ml-1">
                  <AlertCircle size={14} /> {errors.identifier}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                Senha
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3 md:py-3.5 bg-slate-900/40 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-white placeholder:text-slate-500 ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-400 ml-1">
                  <AlertCircle size={14} /> {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 md:py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}