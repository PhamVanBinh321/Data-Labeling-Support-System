from django.urls import path
from . import views

urlpatterns = [
    # ── Image endpoints ──────────────────────────────────────────────────────
    path('images/', views.ImageListView.as_view()),
    path('images/upload/', views.ImageUploadView.as_view()),
    path('images/<int:pk>/', views.ImageDetailView.as_view()),
    path('images/<int:pk>/confirm/', views.ImageConfirmView.as_view()),
]
