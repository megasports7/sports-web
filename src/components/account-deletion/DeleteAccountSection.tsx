'use client';

/**
 * "Delete account" section for the bottom of every Profile page.
 *
 * Shown only when the server says deletion is enabled for THIS account, so for
 * everyone else it renders nothing. The server refuses anyone else regardless
 * of what is on screen.
 *
 * Instant deletion (owner verdict 2026-10-05): sending the form deletes the
 * account at once. There is no pending state, no grace period and no cancel.
 * The person confirms with their current password plus the typed word DELETE,
 * and the success state below is local: the account is already gone (signed
 * out everywhere), so no status re-read could show it.
 */
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { viewOf } from '@/lib/accountDeletion/model';
import { LEGAL } from '@/lib/legal';
import { useAccountDeletion } from './AccountDeletionProvider';
import styles from './AccountDeletion.module.css';

// What the scrub removes and keeps, from contract §3.1-§3.4. The Privacy Policy
// holds the full list; this is the summary a person reads before confirming.
const DELETED = [
  'Your profile details: name (unless you keep it), email, phone, date of birth, gender, state and district, blood group, emergency contact, father’s name, NSRD ID, sport, organisation and ID number.',
  'Your photo, your weight records and any Aadhaar number you gave.',
  'Event registrations that are still pending or were rejected.',
  'Your sign-in: your email address is removed and the account is blocked, so you are signed out everywhere and can’t sign in again.',
];

const KEPT = [
  'Results, brackets, attendance, weight checks and certificates from events you took part in, linked to “Deleted user” instead of to you.',
  'Approved registrations, without your date of birth, gender or weight.',
  'A record that a deletion happened: dates only, no personal details.',
  'Encrypted backups, until they expire — plus copies in the old systems, until those are retired.',
  // Contract D5/§3.4: the legacy hash stays until M6 decommissioning, and it
  // cannot sign anyone in to the deleted account (email gone, account banned).
  'The old password hash from the previous sign-in system, if your account has one, until that system is retired. It cannot be used to sign in to your deleted account.',
];

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

export function DeleteAccountSection() {
  const { status, loadFailed, refresh } = useAccountDeletion();
  const view = viewOf(status);
  // The account was just deleted through the form below. Local state on
  // purpose: the session is gone, so a re-read could never show this.
  const [deleted, setDeleted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryTitleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (deleted) headingRef.current?.focus();
  }, [deleted]);

  if (deleted) {
    return (
      <section className={styles.card} aria-labelledby={retryTitleId}>
        <h2 id={retryTitleId} ref={headingRef} tabIndex={-1} className={styles.title}>
          Account deleted
        </h2>
        <p role="status" className={styles.ok}>
          Your account and personal details have been deleted. You have been signed out everywhere.
        </p>
      </section>
    );
  }

  if (status === null) {
    // Still loading, or signed out: nothing to show (fail closed, as before).
    if (!loadFailed) return null;
    // The read failed, so there is no card to show. This box only reads the
    // status again: it exposes no deletion action, so it stays fail closed.
    // Focus is deliberately not moved here; the alert announces itself.
    async function retry() {
      setRetrying(true);
      try {
        await refresh();
      } finally {
        setRetrying(false);
      }
    }
    return (
      <section className={styles.card} aria-labelledby={retryTitleId}>
        <h2 id={retryTitleId} className={styles.title}>
          Delete account
        </h2>
        <p role="alert" className={styles.error}>
          We couldn’t load the deletion status. Nothing has changed on your account.
        </p>
        <button type="button" className={styles.quiet} onClick={retry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </section>
    );
  }
  if (view === 'request') {
    return <RequestCard headingRef={headingRef} onDeleted={() => setDeleted(true)} />;
  }
  return null;
}

/** A support address for failures the person cannot fix themselves. */
function SupportLine() {
  const subject = encodeURIComponent('Delete my MegaSportsX account');
  return (
    <span className={styles.support}>
      Email <a href={`mailto:${LEGAL.contactEmail}?subject=${subject}`}>{LEGAL.contactEmail}</a>
    </span>
  );
}

// ---- request: deletion enabled, confirm with password + typed word -----------

