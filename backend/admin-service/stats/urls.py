from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.HealthView.as_view()),
    path('overview/', views.OverviewView.as_view()),
    path('projects/', views.ProjectStatsView.as_view()),
    path('users/', views.UserActivityView.as_view()),
    path('annotations/', views.AnnotationStatsView.as_view()),
]
