import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, Search, PlusCircle, BookUp, CheckCircle, Trash2, Calendar, Clock, ListFilter, Edit3, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import type { LogHistorico, PaginatedResponse } from '../../types';

import { Card } from './ui';

const Badge = React.memo(({ tipo }: { tipo: LogHistorico['tipo'] }) => {
  const configs: Record<LogHistorico['tipo'], { color: string, icon: LucideIcon, label: string }> = {
    'ADICIONADO': { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: PlusCircle, label: 'Cadastro' },
    'ATUALIZADO': { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Edit3, label: 'Edição' },
    'EMPRESTADO': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: BookUp, label: 'Empréstimo' },
    'DEVOLVIDO': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle, label: 'Devolução' },
    'EXCLUIDO': { color: 'bg-red-50 text-red-600 border-red-100', icon: Trash2, label: 'Exclusão' },
  };

  const config = configs[tipo] || configs['ADICIONADO'];
  const Icon = config.icon;

  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border flex items-center gap-1.5 w-fit uppercase tracking-wider ${config.color}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  );
});

function LimparModal({ onClose, onConfirm, isLimpando }: {
  onClose: () => void;
  onConfirm: (dias: number | null) => void;
  isLimpando: boolean;
}) {
  const [diasSelecionados, setDiasSelecionados] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
      className="flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
    >
      <Card className="w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-[#1e3a5f] uppercase tracking-tight mb-2">Limpar Histórico</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">Selecione o período a apagar:</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Logs com mais de 30 dias', dias: 30 },
              { label: 'Logs com mais de 60 dias', dias: 60 },
              { label: 'Logs com mais de 90 dias', dias: 90 },
              { label: 'Apagar tudo', dias: null },
            ].map((op) => (
              <button
                key={op.dias ?? 'tudo'}
                onClick={() => setDiasSelecionados(op.dias)}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase transition-all border ${
                  diasSelecionados === op.dias
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#1e3a5f]'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-200 uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={() => diasSelecionados !== undefined && onConfirm(diasSelecionados)}
            disabled={diasSelecionados === undefined || isLimpando}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold uppercase text-xs hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLimpando ? 'Limpando...' : 'Confirmar'}
          </button>
        </div>
      </Card>
    </div>,
    document.body
  );
}

export function HistoricoSection() {
  const queryClient = useQueryClient();
  const [filtroTipo, setFiltroTipo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLimparModalOpen, setIsLimparModalOpen] = useState(false);
  const [isLimpando, setIsLimpando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['historico', currentPage, filtroTipo, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (searchTerm) params.set('search', searchTerm);
      const response = await api.get<PaginatedResponse<LogHistorico>>(`historico/?${params.toString()}`);
      return response.data;
    },
  });

  const logs = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;
  const totalPages = Math.ceil(totalCount / 20);

  const handleLimpar = async (dias: number | null) => {
    try {
      setIsLimpando(true);
      const params = dias ? `?dias=${dias}` : '';
      await api.delete(`historico/limpar/${params}`);
      queryClient.invalidateQueries({ queryKey: ['historico'] });
      setIsLimparModalOpen(false);
      setCurrentPage(1);
    } catch {
      // erro silencioso
    } finally {
      setIsLimpando(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {isLimparModalOpen && (
        <LimparModal
          onClose={() => setIsLimparModalOpen(false)}
          onConfirm={handleLimpar}
          isLimpando={isLimpando}
        />
      )}

      <div className="flex flex-col gap-4 mt-16 md:mt-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[#1e3a5f] text-xl md:text-2xl font-black tracking-tight uppercase flex items-center gap-2">
              <History className="w-6 h-6 md:w-7 md:h-7" /> Histórico
            </h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-tighter">Trilha de auditoria do sistema</p>
          </div>
          <button
            onClick={() => setIsLimparModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-[10px] font-black uppercase border border-red-100"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: '', label: 'TODOS' },
            { id: 'ADICIONADO', label: 'CADASTROS' },
            { id: 'ATUALIZADO', label: 'EDIÇÕES' },
            { id: 'EMPRESTADO', label: 'EMPRÉSTIMOS' },
            { id: 'DEVOLVIDO', label: 'DEVOLUÇÕES' },
            { id: 'EXCLUIDO', label: 'EXCLUSÕES' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setFiltroTipo(t.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                filtroTipo === t.id ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          placeholder="BUSCAR EM LOGS..."
          className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl w-full text-sm outline-none shadow-sm font-bold uppercase"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="space-y-3 relative">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
          </div>
        )}

        {!isLoading && logs.map((log) => (
          <Card key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-md transition-all border-slate-50 group">
            <div className="flex items-start gap-4 flex-1">
              <div className="mt-0.5 shrink-0">
                <Badge tipo={log.tipo} />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-tighter leading-snug break-words">
                  {log.descricao}
                </p>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase whitespace-nowrap">
                    <Calendar className="w-3 h-3" /> {new Date(log.data_acao).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase border-l border-slate-200 pl-3 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {new Date(log.data_acao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!isLoading && logs.length === 0 && (
          <div className="py-20 text-center space-y-3 opacity-30">
            <ListFilter className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Nenhum registro encontrado</p>
          </div>
        )}
      </div>

      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {totalCount} registros • Página {currentPage} de {totalPages}
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
      )}
    </div>
  );
}