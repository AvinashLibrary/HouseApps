import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "@/src/context/AppContext";
import { Exams } from "@/src/api";

export default function Plan() {
  const { examId, goal, timelineDays } = useApp();

  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    if (!examId || !goal || !timelineDays) return;

    Exams.plan(examId, goal, timelineDays)
      .then(setPlan)
      .catch(() => {});
  }, [examId, goal, timelineDays]);

  return (
    <SafeAreaView>
      <ScrollView>
        {(plan?.weeks || []).map((w: any) => (
          <View key={w.week}>
            <Text>Week {w.week}</Text>

            {w.topics.map((t: any) => (
              <Text key={t.id}>{t.name}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}