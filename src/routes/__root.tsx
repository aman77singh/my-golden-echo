import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { relationshipContent as content } from "@/content/relationship";
import {
  Sidebar,
  MusicPlayer,
  HeartCursor,
  Intro,
  PasswordGate,
  requiredSections,
} from "@/components/relationship/RelationshipPortfolio";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const pathToId: Record<string, string> = {
  "/": "home",
  "/timeline": "timeline",
  "/photos": "photos",
  "/apologies": "apologies",
  "/thoughts": "thoughts",
  "/music": "music",
  "/letter": "letter",
  "/secret": "bonus",
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aman & Aditi — Our Little Universe" },
      { name: "description", content: "A cinematic relationship portfolio for Aman & Aditi." },
      { name: "author", content: "Aman & Aditi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=Italiana&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,400..700;1,400..700&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const pathname = location.pathname;

  const security = content.security;
  const isSecurityEnabled = security?.enabled ?? true;

  const [authenticated, setAuthenticated] = useState<boolean>(false);

  const [intro, setIntro] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);

  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("is-authenticated");
        localStorage.removeItem("is-authenticated");
        if (!sessionStorage.getItem("has-seen-intro")) {
          setIntro(true);
        }
        const saved = localStorage.getItem("visited-sections");
        if (saved) {
          setVisited(new Set(JSON.parse(saved)));
        }
      }
    } catch {}
  }, []);

  const unlocked = requiredSections.every((id) => visited.has(id));
  const ourSong = content.spotify.tracks[activeTrack]?.isOurSong && playing;
  const [showGateOnHome, setShowGateOnHome] = useState(false);
  const isHome = pathname === "/";
  const shouldShowGate = !authenticated && (!isHome || showGateOnHome);

  useEffect(() => {
    const sectionId = pathToId[pathname];
    if (sectionId && requiredSections.includes(sectionId)) {
      setVisited((prev) => {
        if (!prev.has(sectionId)) {
          const next = new Set(prev).add(sectionId);
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem("visited-sections", JSON.stringify(Array.from(next)));
            }
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [pathname]);

  const handleUnlock = () => {
    setAuthenticated(true);
    setShowGateOnHome(false);
  };

  const handleLock = () => {
    setAuthenticated(false);
    setShowGateOnHome(true);
  };

  const handleDoneIntro = () => {
    setIntro(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("has-seen-intro", "true");
      }
    } catch {}
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className={ourSong ? "our-song" : ""}>
        <AnimatePresence>{intro && <Intro onDone={handleDoneIntro} />}</AnimatePresence>
        <HeartCursor />

        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/60 bg-background/85 p-7 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            to="/"
            onClick={() => setShowGateOnHome(false)}
            className="mb-14 text-left"
          >
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              {content.couple.firstName} &amp; {content.couple.secondName}
            </span>
            <span className="mt-1 block font-sans text-xs tracking-wider uppercase text-accent font-semibold">
              Our Portfolio
            </span>
          </Link>
          <Sidebar
            activePath={pathname}
            visited={visited}
            unlocked={unlocked}
            authenticated={authenticated}
            onLock={handleLock}
            onHomeClick={() => setShowGateOnHome(false)}
          />
          <p className="mt-auto text-[9px] uppercase tracking-[.24em] text-muted-foreground font-sans">
            Made for one person only
          </p>
        </aside>

        {/* Mobile Navigation */}
        <div className="fixed left-4 top-4 z-40 lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-full bg-surface/80 backdrop-blur-lg" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="border-border bg-background/95">
              <SheetTitle className="font-display text-3xl font-bold">
                {content.couple.firstName} &amp; {content.couple.secondName}
              </SheetTitle>
              <SheetDescription className="mb-8 font-script text-accent">our little universe</SheetDescription>
              <Sidebar
                activePath={pathname}
                visited={visited}
                unlocked={unlocked}
                authenticated={authenticated}
                onNavigate={() => setMenuOpen(false)}
                onLock={() => {
                  setMenuOpen(false);
                  handleLock();
                }}
                onHomeClick={() => {
                  setMenuOpen(false);
                  setShowGateOnHome(false);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Persistent Music Player */}
        <MusicPlayer activeTrack={activeTrack} playing={playing} setPlaying={setPlaying} selectTrack={setActiveTrack} />

        {/* Main Content View Container */}
        <main className="min-h-screen overflow-hidden lg:pl-64">
          {shouldShowGate ? (
            <PasswordGate
              onUnlock={handleUnlock}
              onClose={() => setShowGateOnHome(false)}
            />
          ) : (
            <Outlet />
          )}
        </main>

        <div className="pointer-events-none fixed inset-0 z-[80] opacity-[.035] mix-blend-multiply film-grain" aria-hidden="true" />
      </div>
    </QueryClientProvider>
  );
}
