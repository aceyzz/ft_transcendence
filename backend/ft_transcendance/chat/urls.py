# chat/urls.py
from django.urls import path
from .views import ChatMessagesView

app_name = 'chat'

urlpatterns = [
	path('messages/', ChatMessagesView.as_view(), name='messages'),
]