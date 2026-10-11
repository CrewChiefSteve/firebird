import { api } from "@convex/_generated/api";
import { useQ } from "@/lib/data";
import { Empty, Loading, Screen } from "@/components/ui";
import { PostCard } from "@/components/PostCard";

export default function Log() {
  const posts = useQ(api.posts.published);
  const phases = useQ(api.phases.list);
  if (!posts) return <Loading text="Loading the build log…" />;
  const phaseName = Object.fromEntries((phases ?? []).map((p) => [p.key, p.name]));
  return (
    <Screen>
      {posts.length === 0 && <Empty>First update coming soon.</Empty>}
      {posts.map((p) => <PostCard key={p._id} post={p} phase={phaseName[p.phase]} />)}
    </Screen>
  );
}
