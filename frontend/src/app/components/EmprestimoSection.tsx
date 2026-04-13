import React, { useState, useMemo, useCallback } from 'react';
import { BookOpen, Search, User, Check, Clock, AlertCircle, CalendarDays, Filter, ChevronLeft, ChevronRight, Briefcase, Barcode } from 'lucide-react';
import { format, differenceInDays, parse, isToday, isBefore, startOfDay, isWithinInterval, addDays } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '../../services/api';
import { Card, Badge } from './ui';
import { ErrorModal, ConfirmModal } from './ui';
import type { Emprestimo, Livro, Aluno, Funcionario, PaginatedResponse } from '../../types';

function EmprestimoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
            <div className="text-right">
              <div className="h-2.5 bg-slate-200 rounded w-16 mb-1.5" />
              <div className="h-3 bg-slate-200 rounded w-20" />
            </div>
            <div className="h-6 bg-slate-200 rounded-md w-20" />
            <div className="h-8 bg-slate-200 rounded-lg w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmprestimoSection() {
  const queryClient = useQueryClient();
  const [tipoPessoa, setTipoPessoa] = useState<'aluno' | 'funcionario'>('aluno');
  const [searchLivro, setSearchLivro] = useState('');
  const [searchPessoa, setSearchPessoa] = useState('');
  const [showLivroResults, setShowLivroResults] = useState(false);
  const [showPessoaResults, setShowPessoaResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'hoje' | 'atrasados' | 'semana'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Emprestimo | null>(null);
  const [formData, setFormData] = useState({ livro: '', livro_nome: '', pessoa_id: '', pessoa_nome: '', data_saida_br: format(new Date(), 'dd/MM/yyyy'), data_devolucao_br: '' });

  const { data: empData, isLoading: isLoadingEmp } = useQuery({
    queryKey: ['emprestimos', currentPage],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Emprestimo>>(`emprestimos/?page=${currentPage}`);
      return response.data;
    },
  });

  const emprestimos = empData?.results ?? [];
  const totalCount = empData?.count ?? 0;
  const hasNext = !!empData?.next;
  const hasPrev = !!empData?.previous;
  const totalPages = Math.ceil(totalCount / 20);

  const { data: livrosSugestao = [], isFetching: isFetchingLivros } = useQuery({
    queryKey: ['livros-search', searchLivro],
    queryFn: async () => {
      if (searchLivro.length < 2) return [];
      const response = await api.get<PaginatedResponse<Livro>>(`livros/?search=${searchLivro}&page_size=10`);
      return response.data.results.filter(l => l.quantidade_disponivel > 0);
    },
    enabled: searchLivro.length >= 2,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: pessoasSugestao = [], isFetching: isFetchingPessoas } = useQuery({
    queryKey: ['pessoa-search', tipoPessoa, searchPessoa],
    queryFn: async () => {
      if (searchPessoa.length < 2) return [];
      if (tipoPessoa === 'aluno') {
        const response = await api.get<PaginatedResponse<Aluno>>(`alunos/?search=${searchPessoa}&page_size=10`);
        return response.data.results;
      } else {
        const response = await api.get<PaginatedResponse<Funcionario>>(`funcionarios/?search=${searchPessoa}&page_size=10`);
        return response.data.results;
      }
    },
    enabled: searchPessoa.length >= 2,
    staleTime: 0,
    gcTime: 0,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
    queryClient.invalidateQueries({ queryKey: ['livros'] });
    queryClient.invalidateQueries({ queryKey: ['alunos'] });
    queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  }, [queryClient]);

  const applyMask = (value: string) => {
    const raw = value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2) formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    if (raw.length > 4) formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.livro || !formData.pessoa_id || !formData.data_devolucao_br || !formData.data_saida_br) {
      setErrorMessage("Por favor, selecione o livro e o " + (tipoPessoa === 'aluno' ? 'aluno' : 'funcionário') + " na lista de sugestões antes de registrar.");
      setIsErrorModalOpen(true);
      return;
    }
    try {
      const parsedSaida = parse(formData.data_saida_br, 'dd/MM/yyyy', new Date());
      const parsedDevolucao = parse(formData.data_devolucao_br, 'dd/MM/yyyy', new Date());

      if (isNaN(parsedSaida.getTime()) || isNaN(parsedDevolucao.getTime())) {
        setErrorMessage("Data inválida. Use o formato DD/MM/AAAA.");
        setIsErrorModalOpen(true);
        return;
      }

      const dateSaida = format(parsedSaida, 'yyyy-MM-dd');
      const dateDevolucao = format(parsedDevolucao, 'yyyy-MM-dd');
      const payload: Record<string, string | number> = {
        livro: parseInt(formData.livro),
        data_emprestimo: dateSaida,
        data_devolucao_prevista: dateDevolucao,
      };
      if (tipoPessoa === 'aluno') {
        payload.aluno = parseInt(formData.pessoa_id);
      } else {
        payload.funcionario = parseInt(formData.pessoa_id);
      }
      await api.post('emprestimos/', payload);
      setFormData({ livro: '', livro_nome: '', pessoa_id: '', pessoa_nome: '', data_saida_br: format(new Date(), 'dd/MM/yyyy'), data_devolucao_br: '' });
      setSearchLivro(''); setSearchPessoa('');
      invalidateAll();
    } catch (error) {
      const apiResponseData = isAxiosError(error) ? error.response?.data : null;
      let msg = "Erro ao registrar empréstimo.";
      if (apiResponseData) {
        if (apiResponseData.livro) msg = apiResponseData.livro;
        else if (apiResponseData.aluno) msg = apiResponseData.aluno;
        else if (apiResponseData.funcionario) msg = apiResponseData.funcionario;
        else if (apiResponseData.non_field_errors) msg = apiResponseData.non_field_errors[0];
      }
      setErrorMessage(msg);
      setIsErrorModalOpen(true);
    }
  };

  const handleDevolucao = async () => {
    if (!selectedEmp) return;
    try {
      await api.patch(`emprestimos/${selectedEmp.id}/`, { devolvido: true });
      setIsModalOpen(false);
      invalidateAll();
    } catch (error) {
      setErrorMessage("Erro ao processar a devolução.");
      setIsErrorModalOpen(true);
    }
  };

  const getStatus = useCallback((emp: Emprestimo) => {
    const deadline = startOfDay(new Date(emp.data_devolucao_prevista));
    const today = startOfDay(new Date());
    const diff = differenceInDays(deadline, today);
    if (diff < 0) return <Badge className="bg-red-50 text-red-600 border-red-100"><AlertCircle className="w-3 h-3"/> Atrasado {Math.abs(diff)}d</Badge>;
    if (diff === 0) return <Badge className="bg-amber-50 text-amber-600 border-amber-100"><Clock className="w-3 h-3"/> Vence Hoje</Badge>;
    return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100"><Check className="w-3 h-3"/> No Prazo</Badge>;
  }, []);

  const filteredEmprestimos = useMemo(() => {
    const active = emprestimos.filter(emp => !emp.devolvido);
    const today = startOfDay(new Date());
    switch (filterStatus) {
      case 'hoje': return active.filter(emp => isToday(new Date(emp.data_devolucao_prevista)));
      case 'atrasados': return active.filter(emp => isBefore(new Date(emp.data_devolucao_prevista), today) && !isToday(new Date(emp.data_devolucao_prevista)));
      case 'semana': return active.filter(emp => { const date = new Date(emp.data_devolucao_prevista); return isWithinInterval(date, { start: today, end: addDays(today, 7) }); });
      default: return active;
    }
  }, [emprestimos, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <ErrorModal isOpen={isErrorModalOpen} message={errorMessage} onClose={() => setIsErrorModalOpen(false)} />

      <ConfirmModal
        isOpen={isModalOpen}
        icon={<Check className="w-10 h-10 text-emerald-600" />}
        iconBg="bg-emerald-50"
        title="Confirmar Baixa?"
        description={<>Deseja confirmar a devolução de <span className="font-bold text-slate-700">"{selectedEmp?.livro_titulo}"</span>?</>}
        confirmLabel="Confirmar"
        confirmColor="bg-emerald-500 hover:bg-emerald-700"
        onConfirm={handleDevolucao}
        onCancel={() => setIsModalOpen(false)}
      />

      <div className="flex flex-col mt-16 md:mt-0">
        <h2 className="text-[#1e3a5f] text-xl md:text-2xl font-black tracking-tight uppercase">Gestão de Empréstimos</h2>
        <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-tighter">Controle de saídas e devoluções de livros</p>
      </div>

      <Card className="p-4 md:p-6 border-none shadow-xl bg-white overflow-visible">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setTipoPessoa('aluno'); setFormData(f => ({...f, pessoa_id: '', pessoa_nome: ''})); setSearchPessoa(''); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${tipoPessoa === 'aluno' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-400 border-slate-200'}`}
          >
            <User className="w-3.5 h-3.5 inline mr-1" /> Aluno
          </button>
          <button
            onClick={() => { setTipoPessoa('funcionario'); setFormData(f => ({...f, pessoa_id: '', pessoa_nome: ''})); setSearchPessoa(''); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${tipoPessoa === 'funcionario' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-400 border-slate-200'}`}
          >
            <Briefcase className="w-3.5 h-3.5 inline mr-1" /> Funcionário
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Livro ou ISBN</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Título ou ISBN..."
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium uppercase placeholder:normal-case placeholder:text-slate-400"
                value={searchLivro || formData.livro_nome}
                onChange={(e) => { setSearchLivro(e.target.value); setFormData({...formData, livro: '', livro_nome: ''}); setShowLivroResults(true); }}
                onFocus={() => setShowLivroResults(true)}
              />
            </div>
            {showLivroResults && searchLivro && searchLivro.length >= 2 && (
              <div className="absolute z-[999] w-full bg-white border border-slate-100 rounded-xl shadow-2xl mt-2 max-h-56 overflow-y-auto">
                {isFetchingLivros ? (
                  <div className="p-4 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e3a5f]"></div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Buscando livros...</span>
                  </div>
                ) : (
                  <>
                    {livrosSugestao.map(l => (
                      <div
                        key={l.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onMouseDown={() => { setFormData({...formData, livro: l.id.toString(), livro_nome: l.titulo}); setSearchLivro(l.titulo); setShowLivroResults(false); }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-700 text-sm uppercase leading-tight">{l.titulo}</span>
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 shrink-0">{l.quantidade_disponivel} DISP</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-bold">{l.isbn}</span>
                        </div>
                      </div>
                    ))}
                    {livrosSugestao.length === 0 && <p className="p-3 text-xs text-slate-400 uppercase font-bold">Nenhum livro disponível</p>}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{tipoPessoa === 'aluno' ? 'Aluno' : 'Funcionário'}</label>
            <div className="relative">
              {tipoPessoa === 'aluno' ? <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              <input
                type="text"
                placeholder={`Buscar ${tipoPessoa === 'aluno' ? 'aluno' : 'funcionário'}...`}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium uppercase placeholder:normal-case placeholder:text-slate-400"
                value={searchPessoa || formData.pessoa_nome}
                onChange={(e) => { setSearchPessoa(e.target.value); setFormData({...formData, pessoa_id: '', pessoa_nome: ''}); setShowPessoaResults(true); }}
                onFocus={() => setShowPessoaResults(true)}
              />
            </div>
            {showPessoaResults && searchPessoa && searchPessoa.length >= 2 && (
              <div className="absolute z-[999] w-full bg-white border border-slate-100 rounded-xl shadow-2xl mt-2 max-h-56 overflow-y-auto">
                {isFetchingPessoas ? (
                  <div className="p-4 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e3a5f]"></div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Buscando...</span>
                  </div>
                ) : (
                  <>
                    {pessoasSugestao.map((p: Aluno | Funcionario) => (
                      <div
                        key={p.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0 flex justify-between items-center"
                        onMouseDown={() => { setFormData({...formData, pessoa_id: p.id.toString(), pessoa_nome: p.nome}); setSearchPessoa(p.nome); setShowPessoaResults(false); }}
                      >
                        <p className="font-semibold text-slate-700 uppercase">{p.nome}</p>
                        <p className="text-[10px] text-[#1e3a5f] font-black uppercase">{tipoPessoa === 'aluno' ? (p as Aluno).turma : (p as Funcionario).cargo}</p>
                      </div>
                    ))}
                    {pessoasSugestao.length === 0 && <p className="p-3 text-xs text-slate-400 uppercase font-bold">Nenhum resultado</p>}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data de Saída</label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" maxLength={10} placeholder="Ex: 04/02/2026" className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium text-slate-600 placeholder:normal-case placeholder:text-slate-400" value={formData.data_saida_br} onChange={(e) => setFormData({...formData, data_saida_br: applyMask(e.target.value)})} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data de Devolução</label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" maxLength={10} placeholder="Ex: 11/02/2026" className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm outline-none font-medium text-slate-600 placeholder:normal-case placeholder:text-slate-400" value={formData.data_devolucao_br} onChange={(e) => setFormData({...formData, data_devolucao_br: applyMask(e.target.value)})} />
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button type="submit" className="w-full md:w-auto px-10 py-3 bg-[#1e3a5f] text-white rounded-lg transition-all hover:bg-[#152d47] active:scale-95 flex items-center justify-center text-sm font-bold shadow-md uppercase tracking-widest">Registrar Empréstimo</button>
          </div>
        </form>
      </Card>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl flex-shrink-0"><Filter className="w-3.5 h-3.5 text-[#1e3a5f]" /><span className="text-[10px] font-black uppercase tracking-tight">Filtrar:</span></div>
        {(['todos', 'hoje', 'semana', 'atrasados'] as const).map(id => (
          <button key={id} onClick={() => setFilterStatus(id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex-shrink-0 ${filterStatus === id ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-400'}`}>
            {id === 'todos' ? 'Todos' : id === 'hoje' ? 'Vencem Hoje' : id === 'semana' ? 'Nesta Semana' : 'Atrasados'}
          </button>
        ))}
      </div>

      {isLoadingEmp ? <EmprestimoSkeleton /> : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {filteredEmprestimos.map((emp) => (
              <Card key={emp.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-slate-100 hover:shadow-md transition-all group gap-4">
                <div className="flex items-center gap-4 w-full truncate">
                  <div className="p-3 rounded-xl bg-[#1e3a5f] text-white shadow-lg shrink-0"><BookOpen className="w-5 h-5" /></div>
                  <div className="truncate">
                    <h4 className="font-bold text-[#1e3a5f] text-sm md:text-base uppercase truncate">{emp.livro_titulo}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      {emp.aluno_nome ? (
                        <p className="text-[10px] text-slate-500 font-bold uppercase truncate flex items-center gap-1">
                          <User className="w-3 h-3" /> {emp.aluno_nome} • {emp.aluno_turma || "SEM TURMA"}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-bold uppercase truncate flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {emp.funcionario_nome} • {emp.funcionario_cargo || "SEM CARGO"}
                        </p>
                      )}
                      <span className="text-[8px] text-slate-300">•</span>
                      <p className="text-[10px] text-slate-400 font-medium">Saída: {format(new Date(emp.data_emprestimo), 'dd/MM/yy')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Devolução</p>
                    <p className="text-xs font-bold text-slate-600">{format(new Date(emp.data_devolucao_prevista), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatus(emp)}
                    <button onClick={() => { setSelectedEmp(emp); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase shadow-md active:scale-95 transition-all">Baixar</button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredEmprestimos.length === 0 && (
              <div className="py-20 text-center space-y-2 opacity-30">
                <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-slate-400 text-sm font-black uppercase">Sem registros para este filtro</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {totalCount} empréstimos • Página {currentPage} de {totalPages || 1}
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
  );
}