export function loadingComponent(message = "Loading...") {
	return `<div class="loading-message">
				<img src="/static/assets/spinner.gif" alt="Loading">
				${message}
			</div>`;
}

export function errorComponent(message = "An error occurred") {
	return `<p class="error-message">${message}</p>`;
}

export function emptyComponent(message = "No data found") {
	return `<p class="empty-message">${message}</p>`;
}

export function errorMessage(input, messages) {
	removePreviousAlerts(input);

	const alertBox = document.createElement('div');
	alertBox.className = 'alert alert-danger';
	if (Array.isArray(messages))
		alertBox.textContent = messages.join(', ');
	else
		alertBox.textContent = messages;
	input.insertAdjacentElement('afterend', alertBox);
}

export function successMessage(input, message) {
	removePreviousAlerts(input);
	
	const alertBox = document.createElement('div');
	alertBox.className = 'alert alert-success';
	alertBox.textContent = message;
	input.insertAdjacentElement('afterend', alertBox);
}

function removePreviousAlerts(input) {
	const previousAlerts = input.parentNode.querySelectorAll('.alert');
	previousAlerts.forEach(alert => alert.remove());
}