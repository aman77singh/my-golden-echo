import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  parseISO,
} from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiFetch, getStoredUser } from "@/lib/api";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Zap, Sparkles } from "lucide-react";

interface MoodEntry {
  _id: string;
  coupleId: string;
  userId: string;
  emoji: string;
  energy: number;
  note?: string;
  createdAt: string;
}

interface MoodHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName?: string;
}

export function MoodHistoryModal({
  open,
  onOpenChange,
  partnerName = "Partner",
}: MoodHistoryModalProps) {
  const currentUser = getStoredUser();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fromDateStr = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const toDateStr = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data, isLoading } = useQuery<{ moods: MoodEntry[] }>({
    queryKey: ["moods", "history", fromDateStr, toDateStr],
    queryFn: () => apiFetch(`/moods?from=${fromDateStr}&to=${toDateStr}`),
    enabled: open,
  });

  const moods = data?.moods || [];

  // Group moods by date string (yyyy-MM-dd)
  const moodsByDay = useMemo(() => {
    const map = new Map<string, { mine?: MoodEntry; partner?: MoodEntry }>();
    for (const mood of moods) {
      const dateKey = format(parseISO(mood.createdAt), "yyyy-MM-dd");
      const current = map.get(dateKey) || {};
      const isMine = currentUser && mood.userId === currentUser.id;
      if (isMine) {
        current.mine = mood;
      } else {
        current.partner = mood;
      }
      map.set(dateKey, current);
    }
    return map;
  }, [moods, currentUser]);

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const startDayOfWeek = getDay(startOfMonth(currentMonth)); // 0 = Sun
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayMoods = moodsByDay.get(selectedDateKey);

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-bold text-foreground">
                  Mood Journey
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Our daily rhythm, side by side
                </DialogDescription>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E5A962] shadow-[0_0_8px_rgba(229,169,98,0.6)]" />
                <span>You</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E07A5F] shadow-[0_0_8px_rgba(224,122,95,0.6)]" />
                <span>{partnerName}</span>
              </span>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-95 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-sm font-bold text-foreground tracking-wide">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground active:scale-95 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar Table */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 text-center mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <span
                  key={day}
                  className="text-[11px] font-semibold text-muted-foreground/70"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1 py-6">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 w-full rounded-xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty leading offset */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-full" />
                ))}

                {/* Month Days */}
                {daysInMonth.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const entry = moodsByDay.get(dateKey);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all ${
                        isSelected
                          ? "bg-accent/25 border border-accent font-bold text-foreground shadow-sm"
                          : isToday
                          ? "border border-white/20 bg-white/5 text-accent"
                          : "text-foreground/80 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-xs leading-none">{format(day, "d")}</span>

                      {/* Colored Dots */}
                      <div className="mt-1 flex items-center justify-center gap-1">
                        {entry?.mine && (
                          <span
                            title="Your mood logged"
                            className="h-1.5 w-1.5 rounded-full bg-[#E5A962] shadow-[0_0_6px_rgba(229,169,98,0.8)]"
                          />
                        )}
                        {entry?.partner && (
                          <span
                            title={`${partnerName}'s mood logged`}
                            className="h-1.5 w-1.5 rounded-full bg-[#E07A5F] shadow-[0_0_6px_rgba(224,122,95,0.8)]"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Date Details */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="font-display text-xs font-semibold text-foreground">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Day Details
              </span>
            </div>

            {!selectedDayMoods?.mine && !selectedDayMoods?.partner ? (
              <div className="py-6 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1.5" />
                <p className="text-xs text-muted-foreground">
                  No mood entries recorded on this day.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {/* My Mood on selected day */}
                {selectedDayMoods.mine && (
                  <div className="flex items-start gap-3 rounded-xl border border-[#E5A962]/20 bg-[#E5A962]/5 p-3">
                    <span className="text-2xl">{selectedDayMoods.mine.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E5A962]">You</span>
                        <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-foreground/80">
                          <Zap className="h-3 w-3 text-accent" />
                          <span>{selectedDayMoods.mine.energy}/5 Energy</span>
                        </span>
                      </div>
                      {selectedDayMoods.mine.note ? (
                        <p className="mt-1 font-serif italic text-xs text-foreground/90 leading-relaxed">
                          "{selectedDayMoods.mine.note}"
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground italic">
                          No note attached
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Partner Mood on selected day */}
                {selectedDayMoods.partner && (
                  <div className="flex items-start gap-3 rounded-xl border border-[#E07A5F]/20 bg-[#E07A5F]/5 p-3">
                    <span className="text-2xl">{selectedDayMoods.partner.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E07A5F]">{partnerName}</span>
                        <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-foreground/80">
                          <Zap className="h-3 w-3 text-[#E07A5F]" />
                          <span>{selectedDayMoods.partner.energy}/5 Energy</span>
                        </span>
                      </div>
                      {selectedDayMoods.partner.note ? (
                        <p className="mt-1 font-serif italic text-xs text-foreground/90 leading-relaxed">
                          "{selectedDayMoods.partner.note}"
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground italic">
                          No note attached
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
