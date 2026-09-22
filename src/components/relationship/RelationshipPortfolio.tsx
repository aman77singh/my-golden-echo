"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  ArrowDown,
  Heart,
  LockKeyhole,
  Menu,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { relationshipContent as content } from "@/content/relationship";

const requiredSections = ["timeline", "photos", "apologies", "thoughts", "music", "letter"];
const stars = Array.from({ length: 54 }, (_, index) => ({
  x: (index * 37 + 11) % 100,
  y: (index * 61 + 7) % 100,
  r: 0.5 + ((index * 13) % 14) / 10,
  delay: (index % 9) * 0.37,
}));

function formatTogether(since: string) {
  const start = new Date(since);
  const now = new Date();
  const totalMs = Math.max(0, now.getTime() - start.getTime());
  const totalDays = Math.floor(totalMs / 86_400_000);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  anniversary.setMonth(start.getMonth() + months);
  const elapsedAfterMonths = Math.max(0, now.getTime() - anniversary.getTime());
  const days = Math.floor(elapsedAfterMonths / 86_400_000);
  const hours = Math.floor((totalMs / 3_600_000) % 24);
  const minutes = Math.floor((totalMs / 60_000) % 60);
  return { years, months, days, hours, minutes, totalDays };
}

function TimeTogether() {
  const [time, setTime] = useState(() => formatTogether(content.couple.togetherSince));
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const tick = () => {
      const next = formatTogether(content.couple.togetherSince);
      setTime(next);
      const key = `relationship-milestone-${next.totalDays}`;
      const isMilestone = next.totalDays > 0 && (next.totalDays % 100 === 0 || (next.months === 0 && next.days === 0));
      if (isMilestone && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "seen");
        setBurst(true);
        window.setTimeout(() => setBurst(false), 2600);
      }
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const units = [[time.years, "years"], [time.months, "months"], [time.days, "days"], [time.hours, "hours"], [time.minutes, "minutes"]] as const;
  return (
    <div className="relative mt-10">
      <p className="mb-4 font-script text-xl text-accent">Together for</p>
      <div className="flex flex-wrap gap-x-7 gap-y-4">
        {units.map(([value, label]) => (
          <div key={label} className="min-w-14">
            <strong className="block font-display text-3xl font-normal tabular-nums text-foreground md:text-4xl">{String(value).padStart(2, "0")}</strong>
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <AnimatePresence>{burst && <FireflyBurst />}</AnimatePresence>
    </div>
  );
}

function FireflyBurst() {
  return <motion.div className="pointer-events-none fixed inset-0 z-[90]" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
    {Array.from({ length: 34 }, (_, i) => <motion.i key={i} className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-glow" style={{ left: `${(i * 31) % 100}%`, top: "55%" }} animate={{ y: -200 - (i % 5) * 80, x: ((i % 7) - 3) * 45, opacity: [0, 1, 0], scale: [0, 1.8, 0] }} transition={{ duration: 1.5 + (i % 4) * .2, delay: (i % 6) * .06 }} />)}
  </motion.div>;
}

function Constellation() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="h-full w-full opacity-70" viewBox="0 0 100 100" preserveAspectRatio="none">
        {stars.slice(0, 20).map((star, i) => {
          const next = stars[(i + 7) % stars.length];
          if (!next) return null;
          return <motion.line key={`line-${i}`} x1={star.x} y1={star.y} x2={next.x} y2={next.y} className="stroke-accent/15" strokeWidth=".08" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [.03, .3, .08] }} transition={{ duration: 2.5, delay: i * .08 }} />;
        })}
        {stars.map((star, i) => <motion.circle key={i} cx={star.x} cy={star.y} r={star.r / 10} className="fill-accent" animate={{ opacity: [.15, .85, .15], scale: [.7, 1.4, .7] }} transition={{ duration: 2.2 + (i % 5) * .4, repeat: Infinity, delay: star.delay }} />)}
        <motion.path d="M42 43 L42 31 L47 39 L52 31 L52 43 M58 43 L58 31 L66 43 L66 31" fill="none" className="stroke-highlight" strokeWidth=".28" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, .9, 0] }} transition={{ duration: 2.8, times: [0, .55, 1], delay: .35 }} />
      </svg>
    </div>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onDone, reduceMotion ? 200 : 1750);
    return () => window.clearTimeout(timer);
  }, [onDone, reduceMotion]);
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-background" exit={{ opacity: 0 }} transition={{ duration: .5 }}>
      <Button variant="ghost" className="absolute right-5 top-5 text-muted-foreground" onClick={onDone}>Skip</Button>
      <div className="relative flex items-center gap-12 font-display text-7xl text-foreground">
        <motion.span animate={{ x: 28, opacity: [0, 1, .3] }} transition={{ duration: 1.15 }}>{content.couple.initials[0]}</motion.span>
        <motion.div animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 1] }} transition={{ delay: .65, duration: .75 }}><Heart className="h-11 w-11 fill-accent text-accent" /></motion.div>
        <motion.span animate={{ x: -28, opacity: [0, 1, .3] }} transition={{ duration: 1.15 }}>{content.couple.initials[1]}</motion.span>
      </div>
    </motion.div>
  );
}

