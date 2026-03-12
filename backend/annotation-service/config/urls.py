from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({'status': 'ok', 'service': 'annotation-service'})

urlpatterns = [
    path('api/annotations/', include('annotations.urls')),
    path('health', health),
]
