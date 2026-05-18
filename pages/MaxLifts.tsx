// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { auth, db } from "../src/config/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "../src/compat/firestore";

const MaxLifts = ({ route }) => {
  const [squatMax, setSquatMax] = useState("");
  const [benchMax, setBenchMax] = useState("");
  const [deadliftMax, setDeadliftMax] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Get user role from route params
  const { role } = route.params || { role: "athlete" };

  const handleSubmit = async () => {
    // Validate inputs (ensure they're numbers)
    if (!squatMax || !benchMax || !deadliftMax) {
      Alert.alert("Error", "Please enter all max lifts");
      return;
    }

    if (
      isNaN(parseFloat(squatMax)) ||
      isNaN(parseFloat(benchMax)) ||
      isNaN(parseFloat(deadliftMax))
    ) {
      Alert.alert("Error", "Please enter valid numbers for all lifts");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Use serverTimestamp for top-level fields
      const serverNow = serverTimestamp();

      // Use regular Date object for array entries
      const clientNow = new Date();

      // Format lifts data with the new structure where each lift has a weight and timestamp
      const maxesData = {
        squat: {
          weight: parseFloat(squatMax),
          achievedAt: serverNow,
        },
        bench: {
          weight: parseFloat(benchMax),
          achievedAt: serverNow,
        },
        deadlift: {
          weight: parseFloat(deadliftMax),
          achievedAt: serverNow,
        },
      };

      // Create analytics document with currentMaxes and progression arrays
      await setDoc(doc(db, "analytics", user.uid), {
        currentMaxes: maxesData,
        squatProgression: [{ date: clientNow, weight: parseFloat(squatMax) }],
        benchProgression: [{ date: clientNow, weight: parseFloat(benchMax) }],
        deadliftProgression: [
          { date: clientNow, weight: parseFloat(deadliftMax) },
        ],
      });

      // Also update the user document with a reference to their max lifts
      await updateDoc(doc(db, "users", user.uid), {
        hasEnteredMaxLifts: true,
      });

      // Navigate based on role
      if (role === "athlete") {
        navigation.reset({
          index: 0,
          routes: [{ name: "AthleteHome" }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Clients" }],
        });
      }
    } catch (error) {
      console.error("Error saving max lifts:", error);
      Alert.alert("Error", "Failed to save your max lifts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If user wants to skip this step
  const handleSkip = () => {
    if (role === "athlete") {
      navigation.reset({
        index: 0,
        routes: [{ name: "AthleteHome" }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "Clients" }],
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Your Max Lifts</Text>
          <Text style={styles.subtitle}>
            Enter your current one-rep max for each lift
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Squat (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your squat max"
            value={squatMax}
            onChangeText={setSquatMax}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bench Press (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your bench press max"
            value={benchMax}
            onChangeText={setBenchMax}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Deadlift (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your deadlift max"
            value={deadliftMax}
            onChangeText={setDeadliftMax}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 40,
    paddingTop: 120,
  },
  headerContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
  },
});

export default MaxLifts;
