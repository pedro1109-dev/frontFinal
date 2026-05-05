import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../services/api';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../constants/theme';

export default function ConfiguracoesScreen() {
  const router = useRouter();

  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [nome, setNome] = useState('Usuário');
  const [email, setEmail] = useState('usuario@email.com');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  const [notificacaoEmail, setNotificacaoEmail] = useState(true);
  const [notificacaoPush, setNotificacaoPush] = useState(false);

  const [carregandoPerfil, setCarregandoPerfil] = useState(false);
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  useEffect(() => {
    carregarUsuario();
  }, []);

  async function carregarUsuario() {
    try {
      const usuarioSalvo = await AsyncStorage.getItem('usuario');

      const idSalvo =
        (await AsyncStorage.getItem('usuario_id')) ||
        (await AsyncStorage.getItem('id_usuario')) ||
        (await AsyncStorage.getItem('user_id'));

      const usuarioLocal = usuarioSalvo ? JSON.parse(usuarioSalvo) : {};

      const id =
        Number(idSalvo) ||
        Number(usuarioLocal.id) ||
        Number(usuarioLocal.id_usuario) ||
        Number(usuarioLocal.usuario_id);

      if (!id) {
        console.log('Usuário sem ID salvo:', usuarioLocal);
        return;
      }

      setUsuarioId(id);
      setNome(usuarioLocal.nome || usuarioLocal.name || 'Usuário');
      setEmail(usuarioLocal.email || 'usuario@email.com');
      setFotoPerfil(usuarioLocal.fotoPerfil || null);
    } catch (error) {
      console.log('ERRO AO CARREGAR USUÁRIO:', error);
    }
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled) {
      setFotoPerfil(resultado.assets[0].uri);
    }
  }

  async function salvarPerfil() {
    if (!usuarioId) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    if (!nome.trim() || !email.trim()) {
      Alert.alert('Atenção', 'Nome e email são obrigatórios.');
      return;
    }

    try {
      setCarregandoPerfil(true);

      const usuarioSalvo = await AsyncStorage.getItem('usuario');
      const usuarioAtual = usuarioSalvo ? JSON.parse(usuarioSalvo) : {};

      await AsyncStorage.setItem(
        'usuario',
        JSON.stringify({
          ...usuarioAtual,
          id: usuarioId,
          nome: nome.trim(),
          email: email.trim(),
          fotoPerfil,
        })
      );

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
    } catch (error: any) {
      console.log('ERRO AO SALVAR PERFIL:', error);

      Alert.alert(
        'Erro ao salvar perfil',
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Não foi possível salvar o perfil.'
      );
    } finally {
      setCarregandoPerfil(false);
    }
  }

  async function alterarSenha() {
    if (!usuarioId) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    if (!senhaAtual || !novaSenha) {
      Alert.alert('Atenção', 'Preencha a senha atual e a nova senha.');
      return;
    }

    try {
      setCarregandoSenha(true);

      const resposta = await apiFetch(`/Usuario/update-senha/${usuarioId}`, {
        method: 'PUT',
        body: JSON.stringify({
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        }),
      });

      setSenhaAtual('');
      setNovaSenha('');

      Alert.alert('Sucesso', resposta?.mensagem || 'Senha alterada com sucesso.');
    } catch (error: any) {
      Alert.alert(
        'Erro ao alterar senha',
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Não foi possível alterar a senha.'
      );
    } finally {
      setCarregandoSenha(false);
    }
  }

  function excluirConta() {
    if (!usuarioId) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    Alert.alert(
      'Excluir conta',
      'Tem certeza que deseja excluir sua conta? Essa ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/delet/${usuarioId}`, {
                method: 'DELETE',
              });

              await AsyncStorage.clear();

              Alert.alert('Conta excluída', 'Sua conta foi apagada com sucesso.');
              router.replace('/(auth)/login');
            } catch (error: any) {
              console.log('ERRO AO EXCLUIR CONTA:', error);

              Alert.alert(
                'Erro ao excluir conta',
                error?.data?.detail ||
                  error?.data?.message ||
                  error?.message ||
                  'Não foi possível excluir a conta.'
              );
            }
          },
        },
      ]
    );
  }

  async function sair() {
    await AsyncStorage.clear();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[
          theme.colors.backgroundTop,
          theme.colors.backgroundMid,
          theme.colors.backgroundBottom,
        ]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#7AF46C" />
            </TouchableOpacity>

            <View>
              <Text style={styles.headerBrand}>ECO CONTROL</Text>
              <Text style={styles.headerTitle}>Configurações</Text>
            </View>

            <TouchableOpacity style={styles.menuButton}>
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.avatarBox} onPress={escolherFoto}>
              {fotoPerfil ? (
                <Image source={{ uri: fotoPerfil }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-outline" size={42} color="#7AF46C" />
              )}

              <View style={styles.cameraBadge}>
                <Feather name="camera" size={14} color="#103221" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileTitle}>Editar perfil</Text>
            

            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Digite seu nome"
              placeholderTextColor="#78958A"
              style={styles.input}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Digite seu email"
              placeholderTextColor="#78958A"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={salvarPerfil}
              disabled={carregandoPerfil}
            >
              <Text style={styles.saveButtonText}>
                {carregandoPerfil ? 'Salvando...' : 'Salvar alterações'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications-outline" size={20} color="#7AF46C" />
              <Text style={styles.sectionTitle}>Notificações</Text>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionTextBox}>
                <Text style={styles.optionTitle}>Notificações por email</Text>
                <Text style={styles.optionDescription}>
                  Receba atualizações sobre seus gastos e consumos.
                </Text>
              </View>

              <Switch
                value={notificacaoEmail}
                onValueChange={setNotificacaoEmail}
                thumbColor={notificacaoEmail ? '#7AF46C' : '#C7D6CE'}
                trackColor={{ false: '#28443A', true: '#245C3B' }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionTextBox}>
                <Text style={styles.optionTitle}>Notificações push</Text>
                <Text style={styles.optionDescription}>
                  Alertas sobre gastos acima da média.
                </Text>
              </View>

              <Switch
                value={notificacaoPush}
                onValueChange={setNotificacaoPush}
                thumbColor={notificacaoPush ? '#7AF46C' : '#C7D6CE'}
                trackColor={{ false: '#28443A', true: '#245C3B' }}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#7AF46C" />
              <Text style={styles.sectionTitle}>Privacidade e segurança</Text>
            </View>

            <Text style={styles.label}>Senha atual</Text>
            <TextInput
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#78958A"
              secureTextEntry
              style={styles.input}
            />

            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Digite a nova senha"
              placeholderTextColor="#78958A"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={alterarSenha}
              disabled={carregandoSenha}
            >
              <Text style={styles.secondaryButtonText}>
                {carregandoSenha ? 'Alterando...' : 'Alterar senha'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={excluirConta}>
              <Text style={styles.deleteButtonText}>Excluir conta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#7AF46C" />
              <Text style={styles.sectionTitle}>Sobre o App</Text>
            </View>

            <Text style={styles.aboutText}>Versão: 1.0.0</Text>
            <Text style={styles.aboutText}>
              EcoControl - Controle seus gastos de forma sustentável.
            </Text>

            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Termo de Uso</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Política de Privacidade</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Ajuda e Suporte</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={sair}>
            <Feather name="log-out" size={18} color="#FF6B6B" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundBottom },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(120,255,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBrand: { color: '#E9F1EC', fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  headerTitle: { color: '#7AF46C', fontSize: 14, marginTop: 2, fontWeight: '700' },

  menuButton: {
    marginLeft: 'auto',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.12)',
    padding: 16,
    marginBottom: 16,
  },

  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },

  avatarImage: { width: 96, height: 96, borderRadius: 48 },

  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7AF46C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileTitle: { color: '#F4FFF4', fontSize: 18, fontWeight: '900', textAlign: 'center' },

  profileSubtitle: {
    color: '#C7D6CE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },

  label: { color: '#F1FFF0', fontSize: 14, fontWeight: '800', marginBottom: 6 },

  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.15)',
    paddingHorizontal: 12,
    color: '#EAFEF0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },

  saveButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#7AF46C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  saveButtonText: { color: '#103221', fontSize: 16, fontWeight: '900' },

  sectionCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.12)',
    padding: 16,
    marginBottom: 16,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },

  sectionTitle: { color: '#F4FFF4', fontSize: 17, fontWeight: '900', marginLeft: 8 },

  optionRow: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionTextBox: { flex: 1, paddingRight: 10 },

  optionTitle: { color: '#F4FFF4', fontSize: 14, fontWeight: '800', marginBottom: 4 },

  optionDescription: { color: '#C7D6CE', fontSize: 12, lineHeight: 16 },

  secondaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  secondaryButtonText: { color: '#F4FFF4', fontSize: 14, fontWeight: '800' },

  deleteButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E73535',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  aboutText: { color: '#DCEBDD', fontSize: 13, lineHeight: 19, marginBottom: 10 },

  linkButton: { paddingVertical: 8 },

  linkText: { color: '#7AF46C', fontSize: 14, fontWeight: '800' },

  logoutButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,107,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },

  logoutText: { color: '#FF6B6B', fontSize: 15, fontWeight: '900', marginLeft: 8 },
});