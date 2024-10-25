const imageUrl = {
	'light-mode': '/static/assets/moon.png',
	'dark-mode': '/static/assets/sun.png'
};

class ColorModeComponent {
	element
	#currentMode

	setup(element) {
		this.element = element

		this.#currentMode = localStorage.getItem('theme') || 'light-mode';
		if (this.#currentMode !== 'light-mode' && this.#currentMode !== 'dark-mode') {
			this.#currentMode = 'light-mode'
			this.localStorage.setItem('theme', this.#currentMode)
		}

		this.element.addEventListener('click', this.#toggleColorMode.bind(this));

		this.#updateColorMode(this.#currentMode);
	}

	#toggleColorMode() {
		this.#currentMode = this.#currentMode === 'light-mode' ? 'dark-mode' : 'light-mode'
		localStorage.setItem('theme', this.#currentMode);
		this.#updateColorMode(this.#currentMode)
	}

	#updateColorMode(mode) {
		document.body.classList.remove('light-mode', 'dark-mode');
		document.body.classList.add(mode);
		document.getElementById('color-mode-icon').src = imageUrl[mode];
	}
}

export const colorModeComponent = new ColorModeComponent()