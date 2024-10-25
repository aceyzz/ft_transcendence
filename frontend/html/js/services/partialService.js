class PartialService {
	#prefix = '/static/'

	async load(partialName) {
		const response = await fetch(this.#prefix + partialName)
		if (!response.ok)
			throw new ServerError("Network response was not ok")
		return await response.text()
	}
}

export const partialService = new PartialService()