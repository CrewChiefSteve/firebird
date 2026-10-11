import { ReactNode, createContext, useContext, useEffect, useRef } from "react";
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleProp, Text, TextInput,
  TextInputProps, TextStyle, View, ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { F, useColors } from "@/lib/theme";
import { addDays, dayLabel, todayIso } from "@/lib/format";

/** Scrolling page body with the page background and room at the bottom. */
export function Screen({ children, pad = true, style }: { children: ReactNode; pad?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // Android draws edge to edge, so the window no longer shrinks for the keyboard: pad for it here.
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: pad ? 16 : 0, paddingBottom: 48 + insets.bottom, gap: 14 }, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type TProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number; selectable?: boolean };

export function Label({ children, style }: TProps) {
  const c = useColors();
  return <Text style={[{ fontFamily: F.sans6, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: c.muted }, style]}>{children}</Text>;
}
export function Display({ children, style, numberOfLines }: TProps) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.disp, fontSize: 40, lineHeight: 40, textTransform: "uppercase", color: c.ink }, style]}>{children}</Text>;
}
export function H2({ children, style }: TProps) {
  const c = useColors();
  return <Text style={[{ fontFamily: F.cond, fontSize: 22, letterSpacing: 0.6, textTransform: "uppercase", color: c.ink }, style]}>{children}</Text>;
}
export function H3({ children, style, numberOfLines }: TProps) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.sans7, fontSize: 16, color: c.ink }, style]}>{children}</Text>;
}
export function Body({ children, style, selectable }: TProps) {
  const c = useColors();
  return <Text selectable={selectable} style={[{ fontFamily: F.serif, fontSize: 17, lineHeight: 26, color: c.ink }, style]}>{children}</Text>;
}
export function P({ children, style, numberOfLines }: TProps) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.sans, fontSize: 15, lineHeight: 21, color: c.ink }, style]}>{children}</Text>;
}
export function Muted({ children, style, numberOfLines }: TProps) {
  const c = useColors();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.sans, fontSize: 13, lineHeight: 18, color: c.muted }, style]}>{children}</Text>;
}
export function Num({ children, style }: TProps) {
  const c = useColors();
  return <Text style={[{ fontFamily: F.mono, fontSize: 15, color: c.ink, fontVariant: ["tabular-nums"] }, style]}>{children}</Text>;
}

/** White panel. `accent` draws the colored stripe the website uses for a person or a priority. */
export function Card({ children, accent, style, onPress }: { children: ReactNode; accent?: string; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const inner = (
    <InRow.Provider value={false}>
    <View style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: accent ?? c.line, borderRadius: 8, padding: 14, gap: 8, overflow: "hidden" }, style]}>
      {accent && <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accent }} />}
      {children}
    </View>
    </InRow.Provider>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{inner}</Pressable> : inner;
}

export function Section({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <H2>{title}</H2>
          {hint ? <Muted>{hint}</Muted> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Stat({ label, value, unit, foot, accent, tone }: { label: string; value: string; unit?: string; foot?: string; accent?: string; tone?: "hot" | "crit" }) {
  const c = useColors();
  const border = tone === "crit" ? c.crit : tone === "hot" ? c.accent : accent;
  return (
    <Card accent={border} style={{ flex: 1, minWidth: 150, gap: 2, backgroundColor: tone === "crit" ? c.critSoft : c.surface }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontFamily: F.cond, fontSize: 34, color: tone === "crit" ? c.crit : c.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
        {unit ? <Muted style={{ fontSize: 15 }}>{unit}</Muted> : null}
      </View>
      {foot ? <Muted numberOfLines={2}>{foot}</Muted> : null}
    </Card>
  );
}

// Fields placed side by side in a Row split the width evenly instead of sizing to what's typed.
const InRow = createContext(false);

export function Row({ children, gap = 8, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <InRow.Provider value>
      <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>
    </InRow.Provider>
  );
}

function useFieldBox(): ViewStyle {
  return useContext(InRow) ? { gap: 6, flex: 1, minWidth: 0 } : { gap: 6, alignSelf: "stretch" };
}

type BtnKind = "primary" | "default" | "quiet" | "good" | "danger" | "gold";
export function Btn({ title, onPress, kind = "default", small, disabled, busy, style, icon }: {
  title: string; onPress?: () => void; kind?: BtnKind; small?: boolean; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; icon?: ReactNode;
}) {
  const c = useColors();
  const bg = { primary: c.ink, default: c.surface2, quiet: "transparent", good: c.goodSolid, danger: c.critSolid, gold: c.gold }[kind];
  const fg = { primary: c.bg, default: c.ink, quiet: c.ink2, good: "#fff", danger: "#fff", gold: c.goldInk }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: 6, paddingVertical: small ? 7 : 12, paddingHorizontal: small ? 10 : 16,
        borderWidth: kind === "default" ? 1 : 0, borderColor: c.line, opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: small ? 34 : 46,
      }, style]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={{ fontFamily: F.sans7, fontSize: small ? 13 : 15, color: fg, letterSpacing: 0.3 }}>{title}</Text>
    </Pressable>
  );
}

export type Tone = "crit" | "critSolid" | "warn" | "info" | "good" | "gold" | "muted";
export function Pill({ text, tone = "muted", onPress }: { text: string; tone?: Tone; onPress?: () => void }) {
  const c = useColors();
  const [bg, fg] = {
    crit: [c.critSoft, c.crit], critSolid: [c.critSolid, "#fff"], warn: [c.warnSoft, c.warn], info: [c.infoSoft, c.info],
    good: [c.goodSoft, c.good], gold: [c.accentSoft, c.accent], muted: [c.line, c.muted],
  }[tone];
  const body = (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: F.sans7, fontSize: 11, letterSpacing: 0.7, textTransform: "uppercase", color: fg }}>{text}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} hitSlop={8}>{body}</Pressable> : body;
}

