// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  SafeAreaView,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";

const CreateBlock = ({ route }) => {
  const navigation = useNavigation();
  const { client, onCreateBlock } = route.params;
  const [blockName, setBlockName] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);

  // Date state
  const today = new Date();
  const endDateDefault = new Date(today);
  endDateDefault.setDate(today.getDate() + 28); // 4 weeks from today

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(endDateDefault);

  // Temporary date state (for selection before confirmation)
  const [tempStartDate, setTempStartDate] = useState(today);
  const [tempEndDate, setTempEndDate] = useState(endDateDefault);

  // Date picker state for iOS
  const [showIOSStartPicker, setShowIOSStartPicker] = useState(false);
  const [showIOSEndPicker, setShowIOSEndPicker] = useState(false);

  // Date picker state for Android
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("start");

  const decrementSessions = () => {
    if (sessionsPerWeek > 1) {
      setSessionsPerWeek(sessionsPerWeek - 1);
    }
  };

  const incrementSessions = () => {
    if (sessionsPerWeek < 7) {
      setSessionsPerWeek(sessionsPerWeek + 1);
    }
  };

  // Show date picker based on platform
  const showDatePicker = (mode) => {
    Keyboard.dismiss(); // Dismiss keyboard when showing date picker
    if (Platform.OS === "ios") {
      if (mode === "start") {
        setTempStartDate(startDate);
        setShowIOSStartPicker(true);
      } else {
        setTempEndDate(endDate);
        setShowIOSEndPicker(true);
      }
    } else {
      setPickerMode(mode);
      setShowAndroidPicker(true);
    }
  };

  // Handle temporary date changes (iOS)
  const onTempDateChange = (event, selectedDate) => {
    if (selectedDate) {
      if (showIOSStartPicker) {
        setTempStartDate(selectedDate);
      } else {
        setTempEndDate(selectedDate);
      }
    }
  };

  // Confirm date selection (iOS)
  const confirmStartDate = () => {
    setStartDate(tempStartDate);
    setShowIOSStartPicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(tempEndDate);
    setShowIOSEndPicker(false);
  };

  // Handle date changes (Android)
  const onAndroidDateChange = (event, selectedDate) => {
    setShowAndroidPicker(false);
    if (event.type === "dismissed" || !selectedDate) return;

    if (pickerMode === "start") {
      setStartDate(selectedDate);
    } else {
      setEndDate(selectedDate);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle block creation
  const handleCreateBlock = () => {
    if (blockName && sessionsPerWeek) {
      onCreateBlock(blockName, sessionsPerWeek, startDate, endDate);
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create New Block</Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Block Name</Text>
              <TextInput
                style={styles.input}
                value={blockName}
                onChangeText={setBlockName}
                placeholder="Enter block name"
                placeholderTextColor="#666"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sessions per Week</Text>
              <View style={styles.sessionsSelector}>
                <Pressable
                  style={[
                    styles.sessionControl,
                    sessionsPerWeek === 1 && styles.sessionControlDisabled,
                  ]}
                  onPress={decrementSessions}
                  disabled={sessionsPerWeek === 1}
                >
                  <Icon
                    name="remove"
                    size={24}
                    color={sessionsPerWeek === 1 ? "#ccc" : "#000"}
                  />
                </Pressable>

                <View style={styles.sessionDisplay}>
                  <Text style={styles.sessionNumber}>{sessionsPerWeek}</Text>
                  <Text style={styles.sessionLabel}>sessions</Text>
                </View>

                <Pressable
                  style={[
                    styles.sessionControl,
                    sessionsPerWeek === 7 && styles.sessionControlDisabled,
                  ]}
                  onPress={incrementSessions}
                  disabled={sessionsPerWeek === 7}
                >
                  <Icon
                    name="add"
                    size={24}
                    color={sessionsPerWeek === 7 ? "#ccc" : "#000"}
                  />
                </Pressable>
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Block Duration</Text>

              {/* Start Date Button */}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePicker("start")}
                >
                  <Text style={styles.dateButtonText}>
                    {formatDate(startDate)}
                  </Text>
                  <Icon name="calendar-outline" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              {/* End Date Button */}
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => showDatePicker("end")}
                >
                  <Text style={styles.dateButtonText}>
                    {formatDate(endDate)}
                  </Text>
                  <Icon name="calendar-outline" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Button - Now part of the main form */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!blockName || !sessionsPerWeek) && styles.disabledButton,
              ]}
              onPress={handleCreateBlock}
              disabled={!blockName || !sessionsPerWeek}
            >
              <Text style={styles.createButtonText}>Create Block</Text>
            </TouchableOpacity>

            {/* Use a Template Button */}
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() =>
                navigation.navigate("Templates", {
                  selectMode: true,
                  clientId: client.id,
                })
              }
            >
              <Text style={styles.templateButtonText}>Use a Template</Text>
            </TouchableOpacity>

            {/* Extra space at bottom to ensure button is visible with keyboard */}
            <View style={styles.keyboardSpace} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* iOS Start Date Picker Modal */}
      {Platform.OS === "ios" && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showIOSStartPicker}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  style={styles.pickerHeaderButton}
                  onPress={() => setShowIOSStartPicker(false)}
                >
                  <Text style={styles.pickerCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>Select Start Date</Text>

                <TouchableOpacity
                  style={styles.pickerHeaderButton}
                  onPress={confirmStartDate}
                >
                  <Text style={styles.pickerDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="spinner"
                  onChange={onTempDateChange}
                  textColor="black"
                  themeVariant="light"
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* iOS End Date Picker Modal */}
      {Platform.OS === "ios" && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showIOSEndPicker}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  style={styles.pickerHeaderButton}
                  onPress={() => setShowIOSEndPicker(false)}
                >
                  <Text style={styles.pickerCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.pickerTitle}>Select End Date</Text>

                <TouchableOpacity
                  style={styles.pickerHeaderButton}
                  onPress={confirmEndDate}
                >
                  <Text style={styles.pickerDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display="spinner"
                  onChange={onTempDateChange}
                  textColor="black"
                  themeVariant="light"
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Android Date Picker */}
      {Platform.OS === "android" && showAndroidPicker && (
        <DateTimePicker
          value={pickerMode === "start" ? startDate : endDate}
          mode="date"
          display="default"
          onChange={onAndroidDateChange}
          minimumDate={null}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
    paddingTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 24,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#000",
  },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: "#000",
  },
  sessionsSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
  },
  sessionControl: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#fff",
  },
  sessionControlDisabled: {
    backgroundColor: "#f8f8f8",
  },
  sessionDisplay: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  sessionNumber: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  sessionLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  // Date selection styles
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  dateLabel: {
    fontSize: 16,
    width: 100,
    color: "#333",
  },
  dateButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  createButton: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  keyboardSpace: {
    height: 100, 
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingBottom: 20,
    width: "100%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  pickerHeaderButton: {
    padding: 8,
    minWidth: 60,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  pickerDoneButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    textAlign: "right",
  },
  pickerCancelButtonText: {
    fontSize: 16,
    color: "#666",
    textAlign: "left",
  },
  datePickerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  iosPicker: {
    width: "100%",
    height: 220,
    fontSize: 20,
    fontWeight: "bold",
  },
  templateButton: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
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
  templateButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CreateBlock;
