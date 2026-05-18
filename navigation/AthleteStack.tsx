// @ts-nocheck
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AthleteHome from "../pages/AthleteHome";
import WorkoutProgram from "../pages/WorkoutProgram";
import Settings from "../pages/Settings";
import UserProfile from "../pages/UserProfile";

const Stack = createStackNavigator();

const AthleteStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AthleteHome" component={AthleteHome} />
      <Stack.Screen name="WorkoutProgram" component={WorkoutProgram} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
    </Stack.Navigator>
  );
};

export default AthleteStack;
