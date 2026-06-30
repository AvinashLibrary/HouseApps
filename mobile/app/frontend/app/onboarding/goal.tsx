import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, type } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";

const GOALS = [
  {
    id: "top_rank",
    label: "Top Rank",
    desc: "Aim for AIR <1000. Intensive, high-frequency topics first.",
    icon: "award" as const,
  },
  {
    id: "safe_pass",
    label: "Safe Qualify",
    desc: "Comfortable cutoff. Balanced coverage of all subjects.",
    icon: "check-circle" as const,
  },
  {
    id: "first_timer",
    label: "First Timer",
    desc: "Building foundation. Subject-by-subject, no skipping.",
    icon: "compass" as const,
  },
];

export default function GoalPicker() {
  const router = useRouter();
  const { setGoal, goal } = useApp();

  const [selected, setSelected] = useState<string | null>(goal);

  const onContinue = async () => {
    if (!selected) return;
    await setGoal(selected);
    router.push("/onboarding/timeline");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>

        <Text style={type.label}>Step 2 of 3</Text>
        <Text style={[type.h1, { marginTop: spacing.xs }]}>
          What's your goal?
        </Text>

        <Text
          style={[
            type.body,
            { color: colors.textMuted, marginTop: spacing.sm },
          ]}
        >
          We'll calibrate the plan's intensity to match.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map((g) => {
          const active = selected === g.id;

          return (
            <Pressable
              key={g.id}
              onPress={() => setSelected(g.id)}
              style={[styles.card, active && styles.cardActive]}
            >
              <View
                style={[
                  styles.iconWrap,
                  active && { backgroundColor: colors.brandSoft },
                ]}
              >
                <Feather
                  name={g.icon}
                  size={22}
                  color={active ? colors.brand : colors.textMuted}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[type.h3, { fontSize: 18 }]}>
                  {g.label}
                </Text>
                <Text
                  style={[
                    type.small,
                    { marginTop: spacing.xs, lineHeight: 18 },
                  ]}
                >
                  {g.desc}
                </Text>
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
          <Text style={styles.ctaText}>Continue</Text>
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

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    alignItems: "center",
    justifyContent: "center",
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
