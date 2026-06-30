import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/src/context/AppContext";
import { Exams } from "@/src/api";

export default function Progress() {
  const { examId, topicStatus } = useApp();
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!examId) return;

    Exams.topics(examId)
      .then((r) => setSubjects(r.subjects))
      .catch(() => {});
  }, [examId]);

  const stats = useMemo(() => {
    let total = 0, done = 0;

    subjects.forEach((s) =>
      s.chapters.forEach((c: any) =>
        c.topics.forEach((t: any) => {
          total++;
          if (topicStatus[t.id] === "done") done++;
        })
      )
    );

    return { total, done };
  }, [subjects, topicStatus]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        <Text>{stats.done} / {stats.total}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
});