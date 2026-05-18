// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { db } from "../src/config/firebase";
import { doc, updateDoc } from "../src/compat/firestore";

const EditTemplateExercise = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { exercise, onUpdate } = route.params;

  const [exerciseName, setExerciseName] = useState(exercise.name || "");
  const [notes, setNotes] = useState(exercise.notes || "");
  const [sets, setSets] = useState(exercise.sets || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add a new set
  const handleAddSet = () => {
    const newSet = {
      id: Date.now().toString(),
      reps: "",
      weight: "",
      notes: "",
    };

    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    setHasUnsavedChanges(true);
  };

  // Delete a set
  const handleDeleteSet = (setId) => {
    const updatedSets = sets.filter((set) => set.id !== setId);
    setSets(updatedSets);
    setHasUnsavedChanges(true);
  };

  // Update set data
  const handleUpdateSet = (setId, field, value) => {
    const updatedSets = sets.map((set) =>
      set.id === setId ? { ...set, [field]: value } : set
    );
    setSets(updatedSets);
    setHasUnsavedChanges(true);
  };

  // Update name or notes
  const handleUpdateField = (field, value) => {
    if (field === "name") {
      setExerciseName(value);
    } else if (field === "notes") {
      setNotes(value);
    }
    setHasUnsavedChanges(true);
  };

  // Save exercise changes automatically when leaving the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (hasUnsavedChanges) {
        saveExerciseChanges();
      }
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, exerciseName, notes, sets]);

  // Auto-save changes
  useEffect(() => {
    let timeoutId;

    if (hasUnsavedChanges) {
      timeoutId = setTimeout(() => {
        saveExerciseChanges();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [exerciseName, notes, sets, hasUnsavedChanges]);

  // Save exercise changes
  const saveExerciseChanges = async () => {
    if (!exerciseName.trim()) {
      Alert.alert("Error", "Exercise name cannot be empty");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare updated exercise data
      const updatedExercise = {
        ...exercise,
        name: exerciseName.trim(),
        notes: notes.trim(),
        sets: sets,
      };

      // Update in Firestore
      await updateDoc(doc(db, "templateExercises", exercise.id), {
        name: exerciseName.trim(),
        notes: notes.trim(),
        sets: sets,
      });

      // Call the onUpdate callback to update the parent component's state
      if (onUpdate) {
        onUpdate(updatedExercise);
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error updating exercise:", error);
      Alert.alert("Error", "Failed to update exercise");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Exercise</Text>
          {isSaving && <Text style={styles.savingText}>Saving...</Text>}
        </View>

        <ScrollView style={styles.contentContainer}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Exercise Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={exerciseName}
                onChangeText={(value) => handleUpdateField("name", value)}
                placeholder="Exercise name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={(value) => handleUpdateField("notes", value)}
                placeholder="Add notes (optional)"
                multiline
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.setsHeader}>
              <Text style={styles.sectionTitle}>Sets</Text>
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={handleAddSet}
              >
                <Icon name="add-circle-outline" size={20} color="#000" />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </View>

            {sets.length > 0 ? (
              <View style={styles.setsContainer}>
                <View style={styles.setHeaderRow}>
                  <Text style={[styles.setHeaderCell, { flex: 0.5 }]}>Set</Text>
                  <Text style={styles.setHeaderCell}>Reps</Text>
                  <Text style={styles.setHeaderCell}>Weight</Text>
                  <Text style={[styles.setHeaderCell, { flex: 1.5 }]}>
                    Notes
                  </Text>
                  <Text style={[styles.setHeaderCell, { flex: 0.5 }]}></Text>
                </View>

                {sets.map((set, index) => (
                  <View key={set.id} style={styles.setRow}>
                    <View style={[styles.setCell, { flex: 0.5 }]}>
                      <Text style={styles.setCellText}>{index + 1}</Text>
                    </View>

                    <View style={styles.setCell}>
                      <TextInput
                        style={styles.setCellInput}
                        value={set.reps}
                        onChangeText={(value) =>
                          handleUpdateSet(set.id, "reps", value)
                        }
                        placeholder="--"
                        keyboardType="default"
                      />
                    </View>

                    <View style={styles.setCell}>
                      <TextInput
                        style={styles.setCellInput}
                        value={set.weight}
                        onChangeText={(value) =>
                          handleUpdateSet(set.id, "weight", value)
                        }
                        placeholder="--"
                        keyboardType="default"
                      />
                    </View>

                    <View style={[styles.setCell, { flex: 1.5 }]}>
                      <TextInput
                        style={styles.setCellInput}
                        value={set.notes}
                        onChangeText={(value) =>
                          handleUpdateSet(set.id, "notes", value)
                        }
                        placeholder="e.g. RPE 8"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.setCell, { flex: 0.5 }]}
                      onPress={() => handleDeleteSet(set.id)}
                    >
                      <Icon name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptySets}>
                <Text style={styles.emptySetsText}>
                  No sets added yet. Click "Add Set" to add one.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: "space-between",
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
    flex: 1,
  },
  savingText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  contentContainer: {
    flex: 1,
  },
  formSection: {
    marginBottom: 30,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#000",
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addSetText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  setsContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  setHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f0f0f0",
  },
  setHeaderCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  setCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  setCellText: {
    fontSize: 16,
    color: "#000",
  },
  setCellInput: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 16,
    textAlign: "center",
  },
  emptySets: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  emptySetsText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
});

export default EditTemplateExercise;
