from myauth.serializers import serialize_user

from .models import ChatMessage

def serialize_chat_message(chat_message: ChatMessage):
	return {
		'from_user': serialize_user(chat_message.from_user),
		'to_user': serialize_user(chat_message.to_user),
		'text': chat_message.text,
		'timestamp': chat_message.created.isoformat(),
	}