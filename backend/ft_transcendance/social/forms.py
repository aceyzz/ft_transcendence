from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class AddFriendRequestForm(forms.Form):
	current_user = forms.ModelChoiceField(User.objects, required=True)
	friend_username = forms.CharField(required=True)

	friend = None

	def clean_friend_username(self):
		friend_username = self.cleaned_data.get('friend_username')
		self.friend = User.objects.filter(username=friend_username).first()
		if not self.friend:
			raise ValidationError("The username doesn't exist.")
		
	def clean(self):
		cleaned_data = super().clean()
		user = cleaned_data.get('user')
		friend = self.friend
		if user == friend:
			self.add_error('friend_username', "A user can't add him/herself as a friend.")
		if user.blocked.filter(id=friend.id).exists():
			self.add_error('friend_username', "You must unblock this user before adding him/her as a friend.")
		return cleaned_data

# class AddFriendForm(forms.Form):
# 	user = forms.ModelChoiceField(User.objects.filter(is_active=True))
# 	friend = forms.ModelChoiceField(User.objects.filter(is_active=True))

# 	def clean(self):
# 		cleaned_data = super().clean()
# 		user = cleaned_data.get('user')
# 		friend = cleaned_data.get('friend')
# 		if user.relationships.has_friend(friend):
# 			self.add_error('friend', 'This friend has already been added')
# 		return cleaned_data
