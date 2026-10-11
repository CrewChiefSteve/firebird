import { Linking, Text, View } from "react-native";
import { parse, type Span } from "@/lib/md";
import { F, useColors } from "@/lib/theme";

export function Markdown({ text }: { text: string }) {
  const c = useColors();
  const spans = (ss: Span[]) =>
    ss.map((s, i) => (
      <Text
        key={i}
        onPress={s.href ? () => Linking.openURL(s.href!) : undefined}
        style={[
          s.bold && { fontFamily: F.serif6 },
          s.italic && { fontFamily: F.serifI },
          s.href ? { color: c.oxide, textDecorationLine: "underline" } : null,
        ]}
      >
        {s.text}
      </Text>
    ));
  const body = { fontFamily: F.serif, fontSize: 17, lineHeight: 27, color: c.ink } as const;
  return (
    <View style={{ gap: 14 }}>
      {parse(text).map((b, i) =>
        b.kind === "p" ? (
          <Text key={i} selectable style={body}>{spans(b.spans)}</Text>
        ) : (
          <View key={i} style={{ gap: 6 }}>
            {b.items.map((it, j) => (
              <View key={j} style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
                <Text style={[body, { color: c.oxide }]}>•</Text>
                <Text selectable style={[body, { flex: 1 }]}>{spans(it)}</Text>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}
