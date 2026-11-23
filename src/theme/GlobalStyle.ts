import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    margin: 0;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.ink};
    font-family: ${({ theme }) => theme.font.sans};
    font-size: ${({ theme }) => theme.size.md};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 { line-height: 1.2; text-wrap: balance; margin: 0; }

  p { margin: 0; }

  a { color: ${({ theme }) => theme.color.accent}; }

  code {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 0.9em;
    background: ${({ theme }) => theme.color.accentSoft};
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* iPhone zooms the page into any field whose text is under 16px, and stays zoomed: the task and the suggestions
     then fall off the screen. Touch screens get 16px in every field. */
  @media (pointer: coarse) {
    input, textarea, select { font-size: max(${({ theme }) => theme.size.md}, 1em) !important; }
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accent};
    outline-offset: 2px;
  }
`
