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

const FindCoach = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [usedColors, setUsedColors] = useState(new Set());
  const [userPreferences, setUserPreferences] = useState({
    experience: "beginner",
    goals: ["strength", "technique"],
  });
  const [selectedFilters, setSelectedFilters] = useState({
    experience: [],
    specialty: [],
    priceRange: "all",
    availability: "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    specialty: [],
    priceRange: null,
    location: null,
    rating: null,
    experience: null,
  });
  const [locationInput, setLocationInput] = useState("");
  const [ratingInput, setRatingInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Update price ranges for coaches
  const priceRanges = {
    r1: "£65/month",
    r2: "£55/month",
    e1: "£85/month",
    e2: "£75/month",
  };

  // Expanded mock data with more details
  const recommendedCoaches = [
    {
      id: "r1",
      firstName: "Mike",
      lastName: "Thompson",
      username: "mikepowercoach",
      specialty: ["Powerlifting", "Strength", "Competition Prep"],
      experience: "Elite",
      bestLifts: {
        squat: "272.5 kg",
        bench: "182.5 kg",
        deadlift: "317.5 kg",
      },
      rating: 4.9,
      clients: 28,
      location: "Manchester, UK",
      competitions: 15,
      suitable: ["beginner", "intermediate"],
      availability: "Limited Spots",
      languages: ["English"],
      achievements: [
        "British Powerlifting National Coach",
        "3x British Champion",
      ],
    },
    {
      id: "r2",
      firstName: "Lisa",
      lastName: "Strong",
      username: "lisastrong",
      specialty: ["Powerlifting", "Strength", "Competition Prep"],
      experience: "Pro",
      bestLifts: {
        squat: "185 kg",
        bench: "120 kg",
        deadlift: "220 kg",
      },
      rating: 4.8,
      clients: 22,
      location: "Leeds, UK",
      competitions: 12,
      suitable: ["beginner", "intermediate"],
      availability: "Limited Spots",
      languages: ["English"],
      achievements: ["British Powerlifting Regional Champion"],
    },
  ];

  const eliteCoaches = [
    {
      id: "e1",
      firstName: "John",
      lastName: "Powers",
      username: "johnpowers",
      specialty: ["Powerlifting", "Strength", "Competition Prep"],
      experience: "Elite",
      bestLifts: {
        squat: "320 kg",
        bench: "220 kg",
        deadlift: "370 kg",
      },
      rating: 4.9,
      clients: 15,
      location: "London, UK",
      competitions: 25,
      suitable: ["advanced", "elite"],
      availability: "Full Time",
      certifications: ["British Powerlifting Coach", "UKSCA"],
      languages: ["English"],
      achievements: [
        "British Powerlifting National Coach",
        "4x British Champion",
      ],
    },
    {
      id: "e2",
      firstName: "Sarah",
      lastName: "Davis",
      username: "sarahd",
      specialty: ["Powerlifting", "Strength", "Competition Prep"],
      experience: "Elite",
      bestLifts: {
        squat: "220 kg",
        bench: "142.5 kg",
        deadlift: "247.5 kg",
      },
      rating: 4.8,
      clients: 18,
      location: "Birmingham, UK",
      competitions: 20,
      suitable: ["intermediate", "advanced"],
      availability: "Full Time",
      certifications: ["British Powerlifting Coach", "UKSCA"],
      languages: ["English"],
      achievements: ["British Powerlifting Champion"],
    },
  ];

  const filterOptions = {
    specialty: [
      "Competition Prep",
      "Technique Focus",
      "Strength Building",
      "Injury Recovery",
      "Nutrition",
      "Meet Planning",
      "Beginner Programs",
      "Online Coaching",
      "In-Person Training",
      "Powerlifting Seminars",
    ],
    priceRange: [
      { label: "Under £50", value: "under50" },
      { label: "£50-£70", value: "50-70" },
      { label: "£70-£90", value: "70-90" },
    ],
    experience: [
      "Beginner Friendly",
      "Intermediate",
      "Advanced",
      "Elite",
      "Pro",
    ],
  };

  const filterAndSearchCoaches = (coaches) => {
    let filteredCoaches = [...coaches];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredCoaches = filteredCoaches.filter(
        (coach) =>
          coach.firstName.toLowerCase().includes(query) ||
          coach.lastName.toLowerCase().includes(query) ||
          coach.username.toLowerCase().includes(query) ||
          coach.specialty.some((spec) => spec.toLowerCase().includes(query))
      );
    }

    // Apply location filter
    if (locationInput.trim()) {
      const locationQuery = locationInput.toLowerCase();
      filteredCoaches = filteredCoaches.filter((coach) =>
        coach.location.toLowerCase().includes(locationQuery)
      );
    }

    // Apply rating filter
    if (ratingInput.trim()) {
      const minRating = parseFloat(ratingInput);
      if (!isNaN(minRating)) {
        filteredCoaches = filteredCoaches.filter(
          (coach) => coach.rating >= minRating
        );
      }
    }

    // Apply filters
    if (activeFilters.specialty.length > 0) {
      filteredCoaches = filteredCoaches.filter((coach) =>
        coach.specialty.some((spec) => activeFilters.specialty.includes(spec))
      );
    }

    if (activeFilters.experience) {
      filteredCoaches = filteredCoaches.filter((coach) =>
        coach.suitable.includes(activeFilters.experience.toLowerCase())
      );
    }

    // Update price range filtering
    if (minPrice.trim() || maxPrice.trim()) {
      filteredCoaches = filteredCoaches.filter((coach) => {
        const coachPrice = parseFloat(
          priceRanges[coach.id].replace(/[^0-9.]/g, "")
        );
        const min = minPrice.trim() ? parseFloat(minPrice) : 0;
        const max = maxPrice.trim() ? parseFloat(maxPrice) : Infinity;
        return coachPrice >= min && coachPrice <= max;
      });
    }

    return filteredCoaches;
  };

  const [filteredEliteCoaches, setFilteredEliteCoaches] =
    useState(eliteCoaches);
  const [filteredRecommendedCoaches, setFilteredRecommendedCoaches] =
    useState(recommendedCoaches);

  useEffect(() => {
    setFilteredEliteCoaches(filterAndSearchCoaches(eliteCoaches));
    setFilteredRecommendedCoaches(filterAndSearchCoaches(recommendedCoaches));
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    // Fetch user preferences from Firestore
    const fetchUserPreferences = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userData = userDoc.data();
        if (userData.preferences) {
          setUserPreferences(userData.preferences);
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
      }
    };

    fetchUserPreferences();
  }, []);

  const handleSendRequest = async (coachId) => {
    try {
      const currentUserId = auth.currentUser.uid;

      // Update coach's document with the pending request
      await updateDoc(doc(db, "users", coachId), {
        pendingRequests: arrayUnion(currentUserId),
      });

      // Update athlete's document with the sent request
      await updateDoc(doc(db, "users", currentUserId), {
        sentRequests: arrayUnion(coachId),
      });

      Alert.alert("Success", "Request sent to coach");
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send request");
    }
  };

  const getUniqueColor = useCallback(() => {
    const availableColors = profileColors.filter(
      (color) => !usedColors.has(color)
    );
    if (availableColors.length === 0) {
      setUsedColors(new Set());
      return profileColors[0];
    }
    const randomColor =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    setUsedColors((prev) => new Set([...prev, randomColor]));
    return randomColor;
  }, [usedColors]);

  const specialtyCategories = [
    "Competition Prep",
    "Technique Focus",
    "Strength Building",
    "Injury Recovery",
    "Nutrition",
    "Meet Planning",
  ];

  const experienceLevels = [
    "Beginner Friendly",
    "Intermediate",
    "Advanced",
    "Elite",
    "Pro",
  ];

  const FilterButton = ({ title, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.activeFilterChip]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterChipText, active && styles.activeFilterChipText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const FilterSection = ({
    title,
    options,
    type,
    activeFilters,
    onFilterChange,
  }) => {
    return (
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterOptionsRow}>
            {options.map((option, index) => {
              const value = typeof option === "object" ? option.value : option;
              const label = typeof option === "object" ? option.label : option;
              const isActive =
                activeFilters[type]?.includes(value) ||
                activeFilters[type] === value;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.filterChip,
                    isActive && styles.activeFilterChip,
                  ]}
                  onPress={() => onFilterChange(type, value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.activeFilterChipText,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const CoachCard = ({ coach }) => {
    const [profileColor] = useState(() => getRandomProfileColor());
    const [showDetails, setShowDetails] = useState(false);

    return (
      <TouchableOpacity
        style={styles.coachCard}
        onPress={() => setShowDetails(!showDetails)}
      >
        <View style={styles.coachInfo}>
          <View
            style={[styles.profilePhoto, { backgroundColor: profileColor }]}
          >
            <Text style={styles.initial}>
              {coach.firstName[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.coachDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.coachName}>
                {coach.firstName} {coach.lastName}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceRange}>{priceRanges[coach.id]}</Text>
              </View>
            </View>
            <Text style={styles.username}>@{coach.username}</Text>

            <Text style={styles.experience}>
              {coach.experience} Powerlifting Coach
            </Text>

            <View style={styles.liftsContainer}>
              <Text style={styles.lifts}>
                S: {coach.bestLifts.squat} | B: {coach.bestLifts.bench} | D:{" "}
                {coach.bestLifts.deadlift}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{coach.rating}</Text>
              <Text style={styles.clients}>• {coach.clients} athletes</Text>
              <Text style={styles.competitions}>
                • {coach.competitions} competitions
              </Text>
            </View>

            {showDetails && (
              <View style={styles.expandedDetails}>
                <View style={styles.specialtiesContainer}>
                  {coach.specialty.map((spec, index) => (
                    <Text key={index} style={styles.specialtyTag}>
                      {spec}
                    </Text>
                  ))}
                </View>
                <Text style={styles.achievements}>
                  {coach.achievements?.join(" • ")}
                </Text>
                <Text style={styles.languages}>
                  Languages: {coach.languages?.join(", ")}
                </Text>
              </View>
            )}

            <Text style={styles.location}>{coach.location}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            coach.availability === "Limited Spots" && styles.limitedButton,
          ]}
          onPress={() => handleSendRequest(coach.id)}
        >
          <Text style={styles.addButtonText}>
            {coach.availability === "Limited Spots"
              ? "Limited Spots"
              : "Request"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Find a Powerlifting Coach</Text>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search powerlifting coaches"
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
                  <Text style={styles.filterTitle}>Minimum Rating</Text>
                  <View style={styles.inputFilterContainer}>
                    <TextInput
                      style={styles.filterInput}
                      placeholder="Enter minimum rating (e.g., 4.5)"
                      value={ratingInput}
                      onChangeText={setRatingInput}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Price Range (£/month)</Text>
                  <View style={styles.priceRangeContainer}>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Min"
                        value={minPrice}
                        onChangeText={setMinPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#666"
                      />
                    </View>
                    <Text style={styles.priceSeparator}>-</Text>
                    <View style={styles.priceInputContainer}>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Max"
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#666"
                      />
                    </View>
                  </View>
                </View>

                <FilterSection
                  title="Specialty"
                  options={filterOptions.specialty}
                  type="specialty"
                  activeFilters={activeFilters}
                  onFilterChange={(type, value) => {
                    setActiveFilters((prev) => ({
                      ...prev,
                      [type]: prev[type]?.includes(value)
                        ? prev[type].filter((v) => v !== value)
                        : [...(prev[type] || []), value],
                    }));
                  }}
                />

                <FilterSection
                  title="Experience Level"
                  options={filterOptions.experience}
                  type="experience"
                  activeFilters={activeFilters}
                  onFilterChange={(type, value) => {
                    setActiveFilters((prev) => ({
                      ...prev,
                      [type]: prev[type] === value ? null : value,
                    }));
                  }}
                />

                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setLocationInput("");
                      setRatingInput("");
                      setMinPrice("");
                      setMaxPrice("");
                      setActiveFilters({
                        specialty: [],
                        priceRange: null,
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
        {filteredEliteCoaches.length > 0 ||
        filteredRecommendedCoaches.length > 0 ? (
          <>
            {filteredEliteCoaches.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Featured Elite Coaches</Text>
                {filteredEliteCoaches.map((coach) => (
                  <CoachCard key={coach.id} coach={coach} />
                ))}
              </>
            )}

            {filteredRecommendedCoaches.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Recommended For Your Level
                </Text>
                {filteredRecommendedCoaches.map((coach) => (
                  <CoachCard key={coach.id} coach={coach} />
                ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              No coaches found matching your criteria
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                setSearchQuery("");
                setActiveFilters({
                  specialty: [],
                  priceRange: null,
                  location: null,
                  rating: null,
                  experience: null,
                });
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
    marginTop: 60,
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
  coachCard: {
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
  coachInfo: {
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
  coachDetails: {
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
  coachName: {
    fontSize: 16,
    fontWeight: "600",
  },
  priceContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priceRange: {
    fontSize: 14,
    fontWeight: "500",
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  rating: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    marginRight: 8,
  },
  clients: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  competitions: {
    fontSize: 14,
    color: "#666",
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
  filtersContainer: {
    maxHeight: 400,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  specialtyTag: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  achievements: {
    fontSize: 13,
    color: "#444",
    marginVertical: 4,
  },
  languages: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  limitedButton: {
    backgroundColor: "#666",
  },
  bottomPadding: {
    height: 40,
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
  priceRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  priceInputContainer: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  priceInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000",
  },
  priceSeparator: {
    paddingHorizontal: 8,
    fontSize: 16,
    color: "#666",
  },
});

export default FindCoach;
