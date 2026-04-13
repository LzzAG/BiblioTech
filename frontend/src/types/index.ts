export interface Categoria {
  id: number;
  nome: string;
}

export interface Aluno {
  id: number;
  nome: string;
  turma: string;
}

export interface Funcionario {
  id: number;
  nome: string;
  cargo: string;
}

export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  ano: number | null;
  editora: string | null;
  isbn: string;
  categoria: number;
  categoria_nome?: string;
  quantidade_total: number;
  quantidade_disponivel: number;
}

export interface Emprestimo {
  id: number;
  livro: number;
  data_emprestimo: string;
  data_devolucao_prevista: string;
  devolvido: boolean;
  livro_titulo?: string;
  aluno?: number;
  aluno_nome?: string;
  aluno_turma?: string;
  funcionario?: number;
  funcionario_nome?: string;
  funcionario_cargo?: string;
}

export interface LogHistorico {
  id: number;
  tipo: 'ADICIONADO' | 'ATUALIZADO' | 'EMPRESTADO' | 'DEVOLVIDO' | 'EXCLUIDO';
  descricao: string;
  data_acao: string;
  data_formatada?: string;
}

export interface DashboardData {
  total_livros: number;
  total_alunos: number;
  total_funcionarios?: number;
  emprestimos_ativos: number;
  emprestimos_atrasados: number;
  top_livros: { livro__titulo: string; total: number }[];
  top_alunos: { aluno__nome: string; total: number }[];
  top_funcionarios?: { funcionario__nome: string; total: number }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}