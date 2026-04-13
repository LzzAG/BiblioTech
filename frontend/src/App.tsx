import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './app/components/Sidebar';
import { AcervoSection } from './app/components/AcervoSection';
import { AlunosSection } from './app/components/AlunosSection';
import { FuncionariosSection } from './app/components/FuncionariosSection';
import { EmprestimoSection } from './app/components/EmprestimoSection';
import { RelatorioSection } from './app/components/RelatorioSection';
import { HistoricoSection } from './app/components/HistoricoSection';
import { Login } from './app/components/Login';
import api from './services/api';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [activeSection, setActiveSection] = useState('livros');
  const [isChecking, setIsChecking] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username') || '';

    if (!savedToken) {
      setIsChecking(false);
      return;
    }

    api.get('categorias/')
      .then(() => {
        setToken(savedToken);
        setUsername(savedUsername);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, []);

  const handleLoginSuccess = (user: { name: string; email: string }, newToken: string, refreshToken: string) => {
    setToken(newToken);
    setUsername(user.name);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refresh', refreshToken);
    localStorage.setItem('username', user.name);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    queryClient.clear();
    setToken(null);
    setUsername('');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'livros': return <AcervoSection />;
      case 'alunos': return <AlunosSection />;
      case 'funcionarios': return <FuncionariosSection />;
      case 'emprestimos': return <EmprestimoSection />;
      case 'relatorios': return <RelatorioSection />;
      case 'historico': return <HistoricoSection />;
      default: return <AcervoSection />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
        username={username}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 bg-slate-50/50 relative w-full">
        <div className="hidden md:flex justify-end items-center mb-6 px-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Administrador Online</p>
              <p className="text-xs font-black text-[#1e3a5f] uppercase tracking-tight">{username}</p>
            </div>
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
              {username ? username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>
        </div>
        <div className="max-w-full lg:max-w-6xl mx-auto">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

export default App;