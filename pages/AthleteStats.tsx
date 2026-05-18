// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LineChart } from "react-native-chart-kit";
import { Path } from "react-native-svg";
import { auth, db } from "../src/config/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  setDoc,
  collection,
  query,
  getDocs,
  where,
} from "../src/compat/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const chartWidth = Dimensions.get("window").width - 50;
const CHART_HEIGHT = 200;

const AthleteStats = () => {
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [userData, setUserData] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // State for progression data
  const [squatData, setSquatData] = useState(null);
  const [benchData, setBenchData] = useState(null);
  const [deadliftData, setDeadliftData] = useState(null);
  const [currentMaxes, setCurrentMaxes] = useState({
    squat: { weight: 0, achievedAt: null },
    bench: { weight: 0, achievedAt: null },
    deadlift: { weight: 0, achievedAt: null },
  });

  // State for demo data
  const [isDemoData, setIsDemoData] = useState(false);
  const [demoProgressionData, setDemoProgressionData] = useState(null);

  // State for update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newSquatMax, setNewSquatMax] = useState("");
  const [newBenchMax, setNewBenchMax] = useState("");
  const [newDeadliftMax, setNewDeadliftMax] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // State for showing max date modal
  const [showMaxDateModal, setShowMaxDateModal] = useState(false);
  const [selectedMax, setSelectedMax] = useState(null);

  // Get current year and create array of last 5 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const availableYears = years; // Define availableYears as the same as years
  const [selectedYear, setSelectedYear] = useState(
    String(Math.min(Math.max(currentYear, 2021), 2025))
  );

  // Full month names for tooltips
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Colors for charts
  const colors = {
    benchPress: "#FFB6C1",
    squat: "#ADD8E6",
    deadlift: "#90EE90",
  };

  // Convert lbs to kg
  const lbsToKg = (lbs) => {
    return Math.round((lbs / 2.20462) * 10) / 10; // Convert and round to 1 decimal
  };

  // Update max lifts
  const handleUpdateMaxes = async () => {
    // Validate inputs - at least one field should be filled
    if (!newSquatMax && !newBenchMax && !newDeadliftMax) {
      Alert.alert("Error", "Please enter at least one max lift to update");
      return;
    }

    // Validate that entered values are valid numbers
    if (
      (newSquatMax && isNaN(parseFloat(newSquatMax))) ||
      (newBenchMax && isNaN(parseFloat(newBenchMax))) ||
      (newDeadliftMax && isNaN(parseFloat(newDeadliftMax)))
    ) {
      Alert.alert("Error", "Please enter valid numbers for all lifts");
      return;
    }

    // Check if we're in demo mode
    if (isDemoData) {
      Alert.alert(
        "Demo Mode",
        "You are currently in demo mode. Updates are not saved in demo mode.",
        [{ text: "OK" }]
      );
      setShowUpdateModal(false);
      return;
    }

    setIsUpdating(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const now = new Date();
      const analyticsRef = doc(db, "users", user.uid);

      try {
        // Get current document to check if it exists
        const analyticsDoc = await getDoc(analyticsRef);

        // Prepare updates object - only include fields that have values
        const updates = {};
        const progressionUpdates = {};

        if (newSquatMax) {
          const squatWeight = parseFloat(newSquatMax);
          updates["currentMaxes.squat"] = {
            weight: squatWeight,
            achievedAt: serverTimestamp(),
          };
          progressionUpdates["squatProgression"] = arrayUnion({
            date: now,
            weight: squatWeight,
          });
        }

        if (newBenchMax) {
          const benchWeight = parseFloat(newBenchMax);
          updates["currentMaxes.bench"] = {
            weight: benchWeight,
            achievedAt: serverTimestamp(),
          };
          progressionUpdates["benchProgression"] = arrayUnion({
            date: now,
            weight: benchWeight,
          });
        }

        if (newDeadliftMax) {
          const deadliftWeight = parseFloat(newDeadliftMax);
          updates["currentMaxes.deadlift"] = {
            weight: deadliftWeight,
            achievedAt: serverTimestamp(),
          };
          progressionUpdates["deadliftProgression"] = arrayUnion({
            date: now,
            weight: deadliftWeight,
          });
        }

        if (analyticsDoc.exists()) {
          // Update the existing document
          await updateDoc(doc(db, "analytics", user.uid), {
            ...updates,
            ...progressionUpdates,
            updatedAt: serverTimestamp(),
          });
          console.log("Updated analytics document for user:", user.uid);
        } else {
          // Create a new analytics document if it doesn't exist
          const initialData = {
            currentMaxes: {
              squat: newSquatMax
                ? {
                    weight: parseFloat(newSquatMax),
                    achievedAt: serverTimestamp(),
                  }
                : { weight: 0, achievedAt: null },
              bench: newBenchMax
                ? {
                    weight: parseFloat(newBenchMax),
                    achievedAt: serverTimestamp(),
                  }
                : { weight: 0, achievedAt: null },
              deadlift: newDeadliftMax
                ? {
                    weight: parseFloat(newDeadliftMax),
                    achievedAt: serverTimestamp(),
                  }
                : { weight: 0, achievedAt: null },
            },
            squatProgression: newSquatMax
              ? [{ date: now, weight: parseFloat(newSquatMax) }]
              : [],
            benchProgression: newBenchMax
              ? [{ date: now, weight: parseFloat(newBenchMax) }]
              : [],
            deadliftProgression: newDeadliftMax
              ? [{ date: now, weight: parseFloat(newDeadliftMax) }]
              : [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            userId: user.uid,
          };

          await setDoc(doc(db, "analytics", user.uid), initialData);
          console.log("Created new analytics document for user:", user.uid);
        }

        // Refresh data
        await loadUserData();
        Alert.alert("Success", "Your max lifts have been updated");

        // Close modal and clear inputs
        setShowUpdateModal(false);
        setNewSquatMax("");
        setNewBenchMax("");
        setNewDeadliftMax("");
      } catch (firebaseError) {
        console.error("Firebase error updating max lifts:", firebaseError);

        if (
          firebaseError.message &&
          firebaseError.message.includes("permission")
        ) {
          Alert.alert(
            "Permission Error",
            "You don't have permission to update your data. This could be because your account hasn't been properly set up or there's an issue with your permissions. You can try:\n\n1. Logging out and logging back in\n2. Contacting support for assistance\n\nIn the meantime, you can use demo data to explore the app.",
            [
              {
                text: "Load Demo Data",
                onPress: () => generateDemoData(true),
              },
              { text: "Cancel" },
            ]
          );
        } else {
          Alert.alert(
            "Error",
            "Failed to update your max lifts. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error updating max lifts:", error);
      Alert.alert(
        "Error",
        "Failed to update your max lifts. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if athlete is connected to a coach
  const checkCoachConnection = async (userId) => {
    try {
      // Get all coaches from the users collection
      const coachesQuery = query(
        collection(db, "users"),
        where("role", "==", "coach")
      );
      const coachesSnapshot = await getDocs(coachesQuery);

      // Check each coach's athlete list
      for (const coachDoc of coachesSnapshot.docs) {
        const coachData = coachDoc.data();

        // Check if this athlete is in the coach's athletes array
        if (coachData.athletes && coachData.athletes.includes(userId)) {
          return true;
        }

        // Check if this athlete is in the coach's clientList array
        if (coachData.clientList) {
          for (const client of coachData.clientList) {
            if (client.athleteId === userId) {
              return true;
            }
          }
        }
      }

      // No coach connection found
      return false;
    } catch (error) {
      console.error("Error checking coach connection:", error);
      return false;
    }
  };

  const loadUserData = async (yearToLoad = selectedYear) => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        try {
          // Get user data
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            // Create a basic user document if it doesn't exist
            console.log("Creating basic user document for:", user.uid);
            const displayName = user.displayName || "";
            const nameParts = displayName.split(" ");
            const firstName = nameParts[0] || "User";
            const lastName = nameParts.slice(1).join(" ") || "";
            const email = user.email || "";
            const username =
              email.split("@")[0] ||
              `user_${Math.floor(Math.random() * 10000)}`;

            const userData = {
              firstName: firstName,
              lastName: lastName,
              email: email,
              username: username,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              profileColor:
                "#" + Math.floor(Math.random() * 16777215).toString(16), // Random color
              role: "athlete",
              isActive: true,
            };

            await setDoc(userRef, userData);
            setUserData(userData);
          } else {
            setUserData(userDoc.data());
          }

          // Check if athlete is connected to a coach
          const isConnectedToCoach = await checkCoachConnection(user.uid);
          if (!isConnectedToCoach && !isDemoData) {
            // Only show the alert if we haven't shown it recently
            const shouldShow = await shouldShowCoachAlert();
            if (shouldShow) {
              // Show a message that they need to be connected to a coach
              Alert.alert(
                "Not Connected to Coach",
                "Your data is being saved, but you're not currently connected to a coach. Ask your coach to add you to their client list for your data to be visible to them.",
                [{ text: "OK" }]
              );
              // Save the current time so we don't show this alert again soon
              await saveCoachAlertTime();
            }
          }

          // Get analytics data
          const analyticsDoc = await getDoc(doc(db, "analytics", user.uid));

          if (analyticsDoc.exists()) {
            const analyticsData = analyticsDoc.data();

            // Store the original progression data for year changes
            if (!isDemoData) {
              setDemoProgressionData({
                squatProgression: analyticsData.squatProgression || [],
                benchProgression: analyticsData.benchProgression || [],
                deadliftProgression: analyticsData.deadliftProgression || [],
              });
            }

            // Calculate year maxes for the selected year
            if (
              analyticsData.squatProgression ||
              analyticsData.benchProgression ||
              analyticsData.deadliftProgression
            ) {
              const yearMaxes = calculateYearMaxes(
                analyticsData.squatProgression || [],
                analyticsData.benchProgression || [],
                analyticsData.deadliftProgression || [],
                yearToLoad
              );

              setCurrentMaxes(yearMaxes);

              // Update input fields with current maxes
              if (yearMaxes.squat.weight) {
                setNewSquatMax(yearMaxes.squat.weight.toString());
              }
              if (yearMaxes.bench.weight) {
                setNewBenchMax(yearMaxes.bench.weight.toString());
              }
              if (yearMaxes.deadlift.weight) {
                setNewDeadliftMax(yearMaxes.deadlift.weight.toString());
              }
            } else if (analyticsData.currentMaxes) {
              // If no progression data but we have current maxes, use those
              setCurrentMaxes({
                squat: analyticsData.currentMaxes.squat || {
                  weight: 0,
                  achievedAt: null,
                },
                bench: analyticsData.currentMaxes.bench || {
                  weight: 0,
                  achievedAt: null,
                },
                deadlift: analyticsData.currentMaxes.deadlift || {
                  weight: 0,
                  achievedAt: null,
                },
              });

              // Update input fields with current maxes
              if (analyticsData.currentMaxes.squat?.weight) {
                setNewSquatMax(
                  analyticsData.currentMaxes.squat.weight.toString()
                );
              }
              if (analyticsData.currentMaxes.bench?.weight) {
                setNewBenchMax(
                  analyticsData.currentMaxes.bench.weight.toString()
                );
              }
              if (analyticsData.currentMaxes.deadlift?.weight) {
                setNewDeadliftMax(
                  analyticsData.currentMaxes.deadlift.weight.toString()
                );
              }
            }

            // Process squat data
            if (
              analyticsData.squatProgression &&
              analyticsData.squatProgression.length > 0
            ) {
              const formattedSquatData = processProgressionData(
                analyticsData.squatProgression,
                yearToLoad
              );
              setSquatData(formattedSquatData);
            } else {
              setSquatData(createEmptyDataset());
            }

            // Process bench data
            if (
              analyticsData.benchProgression &&
              analyticsData.benchProgression.length > 0
            ) {
              const formattedBenchData = processProgressionData(
                analyticsData.benchProgression,
                yearToLoad
              );
              setBenchData(formattedBenchData);
            } else {
              setBenchData(createEmptyDataset());
            }

            // Process deadlift data
            if (
              analyticsData.deadliftProgression &&
              analyticsData.deadliftProgression.length > 0
            ) {
              const formattedDeadliftData = processProgressionData(
                analyticsData.deadliftProgression,
                yearToLoad
              );
              setDeadliftData(formattedDeadliftData);
            } else {
              setDeadliftData(createEmptyDataset());
            }
          } else {
            console.log(
              "No analytics document found for user, showing empty data"
            );
            // No analytics data, set empty datasets
            setSquatData(createEmptyDataset());
            setBenchData(createEmptyDataset());
            setDeadliftData(createEmptyDataset());

            // Set empty maxes
            setCurrentMaxes({
              squat: { weight: 0, achievedAt: null },
              bench: { weight: 0, achievedAt: null },
              deadlift: { weight: 0, achievedAt: null },
            });

            // Clear input fields
            setNewSquatMax("");
            setNewBenchMax("");
            setNewDeadliftMax("");
          }
        } catch (firebaseError) {
          console.error("Firebase error loading user data:", firebaseError);

          // Check if it's a Firebase permission error
          if (
            firebaseError.message &&
            firebaseError.message.includes("permission")
          ) {
            console.log(
              "Permission error detected in loadUserData, loading demo data"
            );
            // Load demo data as fallback for permission errors
            generateDemoData(true);
            return; // Exit early since we're loading demo data
          } else {
            // Set empty datasets on other errors
            setSquatData(createEmptyDataset());
            setBenchData(createEmptyDataset());
            setDeadliftData(createEmptyDataset());

            // Set empty maxes
            setCurrentMaxes({
              squat: { weight: 0, achievedAt: null },
              bench: { weight: 0, achievedAt: null },
              deadlift: { weight: 0, achievedAt: null },
            });
          }
        }
      } else {
        // No user logged in, load demo data
        console.log("No user logged in, loading demo data");
        generateDemoData(true);
        return; // Exit early since we're loading demo data
      }
    } catch (error) {
      console.error("Error loading user data:", error);

      // Check if it's a Firebase permission error
      if (error.message && error.message.includes("permission")) {
        console.log(
          "Permission error detected in loadUserData, loading demo data"
        );
        // Load demo data as fallback for permission errors
        generateDemoData(true);
        return; // Exit early since we're loading demo data
      }

      // Set empty datasets on other errors
      setSquatData(createEmptyDataset());
      setBenchData(createEmptyDataset());
      setDeadliftData(createEmptyDataset());

      // Set empty maxes
      setCurrentMaxes({
        squat: { weight: 0, achievedAt: null },
        bench: { weight: 0, achievedAt: null },
        deadlift: { weight: 0, achievedAt: null },
      });
    } finally {
      setIsLoading(false);
      if (!isDemoData) {
        setIsDemoData(false); // Ensure we're not in demo mode when loading real data
        saveDemoDataState(false); // Save the real data state to AsyncStorage
      }
    }
  };

  // Save selected year to AsyncStorage
  const saveSelectedYear = async (year) => {
    try {
      await AsyncStorage.setItem("selectedYear", year);
      console.log(`[DEBUG] Saved selected year to storage: ${year}`);
    } catch (error) {
      console.error("Error saving selected year:", error);
    }
  };

  // Load selected year from AsyncStorage
  const loadSelectedYear = async () => {
    try {
      const savedYear = await AsyncStorage.getItem("selectedYear");
      if (savedYear) {
        console.log(`[DEBUG] Loaded selected year from storage: ${savedYear}`);
        setSelectedYear(savedYear);
        return savedYear;
      }
      return null;
    } catch (error) {
      console.error("Error loading selected year:", error);
      return null;
    }
  };

  // Save demo data state to AsyncStorage
  const saveDemoDataState = async (isDemoMode) => {
    try {
      await AsyncStorage.setItem("isDemoData", isDemoMode.toString());
      console.log(`[DEBUG] Saved demo data state: ${isDemoMode}`);
    } catch (error) {
      console.error("Error saving demo data state:", error);
    }
  };

  // Load demo data state from AsyncStorage
  const loadDemoDataState = async () => {
    try {
      const savedState = await AsyncStorage.getItem("isDemoData");
      if (savedState) {
        const isDemoMode = savedState === "true";
        console.log(`[DEBUG] Loaded demo data state: ${isDemoMode}`);
        setIsDemoData(isDemoMode);
        return isDemoMode;
      }
      return false;
    } catch (error) {
      console.error("Error loading demo data state:", error);
      return false;
    }
  };

  // Handle year selection
  const handleYearSelect = async (year) => {
    console.log(`[DEBUG] Year selected: ${year}`);
    setSelectedYear(year);
    setShowYearDropdown(false);
    await saveSelectedYear(year);

    // Set loading state
    setIsLoading(true);

    try {
      if (isDemoData && demoProgressionData) {
        // For demo data, recalculate with the selected year
        const yearMaxes = calculateYearMaxes(
          demoProgressionData.squatProgression,
          demoProgressionData.benchProgression,
          demoProgressionData.deadliftProgression,
          year
        );

        // Process data for charts
        const processedSquatData = processProgressionData(
          demoProgressionData.squatProgression,
          year
        );
        const processedBenchData = processProgressionData(
          demoProgressionData.benchProgression,
          year
        );
        const processedDeadliftData = processProgressionData(
          demoProgressionData.deadliftProgression,
          year
        );

        // Update chart data
        setSquatData(processedSquatData);
        setBenchData(processedBenchData);
        setDeadliftData(processedDeadliftData);
        setCurrentMaxes(yearMaxes);
      } else {
        // For real data, reload from Firebase with the selected year
        try {
          await loadUserData(year);
        } catch (error) {
          console.error("Error loading data for selected year:", error);

          // If it's a Firebase permission error, switch to demo data
          if (error.message && error.message.includes("permission")) {
            Alert.alert(
              "Permission Error",
              "Unable to access your data due to permission issues. Switching to demo data.",
              [{ text: "OK" }]
            );
            generateDemoData(true);
          }
        }
      }
    } catch (error) {
      console.error("Error handling year selection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data with the saved year on initial mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      const savedYear = await loadSelectedYear();
      const isDemoMode = await loadDemoDataState();

      if (isDemoMode) {
        // If we were in demo mode, regenerate the demo data
        generateDemoData(false);
      } else {
        try {
          // Check if user is authenticated
          const user = auth.currentUser;
          if (!user) {
            console.log("No user logged in, loading demo data");
            Alert.alert(
              "Not Logged In",
              "You're not currently logged in. Loading demo data so you can explore the app.",
              [{ text: "OK" }]
            );
            generateDemoData(true);
            return;
          }

          // Try to access Firebase data
          try {
            // Test if we have permission by trying to read user data
            const userDoc = await getDoc(doc(db, "users", user.uid));

            // If we get here, we have permission, so load user data
            await loadUserData(savedYear || selectedYear);
          } catch (firebaseError) {
            console.error(
              "Firebase error during initialization:",
              firebaseError
            );

            // If it's a permissions error, load demo data
            if (
              firebaseError.message &&
              firebaseError.message.includes("permission")
            ) {
              console.log(
                "Permission error detected during initialization, loading demo data"
              );
              Alert.alert(
                "Data Access Error",
                "Unable to access your data due to permission issues. This could be because you don't have the correct permissions or your account hasn't been fully set up yet. Loading demo data instead.",
                [{ text: "OK" }]
              );
              generateDemoData(true);
            } else {
              // For other Firebase errors, still load demo data as fallback
              console.log(
                "Other Firebase error, loading demo data as fallback"
              );
              Alert.alert(
                "Data Access Error",
                "There was a problem accessing your data. Loading demo data instead so you can explore the app.",
                [{ text: "OK" }]
              );
              generateDemoData(true);
            }
          }
        } catch (error) {
          console.error("Error during initialization:", error);
          // Load demo data as fallback for any error
          Alert.alert(
            "Error",
            "An unexpected error occurred. Loading demo data so you can explore the app.",
            [{ text: "OK" }]
          );
          generateDemoData(true);
        }
      }
    };

    initializeData();
  }, []);

  // Custom tooltip component
  const Tooltip = ({ tooltipData, color }) => {
    if (!tooltipData) return null;

    return (
      <Animated.View
        style={[
          styles.tooltip,
          {
            borderColor: color,
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.tooltipTitle}>{tooltipData.liftType}</Text>
        <Text style={styles.tooltipWeight}>{tooltipData.weight} kg</Text>
        {tooltipData.exactDate ? (
          <Text style={styles.tooltipDate}>
            {formatDate(tooltipData.exactDate)}
          </Text>
        ) : (
          <Text style={styles.tooltipDate}>
            Week {tooltipData.label?.substring(1)} / {selectedYear}
          </Text>
        )}
      </Animated.View>
    );
  };

  const NotMemberMessage = () => (
    <View style={styles.notMemberContainer}>
      <Text style={styles.notMemberText}>
        No data available for {selectedYear}
      </Text>
    </View>
  );

  // Function to get y-axis configuration based on the lift data
  const getYAxisConfig = (liftData) => {
    if (
      !liftData ||
      !liftData.datasets ||
      !liftData.datasets[0] ||
      !liftData.datasets[0].data
    ) {
      return {
        max: 250,
        min: 0,
        ticks: [0, 50, 100, 150, 200, 250],
      };
    }

    // Filter out null values
    const validData = liftData.datasets[0].data.filter(
      (val) => val !== null && val > 0
    );

    if (validData.length === 0) {
      return {
        max: 250,
        min: 0,
        ticks: [0, 50, 100, 150, 200, 250],
      };
    }

    const maxValue = Math.max(...validData);
    const minValue = Math.min(...validData);

    // Round up max to the next 50
    const roundedMax = Math.ceil(maxValue / 50) * 50;

    // Round down min to the previous 50 or 75% of min value, whichever is lower
    // This creates some space below the lowest data point
    const calculatedMin = Math.max(0, Math.floor((minValue * 0.75) / 50) * 50);

    const ticks = [];
    for (let i = calculatedMin; i <= roundedMax; i += 50) {
      ticks.push(i);
    }

    return {
      max: roundedMax,
      min: calculatedMin,
      ticks: ticks,
    };
  };

  // Common chart configuration with updates
  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 1,
    barPercentage: 0.5,
    useShadowColorFromDataset: true,
    fillShadowGradientOpacity: 0.2,
    propsForBackgroundLines: {
      strokeDasharray: "5, 5",
      strokeWidth: 1,
      stroke: "rgba(0, 0, 0, 0.1)",
    },
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 30,
    paddingBottom: 25,
    propsForLabels: {
      fontSize: 10,
      fontWeight: "400",
    },
    formatYLabel: (value) => {
      const numValue = Number(value);

      const maxValue = yAxisConfig?.max || 100;
      let displayInterval = 20;

      if (maxValue > 200) {
        displayInterval = 50;
      } else if (maxValue > 100) {
        displayInterval = 30;
      }

      // Only show labels at the specified intervals
      return numValue % displayInterval === 0 ? `${numValue}` : "";
    },
  };

  const chartStyle = {
    marginVertical: 8,
    borderRadius: 16,
    padding: 10,
    paddingBottom: 30,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 25,
  };

  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [showDataPointModal, setShowDataPointModal] = useState(false);

  const renderChart = (data, title, color, dataKey) => {
    if (!data) return null;

    // Get the correct data based on the lift type
    const chartData = {
      labels: data.labels || [],
      datasets: [
        {
          data: data.datasets?.[0]?.data || [],
          strokeWidth: 3,
        },
      ],
      dates: data.dates || [],
      isPRMonth: data.isPRMonth || [],
      scale: "monthly", // Always use monthly scale
    };

    // Check if there's any data for this year
    const hasData = chartData.datasets[0].data.some(
      (value) => value !== null && value > 0
    );

    if (!hasData) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={[styles.noDataText, { color: "#666" }]}>
            No {title.toLowerCase()} data available for {selectedYear}
          </Text>
        </View>
      );
    }

    // Get y-axis config based on lift data
    const yAxisConfig = getYAxisConfig(chartData);

    // Create a lighter version of the color for gradient
    const hexColor = color.startsWith("#") ? color : "#" + color;
    const rgbColor = hexToRgb(hexColor);
    const lightColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`;
    const mediumColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.5)`;

    // Update the dataset color to match the title color
    chartData.datasets[0].color = (opacity = 1) => {
      // Return full hex color for the line
      if (opacity >= 1) return hexColor;
      // Return rgba for gradient fill
      return `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
    };

    // Create a custom dataset that only connects months with actual data
    const customDataset = {
      labels: chartData.labels,
      datasets: [
        {
          // Keep null values as null instead of converting to 0
          data: chartData.datasets[0].data,
          color: chartData.datasets[0].color,
          strokeWidth: 3,
          withDots: chartData.datasets[0].data.map((value) => value !== null),
        },
      ],
    };

    return (
      <View style={styles.singleChartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{title}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <LineChart
            data={customDataset}
            width={Dimensions.get("window").width - 50}
            height={180}
            chartConfig={{
              backgroundColor: "transparent",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => chartData.datasets[0].color(opacity),
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              strokeWidth: 2,
              barPercentage: 0.5,
              useShadowColorFromDataset: true,
              fillShadowGradient: hexColor,
              fillShadowGradientOpacity: 0.2,
              propsForBackgroundLines: {
                strokeDasharray: "6, 6",
                strokeWidth: 1,
                stroke: "rgba(230, 230, 230, 0.9)",
              },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#fff",
              },
              paddingLeft: 0,
              paddingRight: 40,
              paddingTop: 20,
              paddingBottom: 20,
              propsForLabels: {
                fontSize: 7,
                fontWeight: "500",
                fill: "#666",
                rotation: 0,
              },
            }}
            onDataPointClick={({ index }) => {
              // Only allow click on actual PR months and only if there's actual data
              if (
                chartData.isPRMonth[index] &&
                chartData.datasets[0].data[index] !== null
              ) {
                const weight = chartData.datasets[0].data[index];
                const date = chartData.dates[index];
                const month = chartData.labels[index];

                // Create more detailed data point information
                setSelectedDataPoint({
                  title: `${title} - ${month} ${selectedYear}`,
                  value: weight, // This is the max PB for the month
                  weight: weight, // Add this explicitly for consistency
                  date,
                  color,
                  week: month, // For monthly view, use month instead of week
                  description: `Max ${title.toLowerCase()} PR in ${month}`,
                  subtitle: `Personal Best: ${weight}kg`,
                });

                setShowDataPointModal(true);
              }
            }}
            bezier={false}
            withDots={true}
            renderDotContent={({ x, y, index }) => {
              // Only render dots for months with actual data
              if (chartData.datasets[0].data[index] === null) {
                return null;
              }
              return (
                <View
                  key={index}
                  style={{
                    position: "absolute",
                    left: x - 5,
                    top: y - 5,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: hexColor,
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                />
              );
            }}
            getDotProps={(dataPoint, index) => {
              // Only show dots for months with actual data
              if (chartData.datasets[0].data[index] === null) {
                return { r: "0", strokeWidth: "0" };
              }
              return { r: "5", strokeWidth: "2", stroke: "#fff" };
            }}
            // Custom path component to only connect dots for months with actual data
            renderDecorator={({ line, x, y }) => {
              // Find indices of months with actual data
              const monthsWithData = chartData.datasets[0].data
                .map((value, index) => (value !== null ? index : -1))
                .filter((index) => index !== -1);

              if (monthsWithData.length <= 1) {
                return null; // No line if only one or zero data points
              }

              // Create a custom path that only connects consecutive months with data
              let pathD = "";
              let lastX = null;
              let lastY = null;

              // Calculate chart dimensions
              const chartWidth = Dimensions.get("window").width - 50;
              const chartHeight = 180;
              const paddingRight = 40;
              const paddingLeft = 0;
              const paddingTop = 20;
              const paddingBottom = 20;

              // Calculate the content area dimensions
              const contentWidth = chartWidth - paddingLeft - paddingRight;
              const contentHeight = chartHeight - paddingTop - paddingBottom;

              // Calculate the step between each month on x-axis
              const step = contentWidth / (chartData.labels.length - 1);

              // For each month with data, calculate its position and add to path
              monthsWithData.forEach((monthIndex, i) => {
                // Get the value for this month
                const value = chartData.datasets[0].data[monthIndex];
                if (value === null) return;

                // Calculate x position based on month index
                const xPos = paddingLeft + monthIndex * step;

                // Calculate y position based on value
                // Map the value from data range to pixel range
                const dataRange = yAxisConfig.max - yAxisConfig.min;
                const yPos =
                  chartHeight -
                  paddingBottom -
                  ((value - yAxisConfig.min) / dataRange) * contentHeight;

                if (i === 0) {
                  // First point - move to this position
                  pathD += `M ${xPos} ${yPos} `;
                } else {
                  // Only connect to previous point if it's the next consecutive month
                  const prevMonthIndex = monthsWithData[i - 1];
                  if (monthIndex === prevMonthIndex + 1) {
                    // Connect to previous point if consecutive
                    pathD += `L ${xPos} ${yPos} `;
                  } else {
                    // Start a new line segment for non-consecutive months
                    pathD += `M ${xPos} ${yPos} `;
                  }
                }

                lastX = xPos;
                lastY = yPos;
              });

              return pathD ? (
                <Path d={pathD} stroke={hexColor} strokeWidth={2} fill="none" />
              ) : null;
            }}
            fromZero={false}
            style={{
              marginVertical: 8,
              borderRadius: 16,
              padding: 0,
              paddingBottom: 20,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#f0f0f0",
              marginBottom: 15,
              marginLeft: 0,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withShadow={true}
            segments={4}
            yAxisInterval={1}
            yAxisMax={yAxisConfig.max}
            yAxisMin={yAxisConfig.min}
            yAxisSuffix="kg"
            formatXLabel={(value) => {
              // Use just the first three letters of month names to ensure they fit
              return value.substring(0, 3);
            }}
          />
        )}
      </View>
    );
  };

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    // Remove # if present
    hex = hex.replace("#", "");

    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
  };

  // Show max date modal when a max lift is clicked
  const handleMaxLiftClick = (liftType) => {
    setSelectedMax({
      type: liftType,
      weight: currentMaxes[liftType].weight,
      achievedAt: currentMaxes[liftType].achievedAt,
    });
    setShowMaxDateModal(true);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";

    const date =
      timestamp instanceof Date
        ? timestamp
        : timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate the max weights for the selected year only
  const calculateYearMaxes = (squatData, benchData, deadliftData, year) => {
    const getYearMax = (progressionData) => {
      if (!progressionData || progressionData.length === 0) {
        return { weight: 0, achievedAt: null };
      }

      // Filter for the selected year
      const yearData = progressionData.filter((entry) => {
        const entryDate =
          entry.date instanceof Date ? entry.date : entry.date.toDate();
        return entryDate.getFullYear().toString() === year;
      });

      if (yearData.length === 0) {
        return { weight: 0, achievedAt: null };
      }

      // Find the max weight for this year
      let maxWeight = 0;
      yearData.forEach((entry) => {
        maxWeight = Math.max(maxWeight, entry.weight);
      });

      // Find the latest date with this max weight
      let latestDate = null;
      yearData.forEach((entry) => {
        if (entry.weight === maxWeight) {
          const entryDate =
            entry.date instanceof Date ? entry.date : entry.date.toDate();
          if (!latestDate || entryDate > latestDate) {
            latestDate = entryDate;
          }
        }
      });

      return {
        weight: maxWeight,
        achievedAt: latestDate,
      };
    };

    return {
      squat: getYearMax(squatData),
      bench: getYearMax(benchData),
      deadlift: getYearMax(deadliftData),
    };
  };

  // Create empty dataset for when there's no data
  const createEmptyDataset = () => {
    return {
      labels: monthNames.map((name) => name.substring(0, 3)),
      datasets: [
        {
          data: Array(12).fill(null),
        },
      ],
      dates: Array(12).fill(null),
      isPRMonth: Array(12).fill(false),
      hasDataForMonth: Array(12).fill(false),
      isEmpty: true,
    };
  };

  // Process progression data from Firestore into chart format
  const processProgressionData = (
    progressionArray,
    yearToProcess = selectedYear
  ) => {
    console.log(
      `[DEBUG] Processing progression data for year: ${yearToProcess}`
    );

    if (!progressionArray || progressionArray.length === 0) {
      console.log("[DEBUG] No progression data provided");
      return createEmptyDataset();
    }

    // Filter for selected year
    const yearData = progressionArray.filter((entry) => {
      const entryDate =
        entry.date instanceof Date ? entry.date : entry.date.toDate();
      return entryDate.getFullYear().toString() === yearToProcess.toString();
    });

    console.log(
      `[DEBUG] Found ${yearData.length} entries for year ${yearToProcess}`
    );

    if (yearData.length === 0) {
      console.log(`[DEBUG] No data for year ${yearToProcess}`);
      return createEmptyDataset();
    }

    // Sort data by date (older to newer)
    const sortedProgression = [...yearData].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : a.date.toDate();
      const dateB = b.date instanceof Date ? b.date : b.date.toDate();
      return dateA - dateB;
    });

    // Initialize arrays for chart data
    const labels = monthNames.map((name) => name.substring(0, 3));
    const data = Array(12).fill(null);
    const dates = Array(12).fill(null);
    const isPRMonth = Array(12).fill(false);
    const hasDataForMonth = Array(12).fill(false);

    // Track the highest weight seen so far
    let currentMax = 0;

    // Process actual submitted maxes
    sortedProgression.forEach((entry) => {
      const entryDate =
        entry.date instanceof Date ? entry.date : entry.date.toDate();
      const month = entryDate.getMonth();
      const weight = entry.weight;

      // Record the actual submitted max
      data[month] = weight;
      dates[month] = entryDate;
      hasDataForMonth[month] = true;

      // Check if it's a PR
      if (weight > currentMax) {
        currentMax = weight;
        isPRMonth[month] = true;
      }
    });

    // Check if we have any valid data points
    const hasValidData = data.some((value) => value !== null && value > 0);
    if (!hasValidData) {
      console.log("[DEBUG] No valid data points found");
      return createEmptyDataset();
    }

    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
      dates,
      isPRMonth,
      hasDataForMonth,
      isEmpty: !hasValidData,
    };
  };

  // Generate demo data function
  const generateDemoData = (shouldSaveState = true) => {
    setIsLoading(true);

    // Use fixed years starting from 2021 instead of relative years
    const startYear = 2021;
    const endYear = 2025;

    // Create mock user data to match coach's implementation
    const mockUser = {
      firstName: "Demo",
      lastName: "User",
      profileColor: "#A8E6CF",
    };

    // Generate 5 years of progression data with more realistic patterns and few missing months
    const generateProgression = (startWeight, yearlyIncrease, liftType) => {
      const progression = [];

      // Maximum weights to cap progression
      const maxWeights = {
        squat: 250, // Match coach's implementation
        bench: 140, // Match coach's implementation
        deadlift: 270, // Match coach's implementation
      };

      // Define the final weight for each year
      const yearEndWeights = {};
      for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
        const year = (startYear + yearOffset).toString();
        // Year end weight increases by the yearly increase amount, with more modest effect
        const dramaticIncrease = yearlyIncrease * (1.2 + yearOffset * 0.15); // More realistic increases each year

        // Calculate how much to add this year
        let calculatedWeight = Math.round(
          startWeight + dramaticIncrease * yearOffset
        );

        // Cap the weight at the maximum for each lift type
        if (calculatedWeight > maxWeights[liftType]) {
          calculatedWeight = maxWeights[liftType];
        }

        yearEndWeights[year] = calculatedWeight;
      }

      // Track the all-time best to avoid regressions
      let allTimeBest = startWeight - 5;

      // Track the highest weight achieved in each year
      const yearHighestWeights = {};

      // Create unique progression patterns for each lift in each year
      const createProgressPattern = (year, liftType) => {
        const yearIndex = year - startYear;
        // Return all months since we want data for every month
        return {
          months: Array.from({ length: 12 }, (_, i) => i), // All months 0-11
          monthsToSkip: [], // No months to skip
        };
      };

      for (let year = startYear; year <= endYear; year++) {
        const yearIndex = year - startYear;
        const baseWeight = startWeight + yearIndex * yearlyIncrease * 1.2;
        const yearString = year.toString();

        // Get progression pattern (now includes all months)
        const progressPattern = createProgressPattern(year, liftType);
        const sortedProgressMonths = progressPattern.months;

        // Calculate the weight jumps
        const totalProgressNeeded = yearEndWeights[yearString] - allTimeBest;
        const prMonthCount = sortedProgressMonths.length; // Now 12 months

        // Calculate average monthly increase
        const averageJumpPerProgressMonth = Math.max(
          1, // Minimum 1kg jumps
          Math.round((totalProgressNeeded / prMonthCount) * 1.2)
        );

        let currentYearBest = allTimeBest;
        yearHighestWeights[yearString] = currentYearBest;

        // Process each month
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          // Add realistic variability in jumps
          let jumpMultiplier = 1.0;

          // First month of the year gets a bigger jump
          if (monthIndex === 0) {
            jumpMultiplier = 1.5;
          }
          // Last month hits the year-end target
          else if (monthIndex === 11) {
            const remainingProgress =
              yearEndWeights[yearString] - currentYearBest;
            if (remainingProgress > 0) {
              currentYearBest += remainingProgress;
            }
          }
          // Middle months get smaller, varied increases
          else {
            // Add some randomness but ensure steady progress
            jumpMultiplier = 0.5 + Math.random() * 0.5;
          }

          // Customize progression by lift type
          switch (liftType) {
            case "squat":
              jumpMultiplier *= 1.2;
              break;
            case "bench":
              jumpMultiplier *= 0.9;
              break;
            case "deadlift":
              jumpMultiplier *= 1.3;
              break;
          }

          // Calculate weight increase
          if (monthIndex < 11) {
            // Not the last month
            const increase = Math.max(
              0.5,
              Math.round(averageJumpPerProgressMonth * jumpMultiplier)
            );
            currentYearBest += increase;
          }

          // Ensure we don't exceed the year-end target too early
          if (
            monthIndex < 11 &&
            currentYearBest >= yearEndWeights[yearString]
          ) {
            currentYearBest = yearEndWeights[yearString] - 2;
          }

          // Create date for this month
          const date = new Date(
            year,
            monthIndex,
            10 + Math.floor(Math.random() * 15)
          );
          if (date.getFullYear() !== year) {
            date.setFullYear(year);
          }

          // Add the progression point
          progression.push({
            weight: currentYearBest,
            date: date,
          });

          // Update year's highest weight
          yearHighestWeights[yearString] = Math.max(
            yearHighestWeights[yearString],
            currentYearBest
          );
        }

        // Update all-time best
        allTimeBest = yearHighestWeights[yearString];
      }

      return progression;
    };

    // Generate mock progression data with 2021 starting weights and more realistic patterns
    // Use the exact same starting weights and yearly increases as in ClientsStats.js
    const squatProgression = generateProgression(50, 15, "squat"); // Start: 50kg in 2021, +15kg/year
    const benchProgression = generateProgression(30, 9, "bench"); // Start: 30kg in 2021, +9kg/year
    const deadliftProgression = generateProgression(60, 18, "deadlift"); // Start: 60kg in 2021, +18kg/year

    // Calculate year maxes
    const yearMaxes = calculateYearMaxes(
      squatProgression,
      benchProgression,
      deadliftProgression,
      selectedYear
    );

    // Process data for charts
    const processedSquatData = processProgressionData(
      squatProgression,
      selectedYear
    );
    const processedBenchData = processProgressionData(
      benchProgression,
      selectedYear
    );
    const processedDeadliftData = processProgressionData(
      deadliftProgression,
      selectedYear
    );

    // Update state with demo data
    setUserData(mockUser);
    setSquatData(processedSquatData);
    setBenchData(processedBenchData);
    setDeadliftData(processedDeadliftData);
    setCurrentMaxes(yearMaxes);

    // Store the original progression data for year changes
    setDemoProgressionData({
      squatProgression,
      benchProgression,
      deadliftProgression,
    });

    // Update input fields with current maxes
    setNewSquatMax(yearMaxes.squat.weight.toString());
    setNewBenchMax(yearMaxes.bench.weight.toString());
    setNewDeadliftMax(yearMaxes.deadlift.weight.toString());

    // Set demo data flag
    setIsDemoData(true);
    setIsLoading(false);

    // If the selected year is outside our range, select the first year
    if (
      parseInt(selectedYear) < startYear ||
      parseInt(selectedYear) > endYear
    ) {
      handleYearSelect(startYear.toString());
    }

    // Save demo data state to AsyncStorage if requested
    if (shouldSaveState) {
      saveDemoDataState(true);
    }
  };

  // Refresh function
  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    console.log(`[DEBUG] Refreshing data for year: ${selectedYear}`);

    if (isDemoData && demoProgressionData) {
      // For demo data, recalculate with the current year
      const yearMaxes = calculateYearMaxes(
        demoProgressionData.squatProgression,
        demoProgressionData.benchProgression,
        demoProgressionData.deadliftProgression,
        selectedYear
      );

      // Process data for charts
      const processedSquatData = processProgressionData(
        demoProgressionData.squatProgression,
        selectedYear
      );
      const processedBenchData = processProgressionData(
        demoProgressionData.benchProgression,
        selectedYear
      );
      const processedDeadliftData = processProgressionData(
        demoProgressionData.deadliftProgression,
        selectedYear
      );

      // Update chart data
      setSquatData(processedSquatData);
      setBenchData(processedBenchData);
      setDeadliftData(processedDeadliftData);
      setCurrentMaxes(yearMaxes);
    } else {
      try {
        // For real data, reload from Firebase with the selected year
        await loadUserData(selectedYear);
      } catch (error) {
        console.error("Error refreshing data:", error);

        // If it's a Firebase permission error, switch to demo data
        if (error.message && error.message.includes("permission")) {
          Alert.alert(
            "Permission Error",
            "Unable to access your data due to permission issues. Switching to demo data.",
            [{ text: "OK" }]
          );
          generateDemoData(true);
        }
      }
    }

    setIsRefreshing(false);
  }, [selectedYear, isDemoData, demoProgressionData]);

  // Check if we should show the coach connection alert
  const shouldShowCoachAlert = async () => {
    try {
      const lastAlertTime = await AsyncStorage.getItem("lastCoachAlertTime");
      if (!lastAlertTime) {
        return true;
      }

      // Only show the alert once per day
      const lastTime = parseInt(lastAlertTime);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      return now - lastTime > oneDayMs;
    } catch (error) {
      console.error("Error checking coach alert time:", error);
      return true;
    }
  };

  // Save the time when we showed the coach connection alert
  const saveCoachAlertTime = async () => {
    try {
      await AsyncStorage.setItem("lastCoachAlertTime", Date.now().toString());
    } catch (error) {
      console.error("Error saving coach alert time:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Analytics</Text>

      <TouchableOpacity
        style={styles.testButton}
        onPress={async () => {
          if (isDemoData) {
            setIsDemoData(false);
            await saveDemoDataState(false);
            await loadUserData();
          } else {
            generateDemoData(true);
          }
        }}
      >
        <Text style={styles.testButtonText}>
          {isDemoData ? "Return to My Data" : "Load Demo Data"}
        </Text>
      </TouchableOpacity>

      {/* Current Max Lifts Display */}
      <View style={styles.maxLiftsContainer}>
        <TouchableOpacity
          style={[styles.maxLiftCard, { borderColor: colors.squat }]}
          onPress={() => handleMaxLiftClick("squat")}
        >
          <Text style={styles.maxLiftLabel}>Squat</Text>
          <Text style={styles.maxLiftValue}>
            {currentMaxes.squat.weight} kg
          </Text>
          <Icon
            name="calendar-outline"
            size={12}
            color="#666"
            style={styles.calendarIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.maxLiftCard, { borderColor: colors.benchPress }]}
          onPress={() => handleMaxLiftClick("bench")}
        >
          <Text style={styles.maxLiftLabel}>Bench</Text>
          <Text style={styles.maxLiftValue}>
            {currentMaxes.bench.weight} kg
          </Text>
          <Icon
            name="calendar-outline"
            size={12}
            color="#666"
            style={styles.calendarIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.maxLiftCard, { borderColor: colors.deadlift }]}
          onPress={() => handleMaxLiftClick("deadlift")}
        >
          <Text style={styles.maxLiftLabel}>Deadlift</Text>
          <Text style={styles.maxLiftValue}>
            {currentMaxes.deadlift.weight} kg
          </Text>
          <Icon
            name="calendar-outline"
            size={12}
            color="#666"
            style={styles.calendarIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Update Max Button */}
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => setShowUpdateModal(true)}
      >
        <Text style={styles.updateButtonText}>Update Max Lifts</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.clientName}>
              {userData?.firstName} {userData?.lastName}
            </Text>
            <Text style={styles.chartTitle}>PR Progression</Text>
          </View>
          <TouchableOpacity
            style={styles.yearContainer}
            onPress={() => setShowYearDropdown(true)}
          >
            <Text style={styles.yearLabel}>{selectedYear}</Text>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Year dropdown modal */}
        <Modal
          visible={showYearDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearDropdown(false)}
          >
            <View style={styles.yearDropdownContainer}>
              <View style={styles.yearDropdown}>
                {availableYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearOption,
                      selectedYear === year && styles.selectedYearOption,
                    ]}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text
                      style={[
                        styles.yearOptionText,
                        selectedYear === year && styles.selectedYearOptionText,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Chart content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <>
            {/* Check if there's any data for the selected year */}
            {(!squatData ||
              squatData.isEmpty ||
              (squatData.datasets[0].data.length === 1 &&
                squatData.datasets[0].data[0] === 0)) &&
            (!benchData ||
              benchData.isEmpty ||
              (benchData.datasets[0].data.length === 1 &&
                benchData.datasets[0].data[0] === 0)) &&
            (!deadliftData ||
              deadliftData.isEmpty ||
              (deadliftData.datasets[0].data.length === 1 &&
                deadliftData.datasets[0].data[0] === 0)) ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  No lift data available for {selectedYear}
                </Text>
                <Text
                  style={[
                    styles.noDataText,
                    { fontSize: 14, marginTop: 10, fontWeight: "400" },
                  ]}
                >
                  Try selecting a different year or add new lifts
                </Text>
              </View>
            ) : (
              <>
                {squatData ? (
                  renderChart(squatData, "Squat", colors.squat, "squat")
                ) : (
                  <View style={styles.loadingChartContainer}>
                    <ActivityIndicator size="large" color={colors.squat} />
                  </View>
                )}

                {benchData ? (
                  renderChart(
                    benchData,
                    "Bench Press",
                    colors.benchPress,
                    "bench"
                  )
                ) : (
                  <View style={styles.loadingChartContainer}>
                    <ActivityIndicator size="large" color={colors.benchPress} />
                  </View>
                )}

                {deadliftData ? (
                  renderChart(
                    deadliftData,
                    "Deadlift",
                    colors.deadlift,
                    "deadlift"
                  )
                ) : (
                  <View style={styles.loadingChartContainer}>
                    <ActivityIndicator size="large" color={colors.deadlift} />
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Max Date Modal */}
      <Modal
        visible={showMaxDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMaxDateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMaxDateModal(false)}
        >
          <View style={styles.maxDateContainer}>
            {selectedMax && (
              <>
                <Text
                  style={[
                    styles.maxDateTitle,
                    {
                      color:
                        selectedMax.type === "squat"
                          ? colors.squat
                          : selectedMax.type === "bench"
                          ? colors.benchPress
                          : colors.deadlift,
                    },
                  ]}
                >
                  {selectedMax.type === "squat"
                    ? "Squat"
                    : selectedMax.type === "bench"
                    ? "Bench Press"
                    : "Deadlift"}{" "}
                  Max
                </Text>
                <Text style={styles.maxDateWeight}>
                  {selectedMax.weight} kg
                </Text>
                <Text style={styles.maxDateLabel}>Achieved on</Text>
                <Text style={styles.maxDateValue}>
                  {selectedMax.achievedAt
                    ? formatTimestamp(selectedMax.achievedAt)
                    : "Unknown date"}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMaxDateModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Update Max Lifts Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUpdateModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View style={styles.updateModalContainer}>
              <Text style={styles.updateModalTitle}>Update Max Lifts</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Squat (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newSquatMax}
                  onChangeText={setNewSquatMax}
                  placeholder="Enter squat max"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bench Press (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newBenchMax}
                  onChangeText={setNewBenchMax}
                  placeholder="Enter bench max"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Deadlift (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newDeadliftMax}
                  onChangeText={setNewDeadliftMax}
                  placeholder="Enter deadlift max"
                />
              </View>

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowUpdateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdateMaxes}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Data Point Modal */}
      <Modal
        visible={showDataPointModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDataPointModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDataPointModal(false)}
        >
          <View
            style={[
              styles.dataPointModalContainer,
              { borderLeftColor: selectedDataPoint?.color },
            ]}
          >
            <Text style={styles.dataPointModalTitle}>
              {selectedDataPoint?.title}
            </Text>
            <Text style={styles.dataPointModalWeight}>
              {selectedDataPoint?.weight} kg
            </Text>
            <Text style={styles.dataPointModalDescription}>
              {selectedDataPoint?.description}
            </Text>
            <Text style={styles.dataPointModalDate}>
              {selectedDataPoint?.date
                ? formatTimestamp(selectedDataPoint?.date)
                : "Date not available"}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDataPointModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 100,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  singleChartContainer: {
    width: Dimensions.get("window").width - 32,
    marginRight: 0,
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: "relative",
    overflow: "visible",
    zIndex: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 0.3,
  },
  loadingChartContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  noDataContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginVertical: 40,
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    width: "90%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noDataText: {
    fontSize: 18,
    color: "#555",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  tooltipWrapper: {
    position: "absolute",
    zIndex: 100,
  },
  fixedTooltipWrapper: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
    width: "100%",
  },
  tooltip: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    borderLeftWidth: 3,
    position: "relative",
  },
  yAxisValueContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 75,
    paddingRight: 15,
    paddingTop: 20,
    paddingBottom: 10,
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "transparent",
    zIndex: 10,
  },
  yAxisValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#555",
    textAlign: "right",
    position: "absolute",
    right: 15,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 20,
  },
  yearContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  dropdownIcon: {
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  yearDropdownContainer: {
    position: "absolute",
    top: 150,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 0,
    width: 120,
    maxHeight: 300,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  yearDropdown: {},
  updateModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  updateModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f2f2f2",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#000",
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  yearOption: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedYearOption: {
    backgroundColor: "#f8f8f8",
  },
  yearOptionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  selectedYearOptionText: {
    fontWeight: "700",
    color: "#000",
  },
  notMemberContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  notMemberText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  maxLiftsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  maxLiftCard: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderLeftWidth: 3,
    alignItems: "center",
  },
  maxLiftLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#555",
    letterSpacing: 0.5,
  },
  maxLiftValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  calendarIcon: {
    marginTop: 2,
    opacity: 0.7,
  },
  maxDateContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "70%",
    maxWidth: 300,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  maxDateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  maxDateWeight: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  maxDateLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  maxDateValue: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "black",
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  testButton: {
    marginBottom: 20,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(240, 240, 240, 0.6)",
  },
  testButtonText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "500",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dataPointModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
  },
  dataPointModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  dataPointModalWeight: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  dataPointModalDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  dataPointModalDate: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
    fontWeight: "500",
  },
});

export default AthleteStats;
