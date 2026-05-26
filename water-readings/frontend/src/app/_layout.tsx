import React from 'react';
import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaView, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';

export default function Layout() {
  const { theme } = useStore();

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
});
