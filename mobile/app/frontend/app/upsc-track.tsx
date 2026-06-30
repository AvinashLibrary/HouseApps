import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, radius, type } from "@/src/theme";
import { UpscApi } from "@/src/api";

export default function UpscTrack() {
  const router = useRouter();

  const [age, setAge] = useState("25");
  const [tracks, setTracks] = useState<any[]>([]);

  useEffect(() => {
    UpscApi.tracks()
      .then((r) => setTracks(r.tracks))
      .catch(() => {});
  }, []);

  const a = parseInt(age, 10) || 0;

  const match = tracks.find((t) => {
    const [lo, hi] = t.age_range
      .split("-")
      .map((x: string) => parseInt(x, 10));

    return a >= lo && a <= hi;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>

        <Text style={type.label}>UPSC CSE Strategy</Text>
        <Text style={type.h1}>Track advisor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          style={styles.input}
        />

        {match && (
          <View style={styles.card}>
            <Text>{match.label}</Text>
            <Text>{match.advice}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 16 },
  scroll: { padding: 16 },
  input: { fontSize: 24 },
  card: { marginTop: 16 },
  back: { padding: 8 }, // Added back style
});