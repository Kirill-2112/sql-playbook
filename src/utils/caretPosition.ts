// Styles that decide where text wraps and how tall a line is: the mirror copies them from the textarea.
const COPIED = [
  'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'paddingTop',
  'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
  'lineHeight', 'tabSize', 'textTransform', 'wordSpacing', 'whiteSpace', 'wordWrap', 'overflowWrap',
] as const

/**
 * Where a character of a textarea is drawn, relative to the textarea's top left corner (minus its scroll): a hidden
 * copy of the text up to that character, laid out with the same styles, shows where the next character goes.
 */
export function caretPosition(field: HTMLTextAreaElement, index: number): { top: number; left: number; height: number } {
  const style = getComputedStyle(field)
  const mirror = document.createElement('div')
  for (const key of COPIED) mirror.style[key] = style[key]
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' })
  mirror.textContent = field.value.slice(0, index)
  const marker = document.createElement('span')
  marker.textContent = field.value.slice(index) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4
  const position = { top: marker.offsetTop - field.scrollTop, left: marker.offsetLeft - field.scrollLeft, height: lineHeight }
  mirror.remove()
  return position
}
