from django.urls import path

from .views import MatchesView, MatchView , StatsView

app_name = 'game'

urlpatterns = [
	path('matches/', MatchesView.as_view(), name='matches'),
	path('matches/<str:game_uuid>/', MatchView.as_view(), name='match'),
	path('stats/<int:user_id>/', StatsView.as_view(), name='stats'),
]