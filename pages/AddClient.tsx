// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { collection, query, where, getDocs, getDoc } from "../src/compat/firestore";
import { doc, updateDoc, arrayUnion } from "../src/compat/firestore";
import { auth, db } from "../src/config/firebase";

const AddClient = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isAthlete, setIsAthlete] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAthlete(userData.role === "athlete");
      }
    };
    checkUserRole();
  }, []);

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", isAthlete ? "coach" : "athlete"),
        where("username", ">=", searchTerm.toLowerCase()),
        where("username", "<=", searchTerm.toLowerCase() + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const currentUserId = auth.currentUser.uid;
        const alreadyConnected = isAthlete
          ? userData.athletes?.includes(currentUserId)
          : userData.coachId === currentUserId;
        const hasPendingRequest =
          userData.pendingRequests?.includes(currentUserId) ||
          userData.coachRequests?.includes(currentUserId);

        if (!alreadyConnected && !hasPendingRequest) {
          users.push({
            id: doc.id,
            ...userData,
          });
        }
      });
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users");
    }
  };

  const handleAddUser = async (userId) => {
    try {
      const currentUserId = auth.currentUser.uid;

      if (isAthlete) {
        // Athlete sending request to coach
        const coachRef = doc(db, "users", userId);
        await updateDoc(coachRef, {
          pendingRequests: arrayUnion(currentUserId),
        });

        const athleteRef = doc(db, "users", currentUserId);
        await updateDoc(athleteRef, {
          sentRequests: arrayUnion(userId),
        });

        Alert.alert("Success", "Request sent to coach");
      } else {
        // Coach sending request to athlete
        const athleteRef = doc(db, "users", userId);
        await updateDoc(athleteRef, {
          coachRequests: arrayUnion(currentUserId),
        });

        const coachRef = doc(db, "users", currentUserId);
        await updateDoc(coachRef, {
          sentRequests: arrayUnion(userId),
        });

        Alert.alert("Success", "Request sent to athlete");
      }
      navigation.goBack();
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send request");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{isAthlete ? "Add Coach" : "Add Client"}</Text>

      <View style={styles.content}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${
              isAthlete ? "coaches" : "athletes"
            } by username`}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              searchUsers(text);
            }}
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        <ScrollView style={styles.resultsContainer}>
          {searchResults.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View
                  style={[
                    styles.profilePhoto,
                    { backgroundColor: user.profileColor || "#A8E6CF" },
                  ]}
                >
                  <Text style={styles.initial}>
                    {user.firstName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.username}>@{user.username}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddUser(user.id)}
              >
                <Text style={styles.addButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: 30,
    marginTop: 100,
    marginBottom: -15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  resultsContainer: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  userDetails: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AddClient;
