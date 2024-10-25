export const alertType = {
	success: 'var(--alert-success)',
	error: 'var(--alert-error)',
	warning: 'var(--alert-warning)',
	info: 'var(--alert-info)',
}

class TempAlert {
	#element
	#timeout

	constructor(element) {
		this.#element = element
	}

	success(message) {
		this.#show(message, alertType.success)
	}

	error(err) {
		if (err instanceof Error) {
			this.#show(err.message, alertType.error)
		}
		else
			this.#show(err, alertType.error)
	}

	warning(message) {
		this.#show(message, alertType.warning)
	}

	info(message) {
		this.#show(message, alertType.info)
	}

	#show(message, color = 'var(--alert-info)') {
		const template = document.querySelector('.temp-alert-item').content.firstElementChild;
		const alert = template.cloneNode(true);
		alert.querySelector('[data-temp-alert-message]').textContent = message;
		alert.style.backgroundColor = color;

		const alertWrapper = document.createElement('div');
		alertWrapper.classList.add('alert-wrapper');
		alertWrapper.appendChild(alert);
		this.#element.prepend(alertWrapper);
		this.#element.classList.remove('hidden');

		alertWrapper.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 500,
			easing: 'ease-in-out'
		}).onfinish = () => {
			this.#timeout = setTimeout(() => {
				alertWrapper.animate([{ opacity: 1 }, { opacity: 0 }], {
					duration: 500,
					easing: 'ease-in-out'
				}).onfinish = () => {
					alertWrapper.remove();
					if (!this.#element.children.length) {
						this.#element.classList.add('hidden');
					}
				};
			}, 3000);
		};
	}
}

export const tempAlert = new TempAlert(document.getElementById('temp-alert-container'));