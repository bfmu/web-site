/**
 * Inicialización de la página /admin/tags (eliminar etiquetas y categorías).
 * Usa delegación de eventos a nivel documento, así que se registra una sola vez
 * y funciona tanto en carga directa como tras transiciones Swup.
 */
import { deleteCategory, deleteTag } from './admin-api'
import { showError, showSuccess } from './notifications'

let handlerAttached = false

export function initTagsPage(): void {
  if (typeof window === 'undefined') return
  const isTagsPage = window.location.pathname
    .replace(/\/$/, '')
    .endsWith('/admin/tags')
  if (!isTagsPage) return
  if (handlerAttached) return
  handlerAttached = true

  document.addEventListener('click', async e => {
    const target = e.target as HTMLElement
    const deleteTagBtn = target.closest('[data-action="delete-tag"]')
    const deleteCategoryBtn = target.closest('[data-action="delete-category"]')

    if (deleteTagBtn) {
      e.preventDefault()
      const tag = (deleteTagBtn as HTMLElement).dataset.tag
      if (!tag) return
      if (!confirm(`¿Eliminar la etiqueta "${tag}" de todos los posts?`)) return
      try {
        const { modifiedCount } = await deleteTag(tag)
        showSuccess(`Etiqueta eliminada de ${modifiedCount} post(s)`)
        window.location.reload()
      } catch (err: unknown) {
        showError(
          `Error: ${(err as { message?: string })?.message || 'Error desconocido'}`,
        )
      }
    }

    if (deleteCategoryBtn) {
      e.preventDefault()
      const category = (deleteCategoryBtn as HTMLElement).dataset.category
      if (!category) return
      if (!confirm(`¿Eliminar la categoría "${category}" de todos los posts?`))
        return
      try {
        const { modifiedCount } = await deleteCategory(category)
        showSuccess(`Categoría eliminada de ${modifiedCount} post(s)`)
        window.location.reload()
      } catch (err: unknown) {
        showError(
          `Error: ${(err as { message?: string })?.message || 'Error desconocido'}`,
        )
      }
    }
  })
}
