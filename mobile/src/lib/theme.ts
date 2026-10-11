import { useColorScheme } from "react-native";

/** Same tokens as app/public.css and app/shop.css on the website. */
const light = {
  bg: "#E9E8E4",
  paper: "#F7F6F2",
  surface: "#FFFFFF",
  surface2: "#F3F2EE",
  ink: "#1B1A18",
  ink2: "#4A4742",
  muted: "#7A766F",
  line: "#CFCCC5",
  oxide: "#B5432A",
  oxideDeep: "#8E3320",
  gold: "#C89B3C",
  goldInk: "#1B1400",
  accent: "#B98A1E",
  accentSoft: "#F3E7C6",
  good: "#2E7D4F",
  goodSoft: "#DDF0E4",
  warn: "#B45309",
  warnSoft: "#FBE7CF",
  crit: "#B3261E",
  critSoft: "#F8DAD7",
  info: "#2B5FAA",
  infoSoft: "#DCE6F7",
  done: "#2F6B46",
  later: "#A6A29B",
  bar: "#16191D",
  barInk: "#ECEEF1",
  // Fills behind white text: the same in both themes so the label stays readable.
  goodSolid: "#2E7D4F",
  critSolid: "#B3261E",
};

const dark: typeof light = {
  bg: "#17181A",
  paper: "#202225",
  surface: "#1E2228",
  surface2: "#242930",
  ink: "#EEECE7",
  ink2: "#C9C5BD",
  muted: "#8F8B84",
  line: "#33363A",
  oxide: "#D8613F",
  oxideDeep: "#B5432A",
  gold: "#E0B04A",
  goldInk: "#1B1400",
  accent: "#E0B04A",
  accentSoft: "#3A3117",
  good: "#5BBF85",
  goodSoft: "#1E3A2A",
  warn: "#F0A04B",
  warnSoft: "#3F2C15",
  crit: "#F07A72",
  critSoft: "#432322",
  info: "#7FA6E8",
  infoSoft: "#1F2D45",
  done: "#5FB57F",
  later: "#5E5B56",
  bar: "#101215",
  barInk: "#ECEEF1",
  goodSolid: "#2E7D4F",
  critSolid: "#B3261E",
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

/** Font family names, registered in app/_layout.tsx. */
export const F = {
  disp: "BigShouldersDisplay_800ExtraBold",
  disp7: "BigShouldersDisplay_700Bold",
  cond: "BarlowCondensed_700Bold",
  cond6: "BarlowCondensed_600SemiBold",
  sans: "Barlow_400Regular",
  sans5: "Barlow_500Medium",
  sans6: "Barlow_600SemiBold",
  sans7: "Barlow_700Bold",
  serif: "SourceSerif4_400Regular",
  serifI: "SourceSerif4_400Regular_Italic",
  serif6: "SourceSerif4_600SemiBold",
  mono: "JetBrainsMono_600SemiBold",
  mono4: "JetBrainsMono_400Regular",
} as const;
