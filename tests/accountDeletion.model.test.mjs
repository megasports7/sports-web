// Run with: npm test   (Node's built-in runner; no extra dependency).
//
// These cover the pure decisions behind the account-deletion screens, because
// they are the part that must fail CLOSED: the Delete section may only appear
// when the server says deletion is enabled for this account, and every server
// refusal must reach the person as an instruction they can act on.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStatus,
  viewOf,
  failureFrom,
  describeFailure,
  formatScheduledDate,
} from '../src/lib/accountDeletion/model.ts';

const ROW = { enabled: true, scheduled_for: null, keep_name: null };

// ---- parseStatus: the raw my_account_deletion() result -> DeletionStatus | null

test('parseStatus reads the one-row array PostgREST returns', () => {
  assert.deepEqual(parseStatus([ROW]), { enabled: true, scheduledFor: null, keepName: false });
});

test('parseStatus also accepts a bare row object', () => {
  assert.deepEqual(parseStatus(ROW), { enabled: true, scheduledFor: null, keepName: false });
});

test('parseStatus keeps the scheduled date and the keep-name choice', () => {
  const row = { enabled: true, scheduled_for: '2026-10-19T10:00:00+00:00', keep_name: true };
  assert.deepEqual(parseStatus([row]), {
    enabled: true,
    scheduledFor: '2026-10-19T10:00:00+00:00',
    keepName: true,
  });
});

test('parseStatus reports enabled=false as false, not as unknown', () => {
  assert.deepEqual(parseStatus([{ ...ROW, enabled: false }]), {
    enabled: false,
    scheduledFor: null,
    keepName: false,
  });
});

test('parseStatus treats a non-boolean "enabled" as unknown (fail closed)', () => {
  for (const enabled of ['true', 'yes', 1, 0, null, undefined]) {
    assert.equal(parseStatus([{ ...ROW, enabled }]), null, `enabled=${String(enabled)}`);
  }
});

test('parseStatus returns null for empty or non-row input', () => {
  for (const raw of [null, undefined, [], [null], 'x', 42, true]) {
    assert.equal(parseStatus(raw), null, JSON.stringify(raw));
  }
});

test('parseStatus returns null when scheduled_for is not a usable date string', () => {
  for (const scheduled_for of [12345, true, {}, 'not a date', '']) {
    assert.equal(parseStatus([{ ...ROW, scheduled_for }]), null, JSON.stringify(scheduled_for));
  }
});

test('parseStatus returns null when keep_name is neither a boolean nor null', () => {
  for (const keep_name of ['true', 1, {}]) {
    assert.equal(parseStatus([{ ...ROW, keep_name }]), null, JSON.stringify(keep_name));
  }
});

// ---- viewOf: which screen state to show

const status = (over) => ({ enabled: true, scheduledFor: null, keepName: false, ...over });

test('viewOf hides everything while the status is unknown', () => {
  assert.equal(viewOf(null), 'hidden');
});

test('viewOf hides the section when deletion is not enabled for the account', () => {
  assert.equal(viewOf(status({ enabled: false })), 'hidden');
});

test('viewOf offers the request form when enabled and nothing is scheduled', () => {
  assert.equal(viewOf(status({})), 'request');
});

test('viewOf shows the pending state when a deletion is scheduled', () => {
  assert.equal(viewOf(status({ scheduledFor: '2026-10-19T10:00:00+00:00' })), 'pending');
});

test('viewOf keeps Cancel reachable for a scheduled deletion even if the account is no longer enabled', () => {
  // e.g. the kill switch is pulled after someone already queued a request
  assert.equal(viewOf(status({ enabled: false, scheduledFor: '2026-10-19T10:00:00+00:00' })), 'pending');
});

// ---- failureFrom: what delete-my-account answered -> { status, reason }

test('failureFrom reads the reason from the function envelope', () => {
  const body = { success: false, data: { reason: 'owns_events' }, message: 'whatever the server wrote' };
  assert.deepEqual(failureFrom(409, body), { status: 409, reason: 'owns_events' });
});

