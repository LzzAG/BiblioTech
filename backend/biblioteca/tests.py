from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from .models import Aluno, Funcionario, Livro, Categoria, Emprestimo, Historico


class ModelTestCase(TestCase):
    """Testes dos models e regras de negocio no banco"""

    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Infantil')
        self.livro = Livro.objects.create(
            titulo='O Pequeno Principe',
            autor='Saint-Exupery',
            isbn='978-0001',
            categoria=self.categoria,
            quantidade_total=2,
            quantidade_disponivel=2,
        )
        self.aluno = Aluno.objects.create(nome='Joao Silva', turma='9.1')

    def test_aluno_nome_formatado_title_case(self):
        aluno = Aluno.objects.create(nome='maria souza', turma='8.2')
        self.assertEqual(aluno.nome, 'Maria Souza')

    def test_aluno_turma_formatada_uppercase(self):
        aluno = Aluno.objects.create(nome='Pedro', turma='8a')
        self.assertEqual(aluno.turma, '8A')

    def test_aluno_duplicado_mesma_turma_rejeita(self):
        with self.assertRaises(Exception):
            Aluno.objects.create(nome='Joao Silva', turma='9.1')

    def test_emprestimo_decrementa_quantidade(self):
        Emprestimo.objects.create(
            aluno=self.aluno,
            livro=self.livro,
            data_emprestimo=date.today(),
            data_devolucao_prevista=date.today() + timedelta(days=7),
        )
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.quantidade_disponivel, 1)

    def test_devolucao_incrementa_quantidade(self):
        emp = Emprestimo.objects.create(
            aluno=self.aluno,
            livro=self.livro,
            data_emprestimo=date.today(),
            data_devolucao_prevista=date.today() + timedelta(days=7),
        )
        emp.devolvido = True
        emp.save()
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.quantidade_disponivel, 2)

    def test_emprestimo_sem_pessoa_rejeita(self):
        with self.assertRaises(ValidationError):
            Emprestimo.objects.create(
                livro=self.livro,
                data_emprestimo=date.today(),
                data_devolucao_prevista=date.today() + timedelta(days=7),
            )

    def test_emprestimo_com_aluno_e_funcionario_rejeita(self):
        func = Funcionario.objects.create(nome='Ana', cargo='Professora')
        with self.assertRaises(ValidationError):
            Emprestimo.objects.create(
                aluno=self.aluno,
                funcionario=func,
                livro=self.livro,
                data_emprestimo=date.today(),
                data_devolucao_prevista=date.today() + timedelta(days=7),
            )

    def test_livro_sem_estoque_rejeita_emprestimo(self):
        self.livro.quantidade_disponivel = 0
        self.livro.save(update_fields=['quantidade_disponivel'])
        with self.assertRaises(ValidationError):
            Emprestimo.objects.create(
                aluno=self.aluno,
                livro=self.livro,
                data_emprestimo=date.today(),
                data_devolucao_prevista=date.today() + timedelta(days=7),
            )

    def test_historico_criado_ao_cadastrar_livro_via_api(self):
        """Historico e criado pelas views, nao pelo model"""
        count_before = Historico.objects.count()
        self.assertEqual(count_before, 0)


