// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { auth, db } from "../src/config/firebase";
import {
  writeBatch,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
  collection,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "../src/compat/firestore";

const formatDate = (date) => {
  // Handle different date formats (Firestore timestamp or JavaScript Date)
  if (!date) return "N/A";

  try {
    // Handle different possible date formats
    let jsDate;

    // Check if it's a Firestore Timestamp
    if (
      typeof date === "object" &&
      date.toDate &&
      typeof date.toDate === "function"
    ) {
      jsDate = date.toDate();
    }
    // Check if it's a Firestore Timestamp-like object
    else if (
      date &&
      typeof date === "object" &&
      "seconds" in date &&
      "nanoseconds" in date
    ) {
      jsDate = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
    }
    // Check if it's already a Date object
    else if (date instanceof Date) {
      jsDate = date;
    }
    // Check if it's a string
    else if (typeof date === "string") {
      jsDate = new Date(date);
    }
    // Check if it's a number (milliseconds)
    else if (typeof date === "number") {
      jsDate = new Date(date);
    } else {
      console.warn("Unknown date format:", JSON.stringify(date));
      return "Invalid date";
    }

    // Validate the date is valid
    if (isNaN(jsDate.getTime())) {
      console.warn("Invalid date object created from:", JSON.stringify(date));
      return "Invalid date";
    }

    // Format the date as MMM DD, YYYY
    return jsDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error(
      "Error formatting date:",
      error,
      "Date value:",
      JSON.stringify(date)
    );
    return "Invalid date";
  }
};

const ClientDetails = ({ route }) => {
  const navigation = useNavigation();
  const { client } = route.params;

  // States
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [previousBlocks, setPreviousBlocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBlockRenameModalVisible, setIsBlockRenameModalVisible] =
    useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [tempBlockName, setTempBlockName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Initial data loading
  useEffect(() => {
    fetchUserBlocks();
  }, []);

  // Refresh data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("ClientDetails screen focused - refreshing block data");
      fetchUserBlocks();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserBlocks().then(() => {
      setRefreshing(false);
    });
  }, []);

  const handleNewBlock = async (
    blockName,
    sessionsPerWeek,
    startDate,
    endDate
  ) => {
    try {
      console.log("Creating new block:", blockName);

      // Ensure dates are properly formatted for Firestore
      const startDateToUse = startDate || new Date();
      const endDateToUse =
        endDate || new Date(new Date().setDate(new Date().getDate() + 28));

      // Convert dates to Firestore-compatible format
      const formattedStartDate = {
        seconds: Math.floor(startDateToUse.getTime() / 1000),
        nanoseconds: 0,
      };

      const formattedEndDate = {
        seconds: Math.floor(endDateToUse.getTime() / 1000),
        nanoseconds: 0,
      };

      // Log date objects for debugging
      console.log("Start date formatted:", formattedStartDate);
      console.log("End date formatted:", formattedEndDate);

      // Create new block using our new structure with user-selected dates
      const newBlock = {
        name: blockName,
        coachId: auth.currentUser.uid,
        athleteId: route.params.client.id,
        status: "active",
        sessionsPerWeek,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      };

      // Add console log before updating Firebase
      console.log("New block to be added:", newBlock);

      // Create the block in Firestore
      const blockRef = doc(collection(db, "blocks"));
      const blockId = blockRef.id;

      const batch = writeBatch(db);

      // Set the block document
      batch.set(blockRef, {
        ...newBlock,
        id: blockId,
        createdAt: serverTimestamp(),
      });

      // Update athlete's document
      const athleteRef = doc(db, "users", route.params.client.id);
      batch.update(athleteRef, {
        activeBlocks: arrayUnion(blockId),
      });

      await batch.commit();
      console.log("Block added successfully");

      // CHANGED: Only create 1 week instead of 4
      // Create exactly ONE week
      const weekRef = doc(collection(db, "weeks"));
      const weekId = weekRef.id;

      await setDoc(weekRef, {
        id: weekId,
        blockId: blockId,
        weekNumber: 1, 
        daysPerWeek: sessionsPerWeek,
        startDate: formattedStartDate,
        submittedAt: serverTimestamp(),
      });

      // Create days for this week
      for (let dayNum = 1; dayNum <= sessionsPerWeek; dayNum++) {
        const dayRef = doc(collection(db, "days"));
        const dayId = dayRef.id;

        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: dayNum,
          submittedAt: serverTimestamp(),
        });
      }

      // Refresh the blocks
      fetchUserBlocks();
    } catch (error) {
      console.error("Error creating block:", error);
      Alert.alert("Error", "Failed to create training block");
    }
  };

  const fetchUserBlocks = async () => {
    try {
      console.log("Fetching blocks for client:", route.params.client.id);

      // Get blocks where athleteId matches the client
      const q = query(
        collection(db, "blocks"),
        where("athleteId", "==", route.params.client.id)
      );

      const querySnapshot = await getDocs(q);
      const activeBlocksData = [];
      const previousBlocksData = [];

      querySnapshot.forEach((doc) => {
        const blockData = { id: doc.id, ...doc.data() };

        // Skip any blocks with missing/invalid data
        if (!blockData.id || !blockData.name) {
          console.warn("Skipping invalid block data:", blockData.id);
          return;
        }

        // Format dates for display with error handling
        try {
          if (blockData.startDate) {
            if (blockData.startDate.seconds) {
              // Handle Firestore timestamp format
              const startDateObj = new Date(blockData.startDate.seconds * 1000);
              blockData.startDate = formatDate(startDateObj);
            } else if (blockData.startDate instanceof Date) {
              // Handle Date object
              blockData.startDate = formatDate(blockData.startDate);
            } else if (typeof blockData.startDate === "string") {
              // Handle string date
              blockData.startDate = blockData.startDate;
            } else {
              // Unknown format
              blockData.startDate = "Unknown date";
            }
          }

          if (blockData.endDate) {
            if (blockData.endDate.seconds) {
              // Handle Firestore timestamp format
              const endDateObj = new Date(blockData.endDate.seconds * 1000);
              blockData.endDate = formatDate(endDateObj);
            } else if (blockData.endDate instanceof Date) {
              // Handle Date object
              blockData.endDate = formatDate(blockData.endDate);
            } else if (typeof blockData.endDate === "string") {
              // Handle string date
              blockData.endDate = blockData.endDate;
            } else {
              // Unknown format
              blockData.endDate = "Unknown date";
            }
          }
        } catch (e) {
          console.error(
            "Error formatting dates:",
            e,
            blockData.startDate,
            blockData.endDate
          );
          blockData.startDate = blockData.startDate ? "Unknown date" : "";
          blockData.endDate = blockData.endDate ? "Unknown date" : "";
        }

        // Sort by status with validation
        if (blockData.status === "active") {
          activeBlocksData.push(blockData);
        } else {
          previousBlocksData.push(blockData);
        }
      });

      // Sort blocks by createdAt (newest first)
      activeBlocksData.sort((a, b) => {
        const dateA = a.createdAt
          ? a.createdAt.seconds
            ? new Date(a.createdAt.seconds * 1000)
            : new Date(a.createdAt)
          : new Date(0);
        const dateB = b.createdAt
          ? b.createdAt.seconds
            ? new Date(b.createdAt.seconds * 1000)
            : new Date(b.createdAt)
          : new Date(0);
        return dateB - dateA;
      });

      previousBlocksData.sort((a, b) => {
        const dateA = a.createdAt
          ? a.createdAt.seconds
            ? new Date(a.createdAt.seconds * 1000)
            : new Date(a.createdAt)
          : new Date(0);
        const dateB = b.createdAt
          ? b.createdAt.seconds
            ? new Date(b.createdAt.seconds * 1000)
            : new Date(b.createdAt)
          : new Date(0);
        return dateB - dateA;
      });

      console.log("Fetched blocks:", {
        active: activeBlocksData.length,
        previous: previousBlocksData.length,
      });

      setActiveBlocks(activeBlocksData);
      setPreviousBlocks(previousBlocksData);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      Alert.alert("Error", "Failed to load training blocks");
    }
    return Promise.resolve(); // Make sure to return a Promise for onRefresh
  };

  const handleCloseBlock = async (blockToClose) => {
    try {
      console.log("Closing block:", blockToClose.id);

      // Create batch write
      const batch = writeBatch(db);

      // Get references
      const athleteRef = doc(db, "users", route.params.client.id);
      const blockRef = doc(db, "blocks", blockToClose.id);

      // Update the block status in Firestore
      batch.update(blockRef, {
        status: "completed",
        lastUpdated: serverTimestamp(),
      });

      // Remove from activeBlocks array
      batch.update(athleteRef, {
        activeBlocks: arrayRemove(blockToClose.id),
      });

      // Commit the batch
      await batch.commit();

      // Update local state
      const updatedActiveBlocks = activeBlocks.filter(
        (block) => block.id !== blockToClose.id
      );
      setActiveBlocks(updatedActiveBlocks);

      const updatedPreviousBlocks = [
        ...previousBlocks,
        { ...blockToClose, status: "completed" },
      ];
      setPreviousBlocks(updatedPreviousBlocks);

      console.log("Block closed successfully");
      return true; // Return success indication
    } catch (error) {
      console.error("Error closing block:", error);
      throw error; // Rethrow to allow caller to catch
    }
  };

  const handleReopenBlock = async (blockToReopen) => {
    try {
      console.log("Reopening block:", blockToReopen.id);

      // Create batch write
      const batch = writeBatch(db);

      // Get references
      const athleteRef = doc(db, "users", route.params.client.id);
      const blockRef = doc(db, "blocks", blockToReopen.id);

      // Update the block status in Firestore
      batch.update(blockRef, {
        status: "active",
        lastUpdated: serverTimestamp(),
      });

      // Add to activeBlocks array
      batch.update(athleteRef, {
        activeBlocks: arrayUnion(blockToReopen.id),
      });

      // Commit the batch
      await batch.commit();

      // Update local state
      const updatedPreviousBlocks = previousBlocks.filter(
        (block) => block.id !== blockToReopen.id
      );
      setPreviousBlocks(updatedPreviousBlocks);

      const updatedActiveBlocks = [
        ...activeBlocks,
        { ...blockToReopen, status: "active" },
      ];
      setActiveBlocks(updatedActiveBlocks);

      console.log("Block reopened successfully");
      return true; // Return success indication
    } catch (error) {
      console.error("Error reopening block:", error);
      throw error; // Rethrow to allow caller to catch
    }
  };

  const handleDuplicateBlock = async (blockToDuplicate) => {
    if (!blockToDuplicate) {
      console.warn("No block to duplicate");
      return;
    }

    try {
      console.log("Starting duplication of block:", blockToDuplicate.id);

      // Get the complete block data if we only have a reference
      let completeBlockData = blockToDuplicate;
      if (!blockToDuplicate.startDate) {
        const blockDoc = await getDoc(doc(db, "blocks", blockToDuplicate.id));
        if (blockDoc.exists()) {
          completeBlockData = { id: blockDoc.id, ...blockDoc.data() };
        }
      }

      // Create a new block document
      const newBlockRef = doc(collection(db, "blocks"));
      const newBlockId = newBlockRef.id;

      // Get athlete data to update their activeBlocks array
      const athleteDoc = await getDoc(doc(db, "users", route.params.client.id));
      if (!athleteDoc.exists()) {
        throw new Error("Athlete document not found");
      }

      // Create a clean copy of the block data, filtering out undefined values
      // and omitting special fields like id, createdAt, etc.
      const blockData = {
        id: newBlockId,
        name: `${completeBlockData.name || "Block"} (Copy)`,
        status: "active",
        athleteId: completeBlockData.athleteId,
        coachId: completeBlockData.coachId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Safely copy additional fields, ensuring no undefined values
      const fieldsToCopy = [
        "startDate",
        "endDate",
        "notes",
        "description",
        "focus",
        "category",
        "color",
        "tags",
      ];

      fieldsToCopy.forEach((field) => {
        // Only copy fields that exist and are not undefined
        if (completeBlockData[field] !== undefined) {
          blockData[field] = completeBlockData[field];
        }
      });

      // Also copy any custom fields not in our known list
      Object.keys(completeBlockData).forEach((key) => {
        // Skip fields we've already handled or should not copy
        if (
          !["id", "name", "status", "createdAt", "updatedAt", "weeks"].includes(
            key
          ) &&
          !fieldsToCopy.includes(key) &&
          completeBlockData[key] !== undefined
        ) {
          blockData[key] = completeBlockData[key];
        }
      });

      console.log("Prepared new block data:", newBlockId);

      // Start batch operation
      const batch = writeBatch(db);

      // Add new block to Firestore
      batch.set(newBlockRef, blockData);

      // Update athlete's activeBlocks array
      let activeBlocks = athleteDoc.data().activeBlocks || [];
      // Ensure activeBlocks is an array of strings
      if (activeBlocks.length > 0 && typeof activeBlocks[0] === "object") {
        activeBlocks = activeBlocks.map((block) => block.id || block);
      }

      batch.update(doc(db, "users", route.params.client.id), {
        activeBlocks: [...activeBlocks, newBlockId],
      });

      // Commit the initial batch
      await batch.commit();
      console.log(
        "Initial block created, now duplicating weeks, days, and exercises"
      );

      // Fetch original block's weeks
      const weeksQuery = query(
        collection(db, "weeks"),
        where("blockId", "==", blockToDuplicate.id)
      );
      const weeksSnapshot = await getDocs(weeksQuery);
      console.log(`Found ${weeksSnapshot.size} weeks to duplicate`);

      // Map to store old week IDs to new week IDs
      const weekIdMap = {};
      const weekBatch = writeBatch(db);

      // Create new weeks for each existing week
      weeksSnapshot.forEach((weekDoc) => {
        const originalWeekData = weekDoc.data();
        const newWeekRef = doc(collection(db, "weeks"));
        const newWeekId = newWeekRef.id;

        // Store mapping of old week ID to new week ID
        weekIdMap[weekDoc.id] = newWeekId;

        // Create new week data, filtering out undefined values
        const newWeekData = {
          id: newWeekId,
          blockId: newBlockId,
          name: originalWeekData.name || `Week`,
          order:
            originalWeekData.order !== undefined ? originalWeekData.order : 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Safely copy any additional fields
        Object.keys(originalWeekData).forEach((key) => {
          if (
            !["id", "blockId", "createdAt", "updatedAt"].includes(key) &&
            originalWeekData[key] !== undefined &&
            newWeekData[key] === undefined
          ) {
            newWeekData[key] = originalWeekData[key];
          }
        });

        weekBatch.set(newWeekRef, newWeekData);
      });

      // Commit the weeks batch
      if (weeksSnapshot.size > 0) {
        await weekBatch.commit();
        console.log("Weeks duplicated successfully");
      }

      // For each week, duplicate its days
      for (const [oldWeekId, newWeekId] of Object.entries(weekIdMap)) {
        console.log(`Duplicating days for week ${oldWeekId} -> ${newWeekId}`);

        // Fetch days for the original week
        const daysQuery = query(
          collection(db, "days"),
          where("weekId", "==", oldWeekId)
        );
        const daysSnapshot = await getDocs(daysQuery);
        console.log(`Found ${daysSnapshot.size} days in week ${oldWeekId}`);

        // Map to store old day IDs to new day IDs
        const dayIdMap = {};
        const dayBatch = writeBatch(db);

        // Create new days for each existing day
        daysSnapshot.forEach((dayDoc) => {
          const originalDayData = dayDoc.data();
          const newDayRef = doc(collection(db, "days"));
          const newDayId = newDayRef.id;

          // Store mapping of old day ID to new day ID
          dayIdMap[dayDoc.id] = newDayId;

          // Create new day data, filtering out undefined values
          const newDayData = {
            id: newDayId,
            weekId: newWeekId,
            name: originalDayData.name || "Day",
            order:
              originalDayData.order !== undefined ? originalDayData.order : 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          // Safely copy any additional fields
          Object.keys(originalDayData).forEach((key) => {
            if (
              !["id", "weekId", "createdAt", "updatedAt"].includes(key) &&
              originalDayData[key] !== undefined &&
              newDayData[key] === undefined
            ) {
              newDayData[key] = originalDayData[key];
            }
          });

          dayBatch.set(newDayRef, newDayData);
        });

        // Commit the days batch
        if (daysSnapshot.size > 0) {
          await dayBatch.commit();
          console.log(`Days for week ${oldWeekId} duplicated successfully`);
        }

        // For each day, duplicate its exercises
        for (const [oldDayId, newDayId] of Object.entries(dayIdMap)) {
          console.log(
            `Duplicating exercises for day ${oldDayId} -> ${newDayId}`
          );

          // Fetch exercises for the original day
          const exercisesQuery = query(
            collection(db, "exercises"),
            where("dayId", "==", oldDayId)
          );
          const exercisesSnapshot = await getDocs(exercisesQuery);
          console.log(
            `Found ${exercisesSnapshot.size} exercises in day ${oldDayId}`
          );

          if (exercisesSnapshot.size === 0) continue;

          const exerciseBatch = writeBatch(db);
          let exerciseCount = 0;

          // Create new exercises for each existing exercise
          exercisesSnapshot.forEach((exerciseDoc) => {
            const originalExerciseData = exerciseDoc.data();
            const newExerciseRef = doc(collection(db, "exercises"));
            const newExerciseId = newExerciseRef.id;

            // Create new exercise data, filtering out undefined values
            const newExerciseData = {
              id: newExerciseId,
              dayId: newDayId,
              name: originalExerciseData.name || "Exercise",
              order:
                originalExerciseData.order !== undefined
                  ? originalExerciseData.order
                  : 0,
              sets: Array.isArray(originalExerciseData.sets)
                ? originalExerciseData.sets
                : [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            // Safely copy any additional fields
            Object.keys(originalExerciseData).forEach((key) => {
              if (
                !["id", "dayId", "createdAt", "updatedAt"].includes(key) &&
                originalExerciseData[key] !== undefined &&
                newExerciseData[key] === undefined
              ) {
                newExerciseData[key] = originalExerciseData[key];
              }
            });

            exerciseBatch.set(newExerciseRef, newExerciseData);
            exerciseCount++;

            // Commit in chunks to avoid batch limits
            if (exerciseCount >= 400) {
              exerciseBatch.commit();
              exerciseCount = 0;
            }
          });

          // Commit the exercises batch if there are any left
          if (exerciseCount > 0) {
            await exerciseBatch.commit();
            console.log(
              `Exercises for day ${oldDayId} duplicated successfully`
            );
          }
        }
      }

      console.log("Block duplication completed successfully");

      // Update local state to show the new block
      fetchUserBlocks();
    } catch (error) {
      console.error("Error duplicating block:", error);
      Alert.alert(
        "Error",
        "Failed to duplicate block: " + (error.message || "Please try again.")
      );
    }
  };

  const handleRenameBlock = (block) => {
    setSelectedBlock(block);
    setTempBlockName(block.name);
    setIsBlockRenameModalVisible(true);
  };

  const saveBlockName = async () => {
    if (selectedBlock && tempBlockName.trim()) {
      try {
        // First update in Firestore
        await updateDoc(doc(db, "blocks", selectedBlock.id), {
          name: tempBlockName.trim(),
          lastUpdated: serverTimestamp(),
        });

        // Then update local state
        if (selectedBlock.status === "active") {
          setActiveBlocks(
            activeBlocks.map((block) =>
              block.id === selectedBlock.id
                ? { ...block, name: tempBlockName.trim() }
                : block
            )
          );
        } else {
          setPreviousBlocks(
            previousBlocks.map((block) =>
              block.id === selectedBlock.id
                ? { ...block, name: tempBlockName.trim() }
                : block
            )
          );
        }
        console.log(
          "Block name updated successfully in Firestore and local state"
        );
      } catch (error) {
        console.error("Error updating block name:", error);
        Alert.alert("Error", "Failed to update block name. Please try again.");
      }
    }
    setIsBlockRenameModalVisible(false);
  };

  const filterBlocks = (blocks) => {
    return blocks
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      })
      .filter((block) =>
        (block.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  const handleDeleteBlock = async (blockId, isActive) => {
    try {
      console.log(
        `Deleting ${isActive ? "active" : "previous"} block:`,
        blockId
      );

      // Step 1: Delete all related data (exercises, days, weeks)
      // First, get all weeks for this block
      const weeksQuery = query(
        collection(db, "weeks"),
        where("blockId", "==", blockId)
      );
      const weeksSnapshot = await getDocs(weeksQuery);

      // Collect all week IDs
      const weekIds = [];
      weeksSnapshot.forEach((doc) => {
        weekIds.push(doc.id);
      });

      // For each week, get and delete days
      const dayIds = [];
      for (const weekId of weekIds) {
        const daysQuery = query(
          collection(db, "days"),
          where("weekId", "==", weekId)
        );
        const daysSnapshot = await getDocs(daysQuery);

        daysSnapshot.forEach((doc) => {
          dayIds.push(doc.id);
        });
      }

      // For each day, get and delete exercises
      const batch = writeBatch(db);
      let operationCount = 0;

      for (const dayId of dayIds) {
        const exercisesQuery = query(
          collection(db, "exercises"),
          where("dayId", "==", dayId)
        );
        const exercisesSnapshot = await getDocs(exercisesQuery);

        exercisesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          operationCount++;

          // Firebase has a limit of 500 operations per batch
          if (operationCount >= 450) {
            batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        });
      }

      // Delete all days
      for (const dayId of dayIds) {
        batch.delete(doc(db, "days", dayId));
        operationCount++;

        if (operationCount >= 450) {
          batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      // Delete all weeks
      for (const weekId of weekIds) {
        batch.delete(doc(db, "weeks", weekId));
        operationCount++;

        if (operationCount >= 450) {
          batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      // Step 2: Delete the block itself
      batch.delete(doc(db, "blocks", blockId));

      // Step 3: Update the athlete document if it's an active block
      if (isActive) {
        const athleteRef = doc(db, "users", route.params.client.id);
        const athleteDoc = await getDoc(athleteRef);
        const athleteData = athleteDoc.data();

        if (athleteData && athleteData.activeBlocks) {
          // Handle both string IDs and object references
          if (Array.isArray(athleteData.activeBlocks)) {
            if (athleteData.activeBlocks.includes(blockId)) {
              batch.update(athleteRef, {
                activeBlocks: arrayRemove(blockId),
              });
            } else {
              const blockToRemove = athleteData.activeBlocks.find(
                (b) =>
                  (typeof b === "object" && b.id === blockId) || b === blockId
              );

              if (blockToRemove) {
                batch.update(athleteRef, {
                  activeBlocks: arrayRemove(blockToRemove),
                });
              }
            }
          }
        }
      }

      // Commit any remaining operations
      await batch.commit();
      console.log("Block and related data deleted successfully");

      // Update local state
      if (isActive) {
        setActiveBlocks(activeBlocks.filter((block) => block.id !== blockId));
      } else {
        setPreviousBlocks(
          previousBlocks.filter((block) => block.id !== blockId)
        );
      }
    } catch (error) {
      console.error("Error deleting block:", error);
      console.error("Error details:", error.code, error.message);

      // More detailed error message
      Alert.alert(
        "Error Deleting Block",
        `Please try again: ${error.message || "Unknown error"}`
      );
    }
  };

  const handleUpdateBlock = (updatedBlock) => {
    setActiveBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block
      )
    );
  };

  const renderBlock = (block, isPrevious = false) => {
    if (!block || !block.id || !block.name) {
      console.warn("Attempted to render invalid block:", block);
      return null;
    }

    // Define icon colors based on whether it's a previous block
    const iconColor = isPrevious ? "#888888" : "#000000"; // Grey for previous, blue for active
    const deleteIconColor = isPrevious ? "#888888" : "#FF3B30"; // Grey for previous, red for active
    const statusIconColor = isPrevious ? "#888888" : "#4CD964"; // Grey for previous, green for active

    return (
      <TouchableOpacity
        key={block.id}
        style={[styles.blockCard, isPrevious && styles.previousBlock]}
        onPress={() =>
          navigation.navigate("WorkoutProgram", {
            blockId: block.id,
            onCloseBlock: (blockToClose) => handleCloseBlock(blockToClose),
            isPreviousBlock: isPrevious,
            onReopenBlock: (blockToReopen) => handleReopenBlock(blockToReopen),
            isAthlete: false,
            onUpdateBlock: (blockToUpdate) => handleUpdateBlock(blockToUpdate),
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
            <TouchableOpacity
              style={styles.blockRenameButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRenameBlock(block);
              }}
            >
              <Icon name="pencil-outline" size={16} color={iconColor} />
            </TouchableOpacity>
          </View>
          <View style={styles.blockActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteBlock(block.id, !isPrevious);
              }}
            >
              <Icon name="trash-outline" size={18} color={deleteIconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.duplicateButton}
              onPress={() => handleDuplicateBlock(block)}
            >
              <Icon name="copy-outline" size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.dateText}>
          {block.startDate} - {block.endDate}
        </Text>
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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            title="Refreshing..."
            titleColor="#000000"
          />
        }
      >
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <View
              style={[
                styles.profilePhoto,
                { backgroundColor: client.profileColor || "#A8E6CF" },
              ]}
            >
              <Text style={styles.initial}>
                {client.firstName[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.clientName}>
                {client.firstName} {client.lastName}
              </Text>
              <Text style={styles.username}>@{client.username}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.newBlockButton}
            onPress={() => {
              navigation.navigate("CreateBlock", {
                client,
                onCreateBlock: handleNewBlock,
              });
            }}
          >
            <Text style={styles.newBlockText}>New Block</Text>
          </TouchableOpacity>
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
              placeholder="Search blocks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.blocksSection}>
          <Text style={styles.sectionTitle}>Active Blocks</Text>
          {activeBlocks.length > 0 ? (
            filterBlocks(activeBlocks).map((block) => renderBlock(block))
          ) : (
            <View style={styles.noBlockContainer}>
              <Text style={styles.noBlockText}>No active training blocks</Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, styles.previousTitle]}>
            Previous Blocks
          </Text>
          {previousBlocks.length > 0 ? (
            filterBlocks(previousBlocks).map((block) =>
              renderBlock(block, true)
            )
          ) : (
            <View style={styles.noBlockContainer}>
              <Text style={styles.noBlockText}>
                No previous training blocks
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 24,
    paddingTop: 70,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 24,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  clientHeader: {
    marginBottom: 24,
    alignItems: "center",
    marginTop: 20,
  },
  clientInfo: {
    alignItems: "center",
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  initial: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "bold",
  },
  nameContainer: {
    alignItems: "center",
  },
  clientName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  newBlockButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
  },
  newBlockText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  blocksSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
  },
  previousTitle: {
    marginTop: 16,
  },
  blockCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  blockTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  blockName: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
    flex: 1,
  },
  statusIcon: {
    marginRight: 8,
  },
  dateText: {
    color: "#666",
    fontSize: 14,
  },
  noBlockContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    marginVertical: 10,
  },
  noBlockText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
  blockActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  duplicateButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "transparent",
    opacity: 0.6,
  },
  blockRenameButton: {
    padding: 4,
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
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
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
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },
  actionButton: {
    padding: 4,
    marginRight: 8,
  },
  previousBlock: {
    backgroundColor: "#F5F5F5",
    borderColor: "#DDDDDD", 
  },
});

export default ClientDetails;
