from django.urls import path
from . import views

urlpatterns = [
    # ── Task CRUD ─────────────────────────────────────────────────────────────
    path('', views.TaskListView.as_view()),
    path('<int:pk>/', views.TaskDetailView.as_view()),

    # ── State machine + History ───────────────────────────────────────────────
    path('<int:pk>/status/', views.TaskStatusView.as_view()),
    path('<int:pk>/history/', views.TaskHistoryView.as_view()),

    # ── Dashboards ────────────────────────────────────────────────────────────
    path('dashboard/manager/', views.ManagerDashboardView.as_view()),
    path('dashboard/annotator/', views.AnnotatorDashboardView.as_view()),
    path('dashboard/reviewer/', views.ReviewerDashboardView.as_view()),

    # ── Internal APIs (header: X-Internal-Service: true) ─────────────────────
    path('internal/tasks/<int:pk>/counters/', views.InternalCountersView.as_view()),
    path('internal/projects/<int:project_id>/tasks/', views.InternalProjectTasksView.as_view()),
    path('internal/tasks/<int:pk>/', views.InternalTaskDetailView.as_view()),
]
