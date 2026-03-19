from django.urls import path
from . import views

urlpatterns = [
    path('', views.DatasetListCreateView.as_view(), name='dataset-list-create'),
    path('<int:pk>/', views.DatasetDetailView.as_view(), name='dataset-detail'),
    path('internal/<int:pk>/', views.InternalDatasetView.as_view(), name='internal-dataset'),
]
