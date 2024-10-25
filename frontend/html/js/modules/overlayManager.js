class OverlayManager {
    #overlay
    #activePopup

    constructor() {
        this.#overlay = document.getElementById('overlay')
        this.#activePopup = null

        this.#overlay.addEventListener('click', () => {
            if (this.#activePopup) {
                this.#activePopup.close()
            }
        })
    }

    show(popup) {
        if (this.#activePopup && this.#activePopup !== popup) {
            this.#activePopup.close()
        }

        this.#activePopup = popup
        this.#overlay.classList.remove('hidden')
    }

    hide() {
        this.#activePopup = null
        this.#overlay.classList.add('hidden')
    }
}

export const overlayManager = new OverlayManager()