/**
 * events.ts — Events journal CRUD operations
 *
 * The journal stores life events keyed to a profile so that callers can
 * correlate them with Dasha periods and transits.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventCategory =
  | 'Career'
  | 'Relationship'
  | 'Health'
  | 'Finance'
  | 'Travel'
  | 'Education'
  | 'Other';

export type EventSentiment = -1 | 0 | 1;

export interface JournalEvent {
  id: string;
  profile_id: string;
  /** ISO 8601 date, e.g. '2003-06-15' */
  event_date: string;
  category: EventCategory;
  title: string;
  description: string | null;
  /** -1 = negative, 0 = neutral, 1 = positive */
  sentiment: EventSentiment | null;
  created_at: string;
}

export interface CreateEventInput {
  profile_id: string;
  event_date: string;
  category: EventCategory;
  title: string;
  description?: string | null;
  sentiment?: EventSentiment | null;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToEvent(row: Record<string, unknown>): JournalEvent {
  return {
    id: row['id'] as string,
    profile_id: row['profile_id'] as string,
    event_date: row['event_date'] as string,
    category: row['category'] as EventCategory,
    title: row['title'] as string,
    description: (row['description'] as string | null) ?? null,
    sentiment: (row['sentiment'] as EventSentiment | null) ?? null,
    created_at: row['created_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new journal event and returns the persisted record.
 * A UUID v4 is generated automatically.
 */
export function createEvent(data: CreateEventInput): JournalEvent {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare<[
    string, string, string, string, string,
    string | null, number | null, string,
  ]>(`
    INSERT INTO events_journal
      (id, profile_id, event_date, category, title,
       description, sentiment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.profile_id,
    data.event_date,
    data.category,
    data.title,
    data.description ?? null,
    data.sentiment ?? null,
    now,
  );

  const event = getEventById(id);
  if (event === undefined) {
    throw new Error(`Failed to retrieve event after insert (id=${id})`);
  }
  return event;
}

/**
 * Returns all events for a profile ordered by event_date ascending.
 */
export function getEventsForProfile(profileId: string): JournalEvent[] {
  const db = getDb();
  const rows = db
    .prepare<[string], Record<string, unknown>>(
      `SELECT * FROM events_journal
       WHERE profile_id = ?
       ORDER BY event_date ASC, created_at ASC`,
    )
    .all(profileId);

  return rows.map(rowToEvent);
}

/**
 * Returns events for a profile within an inclusive date range.
 *
 * @param profileId - Target profile UUID
 * @param from      - Start date, ISO 8601 format ('YYYY-MM-DD')
 * @param to        - End date, ISO 8601 format ('YYYY-MM-DD')
 */
export function getEventsInDateRange(
  profileId: string,
  from: string,
  to: string,
): JournalEvent[] {
  const db = getDb();
  const rows = db
    .prepare<[string, string, string], Record<string, unknown>>(
      `SELECT * FROM events_journal
       WHERE profile_id = ?
         AND event_date >= ?
         AND event_date <= ?
       ORDER BY event_date ASC, created_at ASC`,
    )
    .all(profileId, from, to);

  return rows.map(rowToEvent);
}

/**
 * Updates mutable fields on an existing event.
 * Throws if the event does not exist.
 */
export function updateEvent(
  id: string,
  data: Partial<Omit<CreateEventInput, 'profile_id'>>,
): JournalEvent {
  const db = getDb();

  const existing = getEventById(id);
  if (existing === undefined) {
    throw new Error(`Event not found (id=${id})`);
  }

  const allowed: Array<keyof Omit<CreateEventInput, 'profile_id'>> = [
    'event_date',
    'category',
    'title',
    'description',
    'sentiment',
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (key in data) {
      setClauses.push(`${key} = ?`);
      values.push(data[key] ?? null);
    }
  }

  if (setClauses.length === 0) {
    return existing;
  }

  values.push(id);

  db.prepare(
    `UPDATE events_journal SET ${setClauses.join(', ')} WHERE id = ?`,
  ).run(...values);

  const updated = getEventById(id);
  if (updated === undefined) {
    throw new Error(`Event disappeared after update (id=${id})`);
  }
  return updated;
}

/**
 * Permanently deletes an event.
 * No-ops if the event does not exist.
 */
export function deleteEvent(id: string): void {
  const db = getDb();
  db.prepare<[string]>('DELETE FROM events_journal WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEventById(id: string): JournalEvent | undefined {
  const db = getDb();
  const row = db
    .prepare<[string], Record<string, unknown>>(
      'SELECT * FROM events_journal WHERE id = ?',
    )
    .get(id);

  return row !== undefined ? rowToEvent(row) : undefined;
}
