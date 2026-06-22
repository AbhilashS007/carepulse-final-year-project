/**
 * PatientTimeline — CarePulse Phase 1
 * -----------------------------------
 * Chronological event viewer shown in the Patient Detail panel.
 * Receives pre-built TimelineEvent[] from getPatientDetail().
 *
 * Event types and their visual treatment:
 *   created   → green  User icon       Patient registered
 *   diagnosed → indigo Stethoscope     Disease diagnosed (disease profile set)
 *   alert     → red/amber/blue Bell    Alert generated
 *   insight   → indigo Brain           AI Insight generated
 *   urination → blue/amber/red Droplets Sensor reading
 */

import { User, Stethoscope, Bell, Brain, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TimelineEvent } from '../../services/api';

// ── Event appearance config ───────────────────────────────────────────
type ColorKey = TimelineEvent['severityColor'];

const COLOR_STYLES: Record<ColorKey, { bg: string; text: string }> = {
  green:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700'    },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const TYPE_ICON: Record<TimelineEvent['type'], LucideIcon> = {
  created:   User,
  diagnosed: Stethoscope,
  alert:     Bell,
  insight:   Brain,
  urination: Droplets,
};

// ── Relative timestamp formatter ──────────────────────────────────────
function relativeTs(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Component ─────────────────────────────────────────────────────────
interface Props {
  events: TimelineEvent[];
}

export default function PatientTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-2">
        No timeline events available yet.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />

      <div className="space-y-3">
        {events.map((event) => {
          const Icon   = TYPE_ICON[event.type] ?? Droplets;
          const colors = COLOR_STYLES[event.severityColor] ?? COLOR_STYLES.gray;

          return (
            <div key={event.id} className="relative flex gap-3 items-start group">
              {/* Icon dot */}
              <div
                className={`
                  relative z-10 w-8 h-8 rounded-lg shrink-0
                  flex items-center justify-center
                  ${colors.bg}
                  transition-transform duration-150 group-hover:scale-110
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5 pb-1">
                <p className="text-xs font-semibold text-gray-800 leading-snug">
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  {relativeTs(event.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
