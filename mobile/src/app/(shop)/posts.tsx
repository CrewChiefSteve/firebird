import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { api } from "@convex/_generated/api";
import { useM, useQ } from "@/lib/data";
import { useColors } from "@/lib/theme";
import { niceDate, photo } from "@/lib/site";
import { confirm } from "@/lib/confirm";
import { Btn, Card, Empty, H3, Loading, Muted, Pill, Row, Screen } from "@/components/ui";

export default function Posts() {
  const c = useColors();
  const posts = useQ(api.posts.all);
  const remove = useM(api.posts.remove);
  if (!posts) return <Loading text="Loading posts…" />;

  return (
    <Screen>
      <Btn title="New post" kind="primary" onPress={() => router.push("/post-edit")} />
      {posts.length === 0 && <Empty>No posts yet. Shoot a few photos and write what got done.</Empty>}
      {posts.map((p) => (
        <Card key={p._id} style={{ flexDirection: "row", gap: 12 }} onPress={() => router.push({ pathname: "/post-edit", params: { id: p._id } })}>
          {p.photos[0] ? <Image source={{ uri: photo(p.photos[0].url) }} style={{ width: 76, height: 76, borderRadius: 6 }} contentFit="cover" /> : <View style={{ width: 76, height: 76, borderRadius: 6, backgroundColor: c.line }} />}
          <View style={{ flex: 1, gap: 4 }}>
            <H3 numberOfLines={2}>{p.title}</H3>
            <Row>
              {!p.published && <Pill text="draft" tone="warn" />}
              <Muted>{niceDate(p.date)} · {p.photos.length} photo{p.photos.length === 1 ? "" : "s"}</Muted>
            </Row>
            <Row>
              {p.published && <Btn small title="View" onPress={() => router.push({ pathname: "/post/[slug]", params: { slug: p.slug } })} />}
              <Btn small kind="quiet" title="Delete" onPress={async () => { if (await confirm(`Delete "${p.title}"?`, "Its uploaded photos go too.", "Delete", true)) remove({ id: p._id }); }} />
            </Row>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
