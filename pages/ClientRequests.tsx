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
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../src/config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "../src/compat/firestore";

const ClientRequests = () => {
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

          // Get pending athlete requests
          const pendingRequests = userData.pendingRequests || [];
          const sentRequests = userData.sentRequests || [];

          // Fetch athlete details for each request
          const requestDetails = await Promise.all(
            pendingRequests.map(async (athleteId) => {
              const athleteDoc = await getDoc(doc(db, "users", athleteId));
              return {
                id: athleteId,
                ...athleteDoc.data(),
              };
            })
          );

          // Fetch details of sent requests
          const sentRequestDetails = await Promise.all(
            sentRequests.map(async (athleteId) => {
              const athleteDoc = await getDoc(doc(db, "users", athleteId));
              return {
                id: athleteId,
                ...athleteDoc.data(),
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

  const handleAcceptRequest = async (athleteId) => {
    try {
      const coachId = auth.currentUser.uid;

      // Update coach document
      const coachRef = doc(db, "users", coachId);
      await updateDoc(coachRef, {
        pendingRequests: arrayRemove(athleteId),
        sentRequests: arrayRemove(athleteId),
        athletes: arrayUnion(athleteId),
        clientList: arrayUnion({
          athleteId: athleteId,
          dateAdded: new Date().toISOString(),
          status: "active",
        }),
      });

      // Update athlete document
      const athleteRef = doc(db, "users", athleteId);
      await updateDoc(athleteRef, {
        coachId: coachId,
        sentRequests: arrayRemove(coachId),
        status: "active",
      });

      // Remove request from local state
      setRequests(requests.filter((req) => req.id !== athleteId));
      setOutgoingRequests(
        outgoingRequests.filter((req) => req.id !== athleteId)
      );

      Alert.alert("Success", "Client request accepted");
      navigation.goBack();
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleRejectRequest = async (athleteId) => {
    try {
      const coachRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(coachRef, {
        pendingRequests: arrayRemove(athleteId),
      });

      // Remove request from local state
      setRequests(requests.filter((req) => req.id !== athleteId));

      Alert.alert("Success", "Request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert("Error", "Failed to reject request");
    }
  };

  const handleCancelRequest = async (athleteId) => {
    try {
      const coachRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(coachRef, {
        sentRequests: arrayRemove(athleteId),
      });

      // Remove from athlete's requests
      const athleteRef = doc(db, "users", athleteId);
      await updateDoc(athleteRef, {
        coachRequests: arrayRemove(auth.currentUser.uid),
      });

      // Remove request from local state
      setOutgoingRequests(
        outgoingRequests.filter((req) => req.id !== athleteId)
      );

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
      <Text style={styles.title}>Client Requests</Text>

      <ScrollView style={styles.requestsList}>
        <Text style={styles.sectionTitle}>Incoming Requests</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((athlete) => (
            <View key={athlete.id} style={styles.requestContainer}>
              <View style={styles.leftContainer}>
                <View
                  style={[
                    styles.profilePhoto,
                    { backgroundColor: athlete.profileColor || "#A8E6CF" },
                  ]}
                >
                  <Text style={styles.initial}>
                    {athlete.firstName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientInfoContainer}>
                  <Text style={styles.clientName}>
                    {athlete.firstName} {athlete.lastName}
                  </Text>
                  <Text style={styles.username}>@{athlete.username}</Text>
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAcceptRequest(athlete.id)}
                >
                  <Icon name="checkmark-outline" size={18} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRejectRequest(athlete.id)}
                >
                  <Icon name="close-outline" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.outgoingTitle]}>
          Outgoing Requests
        </Text>
        {outgoingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No outgoing requests</Text>
          </View>
        ) : (
          outgoingRequests.map((athlete) => (
            <View key={athlete.id} style={styles.requestContainer}>
              <View style={styles.leftContainer}>
                <View
                  style={[
                    styles.profilePhoto,
                    { backgroundColor: athlete.profileColor || "#A8E6CF" },
                  ]}
                >
                  <Text style={styles.initial}>
                    {athlete.firstName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientInfoContainer}>
                  <Text style={styles.clientName}>
                    {athlete.firstName} {athlete.lastName}
                  </Text>
                  <Text style={styles.username}>@{athlete.username}</Text>
                </View>
              </View>
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCancelRequest(athlete.id)}
                >
                  <Icon name="close-outline" size={18} color="#000" />
                </TouchableOpacity>
              </View>
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
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 100,
    marginBottom: 30,
    marginLeft: 20,
  },
  requestsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  requestContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  leftContainer: {
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
  clientInfoContainer: {
    marginLeft: 16,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: "#666",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  emptyState: {
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
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
});

export default ClientRequests;
