from django.core.management.base import BaseCommand

from myauth.models import CustomUser

class Command(BaseCommand):
	help = 'Reset all connection counter fields to 0'

	def handle(self, *args, **kwargs):
		CustomUser.objects.update(connection_counter=0)
		self.stdout.write('Reset all connection counters to 0')