// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { signin } from "../src/auth/signin";
import { getDoc, doc } from "../src/compat/firestore";
import { auth, db } from "../src/config/firebase";

const SignIn = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await signin(email, password);
      console.log("Signin successful:", result);

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const userData = userDoc.data();

      // Role-based navigation
      if (userData.role === "athlete") {
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
      console.log("Signin error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.welcomeText}>Log in to your account</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or username"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholderTextColor="#666"
              returnKeyType="next"
              enablesReturnKeyAutomatically
              importantForAutofill="yes"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showButtonText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, loading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.6}
          >
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 48,
    marginTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
    paddingLeft: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    paddingLeft: 4,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    gap: 24,
    marginBottom: 60,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
    height: 56,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    height: 56,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#000",
  },
  showButton: {
    padding: 16,
  },
  showButtonText: {
    color: "#666",
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: "#000",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 40,
    gap: 4,
  },
  signUpText: {
    color: "#666",
    fontSize: 15,
  },
  signUpLink: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
});

export default SignIn;
