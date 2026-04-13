import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError

class Command(BaseCommand):
    help = 'Cria os usuários iniciais do sistema usando variáveis de ambiente'

    def handle(self, *args, **kwargs):
        
        for i in range(1, 4):
            u_name = os.getenv(f'USER_NAME_{i}')
            u_pass = os.getenv(f'USER_PASS_{i}')
            u_super = os.getenv(f'USER_ADMIN_{i}', 'false').lower() == 'true'

            if not (u_name and u_pass):
                continue

            try:
                if u_super:
                    User.objects.create_superuser(username=u_name, password=u_pass)
                else:
                    User.objects.create_user(username=u_name, password=u_pass, is_staff=True)
                
                self.stdout.write(self.style.SUCCESS(f'Usuário "{u_name}" criado com sucesso!'))
            
            except IntegrityError:
                self.stdout.write(self.style.WARNING(f'Usuário "{u_name}" já existe.'))