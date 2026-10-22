import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Mic, Image as ImageIcon, Plus, Minus, X, Loader2, Square, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { compressImage, uploadImage, uploadVoiceNote } from "@/lib/mediaUpload";
import { VoiceNotePlayer } from "../chat/VoiceNotePlayer";

interface GoalOption {
  _id: string;
  title: string;
  category: string;
  targetCount?: number;
  currentCount?: number;
  unit?: string;
}

interface NewPostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitPost: (data: {
    category: string;
    body: string;
    goalId?: string;
    countAdded?: number;
    minutes?: number;
    struggled?: boolean;
    mediaUrls?: string[];
    voiceUrl?: string;
  }) => Promise<void>;
  activeGoals: GoalOption[];
}

const CATEGORIES = ["Study", "Work", "Fitness", "Skill", "Personal"];

export function NewPostSheet({
  open,
  onOpenChange,
  onSubmitPost,
  activeGoals,
}: NewPostSheetProps) {
  const [category, setCategory] = useState("Study");
  const [body, setBody] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [countAdded, setCountAdded] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const [struggled, setStruggled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachments
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const selectedGoal = activeGoals.find((g) => g._id === selectedGoalId);

  // Image Selection Handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1280, 0.8);
      setImageBlob(compressed);
      setSelectedImage(URL.createObjectURL(compressed));
    } catch {
      toast.error("Failed to process image.");
    }
  };

  // Voice Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Microphone permission needed for voice notes.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    const mediaRecorder = mediaRecorderRef.current;
    clearInterval(recordTimerRef.current);

    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
      const localUrl = URL.createObjectURL(blob);
      setVoiceUrl(localUrl);
      setIsRecording(false);
      setRecordingSeconds(0);
    };

    mediaRecorder.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      let uploadedMediaUrls: string[] = [];
      if (imageBlob) {
        toast.loading("Uploading photo...", { id: "post-upload" });
        const imgUrl = await uploadImage(imageBlob);
        uploadedMediaUrls.push(imgUrl);
      }

      let finalVoiceUrl: string | undefined = undefined;
      if (voiceUrl && audioChunksRef.current.length > 0) {
        toast.loading("Uploading voice note...", { id: "post-upload" });
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        finalVoiceUrl = await uploadVoiceNote(blob);
      }

      toast.dismiss("post-upload");

      await onSubmitPost({
        category,
        body: body.trim(),
        goalId: selectedGoalId || undefined,
        countAdded: selectedGoalId ? countAdded : undefined,
        minutes: minutes > 0 ? minutes : undefined,
        struggled,
        mediaUrls: uploadedMediaUrls,
        voiceUrl: finalVoiceUrl,
      });

      // Reset Form
      setBody("");
      setSelectedGoalId("");
      setCountAdded(1);
      setMinutes(30);
      setStruggled(false);
      setSelectedImage(null);
      setImageBlob(null);
      setVoiceUrl(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.dismiss("post-upload");
      toast.error(err.message || "Failed to share progress.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/60 bg-[#16161f]/95 text-foreground backdrop-blur-2xl sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E5A962] to-[#E07A5F] text-[#0d0d12]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                Share Daily Progress
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Let your partner cheer your small wins today
              </DialogDescription>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    category === cat
                      ? "bg-gradient-to-r from-[#E5A962] to-[#E07A5F] text-[#0d0d12] shadow-sm"
                      : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Picker (Optional) */}
          {activeGoals.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Attach to Goal (Optional)
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121118] p-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">None (Independent Milestone)</option>
                {activeGoals.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.title} ({g.currentCount || 0}/{g.targetCount || "?"} {g.unit || ""})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Steppers: Count Done & Minutes Spent */}
          <div className="grid grid-cols-2 gap-3">
            {/* Count Done */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                {selectedGoal?.unit ? `Count (${selectedGoal.unit})` : "Count Done"}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCountAdded((c) => Math.max(1, c - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-base font-bold text-accent">
                  +{countAdded}
                </span>
                <button
                  type="button"
                  onClick={() => setCountAdded((c) => c + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Time Spent */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Time Spent (Mins)
              </span>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMinutes((m) => Math.max(5, m - 15))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-base font-bold text-foreground">
                  {minutes}m
                </span>
                <button
                  type="button"
                  onClick={() => setMinutes((m) => m + 15)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Text Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              What did you accomplish?
            </label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Finished chapter 2 of physics. Solved all practice exercises..."
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none"
            />
          </div>

          {/* Attachments & Previews */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {/* Image Preview */}
            {selectedImage && (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 max-h-40">
                <img src={selectedImage} alt="Attachment" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImageBlob(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Voice Preview */}
            {voiceUrl && (
              <div className="relative rounded-2xl border border-accent/20 bg-accent/5 p-2.5">
                <VoiceNotePlayer voiceUrl={voiceUrl} isMe={true} />
                <button
                  type="button"
                  onClick={() => setVoiceUrl(null)}
                  className="absolute top-2 right-2 rounded-full bg-white/10 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Attachment Action Buttons */}
            {!isRecording ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/10"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Attach Photo</span>
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1.5 rounded-xl border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Voice Memo</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-mono text-rose-400 font-bold">
                    Recording: {recordingSeconds}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 text-white font-semibold shadow-sm"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* "Struggled Today" Toggle */}
          <div
            onClick={() => setStruggled((s) => !s)}
            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition-colors ${
              struggled
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${
                  struggled ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-muted-foreground"
                }`}
              >
                💪
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Struggled today</p>
                <p className="text-[10px] text-muted-foreground">
                  It felt difficult, but you showed up anyway
                </p>
              </div>
            </div>
            <div
              className={`h-5 w-9 rounded-full transition-colors relative ${
                struggled ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#0d0d12] transition-transform ${
                  struggled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!body.trim() || isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[#E5A962] to-[#E07A5F] py-3 text-sm font-semibold text-[#0d0d12] shadow-lg shadow-accent/25 transition-transform active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sharing with your love...</span>
              </span>
            ) : (
              "Post to Progress Wall ✨"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
