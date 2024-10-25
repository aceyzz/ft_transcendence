import { authService } from './authService.js'
import { partialService } from './partialService.js'
import { authRequirements } from '../utils/authRequirements.js'
import { notificationsComponent } from '../components/notificationsComponent.js'
import { chatComponent } from '../components/chatComponent.js'
import { searchComponent } from '../components/searchComponent.js'
import { tempAlert } from '../modules/tempAlert.js'

class RouterService {
	#container
	#routes = []
	#loggedInDefaultRoute = '/dashboard'
	#loggedOutDefaultRoute = '/'
	#currentRoute

	setup(container = null) {
		if (!container)
			throw new Error("The content element does not exist")

		this.#container = container
	}

	start() {
		window.addEventListener("popstate", (e) => {
			this.#loadRoute(window.location.pathname)
		})

		this.#loadRoute(window.location.pathname)
	}

	addRoute(path, route) {
		this.#routes[path] = route
	}

	navigate(path) {
		notificationsComponent.close()
		chatComponent.close()
		searchComponent.close()

		window.history.pushState(path, "", path)
		this.#loadRoute(window.location.pathname)
	}

	async #loadRoute(path) {
		// Cleanup current route (if possible) before moving on
		this.#currentRoute?.cleanup?.()

		// Choose route
		const route = this.#routes[path]
		if (!route) {
			this.#container.innerHTML = ""
			tempAlert.error('Route not found')
			return
		}

		// Check login/logout requirements
		if (authService.isLoggedIn() && route.authentication === authRequirements.logoutRequired) {
			this.navigate(this.#loggedInDefaultRoute)
			return
		}
		if (!authService.isLoggedIn() && route.authentication === authRequirements.loginRequired) {
			this.navigate(this.#loggedOutDefaultRoute)
			return
		}

		// Load partial and setup route
		try {
			const html = await partialService.load(route.partial)
			this.#container.innerHTML = html
			this.#setupLinks()
			await route.setup(this.#container)
			this.#currentRoute = route
		} catch (err) {
			this.#container.innerHTML = ''
			tempAlert.error('Error loading route. Please reload the page.')
		}
	}

	#setupLinks() {
		const links = this.#container.querySelectorAll(":scope [data-route]")
		links.forEach(element => {
			element.addEventListener("click", (e) => {
				e.preventDefault()
				this.navigate(e.currentTarget.getAttribute("href"))
			})
		});
	}

}

export const routerService = new RouterService()