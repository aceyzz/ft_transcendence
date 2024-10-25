export class UnauthenticatedError extends Error {
	constructor() {
		super("Authentication required")
		this.name = 'UnauthenticatedError'
	}
}

export class AuthenticatedError extends Error {
	constructor() {
		super("Must not be authenticated")
		this.name = "AuthenticatedError"
	}
}

export class NotFoundError extends Error {
	constructor(message = 'The resource was not found.') {
		super(message)
		this.name = 'NotFoundError'
	}
}

export class ValidationMessageError extends Error {
	constructor(message) {
		super(message)
		this.name = 'ValidationMessageError'
	}
}

export class ValidationListError extends Error {
	constructor(errors = {}) {
		super('There are validation errors.')
		this.name = 'ValidationListError'
		this.errors = errors;
	}
}

export class ServerError extends Error {
	constructor() {
		super("There was an error on the server")
		this.name = "ServerError"
	}
}