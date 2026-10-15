import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuth, useUser } from "@clerk/expo";
import { useDemo, useMe } from "@/lib/data";
import { confirm, notify } from "@/lib/confirm";
import { PROJECT, SUPPORT_EMAIL } from "@/lib/site";
import { useColors } from "@/lib/theme";
import { Btn, Card, H3, Label, Muted, P, Screen } from "@/components/ui";

/**
 * Who's signed in, sign out, and delete the account (App Store 5.1.1(v); Play's account-deletion
 * policy, whose web half is firebird.crewchiefsteve.com/delete-account). Deleting the Clerk user
 * is the whole mechanism: Convex keys the crew on email, so no backend row points at the Clerk id.
 * The shop's books (hours, receipts, posts, payments) belong to the project and stay.
 */
export default function Account() {
  const c = useColors();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const me = useMe();
  const demo = useDemo();
  const [busy, setBusy] = useState<"out" | "delete" | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const onCrew = !!me?.crew && !demo;

  async function out() {
    setBusy("out");
    try { await signOut(); router.replace("/home"); }
    finally { setBusy(null); }
  }

  async function del() {
    const ok = await confirm(
      "Delete your account?",
      "This permanently deletes your Trans Am sign-in. It can’t be undone." +
        (onCrew
          ? "\n\nThe shop’s books stay with the project: hours you logged, receipts, posts and payments. Jennifer needs them to settle up. Ask Steve if you want something specific removed."
          : "\n\nNothing else is stored about you."),
      "Delete account",
      true,
    );
    if (!ok || !user) return;
    setBusy("delete");
    try {
      await user.delete();
      await signOut().catch(() => {});
      router.replace("/home");
      notify("Account deleted", "Your sign-in is gone. The story, build log and parts list still work without one.");
    } catch {
      notify("Couldn’t delete it just now", `Try again, or email ${SUPPORT_EMAIL} and we’ll do it for you.`);
    } finally { setBusy(null); }
  }

  const links = (
    <View style={{ gap: 10 }}>
      <Btn title="Privacy policy" kind="quiet" onPress={() => WebBrowser.openBrowserAsync(PROJECT.siteUrl + "/privacy")} />
      <Btn title="Help and support" kind="quiet" onPress={() => WebBrowser.openBrowserAsync(PROJECT.siteUrl + "/support")} />
      <Btn title={`Email ${SUPPORT_EMAIL}`} kind="quiet" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
    </View>
  );

  if (!isSignedIn) {
    return (
      <Screen>
        <P>You’re not signed in. Only the crew has accounts; everything else in the app works without one.</P>
        <Btn title="Crew sign-in" kind="primary" onPress={() => router.replace("/crew")} />
        {links}
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Label>Signed in as</Label>
        <P>{email}</P>
        <Muted>{demo ? "App Review account · the crew screens show sample data" : onCrew ? `${me!.crew!.name} · on the crew` : "Not on the crew list"}</Muted>
      </Card>
      <Btn title="Sign out" busy={busy === "out"} onPress={out} />

      <Card style={{ gap: 10 }}>
        <H3>Delete account</H3>
        <P>Removes your sign-in for good. You can also ask on the web at firebird.crewchiefsteve.com/delete-account.</P>
        <Btn title="Delete my account" kind="danger" busy={busy === "delete"} onPress={del} />
      </Card>

      {links}
      <Muted style={{ textAlign: "center", color: c.muted }}>© 2026 CrewChiefSteve Technologies, Inc.</Muted>
    </Screen>
  );
}
