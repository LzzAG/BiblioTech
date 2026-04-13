import { useState, useCallback } from 'react';
import { BookOpen, Users, Calendar, BarChart3, History, LogOut, UserCheck, Menu, X, Briefcase } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  username: string;
}

const menuItems = [
  { id: 'livros', label: 'Livros', icon: BookOpen },
  { id: 'alunos', label: 'Alunos', icon: Users },
  { id: 'funcionarios', label: 'Funcionários', icon: Briefcase },
  { id: 'emprestimos', label: 'Empréstimos', icon: Calendar },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'historico', label: 'Histórico', icon: History },
] as const;

export function Sidebar({ activeSection, onSectionChange, onLogout, username }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSectionClick = useCallback((id: string) => {
    onSectionChange(id);
    setIsOpen(false);
  }, [onSectionChange]);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1e3a5f] flex items-center justify-between px-4 z-50 border-b border-white/10">
        <div className="flex items-center gap-2 text-white font-bold">
          <BookOpen className="w-6 h-6" />
          <span className="text-lg">BiblioTech</span>
        </div>
        <button
          onClick={toggleMenu}
          aria-label="Toggle Menu"
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleMenu}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a5f] text-white flex flex-col transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:min-h-screen
      `}>
        <div className="p-6 border-b border-white/10 hidden md:block">
          <h1 className="flex items-center gap-2 text-white font-bold text-xl">
            <BookOpen className="w-8 h-8" />
            <span>BiblioTech</span>
          </h1>
          <p className="text-white/60 text-sm mt-1 uppercase tracking-wider font-bold">Secretaria de Educação</p>
        </div>

        <nav className="flex-1 p-4 pt-20 md:pt-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSectionClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-[#1e3a5f] shadow-lg font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4 bg-[#1a3252]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <UserCheck className="w-4 h-4 text-white/40" />
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-white truncate">{username || 'Tec'}</p>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">Conectado</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all duration-200 border border-white/5 group"
          >
            <LogOut className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}