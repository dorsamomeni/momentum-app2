// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../src/config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
} from "../src/compat/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

const Templates = ({ route }) => {
  const navigation = useNavigation();
  const { selectMode, clientId } = route?.params || {};
  const [templates, setTemplates] = useState([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isDateSelectionModalVisible, setIsDateSelectionModalVisible] =
    useState(false);
  const [templateName, setTemplateName] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tempTemplateName, setTempTemplateName] = useState("");

  // Date selection states
  const today = new Date();
  const endDateDefault = new Date(today);
  endDateDefault.setDate(today.getDate() + 28); // 4 weeks from today

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(endDateDefault);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Fetch templates and clients when component mounts
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch templates created by the coach
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const templatesQuery = query(
        collection(db, "templates"),
        where("coachId", "==", user.uid)
      );
      const querySnapshot = await getDocs(templatesQuery);
      const templatesData = [];
      querySnapshot.forEach((doc) => {
        templatesData.push({ id: doc.id, ...doc.data() });
      });
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching templates:", error);
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new template
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      // Create a new template document (similar to blocks)
      const templateRef = doc(collection(db, "templates"));
      const templateId = templateRef.id;

      const templateData = {
        id: templateId,
        name: templateName.trim(),
        coachId: user.uid,
        daysPerWeek: daysPerWeek,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active", // Status field to match blocks schema
      };

      await setDoc(templateRef, templateData);

      // Create a default week for the template (similar to weeks collection)
      const weekRef = doc(collection(db, "templateWeeks"));
      const weekId = weekRef.id;

      await setDoc(weekRef, {
        id: weekId,
        templateId: templateId,
        weekNumber: 1,
        name: "Week 1", // Include name field for weeks
        createdAt: serverTimestamp(),
      });

      // Create the specified number of days for the week
      for (let i = 1; i <= daysPerWeek; i++) {
        const dayRef = doc(collection(db, "templateDays"));
        const dayId = dayRef.id;

        await setDoc(dayRef, {
          id: dayId,
          weekId: weekId,
          dayNumber: i,
          createdAt: serverTimestamp(),
        });
      }

      // Reset form and close modal
      setTemplateName("");
      setDaysPerWeek(1);
      setIsCreateModalVisible(false);

      // Refresh templates list
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      Alert.alert("Error", "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this template?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);

              // Delete template document
              await deleteDoc(doc(db, "templates", templateId));

              // Delete associated weeks and days
              // Note: In a production app, you'd want to use batch operations or Cloud Functions
              // to ensure all associated data is deleted properly

              // Refresh templates list
              fetchTemplates();
            } catch (error) {
              console.error("Error deleting template:", error);
              Alert.alert("Error", "Failed to delete template");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format date for display with compact spacing between month and year
  const formatDate = (date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    // Return a custom formatted string with tight spacing
    return `${month} ${day}, ${year}`;
  };

  // Show date picker
  const showDatePicker = (type) => {
    if (type === "start") {
      setShowStartDatePicker(true);
      setShowEndDatePicker(false);
    } else {
      setShowEndDatePicker(true);
      setShowStartDatePicker(false);
    }
  };

  // Handle date change
  const handleDateChange = (event, selectedDate, type) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    }

    if (selectedDate) {
      if (type === "start") {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  // Confirm dates and proceed with template selection
  const confirmDatesAndCreateBlock = async () => {
    if (selectedTemplate) {
      try {
        setIsDateSelectionModalVisible(false);
      setIsLoading(true);
        await createBlockFromTemplate(selectedTemplate, startDate, endDate);

        // Add a small delay before navigation to ensure all operations complete
        setTimeout(() => {
          setIsLoading(false);
          // Navigate back without any special parameters
          navigation.goBack();
        }, 500);
      } catch (error) {
        console.error("Error creating block with selected dates:", error);
        Alert.alert(
          "Error",
          "Failed to create block from template with selected dates"
        );
        setIsLoading(false);
      }
    }
  };

  // Create block from template with specified dates
  const createBlockFromTemplate = async (template, startDate, endDate) => {
    if (!clientId) return;

    try {
      // Get the client information
      const clientDoc = await getDoc(doc(db, "users", clientId));
      if (!clientDoc.exists()) {
        throw new Error("Client not found");
      }
      const client = clientDoc.data();

      // Create a new block based on the template
        const blockRef = doc(collection(db, "blocks"));
        const blockId = blockRef.id;

      // Convert dates to proper format for Firestore
      const formattedStartDate = {
        seconds: Math.floor(startDate.getTime() / 1000),
        nanoseconds: 0,
      };

      const formattedEndDate = {
        seconds: Math.floor(endDate.getTime() / 1000),
        nanoseconds: 0,
      };

        await setDoc(blockRef, {
          id: blockId,
        name: template.name,
          coachId: auth.currentUser.uid,
          athleteId: clientId,
          status: "active",
        sessionsPerWeek: template.daysPerWeek || 3,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        fromTemplate: template.id,
        });

        // Update athlete's document to add the block
        await updateDoc(doc(db, "users", clientId), {
          activeBlocks: arrayUnion(blockId),
        });

      // Get the template weeks
      const weeksQuery = query(
        collection(db, "templateWeeks"),
        where("templateId", "==", template.id)
      );
      const weeksSnapshot = await getDocs(weeksQuery);
      const weeksData = weeksSnapshot.docs.map((doc) => doc.data());

      // Filter out deleted weeks
      const filteredWeeks = weeksData.filter((week) => !week.deleted);

      // Create weeks for the new block
      for (const templateWeek of filteredWeeks) {
          const weekRef = doc(collection(db, "weeks"));
          const weekId = weekRef.id;

          await setDoc(weekRef, {
            id: weekId,
            blockId: blockId,
            weekNumber: templateWeek.weekNumber,
          name: templateWeek.name || `Week ${templateWeek.weekNumber}`,
          createdAt: serverTimestamp(),
          });

        // Get days for this template week
          const daysQuery = query(
            collection(db, "templateDays"),
            where("weekId", "==", templateWeek.id)
          );
          const daysSnapshot = await getDocs(daysQuery);
        const daysData = daysSnapshot.docs.map((doc) => doc.data());

        // Filter out deleted days
        const filteredDays = daysData.filter((day) => !day.deleted);

        // Create days for this week
        for (const templateDay of filteredDays) {
            const dayRef = doc(collection(db, "days"));
            const dayId = dayRef.id;

            await setDoc(dayRef, {
              id: dayId,
              weekId: weekId,
              dayNumber: templateDay.dayNumber,
            createdAt: serverTimestamp(),
            });

          // Get exercises for this template day
            const exercisesQuery = query(
              collection(db, "templateExercises"),
              where("dayId", "==", templateDay.id)
            );
            const exercisesSnapshot = await getDocs(exercisesQuery);
          const exercisesData = exercisesSnapshot.docs.map((doc) => doc.data());

          // Filter out deleted exercises
          const filteredExercises = exercisesData.filter(
            (exercise) => !exercise.deleted
          );

          // Create exercises for this day
          for (const templateExercise of filteredExercises) {
              const exerciseRef = doc(collection(db, "exercises"));
            const exerciseId = exerciseRef.id;

              await setDoc(exerciseRef, {
              id: exerciseId,
                dayId: dayId,
                name: templateExercise.name,
                notes: templateExercise.notes || "",
              sets: templateExercise.sets || [],
                order: templateExercise.order || 0,
              createdAt: serverTimestamp(),
              });
            }
          }
        }

      // Don't navigate here - navigation will happen in confirmDatesAndCreateBlock
      // after a short delay to ensure all operations complete
      console.log("Block successfully created from template");
      return blockId; // Return the created block ID
    } catch (error) {
      console.error("Error creating block from template:", error);
      throw error;
    }
  };

  // Add a function to handle template selection for creating a block
  const handleSelectTemplate = async (template) => {
    if (!selectMode || !clientId) return;

    // Store the selected template and show date selection modal
    setSelectedTemplate(template);
    setIsDateSelectionModalVisible(true);
  };

  // Handle renaming a template
  const handleRenameTemplate = (template) => {
    setSelectedTemplate(template);
    setTempTemplateName(template.name);
    setIsRenameModalVisible(true);
  };

  // Save the renamed template
  const saveTemplateName = async () => {
    if (selectedTemplate && tempTemplateName.trim()) {
      try {
        setIsLoading(true);
        // Update in Firestore
        await updateDoc(doc(db, "templates", selectedTemplate.id), {
          name: tempTemplateName.trim(),
          updatedAt: serverTimestamp(),
        });

        // Update in local state
        setTemplates(
          templates.map((template) =>
            template.id === selectedTemplate.id
              ? { ...template, name: tempTemplateName.trim() }
              : template
          )
        );

        setIsRenameModalVisible(false);
      } catch (error) {
        console.error("Error updating template name:", error);
      Alert.alert(
          "Error",
          "Failed to update template name. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle duplicating a template
  const handleDuplicateTemplate = async (templateToDuplicate) => {
    try {
      setIsLoading(true);

      // Get template data
      const templateDoc = await getDoc(
        doc(db, "templates", templateToDuplicate.id)
      );
      if (!templateDoc.exists()) {
        throw new Error("Template not found");
      }

      const originalTemplate = { id: templateDoc.id, ...templateDoc.data() };

      // Create a new template document
      const newTemplateRef = doc(collection(db, "templates"));
      const newTemplateId = newTemplateRef.id;

      // Create template data
      const templateData = {
        id: newTemplateId,
        name: `${originalTemplate.name} (Copy)`,
        coachId: auth.currentUser.uid,
        daysPerWeek: originalTemplate.daysPerWeek || 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active",
      };

      await setDoc(newTemplateRef, templateData);

      // Get all weeks from the original template
      const weeksQuery = query(
        collection(db, "templateWeeks"),
        where("templateId", "==", templateToDuplicate.id)
      );
      const weeksSnapshot = await getDocs(weeksQuery);
      const weeksData = weeksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Create weeks for the new template
      for (const originalWeek of weeksData) {
        if (originalWeek.deleted) continue; // Skip deleted weeks

        // Create new week
        const newWeekRef = doc(collection(db, "templateWeeks"));
        const newWeekId = newWeekRef.id;

        await setDoc(newWeekRef, {
          id: newWeekId,
          templateId: newTemplateId,
          weekNumber: originalWeek.weekNumber,
          name: originalWeek.name || `Week ${originalWeek.weekNumber}`,
          createdAt: serverTimestamp(),
        });

        // Get days for this week
        const daysQuery = query(
          collection(db, "templateDays"),
          where("weekId", "==", originalWeek.id)
        );
        const daysSnapshot = await getDocs(daysQuery);
        const daysData = daysSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Create days for the new week
        for (const originalDay of daysData) {
          if (originalDay.deleted) continue; // Skip deleted days

          // Create new day
          const newDayRef = doc(collection(db, "templateDays"));
          const newDayId = newDayRef.id;

          await setDoc(newDayRef, {
            id: newDayId,
            weekId: newWeekId,
            dayNumber: originalDay.dayNumber,
            createdAt: serverTimestamp(),
          });

          // Get exercises for this day
          const exercisesQuery = query(
            collection(db, "templateExercises"),
            where("dayId", "==", originalDay.id)
          );
          const exercisesSnapshot = await getDocs(exercisesQuery);
          const exercisesData = exercisesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Create exercises for the new day
          for (const originalExercise of exercisesData) {
            if (originalExercise.deleted) continue; // Skip deleted exercises

            // Create new exercise
            const newExerciseRef = doc(collection(db, "templateExercises"));
            const newExerciseId = newExerciseRef.id;

            // Copy all properties except id, dayId, and createdAt
            const exerciseData = { ...originalExercise };
            delete exerciseData.id;
            delete exerciseData.dayId;
            delete exerciseData.createdAt;

            await setDoc(newExerciseRef, {
              id: newExerciseId,
              dayId: newDayId,
              name: originalExercise.name,
              order: originalExercise.order,
              sets: originalExercise.sets || [],
              notes: originalExercise.notes || "",
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      // Refresh templates list
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      Alert.alert("Error", "Failed to duplicate template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update the renderTemplateItem function to add rename and duplicate buttons
  const renderTemplateItem = ({ item }) => (
        <TouchableOpacity
      style={styles.templateCard}
      onPress={() => {
        if (selectMode) {
          handleSelectTemplate(item);
        } else {
            navigation.navigate("EditTemplate", {
              templateId: item.id,
              templateName: item.name,
          });
          }
      }}
        >
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{item.name}</Text>

        {!selectMode && (
          <View style={styles.templateActions}>
        <TouchableOpacity
              style={styles.templateActionButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent the card click from firing
                handleRenameTemplate(item);
              }}
            >
              <Icon name="pencil-outline" size={16} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
              style={styles.templateActionButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent the card click from firing
                handleDuplicateTemplate(item);
              }}
            >
              <Icon name="copy-outline" size={18} color="#000" />
        </TouchableOpacity>
    <TouchableOpacity
              style={styles.templateActionButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent the card click from firing
                handleDeleteTemplate(item.id);
              }}
            >
              <Icon name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
        </View>
        )}
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {selectMode ? "Select a Template" : "Templates"}
        </Text>
      </View>

      {!selectMode && (
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <Text style={styles.createButtonText}>Create New Template</Text>
      </TouchableOpacity>
      )}

      {templates.length > 0 ? (
        <FlatList
          data={templates}
          renderItem={renderTemplateItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.templatesList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You don't have any templates yet. Create one to get started!
          </Text>
        </View>
      )}

      {/* Create Template Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Template</Text>

            <Text style={styles.inputLabel}>Template Name</Text>
            <TextInput
              style={styles.textInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Enter template name"
            />

            <Text style={styles.inputLabel}>Days Per Week</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setDaysPerWeek(Math.max(1, daysPerWeek - 1))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.counterText}>{daysPerWeek}</Text>

              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setDaysPerWeek(Math.min(7, daysPerWeek + 1))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCreateTemplate}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Template Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Template</Text>

            <Text style={styles.inputLabel}>Template Name</Text>
            <TextInput
              style={styles.textInput}
              value={tempTemplateName}
              onChangeText={setTempTemplateName}
              placeholder="Enter template name"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={saveTemplateName}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? "Saving..." : "Save"}
            </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={isDateSelectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDateSelectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Block Duration</Text>

            <View style={styles.dateSection}>
              {/* Start Date */}
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

              {/* End Date */}
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

            {/* Platform-specific date pickers */}
            {Platform.OS === "ios" ? (
              <>
                {showStartDatePicker && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerInnerContainer}>
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) =>
                          handleDateChange(event, date, "start")
                        }
                        style={styles.iosPicker}
                        textColor="#000000"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {showEndDatePicker && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerInnerContainer}>
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) =>
                          handleDateChange(event, date, "end")
                        }
                        style={styles.iosPicker}
                        textColor="#000000"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.datePickerDoneButton}
                      onPress={() => setShowEndDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange(event, date, "start")
                    }
                    textColor="#000000"
                  />
                )}

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                      handleDateChange(event, date, "end")
                    }
                    textColor="#000000"
                  />
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDateSelectionModalVisible(false);
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmDatesAndCreateBlock}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? "Creating..." : "Create Block"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading modal */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>
              Creating block from template...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 40,
    paddingTop: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    marginRight: 20,
  },
  backButtonText: {
    fontSize: 28,
    color: "#000",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
  },
  createButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  templatesList: {
    paddingBottom: 20,
  },
  templateCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  templateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  templateActionButton: {
    padding: 6,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  sessionCount: {
    fontSize: 14,
    color: "#666",
  },
  deleteIconButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
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
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#000",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: "80%",
    maxWidth: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#000",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  counterButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 18,
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  counterText: {
    fontSize: 18,
    fontWeight: "500",
    marginHorizontal: 16,
    color: "#000",
    minWidth: 24,
    textAlign: "center",
  },
  dateSection: {
    marginBottom: 20,
  },
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
  iosPickerContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    marginBottom: 20,
    paddingBottom: 8,
    width: "100%",
    overflow: "hidden",
  },
  iosPickerInnerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 220,
    alignSelf: "center",
    overflow: "hidden",
  },
  iosPicker: {
    height: 200,
    width: 220,
    color: "#000000",
    transform: [{ scaleX: 0.85 }], // More compression to bring year closer
  },
  datePickerDoneButton: {
    alignSelf: "flex-end",
    padding: 10,
    marginRight: 10,
  },
  datePickerDoneText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Templates;