function HeartCursor() {
  const [points, setPoints] = useState<Array<{ x: number; y: number; id: number }>>([]);
  useEffect(() => {
    let id = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const next = { x: event.clientX, y: event.clientY, id: id++ };
      setPoints((current) => [...current.slice(-3), next]);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-[110] hidden lg:block" aria-hidden="true">{points.map((point, index) => <motion.span key={point.id} className="absolute text-accent" style={{ left: point.x, top: point.y }} initial={{ scale: .3, opacity: .8 }} animate={{ scale: 1 - index * .12, opacity: (index + 1) / points.length }} exit={{ opacity: 0 }}>♥</motion.span>)}</div>;
}

function Sidebar({ active, visited, unlocked, onNavigate }: { active: string; visited: Set<string>; unlocked: boolean; onNavigate: (id: string) => void }) {
  const links = [...content.navigation, { id: "bonus", label: "???" }];
  return <nav aria-label="Story sections" className="flex flex-col gap-1">{links.map((item, index) => {
    const locked = item.id === "bonus" && !unlocked;
    return <Button key={item.id} variant="ghost" disabled={locked} onClick={() => onNavigate(item.id)} className={`group h-auto justify-start gap-3 rounded-none border-l px-4 py-3 text-left ${active === item.id ? "border-accent bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:border-accent/50 hover:bg-accent/5 hover:text-foreground"} ${item.id === "bonus" && unlocked ? "animate-shimmer" : ""}`}>
      <span className="w-5 font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
      <span className="flex-1">{item.label}</span>
      {locked ? <LockKeyhole className="h-3.5 w-3.5" /> : visited.has(item.id) && item.id !== "bonus" ? <span className="h-1 w-1 rounded-full bg-accent" /> : null}
    </Button>;
  })}</nav>;
}

function SectionHeading({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: string; copy?: string }) {
  return <motion.header initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: .7 }} className="mb-14 max-w-2xl">
    <div className="mb-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-accent"><span>{number}</span><span className="h-px w-12 bg-accent/50" /><span>{eyebrow}</span></div>
    <h2 className="font-display text-4xl font-normal leading-tight text-foreground sm:text-5xl md:text-6xl">{title}</h2>
    {copy && <p className="mt-5 max-w-xl leading-7 text-muted-foreground">{copy}</p>}
  </motion.header>;
}

function TimelineSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 70%"] });
  return <section id="timeline" ref={ref} data-section className="section-shell bg-surface"><SectionHeading number="02" eyebrow="Our timeline" title="Every chapter left a mark." copy="Not a perfect story. A true one — which is better." />
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute bottom-0 left-4 top-0 w-px bg-border md:left-1/2" />
      <motion.div className="absolute left-4 top-0 w-px origin-top bg-accent shadow-glow md:left-1/2" style={{ scaleY: scrollYProgress, height: "100%" }} />
      <div className="space-y-12 md:space-y-20">{content.timeline.map((item, i) => <motion.article key={item.title} initial={{ opacity: 0, x: i % 2 ? 34 : -34 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .45 }} className={`relative ml-12 md:ml-0 md:w-[44%] ${i % 2 ? "md:ml-auto" : ""}`}>
        <span className={`absolute top-5 h-2.5 w-2.5 rounded-full bg-accent shadow-glow ${i % 2 ? "-left-[calc(13.65%+5px)]" : "-left-[37px] md:-right-[calc(13.65%+5px)] md:left-auto"}`} />
        <p className="mb-2 text-[10px] uppercase tracking-[.24em] text-accent">{item.date}</p><h3 className="font-display text-2xl text-foreground">{item.title}</h3><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p>
      </motion.article>)}</div>
    </div>
  </section>;
}

