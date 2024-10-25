from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from asgiref.sync import async_to_sync
from django.db.models import F

from myauth.serializers import serialize_user

User = get_user_model()

class AppConsumer(AsyncJsonWebsocketConsumer):
	async def connect(self):
		print('Connected')
		self.user = self.scope["user"]

		if not self.user.is_authenticated:
			await self.close()
			return

		# Join user group
		self.user_group_name = f'user_group_{self.user.id}'
		await self.channel_layer.group_add(
			self.user_group_name,
			self.channel_name
		)

		# Increment connection counter
		await User.objects.filter(id=self.user.id).aupdate(connection_counter=F('connection_counter') + 1)

		# Inform connected friends of connection
		friend_ids = await self.get_connected_friend_ids()
		for friend_ids in friend_ids:
			user_group_name = f'user_group_{friend_ids.get('id')}'
			await self.channel_layer.group_send(
				user_group_name,
				{
					'type': 'social.friend_connected',
					'user': serialize_user(self.user),
				}
			)

		await self.accept()

	async def disconnect(self, close_code):
		# Leave user group
		await self.channel_layer.group_discard(
			self.user_group_name,
			self.channel_name
		)

		# Decrement connection counter
		await User.objects.filter(id=self.user.id).aupdate(connection_counter=F('connection_counter') - 1)

		# Inform connected friends of disconnection
		connection_counter = await self.get_connection_counter()
		if connection_counter == 0:
			friend_ids = await self.get_connected_friend_ids()
			for friend_ids in friend_ids:
				user_group_name = f'user_group_{friend_ids.get('id')}'
				await self.channel_layer.group_send(
					user_group_name,
					{
						'type': 'social.friend_disconnected',
						'user': serialize_user(self.user),
					}
				)
	
	# async def receive_json(self, content):
	# 	type = content['type']

	# 	if type == 'chat.message':
	# 		to_user_id = content['to_user_id']
	# 		to_user_group_name = f'user_group_{to_user_id}'
	# 		await self.channel_layer.group_send(
	# 			to_user_group_name,
	# 			{
	# 				'type': 'chat.message',
	# 				'from_user': serialize_user(self.user),
	# 				'message': content['message'],
	# 				'timestamp': now().isoformat(),
	# 			}
	# 		)

	async def auth_logout(self, event):
		await self.close()

	async def chat_message(self, event):
		await self.send_json({
			'type': 'chat.message',
			'from_user': event['from_user'],
			'to_user': event['to_user'],
			'text': event['text'],
			'timestamp': event['timestamp']
		})

	async def game_match_request(self, event):
		await self.send_json({
			'type': 'game.match_request',
			'user': event['opponent'],
			'game_uuid': event['game_uuid'],
			'timestamp': now().isoformat()
		})

	async def social_friend_removed(self, event):
		await self.send_json({
			'type': 'social.friend.removed',
			'user': event['user'],
		})

	async def social_friend_request_received(self, event):
		await self.send_json({
			'type': 'social.friend_request.received',
			'user': event['from_user'],
			'timestamp': now().isoformat()
		})
	
	async def social_received_friend_request_canceled(self, event):
		await self.send_json({
			'type': 'social.received_friend_request.canceled',
			'user': event['user'],
		})

	async def social_sent_friend_request_accepted(self, event):
		await self.send_json({
			'type': 'social.sent_friend_request.accepted',
			'user': event['by_user'],
			'timestamp': now().isoformat()
		})

	async def social_sent_friend_request_declined(self, event):
		await self.send_json({
			'type': 'social.sent_friend_request.declined',
			'user': event['by_user'],
			'timestamp': now().isoformat()
		})
	
	async def social_friend_connected(self, event):
		await self.send_json({
			'type': 'social.friend.connected',
			'user': event.get('user'),
		})
	
	async def social_friend_disconnected(self, event):
		await self.send_json({
			'type': 'social.friend.disconnected',
			'user': event.get('user'),
		})

	@database_sync_to_async
	def get_connected_friend_ids(self):
		return list(self.user.friends.filter(connection_counter__gt=0).values('id'))

	@database_sync_to_async
	def get_connection_counter(self):
		return self.user.connection_counter