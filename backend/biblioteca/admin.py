from django.contrib import admin
from .models import Aluno, Funcionario, Livro, Emprestimo, Categoria, Historico

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome')
    search_fields = ('nome',)

@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'turma')
    search_fields = ('nome', 'turma')
    list_filter = ('turma',)

@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cargo')
    search_fields = ('nome', 'cargo')
    list_filter = ('cargo',)

@admin.register(Livro)
class LivroAdmin(admin.ModelAdmin):
    list_display = ('isbn', 'titulo', 'autor', 'editora', 'ano', 'categoria', 'quantidade_disponivel', 'quantidade_total')
    search_fields = ('isbn', 'titulo', 'autor', 'editora', 'categoria__nome')
    list_filter = ('categoria', 'editora', 'ano')
    autocomplete_fields = ('categoria',)

@admin.register(Emprestimo)
class EmprestimoAdmin(admin.ModelAdmin):
    list_display = ('livro', 'aluno', 'data_emprestimo', 'data_devolucao_prevista', 'devolvido')
    list_filter = ('devolvido', 'data_emprestimo')
    search_fields = ('aluno__nome', 'livro__titulo', 'livro__isbn')
    autocomplete_fields = ('aluno', 'livro')

@admin.register(Historico)
class HistoricoAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'descricao', 'data_acao')
    list_filter = ('tipo', 'data_acao')
    search_fields = ('descricao',)
    readonly_fields = ('tipo', 'descricao', 'data_acao')