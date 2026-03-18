from django.contrib import admin
from django.urls import path, include
from users.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('health', health_check),
]
