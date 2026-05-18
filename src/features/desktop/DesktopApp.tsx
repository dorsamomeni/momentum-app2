import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react-native";

type Client = {
  id: string;
  name: string;
  handle: string;
  lift: string;
  status: "Active" | "Needs review" | "Draft";
  nextSession: string;
  progress: number;
};

type Exercise = {
  id: string;
  movement: string;
  prescription: string;
  intensity: string;
  notes: string;
};

const clients: Client[] = [
  {
    id: "1",
    name: "Ava Mitchell",
    handle: "@avam",
    lift: "Squat peak",
    status: "Active",
    nextSession: "Today",
    progress: 84,
  },
  {
    id: "2",
    name: "Noah Patel",
    handle: "@npatel",
    lift: "Bench volume",
    status: "Needs review",
    nextSession: "Tomorrow",
    progress: 62,
  },
  {
    id: "3",
    name: "Maya Chen",
    handle: "@mayac",
    lift: "Deadlift reset",
    status: "Draft",
    nextSession: "Fri",
    progress: 41,
  },
];

const weekPlan: Exercise[] = [
  {
    id: "1",
    movement: "Competition squat",
    prescription: "4 x 3",
    intensity: "RPE 7.5",
    notes: "Pause first rep",
  },
  {
    id: "2",
    movement: "Bench press",
    prescription: "5 x 4",
    intensity: "72.5%",
    notes: "Even tempo",
  },
  {
    id: "3",
    movement: "Romanian deadlift",
    prescription: "3 x 8",
    intensity: "RPE 6",
    notes: "Controlled eccentric",
  },
  {
    id: "4",
    movement: "Split squat",
    prescription: "3 x 10",
    intensity: "Moderate",
    notes: "Left side first",
  },
];

const templates = ["Novice meet prep", "Bench specialization", "Hypertrophy base"];
const analytics = [64, 70, 68, 78, 82, 88, 91, 96];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Clients", icon: Users },
  { label: "Programs", icon: ClipboardList },
  { label: "Calendar", icon: CalendarDays },
  { label: "Analytics", icon: BarChart3 },
];

const statusColor: Record<Client["status"], string> = {
  Active: "#16a34a",
  "Needs review": "#c2410c",
  Draft: "#475569",
};

function StatTile({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Icon size={18} color="#111827" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statDelta}>{delta}</Text>
    </View>
  );
}

