from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import render
from django.views import View
from django.db.models import Q

from core import responses
from .forms import ChatMessageForm
from .models import ChatMessage
from myauth.serializers import serialize_user
from .serializers import serialize_chat_message

class ChatMessagesView(View):
	def get(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		with_user_id = request.GET.get('with_user_id', None)
		if not with_user_id:
			return responses.json_error_message_response('The with_user_id parameter is required')

		messages = ChatMessage.objects.filter(Q(from_user=request.user, to_user=with_user_id) | Q(to_user=request.user, from_user=with_user_id)).order_by('created').all()
		return responses.json_success_paginated_data_response(
			object_list=messages,
			serializer=serialize_chat_message,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1),
		)

	def post(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		form = ChatMessageForm(request.POST, from_user=request.user)
		if form.is_valid():
			message = form.save()
			if message.to_user.connection_counter > 0:
				user_group_name = f'user_group_{message.to_user.id}'
				channel_layer = get_channel_layer()
				async_to_sync(channel_layer.group_send)(
					user_group_name,
					{
						'type': 'chat.message',
						'from_user': serialize_user(message.from_user),
						'to_user': serialize_user(message.to_user),
						'text': message.text,
						'timestamp': message.created.isoformat(),
					}
				)
			# TODO: Send message to other user via websocket if he is connected
			return responses.json_success_data_response({'message': serialize_chat_message(message)})
		else:
			return responses.json_error_data_response(form.errors)