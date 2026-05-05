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

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [erroNome, setErroNome] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [erroConfirmarSenha, setErroConfirmarSenha] = useState('');
  const [erroCadastro, setErroCadastro] = useState('');

  const emailLimpo = email.trim().toLowerCase();

  const emailEhGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(emailLimpo);

  const senhaTemMinimo = senha.length >= 8;
  const senhaTemMaiuscula = /[A-Z]/.test(senha);
  const senhaTemMinuscula = /[a-z]/.test(senha);
  const senhaTemNumero = /\d/.test(senha);
  const senhaTemSimbolo = /[@$!%*?&.#_-]/.test(senha);

  const senhaForte =
    senhaTemMinimo &&
    senhaTemMaiuscula &&
    senhaTemMinuscula &&
    senhaTemNumero &&
    senhaTemSimbolo;

  function limparErros() {
    setErroNome('');
    setErroEmail('');
    setErroSenha('');
    setErroConfirmarSenha('');
    setErroCadastro('');
  }

  function validarCampos() {
    let valido = true;

    limparErros();

    if (!nome.trim()) {
      setErroNome('Informe seu nome para continuar.');
      valido = false;
    }

    if (!emailLimpo) {
      setErroEmail('Informe seu email para continuar.');
      valido = false;
    } else if (!emailEhGmail) {
      setErroEmail('Use um email válido com final @gmail.com. Exemplo: seunome@gmail.com');
      valido = false;
    }

    if (!senha) {
      setErroSenha('Informe uma senha para continuar.');
      valido = false;
    } else if (!senhaForte) {
      setErroSenha(
        'Senha fraca: use no mínimo 8 caracteres, letra maiúscula, minúscula, número e símbolo.'
      );
      valido = false;
    }

    if (!confirmarSenha) {
      setErroConfirmarSenha('Confirme sua senha para continuar.');
      valido = false;
    } else if (senha !== confirmarSenha) {
      setErroConfirmarSenha('As senhas não coincidem.');
      valido = false;
    }

    return valido;
  }

  async function salvarUsuarioGoogle(url: string) {
    try {
      const parsedUrl = new URL(url);
      const id = parsedUrl.searchParams.get('id');
      const nomeGoogle = parsedUrl.searchParams.get('nome');
      const emailGoogle = parsedUrl.searchParams.get('email');

      if (!id || !nomeGoogle || !emailGoogle) return;

      const usuarioGoogle = {
        id,
        nome: nomeGoogle,
        email: emailGoogle,
      };

      await AsyncStorage.setItem('usuario', JSON.stringify(usuarioGoogle));
      await AsyncStorage.setItem('usuario_id', String(id));

      router.replace('/(tabs)/home');
    } catch (error) {
      console.log('Erro ao salvar cadastro Google:', error);
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

  const continuarComGoogle = async () => {
  try {
    await Linking.openURL(
      `${BASE_URL}${API_ROUTES.GOOGLE.LOGIN}`
    );
  } catch (error) {
    Alert.alert('Erro', 'Erro ao abrir cadastro com Google.');
  }
};

  const handleCadastro = async () => {
    const camposValidos = validarCampos();

    if (!camposValidos) return;

    try {
      await apiFetch(API_ROUTES.USUARIO.REGISTRAR, {
        method: 'POST',
        body: JSON.stringify({
          nome,
          email: emailLimpo,
          senha,
        }),
      });

      Alert.alert('Sucesso ✅', 'Cadastro realizado com sucesso!');
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.log('ERRO CADASTRO:', error);

      const mensagem =
        error?.data?.detail ||
        error?.data?.message ||
        error?.message ||
        'Erro ao cadastrar usuário.';

      setErroCadastro(
        typeof mensagem === 'string' ? mensagem : JSON.stringify(mensagem)
      );
    }
  };

  const RegraSenha = ({
    ativo,
    texto,
  }: {
    ativo: boolean;
    texto: string;
  }) => {
    return (
      <Text style={[styles.passwordRule, ativo ? styles.ruleOk : styles.ruleError]}>
        {ativo ? '✓' : '✕'} {texto}
      </Text>
    );
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
            <Text style={styles.title}>Cadastro</Text>
            <View style={styles.titleUnderline} />

            <CustomInput
              label="Nome"
              value={nome}
              onChangeText={(texto: string) => {
                setNome(texto);
                setErroNome('');
                setErroCadastro('');
              }}
              placeholder="Digite seu nome"
              icon="user"
            />

            {erroNome !== '' && <Text style={styles.erroTexto}>{erroNome}</Text>}

            <CustomInput
              label="Email"
              value={email}
              onChangeText={(texto: string) => {
                setEmail(texto);
                setErroEmail('');
                setErroCadastro('');
              }}
              placeholder="exemplo@gmail.com"
              icon="mail"
            />

            {email.length > 0 && (
              <Text style={[styles.emailRule, emailEhGmail ? styles.ruleOk : styles.ruleError]}>
                {emailEhGmail ? '✓' : '✕'} O email precisa terminar com @gmail.com
              </Text>
            )}

            {erroEmail !== '' && <Text style={styles.erroTexto}>{erroEmail}</Text>}

            <CustomInput
              label="Senha"
              value={senha}
              onChangeText={(texto: string) => {
                setSenha(texto);
                setErroSenha('');
                setErroCadastro('');
              }}
              placeholder="Ex: Senha@123"
              secureTextEntry
              icon="lock"
              isPassword
            />

            {senha.length > 0 && (
              <View style={styles.passwordBox}>
                <Text style={styles.passwordTitle}>A senha precisa conter:</Text>

                <RegraSenha ativo={senhaTemMinimo} texto="Mínimo de 8 caracteres" />
                <RegraSenha ativo={senhaTemMaiuscula} texto="Uma letra maiúscula" />
                <RegraSenha ativo={senhaTemMinuscula} texto="Uma letra minúscula" />
                <RegraSenha ativo={senhaTemNumero} texto="Um número" />
                <RegraSenha ativo={senhaTemSimbolo} texto="Um símbolo, exemplo: @ # _ -" />

                <Text style={[styles.passwordStatus, senhaForte ? styles.ruleOk : styles.ruleError]}>
                  {senhaForte ? 'Senha forte' : 'Senha fraca'}
                </Text>
              </View>
            )}

            {erroSenha !== '' && <Text style={styles.erroTexto}>{erroSenha}</Text>}

            <CustomInput
              label="Confirmar senha"
              value={confirmarSenha}
              onChangeText={(texto: string) => {
                setConfirmarSenha(texto);
                setErroConfirmarSenha('');
                setErroCadastro('');
              }}
              placeholder="Confirme sua senha"
              secureTextEntry
              icon="shield"
              isPassword
            />

            {erroConfirmarSenha !== '' && (
              <Text style={styles.erroTexto}>{erroConfirmarSenha}</Text>
            )}

            {erroCadastro !== '' && <Text style={styles.erroBox}>{erroCadastro}</Text>}

            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.link}>
                Já possui cadastro? <Text style={styles.linkHighlight}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton title="Cadastrar" onPress={handleCadastro} />

          <View style={styles.dividerArea}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={continuarComGoogle}>
            <View style={styles.googleContent}>
              <Image
                source={require('../../assets/images/google.png')}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continuar com o Google</Text>
            </View>
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
    width: 110,
    height: 110,
    marginTop: 0,
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
    width: 130,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    marginBottom: 20,
    marginTop: 6,
  },

  link: {
    color: theme.colors.textSoft,
    fontSize: 12,
    marginTop: 6,
  },

  linkHighlight: {
    color: theme.colors.accentStrong,
    fontWeight: '800',
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
    marginTop: 8,
    marginBottom: 8,
  },

  emailRule: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -6,
    marginBottom: 8,
  },

  passwordBox: {
    marginTop: -4,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  passwordTitle: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },

  passwordRule: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },

  passwordStatus: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },

  ruleOk: {
    color: '#4ADE80',
  },

  ruleError: {
    color: '#F87171',
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
    justifyContent: 'center',
    marginTop: 12,
  },

  googleIcon: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
    marginRight: -10,
  },

  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  googleButtonText: {
    color: '#3C4043',
    fontSize: 15,
    fontWeight: '500',
  },
});