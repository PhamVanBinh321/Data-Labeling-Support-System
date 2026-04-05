from django.urls import path, include

urlpatterns = [
    path('api/admin/', include('stats.urls')),
]
