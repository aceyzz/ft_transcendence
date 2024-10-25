import { User } from "./User.js"

export class Notification {
	constructor({ id, type, message = '', user, gameId = null, timestamp }) {
		this.id = id || crypto.randomUUID()
		this.type = type
		this.message = message
		this.gameId = gameId
		this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp)
		this.user = user instanceof User ? user : new User(user)
	}
}