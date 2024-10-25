from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

User = get_user_model()

class SignupForm(UserCreationForm):
	class Meta:
		model = User
		fields = ['username', 'email', 'first_name', 'last_name', 'avatar', 'password1', 'password2']

class UserProfileForm(forms.Form):
	username = forms.CharField(max_length=150, required=True)
	email = forms.EmailField(max_length=150, required=True)
	first_name = forms.CharField(max_length=150, required=True)
	last_name = forms.CharField(max_length=150, required=True)

	def __init__(self, *args, **kwargs):
		self.current_user = kwargs.pop('instance', None)
		super().__init__(*args, **kwargs)
	
	def clean_username(self):
		username = self.cleaned_data.get('username')

		if User.objects.filter(username=username).exclude(id=self.current_user.id).exists():
			raise forms.ValidationError('A user with that username already exists.')
		
		return username

	def clean_email(self):
		email = self.cleaned_data.get('email')

		if User.objects.filter(email=email).exclude(id=self.current_user.id).exists():
			raise forms.ValidationError('A user with that email already exists.')
		
		return email
	
	def save(self):
		self.current_user.username = self.cleaned_data.get('username')
		self.current_user.email = self.cleaned_data.get('email')
		self.current_user.first_name = self.cleaned_data.get('first_name')
		self.current_user.last_name = self.cleaned_data.get('last_name')
		self.current_user.save()