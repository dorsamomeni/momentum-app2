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
import { doc, getDoc, enableIndexedDbPersistence } from "../src/compat/firestore";
import { signOut } from "../src/compat/auth";

enableIndexedDbPersistence(db).catch((err) => {
  console.log("Persistence error:", err);
});

const AthleteSettings = () => {
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
        const [first, ...last] = (user.displayName || "").split(" ");
        setFirstName(first || "");
        setLastName(last.join(" ") || "");
        setUserName(user.displayName || "User");
        setUserEmail(user.email || "");

        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUsername(userData.username || "Not set");
              setUserRole(userData.role || "Not set");
              break;
            } else {
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
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      }
    };

    loadUserData();
    const unsubscribe = auth.onAuthStateChanged(loadUserData);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: "OpeningScreen" }],
      });
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
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
      ]
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
            <Text style={styles.infoValue}>{userEmail || "Loading..."}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={[styles.infoValue, styles.roleText]}>
              {userRole || "Loading..."}
            </Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <TouchableOpacity
            style={styles.settingOption}
            onPress={toggleWeightUnit}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionText}>Weight Unit</Text>
              <Text style={styles.optionSubtext}>
                Change your preferred weight unit
              </Text>
            </View>
            <Text style={styles.toggleText}>{weightUnit}</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity
            style={[styles.settingOption, styles.logoutOption]}
            onPress={handleLogout}
          >
            <View style={styles.optionLeft}>
              <Icon name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Text>

          <TouchableOpacity
            style={[styles.settingOption, styles.deleteOption]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.optionLeft}>
              <Icon name="trash-outline" size={24} color="#FF3B30" />
              <Text style={styles.deleteText}>Delete Account</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>This action cannot be undone.</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 100,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
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
  },
  settingOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
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

export default AthleteSettings;
