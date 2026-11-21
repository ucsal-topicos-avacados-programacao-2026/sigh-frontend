import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Escape') return
  const abertos = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
  const dialogo = abertos[abertos.length - 1]
  if (!dialogo) return
  const cancelar = new Event('cancel', { cancelable: true })
  if (dialogo.dispatchEvent(cancelar)) dialogo.close()
})
