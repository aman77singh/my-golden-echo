import React, { useState, useMemo } from "react";
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { IProgressPost } from "@/types/shared";

interface ProgressArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: IProgressPost[];
}

export function ProgressArchiveModal({
  open,
  onOpenChange,
  posts,
}: ProgressArchiveModalProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Distinct days posted across all history
  const distinctDaysCount = useMemo(() => {
    const dates = new Set(
      posts.map((p) => format(parseISO(p.createdAt.toString()), "yyyy-MM-dd"))
    );
    return dates.size;
  }, [posts]);

  // Calendar dates for current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart); // 0 (Sun) to 6 (Sat)

  // Map of date string -> posts on that date
  const postsByDate = useMemo(() => {
    const map = new Map<string, IProgressPost[]>();
    for (const post of posts) {
      const key = format(parseISO(post.createdAt.toString()), "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  // Posts on the selected day
  const selectedDayPosts = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return postsByDate.get(key) || [];
  }, [selectedDate, postsByDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto border-amber-500/20 bg-[#13121c]/95 text-foreground backdrop-blur-2xl shadow-2xl p-6 sm:rounded-3xl">
        <DialogTitle className="flex items-center gap-2.5 font-serif text-xl font-semibold text-amber-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <span>Progress Archive</span>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Every day you showed up. No streak pressure—just genuine pride in showing up together.
        </DialogDescription>

        {/* Total Days Posted Stat Banner */}
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Days Shared</span>
          </div>
          <div className="mt-1 font-serif text-3xl font-bold text-foreground">
            {distinctDaysCount} <span className="text-base font-normal text-muted-foreground">Days</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Consistency is built on grace, not perfection 🌱
          </p>
        </div>

        {/* Month Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-serif text-sm font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="mt-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {/* Blank offset cells */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-10" />
            ))}

            {/* Day cells */}
            {daysInMonth.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const hasPosts = postsByDate.has(dateKey);
              const postList = postsByDate.get(dateKey) || [];
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentDay = isSameDay(day, new Date());

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-xs transition-all ${
                    isSelected
                      ? "border border-amber-400 bg-amber-400/20 font-bold text-amber-200 shadow-sm"
                      : isCurrentDay
                      ? "border border-white/20 bg-white/10 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {hasPosts && (
                    <div className="mt-0.5 flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                      {postList.length > 1 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Posts Detail */}
        {selectedDate && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {selectedDayPosts.length}{" "}
                {selectedDayPosts.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {selectedDayPosts.length === 0 ? (
              <p className="mt-3 text-center text-xs italic text-muted-foreground/60 py-3">
                No progress logged on this day.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {selectedDayPosts.map((post) => (
                  <div
                    key={post._id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                        {post.minutes && <span>⏱️ {post.minutes}m</span>}
                        {post.countAdded && <span>🎯 +{post.countAdded}</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-foreground/90 font-sans leading-relaxed">
                      {post.body}
                    </p>
                    {post.struggled && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Pushed through struggle
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