function PhotoSection() {
  const [selected, setSelected] = useState<(typeof content.photos)[number] | null>(null);
  return <section id="photos" data-section className="section-shell"><SectionHeading number="03" eyebrow="Photo dump" title="Proof we were here." copy="Twenty little windows into the same unfolding story." />
    <div className="columns-2 gap-3 md:columns-3 xl:columns-4">{content.photos.map((photo, i) => <motion.button type="button" key={`${photo.caption}-${i}`} aria-label={`Open photo: ${photo.caption}`} onClick={() => setSelected(photo)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * .06 }} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-sm bg-muted text-left" style={{ aspectRatio: i % 5 === 0 ? "3 / 4" : i % 3 === 0 ? "1 / 1" : "4 / 5" }}>
      <img src={photo.src} alt={photo.caption} loading="lazy" width={1280} height={1536} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" style={{ objectPosition: photo.position }} />
      <span className="absolute inset-x-0 bottom-0 bg-gallery-fade px-3 pb-3 pt-10 text-xs leading-5 text-foreground opacity-0 transition-opacity group-hover:opacity-100">{photo.caption}</span>
    </motion.button>)}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-4xl border-border bg-surface/95 p-2 backdrop-blur-xl"><DialogTitle className="sr-only">Memory photograph</DialogTitle><DialogDescription className="sr-only">Expanded photo with caption</DialogDescription>{selected && <figure><img src={selected.src} alt={selected.caption} width={1280} height={1536} className="max-h-[78vh] w-full object-contain" /><figcaption className="p-4 text-center font-display text-lg text-foreground">{selected.caption}</figcaption></figure>}</DialogContent></Dialog>
  </section>;
}

function ScratchNote({ text, index }: { text: string; index: number }) {
  const [revealed, setRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(ratio, ratio); ctx.fillStyle = "#4b4140"; ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#71615c"; ctx.lineWidth = 2;
    for (let y = 18; y < rect.height; y += 14) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(rect.width - 12, y + ((y / 14) % 2 ? 4 : -3)); ctx.stroke(); }
    ctx.font = "italic 16px serif"; ctx.fillStyle = "#c3aba0"; ctx.textAlign = "center"; ctx.fillText("scratch to uncover", rect.width / 2, rect.height / 2);
  }, []);
  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current; if (!canvas || revealed) return;
    const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext("2d"); if (!ctx) return;
    const ratio = window.devicePixelRatio || 1; ctx.save(); ctx.scale(ratio, ratio); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(clientX - rect.left, clientY - rect.top, 28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  return <motion.article initial={{ opacity: 0, rotate: index % 2 ? 2 : -2 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="relative min-h-56 rounded-sm bg-paper p-7 text-paper-foreground shadow-note">
    <span className="font-script text-2xl opacity-45">I owe you this one.</span><p className="mt-8 font-script text-2xl leading-relaxed">{text}</p>
    {!revealed && <canvas ref={canvasRef} role="button" aria-label="Scratch to reveal apology" tabIndex={0} className="absolute inset-0 h-full w-full touch-none rounded-sm cursor-crosshair" onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e.clientX, e.clientY); }} onPointerMove={(e) => drawing.current && scratch(e.clientX, e.clientY)} onPointerUp={() => { drawing.current = false; window.setTimeout(() => setRevealed(true), 500); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setRevealed(true); }} />}
  </motion.article>;
}

function ApologiesSection() { return <section id="apologies" data-section className="section-shell bg-surface"><SectionHeading number="04" eyebrow="My apologies" title="Some words deserve to be uncovered slowly." /><div className="grid gap-6 md:grid-cols-2">{content.apologies.map((text, i) => <ScratchNote key={text} text={text} index={i} />)}</div></section>; }

