// @ts-nocheck
import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AppIntroSlider from "react-native-app-intro-slider";
import "./src/config/firebase";
import OpeningScreen from "./pages/OpeningScreen";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Welcome from "./pages/Welcome";
import Clients from "./pages/Clients";
import ClientRequests from "./pages/ClientRequests";
import AddClient from "./pages/AddClient";
import UserProfile from "./pages/UserProfile";
import ClientDetails from "./pages/ClientDetails";
import CreateBlock from "./pages/CreateBlock";
import WorkoutProgram from "./pages/WorkoutProgram";
import { SettingsProvider } from "./contexts/SettingsContext";
import AthleteTabs from "./navigation/AthleteTabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CoachRequests from "./pages/CoachRequests";
import FindCoach from "./pages/FindCoach";
import Templates from "./pages/Templates";
import EditTemplate from "./pages/EditTemplate";
import EditTemplateExercise from "./pages/EditTemplateExercise";
import AddCoach from "./pages/AddCoach";
import MaxLifts from "./pages/MaxLifts";

const slides = [
  {
    id: 1,
    title: "",
    description: "",
    image: require("./assets/onboard1.jpg"),
  },
  {
    id: 2,
    title: "Programming Made Simpler",
    description: "Create and view programs faster than ever",
    image: require("./assets/onboard2.png"),
  },
  {
    id: 3,
    title: "Progress made clearer",
    description: "Track performance in one place",
    image: require("./assets/onboard3.png"),
  },
];

const Stack = createStackNavigator();

export default function App() {
  const [showHomePage, setShowHomePage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  console.log("App rendering, showHomePage:", showHomePage);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      // Clear the onboarding flag to always show onboarding
      await AsyncStorage.removeItem("hasSeenOnboarding");
      setShowHomePage(false);
    } catch (error) {
      console.log("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      setShowHomePage(true);
    } catch (error) {
      console.log("Error saving onboarding status:", error);
    }
  };

  const OnboardingScreen = () => {
    const buttonLabel = (label) => (
      <View style={styles.buttonContainer}>
        <Text style={styles.buttonText}>{label}</Text>
      </View>
    );

    return (
      <View style={styles.container}>
        <AppIntroSlider
          data={slides}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image
                source={item.image}
                style={styles.image}
                resizeMode="contain"
              />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}
          activeDotStyle={{
            backgroundColor: "#000",
            width: 30,
          }}
          showSkipButton
          renderNextButton={() => buttonLabel("Next")}
          renderSkipButton={() => buttonLabel("Skip")}
          renderDoneButton={() => buttonLabel("Done")}
          onDone={handleDone}
        />
      </View>
    );
  };

  // Show loading state
  if (isLoading) {
    return null;
  }

  console.log("Rendering App component");

  return (
    <SettingsProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={showHomePage ? "OpeningScreen" : "Onboarding"}
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
          }}
        >
          {!showHomePage ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <>
              <Stack.Screen name="OpeningScreen" component={OpeningScreen} />
              <Stack.Screen name="SignIn" component={SignIn} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen name="MaxLifts" component={MaxLifts} />
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen
                name="AthleteHome"
                component={AthleteTabs}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen name="Clients" component={Clients} />
              <Stack.Screen name="ClientRequests" component={ClientRequests} />
              <Stack.Screen name="AddClient" component={AddClient} />
              <Stack.Screen name="ClientDetails" component={ClientDetails} />
              <Stack.Screen name="CreateBlock" component={CreateBlock} />
              <Stack.Screen name="WorkoutProgram" component={WorkoutProgram} />
              <Stack.Screen name="UserProfile" component={UserProfile} />
              <Stack.Screen name="CoachRequests" component={CoachRequests} />
              <Stack.Screen name="FindCoach" component={FindCoach} />
              <Stack.Screen name="AddCoach" component={AddCoach} />
              <Stack.Screen name="Templates" component={Templates} />
              <Stack.Screen name="EditTemplate" component={EditTemplate} />
              <Stack.Screen
                name="EditTemplateExercise"
                component={EditTemplateExercise}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    paddingTop: 180,
  },
  image: {
    width: "100%",
    height: 400,
    resizeMode: "contain",
    alignSelf: "center",
  },
  title: {
    fontWeight: "bold",
    fontSize: 24,
    marginTop: -30,
  },
  description: {
    textAlign: "center",
    marginTop: 5,
  },
  buttonContainer: {
    padding: 12,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