function DesktopApp() {
  const [selectedClientId, setSelectedClientId] = useState(clients[0].id);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0],
    [selectedClientId],
  );

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Dumbbell size={22} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.brandName}>Momentum</Text>
            <Text style={styles.brandMeta}>Coach Studio</Text>
          </View>
        </View>

        <View style={styles.nav}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;
            return (
              <Pressable
                key={item.label}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <Icon size={18} color={active ? "#0f172a" : "#64748b"} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.planBox}>
          <Sparkles size={18} color="#0f766e" />
          <Text style={styles.planTitle}>Pro workspace</Text>
          <Text style={styles.planCopy}>Client programming, templates, analytics.</Text>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.kicker}>Coach dashboard</Text>
            <Text style={styles.pageTitle}>Program faster, review smarter.</Text>
          </View>
          <View style={styles.topbarActions}>
            <View style={styles.searchBox}>
              <Search size={17} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients, templates, lifts"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <Pressable style={styles.iconButton}>
              <Bell size={18} color="#334155" />
            </Pressable>
            <Pressable style={styles.primaryButton}>
              <Plus size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>New block</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.workspace}
          contentContainerStyle={styles.workspaceContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statGrid}>
            <StatTile label="Active clients" value="18" delta="+3 this month" icon={Users} />
            <StatTile label="Blocks in progress" value="27" delta="6 need review" icon={ClipboardList} />
            <StatTile label="Program adherence" value="91%" delta="+7% last 30 days" icon={BarChart3} />
            <StatTile label="Sessions this week" value="142" delta="22 logged today" icon={CalendarDays} />
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.leftColumn}>
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={styles.panelTitle}>Client roster</Text>
                    <Text style={styles.panelSubtle}>Review, assign, and update athletes.</Text>
                  </View>
                  <Pressable style={styles.secondaryButton}>
                    <Users size={16} color="#0f172a" />
                    <Text style={styles.secondaryButtonText}>Add client</Text>
                  </Pressable>
                </View>

                <View style={styles.clientList}>
                  {clients.map((client) => {
                    const active = selectedClient.id === client.id;
                    return (
                      <Pressable
                        key={client.id}
                        onPress={() => setSelectedClientId(client.id)}
                        style={[styles.clientRow, active && styles.clientRowActive]}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{client.name.slice(0, 1)}</Text>
                        </View>
                        <View style={styles.clientBody}>
                          <Text style={styles.clientName}>{client.name}</Text>
                          <Text style={styles.clientMeta}>
                            {client.handle} / {client.lift}
                          </Text>
                        </View>
                        <View style={styles.clientRight}>
                          <Text style={[styles.statusPill, { color: statusColor[client.status] }]}>
                            {client.status}
                          </Text>
                          <Text style={styles.nextSession}>{client.nextSession}</Text>
                        </View>
                        <ChevronRight size={18} color="#94a3b8" />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={styles.panelTitle}>{selectedClient.name} / Week 4</Text>
                    <Text style={styles.panelSubtle}>Competition squat emphasis.</Text>
                  </View>
                  <Pressable style={styles.primaryButtonCompact}>
                    <Text style={styles.primaryButtonText}>Publish</Text>
                  </Pressable>
                </View>

                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    <Text style={[styles.tableCell, styles.tableHeadText, styles.exerciseCell]}>Exercise</Text>
                    <Text style={[styles.tableCell, styles.tableHeadText]}>Sets</Text>
                    <Text style={[styles.tableCell, styles.tableHeadText]}>Load</Text>
                    <Text style={[styles.tableCell, styles.tableHeadText, styles.notesCell]}>Coach note</Text>
                  </View>
                  {weekPlan.map((exercise) => (
                    <View key={exercise.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.exerciseCell]}>{exercise.movement}</Text>
                      <Text style={styles.tableCell}>{exercise.prescription}</Text>
                      <Text style={styles.tableCell}>{exercise.intensity}</Text>
                      <Text style={[styles.tableCell, styles.notesCell]}>{exercise.notes}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.rightColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Readiness trend</Text>
                <Text style={styles.panelSubtle}>Last 8 check-ins</Text>
                <View style={styles.chart}>
                  {analytics.map((value, index) => (
                    <View key={index} style={styles.chartBarWrap}>
                      <View style={[styles.chartBar, { height: `${value}%` }]} />
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Template library</Text>
                <Text style={styles.panelSubtle}>Reusable blocks for repeatable work.</Text>
                <View style={styles.templateList}>
                  {templates.map((template) => (
                    <Pressable key={template} style={styles.templateRow}>
                      <View style={styles.templateIcon}>
                        <ClipboardList size={16} color="#0f172a" />
                      </View>
                      <Text style={styles.templateName}>{template}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.panelDark}>
                <Settings size={18} color="#cbd5e1" />
                <Text style={styles.darkTitle}>Workspace sync</Text>
                <Text style={styles.darkCopy}>
                  Client data, program history, and billing state stay connected.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 760,
    backgroundColor: "#f6f7f9",
    flexDirection: "row",
  },
  sidebar: {
    width: 284,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    padding: 24,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
  },
  brandMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  nav: {
    gap: 8,
    marginTop: 40,
    flex: 1,
  },
  navItem: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navItemActive: {
    backgroundColor: "#eef2ff",
  },
  navLabel: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#0f172a",
  },
  planBox: {
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 16,
    gap: 8,
  },
  planTitle: {
    fontWeight: "800",
    color: "#064e3b",
    fontSize: 14,
  },
  planCopy: {
    color: "#0f766e",
    lineHeight: 19,
    fontSize: 13,
  },
  main: {
    flex: 1,
  },
  topbar: {
    minHeight: 112,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 32,
    paddingVertical: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },
  kicker: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
  },
  pageTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  topbarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    width: 360,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonCompact: {
    height: 38,
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13,
  },
  workspace: {
    flex: 1,
  },
  workspaceContent: {
    padding: 32,
    gap: 24,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statTile: {
    flex: 1,
    minWidth: 180,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 18,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  statValue: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 28,
  },
  statLabel: {
    color: "#64748b",
    marginTop: 5,
    fontWeight: "600",
  },
  statDelta: {
    color: "#0f766e",
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  contentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1.75,
    gap: 24,
    minWidth: 560,
  },
  rightColumn: {
    flex: 1,
    gap: 24,
    minWidth: 320,
  },
  panel: {
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  panelSubtle: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },
  clientList: {
    gap: 10,
  },
  clientRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eef2f7",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientRowActive: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#1e3a8a",
    fontWeight: "900",
  },
  clientBody: {
    flex: 1,
  },
  clientName: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
  },
  clientMeta: {
    color: "#64748b",
    marginTop: 3,
    fontSize: 13,
  },
  clientRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusPill: {
    fontSize: 12,
    fontWeight: "800",
  },
  nextSession: {
    color: "#64748b",
    fontSize: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    alignItems: "center",
  },
  tableHead: {
    backgroundColor: "#f8fafc",
    borderTopWidth: 0,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 14,
    color: "#334155",
    fontSize: 14,
  },
  tableHeadText: {
    color: "#64748b",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
  },
  exerciseCell: {
    flex: 1.5,
    color: "#0f172a",
    fontWeight: "700",
  },
  notesCell: {
    flex: 1.4,
  },
  chart: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 24,
  },
  chartBarWrap: {
    flex: 1,
    height: "100%",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    backgroundColor: "#2563eb",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  templateList: {
    gap: 10,
    marginTop: 16,
  },
  templateRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eef2f7",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  templateIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  templateName: {
    color: "#0f172a",
    fontWeight: "700",
  },
  panelDark: {
    borderRadius: 8,
    backgroundColor: "#111827",
    padding: 18,
    gap: 10,
  },
  darkTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  darkCopy: {
    color: "#cbd5e1",
    lineHeight: 20,
    fontSize: 13,
  },
});

export default DesktopApp;
