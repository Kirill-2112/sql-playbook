import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, COUNTRY, OWNER, SITE } from '../content/legal'
import { LegalPage } from './LegalPage'

// What SQL Playbook stores, where, for how long, and how to get it deleted. Keep it in step with the code:
// localStorage (src/progress), reminders (api/push, supabase/push_subscriptions.sql), accounts (src/progress/account.ts).
export function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  return (
    <LegalPage title="Privacy Policy">
      <p>
        SQL Playbook ({SITE}) is run by {OWNER}, {COUNTRY} (“I”, “me”). This page explains what the app stores about
        you, why, where it is kept, and how to have it deleted. Questions: {mail}.
      </p>

      <h2>In short</h2>
      <ul>
        <li>Without an account, your progress stays in your browser and is never sent to me.</li>
        <li>With an account, I store your email address and a copy of your progress, so it follows you to other devices.</li>
        <li>If you turn on reminders, I store what is needed to send them.</li>
        <li>No ads, no analytics, no tracking cookies, and your data is never sold.</li>
        <li>You can delete your account and its data at any time from the Progress page.</li>
      </ul>

      <h2>What is stored, and why</h2>
      <ul>
        <li>
          <strong>On your device.</strong> Your progress (finished lessons, XP, streak, review schedule) and settings (daily
          goal, SQL dialect, reminder time) are saved in your browser’s local storage so the app works without an account.
          The queries you run execute in your browser and are not sent anywhere.
        </li>
        <li>
          <strong>Account.</strong> Your email address, and if you sign in with Google, the name and profile picture Google
          shares. A copy of your progress and settings is stored with your account. Sign-in records, including your IP
          address, are kept by the sign-in service for security.
        </li>
        <li>
          <strong>Reminders.</strong> If you turn them on: the push address your browser creates for this site and its
          encryption keys, the reminder time and your time zone, and the last day you practised with your streak, so a
          reminder is skipped on days you already studied.
        </li>
        <li>
          <strong>Hosting.</strong> Like any website, the hosting provider processes your IP address and basic request
          details to deliver the pages and keep the service secure.
        </li>
      </ul>
      <p>
        I use this data only to provide the features you choose: saving progress, signing you in, and sending the
        reminders you asked for.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (United States) hosts the site and the reminder server.
        </li>
        <li>
          <strong>Supabase Inc.</strong> stores accounts, progress and reminder settings on servers in Ireland (EU), and
          sends the sign-in emails.
        </li>
        <li>
          <strong>Google</strong>, if you choose “Continue with Google”, confirms who you are.
        </li>
        <li>
          <strong>Your browser’s push service</strong> (Google, Apple, Mozilla or Microsoft, depending on the browser)
          delivers reminders. Their content is encrypted so the push service cannot read it.
        </li>
      </ul>
      <p>Some of these providers are outside {COUNTRY}; they process the data under their own security and privacy terms.</p>

      <h2>How long it is kept</h2>
      <ul>
        <li>Account and progress: until you delete your account.</li>
        <li>Reminder settings: until you turn reminders off, delete your account, or your browser cancels the subscription.</li>
        <li>Security and hosting logs: for the limited time the providers keep them.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct, export or delete your data. Delete your account yourself on the{' '}
        <Link to="/progress">Progress</Link> page (Account → Delete account), or write to {mail} and I will do it. If you
        live in the EU or the UK you also have the rights the GDPR gives you. In {COUNTRY}, you can complain to the Privacy
        Protection Authority.
      </p>

      <h2>Children</h2>
      <p>SQL Playbook is not meant for children under 13, and I do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the new version appears here with a new date. Important changes are also shown in the app.</p>
    </LegalPage>
  )
}
