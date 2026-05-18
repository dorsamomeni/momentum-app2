import { createUserWithEmailAndPassword, updateProfile } from "../compat/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "../compat/firestore";
import { auth, db } from "../config/firebase";
import { getRandomProfileColor } from "../utils/colors";

export const signup = async (userData) => {
  const { email, password, firstName, lastName, username, role } = userData;

  try {
    // Check if username already exists
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username.toLowerCase())
    );
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      throw new Error("Username already taken. Please choose another one.");
    }

    console.log("1. Creating auth user");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("2. Auth user created:", user.uid);

    // Update display name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    });
    console.log("3. Display name updated");

    // Assign random profile color
    const profileColor = getRandomProfileColor();
    console.log("4. Assigned profile color:", profileColor);

    // Create user document
    const userDocRef = doc(db, "users", user.uid);
    const userDataForStore = {
      firstName,
      lastName,
      username: username.toLowerCase(),
      email,
      role,
      profileColor, // Store the assigned profile color
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Role-specific fields
      ...(role === "athlete"
        ? {
            coachId: null,
            activeBlocks: [],
            previousBlocks: [],
            status: "unassigned",
          }
        : {
            athletes: [],
          }),
      coachRequests: [],
      pendingRequests: [],
      sentRequests: [],
      status: "inactive",
    };

    console.log("5. Attempting to create Firestore document");
    await setDoc(userDocRef, userDataForStore);
    console.log("6. Firestore document created successfully");

    return {
      user,
      userData: userDataForStore,
    };
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === "auth/email-already-in-use") {
      throw { code: error.code, message: "This email is already registered" };
    } else if (error.code === "auth/invalid-email") {
      throw { code: error.code, message: "Invalid email address" };
    } else if (error.code === "auth/weak-password") {
      throw {
        code: error.code,
        message: "Password should be at least 6 characters",
      };
    } else {
      throw {
        code: "auth/unknown",
        message: `Failed to create account: ${error.message}`,
      };
    }
  }
};
