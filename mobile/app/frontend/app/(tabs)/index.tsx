import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";
import { Exams } from "@/src/api";

const EXAM_LABELS: Record<string, { name: string; date: string }> = {
  neet: { name: "NEET", date: "2026-05-03" },
  upsc: { name: "UPSC CSE", date: "2026-06-07" },
  sbi_po: { name: "SBI PO", date: "2026-04-12" },
  sbi_clerk: { name: "SBI Clerk", date: "2026-03-15" },
};

export default function Dashboard() {
  const router = useRouter();
  const { examId, goal, timelineDays, topicStatus, streakDays, bumpStreak, user } = useApp();

  const [totalTopics, setTotalTopics] = useState(0);
  const [todayTopic, setTodayTopic] = useState<{ name: string; subject: string } | null>(null);

  useEffect(() => {
    bumpStreak();
  }, []);

  useEffect(() => {
    if (!examId) return;

    Exams.topics(examId)
      .then((r) => {
        const flat: any[] = [];
        r.subjects.forEach((s: any) =>
          s.chapters.forEach((c: any) =>
            c.topics.forEach((t: any) =>
              flat.push({ ...t, subject: s.subject })
            )
          )
        );

        setTotalTopics(flat.length);

        const undone = flat.find((t) => topicStatus[t.id] !== "done");
        if (undone) {
          setTodayTopic({ name: undone.name, subject: undone.subject });
        }
      })
      .catch(() => {});
  }, [examId, topicStatus]);

  const done = useMemo(
    () => Object.values(topicStatus).filter((v) => v === "done").length,
    [topicStatus]
  );

  const pct = totalTopics
    ? Math.round((done / totalTopics) * 100)
    : 0;

  const exam = examId ? EXAM_LABELS[examId] : null;

  const daysToExam = exam
    ? Math.max(
        0,
        Math.ceil(
          (new Date(exam.date).getTime() - Date.now()) /
            86400000
        )
      )
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        <Text>{user?.full_name || "Aspirant"}</Text>
        <Text>{daysToExam} days left</Text>
        <Text>{pct}% progress</Text>

        <Pressable onPress={() => router.push("/checklist")}>
          <Text>{todayTopic?.name || "All done today"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg },
});