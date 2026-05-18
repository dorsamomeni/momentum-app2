// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const OpeningScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Momentum</Text>
        <Text style={styles.subtitle}>Your fitness journey starts here</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.blackButton}
          onPress={() => navigation.navigate("SignIn")}
        >
          <Text style={styles.blackButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whiteButton}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.whiteButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.devButton}
          onPress={() => navigation.navigate("Clients")}
        >
          <Text style={styles.devButtonText}>Test</Text>
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
  header: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 90,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
  },
  buttonContainer: {
    paddingBottom: 50,
    gap: 15,
  },
  blackButton: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  whiteButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  blackButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  whiteButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
  },
  devButton: {
    padding: 8,
    alignItems: "center",
    marginTop: 8,
  },
  devButtonText: {
    color: "#999",
    fontSize: 12,
  },
});

export default OpeningScreen;
