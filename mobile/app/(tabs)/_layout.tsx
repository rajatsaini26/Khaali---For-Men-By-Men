import { Tabs } from 'expo-router';
import { colors, typography } from '../../src/theme';

// Tab bar icons as text — no icon library dependency for now
const icons: Record<string, string> = {
  home: '◈',
  write: '✦',
  sea: '〰',
  checkin: '◉',
  settings: '⊕',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0E0E18',
          borderTopColor: '#1E1E2E',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: typography.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={icons.home} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Write',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={icons.write} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sea"
        options={{
          title: 'The Sea',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={icons.sea} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={icons.checkin} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={icons.settings} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}
