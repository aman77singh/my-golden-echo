import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Printer, FileText, Heart, Shield, Calendar, Download } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ICycle, ISymptomLog } from "@/types/shared";
import { calculateCycleStats, ESTIMATES_DISCLAIMER } from "@/app/cycle";

interface DoctorReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: ICycle[];
  symptomLogs: ISymptomLog[];
  userName?: string;
}

export function DoctorReportModal({
  open,
  onOpenChange,
  cycles,
  symptomLogs,
  userName = "Patient",
}: DoctorReportModalProps) {
  const stats = calculateCycleStats(cycles);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/70 bg-card/95 text-foreground backdrop-blur-2xl shadow-panel p-6 sm:rounded-3xl print:border-none print:bg-white print:text-black print:max-h-none print:shadow-none">
        {/* Modal Header & Print CTA */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-rose-600">
            <FileText className="h-5 w-5" />
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              Doctor Visit Cycle History Report
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
        <DialogDescription className="sr-only">
          Medical summary of recorded menstrual cycles and symptoms for healthcare visits.
        </DialogDescription>

        {/* Printable Document Body */}
        <div className="mt-4 space-y-6 text-foreground print:text-black">
          {/* Document Header */}
          <div className="rounded-2xl border border-border/70 bg-background/50 p-4 print:border-gray-300 print:bg-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold tracking-tight text-foreground print:text-black">
                  Menstrual & Symptom Health Record
                </h3>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  Individual Health Summary for Doctor / Gynecologist Review
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground print:text-gray-600">
                <p>Generated: {format(new Date(), "MMMM d, yyyy")}</p>
                <p className="font-semibold text-foreground print:text-black">{userName}</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-3 text-center print:border-gray-200">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">
                  Avg. Cycle Length
                </span>
                <p className="font-serif text-lg font-bold text-rose-600 print:text-rose-700">
                  {stats.avgCycleLength} Days
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">
                  Regularity (± Std Dev)
                </span>
                <p className="font-serif text-lg font-bold text-amber-600 print:text-amber-700">
                  ±{stats.stdDev} Days
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider print:text-gray-500">
                  Logged Cycles
                </span>
                <p className="font-serif text-lg font-bold text-foreground print:text-black">
                  {cycles.length} Total
                </p>
              </div>
            </div>
          </div>

          {/* Cycles Table */}
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground mb-2 flex items-center gap-1.5 print:text-black">
              <Calendar className="h-4 w-4 text-rose-600" />
              <span>Recorded Menstrual Cycles</span>
            </h4>

            {cycles.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No cycle data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/60 print:border-gray-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground print:bg-gray-100 print:text-gray-700">
                    <tr>
                      <th className="px-3 py-2">Start Date</th>
                      <th className="px-3 py-2">End Date</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Flow</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 print:divide-gray-200">
                    {cycles.map((c, idx) => {
                      const start = new Date(c.startDate);
                      const end = c.endDate ? new Date(c.endDate) : null;
                      const duration = end ? differenceInDays(end, start) + 1 : "Ongoing";

                      return (
                        <tr key={c._id || idx} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium text-foreground print:text-black">
                            {format(start, "MMM d, yyyy")}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground print:text-gray-700">
                            {end ? format(end, "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground print:text-gray-700">
                            {duration} {typeof duration === "number" ? "days" : ""}
                          </td>
                          <td className="px-3 py-2 capitalize text-rose-700 print:text-rose-800">
                            {c.flow || "Normal"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground print:text-gray-600 truncate max-w-[150px]">
                            {c.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Symptoms Log Table */}
          <div>
            <h4 className="font-serif text-sm font-bold text-foreground mb-2 print:text-black">
              Recent Logged Symptoms & Pain Levels
            </h4>

            {symptomLogs.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No symptom logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/60 print:border-gray-300 max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground print:bg-gray-100 print:text-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Symptoms Reported</th>
                      <th className="px-3 py-2">Pain (0-10)</th>
                      <th className="px-3 py-2">Mood</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 print:divide-gray-200">
                    {symptomLogs.slice(-15).map((log, idx) => (
                      <tr key={log._id || idx} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground print:text-black">
                          {log.date}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground print:text-gray-700">
                          {log.symptoms && log.symptoms.length > 0
                            ? log.symptoms.join(", ")
                            : "None"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground print:text-gray-700">
                          {log.pain !== undefined ? `${log.pain}/10` : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground print:text-gray-700">
                          {log.mood || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Disclaimer Footer */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-3 text-[11px] text-muted-foreground print:border-gray-200 print:text-gray-600">
            <p className="font-semibold text-foreground/80 print:text-black">Notice for Healthcare Provider:</p>
            <p className="mt-0.5">
              This summary is self-reported by the patient via the "Our Space" wellness tracker.
              {ESTIMATES_DISCLAIMER}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
