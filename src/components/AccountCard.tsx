import { useEffect, useId, useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { deleteAccount, sendSignInEmail, signInWithGoogle, signOut, startAccounts, useAccount, verifyEmailCode } from '../progress/account'

const APP_URL = 'https://sql.kirillabs.com/'

// Sign in to keep progress on every device: an email link or code, or Google. Shows who is signed in and the last sync.
export function AccountCard() {
  const account = useAccount()
  const emailId = useId()
  const codeId = useId()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void startAccounts()
  }, [])

  async function run(action: () => Promise<void>, done = '') {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2>Account</h2>
      {account.status === 'loading' && <Muted>Checking your account…</Muted>}
      {account.status === 'unavailable' && (
        <Muted>
          Accounts work in the app at <a href={APP_URL}>sql.kirillabs.com</a>. Until you sign in there, progress is saved on
          this device only.
        </Muted>
      )}
      {account.status === 'signed-in' && (
        <>
          <Muted>
            Signed in as <strong>{account.email}</strong>. Your progress is saved to your account and follows you to every
            device where you sign in.
            {account.syncedAt && ` Last saved at ${new Date(account.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}
          </Muted>
          <Secondary type="button" disabled={busy} onClick={() => void run(signOut)}>
            Sign out on this device
          </Secondary>
          <Danger
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Delete your account and the progress saved in it? This cannot be undone. Progress on this device stays.'))
                void run(deleteAccount, 'Your account was deleted.')
            }}
          >
            Delete account
          </Danger>
        </>
      )}
      {account.status === 'signed-out' && (
        <>
          <Muted>Sign in to keep your progress on every device. Progress you already have here is kept and added to your account.</Muted>
          {account.notice && <Status role="status">{account.notice}</Status>}
          {sentTo === null ? (
            <Form
              onSubmit={(e) => {
                e.preventDefault()
                const to = email.trim()
                void run(async () => {
                  await sendSignInEmail(to)
                  setSentTo(to)
                })
              }}
            >
              <label htmlFor={emailId}>Email</label>
              <input id={emailId} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Primary type="submit" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </Primary>
            </Form>
          ) : (
            <Form
              onSubmit={(e) => {
                e.preventDefault()
                void run(() => verifyEmailCode(sentTo, code.trim()))
              }}
            >
              <Muted>
                We sent an email to <strong>{sentTo}</strong>. Open its link on this device, or type the code from it here.
              </Muted>
              <label htmlFor={codeId}>Code from the email</label>
              <input id={codeId} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              <Primary type="submit" disabled={busy || code.trim().length < 6}>
                {busy ? 'Checking…' : 'Sign in'}
              </Primary>
              <Secondary type="button" onClick={() => setSentTo(null)}>
                Use another email
              </Secondary>
            </Form>
          )}
          {account.google && (
            <Secondary type="button" disabled={busy} onClick={() => void run(signInWithGoogle)}>
              Continue with Google
            </Secondary>
          )}
          <Small>
            By signing in you agree to the <Link to="/terms">Terms of Use</Link>. How your email and progress are kept:{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </Small>
        </>
      )}
      {message && <Status role="status">{message}</Status>}
    </Card>
  )
}

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  label {
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
  }

  input {
    min-height: 48px;
    padding: 0 ${({ theme }) => theme.space.sm};
    border-radius: ${({ theme }) => theme.radius.md};
    border: 2px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.ink};
    font: inherit;
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Status = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.ink};
`

const Primary = styled.button`
  min-height: 48px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    background: ${({ theme }) => theme.color.lockedStrong};
    cursor: default;
  }
`

const Secondary = styled.button`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Danger = styled.button`
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.bad};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  text-decoration: underline;
  cursor: pointer;
`

const Small = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`
