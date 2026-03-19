from django.urls import path
from . import views

urlpatterns = [
    # Projects CRUD
    path('', views.ProjectListCreateView.as_view(), name='project-list-create'),
    path('<int:pk>/', views.ProjectDetailView.as_view(), name='project-detail'),
    path('<int:pk>/status/', views.ProjectStatusView.as_view(), name='project-status'),

    # Labels (nested under project)
    path('<int:pk>/labels/', views.LabelListCreateView.as_view(), name='label-list-create'),
    path('<int:pk>/labels/<int:lid>/', views.LabelDetailView.as_view(), name='label-detail'),

    # Members (nested under project)
    path('<int:pk>/members/', views.MemberListCreateView.as_view(), name='member-list-create'),
    path('<int:pk>/members/<int:mid>/status/', views.MemberStatusView.as_view(), name='member-status'),
    path('<int:pk>/members/<int:mid>/', views.MemberDeleteView.as_view(), name='member-delete'),

    # Internal API (no JWT, header-based auth)
    path('internal/projects/<int:pk>/', views.InternalProjectView.as_view(), name='internal-project'),
    path('internal/projects/<int:pk>/labels/', views.InternalLabelsView.as_view(), name='internal-labels'),
    path('internal/projects/<int:pk>/members/', views.InternalMembersView.as_view(), name='internal-members'),
    path('internal/projects/<int:pk>/counters/', views.InternalCountersView.as_view(), name='internal-counters'),
]
