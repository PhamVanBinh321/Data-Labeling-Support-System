from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('logout/', views.logout),
    path('refresh/', views.refresh_token),
    path('me/', views.me),
    path('me/role/', views.set_role),
    path('users/', views.list_users),
    path('users/<int:user_id>/', views.get_user),
]
