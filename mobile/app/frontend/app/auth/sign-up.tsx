import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { useApp } from "@/src/context/AppContext";

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setErr(null);

    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.back}
          >
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>

          <Text style={type.label}>Get started</Text>
          <Text style={type.h1}>Create account</Text>

          <Text
            style={[
              type.body,
              {
                color: colors.textMuted,
                marginTop: spacing.xs,
                marginBottom: spacing.xl,
              },
            ]}
          >
            Free forever. No spam. No outbound sales calls. Promise.
          </Text>

          <Text style={type.label}>Full name</Text>
          <TextInput
            testID="name-input"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textSubtle}
          />

          <Text style={[type.label, { marginTop: spacing.lg }]}>Email</Text>
          <TextInput
            testID="email-input"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSubtle}
          />

          <Text style={[type.label, { marginTop: spacing.lg }]}>
            Password
          </Text>
          <TextInput
            testID="password-input"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textSubtle}
          />

          {err && (
            <Text testID="error-msg" style={styles.err}>
              {err}
            </Text>
          )}

          <Pressable
            testID="submit-btn"
            disabled={loading}
            onPress={onSubmit}
            style={[styles.cta, loading && { opacity: 0.5 }]}
          >
            <Text style={styles.ctaText}>
              {loading ? "Creating..." : "Create account"}
            </Text>
          </Pressable>

          <Pressable
            testID="goto-signin"
            onPress={() => router.replace("/auth/sign-in")}
            style={styles.link}
          >
            <Text style={[type.body, { color: colors.textMuted }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.brand, fontWeight: "600" }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    fontSize: 16,
    fontFamily: type.body.fontFamily,
    color: colors.text,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    marginTop: spacing.xs,
  },
  err: {
    color: colors.onError,
    marginTop: spacing.md,
    fontSize: 13,
  },
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.text,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  link: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
});