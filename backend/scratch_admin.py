from users.models import User
User.objects.filter(email='admin@gmail.com').delete()
u = User(email='admin@gmail.com', username='admin@gmail.com', role='admin', role_confirmed=True)
u.set_password('admin123')
u.is_staff = True
u.is_superuser = True
u.save()
print("Admin created")
