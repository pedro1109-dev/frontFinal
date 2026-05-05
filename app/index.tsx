import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  useEffect(() => {
    async function verificarLogin() {
      const usuario = await AsyncStorage.getItem('usuario');
      const usuarioId = await AsyncStorage.getItem('usuario_id');

      if (usuario && usuarioId) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }

    verificarLogin();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#031F1A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color="#7AF46C" />
    </View>
  );
}