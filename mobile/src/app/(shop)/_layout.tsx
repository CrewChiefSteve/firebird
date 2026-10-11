import { Redirect, Stack } from "expo-router";
import { useMe } from "@/lib/data";
import { CrewContext } from "@/lib/crew";
import { F, useColors } from "@/lib/theme";
import { Loading } from "@/components/ui";

/** Everything under (shop) is crew-only, same rule as /shop on the website. */
export default function ShopLayout() {
  const c = useColors();
  const me = useMe();
  if (me === undefined) return <Loading text="Connecting to the shop…" />;
  if (!me.crew) return <Redirect href="/crew" />;

  return (
    <CrewContext.Provider value={me.crew}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bar },
          headerTintColor: c.barInk,
          headerTitleStyle: { fontFamily: F.cond, fontSize: 20 },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sprint" options={{ title: "Sprint & progress" }} />
        <Stack.Screen name="payroll" options={{ title: "Payroll" }} />
        <Stack.Screen name="posts" options={{ title: "Build log posts" }} />
        <Stack.Screen name="post-edit" options={{ title: "Post", presentation: "modal" }} />
      </Stack>
    </CrewContext.Provider>
  );
}
