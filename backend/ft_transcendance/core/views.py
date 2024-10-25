from django.shortcuts import render
from django.views import View
from django.utils.decorators import method_decorator

from myauth.serializers import serialize_user

class IndexView(View):
	def get(self, request):
		user_json = serialize_user(request.user) if request.user.is_authenticated else None
		return render(request, "core/index.html", { "user_json": user_json})