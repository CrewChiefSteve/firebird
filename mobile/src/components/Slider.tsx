import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { F, useColors } from "@/lib/theme";

/**
 * 0–100 in steps of 5, no native dependency: tap the bar, drag along it, or nudge with − and +.
 * Only a sideways drag moves it, so scrolling the page past a slider leaves it alone.
 * `onDone` fires once the value has sat still for a moment, so a drag is one write, not twenty.
 */
export default function Slider({ value, onChange, onDone }: { value: number; onChange: (v: number) => void; onDone: (v: number) => void }) {
  const c = useColors();
  const width = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const latest = useRef({ onChange, onDone });
  latest.current = { onChange, onDone };
  const commit = (v: number) => {
    const next = Math.max(0, Math.min(100, Math.round(v / 5) * 5));
    latest.current.onChange(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current.onDone(next), 600);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const pan = useMemo(() => PanResponder.create({
    // Never claim the touch on contact (that's how a scroll would get eaten); only once it's clearly sideways.
    onStartShouldSetPanResponder: () => false,
    // Capture phase, so a sideways drag wins over the bar's own tap handler.
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => setDragging(true),
    onPanResponderMove: (e) => commitRef.current((e.nativeEvent.locationX / width.current) * 100),
    onPanResponderRelease: () => setDragging(false),
    onPanResponderTerminate: () => setDragging(false),
    onPanResponderTerminationRequest: () => false,
  }), []);

  const tap = (e: GestureResponderEvent) => commit((e.nativeEvent.locationX / width.current) * 100);
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
        onLayout={(e) => { width.current = e.nativeEvent.layout.width || 1; }}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => commit(value + (e.nativeEvent.actionName === "increment" ? 5 : -5))}
      >
        <Pressable onPress={tap} style={{ height: 40, justifyContent: "center" }}>
          <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }}>
            <View style={{ width: `${value}%`, height: "100%", backgroundColor: c.oxide }} />
          </View>
          <View pointerEvents="none" style={{ position: "absolute", left: `${value}%`, marginLeft: dragging ? -14 : -11, width: dragging ? 28 : 22, height: dragging ? 28 : 22, borderRadius: 14, backgroundColor: c.surface, borderWidth: 3, borderColor: c.oxide }} />
        </Pressable>
      </View>
      {nudge(5)}
    </View>
  );
}
