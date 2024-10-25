import uuid

from django.db import models

class TournamentPlayer(models.Model):
	tournament = models.ForeignKey('Tournament', on_delete=models.CASCADE)
	player = models.ForeignKey('myauth.CustomUser', on_delete=models.RESTRICT)
	place = models.IntegerField()

class Tournament(models.Model):
	participants = models.ManyToManyField('myauth.CustomUser', through='TournamentPlayer')
	created = models.DateTimeField(auto_now_add=True)

class Match(models.Model):
	class Status(models.TextChoices):
		PENDING = 'P'
		STARTED = 'S'
		FINISHED = 'F'
		CANCELED = 'C'

	status = models.CharField(max_length=1, choices=Status, default=Status.PENDING)
	uuid = models.UUIDField(default=uuid.uuid4, editable=False)
	player1 = models.ForeignKey('myauth.CustomUser', on_delete=models.RESTRICT, related_name='matches_as_player1')
	player2 = models.ForeignKey('myauth.CustomUser', on_delete=models.RESTRICT, related_name='matches_as_player2')
	player1_score = models.IntegerField(null=True)
	player2_score = models.IntegerField(null=True)
	winner = models.ForeignKey('myauth.CustomUser', on_delete=models.RESTRICT, null=True, blank=True, related_name='matches_won')
	tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
	forfeited = models.BooleanField(default=False)
	created = models.DateTimeField(auto_now_add=True)