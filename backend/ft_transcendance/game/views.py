from asgiref.sync import async_to_sync
from functools import partial
from django.views import View
from django.contrib.auth import get_user_model
from django.db.models import Q
from channels.layers import get_channel_layer

from .models import Match
from .serializers import serialize_match
from core import responses
from myauth.serializers import serialize_user

User = get_user_model()

class MatchesView(View):
	def get(self, request):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		user_id = request.GET.get('user_id', None)
		if not user_id:
			return responses.json_error_message_response('The user id is required.')

		user = User.objects.filter(id=user_id).first()
		if not user:
			return responses.json_error_message_response('The user does not exist.')
		
		matches = user.matches().filter(status=Match.Status.FINISHED).all()
		# matches = Match.objects.filter(Q(player1__id=user_id) | Q(player2__id=user_id)).all()
		return responses.json_success_paginated_data_response(
			matches,
			serializer=partial(serialize_match, user_serializer=serialize_user),
			per_page=request.GET.get('per_page', 20),
			page=request.GET.get('page', 1)
		)

	def post(self, request):
		"""
		Invite a player to a match
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		opponent_id = request.POST.get('opponent_id', None)
		if not opponent_id:
			return responses.json_error_message_response('The opponent id is required.')
	
		opponent = User.objects.filter(id=opponent_id).first()
		if not opponent:
			return responses.json_error_message_response('The opponent is not a valid user.')
		
		if opponent.connection_counter < 1:
			return responses.json_error_message_response('The opponent is not connected.')
		
		match = Match.objects.create(player1=request.user, player2=opponent)

		# Invite other user
		user_group_name = f'user_group_{opponent_id}'
		channel_layer = get_channel_layer()
		async_to_sync(channel_layer.group_send)(
			user_group_name,
			{
				'type': 'game.match_request',
				'opponent': serialize_user(request.user),
				'game_uuid': str(match.uuid),
			}
		)

		return responses.json_success_data_response({ 'game_uuid': str(match.uuid) })
	
class MatchView(View):
	def delete(self, request, game_uuid):
		"""
		Decline a match request
		"""
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		match = Match.objects.filter(uuid=game_uuid, player2=request.user).first()
		if not match:
			return responses.json_success_message_response('The game was declined.')
		
		# Inform other player
		match_group_name = f'match_{game_uuid}'
		channel_layer = get_channel_layer()
		async_to_sync(channel_layer.group_send)(
			match_group_name,
			{
				'type': 'group.game.canceled',
				'reason': 'The match request was declined.',
				'game_uuid': game_uuid,
			}
		)
		
		return responses.json_success_message_response('The game was declined.')

	
class StatsView(View):
	def get(self, request, user_id):
		if not request.user.is_authenticated:
			return responses.json_auth_error_response()
		
		user = User.objects.filter(id=user_id).first()
		if not user:
			return responses.json_error_message_response('The user does not exist.')
		
		total_count = user.matches().count()
		win_count = user.matches().filter(winner=user).count()
		draw_count = user.matches().filter(winner__isnull=True).count()
		loss_count = total_count - win_count - draw_count

		return responses.json_success_data_response({
			'wins': win_count,
			'losses': loss_count,
			'draws': draw_count,
			'total': total_count,
		})
		