from django.urls import path
from . import views

urlpatterns = [
    # ── User-facing endpoints (JWT auth) ─────────────────────────────────────
    path('', views.NotificationListView.as_view()),
    path('unread-count/', views.UnreadCountView.as_view()),
    path('read-all/', views.NotificationReadAllView.as_view()),
    path('<int:pk>/read/', views.NotificationMarkReadView.as_view()),
    path('<int:pk>/', views.NotificationDeleteView.as_view()),
]
