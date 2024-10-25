import os

from django.db import models
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError

from game.models import Match

def avatar_upload_path(instance, filename):
	ext = filename.split('.')[-1]
	return f'avatars/{instance.username}.{ext}'

class CustomUser(AbstractUser):
	email = models.EmailField(unique=True, null=False, blank=False)
	avatar = models.ImageField('avatar', null=True, blank=True, upload_to=avatar_upload_path)
	friends = models.ManyToManyField('CustomUser', through='social.Friendship', symmetrical=True)
	friend_requests_sent = models.ManyToManyField('CustomUser', symmetrical=False, related_name='friend_requests_received')
	blocked = models.ManyToManyField('CustomUser', symmetrical=False, related_name='blocked_by')
	connection_counter = models.IntegerField(default=0)

	def matches(self):
		return Match.objects.filter(Q(player1__id=self.id) | Q(player2__id=self.id))

	# TODO: Send only 'friend' or 'friend-request', not the actual messages to send
	def add_friend_request(self, friend):
		"""
		Returns 'friend_request' if a friend request was created, or 'friend' if a new friend was added
		"""
		# Error: The other user is already a friend
		if self.friends.contains(friend):
			raise ValidationError(f'{friend.username} is already a friend.')
		# Error: A friend request already exists for the other user
		if self.friend_requests_sent.filter(id=friend.id).exists():
			raise ValidationError(f'You already sent a friend request to {friend.username}.')
		# Error: You are blocked by the other user
		if self.blocked_by.filter(id=friend.id).exists():
			raise ValidationError(f'You cannot send a friend request to this user.')

		# Already a friend request from the other person
		if self.friend_requests_received.filter(id=friend.id).exists():
			self.friend_requests_received.remove(friend)
			self.friends.add(friend)
			return 'friend'

		self.blocked.remove(friend)
		self.friend_requests_sent.add(friend)

		return 'friend_request'
		
	def cancel_friend_request(self, user):
		"""
		Cancels a friend request sent by another user.
		"""
		self.friend_requests_sent.remove(user)
		return 'The friend request was canceled.'
	
	def accept_friend_request(self, user):
		"""
		Accept a friend request that was received from another user.
		"""
		# Error: The friend request was canceled
		if not self.friend_requests_received.filter(id=user.id).exists():
			raise ValidationError('The friend request was canceled.')
		# Error: The other user is blocked
		if self.blocked.contains(user):
			raise ValidationError(f"You have user {user.username}.")

		self.friend_requests_received.remove(user)
		self.friend_requests_sent.remove(user)
		self.friends.add(user)

		return f'{user.username} was added as a friend'
	
	def decline_friend_request(self, user):
		"""
		Decline a friend request received from another user.
		"""
		# Error: Friend request canceled
		if not self.friend_requests_received.filter(id=user.id).exists():
			raise ValidationError('The friend request was already canceled.')

		# Remove friend request from the user
		self.friend_requests_received.remove(user)

		return 'Friend request declined.'
	
	def remove_friend(self, user):
		self.friends.remove(user)

	def block_user(self, user):
		# User already blocked
		if self.blocked.filter(id=user.id).exists():
			raise ValidationError('The user is already blocked.')

		self.friend_requests_sent.remove(user)
		self.friend_requests_received.remove(user)
		self.friends.remove(user)
		self.blocked.add(user)

		return 'The user was blocked.'	
	
	def unblock_user(self, user):
		# User is not blocked
		if not self.blocked.filter(id=user.id).exists():
			raise ValidationError('The user is not blocked.')

		self.blocked.remove(user)

		return 'The user was unblocked.'