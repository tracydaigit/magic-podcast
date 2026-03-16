import { createClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { PodcastCard } from "./components/PodcastCard";
import { NewPodcastForm } from "./components/NewPodcastForm";
import type { Podcast } from "@/lib/types";
import { SignOutButton } from "./components/SignOutButton";

export default async function HomePage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: podcasts } = await supabase
    .from("podcasts")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "expired")
    .order("created_at", { ascending: false });

  const podcastList = (podcasts as Podcast[]) || [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-primary tracking-tight">
              Magic Podcast
            </h1>
            <p className="text-sm text-secondary mt-0.5 font-[family-name:var(--font-newsreader)] italic">
              Your article podcasts
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>

      {/* New podcast form */}
      <div className="mb-8 animate-fade-up-delay-1">
        <NewPodcastForm />
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-6" />

      {/* Podcast list */}
      {podcastList.length === 0 ? (
        <div className="text-center py-16 animate-fade-up-delay-2">
          <div className="mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mx-auto text-placeholder">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p className="text-sm text-secondary">
            No podcasts yet. <span className="font-[family-name:var(--font-newsreader)] italic">Paste an article URL above to get started.</span>
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-up-delay-2">
          {podcastList.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}
    </div>
  );
}
