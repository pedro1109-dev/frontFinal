import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import CustomInput from '../../components/ui/CustomInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { theme } from '../../constants/theme';
import { apiFetch,BASE_URL, API_ROUTES } from '../../services/api';


export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [erroEmail, setErroEmail] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  async function salvarUsuarioGoogle(url: string) {
    try {
      const parsedUrl = new URL(url);

      const id = parsedUrl.searchParams.get('id');
      const nome = parsedUrl.searchParams.get('nome');
      const emailGoogle = parsedUrl.searchParams.get('email');

      if (!id || !nome || !emailGoogle) return;

      const usuarioGoogle = {
        id,
        nome,
        email: emailGoogle,
      };

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioGoogle));
      await AsyncStorage.setItem('usuario_id', String(id));

      router.replace('/(tabs)/home');
    } catch (error) {
      console.log('Erro ao salvar login Google:', error);
    }
  }

  useEffect(() => {
    if (Platform.OS === 'web') {
      Linking.getInitialURL().then((url) => {
        if (url) salvarUsuarioGoogle(url);
      });
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      salvarUsuarioGoogle(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) salvarUsuarioGoogle(url);
    });

    return () => subscription.remove();
  }, []);

  const entrarComGoogle = async () => {
  try {
    await Linking.openURL(
      `${BASE_URL}${API_ROUTES.GOOGLE.LOGIN}`
    );
  } catch (error) {
    Alert.alert('Erro', 'Erro ao abrir login com Google.');
  }
};  

  const entrar = async () => {
    if (carregando) return;

    setErroEmail('');
    setErroSenha('');
    setErroLogin('');

    if (!email.trim()) {
      setErroEmail('Informe seu email.');
      return;
    }

    if (!senha.trim()) {
      setErroSenha('Informe sua senha.');
      return;
    }

    try {
      setCarregando(true);

      const usuarioLogado = await apiFetch(API_ROUTES.LOGIN, {
  method: 'POST',
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    senha,
  }),
});

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioLogado));
      await AsyncStorage.setItem('usuario_id', String(usuarioLogado.id));

      router.replace('/(tabs)/home');
    } catch (error: any) {
      setErroLogin(
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Email ou senha incorretos.'
      );
    } finally {
      setCarregando(false);
    }
  };

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
            <Text style={styles.title}>Login</Text>
            <View style={styles.titleUnderline} />

            <CustomInput
              label="Email"
              value={email}
              onChangeText={(texto: string) => {
                setEmail(texto);
                setErroEmail('');
                setErroLogin('');
              }}
              placeholder="Digite seu email"
              icon="mail"
            />

            {erroEmail !== '' && <Text style={styles.erroTexto}>{erroEmail}</Text>}

            <CustomInput
              label="Senha"
              value={senha}
              onChangeText={(texto: string) => {
                setSenha(texto);
                setErroSenha('');
                setErroLogin('');
              }}
              placeholder="Digite sua senha"
              secureTextEntry
              icon="lock"
              isPassword
            />

            {erroSenha !== '' && <Text style={styles.erroTexto}>{erroSenha}</Text>}

            <TouchableOpacity onPress={() => router.push('/(auth)/recuperar-senha')}>
              <Text style={styles.forgotPassword}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/cadastro')}>
              <Text style={styles.link}>
                Não possui cadastro?{' '}
                <Text style={styles.linkHighlight}>Clique aqui</Text>
              </Text>
            </TouchableOpacity>

            {erroLogin !== '' && <Text style={styles.erroBox}>{erroLogin}</Text>}
          </View>

          <PrimaryButton
            title={carregando ? 'Entrando...' : 'Entrar'}
            onPress={entrar}
          />

          <View style={styles.dividerArea}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={entrarComGoogle}>
            <Image
              source={require('../../assets/images/google.png')}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Continuar com o Google</Text>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },

  topArea: {
    alignItems: 'center',
    marginBottom: 10,
  },

  logo: {
    width: 105,
    height: 105,
    transform: [{ translateY: 0 }],
  },

  brandText: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: -20,
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
    fontSize: 32,
    fontWeight: '900',
  },

  titleUnderline: {
    width: 90,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    marginBottom: 20,
    marginTop: 6,
  },

  erroTexto: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -4,
    marginBottom: 8,
  },

  erroBox: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },

  link: {
    color: theme.colors.textSoft,
    fontSize: 13,
    marginTop: -26,
  },

  linkHighlight: {
    color: theme.colors.accentStrong,
    fontWeight: '600',
  },

  forgotPassword: {
    color: theme.colors.accentStrong,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: -9,
  },

  dividerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  dividerText: {
    color: theme.colors.textSoft,
    marginHorizontal: 12,
    fontWeight: '700',
  },

  googleButton: {
    height: 52,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },

  googleIcon: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
    marginRight: -10,
  },

  googleButtonText: {
    color: '#3C4043',
    fontSize: 15,
    fontWeight: '500',
  },
});