import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";

export default function Settings() {
  const router = useRouter();

  const { resetOnboarding, examId, goal, timelineDays } =
    useApp();

  const handleReset = async () => {
    await resetOnboarding();
    router.replace("/onboarding/exam");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>

        <Text style={type.label}>Configure</Text>
        <Text style={type.h1}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.label}>Current plan</Text>

          <Text>Exam: {examId}</Text>
          <Text>Goal: {goal}</Text>
          <Text>Timeline: {timelineDays} days</Text>
        </View>

        <Pressable onPress={handleReset} style={styles.cta}>
          <Text>Reset</Text>
        </Pressable>

        <Text style={styles.footer}>
          {"Exam Prep Portal · v1.0\nAll checklists free, forever."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 16 },
  scroll: { padding: 16 },
  section: { marginBottom: 16 },
  label: { fontWeight: "600" },
  cta: { marginTop: 16 },
  back: { marginBottom: 8 },
  footer: { marginTop: 40, textAlign: "center" },
});