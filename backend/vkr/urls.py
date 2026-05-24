from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalog import views
from catalog.admin_api import (
    AdminConfigurationViewSet,
    AdminComponentView,
    AdminComponentDetailView,
    AdminImportXlsxView,
    AdminImportTemplateView,
    AdminTechPowerUpSearchView,
    AdminTechPowerUpImportView,
)
from accounts.admin_users_api import AdminUsersView, AdminUserDetailView

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core_logic.health import HealthCheckView, HealthPingView

router = DefaultRouter()
router.register(r'cpus', views.CPUViewSet)
router.register(r'motherboards', views.MotherboardViewSet)
router.register(r'videocards', views.VideocardViewSet)
router.register(r'memory', views.MemoryViewSet)
router.register(r'coolers', views.CPUCoolerViewSet)
router.register(r'power-supplies', views.PowerSupplyViewSet)
router.register(r'storages', views.StorageViewSet)
router.register(r'configurations', views.ConfigurationViewSet)
router.register(r'public-configurations', views.PublicConfigurationViewSet, basename='public-configuration')
router.register(r'admin/configurations', AdminConfigurationViewSet, basename='admin-configuration')
router.register(r'config-items', views.ConfigItemViewSet)

urlpatterns = [
    path('api/health/', HealthCheckView.as_view()),
    path('api/health/ping/', HealthPingView.as_view()),
    path('api/performance/estimate/', views.PerformanceEstimateView.as_view()),
    path('admin/', admin.site.urls),
    path('api/admin/components/', AdminComponentView.as_view()),
    path('api/admin/components/<int:pk>/', AdminComponentDetailView.as_view()),
    path('api/admin/import-xlsx/', AdminImportXlsxView.as_view()),
    path('api/admin/import-template/', AdminImportTemplateView.as_view()),
    path('api/admin/techpowerup/search/', AdminTechPowerUpSearchView.as_view()),
    path('api/admin/techpowerup/import/', AdminTechPowerUpImportView.as_view()),
    path('api/admin/users/', AdminUsersView.as_view()),
    path('api/admin/users/<int:pk>/', AdminUserDetailView.as_view()),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
]