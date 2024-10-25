from channels.db import database_sync_to_async
from .models import WebSocketConnection

@database_sync_to_async
def create_websocket_connection(user_id, channel_name):
    return WebSocketConnection.objects.create(user_id=user_id, channel_name=channel_name)

@database_sync_to_async
def delete_websocket_connection(channel_name):
    return WebSocketConnection.objects.filter(channel_name=channel_name).delete()

@database_sync_to_async
def get_last_connection_by_username(username):
    return WebSocketConnection.objects.filter(user__username=username).last()

def get_user_by_username(username):
    return User.objects.filter(username=username).first()

    async def friend_request(self, content):
        target_username = content.get("data", {}).get("username")
        if target_username:
            await send_friend_request_notification(self.scope['user'].username, target_username)

    async def match_request(self, content):
        target_username = content.get("data", {}).get("username")
        if target_username:
            await send_match_request_notification(self.scope['user'].username, target_username)

    async def tournoi_request(self, content):
        target_username = content.get("data", {}).get("username")
        if target_username:
            await send_tournament_request_notification(self.scope['user'].username, target_username)

    async def send_error_message(self, type_error, error_message):
        await self.send_json(
        {
            "type": type_error,
            "message": error_message
        })