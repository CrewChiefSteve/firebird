import { Linking } from "react-native";
import { router, type Href } from "expo-router";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useClerk } from "@clerk/expo";
import { api } from "@convex/_generated/api";
import { DEMO, useQ } from "@/lib/data";
import { useCrew } from "@/lib/crew";
import { useColors } from "@/lib/theme";
import { fmtH } from "@/lib/format";
import { PROJECT } from "@/lib/site";
import { Btn, Card, H3, Label, Muted, Row, Screen } from "@/components/ui";

export default function More() {
  const c = useColors();
  const me = useCrew();
  const { signOut } = useClerk();
  const board = useQ(api.clock.board);
  const posts = useQ(api.posts.all);
  const unpaidMin = board?.sessions.filter((s) => !s.paid).reduce((a, s) => a + s.minutes, 0) ?? 0;
  const drafts = posts?.filter((p) => !p.published).length ?? 0;

  const link = (href: Href, icon: keyof typeof Ionicons.glyphMap, title: string, sub: string) => (
    <Card onPress={() => router.push(href)}>
      <Row gap={12}>
        <Ionicons name={icon} size={24} color={c.accent} />
        <H3 style={{ flex: 1 }}>{title}</H3>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Row>
      <Muted>{sub}</Muted>
    </Card>
  );

  return (
    <Screen>
      <Label>Signed in as {me.name}{DEMO ? " · demo mode, nothing saves" : ""}</Label>
      {link("/sprint", "checkbox-outline", "Sprint & public progress", "Two-week task list, and the progress bars on the front page")}
      {link("/posts", "images-outline", "Build log posts", `Write updates with photos from the shop${drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}`)}
      {link("/payroll", "cash-outline", "Payroll", `What each person is owed · ${fmtH(unpaidMin)} unpaid hrs${me.canPay ? "" : " · Jennifer marks these paid"}`)}
      {link("/home", "car-sport-outline", "The public side", "What everyone else sees: story, progress, build log, adopt a part")}
      <Btn title="Open the shop board on the web" onPress={() => Linking.openURL(PROJECT.siteUrl + "/shop")} />
      <Btn title="Sign out" kind="quiet" onPress={() => signOut()} />
      <Muted style={{ textAlign: "center" }}>Trans Am {Constants.expoConfig?.version ?? ""}</Muted>
    </Screen>
  );
}
