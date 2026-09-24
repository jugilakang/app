import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { Redirect, Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ActivityIndicator, Platform, View } from "react-native";

import { useAuth } from "@/src/auth";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

export default function WorkerLayout() {
  const { colors } = useTheme();
  const { session, ready } = useAuth();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }
  if (!session) return <Redirect href="/login" />;
  if (session.role !== "worker") return <Redirect href="/(admin)" />;

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Beranda</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="absensi">
          <NativeTabs.Trigger.Icon sf="calendar" />
          <NativeTabs.Trigger.Label>Absensi</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="gaji">
          <NativeTabs.Trigger.Icon sf="banknote.fill" />
          <NativeTabs.Trigger.Label>Gaji</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="absensi" options={{ title: "Absensi", tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="calendar-month-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="gaji" options={{ title: "Gaji", tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="wallet-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
