from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatMessage(models.Model):
	from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages_sent')
	to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages_received')
	text = models.CharField(null=False, blank=True)
	created = models.DateTimeField(auto_now_add=True)