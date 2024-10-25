from django.urls import path

from .views import FriendsView, FriendView, FriendRequestsSentView, FriendRequestSentView, FriendRequestsReceivedView, FriendRequestReceivedView, BlockedUsersView, BlockedUserView

app_name = 'social'

urlpatterns = [
	path('friends/', FriendsView.as_view(), name='friends'),
	path('friends/<int:friend_id>/', FriendView.as_view(), name='friend'),
	path('friend-requests/sent/', FriendRequestsSentView.as_view(), name='friend-requests-sent'),
	path('friend-requests/sent/<int:to_user_id>/', FriendRequestSentView.as_view(), name='friend-request-sent'),
	path('friend-requests/received/', FriendRequestsReceivedView.as_view(), name='friend-requests-received'),
	path('friend-requests/received/<int:from_user_id>/', FriendRequestReceivedView.as_view(), name='friend-request-received'),
	path('blocked-users/', BlockedUsersView.as_view(), name='blocked-users'),
	path('blocked-users/<int:other_user_id>/', BlockedUserView.as_view(), name='blocked-user'),
]