test('failureFrom gives no reason for a platform or malformed body', () => {
  const bodies = [null, undefined, 'x', {}, { code: 401, message: 'Invalid JWT' }, { data: null }, { data: { reason: 5 } }];
  for (const body of bodies) {
    assert.equal(failureFrom(401, body).reason, null, JSON.stringify(body));
  }
});

test('failureFrom keeps a null status when no response arrived', () => {
  assert.deepEqual(failureFrom(null, null), { status: null, reason: null });
});

// ---- describeFailure: the message and whether to point at support

const text = (f) => describeFailure(f).text;

test('describeFailure tells the person to check the password on a wrong password', () => {
  assert.match(text({ status: 403, reason: 'wrong_password' }), /password is not correct/i);
});

test('describeFailure gives each blocker its own instruction', () => {
  assert.match(text({ status: 409, reason: 'owns_events' }), /handover/i);
  assert.match(text({ status: 409, reason: 'owns_batches' }), /handover/i);
  assert.match(text({ status: 409, reason: 'owns_attendance_lists' }), /handover/i);
  assert.match(text({ status: 409, reason: 'owns_events' }), /support/i);
  assert.match(text({ status: 409, reason: 'secretary_handover' }), /administrator/i);
  assert.match(text({ status: 409, reason: 'last_admin' }), /another administrator/i);
  assert.match(text({ status: 409, reason: 'admin_accounts' }), /Administrator accounts/i);
  assert.match(text({ status: 409, reason: 'suspended' }), /suspended/i);
});

test('describeFailure sends blocked and unexplained failures to support', () => {
  const reasons = ['owns_events', 'owns_batches', 'owns_attendance_lists', 'secretary_handover', 'admin_accounts', 'suspended', 'no_profile', 'no_email'];
  for (const reason of reasons) {
    assert.equal(describeFailure({ status: 409, reason }).support, true, reason);
  }
  assert.equal(describeFailure({ status: 500, reason: null }).support, true);
});

test('describeFailure does not send support for things the person can fix themselves', () => {
  const selfFixable = [
    { status: 403, reason: 'wrong_password' },
    { status: 429, reason: null },
    { status: 401, reason: null },
    { status: null, reason: null },
    { status: 409, reason: 'last_admin' },
    { status: 409, reason: 'already_scheduled' },
  ];
  for (const f of selfFixable) {
    assert.equal(describeFailure(f).support, false, JSON.stringify(f));
  }
});

test('describeFailure falls back by HTTP status when there is no reason', () => {
  assert.match(text({ status: 401, reason: null }), /sign in again/i);
  assert.match(text({ status: 429, reason: null }), /15 minutes/);
  assert.match(text({ status: 502, reason: null }), /password/i);
  assert.match(text({ status: null, reason: null }), /connection/i);
  assert.match(text({ status: 500, reason: null }), /went wrong/i);
});

test('describeFailure never repeats an unknown server reason to the person', () => {
  const t = text({ status: 418, reason: 'internal_code_123' });
  assert.ok(!t.includes('internal_code_123'), t);
  assert.match(t, /went wrong/i);
});

test('describeFailure still uses the status when the reason is unknown', () => {
  assert.match(text({ status: 429, reason: 'something_new' }), /15 minutes/);
});

test('describeFailure treats a prototype key as an unknown reason, not as a lookup', () => {
  for (const reason of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const described = describeFailure({ status: 500, reason });
    assert.equal(typeof described.text, 'string', reason);
    assert.match(described.text, /went wrong/i, reason);
  }
});

// ---- formatScheduledDate

test('formatScheduledDate writes the calendar day in the requested time zone', () => {
  assert.equal(formatScheduledDate('2026-10-19T20:00:00Z', 'UTC'), '19 October 2026');
  assert.equal(formatScheduledDate('2026-10-19T20:00:00Z', 'Asia/Kolkata'), '20 October 2026');
});
