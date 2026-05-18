// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useSettings } from "../contexts/SettingsContext";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "../src/compat/firestore";
import { db } from "../src/config/firebase";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

const WorkoutProgram = ({ route }) => {
  const navigation = useNavigation();
  const {
    blockId = "",
    onCloseBlock = () => {},
    isPreviousBlock = false,
    onReopenBlock = () => {},
    isAthlete = false,
  } = route.params || {};

  const { weightUnit } = useSettings();

  const [block, setBlock] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [days, setDays] = useState({}); // Map of weekId -> array of days
  const [exercises, setExercises] = useState({}); // Map of dayId -> array of exercises

  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [blockWeeks, setBlockWeeks] = useState(() => {
    console.log("INITIALIZING BLOCKWEEKS, block:", block);
    // If block already has weeks, use those
    if (block?.weeks && Array.isArray(block.weeks) && block.weeks.length > 0) {
      return block.weeks;
    }

    // Otherwise, create EXACTLY ONE week
    return [
      {
        exercises: Array(block?.sessionsPerWeek || 1).fill({
          exercises: [
            {
              name: "",
              sets: [
                {
                  scheme: "",
                  weight: "",
                  setCount: "1",
                },
              ],
              notes: "",
            },
          ],
        }),
      },
    ];
  });
  const weeksSliderRef = useRef(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(null);
  const [tempWeekName, setTempWeekName] = useState("");
  const scrollViewRef = useRef(null);
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
  const [weekNames, setWeekNames] = useState(() => {
    // Create exactly one week name for a new block
    if (
      !block?.weeks ||
      !Array.isArray(block.weeks) ||
      block.weeks.length === 0
    ) {
      return ["Week 1"];
    }

    // For existing blocks, create names based on actual week count
    return Array(block.weeks.length)
      .fill("")
      .map((_, i) => `Week ${i + 1}`);
  });

  const [isBlockRenameModalVisible, setIsBlockRenameModalVisible] =
    useState(false);
  const [tempBlockName, setTempBlockName] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  // Add state variables for date editing
  const [isDateEditModalVisible, setIsDateEditModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const safelyAccessProperty = (obj, path, defaultValue = "") => {
    try {
      const keys = path.split(".");
      let result = obj;
      for (const key of keys) {
        if (result === undefined || result === null) return defaultValue;
        result = result[key];
      }
      return result === undefined || result === null ? defaultValue : result;
    } catch (e) {
      console.log(`Error accessing ${path}:`, e);
      return defaultValue;
    }
  };

  useEffect(() => {
    fetchBlockData();
  }, [blockId]);

  useEffect(() => {
    console.log("BLOCK DATA:", block);
    console.log("WEEKS LENGTH:", block?.weeks?.length);
    console.log("TOTAL WEEKS STATE:", totalWeeks);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Make sure all pending changes are saved before navigating away
      if (isSaving) {
        // Prevent immediate navigation while saving
        e.preventDefault();

        // Try again after a short delay
        setTimeout(() => {
          navigation.dispatch(e.data.action);
        }, 500);
      }
    });

    return unsubscribe;
  }, [navigation, isSaving]);

  const fetchBlockData = async () => {
    try {
      // Check if blockId is valid
      if (!blockId) {
        console.error("Invalid blockId:", blockId);
        Alert.alert("Error", "Invalid workout program");
        navigation.goBack();
        return Promise.reject("Invalid blockId");
      }

      // Fetch block data with extra error handling
      let blockData;
      try {
        const blockDoc = await getDoc(doc(db, "blocks", blockId));
        if (!blockDoc.exists()) {
          Alert.alert("Error", "Block not found");
          navigation.goBack();
          return Promise.reject("Block not found");
        }
        blockData = { id: blockDoc.id, ...blockDoc.data() };
      } catch (error) {
        console.error("Error fetching block:", error);
        Alert.alert("Error", "Failed to load workout program");
        navigation.goBack();
        return Promise.reject(error);
      }

      setBlock(blockData);

      // Fetch weeks with defensive coding
      let weeksData = [];
      try {
        // Use a simple equality check here to avoid any string operations
        const weeksQuery = query(
          collection(db, "weeks"),
          where("blockId", "==", blockId)
        );

        const weeksSnapshot = await getDocs(weeksQuery);
        weeksSnapshot.forEach((doc) => {
          weeksData.push({ id: doc.id, ...doc.data() });
        });
      } catch (error) {
        console.error("Error fetching weeks:", error);
        // Continue with empty weeks array
        weeksData = [];
      }

      // Sort weeks by weekNumber with fallbacks
      weeksData.sort((a, b) => {
        const aNum = parseInt(a.weekNumber || 0);
        const bNum = parseInt(b.weekNumber || 0);
        return aNum - bNum;
      });

      setWeeks(weeksData);
      setTotalWeeks(weeksData.length || 1);

      // Update week names from the fetched data
      const updatedWeekNames = weeksData.map(
        (week) => week.name || `Week ${week.weekNumber || 1}`
      );
      setWeekNames(updatedWeekNames);

      // Reset days and exercises maps to avoid stale data
      const daysMap = {};
      const exercisesMap = {};

      // For each week, fetch days with defensive coding
      for (const week of weeksData) {
        if (!week.id) continue;

        let daysData = [];
        try {
          const daysQuery = query(
            collection(db, "days"),
            where("weekId", "==", week.id)
          );

          const daysSnapshot = await getDocs(daysQuery);
          daysSnapshot.forEach((doc) => {
            daysData.push({ id: doc.id, ...doc.data() });
          });
        } catch (error) {
          console.error(`Error fetching days for week ${week.id}:`, error);
          // Continue with empty days array
          daysData = [];
        }

        // Sort days by dayNumber with fallbacks
        daysData.sort((a, b) => {
          const aNum = parseInt(a.dayNumber || 0);
          const bNum = parseInt(b.dayNumber || 0);
          return aNum - bNum;
        });

        daysMap[week.id] = daysData;

        // For each day, fetch exercises with defensive coding
        for (const day of daysData) {
          if (!day.id) continue;

          let exercisesData = [];
          try {
            const exercisesQuery = query(
              collection(db, "exercises"),
              where("dayId", "==", day.id)
            );

            const exercisesSnapshot = await getDocs(exercisesQuery);
            exercisesSnapshot.forEach((doc) => {
              const exerciseData = doc.data();
              // Ensure sets is always an array
              const sets = Array.isArray(exerciseData.sets)
                ? exerciseData.sets
                : [];
              exercisesData.push({
                id: doc.id,
                ...exerciseData,
                sets: sets,
              });
            });
          } catch (error) {
            console.error(`Error fetching exercises for day ${day.id}:`, error);
            // Continue with empty exercises array
            exercisesData = [];
          }

          exercisesMap[day.id] = exercisesData;
        }
      }

      setExercises(exercisesMap);
      setDays(daysMap);

      console.log("Workout program data refreshed successfully");
      return Promise.resolve();
    } catch (error) {
      console.error("Error fetching block data:", error);
      Alert.alert("Error", "Failed to load workout program");
      navigation.goBack();
      return Promise.reject(error);
    }
  };

  const handleScroll = (event) => {
    if (isProgrammaticScroll) return;
    const xOffset = event.nativeEvent.contentOffset.x;
    const week = Math.round(xOffset / width) + 1;
    setCurrentWeek(week);
  };

  const handleAddWeek = async () => {
    try {
      // Create a new week in Firestore
      const weekRef = doc(collection(db, "weeks"));
      const weekId = weekRef.id;
      const weekNumber = totalWeeks + 1;
      const newWeekName = `Week ${weekNumber}`;

      // Set week data in Firestore
      await setDoc(weekRef, {
        id: weekId,
        blockId: block.id,
        weekNumber: weekNumber,
        name: newWeekName, // Add default name for the week
        daysPerWeek: block.sessionsPerWeek || 1,
        startDate: new Date(),
        submittedAt: serverTimestamp(),
      });

      // Create days for this week
      const newDays = [];
      for (let dayNum = 1; dayNum <= (block.sessionsPerWeek || 1); dayNum++) {
        const dayRef = doc(collection(db, "days"));
        const dayId = dayRef.id;

        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: dayNum,
          submittedAt: serverTimestamp(),
        });

        newDays.push({
          id: dayId,
          weekId: weekId,
          dayNumber: dayNum,
        });
      }

      // Update state with the new week and days
      const newWeek = {
        id: weekId,
        blockId: block.id,
        weekNumber: weekNumber,
        name: newWeekName, // Include name in local state
        daysPerWeek: block.sessionsPerWeek || 1,
      };

      // Update weeks state
      setWeeks([...weeks, newWeek]);

      // Update days state
      setDays({
        ...days,
        [weekId]: newDays,
      });

      setIsProgrammaticScroll(true);

      // Update blockWeeks - this is for local state
      setBlockWeeks([
        ...blockWeeks,
        {
          exercises: Array(block?.sessionsPerWeek || 1).fill({
            exercises: [
              {
                name: "",
                sets: [
                  {
                    scheme: "",
                    weight: "",
                    setCount: "1",
                  },
                ],
                notes: "",
              },
            ],
          }),
        },
      ]);

      const newTotalWeeks = totalWeeks + 1;
      setTotalWeeks(newTotalWeeks);
      setWeekNames([...weekNames, newWeekName]);

      // Wait for state updates to process
      requestAnimationFrame(() => {
        // Set current week and trigger both scrolls simultaneously
        setCurrentWeek(newTotalWeeks);

        // Perform both scroll animations together
        scrollViewRef.current?.scrollTo({
          x: (newTotalWeeks - 1) * width,
          animated: true,
        });
        weeksSliderRef.current?.scrollToEnd({
          animated: true,
          duration: 300,
        });

        // Reset programmatic scroll flag after animations complete
        setTimeout(() => {
          setIsProgrammaticScroll(false);
          setIsSaving(false);
        }, 300);
      });
    } catch (error) {
      console.error("Error adding week:", error);
      Alert.alert("Error", "Failed to add week");
      setIsSaving(false);
    }
  };

  const handleCopyWeek = async () => {
    try {
      if (currentWeek < 1 || currentWeek > weeks.length) {
        throw new Error("Invalid week to copy");
      }

      setIsSaving(true);
      setIsProgrammaticScroll(true);

      const weekToCopy = weeks[currentWeek - 1];
      if (!weekToCopy || !weekToCopy.id) {
        throw new Error("Week data not found");
      }

      // Create a new week in Firestore
      const weekRef = doc(collection(db, "weeks"));
      const weekId = weekRef.id;
      const weekNumber = totalWeeks + 1;
      const newWeekName = `Week ${weekNumber} (Copy)`;

      // Get days for current week
      const daysForWeek = days[weekToCopy.id] || [];

      // Create the new week
      await setDoc(weekRef, {
        id: weekId,
        blockId: block.id,
        weekNumber: weekNumber,
        name: newWeekName, // Include name for copied week
        daysPerWeek: weekToCopy.daysPerWeek || block.sessionsPerWeek || 1,
        submittedAt: serverTimestamp(),
      });

      const newDays = [];

      // Copy each day and its exercises
      for (const originalDay of daysForWeek) {
        const dayRef = doc(collection(db, "days"));
        const dayId = dayRef.id;

        // Create new day
        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: originalDay.dayNumber,
          submittedAt: serverTimestamp(),
        });

        newDays.push({
          id: dayId,
          weekId: weekId,
          dayNumber: originalDay.dayNumber,
        });

        // Copy exercises for this day
        const originalExercises = exercises[originalDay.id] || [];
        for (const originalExercise of originalExercises) {
          const exerciseRef = doc(collection(db, "exercises"));
          const exerciseId = exerciseRef.id;

          // Clone the exercise but with new ID and dayId
          const newExercise = {
            ...JSON.parse(JSON.stringify(originalExercise)),
            id: exerciseId,
            dayId: dayId,
          };

          await setDoc(exerciseRef, newExercise);

          // Update local exercises state
          setExercises((prev) => {
            const updatedExercises = { ...prev };
            if (!updatedExercises[dayId]) {
              updatedExercises[dayId] = [];
            }
            updatedExercises[dayId] = [...updatedExercises[dayId], newExercise];
            return updatedExercises;
          });
        }
      }

      // Update state with the new week
      const newWeek = {
        id: weekId,
        blockId: block.id,
        weekNumber: weekNumber,
        daysPerWeek: weekToCopy.daysPerWeek || block.sessionsPerWeek || 1,
      };

      // Update weeks state
      setWeeks([...weeks, newWeek]);

      // Update days state
      setDays({
        ...days,
        [weekId]: newDays,
      });

      setIsProgrammaticScroll(true);

      // Update UI state
      const weekToCopyLocal = JSON.parse(
        JSON.stringify(blockWeeks[currentWeek - 1])
      );
      setBlockWeeks([...blockWeeks, weekToCopyLocal]);
      const newTotalWeeks = totalWeeks + 1;
      setTotalWeeks(newTotalWeeks);
      setWeekNames([...weekNames, newWeekName]);

      requestAnimationFrame(() => {
        setCurrentWeek(newTotalWeeks);

        // Perform both scroll animations together
        scrollViewRef.current?.scrollTo({
          x: (newTotalWeeks - 1) * width,
          animated: true,
        });
        weeksSliderRef.current?.scrollToEnd({
          animated: true,
          duration: 300,
        });

        setTimeout(() => {
          setIsProgrammaticScroll(false);
          setIsSaving(false);
        }, 300);
      });
    } catch (error) {
      console.error("Error copying week:", error);
      Alert.alert("Error", "Failed to copy week");
      setIsSaving(false);
    }
  };

  const handleDeleteWeek = async () => {
    if (totalWeeks <= 1) {
      Alert.alert(
        "Cannot Delete",
        "You must have at least one week in your program."
      );
      return;
    }

    try {
      const weekToDelete = weeks[currentWeek - 1];
      if (!weekToDelete || !weekToDelete.id) {
        throw new Error("Week data not found");
      }

      // Confirm deletion
      Alert.alert(
        "Delete Week",
        `Are you sure you want to delete ${weekNames[currentWeek - 1]}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setIsSaving(true);

                // First, delete all days and exercises for this week
                const daysForWeek = days[weekToDelete.id] || [];
                const batch = writeBatch(db);

                // Delete days and their exercises
                for (const day of daysForWeek) {
                  if (day.id) {
                    batch.delete(doc(db, "days", day.id));

                    // Delete exercises for this day
                    const exercisesForDay = exercises[day.id] || [];
                    for (const exercise of exercisesForDay) {
                      if (exercise.id) {
                        batch.delete(doc(db, "exercises", exercise.id));
                      }
                    }
                  }
                }

                // Delete the week itself
                batch.delete(doc(db, "weeks", weekToDelete.id));

                // Commit all deletions
                await batch.commit();

                // Update local state
                const updatedWeeks = [...weeks];
                updatedWeeks.splice(currentWeek - 1, 1);
                setWeeks(updatedWeeks);

                const updatedBlockWeeks = [...blockWeeks];
                updatedBlockWeeks.splice(currentWeek - 1, 1);
                setBlockWeeks(updatedBlockWeeks);

                const updatedWeekNames = [...weekNames];
                updatedWeekNames.splice(currentWeek - 1, 1);
                setWeekNames(updatedWeekNames);

                setTotalWeeks(totalWeeks - 1);

                // If deleting last week, move to previous week
                if (currentWeek === totalWeeks) {
                  setCurrentWeek(currentWeek - 1);
                  scrollViewRef.current?.scrollTo({
                    x: (currentWeek - 2) * width,
                    animated: true,
                  });
                } else {
                  // Stay on same position but update week number since current week was deleted
                  setCurrentWeek(currentWeek);
                  scrollViewRef.current?.scrollTo({
                    x: (currentWeek - 1) * width,
                    animated: true,
                  });
                }

                setIsSaving(false);
              } catch (error) {
                console.error("Error deleting week:", error);
                Alert.alert("Error", "Failed to delete week");
                setIsSaving(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error preparing week deletion:", error);
      Alert.alert("Error", "Failed to prepare week deletion");
    }
  };

  const handleCloseBlock = async () => {
    if (typeof onCloseBlock !== "function") {
      console.warn("onCloseBlock is not a function");
      navigation.goBack();
      return;
    }

    try {
      // Call the callback from parent
      await onCloseBlock(block);

      // Immediately update local state to reflect the change
      setBlock((prevBlock) => ({
        ...prevBlock,
        status: "completed",
      }));

      // Just navigate back without showing the alert
      navigation.goBack();
    } catch (error) {
      console.error("Error in handleCloseBlock:", error);
      Alert.alert("Error", "Failed to close block. Please try again.");
    }
  };

  const handleReopenBlock = async () => {
    if (typeof onReopenBlock !== "function") {
      console.warn("onReopenBlock is not a function");
      navigation.goBack();
      return;
    }

    try {
      // Call the callback from parent
      await onReopenBlock(block);

      // Immediately update local state to reflect the change
      setBlock((prevBlock) => ({
        ...prevBlock,
        status: "active",
      }));

      // Just navigate back without showing the alert
      navigation.goBack();
    } catch (error) {
      console.error("Error in handleReopenBlock:", error);
      Alert.alert("Error", "Failed to reopen block. Please try again.");
    }
  };

  const handleAddExercise = async (weekId, dayId) => {
    try {
      // Get current exercises for this day to determine the next order
      const currentExercises = exercises[dayId] || [];
      const nextOrder = currentExercises.length;

      // Create a new exercise in Firestore
      const exerciseRef = doc(collection(db, "exercises"));
      const exerciseId = exerciseRef.id;

      const newExercise = {
        id: exerciseId,
        dayId: dayId,
        name: "",
        sets: [
          {
            set_number: 1,
            scheme: "",
          },
        ],
        notes: "",
        order: nextOrder, // Add order field
      };

      await setDoc(exerciseRef, newExercise);

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        if (!updatedExercises[dayId]) {
          updatedExercises[dayId] = [];
        }
        updatedExercises[dayId] = [...updatedExercises[dayId], newExercise];
        return updatedExercises;
      });
    } catch (error) {
      console.error("Error adding exercise:", error);
      Alert.alert("Error", "Failed to add exercise");
    }
  };

  const handleAddSet = async (exerciseId, dayId) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(doc(db, "exercises", exerciseId));
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = exerciseData.sets || [];
      const newSetNumber =
        sets.length > 0 ? sets[sets.length - 1].set_number + 1 : 1;

      // Add a new set
      const newSets = [
        ...sets,
        {
          set_number: newSetNumber,
          scheme: "",
        },
      ];

      // Update the exercise
      await updateDoc(doc(db, "exercises", exerciseId), {
        sets: newSets,
      });

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        const dayExercises = [...updatedExercises[dayId]];
        const exerciseIndex = dayExercises.findIndex(
          (ex) => ex.id === exerciseId
        );

        if (exerciseIndex !== -1) {
          dayExercises[exerciseIndex] = {
            ...dayExercises[exerciseIndex],
            sets: newSets,
          };
          updatedExercises[dayId] = dayExercises;
        }

        return updatedExercises;
      });
    } catch (error) {
      console.error("Error adding set:", error);
      Alert.alert("Error", "Failed to add set");
    }
  };

  const handleUpdateExercise = async (exerciseId, dayId, field, value) => {
    try {
      // Update the exercise in Firestore
      await updateDoc(doc(db, "exercises", exerciseId), {
        [field]: value,
      });

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        const dayExercises = [...updatedExercises[dayId]];
        const exerciseIndex = dayExercises.findIndex(
          (ex) => ex.id === exerciseId
        );

        if (exerciseIndex !== -1) {
          dayExercises[exerciseIndex] = {
            ...dayExercises[exerciseIndex],
            [field]: value,
          };
          updatedExercises[dayId] = dayExercises;
        }

        return updatedExercises;
      });
    } catch (error) {
      console.error("Error updating exercise:", error);
      Alert.alert("Error", "Failed to update exercise");
    }
  };

  const handleUpdateSet = async (exerciseId, dayId, setIndex, field, value) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(doc(db, "exercises", exerciseId));
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = [...(exerciseData.sets || [])];

      // Update the specific set
      if (sets[setIndex]) {
        sets[setIndex] = {
          ...sets[setIndex],
          [field]: value,
        };

        // Update the exercise in Firestore
        await updateDoc(doc(db, "exercises", exerciseId), {
          sets: sets,
        });

        // Update local state
        setExercises((prev) => {
          const updatedExercises = { ...prev };
          const dayExercises = [...updatedExercises[dayId]];
          const exerciseIndex = dayExercises.findIndex(
            (ex) => ex.id === exerciseId
          );

          if (exerciseIndex !== -1) {
            dayExercises[exerciseIndex] = {
              ...dayExercises[exerciseIndex],
              sets: sets,
            };
            updatedExercises[dayId] = dayExercises;
          }

          return updatedExercises;
        });
      }
    } catch (error) {
      console.error("Error updating set:", error);
      Alert.alert("Error", "Failed to update set");
    }
  };

  const handleDeleteExercise = async (exerciseId, dayId) => {
    try {
      // Delete the exercise from Firestore
      await deleteDoc(doc(db, "exercises", exerciseId));

      // Update local state and reorder remaining exercises
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        // Remove the deleted exercise
        updatedExercises[dayId] = updatedExercises[dayId].filter(
          (ex) => ex.id !== exerciseId
        );

        // Reorder remaining exercises
        const reorderedExercises = updatedExercises[dayId].map(
          (exercise, index) => ({
            ...exercise,
            order: index,
          })
        );

        // Update orders in Firestore
        reorderedExercises.forEach(async (exercise) => {
          await updateDoc(doc(db, "exercises", exercise.id), {
            order: exercise.order,
          });
        });

        updatedExercises[dayId] = reorderedExercises;
        return updatedExercises;
      });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      Alert.alert("Error", "Failed to delete exercise");
    }
  };

  const handleDeleteSet = async (exerciseId, dayId, setIndex) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(doc(db, "exercises", exerciseId));
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = [...(exerciseData.sets || [])];

      // Remove the set at the specified index
      if (sets.length > 1) {
        // Keep at least one set
        sets.splice(setIndex, 1);

        // Update the exercise in Firestore
        await updateDoc(doc(db, "exercises", exerciseId), {
          sets: sets,
        });

        // Update local state
        setExercises((prev) => {
          const updatedExercises = { ...prev };
          const dayExercises = [...updatedExercises[dayId]];
          const exerciseIndex = dayExercises.findIndex(
            (ex) => ex.id === exerciseId
          );

          if (exerciseIndex !== -1) {
            dayExercises[exerciseIndex] = {
              ...dayExercises[exerciseIndex],
              sets: sets,
            };
            updatedExercises[dayId] = dayExercises;
          }

          return updatedExercises;
        });
      } else {
        Alert.alert("Error", "Cannot delete the last set");
      }
    } catch (error) {
      console.error("Error deleting set:", error);
      Alert.alert("Error", "Failed to delete set");
    }
  };

  const handleSubmitProgram = async () => {
    if (isAthlete) return;

    try {
      await updateDoc(doc(db, "blocks", blockId), {
        status: "active",
        lastUpdated: serverTimestamp(),
      });

      Alert.alert("Success", "Program has been updated and sent to athlete", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error submitting program:", error);
      Alert.alert("Error", "Failed to submit program");
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    try {
      // Check if it's a Firebase Timestamp object
      if (timestamp && typeof timestamp === "object" && timestamp.seconds) {
        // Convert to JavaScript Date
        const date = new Date(timestamp.seconds * 1000);
        // Format date as needed - this is a simple example, adjust as needed
        return date.toLocaleDateString();
      }

      // If it's already a string, return as is
      if (typeof timestamp === "string") {
        return timestamp;
      }

      // Default fallback
      return "";
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "";
    }
  };

  const ExerciseItem = ({ exercise, index, weekIndex, dayIndex }) => {
    // Add local state for exercise name
    const [exerciseName, setExerciseName] = useState(exercise.name || "");

    // Add local state for each set's scheme and weight
    const [setStates, setSetStates] = useState(
      (exercise.sets || []).map((set) => ({
        scheme: set.scheme || "",
        weight: set.weight || "",
      }))
    );

    // Add local state for notes
    const [notes, setNotes] = useState(exercise.notes || "");

    // Add state for previous week's weights
    const [previousWeekWeights, setPreviousWeekWeights] = useState([]);

    // Find previous week's weight for the same exercise
    useEffect(() => {
      if (weekIndex > 0 && exercise.name) {
        try {
          // Get the previous week's ID
          const previousWeekId = weeks[weekIndex - 1]?.id;
          if (!previousWeekId) return;

          // Get days from the previous week
          const previousWeekDays = days[previousWeekId] || [];

          // Find matching exercise in the previous week by name
          let foundPreviousWeights = [];

          for (const day of previousWeekDays) {
            const previousExercises = exercises[day.id] || [];
            const matchingExercise = previousExercises.find(
              (ex) => ex.name.toLowerCase() === exercise.name.toLowerCase()
            );

            if (matchingExercise && matchingExercise.sets) {
              // Found matching exercise, get the weights
              foundPreviousWeights = matchingExercise.sets.map(
                (set) => set.weight || ""
              );
              break;
            }
          }

          setPreviousWeekWeights(foundPreviousWeights);
        } catch (error) {
          console.error("Error finding previous week's weights:", error);
        }
      }
    }, [weekIndex, exercise.name, weeks, days, exercises]);

    // Add handler to update exercise in Firestore when input loses focus
    const handleNameBlur = () => {
      if (exerciseName !== exercise.name) {
        handleUpdateExercise(exercise.id, exercise.dayId, "name", exerciseName);
      }
    };

    // Handler for updating set values in local state
    const handleSetValueChange = (setIndex, field, value) => {
      const newSetStates = [...setStates];
      newSetStates[setIndex] = {
        ...newSetStates[setIndex],
        [field]: value,
      };
      setSetStates(newSetStates);
    };

    // Handler for saving set values to Firestore
    const handleSetValueBlur = (setIndex, field) => {
      const value = setStates[setIndex][field];
      const currentValue = exercise.sets[setIndex][field];

      if (value !== currentValue) {
        handleUpdateSet(exercise.id, exercise.dayId, setIndex, field, value);
      }
    };

    // Handler for saving notes to Firestore
    const handleNotesBlur = () => {
      if (notes !== exercise.notes) {
        handleUpdateExercise(exercise.id, exercise.dayId, "notes", notes);
      }
    };

    return (
      <View style={styles.exercise}>
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseNameRow}>
            <TextInput
              style={styles.exerciseNameInput}
              value={exerciseName}
              onChangeText={setExerciseName}
              onBlur={handleNameBlur}
              placeholder="Exercise name"
              editable={!isAthlete}
            />
            {!isAthlete && (
              <TouchableOpacity
                style={styles.deleteExerciseButton}
                onPress={() =>
                  handleDeleteExercise(exercise.id, exercise.dayId)
                }
              >
                <Icon name="close-outline" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {(exercise.sets || []).map((set, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <View style={styles.setScheme}>
                <TextInput
                  style={styles.schemeInput}
                  value={setStates[setIndex].scheme}
                  onChangeText={(value) =>
                    handleSetValueChange(setIndex, "scheme", value)
                  }
                  onBlur={() => handleSetValueBlur(setIndex, "scheme")}
                  placeholder="Sets x Reps @ RPE"
                  editable={!isAthlete}
                />
              </View>

              <View style={styles.weightInput}>
                <TextInput
                  style={styles.weightTextInput}
                  value={setStates[setIndex].weight}
                  onChangeText={(value) =>
                    handleSetValueChange(setIndex, "weight", value)
                  }
                  onBlur={() => handleSetValueBlur(setIndex, "weight")}
                  keyboardType="numeric"
                  placeholder={
                    previousWeekWeights[setIndex]
                      ? `Last: ${previousWeekWeights[setIndex]}`
                      : "0"
                  }
                  placeholderTextColor="#aaa"
                  editable={true}
                />
                <TouchableOpacity
                  style={styles.weightUnitButton}
                  onPress={() =>
                    setWeightUnit(weightUnit === "kg" ? "lbs" : "kg")
                  }
                >
                  <Text style={styles.weightUnit}>{weightUnit}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!isAthlete && (
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => handleAddSet(exercise.id, exercise.dayId)}
            >
              <Text style={styles.addSetButtonText}>+ Add Set</Text>
            </TouchableOpacity>
          )}

          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Notes:</Text>
            <TextInput
              style={styles.noteInput}
              value={notes}
              onChangeText={setNotes}
              onBlur={handleNotesBlur}
              placeholder="Add notes here"
              multiline
              editable={true}
            />
          </View>
        </View>
      </View>
    );
  };

  const handleRenameWeek = (index) => {
    setSelectedWeekIndex(index);
    setTempWeekName(weekNames[index]);
    setIsRenameModalVisible(true);
  };

  const saveWeekName = async () => {
    if (selectedWeekIndex !== null && tempWeekName.trim()) {
      try {
        // Get the week ID for the selected index
        const weekToUpdate = weeks[selectedWeekIndex];
        if (!weekToUpdate) {
          throw new Error("Week not found");
        }

        console.log(
          "Saving week name:",
          tempWeekName.trim(),
          "for week ID:",
          weekToUpdate.id
        );

        // Update in Firestore
        await updateDoc(doc(db, "weeks", weekToUpdate.id), {
          name: tempWeekName.trim(),
          lastUpdated: serverTimestamp(),
        });

        // Update local state
        const newWeekNames = [...weekNames];
        newWeekNames[selectedWeekIndex] = tempWeekName.trim();
        setWeekNames(newWeekNames);

        // Update weeks array with the new name
        const updatedWeeks = [...weeks];
        updatedWeeks[selectedWeekIndex] = {
          ...updatedWeeks[selectedWeekIndex],
          name: tempWeekName.trim(),
        };
        setWeeks(updatedWeeks);

        console.log("Week name updated successfully");
      } catch (error) {
        console.error("Error saving week name:", error);
        Alert.alert("Error", "Failed to save week name");
      }
    }
    setIsRenameModalVisible(false);
  };

  const handleDeleteDay = async (weekId, dayId) => {
    try {
      // First confirm with the user
      Alert.alert(
        "Delete Day",
        "Are you sure you want to delete this day? This will delete all exercises in this day.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Delete all exercises for this day first
              const exercisesToDelete = exercises[dayId] || [];
              const batch = writeBatch(db);

              // Delete all exercises
              exercisesToDelete.forEach((exercise) => {
                const exerciseRef = doc(db, "exercises", exercise.id);
                batch.delete(exerciseRef);
              });

              // Delete the day itself
              const dayRef = doc(db, "days", dayId);
              batch.delete(dayRef);

              // Commit the batch
              await batch.commit();

              // Update local state
              setExercises((prev) => {
                const newExercises = { ...prev };
                delete newExercises[dayId];
                return newExercises;
              });

              setDays((prev) => {
                const newDays = { ...prev };
                newDays[weekId] = newDays[weekId].filter(
                  (day) => day.id !== dayId
                );
                return newDays;
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting day:", error);
      Alert.alert("Error", "Failed to delete day");
    }
  };

  const handleAddDay = async (weekId) => {
    try {
      // Get current days for this week
      const currentDays = days[weekId] || [];
      const newDayNumber = currentDays.length + 1;

      // Create new day in Firestore
      const dayRef = doc(collection(db, "days"));
      const dayId = dayRef.id;

      await setDoc(dayRef, {
        id: dayId,
        weekId: weekId,
        dayNumber: newDayNumber,
        submittedAt: serverTimestamp(),
      });

      const newDay = {
        id: dayId,
        weekId: weekId,
        dayNumber: newDayNumber,
      };

      // Update local state
      setDays((prev) => ({
        ...prev,
        [weekId]: [...(prev[weekId] || []), newDay],
      }));
    } catch (error) {
      console.error("Error adding day:", error);
      Alert.alert("Error", "Failed to add day");
    }
  };

  const handleRenameBlock = () => {
    setTempBlockName(block?.name || "");
    setIsBlockRenameModalVisible(true);
  };

  const saveBlockName = async () => {
    if (!tempBlockName.trim()) {
      setIsBlockRenameModalVisible(false);
      return;
    }

    try {
      // Update in Firestore
      await updateDoc(doc(db, "blocks", blockId), {
        name: tempBlockName.trim(),
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      setBlock((prev) => ({
        ...prev,
        name: tempBlockName.trim(),
      }));

      setIsBlockRenameModalVisible(false);
    } catch (error) {
      console.error("Error saving block name:", error);
      Alert.alert("Error", "Failed to save block name");
    }
  };

  const onRefresh = useCallback(() => {
    console.log("WorkoutProgram - Pull-to-refresh triggered");
    setRefreshing(true);

    Promise.resolve()
      .then(() => fetchBlockData())
      .catch((error) => {
        console.error("Error during refresh:", error);
      })
      .finally(() => {
        console.log("WorkoutProgram - Refresh completed");
        setRefreshing(false);
      });
  }, []);

  // Add a function to handle opening the date edit modal
  const handleEditDates = () => {
    // Initialize temp dates from current block dates
    let startDate = new Date();
    let endDate = new Date();

    try {
      // Parse start date
      if (block.startDate) {
        if (block.startDate.seconds) {
          startDate = new Date(block.startDate.seconds * 1000);
        } else if (typeof block.startDate === "string") {
          startDate = new Date(block.startDate);
        } else if (block.startDate instanceof Date) {
          startDate = block.startDate;
        }
      }

      // Parse end date
      if (block.endDate) {
        if (block.endDate.seconds) {
          endDate = new Date(block.endDate.seconds * 1000);
        } else if (typeof block.endDate === "string") {
          endDate = new Date(block.endDate);
        } else if (block.endDate instanceof Date) {
          endDate = block.endDate;
        }
      }
    } catch (error) {
      console.error("Error parsing dates:", error);
    }

    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsDateEditModalVisible(true);
  };

  // Function to show date picker
  const showDatePicker = (type) => {
    if (type === "start") {
      setShowStartDatePicker(true);
      setShowEndDatePicker(false);
    } else {
      setShowEndDatePicker(true);
      setShowStartDatePicker(false);
    }
  };

  // Handle date changes
  const handleDateChange = (event, selectedDate, type) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }

    if (selectedDate) {
      if (type === "start") {
        setTempStartDate(selectedDate);
      } else {
        setTempEndDate(selectedDate);
      }
    }
  };

  // Save the updated dates
  const saveDates = async () => {
    try {
      // Make sure end date is not before start date
      if (tempEndDate < tempStartDate) {
        Alert.alert(
          "Invalid Dates",
          "End date cannot be before start date. Please adjust your dates."
        );
        return;
      }

      // Convert dates to Firestore format
      const formattedStartDate = {
        seconds: Math.floor(tempStartDate.getTime() / 1000),
        nanoseconds: 0,
      };

      const formattedEndDate = {
        seconds: Math.floor(tempEndDate.getTime() / 1000),
        nanoseconds: 0,
      };

      // Update in Firestore
      const blockRef = doc(db, "blocks", blockId);
      await updateDoc(blockRef, {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setBlock((prevBlock) => ({
        ...prevBlock,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      }));

      setIsDateEditModalVisible(false);
    } catch (error) {
      console.error("Error saving dates:", error);
      Alert.alert("Error", "Failed to save dates");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>
                {block?.name || "Workout Program"}
              </Text>
              {!isAthlete && (
                <TouchableOpacity
                  style={styles.blockRenameButton}
                  onPress={handleRenameBlock}
                >
                  <Icon name="pencil-outline" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.subtitle}>
                {formatTimestamp(safelyAccessProperty(block, "startDate"))} -{" "}
                {formatTimestamp(safelyAccessProperty(block, "endDate"))}
              </Text>
              {!isAthlete && (
                <TouchableOpacity
                  style={styles.dateEditButton}
                  onPress={handleEditDates}
                >
                  <Icon name="pencil-outline" size={14} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <View style={styles.actionsContainer}>
          {!isAthlete && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleCopyWeek}
              >
                <Text
                  style={[styles.actionButtonText, styles.primaryButtonText]}
                >
                  Duplicate Week
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteWeek}
                disabled={totalWeeks === 1}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.deleteButtonText,
                    totalWeeks === 1 && styles.disabledButtonText,
                  ]}
                >
                  Delete Week
                </Text>
              </TouchableOpacity>

              {block?.status === "active" && !isPreviousBlock && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.closeButton]}
                  onPress={handleCloseBlock}
                  disabled={isSaving}
                >
                  <Text
                    style={[styles.actionButtonText, styles.closeButtonText]}
                  >
                    {isSaving ? "Closing..." : "Close"}
                  </Text>
                </TouchableOpacity>
              )}

              {(block?.status === "completed" || isPreviousBlock) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleReopenBlock}
                  disabled={isSaving}
                >
                  <Text
                    style={[styles.actionButtonText, styles.primaryButtonText]}
                  >
                    {isSaving ? "Reopening..." : "Reopen Block"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {Array(Math.min(totalWeeks, weeks.length))
          .fill(null)
          .map((_, weekIndex) => (
            <ScrollView
              key={weekIndex}
              style={[styles.programContainer, { width }]}
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
            >
              {weeks[weekIndex] &&
                days[weeks[weekIndex].id] &&
                days[weeks[weekIndex].id].map((day, index) => (
                  <View
                    key={index}
                    style={[
                      styles.daySection,
                      index === 0 && styles.firstDaySection,
                    ]}
                  >
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayTitle}>Day {index + 1}</Text>
                      {!isAthlete && (
                        <View style={styles.dayHeaderButtons}>
                          <TouchableOpacity
                            style={styles.dayActionButton}
                            onPress={() =>
                              handleDeleteDay(weeks[weekIndex].id, day.id)
                            }
                          >
                            <Icon name="trash-outline" size={18} color="#666" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addExerciseButton}
                            onPress={() =>
                              handleAddExercise(weeks[weekIndex].id, day.id)
                            }
                          >
                            <Text style={styles.addExerciseIcon}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={styles.exercisesContainer}>
                      {exercises[day.id] &&
                        [...exercises[day.id]]
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((exercise, exIndex) => (
                            <ExerciseItem
                              key={exIndex}
                              exercise={exercise}
                              index={exIndex}
                              weekIndex={weekIndex}
                              dayIndex={index}
                            />
                          ))}
                    </View>
                    {!isAthlete && (
                      <>
                        <TouchableOpacity
                          style={styles.bottomAddExerciseButton}
                          onPress={() =>
                            handleAddExercise(weeks[weekIndex].id, day.id)
                          }
                        >
                          <View style={styles.bottomAddExerciseContent}>
                            <Icon name="add-outline" size={20} color="#666" />
                            <Text style={styles.bottomAddExerciseText}>
                              Add Exercise
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {index === days[weeks[weekIndex].id].length - 1 && (
                          <TouchableOpacity
                            style={[
                              styles.bottomAddExerciseButton,
                              styles.addDayButton,
                            ]}
                            onPress={() => handleAddDay(weeks[weekIndex].id)}
                          >
                            <View style={styles.bottomAddExerciseContent}>
                              <Icon
                                name="calendar-outline"
                                size={20}
                                color="#666"
                              />
                              <Text style={styles.bottomAddExerciseText}>
                                Add Day
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                ))}
            </ScrollView>
          ))}
      </ScrollView>

      <View style={styles.weekNavigation}>
        <View style={styles.weekNavigationContent}>
          <ScrollView
            ref={weeksSliderRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weeksContainer}
          >
            {Array(totalWeeks)
              .fill(null)
              .map((_, index) => (
                <View key={index} style={styles.weekButtonWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.weekButton,
                      currentWeek === index + 1 && styles.weekButtonActive,
                    ]}
                    onPress={() => {
                      setIsProgrammaticScroll(true);
                      setCurrentWeek(index + 1);

                      scrollViewRef.current?.scrollTo({
                        x: index * width,
                        animated: true,
                      });

                      setTimeout(() => {
                        setIsProgrammaticScroll(false);
                      }, 300); // Match the animation duration
                    }}
                  >
                    <Text
                      style={[
                        styles.weekButtonText,
                        currentWeek === index + 1 &&
                          styles.weekButtonTextActive,
                      ]}
                    >
                      {weekNames[index]}
                    </Text>
                  </TouchableOpacity>
                  {!isAthlete && (
                    <TouchableOpacity
                      style={styles.renameButton}
                      onPress={() => handleRenameWeek(index)}
                    >
                      <Icon name="pencil-outline" size={14} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
          </ScrollView>

          {!isAthlete && (
            <TouchableOpacity
              style={styles.addWeekButton}
              onPress={handleAddWeek}
            >
              <Icon name="add" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={isRenameModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRenameModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Week</Text>
            <TextInput
              style={styles.modalInput}
              value={tempWeekName}
              onChangeText={setTempWeekName}
              placeholder="Enter week name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveWeekName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isBlockRenameModalVisible}
        transparent
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsBlockRenameModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Block</Text>
            <TextInput
              style={styles.modalInput}
              value={tempBlockName}
              onChangeText={setTempBlockName}
              placeholder="Enter block name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsBlockRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveBlockName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Edit Modal */}
      <Modal
        visible={isDateEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDateEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Block Dates</Text>

            <View style={styles.dateSection}>
              {/* Start Date */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePicker("start")}
                >
                  <Text style={styles.dateButtonText}>
                    {tempStartDate.toLocaleDateString()}
                  </Text>
                  <Icon name="calendar-outline" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              {/* End Date */}
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePicker("end")}
                >
                  <Text style={styles.dateButtonText}>
                    {tempEndDate.toLocaleDateString()}
                  </Text>
                  <Icon name="calendar-outline" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Platform-specific date pickers */}
            {Platform.OS === "ios" ? (
              <>
                {showStartDatePicker && (
                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={tempStartDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) =>
                        handleDateChange(event, date, "start")
                      }
                      style={styles.iosPicker}
                      textColor="#000000"
                    />
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {showEndDatePicker && (
                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={tempEndDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) =>
                        handleDateChange(event, date, "end")
                      }
                      style={styles.iosPicker}
                      textColor="#000000"
                    />
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowEndDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange(event, date, "start")
                    }
                    textColor="#000000"
                  />
                )}

                {showEndDatePicker && (
                  <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange(event, date, "end")
                    }
                    textColor="#000000"
                  />
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDateEditModalVisible(false);
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={saveDates}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 80,
    paddingBottom: 0,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 5,
  },
  backButton: {
    marginTop: -40,
    marginBottom: 20,
    position: "absolute",
    left: 0,
    top: -15,
  },
  backButtonText: {
    fontSize: 24,
    color: "#000",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 30,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  programContainer: {
    flex: 1,
    width: width,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 150,
  },
  daySection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eaeaea",
    backgroundColor: "#fff",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  firstDaySection: {
    paddingTop: 0,
    borderTopWidth: 0,
    marginTop: 0,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
    width: "100%",
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  addExerciseButton: {
    padding: 2,
  },
  addExerciseIcon: {
    fontSize: 20,
    color: "#000",
    fontWeight: "300",
  },
  exercisesContainer: {
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  exercise: {
    marginBottom: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    width: "85%",
    alignSelf: "center",
  },
  exerciseContent: {
    flex: 1,
    padding: 8,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  exerciseNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    padding: 0,
    maxWidth: "88%",
  },
  deleteExerciseButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    padding: 4,
  },
  deleteExerciseText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    lineHeight: 22,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  setScheme: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  schemeInput: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
    padding: 0,
  },
  weightInput: {
    borderWidth: 1,
    borderColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  weightTextInput: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
    padding: 0,
    minWidth: 30,
    textAlign: "right",
  },
  weightUnitButton: {
    paddingLeft: 2,
    paddingVertical: 2,
  },
  weightUnit: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  noteContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  noteLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 1,
    fontWeight: "500",
  },
  noteInput: {
    fontSize: 12,
    color: "#000",
    lineHeight: 16,
    padding: 0,
    fontWeight: "600",
  },
  weekNavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  weekNavigationContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  weeksContainer: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: "row",
    flexGrow: 1,
  },
  weekButtonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 30,
  },
  weekButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  weekButtonActive: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  weekButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  weekButtonTextActive: {
    color: "#fff",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  primaryButton: {
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  primaryButtonText: {
    color: "#000",
  },
  deleteButton: {
    borderColor: "#ffd5d5",
    backgroundColor: "#fff",
  },
  deleteButtonText: {
    color: "#FF3B30",
  },
  closeButton: {
    borderColor: "#000",
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.25,
  },
  closeButtonText: {
    color: "#fff",
  },
  disabledButtonText: {
    opacity: 0.3,
  },
  renameButton: {
    padding: 2,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  saveButton: {
    backgroundColor: "#000",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  addWeekButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  addSetButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f8f8f8",
    alignSelf: "flex-start",
    marginTop: 2,
    marginBottom: 4,
  },
  addSetButtonText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  bottomAddExerciseButton: {
    backgroundColor: "#f8f8f8",
    padding: 6,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowOpacity: 0,
    width: "70%",
    alignSelf: "center",
  },
  bottomAddExerciseContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomAddExerciseText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  submitButton: {
    position: "absolute",
    right: 0,
    top: -8,
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  createWeekButton: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  createWeekButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  sendButton: {
    backgroundColor: "#4a90e2",
    marginLeft: 100,
  },
  sendButtonText: {
    color: "#fff",
  },
  topRightButton: {
    position: "absolute",
    right: 10,
    top: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayActionButton: {
    padding: 2,
  },
  addDayButton: {
    marginTop: 4,
    marginBottom: 36,
    backgroundColor: "#f0f0f0",
  },
  blockRenameButton: {
    padding: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateEditButton: {
    marginLeft: 8,
    padding: 4,
  },
  dateSection: {
    marginBottom: 20,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 16,
    width: 100,
    color: "#333",
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  iosPickerContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    marginBottom: 20,
    paddingBottom: 8,
    width: "100%",
    overflow: "hidden",
  },
  iosPicker: {
    height: 200,
    width: 280,
    color: "#000000",
    transform: [{ scaleX: 0.9 }],
    alignSelf: "center",
  },
  datePickerDoneButton: {
    alignSelf: "flex-end",
    padding: 10,
    marginRight: 10,
  },
  datePickerDoneText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#000",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default WorkoutProgram;
