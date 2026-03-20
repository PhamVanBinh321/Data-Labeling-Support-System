from django.urls import path
from . import views

urlpatterns = [
    # ── Image endpoints ──────────────────────────────────────────────────────
    path('images/', views.ImageListView.as_view()),
    path('images/upload/', views.ImageUploadView.as_view()),
    path('images/<int:pk>/', views.ImageDetailView.as_view()),
    path('images/<int:pk>/confirm/', views.ImageConfirmView.as_view()),

    # ── Annotation endpoints ─────────────────────────────────────────────────
    path('', views.AnnotationListCreateView.as_view()),
    path('<int:pk>/', views.AnnotationDetailView.as_view()),

    # ── Bulk save + Task workflow ─────────────────────────────────────────────
    path('images/<int:pk>/annotations/bulk-save/', views.BulkAnnotationSaveView.as_view()),
    path('tasks/<int:task_id>/images/', views.TaskImagesWithAnnotationsView.as_view()),
]
