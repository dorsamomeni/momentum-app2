// @ts-nocheck
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "../compat/firestore";
import { db } from "../config/firebase";

// Function to get all athletes for a coach
export const getCoachAthletes = async (coachId) => {
  try {
    const athletesQuery = query(
      collection(db, "users"),
      where("coachId", "==", coachId),
      where("role", "==", "athlete")
    );

    const querySnapshot = await getDocs(athletesQuery);
    const athletes = [];

    querySnapshot.forEach((doc) => {
      athletes.push({ id: doc.id, ...doc.data() });
    });

    return athletes;
  } catch (error) {
    console.error("Error getting coach athletes:", error);
    throw error;
  }
};

// Remove sendProgramToAthlete function and continue with next function
export const getCoachPrograms = async (coachId) => {
  // ... existing code ...
};