/** A row of tappable options; stands in for the website's <select>. */
export function Chips<T extends string | number>({ options, value, onChange, label }: {
  options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
        {options.map(([v, text]) => {
          const on = v === value;
          return (
            <Pressable
              key={String(v)}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{ borderRadius: 999, borderWidth: 1, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontFamily: F.sans6, fontSize: 13, color: on ? c.bg : c.ink }}>{text}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const c = useColors();
  const box = useFieldBox();
  return (
    <View style={box}>
      {label ? <Label>{label}{hint ? <Text style={{ textTransform: "none", letterSpacing: 0, fontFamily: F.sans }}>  {hint}</Text> : null}</Label> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[{
          fontFamily: F.sans, fontSize: 16, color: c.ink, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 6,
          paddingHorizontal: 12, paddingVertical: 10, minHeight: 46, textAlignVertical: props.multiline ? "top" : "center",
        }, props.multiline ? { minHeight: 96 } : null, style]}
      />
    </View>
  );
}

/** A day picker without a native dependency: step back and forward a day at a time. */
export function DateField({ label, value, onChange, allowFuture }: { label?: string; value: string; onChange: (iso: string) => void; allowFuture?: boolean }) {
  const c = useColors();
  const box = useFieldBox();
  const atToday = value >= todayIso();
  const step = (n: number) => onChange(addDays(value, n));
  const btn = (text: string, n: number, disabled = false) => (
    <Pressable onPress={() => step(n)} disabled={disabled} hitSlop={6} accessibilityLabel={n < 0 ? "Day before" : "Day after"}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ fontFamily: F.sans7, fontSize: 20, color: c.ink }}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={box}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 6, minHeight: 46 }}>
        {btn("‹", -1)}
        <Pressable onPress={() => onChange(todayIso())} style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontFamily: F.sans6, fontSize: 15, color: c.ink }}>{dayLabel(value)}</Text>
        </Pressable>
        {btn("›", 1, !allowFuture && atToday)}
      </View>
    </View>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12, backgroundColor: c.bg }}>
      <ActivityIndicator color={c.oxide} />
      <Muted>{text}</Muted>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ padding: 18, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, alignItems: "center" }}>
      <Muted style={{ textAlign: "center" }}>{children}</Muted>
    </View>
  );
}

export function Msg({ text }: { text: string }) {
  const c = useColors();
  if (!text) return null;
  return (
    <View style={{ backgroundColor: c.accentSoft, borderRadius: 6, padding: 10 }}>
      <P style={{ color: c.ink }}>{text}</P>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
}

/** Slide-up panel for forms. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // Android's back button hides the keyboard and asks the sheet to close in the same press. Treat a close
  // request that lands with the keyboard up, or just after it went down, as "hide the keyboard" only, so a
  // half-filled form isn't thrown away. A second press closes.
  const kb = useRef({ up: false, downAt: 0 });
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => { kb.current.up = true; });
    const hide = Keyboard.addListener("keyboardDidHide", () => { kb.current = { up: false, downAt: Date.now() }; });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const requestClose = () => {
    if (kb.current.up || Date.now() - kb.current.downAt < 400) return Keyboard.dismiss();
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={requestClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,.45)" }} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%", paddingBottom: insets.bottom + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
            <H2 style={{ flex: 1 }}>{title}</H2>
            <Btn title="Close" kind="quiet" small onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }} keyboardShouldPersistTaps="handled">
            <InRow.Provider value={false}>{children}</InRow.Provider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
