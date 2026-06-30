import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "@/src/context/AppContext";
import { colors, spacing } from "@/src/theme";

export default function More() {
  const router = useRouter();
  const { user, signOut } = useApp();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        <Text>{user?.full_name || "Guest"}</Text>

        {!user && (
          <Pressable onPress={() => router.push("/auth/sign-in")}>
            <Text>Sign in / Sign up</Text>
          </Pressable>
        )}

        {user && (
          <Pressable onPress={signOut}>
            <Text style={{ color: "red" }}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg },
});