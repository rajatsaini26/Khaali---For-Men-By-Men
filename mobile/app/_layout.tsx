import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, useApp } from '../src/context/AppContext';
import { VersionGate } from '../src/components/VersionGate';
import '../src/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30000 },
    mutations: { retry: 0 },
  },
});

function RootLayoutNav() {
  const { state } = useApp();

  useEffect(() => {
    if (state.isLoading) return;
    if (state.isOnboarded) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/onboarding/founder-letter');
    }
  }, [state.isLoading, state.isOnboarded]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding/founder-letter" />
      <Stack.Screen name="onboarding/anonymous-setup" />
      <Stack.Screen name="onboarding/one-rule" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <StatusBar style="light" />
          <VersionGate>
            <RootLayoutNav />
          </VersionGate>
        </AppProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
