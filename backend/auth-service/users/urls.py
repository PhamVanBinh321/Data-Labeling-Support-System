from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.register),
    path('login/', views.login),
    path('logout/', views.logout),
    path('refresh/', views.refresh_token),
    path('forgot-password/', views.forgot_password),
    path('reset-password/', views.reset_password),

    # Profile
    path('me/', views.me),                              # GET lấy thông tin
    path('me/update/', views.update_profile),           # PATCH cập nhật tên/avatar
    path('me/change-password/', views.change_password), # POST đổi mật khẩu
    path('me/role/', views.set_role),                   # PATCH chọn role (1 lần)

    # Internal (các service khác gọi)
    path('users/', views.list_users),
    path('users/<int:user_id>/', views.get_user),

    # Admin — Quản lý người dùng (yêu cầu is_staff=True)
    path('admin/users/stats/', views.admin_user_stats),         # GET thống kê nhanh
    path('admin/users/', views.admin_list_users),               # GET danh sách (search, filter, phân trang)
    path('admin/users/<int:user_id>/', views.admin_get_user),   # GET chi tiết
    path('admin/users/<int:user_id>/update/', views.admin_update_user),  # PATCH role/status
    path('admin/users/<int:user_id>/delete/', views.admin_delete_user),  # DELETE (soft)
]

