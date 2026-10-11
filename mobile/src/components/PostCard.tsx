import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import { F, useColors } from "@/lib/theme";
import { PROJECT, niceDate, photo } from "@/lib/site";
import { Card, H3, Label, Muted, P, Pill, Row } from "./ui";

type Post = FunctionReturnType<typeof api.posts.published>[number];

export function PostCard({ post, phase }: { post: Post; phase?: string }) {
  const c = useColors();
  return (
    <Card style={{ padding: 0, gap: 0 }} onPress={() => router.push({ pathname: "/post/[slug]", params: { slug: post.slug } })}>
      <Image source={{ uri: photo(post.photos[0]?.url ?? PROJECT.heroPhoto) }} style={{ width: "100%", aspectRatio: 16 / 10, backgroundColor: c.line }} contentFit="cover" transition={150} />
      <View style={{ padding: 14, gap: 6 }}>
        <Row>
          <Pill text={phase ?? "Update"} tone="gold" />
          <Label>{niceDate(post.date)}</Label>
        </Row>
        <H3 style={{ fontSize: 19 }}>{post.title}</H3>
        {post.summary ? <P style={{ color: c.ink2 }}>{post.summary}</P> : null}
        <Muted style={{ color: c.oxide, fontFamily: F.sans6 }}>Read the update →</Muted>
      </View>
    </Card>
  );
}
