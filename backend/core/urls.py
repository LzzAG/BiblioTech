import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from biblioteca.views import (
    AlunoViewSet,
    FuncionarioViewSet,
    LivroViewSet,
    EmprestimoViewSet,
    HistoricoViewSet,
    CategoriaViewSet,
)


class LoginRateThrottle(AnonRateThrottle):
    rate = '10/min'
    scope = 'login'


class RateLimitedTokenView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]


class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


router = DefaultRouter()
router.register(r'alunos', AlunoViewSet)
router.register(r'funcionarios', FuncionarioViewSet)
router.register(r'livros', LivroViewSet)
router.register(r'emprestimos', EmprestimoViewSet, basename='emprestimo')
router.register(r'historico', HistoricoViewSet, basename='historico')
router.register(r'categorias', CategoriaViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', RateLimitedTokenView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', PublicTokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)