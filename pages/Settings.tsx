// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { auth, db } from "../src/config/firebase";
import { signOut } from "../src/compat/auth";
import { doc, getDoc } from "../src/compat/firestore";
import { useSettings } from "../contexts/SettingsContext";

const Settings = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const { darkMode, toggleDarkMode } = useSettings();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setUserData(userDoc.data());
      }
    };
    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: "OpeningScreen" }],
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userInfo}>
            <Text style={styles.name}>
              {userData?.firstName} {userData?.lastName}
            </Text>
            <Text style={styles.role}>
              {userData?.role === "coach" ? "Coach" : "Athlete"}
            </Text>
          </View>
        </View>

        {userData?.role === "coach" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Management</Text>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("ClientRequests")}
            >
              <Text style={styles.optionText}>Client Requests</Text>
              <Icon name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.option}
              onPress={() => navigation.navigate("AddClient")}
            >
              <Text style={styles.optionText}>Add Client</Text>
              <Icon name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.option}>
            <Text style={styles.optionText}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={toggleDarkMode} />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  userInfo: {
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
  },
  role: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 16,
  },
  signOutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Settings;
