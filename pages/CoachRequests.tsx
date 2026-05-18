// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { auth, db } from "../src/config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "../src/compat/firestore";

const CoachRequests = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();

          // Get pending coach requests
          const pendingRequests = userData.coachRequests || [];
          const sentRequests = userData.sentRequests || [];

          // Fetch coach details for each request
          const requestDetails = await Promise.all(
            pendingRequests.map(async (coachId) => {
              const coachDoc = await getDoc(doc(db, "users", coachId));
              return {
                id: coachId,
                ...coachDoc.data(),
              };
            })
          );

          // Fetch details of sent requests
          const sentRequestDetails = await Promise.all(
            sentRequests.map(async (userId) => {
              const userDoc = await getDoc(doc(db, "users", userId));
              return {
                id: userId,
                ...userDoc.data(),
              };
            })
          );

          setRequests(requestDetails);
          setOutgoingRequests(sentRequestDetails);
        }
      } catch (error) {
        console.error("Error loading requests:", error);
      }
    };

    loadRequests();
  }, []);

  const handleAcceptRequest = async (coachId) => {
    try {
      const athleteId = auth.currentUser.uid;

      // Update athlete document
      const athleteRef = doc(db, "users", athleteId);
      await updateDoc(athleteRef, {
        coachId: coachId,
        coachRequests: arrayRemove(coachId),
        sentRequests: arrayRemove(coachId),
        status: "active",
      });

      // Update coach document
      const coachRef = doc(db, "users", coachId);
      await updateDoc(coachRef, {
        athletes: arrayUnion(athleteId),
        pendingRequests: arrayRemove(athleteId),
        sentRequests: arrayRemove(athleteId),
      });

      // Remove request from local state
      setRequests(requests.filter((req) => req.id !== coachId));
      setOutgoingRequests(outgoingRequests.filter((req) => req.id !== coachId));

      Alert.alert("Success", "Coach request accepted");
      navigation.goBack();
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleRejectRequest = async (coachId) => {
    try {
      const athleteRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(athleteRef, {
        coachRequests: arrayRemove(coachId),
        sentRequests: arrayRemove(coachId),
      });

      // Remove from coach's pending requests
      const coachRef = doc(db, "users", coachId);
      await updateDoc(coachRef, {
        pendingRequests: arrayRemove(auth.currentUser.uid),
        sentRequests: arrayRemove(auth.currentUser.uid),
      });

      // Remove request from local state
      setRequests(requests.filter((req) => req.id !== coachId));
      setOutgoingRequests(outgoingRequests.filter((req) => req.id !== coachId));

      Alert.alert("Success", "Request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert("Error", "Failed to reject request");
    }
  };

  const handleCancelRequest = async (coachId) => {
    try {
      // Remove from athlete's sent requests
      const athleteRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(athleteRef, {
        sentRequests: arrayRemove(coachId),
      });

      // Remove from coach's pending requests
      const coachRef = doc(db, "users", coachId);
      await updateDoc(coachRef, {
        pendingRequests: arrayRemove(auth.currentUser.uid),
      });

      // Remove request from local state
      setOutgoingRequests(outgoingRequests.filter((req) => req.id !== coachId));

      Alert.alert("Success", "Request cancelled");
    } catch (error) {
      console.error("Error cancelling request:", error);
      Alert.alert("Error", "Failed to cancel request");
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
      <Text style={styles.title}>Coach Requests</Text>

      <ScrollView style={styles.requestsList}>
        <Text style={styles.sectionTitle}>Incoming Requests</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((coach) => (
            <View key={coach.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <View style={styles.profileContainer}>
                  <View
                    style={[
                      styles.profilePhoto,
                      { backgroundColor: coach.profileColor || "#A8E6CF" },
                    ]}
                  >
                    <Text style={styles.initial}>
                      {coach.firstName && coach.firstName[0]
                        ? coach.firstName[0].toUpperCase()
                        : "?"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.coachName}>
                      {coach.firstName} {coach.lastName}
                    </Text>
                    <Text style={styles.username}>@{coach.username}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptRequest(coach.id)}
                >
                  <Icon name="checkmark-outline" size={20} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectRequest(coach.id)}
                >
                  <Icon name="close-outline" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.outgoingTitle]}>
          Sent Requests
        </Text>
        {outgoingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No sent requests</Text>
          </View>
        ) : (
          outgoingRequests.map((user) => (
            <View key={user.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <View style={styles.profileContainer}>
                  <View
                    style={[
                      styles.profilePhoto,
                      { backgroundColor: user.profileColor || "#A8E6CF" },
                    ]}
                  >
                    <Text style={styles.initial}>
                      {user.firstName && user.firstName[0]
                        ? user.firstName[0].toUpperCase()
                        : "?"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.coachName}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text style={styles.username}>@{user.username}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelRequest(user.id)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 40,
    paddingTop: 140,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 30,
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
  requestsList: {
    flex: 1,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  requestInfo: {
    flex: 1,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initial: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  coachName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  acceptButton: {
    backgroundColor: "#f0f0f0",
  },
  rejectButton: {
    backgroundColor: "#f0f0f0",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  outgoingTitle: {
    marginTop: 32,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    width: "auto",
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
});

export default CoachRequests;
