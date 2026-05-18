// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../src/config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "../src/compat/firestore";

const { width } = Dimensions.get("window");

const EditTemplate = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { templateId, templateName } = route.params;
  const scrollViewRef = useRef(null);
  const weeksSliderRef = useRef(null);

  // State variables to match WorkoutProgram.js
  const [template, setTemplate] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [weekNames, setWeekNames] = useState({});
  const [days, setDays] = useState({});
  const [exercises, setExercises] = useState({});
  const [currentWeek, setCurrentWeek] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);

  // Add state for editing exercise and sets in-line (similar to WorkoutProgram)
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingSetIndex, setEditingSetIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  // State for add exercise modal
  const [isAddExerciseModalVisible, setIsAddExerciseModalVisible] =
    useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [selectedDayId, setSelectedDayId] = useState(null);

  // State for rename week modal
  const [isRenameWeekModalVisible, setIsRenameWeekModalVisible] =
    useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(null);
  const [tempWeekName, setTempWeekName] = useState("");

  // Scroll handling for swiping between weeks
  const handleScroll = (event) => {
    // Skip if programmatic scroll
    if (isProgrammaticScroll) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    // Use exact page width division for more precise detection
    const newIndex = Math.floor(offsetX / width);

    // Only update if new index is valid and different
    if (newIndex !== currentWeek && newIndex >= 0 && newIndex < totalWeeks) {
      setCurrentWeek(newIndex);

      // Ensure the week tabs at the bottom are in view when swiping
      if (weeksSliderRef.current) {
        weeksSliderRef.current.scrollTo({
          x: newIndex * 80, // Approximate width of a week button
          animated: true,
        });
      }
    }
  };

  // Refresh control handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplateData();
    setRefreshing(false);
  };

  // Fetch template data when component mounts
  useEffect(() => {
    fetchTemplateData();
  }, [templateId]);

  // Fetch template data
  const fetchTemplateData = async () => {
    try {
      setIsLoading(true);

      // Get template
      const templateDoc = await getDoc(doc(db, "templates", templateId));
      if (!templateDoc.exists()) {
        throw new Error("Template not found");
      }

      const templateData = templateDoc.data();
      setTemplate(templateData);

      // Get weeks - query without the deleted filter
      const weeksQuery = query(
        collection(db, "templateWeeks"),
        where("templateId", "==", templateId)
      );
      const weeksSnapshot = await getDocs(weeksQuery);
      const allWeeksData = weeksSnapshot.docs.map((doc) => doc.data());

      // Filter out deleted weeks in JavaScript
      const weeksData = allWeeksData.filter((week) => !week.deleted);

      // Sort weeks by weekNumber
      weeksData.sort((a, b) => a.weekNumber - b.weekNumber);
      setWeeks(weeksData);
      setTotalWeeks(weeksData.length);

      // Create week names array
      const names = Array(weeksData.length).fill("");
      weeksData.forEach((week, index) => {
        names[index] = week.name || `Week ${index + 1}`;
      });
      setWeekNames(names);

      // Get days
      const daysObj = {};
      for (const week of weeksData) {
        const daysQuery = query(
          collection(db, "templateDays"),
          where("weekId", "==", week.id)
        );
        const daysSnapshot = await getDocs(daysQuery);
        const allDaysData = daysSnapshot.docs.map((doc) => doc.data());

        // Filter out deleted days in JavaScript
        const daysData = allDaysData.filter((day) => !day.deleted);

        // Sort days by dayNumber
        daysData.sort((a, b) => a.dayNumber - b.dayNumber);
        daysObj[week.id] = daysData;
      }
      setDays(daysObj);

      // Get exercises
      const exercisesObj = {};
      for (const week of weeksData) {
        const weekDays = daysObj[week.id] || [];
        for (const day of weekDays) {
          const exercisesQuery = query(
            collection(db, "templateExercises"),
            where("dayId", "==", day.id)
          );
          const exercisesSnapshot = await getDocs(exercisesQuery);
          const allExercisesData = exercisesSnapshot.docs.map((doc) =>
            doc.data()
          );

          // Filter out deleted exercises in JavaScript
          const exercisesData = allExercisesData.filter(
            (exercise) => !exercise.deleted
          );

          // Sort exercises by order
          exercisesData.sort((a, b) => (a.order || 0) - (b.order || 0));
          exercisesObj[day.id] = exercisesData;
        }
      }
      setExercises(exercisesObj);

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching template data:", error);
      Alert.alert("Error", "Failed to load template data");
      setIsLoading(false);
    }
  };

  // Add a new week
  const handleAddWeek = async () => {
    try {
      setIsLoading(true);

      // Get the current template data
      const templateDoc = await getDoc(doc(db, "templates", templateId));
      if (!templateDoc.exists()) {
        throw new Error("Template not found");
      }

      const template = templateDoc.data();
      const daysPerWeek = template.daysPerWeek || 1; // Default to 1 if not set

      // Create a new week
      const weekRef = doc(collection(db, "templateWeeks"));
      const weekId = weekRef.id;
      const weekNumber = totalWeeks + 1;

      // Default week name
      const newWeekName = `Week ${weekNumber}`;

      await setDoc(weekRef, {
        id: weekId,
        templateId: templateId,
        weekNumber: weekNumber,
        name: newWeekName,
        createdAt: serverTimestamp(),
      });

      // Create all the days based on template's daysPerWeek setting
      const newDays = [];
      for (let i = 1; i <= daysPerWeek; i++) {
        const dayRef = doc(collection(db, "templateDays"));
        const dayId = dayRef.id;

        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: i,
          createdAt: serverTimestamp(),
        });

        newDays.push({
          id: dayId,
          weekId: weekId,
          dayNumber: i,
        });
      }

      // Update state
      const newWeek = {
        id: weekId,
        templateId: templateId,
        weekNumber: weekNumber,
        name: newWeekName,
      };

      setWeeks([...weeks, newWeek]);
      setDays({
        ...days,
        [weekId]: newDays,
      });

      // Update UI state
      setIsProgrammaticScroll(true);
      const newTotalWeeks = totalWeeks + 1;
      setTotalWeeks(newTotalWeeks);

      // Update week names
      const newWeekNames = [...weekNames];
      newWeekNames[newTotalWeeks - 1] = newWeekName;
      setWeekNames(newWeekNames);

      requestAnimationFrame(() => {
        setCurrentWeek(newTotalWeeks - 1);

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
          setIsLoading(false);
        }, 300);
      });
    } catch (error) {
      console.error("Error adding week:", error);
      Alert.alert("Error", "Failed to add week");
      setIsLoading(false);
    }
  };

  // Delete a week (soft delete implementation)
  const handleDeleteWeek = async () => {
    if (totalWeeks <= 1) {
      Alert.alert("Error", "Templates must have at least one week");
      return;
    }

    Alert.alert(
      "Delete Week",
      `Are you sure you want to delete ${weekNames[currentWeek]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);

              // First check if user is the template owner
              const user = auth.currentUser;
              if (!user) {
                Alert.alert("Error", "You must be logged in to delete weeks");
                return;
              }

              if (template && template.coachId !== user.uid) {
                Alert.alert(
                  "Error",
                  "Only the template owner can delete weeks"
                );
                return;
              }

              const weekId = weeks[currentWeek].id;
              console.log("Soft deleting week ID:", weekId);
              const weekDays = days[weekId] || [];

              // Soft delete exercises for each day
              for (const day of weekDays) {
                const dayExercises = exercises[day.id] || [];
                console.log(
                  `Soft deleting ${dayExercises.length} exercises for day ${day.id}`
                );

                for (const exercise of dayExercises) {
                  try {
                    // Mark exercise as deleted instead of deleting it
                    await updateDoc(doc(db, "templateExercises", exercise.id), {
                      deleted: true,
                      deletedAt: serverTimestamp(),
                    });
                  } catch (exerciseError) {
                    console.error(
                      "Error marking exercise as deleted:",
                      exerciseError
                    );
                    // Continue with other updates even if one fails
                  }
                }

                // Soft delete day
                try {
                  console.log("Soft deleting day:", day.id);
                  await updateDoc(doc(db, "templateDays", day.id), {
                    deleted: true,
                    deletedAt: serverTimestamp(),
                  });
                } catch (dayError) {
                  console.error("Error marking day as deleted:", dayError);
                  // Continue with other updates even if one fails
                }
              }

              // Soft delete week
              try {
                console.log("Soft deleting week document:", weekId);
                await updateDoc(doc(db, "templateWeeks", weekId), {
                  deleted: true,
                  deletedAt: serverTimestamp(),
                });
              } catch (weekError) {
                console.error("Error marking week as deleted:", weekError);
                throw weekError; // Re-throw to trigger the catch block
              }

              // Update state
              const newWeeks = [...weeks];
              newWeeks.splice(currentWeek, 1);

              const newDays = { ...days };
              delete newDays[weekId];

              const newExercises = { ...exercises };
              for (const day of weekDays) {
                delete newExercises[day.id];
              }

              // Update week names
              const newWeekNames = [...weekNames];
              newWeekNames.splice(currentWeek, 1);

              setWeeks(newWeeks);
              setDays(newDays);
              setExercises(newExercises);
              setWeekNames(newWeekNames);
              setTotalWeeks(totalWeeks - 1);

              // Update current week index
              if (currentWeek >= newWeeks.length) {
                setCurrentWeek(Math.max(0, newWeeks.length - 1));
                scrollViewRef.current?.scrollTo({
                  x: width * Math.max(0, newWeeks.length - 1),
                  animated: true,
                });
              }

              // Show success message
              Alert.alert("Success", "Week successfully deleted");
            } catch (error) {
              console.error("Error deleting week:", error);

              if (error.code === "permission-denied") {
                Alert.alert(
                  "Permission Error",
                  "You don't have permission to delete this week. Make sure you are the template owner."
                );
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete week. Please try again."
                );
              }
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Rename week function
  const handleRenameWeek = (index) => {
    setSelectedWeekIndex(index);
    setTempWeekName(weekNames[index]);
    setIsRenameWeekModalVisible(true);
  };

  // Function to save the new week name
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
        await updateDoc(doc(db, "templateWeeks", weekToUpdate.id), {
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
    setIsRenameWeekModalVisible(false);
  };

  // Add exercise handler - matches WorkoutProgram.js
  const handleAddExercise = async (weekId, dayId) => {
    try {
      // Get current exercises for this day to determine the next order
      const currentExercises = exercises[dayId] || [];
      const nextOrder = currentExercises.length;

      // Create a new exercise in Firestore
      const exerciseRef = doc(collection(db, "templateExercises"));
      const exerciseId = exerciseRef.id;

      const newExercise = {
        id: exerciseId,
        dayId: dayId,
        name: "",
        sets: [
          {
            set_number: 1,
            scheme: "", // Use scheme instead of separate reps/weight fields
          },
        ],
        notes: "",
        order: nextOrder, // Keep order field for UI sorting
        createdAt: serverTimestamp(),
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

  // Delete an exercise
  const handleDeleteExercise = async (exerciseId, dayId) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to delete this exercise?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);

              // Soft delete using updateDoc instead of deleteDoc
              await updateDoc(doc(db, "templateExercises", exerciseId), {
                deleted: true,
                deletedAt: serverTimestamp(),
              });

              // Update state and reorder remaining exercises
              const dayExercises = [...(exercises[dayId] || [])];
              const updatedExercises = dayExercises.filter(
                (ex) => ex.id !== exerciseId
              );

              // Reorder the remaining exercises
              const reorderedExercises = updatedExercises.map((ex, index) => ({
                ...ex,
                order: index,
              }));

              // Update the order in Firestore
              for (const exercise of reorderedExercises) {
                await updateDoc(doc(db, "templateExercises", exercise.id), {
                  order: exercise.order,
                });
              }

              setExercises({
                ...exercises,
                [dayId]: reorderedExercises,
              });

              // Show success message
              Alert.alert("Success", "Exercise successfully deleted");
            } catch (error) {
              console.error("Error deleting exercise:", error);
              Alert.alert(
                "Error",
                "Failed to delete exercise. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Replace the navigation to EditTemplateExercise with direct editing functionality
  const handleUpdateExercise = async (exerciseId, dayId, field, value) => {
    try {
      // Update the exercise in Firestore
      await updateDoc(doc(db, "templateExercises", exerciseId), {
        [field]: value,
      });

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        const dayExercises = [...(updatedExercises[dayId] || [])];
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

  // Add new set to exercise
  const handleAddSet = async (exerciseId, dayId) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(
        doc(db, "templateExercises", exerciseId)
      );
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = exerciseData.sets || [];

      // Create new set with consistent structure
      const newSet = {
        set_number: sets.length > 0 ? sets[sets.length - 1].set_number + 1 : 1,
        scheme: "", // Use scheme field as in the example schema
      };

      const newSets = [...sets, newSet];

      // Update the exercise in Firestore
      await updateDoc(doc(db, "templateExercises", exerciseId), {
        sets: newSets,
      });

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        const dayExercises = [...(updatedExercises[dayId] || [])];
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

  // Update set details to match the schema
  const handleUpdateSet = async (exerciseId, dayId, setIndex, field, value) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(
        doc(db, "templateExercises", exerciseId)
      );
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = [...(exerciseData.sets || [])];

      // Update the specific set
      if (sets[setIndex]) {
        // Only update valid fields for the schema
        if (field === "scheme") {
          sets[setIndex] = {
            ...sets[setIndex],
            [field]: value,
          };

          // Update the exercise in Firestore
          await updateDoc(doc(db, "templateExercises", exerciseId), {
            sets: sets,
          });

          // Update local state
          setExercises((prev) => {
            const updatedExercises = { ...prev };
            const dayExercises = [...(updatedExercises[dayId] || [])];
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
      }
    } catch (error) {
      console.error("Error updating set:", error);
      Alert.alert("Error", "Failed to update set");
    }
  };

  // Delete set
  const handleDeleteSet = async (exerciseId, dayId, setIndex) => {
    try {
      // Find the exercise
      const exerciseDoc = await getDoc(
        doc(db, "templateExercises", exerciseId)
      );
      if (!exerciseDoc.exists()) {
        throw new Error("Exercise not found");
      }

      const exerciseData = exerciseDoc.data();
      const sets = [...(exerciseData.sets || [])];

      // Remove the set
      sets.splice(setIndex, 1);

      // Update the exercise in Firestore
      await updateDoc(doc(db, "templateExercises", exerciseId), {
        sets: sets,
      });

      // Update local state
      setExercises((prev) => {
        const updatedExercises = { ...prev };
        const dayExercises = [...(updatedExercises[dayId] || [])];
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
    } catch (error) {
      console.error("Error deleting set:", error);
      Alert.alert("Error", "Failed to delete set");
    }
  };

  // Edit exercise handler - now just manages UI state for inline editing
  const handleEditExercise = (exerciseId, field, value) => {
    setEditingExerciseId(exerciseId);
    setEditingField(field);
    setEditingValue(value || "");
  };

  // Handle saving edits when done editing a field
  const handleSaveExerciseField = async (exerciseId, dayId, field) => {
    if (editingExerciseId === exerciseId && editingField === field) {
      await handleUpdateExercise(exerciseId, dayId, field, editingValue);
      setEditingExerciseId(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  // Handle editing a set field
  const handleEditSet = (exerciseId, setIndex, field, value) => {
    setEditingExerciseId(exerciseId);
    setEditingSetIndex(setIndex);
    setEditingField(field);
    setEditingValue(value || "");
  };

  // Handle saving set field edits
  const handleSaveSetField = async (exerciseId, dayId, setIndex, field) => {
    if (
      editingExerciseId === exerciseId &&
      editingSetIndex === setIndex &&
      editingField === field
    ) {
      await handleUpdateSet(exerciseId, dayId, setIndex, field, editingValue);
      setEditingExerciseId(null);
      setEditingSetIndex(null);
      setEditingField(null);
      setEditingValue("");
    }
  };

  // Add handleDeleteDay function
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
              try {
                setIsLoading(true);
                // Soft delete all exercises for this day first
                const exercisesToDelete = exercises[dayId] || [];

                // Soft delete exercises one by one instead of using batch
                for (const exercise of exercisesToDelete) {
                  try {
                    // Mark exercise as deleted
                    await updateDoc(doc(db, "templateExercises", exercise.id), {
                      deleted: true,
                      deletedAt: serverTimestamp(),
                    });
                  } catch (error) {
                    console.error("Error marking exercise as deleted:", error);
                    // Continue with other updates even if one fails
                  }
                }

                // Soft delete the day itself
                try {
                  await updateDoc(doc(db, "templateDays", dayId), {
                    deleted: true,
                    deletedAt: serverTimestamp(),
                  });
                } catch (error) {
                  console.error("Error marking day as deleted:", error);
                  throw error;
                }

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

                // Show success message
                Alert.alert("Success", "Day successfully deleted");
              } catch (error) {
                console.error("Error deleting day:", error);
                Alert.alert("Error", "Failed to delete day. Please try again.");
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Error in handleDeleteDay:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // Add handleAddDay function
  const handleAddDay = async (weekId) => {
    try {
      // Get current days for this week
      const currentDays = days[weekId] || [];
      const newDayNumber = currentDays.length + 1;

      // Create new day in Firestore
      const dayRef = doc(collection(db, "templateDays"));
      const dayId = dayRef.id;

      await setDoc(dayRef, {
        id: dayId,
        weekId: weekId,
        dayNumber: newDayNumber,
        createdAt: serverTimestamp(),
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

  // Add the handleDuplicateWeek function
  const handleDuplicateWeek = async (weekIndex) => {
    try {
      setIsLoading(true);

      // Get the week to copy
      const weekToCopy = weeks[weekIndex];
      if (!weekToCopy) {
        throw new Error("Week not found");
      }

      // Create new week in Firestore
      const weekRef = doc(collection(db, "templateWeeks"));
      const weekId = weekRef.id;
      const newWeekNumber = totalWeeks + 1;

      await setDoc(weekRef, {
        id: weekId,
        templateId: templateId,
        weekNumber: newWeekNumber,
        name: `Week ${newWeekNumber}`,
        createdAt: serverTimestamp(),
      });

      // Get days from the week to copy
      const daysQuery = query(
        collection(db, "templateDays"),
        where("weekId", "==", weekToCopy.id)
      );
      const daysSnapshot = await getDocs(daysQuery);
      const daysToCopy = daysSnapshot.docs.map((doc) => doc.data());

      // Create days for the new week
      const newDays = [];
      const newExercisesState = {};

      for (const day of daysToCopy) {
        const dayRef = doc(collection(db, "templateDays"));
        const dayId = dayRef.id;

        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: day.dayNumber,
          createdAt: serverTimestamp(),
        });

        newDays.push({
          id: dayId,
          weekId: weekId,
          dayNumber: day.dayNumber,
        });

        // Get exercises for this day
        const exercisesQuery = query(
          collection(db, "templateExercises"),
          where("dayId", "==", day.id)
        );
        const exercisesSnapshot = await getDocs(exercisesQuery);
        const exercisesToCopy = exercisesSnapshot.docs.map((doc) => doc.data());

        // Create array to track the new exercises for this day
        const newDayExercises = [];

        // Copy exercises to the new day
        for (const exercise of exercisesToCopy) {
          const exerciseRef = doc(collection(db, "templateExercises"));
          const newExerciseId = exerciseRef.id;

          const newExercise = {
            id: newExerciseId,
            dayId: dayId,
            name: exercise.name,
            sets: [...exercise.sets],
            notes: exercise.notes,
            order: exercise.order,
            createdAt: serverTimestamp(),
          };

          await setDoc(exerciseRef, newExercise);

          // Add the new exercise to our temporary array for state update
          newDayExercises.push(newExercise);
        }

        // Store the new exercises for this day
        if (newDayExercises.length > 0) {
          newExercisesState[dayId] = newDayExercises;
        }
      }

      console.log(
        `Created ${Object.keys(newExercisesState).length} days of exercises`
      );

      // Update state
      const newWeek = {
        id: weekId,
        templateId: templateId,
        weekNumber: newWeekNumber,
        name: `Week ${newWeekNumber}`,
      };

      setWeeks([...weeks, newWeek]);
      setDays({ ...days, [weekId]: newDays });

      // Update exercises state with the new exercises
      setExercises((prevExercises) => ({
        ...prevExercises,
        ...newExercisesState,
      }));

      // Update UI state
      setIsProgrammaticScroll(true);
      const newTotalWeeks = totalWeeks + 1;
      setTotalWeeks(newTotalWeeks);

      // Update week names
      const newWeekNames = [...weekNames];
      newWeekNames[newTotalWeeks - 1] = `Week ${newWeekNumber}`;
      setWeekNames(newWeekNames);

      requestAnimationFrame(() => {
        setCurrentWeek(newTotalWeeks - 1);

        // Perform scroll animations
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
          setIsLoading(false);
        }, 300);
      });
    } catch (error) {
      console.error("Error duplicating week:", error);
      Alert.alert("Error", "Failed to duplicate week");
      setIsLoading(false);
    }
  };

  // Loading indicator
  if (isLoading && !template) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Define the ExerciseItem component to match WorkoutProgram.js exactly
  const ExerciseItem = ({ exercise, index, weekIndex, dayIndex }) => {
    // Add local state for exercise name
    const [exerciseName, setExerciseName] = useState(exercise.name || "");

    // Add local state for each set's scheme
    const [setStates, setSetStates] = useState(
      (exercise.sets || []).map((set) => ({
        scheme: set.scheme || "",
      }))
    );

    // Add local state for notes
    const [notes, setNotes] = useState(exercise.notes || "");

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
            />
            <TouchableOpacity
              style={styles.deleteExerciseButton}
              onPress={() => handleDeleteExercise(exercise.id, exercise.dayId)}
            >
              <Icon name="close-outline" size={20} color="#666" />
            </TouchableOpacity>
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
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addSetButton}
            onPress={() => handleAddSet(exercise.id, exercise.dayId)}
          >
            <Text style={styles.addSetButtonText}>+ Add Set</Text>
          </TouchableOpacity>

          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Notes:</Text>
            <TextInput
              style={styles.noteInput}
              value={notes}
              onChangeText={setNotes}
              onBlur={handleNotesBlur}
              placeholder="Add notes here"
              multiline
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{templateName}</Text>
      </View>

      {/* Week actions buttons */}
      <View style={styles.weekActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => handleDuplicateWeek(currentWeek)}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
            Duplicate week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.deleteButton,
            totalWeeks <= 1 && styles.disabledButton,
          ]}
          onPress={handleDeleteWeek}
          disabled={totalWeeks <= 1}
        >
          <Text
            style={[
              styles.actionButtonText,
              styles.deleteButtonText,
              totalWeeks <= 1 && styles.disabledButtonText,
            ]}
          >
            Delete week
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={width}
        decelerationRate="fast"
        directionalLockEnabled={true}
        contentContainerStyle={{
          alignItems: "flex-start",
        }}
      >
        {Array(Math.min(totalWeeks, weeks.length))
          .fill(null)
          .map((_, weekIndex) => (
            <ScrollView
              key={weekIndex}
              style={styles.programContainer}
              contentContainerStyle={{
                paddingBottom: 60,
                alignItems: "center",
                width: "100%",
              }}
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
              {weekIndex < weeks.length && (
                <>
                  <View style={{ width: "100%" }}>
                    {days[weeks[weekIndex].id] &&
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
                            <View style={styles.dayHeaderButtons}>
                              <TouchableOpacity
                                style={styles.dayActionButton}
                                onPress={() =>
                                  handleDeleteDay(weeks[weekIndex].id, day.id)
                                }
                              >
                                <Icon
                                  name="trash-outline"
                                  size={18}
                                  color="#666"
                                />
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
                        </View>
                      ))}
                  </View>
                </>
              )}
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
                      currentWeek === index && styles.weekButtonActive,
                    ]}
                    onPress={() => {
                      setIsProgrammaticScroll(true);
                      setCurrentWeek(index);

                      scrollViewRef.current?.scrollTo({
                        x: index * width,
                        animated: true,
                      });

                      setTimeout(() => {
                        setIsProgrammaticScroll(false);
                      }, 300);
                    }}
                  >
                    <Text
                      style={[
                        styles.weekButtonText,
                        currentWeek === index && styles.weekButtonTextActive,
                      ]}
                    >
                      {weekNames[index] || `Week ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.renameButton}
                    onPress={() => handleRenameWeek(index)}
                  >
                    <Icon name="pencil-outline" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.addWeekButton}
            onPress={handleAddWeek}
          >
            <Icon name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Rename Week Modal */}
      <Modal
        visible={isRenameWeekModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
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
                onPress={() => setIsRenameWeekModalVisible(false)}
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
        </View>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal
        visible={isAddExerciseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <Text style={styles.inputLabel}>Exercise Name</Text>
            <TextInput
              style={styles.textInput}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              placeholder="Enter exercise name"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddExerciseModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  handleAddExercise(weeks[currentWeek].id, selectedDayId);
                  setIsAddExerciseModalVisible(false);
                  setNewExerciseName("");
                }}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? "Adding..." : "Add"}
                </Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 4,
    paddingTop: 70,
  },
  backButton: {
    marginRight: 14,
    padding: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  programContainer: {
    width: width,
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
  daySection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    width: "100%",
  },
  firstDaySection: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  dayHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayActionButton: {
    padding: 8,
  },
  addExerciseButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addExerciseIcon: {
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
    color: "#666",
  },
  exercisesContainer: {
    gap: 12,
    width: "90%",
    alignSelf: "center",
  },
  exercise: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: "90%",
    alignSelf: "center",
  },
  exerciseContent: {
    padding: 12,
  },
  exerciseNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    padding: 0,
  },
  deleteExerciseButton: {
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
  addSetButton: {
    marginTop: 6,
    marginBottom: 8,
  },
  addSetButtonText: {
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
  bottomAddExerciseButton: {
    marginTop: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "solid",
    width: "90%",
    alignSelf: "center",
  },
  bottomAddExerciseContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  bottomAddExerciseText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  addDayButton: {
    marginTop: 8,
    backgroundColor: "#f4f4f4",
    width: "90%",
    alignSelf: "center",
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
    textAlign: "center",
  },
  weekButtonTextActive: {
    color: "#fff",
  },
  renameButton: {
    padding: 2,
    opacity: 0.6,
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
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#000",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  weekActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    height: 36,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
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
    fontSize: 13,
    marginLeft: 0,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  primaryButton: {
  },
  primaryButtonText: {
    color: "#000",
  },
  deleteButton: {
  },
  deleteButtonText: {
    color: "#FF3B30",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
});

export default EditTemplate;
