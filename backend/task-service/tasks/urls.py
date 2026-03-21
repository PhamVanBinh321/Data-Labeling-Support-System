from django.urls import path
from . import views

urlpatterns = [
    # ── Task CRUD ─────────────────────────────────────────────────────────────
    path('', views.TaskListView.as_view()),
    path('<int:pk>/', views.TaskDetailView.as_view()),
]
