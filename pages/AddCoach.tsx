// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { collection, query, where, getDocs, getDoc } from "../src/compat/firestore";
import { doc, updateDoc, arrayUnion } from "../src/compat/firestore";
import { auth, db } from "../src/config/firebase";

const AddCoach = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchCoaches = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Search for coaches whose username starts with the search term
      const q = query(
        collection(db, "users"),
        where("role", "==", "coach"),
        where("username", ">=", searchTerm.toLowerCase()),
        where("username", "<=", searchTerm.toLowerCase() + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      const coaches = [];

      const currentUserId = auth.currentUser.uid;
      const athleteDoc = await getDoc(doc(db, "users", currentUserId));
      const athleteData = athleteDoc.data();

      // Get current coach, sent requests, and pending requests
      const currentCoachId = athleteData.coachId;
      const sentRequests = athleteData.sentRequests || [];

      querySnapshot.forEach((doc) => {
        const coachData = doc.data();
        const coachId = doc.id;

        // Skip if this is already the athlete's coach or if a request is pending
        const alreadyConnected = coachId === currentCoachId;
        const hasPendingRequest = sentRequests.includes(coachId);

        if (!alreadyConnected && !hasPendingRequest) {
          coaches.push({
            id: coachId,
            ...coachData,
          });
        }
      });

      setSearchResults(coaches);
    } catch (error) {
      console.error("Error searching coaches:", error);
      Alert.alert("Error", "Failed to search coaches");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (coachId) => {
    try {
      setIsLoading(true);
      const currentUserId = auth.currentUser.uid;

      // Add athlete to coach's pending requests
      const coachRef = doc(db, "users", coachId);
      await updateDoc(coachRef, {
        pendingRequests: arrayUnion(currentUserId),
      });

      // Add coach to athlete's sent requests
      const athleteRef = doc(db, "users", currentUserId);
      await updateDoc(athleteRef, {
        sentRequests: arrayUnion(coachId),
      });

      Alert.alert("Success", "Request sent to coach");

      // Remove coach from search results
      setSearchResults((prevResults) =>
        prevResults.filter((coach) => coach.id !== coachId)
      );
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send request to coach");
    } finally {
      setIsLoading(false);
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
      <Text style={styles.title}>Add Coach</Text>

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
            placeholder="Search coaches by username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              searchCoaches(text);
            }}
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <ScrollView style={styles.resultsContainer}>
            {searchResults.length === 0 && username ? (
              <Text style={styles.noResultsText}>No coaches found</Text>
            ) : (
              searchResults.map((coach) => (
                <View key={coach.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <View
                      style={[
                        styles.profilePhoto,
                        { backgroundColor: coach.profileColor || "#A8E6CF" },
                      ]}
                    >
                      <Text style={styles.initial}>
                        {coach.firstName?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>
                        {coach.firstName} {coach.lastName}
                      </Text>
                      <Text style={styles.username}>@{coach.username}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleSendRequest(coach.id)}
                  >
                    <Text style={styles.addButtonText}>Request</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
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
  noResultsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
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
    marginHorizontal: 20,
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
    color: "#000",
  },
  username: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AddCoach;
