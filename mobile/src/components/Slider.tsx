import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { F, useColors } from "@/lib/theme";

/**
 * 0–100 in steps of 5, no native dependency: tap or drag along the bar, or nudge with − and +.
 * `onDone` fires once the value has sat still for a moment, so a drag is one write, not twenty.
 */
export default function Slider({ value, onChange, onDone }: { value: number; onChange: (v: number) => void; onDone: (v: number) => void }) {
  const c = useColors();
  const [width, setWidth] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = (v: number) => {
    const next = Math.max(0, Math.min(100, Math.round(v / 5) * 5));
    onChange(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onDone(next), 600);
  };
  const fromTouch = (e: GestureResponderEvent) => commit((e.nativeEvent.locationX / width) * 100);
  const nudge = (d: number) => (
    <Pressable onPress={() => commit(value + d)} hitSlop={6} accessibilityLabel={d < 0 ? "Less" : "More"}
      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.sans7, fontSize: 18, color: c.ink }}>{d < 0 ? "−" : "+"}</Text>
    </Pressable>
  );

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {nudge(-5)}
      <View
        style={{ flex: 1, height: 40, justifyContent: "center" }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width || 1)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={fromTouch}
        onResponderMove={fromTouch}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => commit(value + (e.nativeEvent.actionName === "increment" ? 5 : -5))}
      >
        <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }}>
          <View style={{ width: `${value}%`, height: "100%", backgroundColor: c.oxide }} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: `${value}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface, borderWidth: 3, borderColor: c.oxide }} />
      </View>
      {nudge(5)}
    </View>
  );
}
