import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed/600SemiBold";
import { BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed/700Bold";
import { Barlow_400Regular } from "@expo-google-fonts/barlow/400Regular";
import { Barlow_500Medium } from "@expo-google-fonts/barlow/500Medium";
import { Barlow_600SemiBold } from "@expo-google-fonts/barlow/600SemiBold";
import { Barlow_700Bold } from "@expo-google-fonts/barlow/700Bold";
import { SourceSerif4_400Regular } from "@expo-google-fonts/source-serif-4/400Regular";
import { SourceSerif4_400Regular_Italic } from "@expo-google-fonts/source-serif-4/400Regular_Italic";
import { SourceSerif4_600SemiBold } from "@expo-google-fonts/source-serif-4/600SemiBold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono/600SemiBold";
import { F, useColors } from "@/lib/theme";
import { errText } from "@/lib/format";
import { REVIEW_EMAIL, setReviewDemo } from "@/lib/data";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** A screen that throws (say, a query the backend doesn't have yet) gets this instead of a blank or red page. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontFamily: "BarlowCondensed_700Bold", fontSize: 28, textTransform: "uppercase", color: c.ink }}>Something went sideways</Text>
      <Text style={{ fontSize: 15, lineHeight: 21, color: c.ink2 }}>This screen couldn’t load. Check the connection and try again. If it keeps happening, tell Steve what you were doing.</Text>
      <Text selectable style={{ fontSize: 12, color: c.muted }}>{errText(error)}</Text>
      <Pressable onPress={retry} style={{ backgroundColor: c.ink, borderRadius: 6, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: c.bg, fontWeight: "700", fontSize: 15 }}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** The store-review account sees sample data (see useDemo in lib/data.ts). */
function ReviewMode() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  useEffect(() => { setReviewDemo(!!REVIEW_EMAIL && email === REVIEW_EMAIL); }, [email]);
  return null;
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  const c = useColors();
  const [loaded, error] = useFonts({
    BigShouldersDisplay_700Bold: require("@expo-google-fonts/big-shoulders-display/BigShouldersDisplay_700Bold.ttf"),
    BigShouldersDisplay_800ExtraBold: require("@expo-google-fonts/big-shoulders-display/BigShouldersDisplay_800ExtraBold.ttf"),
    BarlowCondensed_600SemiBold, BarlowCondensed_700Bold,
    Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold,
    SourceSerif4_400Regular, SourceSerif4_400Regular_Italic, SourceSerif4_600SemiBold,
    JetBrainsMono_400Regular, JetBrainsMono_600SemiBold,
  });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ReviewMode />
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bar },
            headerTintColor: c.barInk,
            headerTitleStyle: { fontFamily: F.cond, fontSize: 20 },
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen name="(shop)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[slug]" options={{ title: "Build log" }} />
          <Stack.Screen name="account" options={{ title: "Your account" }} />
        </Stack>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
