from django.urls import path
from .views import LoginView, SignupView, LogoutView, UsersView, UserView, AvatarView, UserProfileView, PasswordView

app_name = 'myauth'

urlpatterns = [
	path('login/', LoginView.as_view(), name='login'),
	path('signup/', SignupView.as_view(), name='signup'),
	path('logout/', LogoutView.as_view(), name='logout'),
	path('users/', UsersView.as_view(), name='users'),
	path('profile/', UserProfileView.as_view(), name='profile'),
	path('profile/avatar/', AvatarView.as_view(), name='avatar'),
	path('password/', PasswordView.as_view(), name='password'),
	path('users/<int:user_id>/', UserView.as_view(), name='user'),
]