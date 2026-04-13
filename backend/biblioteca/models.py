from django.db import models, transaction
from django.core.exceptions import ValidationError


class Aluno(models.Model):
    nome = models.CharField(max_length=100, blank=False, null=False)
    turma = models.CharField(max_length=50, blank=False, null=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['nome', 'turma'], name='unique_aluno_por_turma')
        ]

    def clean(self):
        self.nome = self.nome.strip().title()
        self.turma = self.turma.strip().upper()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nome} - {self.turma}"


class Funcionario(models.Model):
    nome = models.CharField(max_length=100, blank=False, null=False)
    cargo = models.CharField(max_length=100, blank=False, null=False)

    def clean(self):
        self.nome = self.nome.strip().title()
        self.cargo = self.cargo.strip().title()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nome} - {self.cargo}"


class Categoria(models.Model):
    nome = models.CharField(max_length=100, unique=True, blank=False, null=False)

    def __str__(self):
        return self.nome


class Livro(models.Model):
    titulo = models.CharField(max_length=200, blank=False, null=False)
    autor = models.CharField(max_length=200, blank=False, null=False)
    ano = models.IntegerField(blank=True, null=True)
    editora = models.CharField(max_length=100, blank=True, null=True)
    isbn = models.CharField(max_length=20, unique=True, blank=False, null=False)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='livros',
        blank=False,
        null=False
    )
    quantidade_total = models.PositiveIntegerField(default=1)
    quantidade_disponivel = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"[{self.isbn}] {self.titulo} - {self.autor}"


class Emprestimo(models.Model):
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name='emprestimos', null=True, blank=True)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE, related_name='emprestimos', null=True, blank=True)
    livro = models.ForeignKey(Livro, on_delete=models.PROTECT, related_name='emprestimos')
    data_emprestimo = models.DateField()
    data_devolucao_prevista = models.DateField()
    devolvido = models.BooleanField(default=False)

    def clean(self):
        if not self.aluno and not self.funcionario:
            raise ValidationError("É necessário informar um aluno ou funcionário.")
        if self.aluno and self.funcionario:
            raise ValidationError("Informe apenas aluno ou funcionário, não ambos.")

    def save(self, *args, **kwargs):
        self.full_clean()

        if not self.pk:
            with transaction.atomic():
                livro = Livro.objects.select_for_update().get(pk=self.livro_id)
                if livro.quantidade_disponivel > 0:
                    livro.quantidade_disponivel -= 1
                    livro.save(update_fields=['quantidade_disponivel'])
                    self.livro = livro
                    super().save(*args, **kwargs)
                else:
                    raise ValidationError("Este livro não está disponível no momento.")
            return

        elif self.devolvido:
            with transaction.atomic():
                original = Emprestimo.objects.select_for_update().get(pk=self.pk)
                if not original.devolvido:
                    livro = Livro.objects.select_for_update().get(pk=self.livro_id)
                    livro.quantidade_disponivel += 1
                    livro.save(update_fields=['quantidade_disponivel'])
                    self.livro = livro
                super().save(*args, **kwargs)
            return

        super().save(*args, **kwargs)

    def __str__(self):
        pessoa = self.aluno.nome if self.aluno else self.funcionario.nome
        return f"{self.livro.titulo} - {pessoa}"


class Historico(models.Model):
    TIPOS_ACAO = [
        ('ADICIONADO', 'Adicionado'),
        ('ATUALIZADO', 'Atualizado'),
        ('EMPRESTADO', 'Emprestado'),
        ('DEVOLVIDO', 'Devolvido'),
        ('EXCLUIDO', 'Excluído'),
    ]

    tipo = models.CharField(max_length=20, choices=TIPOS_ACAO)
    descricao = models.TextField()
    data_acao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_acao']

    def __str__(self):
        return f"{self.tipo} - {self.data_acao.strftime('%d/%m/%Y %H:%M')}"