// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const Welcome = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Welcome to Momentum!</Text>
      <Text style={styles.subtitle}>Your fitness journey starts here</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor="#666"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your last name"
            placeholderTextColor="#666"
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>I am a:</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.roleButton}>
            <Text style={styles.roleButtonText}>Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.roleButton}>
            <Text style={styles.roleButtonText}>Athlete</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate("Clients")}
        >
          <Text style={styles.testButtonText}>Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 15,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  roleButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  testButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 15,
  },
  testButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});

export default Welcome;
