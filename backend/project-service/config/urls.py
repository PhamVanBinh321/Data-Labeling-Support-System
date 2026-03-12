from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({'status': 'ok', 'service': 'project-service'})

urlpatterns = [
    path('api/projects/', include('projects.urls')),
    path('api/datasets/', include('projects.dataset_urls')),
    path('health', health),
]
