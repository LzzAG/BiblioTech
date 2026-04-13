# 📚 BiblioTech — Sistema de Gestão de Biblioteca Escolar
 
Sistema desenvolvido para as escolas municipais de Torres/RS, substituindo planilhas por uma plataforma centralizada, moderna e segura.
 
---
 
## 📖 Sobre o Projeto
 
O BiblioTech resolve a complexidade da gestão de bibliotecas escolares com foco em **auditoria, rastreabilidade e dados**. Além de gerenciar o ciclo completo de livros, alunos e funcionários, a plataforma analisa o comportamento de leitura, gera rankings e garante que cada ação no sistema seja registrada para controle e segurança.
 
---
 
## 🚀 Funcionalidades
 
### 📝 Cadastros
- **Acervo:** Inventário completo com controle de exemplares disponíveis por ISBN
- **Alunos:** Cadastro com turma, busca e filtro por turma
- **Funcionários:** Cadastro de servidores com cargo
 
### 📦 Empréstimos
- Empréstimo para aluno **ou** funcionário
- Busca por título **ou ISBN**
- Limite de 1 livro ativo por pessoa
- Bloqueio automático para inadimplentes
- Controle de datas com status: No Prazo, Vence Hoje, Atrasado
- Proteção contra concorrência com `select_for_update()`
 
### 📊 Relatórios e Estatísticas
- Totais de livros, alunos e funcionários
- Locações ativas e pendências
- **Top 10 Livros** mais emprestados
- **Top 10 Alunos** mais leitores
- **Top 10 Funcionários** mais leitores
- Filtro por **mês e ano**
 
### 📜 Histórico de Auditoria
- Log completo de todas as ações do sistema
- Filtro por tipo: Cadastros, Edições, Empréstimos, Devoluções, Exclusões
- Busca em logs
- Limpeza manual por período (30, 60, 90 dias ou tudo)
 
---
 
## 🛠️ Stack Tecnológica
 
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Gerenciamento de estado | TanStack Query (React Query) |
| Backend | Django REST Framework + Simple JWT |
| Banco de Dados | PostgreSQL via Supabase |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |
| Keep-alive | cron-job.org |
