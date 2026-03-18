from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.register),
    path('login/', views.login),
    path('logout/', views.logout),
    path('refresh/', views.refresh_token),

    # Profile
    path('me/', views.me),                              # GET lấy thông tin
    path('me/update/', views.update_profile),           # PATCH cập nhật tên/avatar
    path('me/change-password/', views.change_password), # POST đổi mật khẩu
    path('me/role/', views.set_role),                   # PATCH chọn role (1 lần)

    # Internal (Batch 4)
    path('users/', views.list_users),
    path('users/<int:user_id>/', views.get_user),
]
