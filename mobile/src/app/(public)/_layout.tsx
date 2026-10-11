import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { F, useColors } from "@/lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const tab = (title: string, icon: Icon) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color as string} size={size} />,
});

export default function PublicTabs() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bar },
        headerTintColor: c.barInk,
        headerTitleStyle: { fontFamily: F.cond, fontSize: 20 },
        tabBarActiveTintColor: c.oxide,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: F.sans6, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ ...tab("The car", "car-sport-outline"), headerShown: false }} />
      <Tabs.Screen name="log" options={tab("Build log", "newspaper-outline")} />
      <Tabs.Screen name="adopt" options={tab("Adopt a part", "pricetags-outline")} />
      <Tabs.Screen name="crew" options={tab("Crew", "construct-outline")} />
    </Tabs>
  );
}
