import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { Digest } from "@/src/api";

export default function DigestScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Digest.list()
      .then((r) => setItems(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tagColor: Record<string, { bg: string; fg: string }> = {
    Trend: { bg: colors.pillBlue, fg: colors.pillBlueText },
    PYQ: { bg: colors.pillGreen, fg: colors.pillGreenText },
    Strategy: { bg: colors.pillYellow, fg: colors.pillYellowText },
    Revision: { bg: colors.brandSoft, fg: colors.brand },
    Mains: { bg: colors.pillRed, fg: colors.pillRedText },
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>

        <Text style={type.label}>This week</Text>
        <Text style={type.h1}>Digest</Text>

        <Text style={[type.body, styles.muted]}>
          Hand-picked content from YouTube, PYQs and topper notes.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          items.map((it) => {
            const t = tagColor[it.tag] || tagColor.Strategy;

            return (
              <Pressable key={it.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.tag, { backgroundColor: t.bg }]}>
                    <Text style={[styles.tagText, { color: t.fg }]}>
                      {it.tag}
                    </Text>
                  </View>

                  <Text style={type.small}>
                    {it.exam} · {it.minutes} min
                  </Text>
                </View>

                <Text style={styles.title}>{it.title}</Text>
                <Text style={type.small}>{it.source}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  back: {
    width: 36,
    height: 36,
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  muted: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  scroll: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  card: {
    backgroundColor: colors.surface2,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },

  tagText: {
    fontSize: 11,
    fontWeight: "700",
  },

  title: {
    marginTop: spacing.sm,
    fontWeight: "600",
  },
});