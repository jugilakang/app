import { Platform } from "react-native";

// NativeTabs hanya untuk iOS 26+ (Liquid Glass). iOS lama, Android & web pakai Tabs JS.
export const usesNativeTabs = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
