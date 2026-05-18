from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalog import views # Импортируем из каталога

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'cpus', views.CPUViewSet)
router.register(r'motherboards', views.MotherboardViewSet)
router.register(r'videocards', views.VideocardViewSet)
router.register(r'memory', views.MemoryViewSet)
router.register(r'coolers', views.CPUCoolerViewSet)
router.register(r'power-supplies', views.PowerSupplyViewSet)
router.register(r'storages', views.StorageViewSet)
router.register(r'configurations', views.ConfigurationViewSet)
router.register(r'config-items', views.ConfigItemViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh')
]