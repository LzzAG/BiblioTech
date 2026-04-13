import React, { useState, useCallback } from 'react';
import { Users, Search, Plus, UserCircle, Edit3, Trash2, X, Filter, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Button, Label, Card } from './ui';
import { ErrorModal, ConfirmModal } from './ui';
import type { Funcionario, PaginatedResponse } from '../../types';

function FuncionariosSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-slate-200 rounded-full" />
            <div>
              <div className="h-3.5 bg-slate-200 rounded w-32 mb-2" />
              <div className="h-2.5 bg-slate-200 rounded w-16" />
            </div>
          </div>
          <div className="flex gap-1">
            <div className="w-7 h-7 bg-slate-200 rounded-lg" />
            <div className="w-7 h-7 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FuncionariosSection() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput);
  const [selectedCargo, setSelectedCargo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const [itemToHandle, setItemToHandle] = useState<Funcionario | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({ nome: '', cargo: '' });

  const { data: cargosData } = useQuery({
    queryKey: ['cargos'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Funcionario>>('funcionarios/?page_size=100');
      const cargos = Array.from(new Set(response.data.results.map((f: Funcionario) => f.cargo)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return ['Todos', ...cargos];
    },
    staleTime: 5 * 60 * 1000,
  });

  const cargosDisponiveis = cargosData ?? ['Todos'];

  const { data: funcionariosData, isLoading } = useQuery({
    queryKey: ['funcionarios', currentPage, searchTerm, selectedCargo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchTerm) params.set('search', searchTerm);
      if (selectedCargo) params.set('cargo', selectedCargo);
      const response = await api.get<PaginatedResponse<Funcionario>>(`funcionarios/?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const funcionarios = funcionariosData?.results ?? [];
  const totalCount = funcionariosData?.count ?? 0;
  const hasNext = !!funcionariosData?.next;
  const hasPrev = !!funcionariosData?.previous;
  const totalPages = Math.ceil(totalCount / 20);

  const executeSave = async () => {
    try {
      if (editingId) {
        await api.put(`funcionarios/${editingId}/`, formData);
        setEditingId(null);
        setIsEditModalOpen(false);
      } else {
        await api.post('funcionarios/', formData);
      }
      setFormData({ nome: '', cargo: '' });
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
    } catch {
      setErrorMessage("Erro ao salvar cadastro. Verifique a conexão ou se os dados são válidos.");
      setIsEditModalOpen(false);
      setIsErrorModalOpen(true);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => { e.preventDefault(); editingId ? setIsEditModalOpen(true) : executeSave(); };

  const handleEdit = useCallback((func: Funcionario) => {
    setEditingId(func.id);
    setFormData({ nome: func.nome, cargo: func.cargo });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const confirmDelete = useCallback((func: Funcionario) => { setItemToHandle(func); setIsDeleteModalOpen(true); }, []);

  const executeDelete = async () => {
    if (!itemToHandle) return;
    try {
      await api.delete(`funcionarios/${itemToHandle.id}/`);
      setIsDeleteModalOpen(false);
      setItemToHandle(null);
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
    } catch {
      setErrorMessage("Não foi possível excluir o funcionário. Verifique se há empréstimos pendentes.");
      setIsDeleteModalOpen(false);
      setIsErrorModalOpen(true);
    }
  };

  return (
    <>
      <ErrorModal isOpen={isErrorModalOpen} message={errorMessage} onClose={() => setIsErrorModalOpen(false)} />

      <ConfirmModal
        isOpen={isEditModalOpen}
        icon={<Edit3 className="w-10 h-10 text-amber-500" />}
        iconBg="bg-amber-50"
        title="Salvar Alterações?"
        description={<>Confirmar as mudanças no cadastro de <span className="font-bold text-slate-700">"{formData.nome}"</span>?</>}
        confirmLabel="Confirmar"
        confirmColor="bg-amber-500 hover:bg-amber-600"
        cancelLabel="Revisar"
        onConfirm={executeSave}
        onCancel={() => setIsEditModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        icon={<Trash2 className="w-10 h-10 text-red-500" />}
        iconBg="bg-red-50"
        title="Excluir Servidor?"
        description={<>Tem certeza que deseja remover <span className="font-bold text-slate-700">"{itemToHandle?.nome}"</span>?</>}
        confirmLabel="Sim, Excluir"
        confirmColor="bg-red-500 hover:bg-red-600"
        onConfirm={executeDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-16 md:mt-0">
          <div>
            <h2 className="text-[#1e3a5f] text-xl md:text-2xl font-black tracking-tight uppercase">Gestão de Funcionários</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-tighter">Administração de servidores e colaboradores</p>
          </div>
          <Card className="w-full md:min-w-[150px] md:w-auto border-none shadow-lg p-4 flex items-center gap-3 bg-white">
            <Users className="text-[#1e3a5f] w-5 h-5" />
            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Total</p>
              <p className="font-bold text-[#1e3a5f] text-xl leading-none mt-1">{totalCount}</p>
            </div>
          </Card>
        </div>

        <Card className="p-4 md:p-6 border-none shadow-xl bg-white">
          <div className="flex items-center justify-between mb-6 text-[#1e3a5f]">
            <div className="flex items-center gap-2">
              {editingId ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4" />}
              <h3 className="text-sm font-bold uppercase tracking-widest">{editingId ? 'Editando Cadastro' : 'Novo Cadastro'}</h3>
            </div>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData({ nome: '', cargo: '' }); }} className="text-xs text-red-500 font-bold flex items-center gap-1 uppercase"><X className="w-3 h-3" /> Cancelar</button>
            )}
          </div>
          <form onSubmit={handlePreSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <Label>Nome Completo</Label>
              <input className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Ex: Nome do Funcionário" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div>
              <Label>Cargo / Função</Label>
              <input className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Ex: Professor" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className={editingId ? 'bg-amber-500 hover:bg-amber-600' : ''}>{editingId ? 'Salvar Alterações' : 'Cadastrar Servidor'}</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="PESQUISAR POR NOME OU CARGO..." className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl w-full text-sm outline-none shadow-sm font-bold uppercase" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <Filter className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">Filtrar Cargo:</span>
            <select
              value={selectedCargo || 'Todos'}
              onChange={e => { setSelectedCargo(e.target.value === 'Todos' ? '' : e.target.value); setCurrentPage(1); }}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 outline-none cursor-pointer hover:border-[#1e3a5f] transition-all"
            >
              {cargosDisponiveis.map(cargo => (
                <option key={cargo} value={cargo}>{cargo}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? <FuncionariosSkeleton /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {funcionarios.map((func) => (
                <Card key={func.id} className="p-4 hover:shadow-md transition-all group flex items-center justify-between">
                  <div className="flex items-center gap-3 truncate">
                    <UserCircle className="w-6 h-6 text-slate-300 group-hover:text-[#1e3a5f]" />
                    <div className="truncate">
                      <p className="font-bold text-slate-700 text-sm truncate uppercase">{func.nome}</p>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5 text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase">{func.cargo}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => handleEdit(func)} className="p-1.5 text-slate-400 hover:text-amber-500"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => confirmDelete(func)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {totalCount} servidores • Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={!hasPrev} className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={!hasNext} className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}