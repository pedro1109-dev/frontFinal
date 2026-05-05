import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import CustomInput from '../../components/ui/CustomInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { apiFetch } from '../../services/api';
import { theme } from '../../constants/theme';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviarRecuperacao() {
    if (carregando) return;

    if (!email.trim()) {
      Alert.alert('Digite seu email.');
      return;
    }

    try {
      setCarregando(true);

      const resposta = await apiFetch('/recuperar-senha', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      Alert.alert(resposta?.msg || 'Se o e-mail existir, um link foi enviado.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.log('ERRO RECUPERAR SENHA:', error);

      Alert.alert(
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Erro ao recuperar senha.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[
          theme.colors.backgroundTop,
          theme.colors.backgroundMid,
          theme.colors.backgroundBottom,
        ]}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={theme.colors.accentStrong} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.topArea}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.brandText}>
              <Text style={styles.brandWhite}>Eco</Text>
              <Text style={styles.brandGreen}>Control</Text>
            </Text>

            <View style={styles.brandGlowLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Recuperar senha</Text>
            <View style={styles.titleUnderline} />

            <Text style={styles.description}>
              Digite seu email cadastrado. Vamos enviar um link/código para você
              redefinir sua senha.
            </Text>

            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Digite seu email"
              icon="mail"
            />
          </View>

          <PrimaryButton
            title={carregando ? 'Enviando...' : 'Enviar recuperação'}
            onPress={enviarRecuperacao}
          />

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Lembrou a senha? Voltar ao login</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  backButton: {
    position: 'absolute',
    top: 25,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },

  backText: {
    color: theme.colors.accentStrong,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },

  topArea: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logo: {
    width: 110,
    height: 110,
    transform: [{ translateY: 20 }],
  },

  brandText: {
    fontSize: 30,
    fontWeight: '900',
  },

  brandWhite: { color: theme.colors.brandWhite },
  brandGreen: { color: theme.colors.brandGreen },

  brandGlowLine: {
    width: 140,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(90,255,120,0.25)',
    marginTop: 6,
  },

  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 24,
    marginTop: 10,
  },

  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },

  titleUnderline: {
    width: 100,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    marginBottom: 20,
    marginTop: 6,
  },

  description: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },

  loginLink: {
    color: theme.colors.accentStrong,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
  },
});