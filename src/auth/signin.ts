import { signInWithEmailAndPassword } from "../compat/auth";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "../compat/firestore";

export const signin = async (emailOrUsername, password) => {
  try {
    let email = emailOrUsername;

    // Check if input is a username
    if (!emailOrUsername.includes("@")) {
      // Query Firestore to get email associated with username
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("username", "==", emailOrUsername.toLowerCase())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw { code: "auth/user-not-found", message: "User not found" };
      }

      email = querySnapshot.docs[0].data().email;
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("Signin successful:", user.uid);

    return {
      user,
      userData: {
        email: user.email,
        displayName: user.displayName,
      },
    };
  } catch (error) {
    console.error("Signin error:", error);
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      throw { code: error.code, message: "Invalid username/email or password" };
    } else if (error.code === "auth/invalid-email") {
      throw { code: error.code, message: "Invalid username or email format" };
    } else {
      throw { code: "auth/unknown", message: `Login failed: ${error.message}` };
    }
  }
};
