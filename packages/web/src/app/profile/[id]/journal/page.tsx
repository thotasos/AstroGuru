'use client';

import { use, useState } from 'react';
import { Plus, Pencil, Trash2, BookOpen, AlertCircle, Calendar, X, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEvents, useDashas } from '@/lib/hooks';
import { createEvent, updateEvent, deleteEvent, type LifeEvent } from '@/lib/api';
import { formatDateTime, formatDate } from '@/lib/utils';
import { PLANET_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface JournalPageProps {
  params: Promise<{ id: string }>;
}

const EVENT_CATEGORIES = [
  'Career', 'Relationship', 'Health', 'Education',
  'Travel', 'Finance', 'Family', 'Spiritual', 'Other',
];

// ============================================================
// Get active dasha for a date
// ============================================================

function getDashaForDate(
  date: string,
  mahadashas: { planet: number; startDate: string; endDate: string; antardashas: { planet: number; startDate: string; endDate: string }[] }[],
) {
  const d = new Date(date).getTime();
  const md = mahadashas.find(
    (m) => new Date(m.startDate).getTime() <= d && new Date(m.endDate).getTime() > d,
  );
  if (!md) return null;
  const ad = md.antardashas.find(
    (a) => new Date(a.startDate).getTime() <= d && new Date(a.endDate).getTime() > d,
  );
  return { mahadasha: md.planet, antardasha: ad?.planet };
}

// ============================================================
// Event form modal
// ============================================================

interface EventFormProps {
  profileId: string;
  event?: LifeEvent;
  onSave: () => void;
  onCancel: () => void;
}

function EventForm({ profileId, event, onSave, onCancel }: EventFormProps) {
  const [date, setDate] = useState(event?.date?.slice(0, 10) ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [category, setCategory] = useState(event?.category ?? 'Other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title) {
      setError('Date and title are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (event) {
        await updateEvent(event.id, { date, title, description, category });
      } else {
        await createEvent({ profileId, date, title, description, category });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card padding="lg" className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-stone-50">
            {event ? 'Edit Event' : 'Add Life Event'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Started new job at Google"
              className="input-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer',
                    category === cat
                      ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                      : 'border-cosmic-border text-stone-400 hover:border-stone-500',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Description
              <span className="text-stone-600 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Notes about this event..."
              className="input-base resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {event ? 'Save Changes' : 'Add Event'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================================================
// Event row
// ============================================================

function EventRow({
  event,
  dashaInfo,
  onEdit,
  onDelete,
}: {
  event: LifeEvent;
  dashaInfo: { mahadasha: number; antardasha?: number } | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-cosmic-border/50 hover:bg-cosmic-elevated/50 transition-colors duration-100 group">
      <td className="py-3 px-4 text-sm text-stone-300 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          {formatDate(event.date)}
        </div>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-stone-100">{event.title}</p>
        {event.description && (
          <p className="text-xs text-stone-500 mt-0.5 truncate max-w-xs">{event.description}</p>
        )}
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <Badge variant="default" size="sm">{event.category}</Badge>
      </td>
      <td className="py-3 px-4">
        {dashaInfo ? (
          <div className="text-xs">
            <span className="text-stone-300 font-medium">
              {PLANET_NAMES[dashaInfo.mahadasha] ?? '?'} MD
            </span>
            {dashaInfo.antardasha !== undefined && (
              <span className="text-stone-500">
                {' / '}{PLANET_NAMES[dashaInfo.antardasha] ?? '?'} AD
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-stone-600">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cosmic-elevated text-stone-500 hover:text-stone-200 transition-all duration-150 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-stone-500 hover:text-red-400 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// Page
// ============================================================

export default function JournalPage({ params }: JournalPageProps) {
  const { id } = use(params);
  const { events, isLoading, error, mutate } = useEvents(id);
  const { dashas } = useDashas(id);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | undefined>();

  const handleSave = () => {
    void mutate();
    setShowForm(false);
    setEditingEvent(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-stone-500">{error instanceof Error ? error.message : 'Failed to load events.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-50 mb-1">Life Events Journal</h2>
          <p className="text-sm text-stone-400">
            Track significant events alongside your active dasha periods.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowForm(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-stone-700 mb-4" />
          <h3 className="text-base font-semibold text-stone-400 mb-2">No events yet</h3>
          <p className="text-stone-600 text-sm mb-6 max-w-sm">
            Add life events to see which dasha periods were active during significant moments.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add First Event
          </Button>
        </div>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-cosmic-border">
                  {['Date', 'Event', 'Category', 'Dasha Period', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const dashaInfo = dashas?.mahadashas
                    ? getDashaForDate(event.date, dashas.mahadashas)
                    : null;

                  return (
                    <EventRow
                      key={event.id}
                      event={event}
                      dashaInfo={dashaInfo}
                      onEdit={() => {
                        setEditingEvent(event);
                        setShowForm(true);
                      }}
                      onDelete={() => void mutate()}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form modal */}
      {showForm && (
        <EventForm
          profileId={id}
          event={editingEvent}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(undefined);
          }}
        />
      )}
    </div>
  );
}
