const REGEX_PASSWD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!@#_]{8,}$/;	// seulement lettres, chiffres, !, @, #, _, min 8 caractères
const REGEX_TEXT = /^[a-zA-Z0-9\s.,;:!?()\-_'"]+$/;							// lettres, chiffres, espaces, ponctuation
const REGEX_NAME = /^[a-zA-Z\s\-]{3,}$/;									// lettres, espaces, tirets, min 3 caractères
const REGEX_USERNAME = /^[a-zA-Z0-9._-]{3,}$/; 								// lettres, chiffres, . , _ , - , min 3 caractères
const REGEX_EMAIL = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; 		// email

export function checkInput(type, value) {
	if (!value || typeof value !== 'string') return false;

	switch (type) {
		case 'password':
			return REGEX_PASSWD.test(value);
		case 'text':
			return REGEX_TEXT.test(value.trim());
		case 'name':
			return REGEX_NAME.test(value.trim());
		case 'username':
			return REGEX_USERNAME.test(value.trim());
		case 'email':
			return REGEX_EMAIL.test(value.trim());
		default:
			return false;
	}
}