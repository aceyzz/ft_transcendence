from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import render
from django.views import View
from django.contrib.auth import login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.db.models import OuterRef, Exists
from django.middleware.csrf import get_token
from django.core.files.uploadhandler import TemporaryFileUploadHandler
from django.http.multipartparser import MultiPartParser

from .forms import SignupForm, UserProfileForm
from .serializers import serialize_user, serialize_user_with_relation
from core import responses

User = get_user_model()

class LoginView(View):
	def post(self, request):
		form = AuthenticationForm(request, data=request.POST)
		if (form.is_valid()):
			user = form.get_user()
			login(request, user)
			return responses.json_success_data_response({
				'user': serialize_user(user),
				'csrftoken': get_token(request)
			})
		else:
			return responses.json_error_data_response(form.errors)

class SignupView(View):
	def post(self, request):
		form = SignupForm(request.POST, request.FILES)
		if form.is_valid():
			user = form.save()
			login(request, user)
			return responses.json_success_data_response({
				'user': serialize_user(user),
				'csrftoken': get_token(request),
			}, status=201)
		else:
			return responses.json_error_data_response(form.errors)

class LogoutView(View):
	def post(self, request):
		if request.user.is_authenticated:
			user_group_name = f'user_group_{request.user.id}'
			channel_layer = get_channel_layer()
			async_to_sync(channel_layer.group_send)(
				user_group_name,
				{ 'type': 'auth.logout' }
			)

		logout(request)
		return responses.json_success_message_response('The user was logged out')

class AvatarView(View):
	def put(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		request.upload_handlers.insert(0, TemporaryFileUploadHandler())
		parser = MultiPartParser(request.META, request, request.upload_handlers)
		try:
			data, files = parser.parse()
		except:
			return responses.json_error_message_response('The request could not be parsed.')
		
		new_avatar = files.get('avatar')
		if not new_avatar:
			return responses.json_error_message_response('The avatar is missing')
	
		request.user.avatar.delete(save=False)
		request.user.avatar = new_avatar
		request.user.save()
		request.user.refresh_from_db()
		return responses.json_success_data_response({'user': serialize_user(request.user)})

	def delete(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		request.user.avatar.delete(save=False)
		request.user.avatar = None
		request.user.save()
		request.user.refresh_from_db()
		return responses.json_success_data_response({'user': serialize_user(request.user)})

class UserProfileView(View):
	def put(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		parser = MultiPartParser(request.META, request, request.upload_handlers)
		try:
			data, files = parser.parse()
		except:
			return responses.json_error_message_response('The request could not be parsed.')

		form = UserProfileForm(data, instance=request.user)
		if form.is_valid():
			form.save()
			request.user.refresh_from_db()
			return responses.json_success_data_response({'user': serialize_user(request.user)})
		else:
			return responses.json_error_data_response(form.errors)
		
class PasswordView(View):
	def put(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		parser = MultiPartParser(request.META, request, request.upload_handlers)
		try:
			data, files = parser.parse()
		except:
			return responses.json_error_message_response('The request could not be parsed.')
		
		form = PasswordChangeForm(user=request.user, data=data)
		if form.is_valid():
			form.save()
			update_session_auth_hash(request, form.user)
			return responses.json_success_message_response('The password was updated.')
		else:
			return responses.json_error_data_response(form.errors)


class UsersView(View):
	def get(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		search = request.GET.get('search', '').strip()
		if search == '':
			users = []
		else:
			friend_requests_sent = request.user.friend_requests_sent.filter(id=OuterRef('id'))
			friend_requests_received = request.user.friend_requests_received.filter(id=OuterRef('id'))
			friends = request.user.friends.filter(id=OuterRef('id'))
			blocked = request.user.blocked.filter(id=OuterRef('id'))
			users = User.objects.exclude(id=request.user.id).filter(username__istartswith=search)
			users = users.annotate(is_friend_request_sent=Exists(friend_requests_sent))
			users = users.annotate(is_friend_request_received=Exists(friend_requests_received))
			users = users.annotate(is_friend=Exists(friends))
			users = users.annotate(is_blocked=Exists(blocked))
		return responses.json_success_paginated_data_response(
			users,
			serializer=serialize_user_with_relation,
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)

class UserView(View):
	def get(self, request, user_id):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		friend_requests_sent = request.user.friend_requests_sent.filter(id=OuterRef('id'))
		friend_requests_received = request.user.friend_requests_received.filter(id=OuterRef('id'))
		friends = request.user.friends.filter(id=OuterRef('id'))
		blocked = request.user.blocked.filter(id=OuterRef('id'))
		users = User.objects.exclude(id=request.user.id).filter(id=user_id)
		users = users.annotate(is_friend_request_sent=Exists(friend_requests_sent))
		users = users.annotate(is_friend_request_received=Exists(friend_requests_received))
		users = users.annotate(is_friend=Exists(friends))
		users = users.annotate(is_blocked=Exists(blocked))

		user = users.first()
		if not user:
			return responses.json_error_message_response('No user with this id exists.')
		
		return responses.json_success_data_response({'user': serialize_user_with_relation(user)})
		
