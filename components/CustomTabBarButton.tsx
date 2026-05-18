// @ts-nocheck
import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";

const CustomTabBarButton = ({ children, onPress }) => (
  <TouchableOpacity style={styles.tabButton} onPress={onPress}>
    {children}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginHorizontal: 5,
  },
});

export default CustomTabBarButton;
