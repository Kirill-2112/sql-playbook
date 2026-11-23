/**
 * Phones: once the keyboard is up, scrolls so that everything from `top` (the task's text) to `bottom` (the editor
 * and its key bar) is in sight, the task at the top. The phone itself only makes sure the cursor is visible, which
 * often pushes the task off the screen. When it all does not fit above the keyboard, the phone's own scrolling stays.
 */
export function showWhileTyping(top: HTMLElement, bottom: HTMLElement) {
  const view = window.visualViewport
  if (!view || typeof matchMedia !== 'function' || !matchMedia('(pointer: coarse)').matches) return
  let done = false
  const align = () => {
    if (done) return
    done = true
    view.removeEventListener('resize', align)
    const gap = 8
    // Element boxes are measured from the page's layout viewport; the part above the keyboard starts at offsetTop,
    // and a sticky bar at the top of the page (the lesson's header) hides what is under it.
    const start = Math.max(view.offsetTop, stickyBottom())
    const from = top.getBoundingClientRect().top - start
    const to = bottom.getBoundingClientRect().bottom - start
    if (to - from + 2 * gap > view.offsetTop + view.height - start) return
    const by = from - gap
    if (Math.abs(by) > 4) window.scrollBy({ top: by, behavior: 'smooth' })
  }
  // The keyboard opening resizes the visible part; when it was already open (another field had focus), nothing
  // changes size, so a timer does it.
  view.addEventListener('resize', align)
  window.setTimeout(align, 700)
}

/** Where sticky bars pinned to the top of the page end (0 when there are none). */
function stickyBottom(): number {
  let bottom = 0
  for (const bar of document.querySelectorAll('header')) {
    const style = getComputedStyle(bar)
    if ((style.position === 'sticky' || style.position === 'fixed') && parseFloat(style.top) === 0) {
      bottom = Math.max(bottom, bar.getBoundingClientRect().height)
    }
  }
  return bottom
}
