export class User {
	constructor(data = {}) {
		this.id = data?.id
		this.username = data?.username
		this.email = data?.email
		this.firstName = data?.first_name
		this.lastName = data?.last_name
		this.avatar = data?.avatar
		this.isConnected = data?.is_connected
		this.relationship = data?.relationship || null // 'blocked', 'friend', 'friend_request_sent', 'friend_request_received' or null
	}

	get fullName() {
		if (this.firstName && this.lastName)
			return `${this.firstName} ${this.lastName}`
		if (this.firstName)
			return this.firstName
		if (this.lastName)
			return this.lastName
		return ''
	}
}