// @ts-nocheck
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "../compat/firestore";
import { db } from "../config/firebase";

// Create a new block
export const createBlock = async (blockData) => {
  try {
    const batch = writeBatch(db);

    // Add block to blocks collection
    const blockRef = doc(collection(db, "blocks"));
    const blockId = blockRef.id;

    const newBlock = {
      ...blockData,
      id: blockId,
      createdAt: serverTimestamp(),
      status: "active",
    };

    batch.set(blockRef, newBlock);

    // Also update athlete's document to reference this block
    if (blockData.athleteId) {
      const athleteRef = doc(db, "users", blockData.athleteId);
      batch.update(athleteRef, {
        activeBlocks: arrayUnion(blockId),
      });
    }

    await batch.commit();
    return { id: blockId, ...newBlock };
  } catch (error) {
    console.error("Error creating block:", error);
    throw error;
  }
};

// Add a week to a block
export const addWeek = async (blockId, weekData) => {
  try {
    const weekRef = doc(collection(db, "weeks"));
    const weekId = weekRef.id;

    const newWeek = {
      ...weekData,
      blockId,
      id: weekId,
      submittedAt: serverTimestamp(),
    };

    await setDoc(weekRef, newWeek);
    return { id: weekId, ...newWeek };
  } catch (error) {
    console.error("Error adding week:", error);
    throw error;
  }
};

// Add a day to a week
export const addDay = async (weekId, dayData) => {
  try {
    const dayRef = doc(collection(db, "days"));
    const dayId = dayRef.id;

    const newDay = {
      ...dayData,
      weekId,
      id: dayId,
      submittedAt: serverTimestamp(),
    };

    await setDoc(dayRef, newDay);
    return { id: dayId, ...newDay };
  } catch (error) {
    console.error("Error adding day:", error);
    throw error;
  }
};

// Add an exercise to a day
export const addExercise = async (dayId, exerciseData) => {
  try {
    const exerciseRef = doc(collection(db, "exercises"));
    const exerciseId = exerciseRef.id;

    const newExercise = {
      ...exerciseData,
      dayId,
      id: exerciseId,
    };

    await setDoc(exerciseRef, newExercise);
    return { id: exerciseId, ...newExercise };
  } catch (error) {
    console.error("Error adding exercise:", error);
    throw error;
  }
};

// Get block by ID
export const getBlockById = async (blockId) => {
  try {
    const blockDoc = await getDoc(doc(db, "blocks", blockId));
    if (!blockDoc.exists()) {
      throw new Error("Block not found");
    }
    return { id: blockDoc.id, ...blockDoc.data() };
  } catch (error) {
    console.error("Error getting block:", error);
    throw error;
  }
};

// Get all weeks for a block
export const getWeeksByBlockId = async (blockId) => {
  try {
    const q = query(collection(db, "weeks"), where("blockId", "==", blockId));
    const querySnapshot = await getDocs(q);

    const weeks = [];
    querySnapshot.forEach((doc) => {
      weeks.push({ id: doc.id, ...doc.data() });
    });

    return weeks;
  } catch (error) {
    console.error("Error getting weeks:", error);
    throw error;
  }
};

// Get all days for a week
export const getDaysByWeekId = async (weekId) => {
  try {
    const q = query(collection(db, "days"), where("weekId", "==", weekId));
    const querySnapshot = await getDocs(q);

    const days = [];
    querySnapshot.forEach((doc) => {
      days.push({ id: doc.id, ...doc.data() });
    });

    return days;
  } catch (error) {
    console.error("Error getting days:", error);
    throw error;
  }
};

// Get all exercises for a day
export const getExercisesByDayId = async (dayId) => {
  try {
    const q = query(collection(db, "exercises"), where("dayId", "==", dayId));
    const querySnapshot = await getDocs(q);

    const exercises = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() });
    });

    return exercises;
  } catch (error) {
    console.error("Error getting exercises:", error);
    throw error;
  }
};

// Get a complete block with all related data
export const getCompleteBlock = async (blockId) => {
  try {
    // Get the block
    const block = await getBlockById(blockId);

    // Get all weeks for this block
    const weeks = await getWeeksByBlockId(blockId);

    // For each week, get all days
    const weeksWithDays = await Promise.all(
      weeks.map(async (week) => {
        const days = await getDaysByWeekId(week.id);

        // For each day, get all exercises
        const daysWithExercises = await Promise.all(
          days.map(async (day) => {
            const exercises = await getExercisesByDayId(day.id);
            return { ...day, exercises };
          })
        );

        return { ...week, days: daysWithDays };
      })
    );

    return { ...block, weeks: weeksWithDays };
  } catch (error) {
    console.error("Error getting complete block:", error);
    throw error;
  }
};

// Update block status
export const updateBlockStatus = async (blockId, status) => {
  try {
    await updateDoc(doc(db, "blocks", blockId), { status });
    return true;
  } catch (error) {
    console.error("Error updating block status:", error);
    throw error;
  }
};

// Send a block to an athlete
export const sendBlockToAthlete = async (blockId, athleteId) => {
  try {
    const batch = writeBatch(db);

    // Update block with athlete ID
    const blockRef = doc(db, "blocks", blockId);
    batch.update(blockRef, {
      athleteId,
      sentAt: serverTimestamp(),
    });

    // Update athlete's document to include this block
    const athleteRef = doc(db, "users", athleteId);
    batch.update(athleteRef, {
      activeBlocks: arrayUnion(blockId),
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error sending block to athlete:", error);
    throw error;
  }
};
