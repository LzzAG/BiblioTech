# 📚 BiblioTech — Sistema de Gestão de Biblioteca Escolar

## 📖 Sobre o Projeto

Este sistema foi desenvolvido para gerenciar o acervo e os empréstimos de livros nas bibliotecas da rede municipal de ensino de Torres/RS. O foco é substituir o controle manual por planilhas por uma plataforma centralizada, segura e com rastreabilidade completa. Através de um painel único, as bibliotecárias conseguem cadastrar livros, registrar empréstimos para alunos e funcionários, acompanhar devoluções pendentes e analisar o comportamento de leitura da comunidade escolar com rankings e relatórios filtráveis.

## 🚀 Funcionalidades Principais

### 📦 Controle de Empréstimos

- **Registro de Empréstimos:** Empréstimo para aluno ou funcionário com busca por título ou ISBN e seleção assistida.
- **Regras de Negócio:** Limite de 1 livro ativo por pessoa com bloqueio automático para quem possui livros atrasados.
- **Status Visual:** Indicadores de prazo em tempo real — No Prazo, Vence Hoje e Atrasado com contagem de dias.
- **Controle de Concorrência:** Proteção contra condições de corrida nos empréstimos com `select_for_update()`.

### 📊 Relatórios e Auditoria

- **Dashboard Analítico:** Totais gerais, empréstimos ativos/atrasados, Top 10 Livros, Top 10 Alunos e Top 10 Funcionários mais leitores.
- **Filtros por Período:** Análise de empréstimos por mês e ano para acompanhamento pedagógico.
- **Histórico de Auditoria:** Log completo de todas as ações do sistema (cadastros, edições, empréstimos, devoluções, exclusões) com filtro por tipo, busca por descrição e limpeza por período.

### 📝 Gestão de Cadastros

- **Acervo:** Inventário completo com controle de exemplares disponíveis por ISBN, filtro por categoria e paginação server-side.
- **Alunos:** Cadastro com turma, busca por nome, filtro por turma e validação de duplicatas.
- **Funcionários:** Cadastro de servidores com cargo para empréstimos de uso profissional.

## 🛠️ Stack Tecnológica

- **Frontend:** React 19 com TypeScript, Vite e TailwindCSS. Gerenciamento de estado do servidor com TanStack Query (React Query).
- **Backend:** Python com Django REST Framework e autenticação via Simple JWT.
- **Banco de Dados:** PostgreSQL via Supabase com Row Level Security (RLS) habilitado.
- **Deploy:** Frontend na Vercel, backend no Render.

## 🛡️ Segurança

Como um projeto em produção em ambiente escolar com dados de alunos, a segurança foi tratada como prioridade:

- **Headers de Produção:** HSTS com preload (1 ano), SSL redirect, Secure Cookies, X-Frame-Options DENY e Content-Type nosniff — ativados apenas quando `DEBUG=False`.
- **Autenticação JWT:** Access token (10h) + refresh token (24h) com flow de renovação automática e queue de requisições concorrentes no frontend.
- **Rate Limiting:** Throttle customizado no endpoint de login (10 requisições/minuto) para mitigar brute force.
- **CORS Restrito:** Origens permitidas configuradas por variável de ambiente em produção, liberado apenas em desenvolvimento.
- **Tipagem Estrita:** Zero `any` no TypeScript — todas as respostas da API são tipadas com interfaces centralizadas.

## 🧪 Testes

49 testes automatizados cobrindo:

- **Autenticação:** Login, senha errada, endpoint sem token, refresh token válido e inválido.
- **CRUD Completo:** Livros, alunos, funcionários e categorias — criar, editar, deletar, buscar e filtrar.
- **Regras de Negócio:** Limite de 1 empréstimo ativo por pessoa, bloqueio por atraso (aluno e funcionário), rejeição sem estoque, ISBN duplicado, aluno duplicado na mesma turma.
- **Integridade:** Histórico criado em cada ação, devolução via PATCH restaura estoque, delete de livro com empréstimo ativo é rejeitado.
- **Dashboard e Histórico:** Retorno correto de dados, filtros por mês/ano, busca por descrição, limpeza por período.
