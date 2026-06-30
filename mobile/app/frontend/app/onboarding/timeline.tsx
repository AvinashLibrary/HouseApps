import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, type } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";

const PRESETS = [
  { days: 30, label: "30 days", sub: "Sprint mode", icon: "zap" as const },
  { days: 60, label: "60 days", sub: "Crash plan", icon: "trending-up" as const },
  { days: 90, label: "90 days", sub: "Standard", icon: "calendar" as const },
  { days: 180, label: "6 months", sub: "Comfortable", icon: "sun" as const },
  { days: 365, label: "1 year", sub: "Foundation", icon: "book-open" as const },
];

export default function TimelinePicker() {
  const router = useRouter();
  const { setTimeline, timelineDays } = useApp();

  const [selected, setSelected] = useState<number | null>(timelineDays);

  const onContinue = async () => {
    if (!selected) return;
    await setTimeline(selected);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>

        <Text style={type.label}>Step 3 of 3</Text>
        <Text style={[type.h1, { marginTop: spacing.xs }]}>
          How long do you have?
        </Text>

        <Text
          style={[
            type.body,
            { color: colors.textMuted, marginTop: spacing.sm },
          ]}
        >
          We slice your syllabus into weekly chunks based on this.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {PRESETS.map((p) => {
          const active = selected === p.days;

          return (
            <Pressable
              key={p.days}
              onPress={() => setSelected(p.days)}
              style={[styles.card, active && styles.cardActive]}
            >
              <Feather
                name={p.icon}
                size={20}
                color={active ? colors.brand : colors.textMuted}
              />

              <View style={{ flex: 1 }}>
                <Text style={[type.h3, { fontSize: 18 }]}>
                  {p.label}
                </Text>
                <Text style={type.small}>{p.sub}</Text>
              </View>

              <Feather
                name={active ? "check-circle" : "circle"}
                size={22}
                color={active ? colors.brand : colors.borderStrong}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={!selected}
          onPress={onContinue}
          style={[styles.cta, !selected && { opacity: 0.4 }]}
        >
          <Text style={styles.ctaText}>Generate my plan</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
    marginBottom: spacing.sm,
  },

  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardActive: {
    borderColor: colors.brand,
    borderWidth: 2,
  },

  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },

  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
