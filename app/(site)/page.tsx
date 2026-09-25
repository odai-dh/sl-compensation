import { FinalSection } from "@/components/site/final-section";
import { SiteShell } from "@/components/site/site-shell";
import { StoryChapters } from "@/components/site/story-chapters";
import { TryIt } from "@/components/site/try-it";

/** The showcase website: a scroll-driven story around the real, clickable app. */
export default function ShowcasePage() {
  return (
    <SiteShell>
      <main>
        <StoryChapters />
        <TryIt />
        <FinalSection />
      </main>
    </SiteShell>
  );
}
