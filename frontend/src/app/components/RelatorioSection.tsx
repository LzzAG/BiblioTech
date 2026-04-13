import React, { useState } from 'react';
import { BarChart3, BookOpen, Users, Award, Star, Clock, Briefcase, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { DashboardData } from '../../types';

const Card = React.memo((props: React.HTMLAttributes<HTMLDivElement> & { className?: string }) => (
  <div {...props} className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6 ${props.className ?? ''}`} />
));

function RelatorioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6 animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
            <div className="flex items-center justify-between">
              <div className="h-7 bg-slate-200 rounded w-16" />
              <div className="w-6 h-6 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const anoAtual = new Date().getFullYear();
const ANOS = Array.from({ length: 3 }, (_, i) => anoAtual - i);

export function RelatorioSection() {
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [anoSelecionado, setAnoSelecionado] = useState(String(anoAtual));

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', mesSelecionado, anoSelecionado],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mesSelecionado) params.set('mes', mesSelecionado);
      if (anoSelecionado) params.set('ano', anoSelecionado);
      const response = await api.get<DashboardData>(`emprestimos/dashboard/?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const labelPeriodo = mesSelecionado
    ? `${MESES.find(m => m.value === mesSelecionado)?.label} de ${anoSelecionado}`
    : `Ano ${anoSelecionado}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-16 md:mt-0">
        <div>
          <h2 className="text-[#1e3a5f] text-xl md:text-2xl font-black tracking-tight uppercase">Relatórios e Estatísticas</h2>
          <p className="text-slate-400 text-[10px] md:text-xs font-bold tracking-widest uppercase">Sistema Online - SEC. EDUCAÇÃO</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <Filter className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" />
          <select
            value={mesSelecionado}
            onChange={e => setMesSelecionado(e.target.value)}
            className="text-xs font-black uppercase text-slate-600 outline-none cursor-pointer bg-transparent"
          >
            {MESES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <span className="text-slate-300">|</span>
          <select
            value={anoSelecionado}
            onChange={e => setAnoSelecionado(e.target.value)}
            className="text-xs font-black uppercase text-slate-600 outline-none cursor-pointer bg-transparent"
          >
            {ANOS.map(a => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? <RelatorioSkeleton /> : data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-600 bg-blue-50/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total de Livros</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xl md:text-2xl font-black text-[#1e3a5f]">{data.total_livros}</p>
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </Card>
            <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total de Alunos</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xl md:text-2xl font-black text-[#1e3a5f]">{data.total_alunos}</p>
                <Users className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
            </Card>
            <Card className="border-l-4 border-l-purple-600 bg-purple-50/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Funcionários</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xl md:text-2xl font-black text-[#1e3a5f]">{data.total_funcionarios ?? 0}</p>
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </Card>
            <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Locações Ativas</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xl md:text-2xl font-black text-amber-600">{data.emprestimos_ativos}</p>
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
              </div>
            </Card>
            <Card className="border-l-4 border-l-rose-500 bg-rose-50/30">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendências</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xl md:text-2xl font-black text-rose-600">{data.emprestimos_atrasados}</p>
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
              </div>
            </Card>
          </div>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Rankings — {labelPeriodo}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-md border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-blue-600 font-black text-xs uppercase tracking-widest">
                <Award className="w-5 h-5 fill-blue-100" /> Top 10 Livros
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {data.top_livros.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs uppercase font-bold py-10 opacity-50">Sem dados no período</p>
                ) : data.top_livros.map((item, i) => (
                  <div key={`livro-${i}`} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-[10px] md:text-[11px] font-black text-white shadow-lg shadow-blue-200">{i+1}º</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700 group-hover:text-blue-700 uppercase truncate">{item.livro__titulo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <BookOpen className="w-3 h-3 text-blue-500" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{`${item.total} ${item.total === 1 ? 'Locação' : 'Locações'}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="shadow-md border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-blue-600 font-black text-xs uppercase tracking-widest">
                <Star className="w-5 h-5 fill-blue-600" /> Top 10 Alunos
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {data.top_alunos.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs uppercase font-bold py-10 opacity-50">Sem dados no período</p>
                ) : data.top_alunos.map((item, i) => (
                  <div key={`aluno-${i}`} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-[10px] md:text-[11px] font-black text-white shadow-lg shadow-blue-200">{i+1}º</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700 group-hover:text-blue-700 uppercase truncate">{item.aluno__nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{`${item.total} ${item.total === 1 ? 'Livro lido' : 'Livros lidos'}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="shadow-md border-slate-200">
              <div className="flex items-center gap-2 mb-6 text-purple-600 font-black text-xs uppercase tracking-widest">
                <Briefcase className="w-5 h-5" /> Top 10 Funcionários
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {!data.top_funcionarios || data.top_funcionarios.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs uppercase font-bold py-10 opacity-50">Sem dados no período</p>
                ) : data.top_funcionarios.map((item, i) => (
                  <div key={`func-${i}`} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-200 transition-all group">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-purple-600 flex items-center justify-center text-[10px] md:text-[11px] font-black text-white shadow-lg shadow-purple-200">{i+1}º</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700 group-hover:text-purple-700 uppercase truncate">{item.funcionario__nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{`${item.total} ${item.total === 1 ? 'Livro lido' : 'Livros lidos'}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}