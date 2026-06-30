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
import { useApp, TopicStatus } from "@/src/context/AppContext";
import { Exams } from "@/src/api";

const STATUSES: TopicStatus[] = ["not_started", "done", "revise"];

const statusLabel: Record<TopicStatus, string> = {
  not_started: "Pending",
  done: "Done",
  revise: "Revise",
};

const statusColor: Record<
  TopicStatus,
  { bg: string; fg: string }
> = {
  not_started: { bg: colors.surface3, fg: colors.textMuted },
  done: { bg: colors.pillGreen, fg: colors.pillGreenText },
  revise: { bg: colors.pillYellow, fg: colors.pillYellowText },
};

export default function Checklist() {
  const router = useRouter();
  const { examId, topicStatus, setTopicStatus } = useApp();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    Exams.topics(examId)
      .then((r) => {
        setSubjects(r.subjects);

        const init: Record<string, boolean> = {};
        r.subjects.forEach((s: any, i: number) => {
          if (i === 0) init[s.subject] = true;
        });

        setExpanded(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  const cycleStatus = (id: string) => {
    const current = topicStatus[id] || "not_started";

    const next =
      STATUSES[
        (STATUSES.indexOf(current) + 1) % STATUSES.length
      ];

    setTopicStatus(id, next);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather
            name="chevron-left"
            size={22}
            color={colors.text}
          />
        </Pressable>

        <Text style={type.label}>Tap a topic to update</Text>
        <Text style={type.h1}>Topic checklist</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          subjects.map((s) => {
            let total = 0;
            let done = 0;

            s.chapters.forEach((c: any) =>
              c.topics.forEach((t: any) => {
                total++;

                if (topicStatus[t.id] === "done") {
                  done++;
                }
              })
            );

            const isOpen = expanded[s.subject];

            return (
              <View key={s.subject} style={styles.subjectCard}>
                <Pressable
                  onPress={() =>
                    setExpanded({
                      ...expanded,
                      [s.subject]: !isOpen,
                    })
                  }
                  style={styles.subjectHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectTitle}>
                      {s.subject}
                    </Text>

                    <Text style={type.small}>
                      {done}/{total} topics done
                    </Text>
                  </View>

                  <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>

                {isOpen &&
                  s.chapters.map((c: any) => (
                    <View key={c.name} style={styles.chapter}>
                      <Text style={styles.chapterTitle}>
                        {c.name}
                      </Text>

                      {c.topics.map((t: any) => {
                        const status =
                          (topicStatus[t.id] ||
                            "not_started") as TopicStatus;

                        const col = statusColor[status];

                        const freqCol =
                          t.freq === "High"
                            ? colors.onError
                            : t.freq === "Medium"
                            ? colors.onWarning
                            : colors.textMuted;

                        return (
                          <Pressable
                            key={t.id}
                            style={styles.topic}
                            onPress={() => cycleStatus(t.id)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.topicText}>
                                {t.name}
                              </Text>

                              <Text
                                style={[
                                  type.small,
                                  {
                                    color: freqCol,
                                    marginTop: 2,
                                  },
                                ]}
                              >
                                {t.freq} freq
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.pill,
                                {
                                  backgroundColor: col.bg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pillText,
                                  { color: col.fg },
                                ]}
                              >
                                {statusLabel[status]}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
              </View>
            );
          })
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
    marginBottom: spacing.sm,
  },

  scroll: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  subjectCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },

  subjectTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  chapter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },

  chapterTitle: {
    marginBottom: spacing.sm,
    fontWeight: "600",
  },

  topic: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  topicText: {
    fontWeight: "500",
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },

  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});