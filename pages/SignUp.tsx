// @ts-nocheck
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { signup } from "../src/auth/signup";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Create refs for each input to enable keyboard navigation
  const lastNameRef = useRef(null);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const scrollViewRef = useRef(null);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !username || !email || !password || !role) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Basic username validation
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters long");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert(
        "Error",
        "Username can only contain letters, numbers, and underscores"
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const userData = {
        email,
        password,
        firstName,
        lastName,
        username: username.toLowerCase(), // Ensure username is lowercase
        role,
      };

      console.log("Starting signup process with role:", role);
      const result = await signup(userData);
      console.log(
        "Signup successful, navigating based on role:",
        result.userData.role
      );

      // Navigate to the MaxLifts page first, passing the role
      navigation.navigate("MaxLifts", { role: result.userData.role });
    } catch (error) {
      console.error("Signup error:", error);
      const message =
        error?.message || "Failed to create account. Please try again.";
      setErrorMessage(message);
      Alert.alert(
        "Error",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your first name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              value={firstName}
              onChangeText={setFirstName}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              ref={lastNameRef}
              style={styles.input}
              placeholder="Your last name"
              placeholderTextColor="#666"
              autoCapitalize="words"
              value={lastName}
              onChangeText={setLastName}
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              ref={usernameRef}
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor="#666"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="Your email address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  if (
                    !loading &&
                    firstName &&
                    lastName &&
                    username &&
                    email &&
                    password &&
                    role
                  ) {
                    handleSignUp();
                  }
                }}
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

          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "coach" && styles.selectedRoleButton,
              ]}
              onPress={() => setRole("coach")}
            >
              <Text
                style={
                  role === "coach" ? styles.selectedRoleText : styles.roleText
                }
              >
                Coach
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "athlete" && styles.selectedRoleButton,
              ]}
              onPress={() => setRole("athlete")}
            >
              <Text
                style={
                  role === "athlete" ? styles.selectedRoleText : styles.roleText
                }
              >
                Athlete
              </Text>
            </TouchableOpacity>
          </View>

          {!!errorMessage && (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? "Creating account..." : "Create account"}
            </Text>
          </TouchableOpacity>

          {/* Add extra space at the bottom */}
          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80, // Extra padding at the bottom
  },
  backButton: {
    marginBottom: 10,
    marginTop: 40,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    gap: 15,
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
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: "#000",
  },
  showButton: {
    paddingHorizontal: 15,
  },
  showButtonText: {
    color: "#000",
    fontWeight: "500",
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  selectedRoleButton: {
    backgroundColor: "#000",
  },
  roleText: {
    color: "#000",
    fontWeight: "500",
    fontSize: 16,
  },
  selectedRoleText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  inlineError: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 18,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
  },
  bottomSpace: {
    height: 80, 
  },
});

export default SignUp;
