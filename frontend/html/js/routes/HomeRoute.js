import { authRequirements } from "../utils/authRequirements.js"

export class HomeRoute {
	authentication = authRequirements.logoutRequired
	partial = 'partials/home.html'

	setup(container) { }
}