function RequestCard({
  headingRef,
  onDeleted,
}: {
  headingRef: HeadingRef;
  onDeleted: () => void;
}) {
  const { request } = useAccountDeletion();
  const [open, setOpen] = useState(false);
  const [keepName, setKeepName] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; support: boolean } | null>(null);

  const panelTitleRef = useRef<HTMLHeadingElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const ids = useId();

  // Opening the panel moves focus into it; closing it returns focus to the opener.
  useEffect(() => {
    if (open) panelTitleRef.current?.focus();
    else if (wasOpen.current) openButtonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function closePanel() {
    setOpen(false);
    setKeepName(false);
    setPassword('');
    setConfirmWord('');
    setError(null);
  }

  // The typed word must match exactly; the server re-checks it too.
  const ready = password.length > 0 && confirmWord === 'DELETE';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    const result = await request({ password, confirmWord, keepName });
    // Neither secret outlives the request, whatever the answer.
    setPassword('');
    setConfirmWord('');
    setBusy(false);
    if (result.ok) {
      onDeleted();
      return;
    }
    setError({ text: result.text, support: result.support });
    passwordRef.current?.focus();
  }

  return (
    <section className={styles.card} aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} ref={headingRef} tabIndex={-1} className={styles.title}>
        Delete account
      </h2>
      <p className={styles.lead}>
        Delete your account and the personal details linked to it, <strong>right now</strong>. This cannot be
        undone — there is no waiting period and no cancel.
      </p>

      {!open && (
        <button type="button" ref={openButtonRef} className={styles.dangerOutline} onClick={() => setOpen(true)}>
          Delete account…
        </button>
      )}

      {open && (
        <div className={styles.panel}>
          <div>
            <h3 ref={panelTitleRef} tabIndex={-1} className={styles.panelTitle}>
              What happens
            </h3>
            <ul className={styles.steps}>
              <li>Your personal details are deleted immediately and you are signed out everywhere.</li>
              <li>Past results, certificates and approved registrations stay, linked to “Deleted user”.</li>
              <li>This cannot be undone. If you are unsure, choose “Not now”.</li>
            </ul>
          </div>

          <div className={styles.lists}>
            <div>
              <h3 className={styles.listTitle}>We delete</h3>
              <ul className={styles.list}>
                {DELETED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={styles.listTitle}>We keep</h3>
              <ul className={styles.list}>
                {KEPT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className={styles.more}>
            Full details are in the{' '}
            <Link href="/privacy-policy" target="_blank" rel="noopener">
              Privacy Policy
            </Link>{' '}
            and on the{' '}
            <Link href="/account-deletion" target="_blank" rel="noopener">
              account deletion page
            </Link>
            .
          </p>

          <form className={styles.form} onSubmit={submit}>
            <label className={styles.check}>
              <input type="checkbox" checked={keepName} onChange={(e) => setKeepName(e.target.checked)} disabled={busy} />
              <span>
                Keep my name on past results and certificates
                <span className={styles.hint}>If you leave this unticked, your name becomes “Deleted user”.</span>
              </span>
            </label>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-password`}>
                Your password
              </label>
              <input
                id={`${ids}-password`}
                ref={passwordRef}
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                autoCapitalize="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // readOnly, not disabled: after a refusal focus goes straight back here,
                // and a disabled field cannot take focus until React has re-rendered.
                readOnly={busy}
                aria-describedby={`${ids}-password-hint`}
              />
              <span id={`${ids}-password-hint`} className={styles.hint}>
                We ask again to make sure it’s really you.
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${ids}-confirm`}>
                Type DELETE to confirm
              </label>
              <input
                id={`${ids}-confirm`}
                className={styles.input}
                type="text"
                name="confirm-word"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                readOnly={busy}
                aria-describedby={`${ids}-confirm-hint`}
              />
              <span id={`${ids}-confirm-hint`} className={styles.hint}>
                Deletion is immediate and cannot be undone.
              </span>
            </div>

            {error && (
              <p role="alert" className={styles.error}>
                {error.text}
                {error.support && <SupportLine />}
              </p>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.dangerSolid} disabled={busy || !ready}>
                {busy ? 'Deleting…' : 'Delete my account now'}
              </button>
              <button type="button" className={styles.quiet} onClick={closePanel} disabled={busy}>
                Not now
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
