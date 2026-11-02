/**
 * Single source of truth for the facts both public legal pages state.
 * Google Play checks that the privacy policy and account-deletion page name
 * the app and the developer exactly as on the store listing, so keep these in
 * sync with Play Console > Store presence > Main store listing.
 */
export const LEGAL = {
  appName: 'Mega Sports X',
  appPackage: 'com.iiitihas.megasportsx',
  // TODO(confirm before publishing): must match the developer name on the Play listing.
  developerName: '[DEVELOPER NAME — CONFIRM]',
  contactEmail: 'arkotmitesh2@gmail.com',
  effectiveDate: '3 October 2026',
  // TODO(confirm): response window promised for manual deletion requests.
  deletionDays: 30,
} as const;
