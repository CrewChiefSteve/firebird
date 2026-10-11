import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@convex/_generated/api";
import { useQ } from "@/lib/data";
import { F, useColors } from "@/lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (name: Icon) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function ShopTabs() {
  const c = useColors();
  // Badges: who's on the clock, jobs marked do-now, pledges waiting on Jennifer.
  const board = useQ(api.clock.board);
  const jobs = useQ(api.jobs.list);
  const pledges = useQ(api.pledges.list);
  const onClock = board?.active.length ?? 0;
  const doNow = jobs?.filter((j) => j.status === "open" && j.priority === "now").length ?? 0;
  const waiting = pledges?.filter((p) => p.status === "new").length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bar },
        headerTintColor: c.barInk,
        headerTitleStyle: { fontFamily: F.cond, fontSize: 20 },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: F.sans6, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: c.crit, fontFamily: F.sans7, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="clock" options={{ title: "Time clock", tabBarLabel: "Clock", tabBarIcon: icon("time-outline"), tabBarBadge: onClock || undefined }} />
      <Tabs.Screen name="jobs" options={{ title: "Job board", tabBarLabel: "Jobs", tabBarIcon: icon("clipboard-outline"), tabBarBadge: doNow || undefined }} />
      <Tabs.Screen name="parts" options={{ title: "Parts & materials", tabBarLabel: "Parts", tabBarIcon: icon("cog-outline"), tabBarBadge: waiting || undefined }} />
      <Tabs.Screen name="ledger" options={{ title: "Ledger", tabBarLabel: "Ledger", tabBarIcon: icon("receipt-outline") }} />
      <Tabs.Screen name="more" options={{ title: "Shop", tabBarLabel: "More", tabBarIcon: icon("ellipsis-horizontal-circle-outline") }} />
    </Tabs>
  );
}
