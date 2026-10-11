import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { api } from "@convex/_generated/api";
import { useQ } from "@/lib/data";
import { useColors } from "@/lib/theme";
import { niceDate, photo, postUrl, share } from "@/lib/site";
import { Btn, Display, Empty, Label, Loading, Muted, Pill, Row, Screen, Sheet } from "@/components/ui";
import { Markdown } from "@/components/Markdown";

export default function PostScreen() {
  const c = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const post = useQ(api.posts.bySlug, { slug });
  const all = useQ(api.posts.published);
  const phases = useQ(api.phases.list);
  const [zoom, setZoom] = useState<{ url: string; caption: string } | null>(null);

  if (post === undefined) return <Loading />;
  if (post === null) return <Screen><Empty>That update isn’t published.</Empty></Screen>;
  const phaseName = Object.fromEntries((phases ?? []).map((p) => [p.key, p.name]));
  const idx = (all ?? []).findIndex((p) => p.slug === slug);
  const newer = all && idx > 0 ? all[idx - 1] : null;
  const older = all && idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null;
  const w = Math.min(width, 720) - 32;

  return (
    <Screen>
      <Stack.Screen options={{ title: post.title }} />
      <Row>
        <Pill text={phaseName[post.phase] ?? "Update"} tone="gold" />
        <Label>{niceDate(post.date)}</Label>
      </Row>
      <Display style={{ fontSize: 38, lineHeight: 38 }}>{post.title}</Display>
      {post.photos.map((ph, i) => (
        <Pressable key={ph.url} onPress={() => setZoom(ph)} accessibilityLabel={ph.caption || `Photo ${i + 1}`}>
          <Image source={{ uri: photo(ph.url) }} style={{ width: w, height: i === 0 ? w * 0.75 : w * 0.66, borderRadius: 6, backgroundColor: c.line }} contentFit="cover" transition={150} />
          {ph.caption ? <Muted style={{ marginTop: 4 }}>{ph.caption}</Muted> : null}
        </Pressable>
      ))}
      <Markdown text={post.body} />
      <Btn title="Share this update" onPress={() => share(postUrl(post.slug), post.title)} />
      <View style={{ gap: 8 }}>
        {older && <Btn kind="quiet" title={`← ${older.title}`} onPress={() => router.replace({ pathname: "/post/[slug]", params: { slug: older.slug } })} />}
        {newer && <Btn kind="quiet" title={`${newer.title} →`} onPress={() => router.replace({ pathname: "/post/[slug]", params: { slug: newer.slug } })} />}
      </View>
      <Sheet visible={!!zoom} onClose={() => setZoom(null)} title="Photo">
        {zoom && <Image source={{ uri: photo(zoom.url) }} style={{ width: "100%", aspectRatio: 3 / 4 }} contentFit="contain" />}
        {zoom?.caption ? <Muted>{zoom.caption}</Muted> : null}
      </Sheet>
    </Screen>
  );
}
