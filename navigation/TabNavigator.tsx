// @ts-nocheck
import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import CustomTabBarButton from "../components/CustomTabBarButton";

// Import all screens
import ClientList from "../pages/ClientsList";
import AthleteHome from "../pages/AthleteHome";
import ClientDetails from "../pages/ClientDetails";
import WorkoutProgram from "../pages/WorkoutProgram";
import CreateBlock from "../pages/CreateBlock";
import ClientsSettings from "../pages/ClientsSettings";
import ClientRequests from "../pages/ClientRequests";
import AddClient from "../pages/AddClient";
import UserProfile from "../pages/UserProfile";
import FindCoach from "../pages/FindCoach";
import FindClients from "../pages/FindClients";
import Templates from "../pages/Templates";
import EditTemplate from "../pages/EditTemplate";
import EditTemplateExercise from "../pages/EditTemplateExercise";
import ClientsStats from "../pages/ClientsStats";
import AthleteStats from "../pages/AthleteStats";

import { auth, db } from "../src/config/firebase";
import { doc, getDoc } from "../src/compat/firestore";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Shared stack for both coaches and athletes
const MainStack = ({ isAthlete }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainList"
        component={isAthlete ? AthleteHome : ClientList}
      />
      <Stack.Screen name="ClientDetails" component={ClientDetails} />
      <Stack.Screen name="WorkoutProgram" component={WorkoutProgram} />
      <Stack.Screen name="CreateBlock" component={CreateBlock} />
      <Stack.Screen name="ClientRequests" component={ClientRequests} />
      <Stack.Screen name="AddClient" component={AddClient} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="FindCoach" component={FindCoach} />
      <Stack.Screen name="Templates" component={Templates} />
      <Stack.Screen name="EditTemplate" component={EditTemplate} />
      <Stack.Screen
        name="EditTemplateExercise"
        component={EditTemplateExercise}
      />
      <Stack.Screen name="AthleteStats" component={AthleteStats} />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const [isAthlete, setIsAthlete] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAthlete(userData.role === "athlete");
      }
    };
    checkUserRole();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "flex" },
        tabBarLabelStyle: { display: "none" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={() => <MainStack isAthlete={isAthlete} />}
        options={{
          title: isAthlete ? "My Progress" : "Clients",
          tabBarButton: (props) => (
            <CustomTabBarButton {...props}>
              <FontAwesome
                name={isAthlete ? "home" : "users"}
                size={24}
                color="#000"
              />
            </CustomTabBarButton>
          ),
        }}
      />
      {!isAthlete && (
        <Tab.Screen
          name="Stats"
          component={ClientsStats}
          options={{
            tabBarButton: (props) => (
              <CustomTabBarButton {...props}>
                <FontAwesome name="bar-chart" size={24} color="#000" />
              </CustomTabBarButton>
            ),
          }}
        />
      )}
      {isAthlete ? (
        <Tab.Screen
          name="Analytics"
          component={AthleteStats}
          options={{
            tabBarButton: (props) => (
              <CustomTabBarButton {...props}>
                <FontAwesome name="bar-chart" size={24} color="#000" />
              </CustomTabBarButton>
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="Find Clients"
          component={FindClients}
          options={{
            tabBarButton: (props) => (
              <CustomTabBarButton {...props}>
                <Icon name="search" size={24} color="#000" />
              </CustomTabBarButton>
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Settings"
        component={ClientsSettings}
        options={{
          tabBarButton: (props) => (
            <CustomTabBarButton {...props}>
              <FontAwesome name="cog" size={24} color="#000" />
            </CustomTabBarButton>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
