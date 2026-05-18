// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { auth, db } from "../src/config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayRemove,
} from "../src/compat/firestore";

const AthleteHome = () => {
  const navigation = useNavigation();
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [previousBlocks, setPreviousBlocks] = useState([]);
  const [userData, setUserData] = useState(null);
  const [coachData, setCoachData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  console.log("AthleteHome component rendering");

  // Initial data loading
  useEffect(() => {
    loadUserData();
  }, []);

  // Refresh data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("AthleteHome screen focused - refreshing block data");
      loadUserData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    console.log("Pull-to-refresh triggered");
    setRefreshing(true);

    Promise.resolve()
      .then(() => loadUserData())
      .catch((error) => {
        console.error("Error during refresh:", error);
      })
      .finally(() => {
        console.log("Refresh completed, setting refreshing to false");
        setRefreshing(false);
      });
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        setUserData(data);

        const blocksQuery = query(
          collection(db, "blocks"),
          where("athleteId", "==", user.uid)
        );

        const blocksSnapshot = await getDocs(blocksQuery);
        const activeBlocksData = [];
        const previousBlocksData = [];

        blocksSnapshot.forEach((doc) => {
          const blockData = { id: doc.id, ...doc.data() };

          // Format dates for display with better error handling
          try {
            if (blockData.startDate) {
              // Handle Firestore timestamp format
              if (blockData.startDate.seconds) {
                const startDateObj = new Date(
                  blockData.startDate.seconds * 1000
                );
                blockData.startDate = formatDate(startDateObj);
              }
              // Handle Date object
              else if (blockData.startDate instanceof Date) {
                blockData.startDate = formatDate(blockData.startDate);
              }
              // Handle Firestore toDate() function
              else if (typeof blockData.startDate.toDate === "function") {
                blockData.startDate = formatDate(blockData.startDate.toDate());
              }
              // Handle string date that's already formatted
              else if (typeof blockData.startDate === "string") {
                // Keep it as is if it's already a string
              }
              // Handle all other cases
              else {
                console.warn("Unknown startDate format:", blockData.startDate);
                blockData.startDate = "N/A";
              }
            }

            if (blockData.endDate) {
              // Handle Firestore timestamp format
              if (blockData.endDate.seconds) {
                const endDateObj = new Date(blockData.endDate.seconds * 1000);
                blockData.endDate = formatDate(endDateObj);
              }
              // Handle Date object
              else if (blockData.endDate instanceof Date) {
                blockData.endDate = formatDate(blockData.endDate);
              }
              // Handle Firestore toDate() function
              else if (typeof blockData.endDate.toDate === "function") {
                blockData.endDate = formatDate(blockData.endDate.toDate());
              }
              // Handle string date that's already formatted
              else if (typeof blockData.endDate === "string") {
                // Keep it as is if it's already a string
              }
              // Handle all other cases
              else {
                console.warn("Unknown endDate format:", blockData.endDate);
                blockData.endDate = "N/A";
              }
            }
          } catch (error) {
            console.error("Error formatting block dates:", error, blockData);
            // Provide fallback values
            blockData.startDate = blockData.startDate ? "N/A" : "";
            blockData.endDate = blockData.endDate ? "N/A" : "";
          }

          // Sort by status
          if (blockData.status === "active") {
            activeBlocksData.push(blockData);
          } else {
            previousBlocksData.push(blockData);
          }
        });

        setActiveBlocks(activeBlocksData);
        setPreviousBlocks(previousBlocksData);

        // Fetch coach data if coachId exists
        if (data.coachId) {
          const coachDoc = await getDoc(doc(db, "users", data.coachId));
          if (coachDoc.exists()) {
            setCoachData({
              id: data.coachId,
              ...coachDoc.data(),
            });
          }
        } else {
          setCoachData(null); // Reset coach data if no coach is assigned
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    return Promise.resolve(); 
  };

  const handleRemoveCoach = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Confirm removing coachwith the user
      Alert.alert(
        "Remove Coach",
        "Are you sure you want to remove your coach?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            onPress: async () => {
              // Remove coachId from user document
              await updateDoc(doc(db, "users", user.uid), {
                coachId: null,
              });

              // Remove athlete from coach's document
              if (coachData && coachData.id) {
                await updateDoc(doc(db, "users", coachData.id), {
                  athletes: arrayRemove(user.uid),
                });
              }

              setCoachData(null);
              Alert.alert("Success", "Coach removed successfully");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error removing coach:", error);
      Alert.alert("Error", "Failed to remove coach");
    }
  };

  const renderBlock = (block, isPrevious = false) => {
    // Define status icon color based on whether it's a previous block
    const statusIconColor = isPrevious ? "#888888" : "#4CD964"; // Grey for previous, green for active

    return (
      <TouchableOpacity
        key={block.id}
        style={[styles.blockCard, isPrevious && styles.previousBlock]}
        onPress={() =>
          navigation.navigate("WorkoutProgram", {
            blockId: block.id,
            onCloseBlock: () => {},
            isPreviousBlock: isPrevious,
            onReopenBlock: () => {},
            isAthlete: true,
          })
        }
      >
        <View style={styles.blockHeader}>
          <View style={styles.blockTitleContainer}>
            <Icon
              name="ellipse"
              size={12}
              color={statusIconColor}
              style={styles.statusIcon}
            />
            <Text style={styles.blockName}>{block.name}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>
          {block.startDate} - {block.endDate}
        </Text>
      </TouchableOpacity>
    );
  };

  const filterBlocks = (blocks) => {
    return blocks.filter((block) =>
      block.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("CoachRequests")}
          >
            <Icon name="add-circle" size={14} color="#000" />
            <Text style={styles.buttonText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("AddCoach")}
          >
            <Icon name="people" size={14} color="#000" />
            <Text style={styles.buttonText}>Add Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.coachSection}>
        <Text style={styles.sectionTitle}>My Coach</Text>
        {coachData ? (
          <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
              <View style={styles.coachInfo}>
                <View
                  style={[styles.profilePhoto, { backgroundColor: "#A8E6CF" }]}
                >
                  <Text style={styles.initial}>
                    {coachData.firstName[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.coachDetails}>
                  <Text style={styles.coachName}>
                    {coachData.firstName} {coachData.lastName}
                  </Text>
                  <Text style={styles.coachUsername}>
                    @{coachData.username}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveCoach}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noCoachContainer}>
            <Text style={styles.noCoachText}>
              Connect with a coach to get started
            </Text>
            <TouchableOpacity
              style={styles.addCoachButton}
              onPress={() => navigation.navigate("FindCoach")}
            >
              <Text style={styles.addCoachButtonText}>Find</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon
            name="search-outline"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search programs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={["#000000"]}
            progressBackgroundColor="#ffffff"
            title="Refreshing..."
            titleColor="#000000"
          />
        }
        scrollEventThrottle={16}
      >
        {activeBlocks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Programs</Text>
            {filterBlocks(activeBlocks).map((block) => renderBlock(block))}
          </View>
        )}

        {previousBlocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.previousTitle]}>
              Previous Programs
            </Text>
            {filterBlocks(previousBlocks).map((block) =>
              renderBlock(block, true)
            )}
          </View>
        )}

        {coachData &&
          activeBlocks.length === 0 &&
          previousBlocks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No programs available</Text>
            </View>
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
    paddingTop: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    paddingBottom: 0,
    paddingRight: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    marginRight: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: "#000",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 12,
    color: "#000",
  },
  previousTitle: {
    marginTop: 16,
  },
  blockCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  previousBlock: {
    backgroundColor: "#F5F5F5",
    borderColor: "#DDDDDD",
    opacity: 0.7,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    marginRight: 8,
  },
  blockName: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
    flex: 1,
  },
  dateText: {
    color: "#666",
    fontSize: 13,
    marginTop: 3,
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
  coachSection: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  coachCard: {
    backgroundColor: "#f8f8f8",
    padding: 14,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  coachHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coachInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profilePhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  coachDetails: {
    marginLeft: 16,
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 3,
  },
  coachUsername: {
    fontSize: 14,
    color: "#666",
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  noCoachContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 6,
    flexWrap: "nowrap",
  },
  noCoachText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    marginRight: 8,
  },
  addCoachButton: {
    backgroundColor: "#000",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 0,
    minWidth: 70,
  },
  addCoachButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 0,
    marginBottom: 20,
    paddingTop: 40,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    height: "100%",
  },
});

// Add a helper function to format dates consistently
const formatDate = (date) => {
  if (!date) return "N/A";

  try {
    // Validate the date is valid
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn("Invalid date object:", date);
      return "N/A";
    }

    // Format the date as MMM DD, YYYY
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error in formatDate:", error);
    return "N/A";
  }
};

export default AthleteHome;
