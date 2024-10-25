import { authService } from "./services/authService.js";
import { routerService } from "./services/routerService.js";
import './services/appWebSocketService.js' // NE PAS ENLEVER CETTE LIGNE ! Elle initialise le websocket

import { notificationsComponent } from "./components/notificationsComponent.js";
import { colorModeComponent } from "./components/colorModeComponent.js";
import { profileButtonComponent } from "./components/profileButtonComponent.js";
import { chatComponent } from "./components/chatComponent.js";
import { searchComponent } from "./components/searchComponent.js";

import { User } from "./models/User.js";

import { HomeRoute } from "./routes/HomeRoute.js"
import { LoginRoute } from "./routes/LoginRoute.js"
import { SignupRoute } from "./routes/SignupRoute.js"
import { FriendListRoute } from "./routes/FriendListRoute.js";
import { AddFriendsRoute } from "./routes/AddFriendsRoute.js";
import { BlockedRoute } from "./routes/BlockedRoute.js";
import { GameRoute } from "./routes/GameRoute.js";
import { DashboardRoute } from "./routes/DashboardRoute.js";
import { UserRoute } from "./routes/UserRoute.js";
import { StatsRoute } from "./routes/StatsRoute.js";
import { PasswordRoute } from "./routes/PasswordRoute.js";
import { UserProfileRoute } from "./routes/UserProfileRoute.js";
import { eventBus } from "./modules/eventBus.js";
import { LocalMatchRoute } from "./routes/LocalMatchRoute.js";
import { RemoteMatchRoute } from "./routes/RemoteMatchRoute.js";
import { LocalTournamentRoute } from "./routes/LocalTournamentRoute.js";

let user = null
try {
	const userData = JSON.parse(document.getElementById('user').innerText)
	if (userData)
		user = new User(userData)
} catch (err) {
	user = null
}

routerService.setup(document.getElementById('content'))

routerService.addRoute('/', new HomeRoute())
routerService.addRoute('/login', new LoginRoute())
routerService.addRoute('/signup', new SignupRoute())
routerService.addRoute('/dashboard', new DashboardRoute())
routerService.addRoute('/game', new GameRoute())
routerService.addRoute('/friend-list', new FriendListRoute())
routerService.addRoute('/user', new UserRoute())
routerService.addRoute('/blocked', new BlockedRoute())
routerService.addRoute('/add-friends', new AddFriendsRoute());
routerService.addRoute('/stats', new StatsRoute())
routerService.addRoute('/password', new PasswordRoute())
routerService.addRoute('/user-profile', new UserProfileRoute())

// jeu
routerService.addRoute('/local-match', new LocalMatchRoute())
routerService.addRoute('/remote-match', new RemoteMatchRoute())
routerService.addRoute('/local-tournament', new LocalTournamentRoute())

eventBus.subscribe('auth.login', () => {
	document.body.classList.replace('logged-out', 'logged-in')
})

eventBus.subscribe('auth.logout', () => {
	document.body.classList.replace('logged-in', 'logged-out')
})

notificationsComponent.setup({
	buttonEl: document.getElementById('notification-button'),
	containerEl: document.getElementById('notifications-popup-container'),
	displayEl: document.getElementById('notification-display-container'),
})
profileButtonComponent.setup(document.getElementById('profile-button'))
colorModeComponent.setup(document.getElementById('color-mode'))
chatComponent.setup(document.getElementById('chat-button'), document.getElementById('chat-popup-container'))
searchComponent.setup(document.getElementById('search-button'), document.getElementById('search-popup-container'))

authService.updateUser(user)
routerService.start()