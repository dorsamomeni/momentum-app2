// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useSettings } from "../contexts/SettingsContext";
import { auth, db } from "../src/config/firebase";
import { doc, getDoc } from "../src/compat/firestore";

const ClientsSettings = () => {
  const navigation = useNavigation();
  const { weightUnit, toggleWeightUnit } = useSettings();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      console.log("Loading user data for:", user?.uid);

      if (user) {
        // Split display name into first and last name
        const [first, ...last] = (user.displayName || "").split(" ");
        setFirstName(first || "");
        setLastName(last.join(" ") || "");
        setUserName(user.displayName || "User");
        setUserEmail(user.email || "");

        // Get additional user data from Firestore with retries
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            console.log("Fetching document from:", userDocRef.path);

            const userDoc = await getDoc(userDocRef);
            console.log("Document exists:", userDoc.exists());

            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log("Firestore user data:", userData);

              setUsername(userData.username || "Not set");
              setUserRole(userData.role || "Not set");
              break; // Success, exit retry loop
            } else {
              console.log("No user document found in Firestore");
              setUsername("Not found");
              setUserRole("Not found");
              break;
            }
          } catch (error) {
            console.error(
              `Error fetching user data (attempt ${retryCount + 1}):`,
              error
            );
            retryCount++;

            if (retryCount === maxRetries) {
              setUsername("Error loading");
              setUserRole("Error loading");
            } else {
              // Wait before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      }
    };

    loadUserData();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed, user:", user?.uid);
      loadUserData();
    });
    return () => unsubscribe();
  }, []);

  const handleChangePhoto = () => {
    // Add photo change logic here
  };

  const handleLogout = () => {
    navigation.navigate("SignIn");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                await user.delete();
                navigation.reset({
                  index: 0,
                  routes: [{ name: "OpeningScreen" }],
                });
              }
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. You may need to sign in again."
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>First Name</Text>
            <Text style={styles.infoValue}>{firstName || "Loading..."}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Name</Text>
            <Text style={styles.infoValue}>{lastName || "Loading..."}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{username || "Loading..."}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userEmail}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={[styles.infoValue, styles.roleText]}>
              {userRole
                ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
                : "Loading..."}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Account Created</Text>
            <Text style={styles.infoValue}>
              {auth.currentUser?.metadata?.creationTime
                ? new Date(
                    auth.currentUser.metadata.creationTime
                  ).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        {/* Weight Unit Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity style={styles.option} onPress={toggleWeightUnit}>
            <Text style={styles.optionText}>
              Currently using {weightUnit.toUpperCase()}
            </Text>
            <Text style={styles.optionHint}>
              Tap to switch to {weightUnit === "kg" ? "LBS" : "KG"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.option, styles.logoutOption]}
            onPress={handleLogout}
          >
            <View style={styles.optionLeft}>
              <Icon name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
            </View>
            <Text style={styles.optionHint}>Sign out of your account</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Text>

          <TouchableOpacity
            style={[styles.option, styles.deleteOption]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.optionLeft}>
              <Icon name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, styles.deleteText]}>
                Delete Account
              </Text>
            </View>
            <Text style={styles.dangerHint}>This action cannot be undone</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
    paddingHorizontal: 40,
    marginTop: 100,
  },
  section: {
    marginHorizontal: 40,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 4,
  },
  option: {
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  optionText: {
    fontSize: 16,
    color: "#000",
    marginBottom: 4,
  },
  optionHint: {
    fontSize: 14,
    color: "#666",
  },
  settingOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutOption: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FFE5E5",
  },
  logoutText: {
    color: "#FF3B30",
    marginLeft: 10,
  },
  optionSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  toggleText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  roleText: {
    textTransform: "capitalize",
    color: "#007AFF",
  },
  dangerSection: {
    marginTop: 20,
    borderColor: "#FFE5E5",
    borderWidth: 1,
  },
  dangerTitle: {
    color: "#FF3B30",
  },
  deleteOption: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FFE5E5",
  },
  deleteText: {
    color: "#FF3B30",
    marginLeft: 10,
  },
  dangerHint: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
    width: "100%",
  },
  bottomPadding: {
    height: 100,
  },
});

export default ClientsSettings;
