/**
 * Web side of account deletion. Contract: sports-mobile-main/docs/
 * ACCOUNT_DELETION_CONTRACT.md (§4.2-§4.5).
 *
 * Three calls, all acting on the SIGNED-IN user's own account and nothing else:
 *   - status:  RPC public.my_account_deletion()          (enabled / scheduled_for / keep_name)
 *   - cancel:  RPC public.cancel_my_account_deletion()   (never gated; works for any pending request)
 *   - request: Edge Function delete-my-account           (re-checks the CURRENT password server-side)
 *
 * The browser decides nothing about who may delete: `enabled`, the blockers, the
 * password check and the 14-day grace period all live in the database and the
 * function. This file only carries the request and turns the answer into
 * something the screens can draw (decisions are in ../accountDeletion/model.ts).
 *
 * The password goes only to delete-my-account over HTTPS. It is never stored,
 * logged or echoed here.
 */
import { createClient } from '../supabase/client';
import {
  describeFailure,
  failureFrom,
  parseStatus,
  type DeletionStatus,
  type RequestFailure,
} from '../accountDeletion/model';

export type CancelResult = { ok: true } | { ok: false; text: string };

export type RequestResult =
  | { ok: true }
  | { ok: false; text: string; support: boolean; reason: string | null };

/** supabase-js reports a network failure as status 0; model.ts wants null for "no answer". */
function httpStatus(status: number | null | undefined): number | null {
  return typeof status === 'number' && status > 0 ? status : null;
}

/**
 * functions.invoke() throws FunctionsHttpError / FunctionsRelayError with the raw
 * Response in `context` for any non-2xx answer, and FunctionsFetchError (no
 * Response) when the network failed. The reason code lives in the response body.
 */
async function readFailure(error: unknown): Promise<RequestFailure> {
  const context = (error as { context?: unknown } | null)?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    let body: unknown = null;
    try {
      body = await context.json();
    } catch {
      // Not JSON (for example a gateway error page): the status alone decides.
    }
    return failureFrom(context.status, body);
  }
  return failureFrom(null, null);
}

export const accountDeletionApi = {
  /** null means "could not tell": the screens then show nothing (fail closed). */
  async status(): Promise<DeletionStatus | null> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('my_account_deletion');
    if (error) return null;
    return parseStatus(data);
  },

  async cancel(): Promise<CancelResult> {
    const supabase = createClient();
    const { error, status } = await supabase.rpc('cancel_my_account_deletion');
    if (error) {
      return { ok: false, text: describeFailure({ status: httpStatus(status), reason: null }).text };
    }
    // The RPC answers false when nothing was pending (already cancelled elsewhere):
    // that is the state the person wanted, so it counts as done.
    return { ok: true };
  },

  async request(input: { password: string; keepName: boolean }): Promise<RequestResult> {
    const supabase = createClient();
    const { error } = await supabase.functions.invoke('delete-my-account', {
      body: { password: input.password, keep_name: input.keepName },
    });
    if (!error) return { ok: true };

    const failure = await readFailure(error);
    const { text, support } = describeFailure(failure);
    return { ok: false, text, support, reason: failure.reason };
  },
};
