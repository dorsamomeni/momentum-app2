// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { doc, updateDoc, arrayUnion, getDoc } from "../src/compat/firestore";
import { auth, db } from "../src/config/firebase";
import { profileColors, getRandomProfileColor } from "../src/utils/colors";
import { useNavigation } from "@react-navigation/native";

const FindClients = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [usedColors, setUsedColors] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    goals: [],
    experience: null,
  });
  const [locationInput, setLocationInput] = useState("");

  // Add new mock data sections
  const potentialClients = {
    recommended: [
      {
        id: "pc1",
        firstName: "John",
        lastName: "Smith",
        username: "johnsmith",
        goals: ["Strength", "Competition"],
        experience: "Beginner",
        bestLifts: {
          squat: "140 kg",
          bench: "100 kg",
          deadlift: "180 kg",
        },
        location: "London, UK",
      },
      {
        id: "pc4",
        firstName: "Emma",
        lastName: "Davis",
        username: "emmad",
        goals: ["Powerlifting", "Competition"],
        experience: "Intermediate",
        bestLifts: {
          squat: "130 kg",
          bench: "85 kg",
          deadlift: "160 kg",
        },
        location: "London, UK",
      },
      {
        id: "pc5",
        firstName: "James",
        lastName: "Wilson",
        username: "jamesw",
        goals: ["Strength", "Technique"],
        experience: "Beginner",
        bestLifts: {
          squat: "120 kg",
          bench: "90 kg",
          deadlift: "150 kg",
        },
        location: "Bristol, UK",
      },
    ],
    nearby: [
      {
        id: "pc2",
        firstName: "Sarah",
        lastName: "Johnson",
        username: "sarahj",
        goals: ["Powerlifting", "Technique"],
        experience: "Intermediate",
        bestLifts: {
          squat: "160 kg",
          bench: "95 kg",
          deadlift: "200 kg",
        },
        location: "Manchester, UK",
      },
      {
        id: "pc6",
        firstName: "David",
        lastName: "Brown",
        username: "davidb",
        goals: ["Strength", "Weight Loss"],
        experience: "Beginner",
        bestLifts: {
          squat: "110 kg",
          bench: "75 kg",
          deadlift: "140 kg",
        },
        location: "Manchester, UK",
      },
      {
        id: "pc7",
        firstName: "Sophie",
        lastName: "Taylor",
        username: "sophiet",
        goals: ["Powerlifting", "Competition"],
        experience: "Advanced",
        bestLifts: {
          squat: "170 kg",
          bench: "100 kg",
          deadlift: "210 kg",
        },
        location: "Liverpool, UK",
      },
    ],
    new: [
      {
        id: "pc3",
        firstName: "Mike",
        lastName: "Wilson",
        username: "mikew",
        goals: ["Strength", "Weight Loss"],
        experience: "Beginner",
        bestLifts: {
          squat: "100 kg",
          bench: "80 kg",
          deadlift: "140 kg",
        },
        location: "Birmingham, UK",
      },
      {
        id: "pc8",
        firstName: "Lucy",
        lastName: "Anderson",
        username: "lucya",
        goals: ["General Fitness", "Technique"],
        experience: "Beginner",
        bestLifts: {
          squat: "80 kg",
          bench: "45 kg",
          deadlift: "100 kg",
        },
        location: "Leeds, UK",
      },
      {
        id: "pc9",
        firstName: "Oliver",
        lastName: "Martin",
        username: "oliverm",
        goals: ["Strength", "Competition"],
        experience: "Intermediate",
        bestLifts: {
          squat: "150 kg",
          bench: "110 kg",
          deadlift: "190 kg",
        },
        location: "Edinburgh, UK",
      },
      {
        id: "pc10",
        firstName: "Grace",
        lastName: "Thompson",
        username: "gracet",
        goals: ["Powerlifting", "Weight Loss"],
        experience: "Beginner",
        bestLifts: {
          squat: "90 kg",
          bench: "55 kg",
          deadlift: "120 kg",
        },
        location: "Glasgow, UK",
      },
    ],
  };

  const filterOptions = {
    goals: [
      "Strength",
      "Competition",
      "Powerlifting",
      "Technique",
      "Weight Loss",
      "General Fitness",
    ],
    experience: ["Beginner", "Intermediate", "Advanced"],
  };

  const filterAndSearchClients = (clients) => {
    let filteredClients = {
      recommended: [...clients.recommended],
      nearby: [...clients.nearby],
      new: [...clients.new],
    };

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      Object.keys(filteredClients).forEach((section) => {
        filteredClients[section] = filteredClients[section].filter(
          (client) =>
            client.firstName.toLowerCase().includes(query) ||
            client.lastName.toLowerCase().includes(query) ||
            client.username.toLowerCase().includes(query)
        );
      });
    }

    // Apply location filter
    if (locationInput.trim()) {
      const locationQuery = locationInput.toLowerCase();
      Object.keys(filteredClients).forEach((section) => {
        filteredClients[section] = filteredClients[section].filter((client) =>
          client.location.toLowerCase().includes(locationQuery)
        );
      });
    }

    // Apply filters
    if (activeFilters.goals.length > 0) {
      Object.keys(filteredClients).forEach((section) => {
        filteredClients[section] = filteredClients[section].filter((client) =>
          client.goals.some((goal) => activeFilters.goals.includes(goal))
        );
      });
    }

    if (activeFilters.experience) {
      Object.keys(filteredClients).forEach((section) => {
        filteredClients[section] = filteredClients[section].filter(
          (client) => client.experience === activeFilters.experience
        );
      });
    }

    return filteredClients;
  };

  const [filteredClients, setFilteredClients] = useState(potentialClients);

  useEffect(() => {
    setFilteredClients(filterAndSearchClients(potentialClients));
  }, [searchQuery, activeFilters, locationInput]);

  const handleSendRequest = async (clientId) => {
    try {
      const currentUserId = auth.currentUser.uid;

      // Update client's document with the pending request
      await updateDoc(doc(db, "users", clientId), {
        coachRequests: arrayUnion(currentUserId),
      });

      // Update coach's document with the sent request
      await updateDoc(doc(db, "users", currentUserId), {
        sentRequests: arrayUnion(clientId),
      });

      Alert.alert("Success", "Request sent to potential client");
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send request");
    }
  };

  const ClientCard = ({ client }) => {
    const [profileColor] = useState(() => getRandomProfileColor());
    const [showDetails, setShowDetails] = useState(false);

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => setShowDetails(!showDetails)}
      >
        <View style={styles.clientInfo}>
          <View
            style={[styles.profilePhoto, { backgroundColor: profileColor }]}
          >
            <Text style={styles.initial}>
              {client.firstName[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.clientDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.clientName}>
                {client.firstName} {client.lastName}
              </Text>
            </View>
            <Text style={styles.username}>@{client.username}</Text>

            <Text style={styles.experience}>{client.experience}</Text>

            <View style={styles.liftsContainer}>
              <Text style={styles.lifts}>
                S: {client.bestLifts.squat} | B: {client.bestLifts.bench} | D:{" "}
                {client.bestLifts.deadlift}
              </Text>
            </View>

            {showDetails && (
              <View style={styles.expandedDetails}>
                <View style={styles.goalsContainer}>
                  {client.goals.map((goal, index) => (
                    <Text key={index} style={styles.goalTag}>
                      {goal}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.location}>{client.location}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleSendRequest(client.id)}
        >
          <Text style={styles.addButtonText}>Send Request</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Athletes</Text>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search potential clients"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="filter" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilters}
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterScrollView}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Location</Text>
                  <View style={styles.inputFilterContainer}>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="Enter city or region"
                      value={locationInput}
                      onChangeText={setLocationInput}
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Goals</Text>
                  <View style={styles.filterOptionsRow}>
                    {filterOptions.goals.map((goal, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.filterChip,
                          activeFilters.goals.includes(goal) &&
                            styles.activeFilterChip,
                        ]}
                        onPress={() => {
                          setActiveFilters((prev) => ({
                            ...prev,
                            goals: prev.goals.includes(goal)
                              ? prev.goals.filter((g) => g !== goal)
                              : [...prev.goals, goal],
                          }));
                        }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            activeFilters.goals.includes(goal) &&
                              styles.activeFilterChipText,
                          ]}
                        >
                          {goal}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Experience Level</Text>
                  <View style={styles.filterOptionsRow}>
                    {filterOptions.experience.map((exp, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.filterChip,
                          activeFilters.experience === exp &&
                            styles.activeFilterChip,
                        ]}
                        onPress={() => {
                          setActiveFilters((prev) => ({
                            ...prev,
                            experience: prev.experience === exp ? null : exp,
                          }));
                        }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            activeFilters.experience === exp &&
                              styles.activeFilterChipText,
                          ]}
                        >
                          {exp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setLocationInput("");
                      setActiveFilters({
                        goals: [],
                        experience: null,
                      });
                    }}
                  >
                    <Text style={styles.clearFiltersText}>Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyFiltersButton}
                    onPress={() => setShowFilters(false)}
                  >
                    <Text style={styles.applyFiltersText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <ScrollView style={styles.resultsContainer}>
        {Object.values(filteredClients).some(
          (section) => section.length > 0
        ) ? (
          <>
            {filteredClients.recommended.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recommended Clients</Text>
                {filteredClients.recommended.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </>
            )}

            {filteredClients.nearby.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Clients Near You</Text>
                {filteredClients.nearby.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </>
            )}

            {filteredClients.new.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>New Clients</Text>
                {filteredClients.new.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              No clients found matching your criteria
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                setSearchQuery("");
                setActiveFilters({
                  goals: [],
                  experience: null,
                });
                setLocationInput("");
              }}
            >
              <Text style={styles.clearSearchButtonText}>
                Clear Search & Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 40,
    paddingLeft: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 15,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },
  clientInfo: {
    flexDirection: "row",
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
  clientDetails: {
    marginLeft: 15,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  experience: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
    marginBottom: 4,
  },
  liftsContainer: {
    marginVertical: 4,
  },
  lifts: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  location: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  filterButton: {
    padding: 10,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 5,
  },
  filterScrollView: {
    paddingBottom: 15,
  },
  filterSection: {
    marginBottom: 15,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
  },
  filterOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeFilterChip: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  filterChipText: {
    fontSize: 14,
  },
  activeFilterChipText: {
    color: "#fff",
  },
  inputFilterContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  filterInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  clearFiltersButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: "500",
  },
  applyFiltersButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  expandedDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  goalTag: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  clearSearchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
  resultsContainer: {
    flex: 1,
  },
});

export default FindClients;
