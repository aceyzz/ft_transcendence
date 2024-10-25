from django.shortcuts import render
from django.views import View
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from core import responses
from myauth.serializers import serialize_user

User = get_user_model()

class FriendsView(View):
	def get(self, request):
		"""
		List of friends (paginated).
		Search params:
			- per_page (int, optional, default of 20): Items per page.
			- page (int, optional, default of 1): Page number.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		user_id = request.GET.get('user_id', request.user.id)
		friends = User.objects.filter(friendships_sent__to_user=user_id).order_by('-friendships_sent__created')
		return responses.json_success_paginated_data_response(
			friends,
			serializer=serialize_user,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)
	
class FriendView(View):
	def delete(self, request, friend_id):
		"""
		Remove an existing friend.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		if not request.user.friends.filter(id=friend_id).exists():
			return responses.json_error_message_response('You have no friend with this user id.')

		friend = User.objects.filter(id=friend_id).first()
		if not friend:
			return responses.json_error_message_response('No user exists with this id.')
		
		request.user.remove_friend(friend)
		
		channel_layer = get_channel_layer()
		user_group_name = f'user_group_{friend.id}'
		async_to_sync(channel_layer.group_send)(
			user_group_name,
			{
				'type': 'social.friend.removed',
				'user': serialize_user(request.user),
			}
		)

		return responses.json_success_message_response('The user was removed from your list of friends.')

class FriendRequestsSentView(View):
	def get(self, request):
		"""
		List the friend requests that you sent (paginated).
		Search params:
			- per_page (int, optional, default of 20): Items per page.
			- page (int, optional, default of 1): Page number.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()

		friend_requests_sent = request.user.friend_requests_sent.all()
		return responses.json_success_paginated_data_response(
			friend_requests_sent,
			serializer=serialize_user,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)

	def post(self, request):
		"""
		Create a new friend request.
		Post params:
			- friend_id (int, required): Id of friend to add.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()

		friend_id = request.POST.get('friend_id')
		if not friend_id:
			return responses.json_error_message_response('The friend id is required.')

		friend = User.objects.filter(id=friend_id).first()
		if not friend:
			return responses.json_error_message_response('No user exists with this id.')

		try:
			result = request.user.add_friend_request(friend)
			# Notify other user
			user_group_name = f'user_group_{friend.id}'
			channel_layer = get_channel_layer()
			if result == 'friend_request':
				async_to_sync(channel_layer.group_send)(
					user_group_name,
					{
						'type': 'social.friend_request_received',
						'from_user': serialize_user(request.user)
					}
				)
				return responses.json_success_message_response('The friend request was sent.')
			else:
				async_to_sync(channel_layer.group_send)(
					user_group_name,
					{
						'type': 'social.friend.added',
						'user': serialize_user(request.user)
					}
				)
				return responses.json_success_message_response(f'{friend.username} is now your friend')


		except ValidationError as error:
			return responses.json_error_message_response(error.messages[0])

class FriendRequestSentView(View):
	def delete(self, request, to_user_id):
		"""
		Cancel a friend request that you sent.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		to_user = User.objects.filter(id=to_user_id).first()
		if not to_user:
			return responses.json_error_message_response('No user with this id exists.')
		
		request.user.cancel_friend_request(to_user)

		channel_layer = get_channel_layer()
		user_group_name = f'user_group_{to_user.id}'
		async_to_sync(channel_layer.group_send)(
			user_group_name,
			{
				'type': 'social.received_friend_request.canceled',
				'user': serialize_user(request.user),
			}
		)

		return responses.json_success_message_response('The friend request was canceled.')
		
class FriendRequestsReceivedView(View):
	def get(self, request):
		"""
		List the friend requests that you received.
		Search params:
			- per_page (int, optional, default of 20): Items per page.
			- page (int, optional, default of 1): Page number.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()

		friend_requests_received = request.user.friend_requests_received.all()
		return responses.json_success_paginated_data_response(
			friend_requests_received,
			serializer=serialize_user,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)

class FriendRequestReceivedView(View):
	def put(self, request, from_user_id):
		"""
		Accept a received friend request.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		from_user = User.objects.filter(id=from_user_id).first()
		if not from_user:
			return responses.json_error_message_response('No user with this id exists.')
		
		try:
			request.user.accept_friend_request(from_user)
			# Notify other user
			user_group_name = f'user_group_{from_user.id}'
			channel_layer = get_channel_layer()
			async_to_sync(channel_layer.group_send)(
				user_group_name,
				{
					'type': 'social.sent_friend_request.accepted',
					'by_user': serialize_user(request.user)
				}
			)
			return responses.json_success_message_response(f'{from_user.username} is now your friend.')
		except ValidationError as error:
			return responses.json_error_message_response(error.messages[0])

	def delete(self, request, from_user_id):
		"""
		Decline a received friend request.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		from_user = User.objects.filter(id=from_user_id).first()
		if not from_user:
			return responses.json_error_message_response('No user with this id exists.')
		
		try:
			request.user.decline_friend_request(from_user)
			# Notify other user
			user_group_name = f'user_group_{from_user.id}'
			channel_layer = get_channel_layer()
			async_to_sync(channel_layer.group_send)(
				user_group_name,
				{
					'type': 'social.sent_friend_request.declined',
					'by_user': serialize_user(request.user)
				}
			)
		except:
			pass
	
		return responses.json_success_message_response('The friend request was declined')
		
class BlockedUsersView(View):
	def get(self, request):
		"""
		List the users that you blocked.
		Search params:
			- per_page (int, optional, default of 20): Items per page.
			- page (int, optional, default of 1): Page number.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()

		blocked_users = request.user.blocked.all()
		return responses.json_success_paginated_data_response(
			blocked_users,
			serializer=serialize_user,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)
	
	def post(self, request):
		"""
		Block a user.
		Post params:
			- block_user_id (int, required): Id of the user to be blocked.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		block_user_id = request.POST.get('block_user_id', None)
		if not block_user_id:
			return responses.json_error_message_response('The user id to block is required.')
		
		block_user = User.objects.filter(id=block_user_id).first()
		if not block_user:
			return responses.json_error_message_response('No user exists with this id.')
		
		try:
			msg = request.user.block_user(block_user)
			return responses.json_success_message_response(msg)
		except ValidationError as error:
			return responses.json_error_message_response(error.messages[0])

class BlockedUserView(View):
	def delete(self, request, other_user_id):
		"""
		Unblock a blocked user.
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
	
		other_user = User.objects.filter(id=other_user_id).first()
		if not other_user:
			return responses.json_error_message_response('No user exists with this id.')
		
		try:
			msg = request.user.unblock_user(other_user)
			return responses.json_success_message_response(msg)
		except ValidationError as error:
			return responses.json_error_message_response(error.messages[0])
