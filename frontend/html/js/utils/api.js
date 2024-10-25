import * as errors from './errors.js'
import { Pagination } from '../models/Pagination.js'
import { routerService } from '../services/routerService.js'
import { authService } from '../services/authService.js'

let csrftoken = document.querySelector('meta[name="csrftoken"]').getAttribute('content')

export function updateCsrfCookie(newCsrfToken) {
	csrftoken = newCsrfToken
	document.cookie = `csrftoken=${newCsrfToken}; path=/; SameSite=Lax;`
}

async function customFetch(url, options) {
	let response
	if (options)
		response = await fetch(url, options)
	else
		response = await fetch(url)

	if (response.ok) {
		const json = await response.json()
		return json
	}

	if (response.status === 401) {
		authService.updateUser(null)
		routerService.navigate('/')
		throw new errors.UnauthenticatedError()
	}

	if (response.status === 404)
		throw new errors.NotFoundError()

	if (response.status === 422) {
		const json = await response.json()
		if (json.errors)
			throw new errors.ValidationListError(json.errors)
		else
			throw new errors.ValidationMessageError(json.message)
	}

	throw new errors.ServerError()
}

export async function get(url, data = {}) {
	const params = new URLSearchParams(data)
	const urlWithParams = `${url}?${params.toString()}`
	return await customFetch(urlWithParams)
}

export async function getPaginated(url, data = {}, transformer) {
	const params = new URLSearchParams(data)
	const urlWithParams = `${url}?${params.toString()}`
	const json = await customFetch(urlWithParams)
	json.pagination = new Pagination(json.pagination)
	if (transformer)
		json.data = json.data.map((item, index) => transformer(item, index))
	return json
}

export async function post(url, data, options = {}) {
	return await customFetch(url, {
		...options,
		method: 'POST',
		body: data,
		headers: {
			...options.headers,
			'X-CSRFToken': csrftoken,
		}
	})
}

export async function put(url, data, options = {}) {
	return await customFetch(url, {
		...options,
		method: 'PUT',
		body: data,
		headers: {
			...options.headers,
			'X-CSRFToken': csrftoken,
		}
	})
}

export async function destroy(url, options = {}) {
	return await customFetch(url, {
		...options,
		method: 'DELETE',
		headers: {
			...options.headers,
			'X-CSRFToken': csrftoken,
		}
	})
}