import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "@/src/auth";
import { makeStyles, useTheme } from "@/src/theme";

export default function Gate() {
  const { session, ready } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();

  if (!ready) {
    return (
      <View style={styles.root} testID="app-loading">
        <Text style={styles.brand}>TukangGaji <Text style={{ color: colors.brandPrimary }}>PRO</Text></Text>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  return <Redirect href={session.role === "admin" ? "/(admin)" : "/(worker)"} />;
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 16 },
  brand: { color: colors.onSurface, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
}));
