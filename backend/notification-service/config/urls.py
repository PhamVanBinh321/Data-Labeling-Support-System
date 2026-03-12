from django.urls import path, include
from django.http import JsonResponse

def health(request):
    return JsonResponse({'status': 'ok', 'service': 'notification-service'})

urlpatterns = [
    path('api/notify/', include('notifications.urls')),
    path('health', health),
]
