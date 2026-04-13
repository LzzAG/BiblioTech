from rest_framework import viewsets, permissions, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Aluno, Funcionario, Livro, Emprestimo, Historico, Categoria
from .serializers import (
    AlunoSerializer,
    FuncionarioSerializer,
    LivroSerializer,
    EmprestimoSerializer,
    HistoricoSerializer,
    CategoriaSerializer,
)


class StandardPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]


class HistoricoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Historico.objects.all()
    serializer_class = HistoricoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Historico.objects.all().order_by('-data_acao')
        tipo = self.request.query_params.get('tipo')
        search = self.request.query_params.get('search')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if search:
            queryset = queryset.filter(descricao__icontains=search)
        return queryset

    @action(detail=False, methods=['delete'], url_path='limpar')
    def limpar(self, request):
        dias = request.query_params.get('dias')
        if dias:
            try:
                dias = int(dias)
                corte = timezone.now() - timedelta(days=dias)
                deleted, _ = Historico.objects.filter(data_acao__lt=corte).delete()
                return Response({'deletados': deleted})
            except ValueError:
                return Response({'erro': 'Parâmetro inválido.'}, status=400)
        deleted, _ = Historico.objects.all().delete()
        return Response({'deletados': deleted})


class AlunoViewSet(viewsets.ModelViewSet):
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Aluno.objects.all().order_by('nome')
        search = self.request.query_params.get('search')
        turma = self.request.query_params.get('turma')
        if search:
            queryset = queryset.filter(Q(nome__icontains=search) | Q(turma__icontains=search))
        if turma:
            queryset = queryset.filter(turma=turma)
        return queryset

    def perform_create(self, serializer):
        aluno = serializer.save()
        Historico.objects.create(
            tipo='ADICIONADO',
            descricao=f"Aluno cadastrado: {aluno.nome} (Turma: {aluno.turma})"
        )


class FuncionarioViewSet(viewsets.ModelViewSet):
    queryset = Funcionario.objects.all()
    serializer_class = FuncionarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Funcionario.objects.all().order_by('nome')
        search = self.request.query_params.get('search')
        cargo = self.request.query_params.get('cargo')
        if search:
            queryset = queryset.filter(Q(nome__icontains=search) | Q(cargo__icontains=search))
        if cargo:
            queryset = queryset.filter(cargo=cargo)
        return queryset

    def perform_create(self, serializer):
        funcionario = serializer.save()
        Historico.objects.create(
            tipo='ADICIONADO',
            descricao=f"Funcionário cadastrado: {funcionario.nome} ({funcionario.cargo})"
        )


class LivroViewSet(viewsets.ModelViewSet):
    queryset = Livro.objects.all()
    serializer_class = LivroSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Livro.objects.select_related('categoria').all().order_by('titulo')
        search = self.request.query_params.get('search')
        categoria = self.request.query_params.get('categoria')
        if search:
            queryset = queryset.filter(
                Q(titulo__icontains=search) |
                Q(autor__icontains=search) |
                Q(isbn__icontains=search) |
                Q(editora__icontains=search)
            )
        if categoria:
            queryset = queryset.filter(categoria__nome=categoria)
        return queryset

    def perform_create(self, serializer):
        livro = serializer.save()
        Historico.objects.create(
            tipo='ADICIONADO',
            descricao=f"Novo título no acervo: {livro.titulo} [ISBN: {livro.isbn}]"
        )

    def perform_update(self, serializer):
        livro = serializer.save()
        Historico.objects.create(
            tipo='ATUALIZADO',
            descricao=f"Título atualizado: {livro.titulo} [ISBN: {livro.isbn}]"
        )

    def perform_destroy(self, instance):
        titulo = instance.titulo
        isbn = instance.isbn
        instance.delete()
        Historico.objects.create(
            tipo='EXCLUIDO',
            descricao=f"Livro removido: {titulo} [ISBN: {isbn}]"
        )


class EmprestimoViewSet(viewsets.ModelViewSet):
    queryset = Emprestimo.objects.all()
    serializer_class = EmprestimoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        return Emprestimo.objects.select_related('aluno', 'funcionario', 'livro').all().order_by('-data_emprestimo')

    def perform_create(self, serializer):
        emprestimo = serializer.save()
        pessoa = emprestimo.aluno.nome if emprestimo.aluno else emprestimo.funcionario.nome
        Historico.objects.create(
            tipo='EMPRESTADO',
            descricao=f"Empréstimo: '{emprestimo.livro.titulo}' para {pessoa}"
        )

    def perform_update(self, serializer):
        was_devolvido = serializer.instance.devolvido
        emprestimo = serializer.save()
        if not was_devolvido and emprestimo.devolvido:
            pessoa = emprestimo.aluno.nome if emprestimo.aluno else emprestimo.funcionario.nome
            Historico.objects.create(
                tipo='DEVOLVIDO',
                descricao=f"Devolvido: '{emprestimo.livro.titulo}' por {pessoa}"
            )

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        hoje = timezone.now().date()
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')

        emprestimos_qs = Emprestimo.objects.all()

        try:
            if mes and ano:
                emprestimos_qs = emprestimos_qs.filter(
                    data_emprestimo__month=int(mes),
                    data_emprestimo__year=int(ano)
                )
            elif ano:
                emprestimos_qs = emprestimos_qs.filter(
                    data_emprestimo__year=int(ano)
                )
        except (ValueError, TypeError):
            pass

        return Response({
            'total_livros': Livro.objects.count(),
            'total_alunos': Aluno.objects.count(),
            'total_funcionarios': Funcionario.objects.count(),
            'emprestimos_ativos': Emprestimo.objects.filter(devolvido=False).count(),
            'emprestimos_atrasados': Emprestimo.objects.filter(
                devolvido=False,
                data_devolucao_prevista__lt=hoje
            ).count(),
            'top_livros': list(
                emprestimos_qs.values('livro__titulo')
                .annotate(total=Count('id'))
                .order_by('-total')[:10]
            ),
            'top_alunos': list(
                emprestimos_qs.filter(aluno__isnull=False)
                .values('aluno__nome')
                .annotate(total=Count('id'))
                .order_by('-total')[:10]
            ),
            'top_funcionarios': list(
                emprestimos_qs.filter(funcionario__isnull=False)
                .values('funcionario__nome')
                .annotate(total=Count('id'))
                .order_by('-total')[:10]
            ),
        })