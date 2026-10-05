import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';
import { LegalPage, legalStyles as s } from '../legal/LegalPage';

export const metadata: Metadata = {
  title: `Account & Data Deletion — ${LEGAL.appName}`,
  description: `How to delete your ${LEGAL.appName} account and the personal data linked to it.`,
};

const subject = encodeURIComponent(`Delete my ${LEGAL.appName} account`);
const body = encodeURIComponent(
  'Please delete my account and personal data.\n\nRegistered email address: \nFull name: \n',
);

export default function AccountDeletionPage() {
  return (
    <LegalPage title="Account & Data Deletion">
      <p>
        This page explains how to delete your <strong>{LEGAL.appName}</strong> account and the
        personal data linked to it. It applies to the Android app (
        <code>{LEGAL.appPackage}</code>) and to the website. The app is published by{' '}
        <strong>{LEGAL.developerName}</strong>.
      </p>

      <h2>How to request deletion</h2>
      <ol>
        <li>
          Send an email to{' '}
          <a href={`mailto:${LEGAL.contactEmail}?subject=${subject}&body=${body}`}>
            {LEGAL.contactEmail}
          </a>{' '}
          with the subject <strong>&ldquo;Delete my {LEGAL.appName} account&rdquo;</strong>.
        </li>
        <li>
          Send it <strong>from the email address registered on your account</strong>, and include your
          full name. This is how we confirm the request is really yours. If you no longer have access
          to that address, tell us and we will agree another way to verify you.
        </li>
        <li>
          We confirm by reply, delete the account, and tell you when it is done &mdash; within{' '}
          <strong>{LEGAL.deletionDays} days</strong> of receiving a verified request.
        </li>
      </ol>
      <div className={s.callout}>
        <p>
          Deletion is permanent. You will be signed out everywhere and will not be able to recover
          your registrations, results or certificates from this account.
        </p>
      </div>

      <h2>What is deleted</h2>
      <ul>
        <li>Your sign-in account (email, password hash) and role.</li>
        <li>
          Your profile: name, date of birth, gender, state, district, phone, emergency-contact number,
          NSRD ID and weight records.
        </li>
        <li>Your Aadhaar number, if you provided it.</li>
        <li>Your profile photo.</li>
        <li>Your pending event registrations.</li>
      </ul>

      <h2>What may be kept, and for how long</h2>
      <ul>
        <li>
          <strong>Competition records</strong> (completed events, bout results, brackets) that other
          participants&rsquo; results depend on are kept, with your name and personal details removed
          or replaced by an anonymous label.
        </li>
        <li>
          <strong>Certificates already issued</strong> to you remain valid documents that you may
          hold, but we remove the link between them and your deleted account.
        </li>
        <li>
          <strong>Backups.</strong> Deleted data can remain in encrypted database backups until they
          are overwritten in the normal backup cycle. It is not restored into the live service.
        </li>
        <li>
          <strong>Legal and security records</strong>, if any are required by law or to prevent fraud
          and abuse, are kept only as long as the law requires.
        </li>
        <li>
          <strong>Crash reports</strong> sent to our error-reporting provider contain no profile data
          and expire under that provider&rsquo;s retention schedule.
        </li>
      </ul>

      <h2>Delete only some data</h2>
      <p>
        You can edit or remove optional details (phone, emergency contact, NSRD ID, Aadhaar, photo)
        from your profile without deleting your account. To have specific data removed while keeping
        the account, email us and say which items.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. See also our{' '}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
