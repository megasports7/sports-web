'use client';

/**
 * "Delete account" section for the bottom of every Profile page.
 *
 * Shown only when the server says deletion is enabled for THIS account (or one
 * is already scheduled), so for everyone else it renders nothing. The server
 * refuses anyone else regardless of what is on screen.
 *
 * Nothing is deleted when the form is sent: the account stays fully usable for
 * GRACE_DAYS and can be cancelled here or from the banner (contract §4.4).
 *
 * The two states are separate components on purpose: when the view flips
 * (scheduled, cancelled) React discards the form state, so a cancelled
 * deletion can never reopen with an old password or choice still in it. This
 * parent stays mounted and moves keyboard/screen-reader focus to the new
 * state's heading, because the button that was pressed is gone.
 */
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { GRACE_DAYS, formatScheduledDate, viewOf } from '@/lib/accountDeletion/model';
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
  // What this person just did here, so the new state can announce itself.
  const [changed, setChanged] = useState<'scheduled' | 'cancelled' | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryTitleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // A re-pull (idle timer, another tab) can flip the view without the person
  // doing anything here. That incoming state must never yank their focus, so
  // the move below only runs for a flip this section caused itself.
  const localFlip = useRef(false);

  useEffect(() => {
    if (changed !== null && localFlip.current) {
      localFlip.current = false;
      headingRef.current?.focus();
    }
  }, [changed, view]);

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
  if (view === 'pending' && status.scheduledFor !== null) {
    return (
      <PendingCard
        headingRef={headingRef}
        scheduledFor={status.scheduledFor}
        keepName={status.keepName}
        onCancelled={() => {
          localFlip.current = true;
          setChanged('cancelled');
        }}
      />
    );
  }
  if (view === 'request') {
    return (
      <RequestCard
        headingRef={headingRef}
        cancelledNotice={changed === 'cancelled'}
        onScheduled={() => {
          localFlip.current = true;
          setChanged('scheduled');
        }}
      />
    );
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

// ---- pending: a deletion is scheduled ----------------------------------------

function PendingCard({
  headingRef,
  scheduledFor,
  keepName,
  onCancelled,
}: {
  headingRef: HeadingRef;
  scheduledFor: string;
  keepName: boolean;
  onCancelled: () => void;
}) {
  const { cancel } = useAccountDeletion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  async function cancelDeletion() {
    setBusy(true);
    setError(null);
    const result = await cancel();
    // On success the status has already flipped and this card is gone.
    setBusy(false);
    if (result.ok) onCancelled();
    else setError(result.text);
  }

  return (
    <section className={`${styles.card} ${styles.pending}`} aria-labelledby={titleId}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
        Deletion scheduled
      </h2>
      <p className={styles.lead}>
        Your account will be deleted on <strong>{formatScheduledDate(scheduledFor)}</strong>. Until then you can keep
        using MegaSportsX as usual.
      </p>
      <p className={styles.lead}>
        {keepName
          ? 'Your name will stay on past results and certificates.'
          : 'Your name will be replaced with “Deleted user” on past results and certificates.'}
      </p>
      <button type="button" className={styles.quiet} onClick={cancelDeletion} disabled={busy}>
        {busy ? 'Cancelling…' : 'Cancel deletion'}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}

// ---- request: nothing scheduled, deletion enabled ------------------------------

function RequestCard({
  headingRef,
  cancelledNotice,
  onScheduled,
}: {
  headingRef: HeadingRef;
  cancelledNotice: boolean;
  onScheduled: () => void;
}) {
  const { request } = useAccountDeletion();
  const [open, setOpen] = useState(false);
  const [keepName, setKeepName] = useState(false);
  const [password, setPassword] = useState('');
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
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || password.length === 0) return;
    setBusy(true);
    setError(null);
    const result = await request({ password, keepName });
    // The password never outlives the request, whatever the answer.
    setPassword('');
    setBusy(false);
    if (result.ok) {
      // The status has flipped and this card is gone; the parent moves focus.
      onScheduled();
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
      {cancelledNotice && (
        <p role="status" className={styles.ok}>
          Deletion cancelled. Your account will stay as it is.
        </p>
      )}
      <p className={styles.lead}>
        Delete your account and the personal details linked to it. Nothing is deleted today: you have {GRACE_DAYS} days
        to change your mind.
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
              <li>Today nothing is deleted, and you can keep using MegaSportsX.</li>
              <li>For {GRACE_DAYS} days you can cancel here, or from the banner at the top of every page.</li>
              <li>After that, your personal details are deleted and you are signed out everywhere.</li>
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

            {error && (
              <p role="alert" className={styles.error}>
                {error.text}
                {error.support && <SupportLine />}
              </p>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.dangerSolid} disabled={busy || password.length === 0}>
                {busy ? 'Scheduling…' : 'Schedule deletion'}
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
