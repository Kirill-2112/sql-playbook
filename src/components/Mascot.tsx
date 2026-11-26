import styled, { keyframes } from 'styled-components'

/**
 * The app's guide: a small database (a cylinder of stacked disks) with eyes and feet, drawn here, so it is ours to
 * use. It stands by the learner's next skill on the path.
 */
export function Mascot({ size = 72 }: { size?: number }) {
  return (
    <Figure width={size} height={size * 1.15} viewBox="0 0 80 92" aria-hidden="true">
      {/* Feet */}
      <ellipse cx="27" cy="81" rx="10" ry="6" data-part="foot" />
      <ellipse cx="53" cy="81" rx="10" ry="6" data-part="foot" />
      {/* Body: a cylinder, with the disk lines of a database */}
      <path d="M8 18 V70 C8 79 72 79 72 70 V18 Z" data-part="body" />
      <path d="M8 30 C8 39 72 39 72 30" data-part="disk" />
      <path d="M8 64 C8 73 72 73 72 64" data-part="disk" />
      <ellipse cx="40" cy="18" rx="32" ry="10" data-part="top" />
      {/* Face */}
      <ellipse cx="29" cy="47" rx="7" ry="8" data-part="eye" />
      <ellipse cx="51" cy="47" rx="7" ry="8" data-part="eye" />
      <circle cx="31" cy="49" r="3.5" data-part="pupil" />
      <circle cx="53" cy="49" r="3.5" data-part="pupil" />
      <path d="M34 57 Q40 62 46 57" data-part="smile" />
    </Figure>
  )
}

const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`

const Figure = styled.svg`
  display: block;
  overflow: visible;
  animation: ${bob} 2.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  /* Warm orange: it stands out from the blue nodes it stands beside. */
  [data-part='body'] {
    fill: ${({ theme }) => theme.color.streak};
  }

  [data-part='top'] {
    fill: ${({ theme }) => theme.color.missSoft};
    stroke: ${({ theme }) => theme.color.streak};
    stroke-width: 3;
  }

  [data-part='disk'] {
    fill: none;
    stroke: ${({ theme }) => theme.color.missStrong};
    stroke-width: 3;
  }

  [data-part='foot'] {
    fill: ${({ theme }) => theme.color.miss};
  }

  [data-part='eye'] {
    fill: ${({ theme }) => theme.color.surface};
  }

  [data-part='pupil'] {
    fill: ${({ theme }) => theme.color.ink};
  }

  [data-part='smile'] {
    fill: none;
    stroke: ${({ theme }) => theme.color.surface};
    stroke-width: 3;
    stroke-linecap: round;
  }
`
