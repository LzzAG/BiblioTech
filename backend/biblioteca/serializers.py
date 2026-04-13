from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from django.utils import timezone
from .models import Aluno, Funcionario, Livro, Emprestimo, Historico, Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class AlunoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aluno
        fields = '__all__'
        validators = [
            UniqueTogetherValidator(
                queryset=Aluno.objects.all(),
                fields=['nome', 'turma'],
                message="Este aluno já está cadastrado nesta turma."
            )
        ]


class FuncionarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = '__all__'


class LivroSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.ReadOnlyField(source='categoria.nome')

    class Meta:
        model = Livro
        fields = ['id', 'titulo', 'autor', 'ano', 'editora', 'isbn', 'categoria', 'categoria_nome', 'quantidade_total', 'quantidade_disponivel']


class EmprestimoSerializer(serializers.ModelSerializer):
    aluno_nome = serializers.ReadOnlyField(source='aluno.nome')
    aluno_turma = serializers.ReadOnlyField(source='aluno.turma')
    funcionario_nome = serializers.ReadOnlyField(source='funcionario.nome')
    funcionario_cargo = serializers.ReadOnlyField(source='funcionario.cargo')
    livro_titulo = serializers.ReadOnlyField(source='livro.titulo')

    class Meta:
        model = Emprestimo
        fields = [
            'id',
            'aluno',
            'aluno_nome',
            'aluno_turma',
            'funcionario',
            'funcionario_nome',
            'funcionario_cargo',
            'livro',
            'livro_titulo',
            'data_emprestimo',
            'data_devolucao_prevista',
            'devolvido',
        ]

    def validate(self, data):
        if not self.instance:
            livro = data.get('livro')
            aluno = data.get('aluno')
            funcionario = data.get('funcionario')

            if not aluno and not funcionario:
                raise serializers.ValidationError("Informe um aluno ou funcionário.")
            if aluno and funcionario:
                raise serializers.ValidationError("Informe apenas aluno ou funcionário, não ambos.")

            if livro and livro.quantidade_disponivel <= 0:
                raise serializers.ValidationError({"livro": "Sem exemplares disponíveis."})

            if aluno:
                tem_atrasos = Emprestimo.objects.filter(
                    aluno=aluno,
                    devolvido=False,
                    data_devolucao_prevista__lt=timezone.now().date()
                ).exists()
                if tem_atrasos:
                    raise serializers.ValidationError({"aluno": "O aluno possui livros atrasados."})

                total_ativos = Emprestimo.objects.filter(aluno=aluno, devolvido=False).count()
                if total_ativos >= 1:
                    raise serializers.ValidationError({"aluno": "O aluno já possui um livro emprestado."})

            if funcionario:
                tem_atrasos = Emprestimo.objects.filter(
                    funcionario=funcionario,
                    devolvido=False,
                    data_devolucao_prevista__lt=timezone.now().date()
                ).exists()
                if tem_atrasos:
                    raise serializers.ValidationError({"funcionario": "O funcionário possui livros atrasados."})

                total_ativos = Emprestimo.objects.filter(funcionario=funcionario, devolvido=False).count()
                if total_ativos >= 1:
                    raise serializers.ValidationError({"funcionario": "O funcionário já possui um livro emprestado."})

        return data


class HistoricoSerializer(serializers.ModelSerializer):
    data_formatada = serializers.DateTimeField(source='data_acao', format='%d/%m/%Y %H:%M', read_only=True)

    class Meta:
        model = Historico
        fields = ['id', 'tipo', 'descricao', 'data_acao', 'data_formatada']