class APITestCase(TestCase):
    """Testes da API REST com autenticacao"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='admin', password='admin123', is_staff=True)
        self.client.force_authenticate(user=self.user)

        self.categoria = Categoria.objects.create(nome='Infantil')
        self.livro = Livro.objects.create(
            titulo='O Pequeno Principe',
            autor='Saint-Exupery',
            isbn='978-0001',
            categoria=self.categoria,
            quantidade_total=2,
            quantidade_disponivel=2,
        )
        self.aluno = Aluno.objects.create(nome='Joao Silva', turma='9.1')
        self.funcionario = Funcionario.objects.create(nome='Ana Costa', cargo='Professora')

    # --- Autenticacao ---

    def test_endpoint_sem_autenticacao_retorna_401(self):
        client = APIClient()
        response = client.get('/api/alunos/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_retorna_tokens(self):
        client = APIClient()
        response = client.post('/api/token/', {'username': 'admin', 'password': 'admin123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_senha_errada_retorna_401(self):
        client = APIClient()
        response = client.post('/api/token/', {'username': 'admin', 'password': 'errada'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- CRUD Livros ---

    def test_criar_livro(self):
        response = self.client.post('/api/livros/', {
            'titulo': 'Dom Casmurro',
            'autor': 'Machado de Assis',
            'isbn': '978-0002',
            'categoria': self.categoria.id,
            'quantidade_total': 3,
            'quantidade_disponivel': 3,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Historico.objects.filter(tipo='ADICIONADO').exists())

    def test_criar_livro_isbn_duplicado_retorna_400(self):
        response = self.client.post('/api/livros/', {
            'titulo': 'Outro Livro',
            'autor': 'Autor',
            'isbn': '978-0001',
            'categoria': self.categoria.id,
            'quantidade_total': 1,
            'quantidade_disponivel': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_listar_livros_paginado(self):
        response = self.client.get('/api/livros/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)

    def test_buscar_livro_por_titulo(self):
        response = self.client.get('/api/livros/?search=Principe')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_filtrar_livro_por_categoria(self):
        response = self.client.get('/api/livros/?categoria=Infantil')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_deletar_livro_cria_historico(self):
        livro = Livro.objects.create(
            titulo='Temp', autor='Temp', isbn='978-TEMP',
            categoria=self.categoria, quantidade_total=1, quantidade_disponivel=1,
        )
        response = self.client.delete(f'/api/livros/{livro.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(Historico.objects.filter(tipo='EXCLUIDO').exists())

    def test_atualizar_livro_cria_historico(self):
        response = self.client.put(f'/api/livros/{self.livro.id}/', {
            'titulo': 'O Pequeno Principe - Ed. Especial',
            'autor': 'Saint-Exupery',
            'isbn': '978-0001',
            'categoria': self.categoria.id,
            'quantidade_total': 2,
            'quantidade_disponivel': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Historico.objects.filter(tipo='ATUALIZADO').exists())

    def test_deletar_livro_com_emprestimo_ativo_rejeita(self):
        Emprestimo.objects.create(
            aluno=self.aluno, livro=self.livro,
            data_emprestimo=date.today(),
            data_devolucao_prevista=date.today() + timedelta(days=7),
        )
        response = self.client.delete(f'/api/livros/{self.livro.id}/')
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])

    # --- CRUD Alunos ---

    def test_criar_aluno(self):
        response = self.client.post('/api/alunos/', {'nome': 'Maria Souza', 'turma': '8.2'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nome'], 'Maria Souza')

    def test_criar_aluno_duplicado_retorna_400(self):
        response = self.client.post('/api/alunos/', {'nome': 'Joao Silva', 'turma': '9.1'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_editar_aluno(self):
        response = self.client.put(f'/api/alunos/{self.aluno.id}/', {'nome': 'Joao Santos', 'turma': '9.2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.aluno.refresh_from_db()
        self.assertEqual(self.aluno.turma, '9.2')

    def test_deletar_aluno(self):
        aluno = Aluno.objects.create(nome='Temp Aluno', turma='1.1')
        response = self.client.delete(f'/api/alunos/{aluno.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_buscar_aluno_por_nome(self):
        response = self.client.get('/api/alunos/?search=Joao')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_filtrar_aluno_por_turma(self):
        Aluno.objects.create(nome='Outro Aluno', turma='8.1')
        response = self.client.get('/api/alunos/?turma=9.1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    # --- CRUD Funcionarios ---

    def test_criar_funcionario(self):
        response = self.client.post('/api/funcionarios/', {'nome': 'Carlos Lima', 'cargo': 'Diretor'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_editar_funcionario(self):
        response = self.client.put(f'/api/funcionarios/{self.funcionario.id}/', {'nome': 'Ana Costa', 'cargo': 'Diretora'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.funcionario.refresh_from_db()
        self.assertEqual(self.funcionario.cargo, 'Diretora')

    def test_deletar_funcionario(self):
        func = Funcionario.objects.create(nome='Temp Func', cargo='Temp')
        response = self.client.delete(f'/api/funcionarios/{func.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_buscar_funcionario_por_cargo(self):
        response = self.client.get('/api/funcionarios/?search=Professora')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    # --- CRUD Categorias ---

    def test_criar_categoria(self):
        response = self.client.post('/api/categorias/', {'nome': 'Romance'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_criar_categoria_duplicada_retorna_400(self):
        response = self.client.post('/api/categorias/', {'nome': 'Infantil'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_listar_categorias(self):
        response = self.client.get('/api/categorias/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Emprestimos ---

    def test_criar_emprestimo_aluno(self):
        response = self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.quantidade_disponivel, 1)

    def test_criar_emprestimo_funcionario(self):
        response = self.client.post('/api/emprestimos/', {
            'funcionario': self.funcionario.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_limite_1_emprestimo_ativo_por_aluno(self):
        self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        livro2 = Livro.objects.create(
            titulo='Segundo Livro', autor='Autor', isbn='978-0003',
            categoria=self.categoria, quantidade_total=1, quantidade_disponivel=1,
        )
        response = self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': livro2.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_limite_1_emprestimo_ativo_por_funcionario(self):
        self.client.post('/api/emprestimos/', {
            'funcionario': self.funcionario.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        livro2 = Livro.objects.create(
            titulo='Outro Livro', autor='Autor', isbn='978-0005',
            categoria=self.categoria, quantidade_total=1, quantidade_disponivel=1,
        )
        response = self.client.post('/api/emprestimos/', {
            'funcionario': self.funcionario.id,
            'livro': livro2.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bloqueio_aluno_com_atraso(self):
        self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': self.livro.id,
            'data_emprestimo': (date.today() - timedelta(days=14)).isoformat(),
            'data_devolucao_prevista': (date.today() - timedelta(days=7)).isoformat(),
        })
        livro2 = Livro.objects.create(
            titulo='Outro', autor='Autor', isbn='978-0004',
            categoria=self.categoria, quantidade_total=1, quantidade_disponivel=1,
        )
        response = self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': livro2.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bloqueio_funcionario_com_atraso(self):
        self.client.post('/api/emprestimos/', {
            'funcionario': self.funcionario.id,
            'livro': self.livro.id,
            'data_emprestimo': (date.today() - timedelta(days=14)).isoformat(),
            'data_devolucao_prevista': (date.today() - timedelta(days=7)).isoformat(),
        })
        livro2 = Livro.objects.create(
            titulo='Outro', autor='Autor', isbn='978-0006',
            categoria=self.categoria, quantidade_total=1, quantidade_disponivel=1,
        )
        response = self.client.post('/api/emprestimos/', {
            'funcionario': self.funcionario.id,
            'livro': livro2.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_devolucao_via_patch(self):
        resp = self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        emp_id = resp.data['id']
        response = self.client.patch(f'/api/emprestimos/{emp_id}/', {'devolvido': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.livro.refresh_from_db()
        self.assertEqual(self.livro.quantidade_disponivel, 2)
        self.assertTrue(Historico.objects.filter(tipo='DEVOLVIDO').exists())

    def test_livro_sem_estoque_rejeita_emprestimo_via_api(self):
        self.livro.quantidade_disponivel = 0
        self.livro.save(update_fields=['quantidade_disponivel'])
        response = self.client.post('/api/emprestimos/', {
            'aluno': self.aluno.id,
            'livro': self.livro.id,
            'data_emprestimo': date.today().isoformat(),
            'data_devolucao_prevista': (date.today() + timedelta(days=7)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Dashboard ---

    def test_dashboard_retorna_dados(self):
        response = self.client.get('/api/emprestimos/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_livros', response.data)
        self.assertIn('total_alunos', response.data)
        self.assertIn('emprestimos_ativos', response.data)
        self.assertIn('top_livros', response.data)

    def test_dashboard_filtro_por_mes_e_ano(self):
        response = self.client.get('/api/emprestimos/dashboard/?mes=1&ano=2026')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Historico ---

    def test_limpar_historico(self):
        Historico.objects.create(tipo='ADICIONADO', descricao='Teste')
        response = self.client.delete('/api/historico/limpar/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Historico.objects.count(), 0)

    def test_limpar_historico_por_periodo(self):
        from django.utils import timezone
        antigo = Historico.objects.create(tipo='ADICIONADO', descricao='Antigo')
        Historico.objects.filter(pk=antigo.pk).update(
            data_acao=timezone.now() - timedelta(days=60)
        )
        Historico.objects.create(tipo='ADICIONADO', descricao='Recente')
        response = self.client.delete('/api/historico/limpar/?dias=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deletados'], 1)
        self.assertEqual(Historico.objects.count(), 1)
        self.assertEqual(Historico.objects.first().descricao, 'Recente')

    def test_historico_filtro_por_tipo(self):
        Historico.objects.create(tipo='ADICIONADO', descricao='Add')
        Historico.objects.create(tipo='DEVOLVIDO', descricao='Dev')
        response = self.client.get('/api/historico/?tipo=ADICIONADO')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_historico_busca_por_descricao(self):
        Historico.objects.create(tipo='ADICIONADO', descricao='Livro XYZ cadastrado')
        Historico.objects.create(tipo='ADICIONADO', descricao='Aluno ABC cadastrado')
        response = self.client.get('/api/historico/?search=XYZ')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    # --- Refresh Token ---

    def test_refresh_token_retorna_novo_access(self):
        client = APIClient()
        login = client.post('/api/token/', {'username': 'admin', 'password': 'admin123'})
        refresh = login.data['refresh']
        response = client.post('/api/token/refresh/', {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_token_invalido_retorna_401(self):
        client = APIClient()
        response = client.post('/api/token/refresh/', {'refresh': 'token-invalido'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)