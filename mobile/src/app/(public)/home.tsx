import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@convex/_generated/api";
import { useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { PROJECT, daysUntil, isOpenPart, niceDate, photo, share } from "@/lib/site";
import { STORY } from "@/lib/story";
import { Body, Btn, Card, Display, H2, Label, Muted, P, Row, Section } from "@/components/ui";
import { PostCard } from "@/components/PostCard";

function Countdown() {
  const c = useColors();
  const { rolling, birthday } = PROJECT.milestones;
  const card = (iso: string, what: string, sub: string, color: string) => {
    const d = daysUntil(iso);
    return (
      <Card style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.disp, fontSize: 52, lineHeight: 54, color }}>{d > 0 ? d : d === 0 ? "Today" : "Done"}</Text>
        <P style={{ fontFamily: F.sans6 }}>{what}</P>
        <Muted>{sub}</Muted>
      </Card>
    );
  };
  return (
    <Row gap={12} style={{ alignItems: "stretch", marginTop: -36, paddingHorizontal: 16 }}>
      {card(rolling.date, "days to a rolling chassis", `Target ${niceDate(rolling.date)}`, c.oxide)}
      {card(birthday.date, "days until Joe drives it", `${niceDate(birthday.date)} · his 80th`, c.gold)}
    </Row>
  );
}

function Phases() {
  const c = useColors();
  const phases = useQ(api.phases.list);
  if (!phases) return null;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <Section title="Where it stands" hint={`Updated ${today}`}>
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        {phases.map((p, i) => {
          const tone = { done: c.done, active: c.oxide, "up-next": c.gold, later: c.later }[p.status];
          return (
            <View key={p._id} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: tone, backgroundColor: p.status === "done" ? tone : "transparent", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.sans7, fontSize: 11, color: p.status === "done" ? "#fff" : tone }}>{p.status === "done" ? "✓" : i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Row>
                  <Text style={{ flex: 1, fontFamily: F.disp, fontSize: 20, textTransform: "uppercase", color: p.status === "later" ? c.muted : c.ink }}>{p.name}</Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.muted }}>{p.pct}%</Text>
                </Row>
                <Muted>{p.blurb}</Muted>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: c.line, overflow: "hidden" }}>
                  <View style={{ width: `${p.pct}%`, height: "100%", backgroundColor: c.oxide }} />
                </View>
              </View>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const phases = useQ(api.phases.list);
  const posts = useQ(api.posts.published);
  const parts = useQ(api.parts.publicList);
  const phaseName = Object.fromEntries((phases ?? []).map((p) => [p.key, p.name]));
  const openParts = (parts ?? []).filter(isOpenPart);
  const sponsors = Array.from(new Set((parts ?? []).map((p) => p.sponsor).filter((s): s is string => !!s)));
  const thanks = [...sponsors, ...PROJECT.thanks];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ backgroundColor: "#000", minHeight: 440 + insets.top, justifyContent: "flex-end" }}>
        <Image source={{ uri: photo(PROJECT.heroPhoto) }} style={{ position: "absolute", inset: 0, opacity: 0.85 }} contentFit="cover" accessibilityLabel="The Trans Am shell on its dolly in the shop" />
        <LinearGradient colors={["rgba(10,8,6,0)", "rgba(10,8,6,.88)"]} locations={[0.25, 1]} style={{ position: "absolute", inset: 0 }} />
        <View style={{ padding: 20, paddingBottom: 56, gap: 10 }}>
          <Label style={{ color: "#E0B04A" }}>An 80th birthday build</Label>
          <Display style={{ color: "#F7F6F2", fontSize: 56, lineHeight: 54 }}>
            Joe’s <Text style={{ color: "#E0B04A" }}>Trans Am</Text>
          </Display>
          <Body style={{ color: "#F7F6F2", fontSize: 16, lineHeight: 23 }}>
            {PROJECT.tagline} The Trans Am Joe Cobb bought for his wife Connie became their daughter Jennifer’s first car. Now it’s going back together so Joe can drive it on his 80th birthday. Follow along.
          </Body>
        </View>
      </View>
      <Countdown />

      <View style={{ padding: 16, gap: 28 }}>
        <Phases />

        {parts && parts.length > 0 && (
          <Card style={{ backgroundColor: c.paper, gap: 10 }}>
            <Label>Adopt a part</Label>
            <H2 style={{ fontFamily: F.disp, fontSize: 28 }}>
              {openParts.length > 0 ? `${openParts.length} part${openParts.length === 1 ? "" : "s"} still need${openParts.length === 1 ? "s" : ""} a sponsor` : "Every listed part has a sponsor"}
            </H2>
            <P style={{ color: c.ink2 }}>Ball joints, bushings, tie rods. Real parts with real prices, going on the car soon. Pick one and we’ll put your name on it when it goes on.</P>
            <Btn title="See the list →" kind="gold" onPress={() => router.push("/adopt")} />
          </Card>
        )}

        <Section title="Build log" hint={posts ? `${posts.length} update${posts.length === 1 ? "" : "s"}` : undefined}
          right={posts && posts.length > 2 ? <Btn title="All" small onPress={() => router.push("/log")} /> : null}>
          {posts?.length === 0 && <Muted>First update coming soon.</Muted>}
          {posts?.slice(0, 2).map((p) => <PostCard key={p._id} post={p} phase={phaseName[p.phase]} />)}
        </Section>

        <Section title="Why this car" hint="The story">
          {STORY.map((para, i) => <Body key={i}>{para}</Body>)}
          {PROJECT.people.map((pp) => (
            <Card key={pp.name} style={{ flexDirection: "row", gap: 12 }}>
              <Image source={{ uri: photo(pp.photos[0]) }} style={{ width: 84, height: 84, borderRadius: 6 }} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Label>{pp.role}</Label>
                <Text style={{ fontFamily: F.disp, fontSize: 22, textTransform: "uppercase", color: c.ink }}>{pp.name}</Text>
                <Muted>{pp.blurb}</Muted>
              </View>
            </Card>
          ))}
          {PROJECT.gallery.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {PROJECT.gallery.map((g) => (
                <View key={g.photo} style={{ width: 240, gap: 6 }}>
                  <Image source={{ uri: photo(g.photo) }} style={{ width: 240, height: 180, borderRadius: 6 }} contentFit="cover" accessibilityLabel={g.caption} />
                  <Muted>{g.caption}</Muted>
                </View>
              ))}
            </ScrollView>
          )}
        </Section>

        {thanks.length > 0 && (
          <Section title="Built with help from" hint="Part sponsors">
            <Row wrap>{thanks.map((t) => <View key={t} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><P>{t}</P></View>)}</Row>
          </Section>
        )}

        <Btn title="Share Joe’s Trans Am" onPress={() => share(PROJECT.siteUrl + "/")} />
        <Muted style={{ textAlign: "center" }}>Built in the shop by Jennifer, Steve & Nick</Muted>
      </View>
    </ScrollView>
  );
}
