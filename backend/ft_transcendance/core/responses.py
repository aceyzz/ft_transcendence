from django.http import JsonResponse
from django.core.paginator import Paginator

def success_json_response(data, status=200):
	return JsonResponse({'status': 'success', 'data': data}, safe=False, status=status)

def json_success_message_response(message, status=200):
	return JsonResponse({ 'message': message }, status=status)

def json_success_data_response(data, status=200):
	return JsonResponse({ 'data': data }, status=status)

def json_success_paginated_data_response(object_list, per_page, page, serializer=None):
	try:
		per_page = int(per_page)
	except:
		per_page = 20
	try:
		page = int(page)
	except:
		page = 1
	paginator = Paginator(object_list, per_page)
	page_obj = paginator.get_page(page)
	if serializer:
		data = [serializer(obj) for obj in page_obj.object_list] 
	else:
		data = [obj for obj in page_obj.object_list] 
	return JsonResponse({
		'data': data,
		'pagination': {
			'current_page': page_obj.number,
			'per_page': paginator.per_page,
			'last_page': paginator.num_pages,
		}
	}, status=200)


def json_error_message_response(message, status=422):
	return JsonResponse({ 'message': message }, status=status)

def json_error_data_response(errors, status=422):
	return JsonResponse({ 'errors': errors }, status=status)

def json_auth_error_response():
	return JsonResponse(None, safe=False, status=401)
