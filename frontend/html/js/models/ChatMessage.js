import { User } from "./User.js";

export class ChatMessage {
	constructor(data = {}) {
		this.fromUser = data.from_user ? new User(data.from_user) : null
		this.toUser = data.to_user ? new User(data.to_user) : null
		this.text = data.text
		this.timestamp = new Date(data.timestamp)
	}
}