import React, { useState, useMemo, useCallback } from 'react';
import { Book, Plus, Search, Edit3, Hash, Tag, BookOpen, X, Trash2, Filter, User, Calendar, Building2, Barcode, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Button, Label, Card } from './ui';
import { ErrorModal, ConfirmModal } from './ui';
import type { Livro, Categoria, PaginatedResponse } from '../../types';

function AcervoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-slate-200 rounded-lg" />
              <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
          <div className="h-5 bg-slate-200 rounded w-4/5 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-3/5 mb-4" />
          <div className="flex gap-3 mt-2">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="h-3 bg-slate-200 rounded w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AcervoSection() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<{id: number, titulo: string} | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    titulo: '', autor: '', genero_texto: '', quantidade_total: '', ano: '', editora: '', isbn: '',
  });

  const { data: categoriasData = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const response = await api.get<Categoria[]>('categorias/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: livrosData, isLoading } = useQuery({
    queryKey: ['livros', currentPage, searchTerm, selectedGenre],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchTerm) params.set('search', searchTerm);
      if (selectedGenre) params.set('categoria', selectedGenre);
      const response = await api.get<PaginatedResponse<Livro>>(`livros/?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const livros = livrosData?.results ?? [];
  const totalCount = livrosData?.count ?? 0;
  const hasNext = !!livrosData?.next;
  const hasPrev = !!livrosData?.previous;
  const totalPages = Math.ceil(totalCount / 20);

  const generosDisponiveis = useMemo(() => {
    const gens = categoriasData
      .map(c => c.nome)
      .filter(nome => nome.toLowerCase() !== 'geral')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return ['Todos', ...gens];
  }, [categoriasData]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['livros'] });
    queryClient.invalidateQueries({ queryKey: ['categorias'] });
  }, [queryClient]);

  const executeSave = async () => {
    try {
      let categoriaId: number;
      const nomeDigitado = formData.genero_texto.trim();
      const catExistente = categoriasData.find(c => c.nome.toLowerCase() === nomeDigitado.toLowerCase());
      if (catExistente) {
        categoriaId = catExistente.id;
      } else {
        const respCat = await api.post<Categoria>('categorias/', { nome: nomeDigitado });
        categoriaId = respCat.data.id;
      }
      const qtdNumeric = Number(formData.quantidade_total);
      const payload = {
        titulo: formData.titulo, autor: formData.autor, ano: formData.ano ? Number(formData.ano) : null,
        editora: formData.editora, isbn: formData.isbn, categoria: categoriaId,
        quantidade_total: qtdNumeric, quantidade_disponivel: editingId ? undefined : qtdNumeric
      };
      if (editingId) {
        await api.put(`livros/${editingId}/`, payload);
        setEditingId(null);
        setIsEditModalOpen(false);
      } else {
        await api.post('livros/', payload);
      }
      setFormData({ titulo: '', autor: '', genero_texto: '', quantidade_total: '', ano: '', editora: '', isbn: '' });
      invalidateAll();
    } catch (error) {
      const msg = isAxiosError(error) && error.response?.data?.isbn ? "Este ISBN já está cadastrado no sistema." : "Erro ao salvar livro. Verifique os dados e a conexão.";
      setErrorMessage(msg);
      setIsErrorModalOpen(true);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => { e.preventDefault(); editingId ? setIsEditModalOpen(true) : executeSave(); };

  const handleEdit = useCallback((livro: Livro) => {
    setEditingId(livro.id);
    setFormData({ titulo: livro.titulo, autor: livro.autor || '', genero_texto: livro.categoria_nome || '', quantidade_total: livro.quantidade_total.toString(), ano: livro.ano ? livro.ano.toString() : '', editora: livro.editora || '', isbn: livro.isbn || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const confirmDelete = useCallback((id: number, titulo: string) => { setItemToDelete({ id, titulo }); setIsDeleteModalOpen(true); }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`livros/${itemToDelete.id}/`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      invalidateAll();
    } catch {
      setIsDeleteModalOpen(false);
      setErrorMessage("Não foi possível excluir. O livro pode estar vinculado a um empréstimo ativo.");
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
        title="Confirmar Alterações?"
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
        title="Excluir Livro?"
        description={<span className="text-slate-400 text-xs font-bold uppercase">"{itemToDelete?.titulo}"</span>}
        confirmLabel="Sim, Excluir"
        confirmColor="bg-red-500 hover:bg-red-600"
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col mt-16 md:mt-0 text-center md:text-left">
          <h2 className="text-[#1e3a5f] text-xl md:text-2xl font-black tracking-tight uppercase">ACERVO DA BIBLIOTECA</h2>
          <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-tighter">Gestão baseada na planilha oficial da escola</p>
        </div>

        <Card className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2 uppercase">
              {editingId ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Editando Registro' : 'Novo Livro'}
            </h3>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData({ titulo: '', autor: '', genero_texto: '', quantidade_total: '', ano: '', editora: '', isbn: '' }); }} className="text-xs text-red-500 font-bold uppercase flex items-center gap-1"><X className="w-3 h-3" /> Cancelar</button>
            )}
          </div>
          <form onSubmit={handlePreSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div>
              <Label>ISBN (Obrigatório)</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="ISBN do Livro" value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} required />
              </div>
            </div>
            <div>
              <Label>Título</Label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Título completo" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} required />
              </div>
            </div>
            <div>
              <Label>Autor</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Nome do autor" value={formData.autor} onChange={e => setFormData({...formData, autor: e.target.value})} required />
              </div>
            </div>
            <div>
              <Label>Editora</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Nome da editora" value={formData.editora} onChange={e => setFormData({...formData, editora: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Ano</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Ano de lançamento" value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Classificação</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" list="lista-categorias" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" value={formData.genero_texto} onChange={e => setFormData({...formData, genero_texto: e.target.value})} placeholder="Gênero ou categoria" required />
                <datalist id="lista-categorias">{categoriasData.map(cat => <option key={cat.id} value={cat.nome} />)}</datalist>
              </div>
            </div>
            <div>
              <Label>Quantidade</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="number" className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-bold uppercase placeholder:normal-case placeholder:text-slate-400" placeholder="Qtd total" value={formData.quantidade_total} onChange={e => setFormData({...formData, quantidade_total: e.target.value})} required />
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <Button type="submit">{editingId ? 'Atualizar Registro' : 'Salvar na Biblioteca'}</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="BUSCAR POR TÍTULO, AUTOR, ISBN OU EDITORA..." className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl w-full text-sm outline-none shadow-sm font-bold uppercase" value={searchInput} onChange={e => { setSearchInput(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
            <Filter className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest shrink-0">Categoria:</span>
            <select
              value={selectedGenre}
              onChange={e => { setSelectedGenre(e.target.value === 'Todos' ? '' : e.target.value); setCurrentPage(1); }}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 outline-none cursor-pointer hover:border-[#1e3a5f] transition-all"
            >
              {generosDisponiveis.map(gen => (
                <option key={gen} value={gen}>{gen}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? <AcervoSkeleton /> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {livros.map((livro) => (
                <Card key={livro.id} className="p-6 hover:shadow-lg transition-all border-slate-50 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-2xl"><Book className="w-6 h-6" /></div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(livro)} className="p-2 text-slate-300 hover:text-amber-500 transition-colors"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => confirmDelete(livro.id, livro.titulo)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded text-blue-500 font-black uppercase flex items-center gap-1 w-fit"><Barcode className="w-3 h-3" /> ISBN: {livro.isbn}</span>
                  </div>
                  <h3 className="font-bold text-[#1e3a5f] text-lg mb-0 uppercase tracking-tighter leading-tight">{livro.titulo}</h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">{livro.autor}</p>
                  <div className="flex flex-col gap-0.5 mt-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
                      {livro.editora && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {livro.editora}</span>}
                      {livro.ano && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {livro.ano}</span>}
                    </div>
                    <p className="text-[10px] font-black text-[#1e3a5f]/60 uppercase tracking-widest flex items-center gap-1 mt-1"><Tag className="w-3 h-3" /> {livro.categoria_nome}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between">
                    <span className={`text-xs font-bold uppercase tracking-tighter ${livro.quantidade_disponivel === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                      {livro.quantidade_disponivel === 0 ? 'Indisponível' : `Disponível: ${livro.quantidade_disponivel} / ${livro.quantidade_total}`}
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {totalCount} livros • Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={!hasPrev}
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasNext}
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-[#1e3a5f] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                >
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