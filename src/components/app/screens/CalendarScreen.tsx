import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Sparkles,
  MapPin,
  Heart,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  date: string;
  category?: string;
  remindDaysBefore?: number;
  isCountdown?: boolean;
  isVirtual?: boolean;
}

export function CalendarScreen() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [category, setCategory] = React.useState("anniversary");
  const [isCountdown, setIsCountdown] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date());

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendarEvents"],
    queryFn: async () => {
      const res = await apiClient.get<CalendarEvent[]>("/events?includeCycle=true");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<CalendarEvent>) => {
      const res = await apiClient.post<CalendarEvent>("/events", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setEventDate("");
      triggerHaptic("success");
      toast.success("Event added to our calendar ✨");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create event.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      triggerHaptic("medium");
      toast.info("Event removed.");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      toast.error("Please enter a title and date.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      date: new Date(eventDate).toISOString(),
      category,
      isCountdown,
    });
  };

  // Filter countdown events in the future
  const now = new Date();
  const countdowns = events
    .filter((e) => e.isCountdown && new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatCountdown = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - now.getTime();
    if (diff <= 0) return "Today!";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h left`;
  };

  return (
    <div className="space-y-4 pb-24 text-foreground">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Shared Calendar
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Our milestones, dates & cycle predictions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            setCreateOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition-transform active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Countdown Cards Hero Carousel */}
      {countdowns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Upcoming Countdowns</span>
          </h3>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {countdowns.map((cd) => (
              <motion.div
                key={cd._id}
                whileHover={{ scale: 1.02 }}
                className="min-w-[240px] snap-start rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 p-3.5 shadow-panel relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-accent/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                    {cd.category || "Milestone"}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#E5A962]">
                    {formatCountdown(cd.date)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground line-clamp-1">{cd.title}</h4>
                {cd.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {cd.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/80 mt-2 font-mono">
                  {new Date(cd.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-panel space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Events & Rhythms
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading calendar...</div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No events scheduled yet. Add your next trip or anniversary!
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((evt) => {
              const isVirtual = evt.isVirtual;
              return (
                <div
                  key={evt._id}
                  className={`flex items-start justify-between rounded-xl border p-3 transition-colors ${
                    isVirtual
                      ? "border-pink-500/30 bg-pink-500/10"
                      : "border-border/60 bg-background/50 hover:border-accent/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{evt.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-medium uppercase ${
                          isVirtual
                            ? "bg-pink-500/20 text-pink-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {evt.category || "Event"}
                      </span>
                    </div>
                    {evt.description && (
                      <p className="text-[11px] text-muted-foreground">{evt.description}</p>
                    )}
                    <p className="text-[10px] text-accent font-mono font-semibold">
                      📅{" "}
                      {new Date(evt.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {!isVirtual && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(evt._id)}
                      className="text-muted-foreground/60 hover:text-red-500 p-1"
                      aria-label="Delete Event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-border/70 bg-card/95 text-foreground backdrop-blur-2xl sm:max-w-md shadow-panel">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Add Event or Countdown
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-serif italic">
              Set reminders and live countdown cards together.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground">Event Title</label>
              <input
                type="text"
                placeholder="e.g. Weekend Getaway, Anniversary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="anniversary" className="bg-card">Anniversary</option>
                <option value="date" className="bg-card">Date Night</option>
                <option value="trip" className="bg-card">Trip / Vacation</option>
                <option value="milestone" className="bg-card">Goal Milestone</option>
                <option value="custom" className="bg-card">Custom Event</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
              <textarea
                placeholder="Pack sweaters, surprise reservations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isCountdown"
                checked={isCountdown}
                onChange={(e) => setIsCountdown(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="isCountdown" className="text-xs text-foreground">
                Display as live countdown card
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {createMutation.isPending ? "Saving..." : "Save Event"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
