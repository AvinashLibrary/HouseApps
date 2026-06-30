import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, type } from "@/src/theme";
import { Exams } from "@/src/api";
import { useApp } from "@/src/context/AppContext";

export default function ExamPicker() {
  const router = useRouter();
  const { setExam, examId } = useApp();

  const [exams, setExams] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(examId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Exams.list()
      .then((r) => setExams(r.exams))
      .catch(() =>
        setExams([
          {
            id: "neet",
            name: "NEET",
            full: "Medical Entrance",
            tag: "Medical",
            color: "#D35400",
          },
          {
            id: "upsc",
            name: "UPSC CSE",
            full: "Civil Services",
            tag: "Civil Services",
            color: "#2E7D32",
          },
          {
            id: "sbi_po",
            name: "SBI PO",
            full: "Probationary Officer",
            tag: "Banking",
            color: "#1A4DB5",
          },
          {
            id: "sbi_clerk",
            name: "SBI Clerk",
            full: "Bank Clerk",
            tag: "Banking",
            color: "#7D5A00",
          },
        ])
      )
      .finally(() => setLoading(false));
  }, []);

  const onContinue = async () => {
    if (!selected) return;
    await setExam(selected);
    router.push("/onboarding/goal");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={type.label}>Step 1 of 3</Text>

        <Text style={[type.h1, { marginTop: spacing.xs }]}>
          Pick your exam
        </Text>

        <Text
          style={[
            type.body,
            { color: colors.textMuted, marginTop: spacing.sm },
          ]}
        >
          We'll build a topic-by-topic plan around it. You can change this
          anytime.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator
            color={colors.brand}
            style={{ marginTop: spacing.xxxl }}
          />
        ) : (
          exams.map((ex) => {
            const active = selected === ex.id;

            return (
              <Pressable
                key={ex.id}
                onPress={() => setSelected(ex.id)}
                style={[styles.card, active && styles.cardActive]}
              >
                <View
                  style={[styles.swatch, { backgroundColor: ex.color }]}
                />

                <View style={{ flex: 1 }}>
                  <Text style={[type.h3, { fontSize: 20 }]}>
                    {ex.name}
                  </Text>

                  <Text style={[type.small, { marginTop: 2 }]}>
                    {ex.full}
                  </Text>

                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{ex.tag}</Text>
                    </View>
                  </View>
                </View>

                <Feather
                  name={active ? "check-circle" : "circle"}
                  size={22}
                  color={
                    active ? colors.brand : colors.borderStrong
                  }
                />
              </Pressable>
            );
          })
        )}
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
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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

  swatch: {
    width: 4,
    height: 56,
    borderRadius: 2,
  },

  tagRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },

  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface3,
    borderRadius: radius.pill,
  },

  tagText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },

  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
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