function ThoughtsSection() {
  const rotations = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-1"];
  const doodles = ["☾", "♡", "✦", "☕", "∞"];
  return <section id="thoughts" data-section className="section-shell overflow-hidden"><SectionHeading number="05" eyebrow="Random thoughts" title="Things I never want to forget." />
    <div className="grid gap-7 md:grid-cols-6">{content.thoughts.map((thought, i) => <motion.article key={thought} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ rotate: 0, y: -6 }} viewport={{ once: true }} className={`relative rounded-sm border border-border bg-card p-7 shadow-photo ${rotations[i]} ${i === 0 || i === 3 ? "md:col-span-4" : "md:col-span-2"}`}><span className="absolute -right-2 -top-5 font-script text-4xl text-accent/70">{doodles[i]}</span><p className="font-display text-xl leading-8 text-foreground">“{thought}”</p><span className="mt-6 block text-[9px] uppercase tracking-[.28em] text-muted-foreground">Note {String(i + 1).padStart(2, "0")}</span></motion.article>)}</div>
  </section>;
}

function MusicPlayer({ activeTrack, playing, setPlaying, selectTrack }: { activeTrack: number; playing: boolean; setPlaying: (value: boolean) => void; selectTrack: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const track = content.spotify.tracks[activeTrack] ?? content.spotify.tracks[0];
  useEffect(() => {
    if (!content.spotify.clientId || !content.spotify.accessToken) return;
    const script = document.createElement("script"); script.src = "https://sdk.scdn.co/spotify-player.js"; script.async = true; document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);
  const step = (amount: number) => selectTrack((activeTrack + amount + content.spotify.tracks.length) % content.spotify.tracks.length);
  return <>
    <div className="fixed right-4 top-4 z-40 flex items-center gap-3 rounded-full border border-border/70 bg-surface/80 p-1.5 pr-4 shadow-panel backdrop-blur-xl md:right-7 md:top-7">
      <Button size="icon" variant="ghost" aria-label="Open playlist" onClick={() => setOpen(true)} className="relative h-12 w-12 overflow-visible rounded-full p-0">
        <span className={`vinyl ${playing ? "animate-spin-vinyl" : ""}`}><img src={track.art} alt="" width={48} height={48} className="h-full w-full rounded-full object-cover opacity-65" /></span>
        {playing && ["♪", "♫"].map((note, i) => <motion.span key={note} className="absolute text-xs text-accent" animate={{ x: [0, i ? 15 : -12], y: [0, -34], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * .9 }}>{note}</motion.span>)}
      </Button>
      <button className="hidden min-w-0 text-left sm:block" onClick={() => setOpen(true)}><span className="block font-script text-sm text-accent">Now playing</span><span className="block max-w-36 truncate text-xs text-foreground">{track.title}</span></button>
      <Button size="icon" variant="ghost" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="rounded-full">{playing ? <Pause /> : <Play />}</Button>
    </div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="border-border bg-surface/95 p-0 backdrop-blur-2xl"><div className="p-7"><SheetTitle className="font-display text-3xl font-normal">Our playlist</SheetTitle><SheetDescription className="mt-1 font-script text-lg text-accent">Songs that sound like us</SheetDescription></div>
      <div className="px-4">{content.spotify.tracks.map((item, i) => <Button key={item.title} variant="ghost" onClick={() => { selectTrack(i); setPlaying(true); }} className={`h-auto w-full justify-start rounded-sm p-3 ${activeTrack === i ? "bg-accent/10" : ""}`}><img src={item.art} alt="" width={56} height={56} className="h-14 w-14 rounded-sm object-cover" /><span className="min-w-0 text-left"><strong className="block truncate font-display text-base font-normal">{item.title}</strong><small className="block truncate text-muted-foreground">{item.artist}</small></span>{item.isOurSong && <Heart className="ml-auto fill-accent text-accent" />}</Button>)}</div>
      <div className="mt-7 border-t border-border p-7"><div className="flex justify-center gap-3"><Button variant="ghost" size="icon" aria-label="Previous track" onClick={() => step(-1)}><SkipBack /></Button><Button size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="h-11 w-11 rounded-full">{playing ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" aria-label="Next track" onClick={() => step(1)}><SkipForward /></Button></div>
        {content.spotify.playlistId ? <iframe className="mt-6 h-20 w-full rounded-sm" title="Spotify playlist" src={`https://open.spotify.com/embed/playlist/${content.spotify.playlistId}?utm_source=generator&theme=0`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" /> : <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Add your Spotify playlist ID in the content file to play it here.</p>}
      </div>
    </SheetContent></Sheet>
  </>;
}

function MusicSection({ activeTrack }: { activeTrack: number }) {
  const track = content.spotify.tracks[activeTrack] ?? content.spotify.tracks[0];
  return <section id="music" data-section className="section-shell bg-surface"><SectionHeading number="06" eyebrow="Our soundtrack" title="Some memories begin with a song." />
    <div className="grid items-center gap-10 md:grid-cols-[.8fr_1.2fr]"><div className="relative mx-auto aspect-square w-full max-w-sm rounded-full bg-vinyl shadow-vinyl"><div className="absolute inset-[8%] overflow-hidden rounded-full border border-border"><img src={track.art} alt={`Album art for ${track.title}`} width={1280} height={1536} loading="lazy" className="h-full w-full object-cover opacity-70" /></div><div className="absolute inset-[44%] rounded-full bg-background shadow-inner" /></div><div><p className="font-script text-2xl text-accent">Playing in our heads</p><h3 className="mt-2 font-display text-4xl text-foreground">{track.title}</h3><p className="mt-3 text-muted-foreground">{track.artist}</p><div className="mt-8 h-px overflow-hidden bg-border"><motion.div className="h-full bg-accent" animate={{ width: ["0%", "100%"] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} /></div></div></div>
  </section>;
}

function LetterSection() {
  const today = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
  return <section id="letter" data-section className="section-shell flex min-h-screen items-center"><div className="mx-auto max-w-3xl py-20"><SectionHeading number="07" eyebrow="A letter to you" title="For all the things I mean, even when I forget to say them." />
    <div className="space-y-8">{content.letter.map((line, i) => <motion.p key={line} initial={{ opacity: 0, y: 20, filter: "blur(5px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, amount: .65 }} transition={{ duration: .9 }} className={`${i === 0 || i === content.letter.length - 1 ? "font-script text-3xl text-accent" : "font-display text-xl leading-9 text-foreground/90 md:text-2xl md:leading-10"}`}>{line}</motion.p>)}</div>
    <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-16 border-t border-border pt-8"><p className="font-script text-3xl text-foreground">{content.couple.firstName} & {content.couple.secondName}</p><p className="mt-2 text-[10px] uppercase tracking-[.28em] text-muted-foreground">{today}</p><motion.div className="mt-8 inline-flex items-center gap-3 text-accent" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: .9, repeat: Infinity }}><Heart className="fill-accent" /><span className="font-script text-lg">always, still</span></motion.div></motion.footer>
  </div></section>;
}

function BonusSection() {
  const [remaining, setRemaining] = useState("");
  useEffect(() => { const tick = () => { const ms = Math.max(0, new Date(content.bonus.date).getTime() - Date.now()); const days = Math.floor(ms / 86_400_000); const hours = Math.floor(ms / 3_600_000) % 24; const minutes = Math.floor(ms / 60_000) % 60; setRemaining(`${days} days · ${hours} hours · ${minutes} minutes`); }; tick(); const timer = window.setInterval(tick, 60_000); return () => window.clearInterval(timer); }, []);
  return <section id="bonus" data-section className="section-shell min-h-screen bg-surface"><div className="mx-auto max-w-4xl text-center"><Sparkles className="mx-auto mb-6 h-8 w-8 text-accent" /><p className="mb-4 text-[10px] uppercase tracking-[.32em] text-accent">One last thing</p><h2 className="font-display text-4xl leading-tight text-foreground md:text-7xl">{content.bonus.message}</h2><figure className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-sm border border-accent/30 shadow-vinyl"><img src={content.bonus.image} alt="A final memory together" width={1280} height={1536} loading="lazy" className="aspect-[16/10] w-full object-cover" /></figure><p className="mt-8 font-script text-2xl text-accent">Until our next anniversary</p><p className="mt-2 text-sm uppercase tracking-[.18em] text-muted-foreground">{remaining}</p></div></section>;
}

export function RelationshipPortfolio() {
  const [intro, setIntro] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const unlocked = requiredSections.every((id) => visited.has(id));
  const ourSong = content.spotify.tracks[activeTrack]?.isOurSong && playing;

  const navigate = useCallback((id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }, []);
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-section]");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { const id = entry.target.id; setActive(id); if (requiredSections.includes(id)) setVisited((current) => new Set(current).add(id)); } }), { threshold: .25, rootMargin: "-20% 0px -45%" });
    elements.forEach((element) => observer.observe(element)); return () => observer.disconnect();
  }, [unlocked]);

  return <div className={ourSong ? "our-song" : ""}>
    <AnimatePresence>{intro && <Intro onDone={() => setIntro(false)} />}</AnimatePresence><HeartCursor />
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/60 bg-background/85 p-7 backdrop-blur-xl lg:flex lg:flex-col"><button onClick={() => navigate("home")} className="mb-14 text-left"><span className="font-display text-2xl text-foreground">{content.couple.initials.join(" / ")}</span><span className="mt-1 block font-script text-sm text-accent">our little universe</span></button><Sidebar active={active} visited={visited} unlocked={unlocked} onNavigate={navigate} /><p className="mt-auto text-[9px] uppercase tracking-[.24em] text-muted-foreground">Made for one person only</p></aside>
    <div className="fixed left-4 top-4 z-40 lg:hidden"><Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button size="icon" variant="outline" className="rounded-full bg-surface/80 backdrop-blur-lg" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent side="left" className="border-border bg-background/95"><SheetTitle className="font-display text-3xl font-normal">{content.couple.firstName} & {content.couple.secondName}</SheetTitle><SheetDescription className="mb-8 font-script text-accent">our little universe</SheetDescription><Sidebar active={active} visited={visited} unlocked={unlocked} onNavigate={navigate} /></SheetContent></Sheet></div>
    <MusicPlayer activeTrack={activeTrack} playing={playing} setPlaying={setPlaying} selectTrack={setActiveTrack} />
    <main className="overflow-hidden lg:pl-64">
      <section id="home" data-section className="relative flex min-h-screen items-center px-5 py-24 sm:px-10 lg:px-16 xl:px-24"><Constellation /><div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-[1.05fr_.95fr]">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: .8 }}><p className="mb-5 text-[10px] uppercase tracking-[.32em] text-accent">Since {new Date(content.couple.togetherSince).getFullYear()}</p><h1 className="font-display text-6xl font-normal leading-[.9] text-foreground sm:text-7xl xl:text-8xl">{content.couple.firstName}<span className="block font-script text-4xl leading-normal text-accent sm:text-5xl">and</span>{content.couple.secondName}</h1><p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">{content.couple.tagline}</p><TimeTogether /></motion.div>
        <motion.figure initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.55, duration: 1 }} className="relative mx-auto w-full max-w-md"><div className="absolute -inset-3 rounded-[2px] border border-accent/25 shadow-vinyl" /><img src={content.couple.heroImage} alt={`${content.couple.firstName} and ${content.couple.secondName} together`} width={1280} height={1536} fetchPriority="high" className="relative aspect-[4/5] w-full rounded-[2px] object-cover" /><div className="absolute inset-0 bg-photo-vignette" /><figcaption className="absolute bottom-5 left-5 font-script text-xl text-foreground">the view I keep choosing</figcaption></motion.figure>
      </div><Button variant="ghost" onClick={() => navigate("timeline")} className="absolute bottom-7 left-1/2 flex h-auto -translate-x-1/2 flex-col gap-2 text-muted-foreground lg:left-[calc(50%+8rem)]"><span className="text-[9px] uppercase tracking-[.25em]">Begin our story</span><ArrowDown className="animate-bounce" /></Button></section>
      <TimelineSection /><PhotoSection /><ApologiesSection /><ThoughtsSection /><MusicSection activeTrack={activeTrack} /><LetterSection />{unlocked && <BonusSection />}
    </main>
    <div className="pointer-events-none fixed inset-0 z-[80] opacity-[.055] mix-blend-screen film-grain" aria-hidden="true" />
  </div>;
}
