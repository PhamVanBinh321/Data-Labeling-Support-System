from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('users.urls')),
    path('health', __import__('users.views', fromlist=['health_check']).health_check),
]
