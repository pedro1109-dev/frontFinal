import AsyncStorage from '@react-native-async-storage/async-storage';

export async function pegarUsuario() {
  const usuario = await AsyncStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

const TOKEN_KEY = '@token';

export async function salvarToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function pegarToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function removerToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}