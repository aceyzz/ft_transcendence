import { User } from './User.js'

export class FriendRequest {
	constructor(data = {}) {
		this.user = new User(data.user || {})
		this.timestamp = new Date(data.timestamp || undefined)
	}
}