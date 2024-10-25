from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

class Friendship(models.Model):
	from_user = models.ForeignKey('myauth.CustomUser', on_delete=models.CASCADE, related_name='friendships_sent')
	to_user = models.ForeignKey('myauth.CustomUser', on_delete=models.CASCADE, related_name='friendships_received')
	created = models.DateTimeField(auto_now_add=True)