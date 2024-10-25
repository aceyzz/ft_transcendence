from django import forms

from .models import ChatMessage

class ChatMessageForm(forms.ModelForm):
	class Meta:
		model = ChatMessage
		fields = ['to_user', 'text']
	
	def __init__(self, *args, **kwargs):
		self.from_user = kwargs.pop('from_user', None)
		super().__init__(*args, **kwargs)
	
	def clean_to_user(self):
		to_user = self.cleaned_data.get('to_user')
		if to_user.id == self.from_user.id:
			raise forms.ValidationError('You cannot send a message to yourself')
		return to_user
	
	def save(self, commit=True):
		instance = super().save(commit=False)
		instance.from_user = self.from_user
		if commit:
			instance.save()
		return instance