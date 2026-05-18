// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const ExerciseItem = ({
  exercise,
  index,
  weekIndex,
  dayIndex,
  onEdit,
  onDelete,
  isTemplate = false,
}) => {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.exerciseActions}>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => (onEdit ? onEdit(exercise) : null)}
          >
            <Icon name="create-outline" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() =>
              onDelete ? onDelete(exercise.id, exercise.dayId) : null
            }
          >
            <Icon name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.exerciseDetails}>
        <Text style={styles.setsText}>{exercise.sets?.length || 0} sets</Text>
        {exercise.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            {exercise.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    marginLeft: 12,
    padding: 4,
  },
  exerciseDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setsText: {
    fontSize: 14,
    color: "#666",
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    maxWidth: "70%",
  },
});

export default ExerciseItem;
