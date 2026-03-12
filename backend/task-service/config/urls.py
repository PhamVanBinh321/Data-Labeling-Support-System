from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({'status': 'ok', 'service': 'task-service'})

urlpatterns = [
    path('api/tasks/', include('tasks.urls')),
    path('health', health),
]
