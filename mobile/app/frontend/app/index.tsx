import { useEffect } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "@/src/context/AppContext";
import { colors } from "@/src/theme";

export default function Index() {
  const router = useRouter();

  const { ready, examId, goal, timelineDays } = useApp();

  useEffect(() => {
    if (!ready) return;

    const onboarded =
      !!examId && !!goal && !!timelineDays;

    router.replace(
      onboarded ? "/(tabs)" : "/onboarding/exam"
    );
  }, [ready, examId, goal, timelineDays, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});