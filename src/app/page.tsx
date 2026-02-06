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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Magic Podcast
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your article podcasts
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* New podcast form */}
      <div className="mb-8">
        <NewPodcastForm />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mb-6" />

      {/* Podcast list */}
      {podcastList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500">
            No podcasts yet. Paste an article URL above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {podcastList.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}
    </div>
  );
}
