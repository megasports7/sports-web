import type { Registration } from '@/lib/types';

export type WeightRegistrationGroup = {
  key: string;
  ageCategory: string;
  weightCategory: string;
  registrations: Registration[];
};

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function dateOnly(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'event';
}

/** A TANDING class is scoped to its age category: Class A can represent a
 * different kilogram range for Senior and Pre-Junior players. */
export function getWeightRegistrationGroups(registrations: Registration[]): WeightRegistrationGroup[] {
  const groups = new Map<string, WeightRegistrationGroup>();

  for (const registration of registrations) {
    if (registration.event_category !== 'TANDING' || !registration.weight_category) continue;

    const ageCategory = registration.age_category?.trim() || 'Unspecified age';
    const weightCategory = registration.weight_category.trim();
    const key = `${ageCategory}\u0000${weightCategory}`;
    const group = groups.get(key) ?? { key, ageCategory, weightCategory, registrations: [] };
    group.registrations.push(registration);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) =>
    a.ageCategory.localeCompare(b.ageCategory) || a.weightCategory.localeCompare(b.weightCategory),
  );
}

function buildWorksheetRows(eventName: string, group: WeightRegistrationGroup) {
  return group.registrations.map((registration, index) => ({
    'S. No.': index + 1,
    'Player ID': text(registration.player_id ?? registration.player_uuid),
    Name: text(registration.player_name),
    'Date of Birth': dateOnly(registration.player_dob),
    Gender: text(registration.player_gender),
    District: text(registration.player_district),
    Phone: text(registration.phone),
    Email: text(registration.email),
    Event: eventName,
    Competition: 'TANDING',
    'Age Category': group.ageCategory,
    'Weight Category': group.weightCategory,
    'Registration Status': registration.status || 'pending',
    Attendance: registration.attendance_status || 'absent',
    'Registration Date': dateOnly(registration.created_at),
  }));
}

function buildAllRegistrationRows(eventName: string, registrations: Registration[]) {
  return registrations.map((registration, index) => ({
    'S. No.': index + 1,
    'Player ID': text(registration.player_id ?? registration.player_uuid),
    Name: text(registration.player_name),
    'Date of Birth': dateOnly(registration.player_dob),
    Gender: text(registration.player_gender),
    District: text(registration.player_district),
    Phone: text(registration.phone),
    Email: text(registration.email),
    Event: eventName,
    Competition: text(registration.event_category),
    'Age Category': text(registration.age_category),
    'Weight Category': text(registration.weight_category),
    'SENI Category': text(registration.seni_category),
    'Registration Status': registration.status || 'pending',
    Attendance: registration.attendance_status || 'absent',
    'Registration Date': dateOnly(registration.created_at),
  }));
}

/** Builds and downloads one local .xlsx workbook. The import is intentionally
 * dynamic so this browser-only library is not added to the initial route load. */
export async function downloadWeightGroupWorkbook(eventName: string, group: WeightRegistrationGroup): Promise<void> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(buildWorksheetRows(eventName, group));
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 16 }, { wch: 32 }, { wch: 30 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = [
    safeFilePart(eventName),
    'TANDING',
    safeFilePart(group.ageCategory),
    safeFilePart(group.weightCategory),
  ].join('_') + '.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Builds one local workbook for all registrations in an event, preserving
 * the separate TANDING and SENI category fields on every row. */
export async function downloadAllRegistrationsWorkbook(
  eventName: string,
  registrations: Registration[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(buildAllRegistrationRows(eventName, registrations));
  worksheet['!cols'] = [
    { wch: 8 }, { wch: 15 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 16 }, { wch: 32 }, { wch: 30 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${safeFilePart(eventName)}_all-registrations.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
