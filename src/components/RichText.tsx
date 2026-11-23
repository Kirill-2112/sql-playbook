/** Text with `code` and **bold** marked inline, as the explanation cards are written. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : part.startsWith('**') && part.endsWith('**') && part.length > 3 ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      )}
    </>
  )
}
