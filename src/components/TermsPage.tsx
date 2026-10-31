import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, COUNTRY, OWNER, SITE } from '../content/legal'
import { LegalPage } from './LegalPage'

// The rules for using SQL Playbook. Plain language; reviewed by the owner before any paid plan starts.
export function TermsPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  return (
    <LegalPage title="Terms of Use">
      <p>
        These terms apply to SQL Playbook ({SITE}), run by {OWNER}, {COUNTRY}. By using the app you agree to them. If you
        do not agree, please do not use it. Questions: {mail}.
      </p>

      <h2>The service</h2>
      <p>
        SQL Playbook teaches SQL with lessons and exercises on sample databases that run in your browser. It is free to use
        today. If paid plans are introduced, their price and what they include will be shown clearly before you pay, and
        nothing you have already learned will be taken away without notice.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>An account is optional. If you create one, use an email address you control and keep access to it safe.</li>
        <li>One account is for one person.</li>
        <li>
          You can delete your account at any time on the <Link to="/progress">Progress</Link> page. How your data is
          handled is described in the <Link to="/privacy">Privacy Policy</Link>.
        </li>
      </ul>

      <h2>Fair use</h2>
      <p>Please do not:</p>
      <ul>
        <li>try to break, overload or get around the security of the app, its server or its sign-in;</li>
        <li>use automated tools to copy the lessons or exercises in bulk;</li>
        <li>use the reminder or account features to send anything to people who did not ask for it.</li>
      </ul>
      <p>Accounts that do this may be suspended.</p>

      <h2>Content</h2>
      <p>
        The lessons, exercises, explanations and the app itself are © {OWNER}. You may use them for your own learning.
        The sample databases and open-source software belong to their authors and come under their own licenses, listed on{' '}
        <Link to="/licenses">Licenses &amp; credits</Link>.
      </p>

      <h2>No guarantee</h2>
      <p>
        Every solution is checked on PostgreSQL and MySQL before it is published, but SQL Playbook is a learning tool. It
        is provided “as is”, without warranties, and may change or be unavailable at times. Do not rely on it for
        decisions about real production systems without checking for yourself.
      </p>

      <h2>Liability</h2>
      <p>
        As far as the law allows, {OWNER} is not liable for indirect or consequential losses arising from the use of the
        app. Nothing in these terms limits rights you have that cannot be limited by law.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of {COUNTRY}, and disputes go to the competent courts in {COUNTRY}.</p>

      <h2>Changes</h2>
      <p>If these terms change, the new version appears here with a new date. Important changes are also shown in the app.</p>
    </LegalPage>
  )
}
