export class Pagination {
	constructor(data = {}) {
		this.currentPage = data.current_page || 1
		this.perPage = data.per_page || 20
		this.lastPage = data.last_page || 1
	}
}