import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ROUTES, apiFetch } from '../../services/api';
import { theme } from '../../constants/theme';


type MetaItem = {
  id: number;
  objetivo: string;
  descricao: string;
  valorLimite: string;
  dataFinal: string;
};
type Usuario = {
  nome?: string;
  email?: string;
  fotoPerfil?: string | null;
};
async function pegarMetasConcluidasLocais() {
  const salvo = await AsyncStorage.getItem('metas_concluidas');
  return salvo ? JSON.parse(salvo) : [];
}
function pegarIdMeta(meta: any) {
  return Number(
    meta.id_metas ??
    meta.id ??
    meta.meta_id ??
    meta.id_meta ??
    meta.metas_id
  );
}

export default function MetasScreen() {
  
  const router = useRouter(); // Coloque isso antes do useEffect

  useEffect(() => {
  carregarMetas();
}, []);// Agora estamos usando 'router.route', que é a propriedade correta no Expo Router // Agora estamos usando pathname, que é a propriedade correta  // Agora está no lugar correto

  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [objetivo, setObjetivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorLimite, setValorLimite] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [metaExpandida, setMetaExpandida] = useState<number | null>(null);
  const [metas, setMetas] = useState<MetaItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function carregarUsuario() {
  try {
    const usuarioSalvo = await AsyncStorage.getItem('usuario');

    if (usuarioSalvo) {
      const usuarioLocal = JSON.parse(usuarioSalvo);

      setUsuario({
        nome: usuarioLocal.nome || usuarioLocal.name || 'Usuário',
        email: usuarioLocal.email || 'usuario@email.com',
        fotoPerfil: usuarioLocal.fotoPerfil || null,
      });
    }
  } catch (error) {
    console.log('ERRO AO CARREGAR USUÁRIO NO MENU:', error);
  }
}

  function formatarValorApi(valor: any) {
    const numero = Number(valor || 0);
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatarDataApi(data: string) {
    if (!data) return '';
    const dataObj = new Date(data);
    return Number.isNaN(dataObj.getTime()) ? data : dataObj.toLocaleDateString('pt-BR');
  }

  function formatarMoeda(texto: string) {
    const numeros = texto.replace(/\D/g, '');
    if (!numeros) return '';

    const valor = Number(numeros) / 100;

    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function limparMoedaParaNumero(valor: string) {
    return Number(valor.replace(/\./g, '').replace(',', '.'));
  }

  function formatarDataDigitada(texto: string) {
    const numeros = texto.replace(/\D/g, '').slice(0, 8);

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;

    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  }

  function converterDataParaApi(data: string) {
    const partes = data.split('/');
    if (partes.length !== 3) return data;
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  }

  async function pegarDescricoesLocais() {
    const descricoesSalvas = await AsyncStorage.getItem('descricoes_metas');
    return descricoesSalvas ? JSON.parse(descricoesSalvas) : {};
  }

  async function salvarDescricaoLocal(id: number, texto: string) {
    const descricoes = await pegarDescricoesLocais();
    descricoes[id] = texto;
    await AsyncStorage.setItem('descricoes_metas', JSON.stringify(descricoes));
  }

  async function removerDescricaoLocal(id: number) {
    const descricoes = await pegarDescricoesLocais();
    delete descricoes[id];
    await AsyncStorage.setItem('descricoes_metas', JSON.stringify(descricoes));
  }

 const carregarMetas = useCallback(async () => {
  try {
    // Busque o ID de forma robusta como na Home
    const usuarioId = await AsyncStorage.getItem('usuario_id');
    if (!usuarioId) return;

    // CORREÇÃO: Adicione o id_usuario na rota da API
    const dados = await apiFetch(`${API_ROUTES.METAS.LISTAR}?id_usuario=${usuarioId}`);
    
    // Remova o filtro que usa 'metas_concluidas' se quiser que elas apareçam no histórico
    const lista = (dados || []).map((item: any) => {
      const idMeta = pegarIdMeta(item);
      return {
        id: idMeta,
        objetivo: item.objetivo || 'Sem objetivo',
        descricao: item.descricao || 'Sem descrição.',
        valorLimite: formatarValorApi(item.valor_limit),
        dataFinal: formatarDataApi(item.data_meta),
      };
    });

    setMetas(lista);
  } catch (error) {
    console.log('ERRO AO CARREGAR METAS:', error);
  }
}, []);

  useEffect(() => {
    carregarUsuario();
    carregarMetas();
  }, [carregarMetas]);

  async function criarMeta() {
    if (!objetivo || !valorLimite || !dataFinal) {
      Alert.alert('Atenção', 'Preencha objetivo, valor limite e data final.');
      return;
    }

    try {
      setCarregando(true);

      const usuarioId = await AsyncStorage.getItem('usuario_id');
      await AsyncStorage.removeItem('metas_concluidas');
      if (!usuarioId) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        return;
      }

      const corpo = {
        objetivo: objetivo.trim(),
        descricao: descricao.trim(), // Agora a descrição é enviada ao banco
        valor_limit: Number(limparMoedaParaNumero(valorLimite)),
        id_usuario: Number(usuarioId),
        data_meta: converterDataParaApi(dataFinal), 
      };

      const resposta = await apiFetch(API_ROUTES.METAS.CRIAR, {
        method: 'POST',
        body: JSON.stringify(corpo),
      });
      
      const idCriado =
        resposta?.id ||
        resposta?.id_meta ||
        resposta?.meta_id ||
        resposta?.meta?.id ||
        resposta?.meta?.id_meta;

      if (idCriado) {
        // Adiciona a meta recém-criada no AsyncStorage
        const metasSalvas = await AsyncStorage.getItem('metas_concluidas');
        const novasMetas = metasSalvas ? JSON.parse(metasSalvas) : [];
        novasMetas.push(idCriado); // Adiciona a nova meta ao array de metas salvas
        await AsyncStorage.setItem('metas_concluidas', JSON.stringify(novasMetas));
      }

      setObjetivo('');
      setDescricao('');
      setValorLimite('');
      setDataFinal('');

      await carregarMetas();

      Alert.alert('Sucesso', 'Meta criada com sucesso!');
    } catch (error: any) {
      console.log('ERRO AO CRIAR META:', error);

      Alert.alert(
        'Erro ao criar meta',
        JSON.stringify(error?.data?.detail || error?.data || error)
      );
    } finally {
      setCarregando(false);
    }
  }

  async function excluirMeta(id: number) {
    if (!id) {
      Alert.alert('Erro', 'ID da meta não encontrado.');
      return;
    }

    try {
      await apiFetch(API_ROUTES.METAS.DELETAR(id), {
        method: 'DELETE',
      });

      await removerDescricaoLocal(id);

      setMetas((anterior) => anterior.filter((item) => item.id !== id));

      if (metaExpandida === id) {
        setMetaExpandida(null);
      }

      Alert.alert('Sucesso', 'Meta excluída com sucesso!');
    } catch (error: any) {
      console.log('ERRO AO EXCLUIR META:', error);

      Alert.alert(
        'Erro ao excluir meta',
        JSON.stringify(error?.data?.detail || error?.data || error)
      );
    }
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="target-account" size={22} color="#8CFF8A" />
              </View>

              <View>
                <Text style={styles.headerBrand}>ECO CONTROL</Text>
                <Text style={styles.headerTitle}>Nova Meta</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuButton} onPress={() => setMenuAberto(true)}>
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.mainCard}>
            <Text style={styles.formTitle}>Nova Meta 🎯</Text>

            <View style={styles.formBox}>
              <Text style={styles.fieldLabel}>Objetivo:</Text>
              <TextInput
                value={objetivo}
                onChangeText={setObjetivo}
                placeholder="Digite o objetivo"
                placeholderTextColor={theme.colors.placeholder}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Descrição:</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Digite a descrição"
                placeholderTextColor={theme.colors.placeholder}
                style={styles.input}
                multiline
              />

              <Text style={styles.fieldLabel}>Valor Limite:</Text>
              <TextInput
                value={valorLimite}
                onChangeText={(texto) => setValorLimite(formatarMoeda(texto))}
                placeholder="0,00"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Data Final:</Text>
              <TextInput
                value={dataFinal}
                onChangeText={(texto) => setDataFinal(formatarDataDigitada(texto))}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="number-pad"
                maxLength={10}
                style={styles.input}
              />

              <TouchableOpacity style={styles.createButton} onPress={criarMeta} disabled={carregando}>
                <Text style={styles.createButtonText}>
                  {carregando ? 'Criando...' : 'Criar Meta'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listTitle}>Listagem de metas 🎯</Text>
        
            <View style={styles.listBox}>
              {metas.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nenhuma meta cadastrada</Text>
                  <Text style={styles.emptyText}>
                    Assim que você criar uma meta, ela aparecerá aqui.
                  </Text>
                </View>
              ) : (
                metas.map((item) => (
                  <View key={item.id} style={styles.metaCard}>
                    <Text style={styles.infoValue}>Objetivo: {item.objetivo}</Text>
                    <Text style={styles.infoValue}>Valor Limite: {item.valorLimite}</Text>
                    <Text style={styles.infoValue}>Data Limite: {item.dataFinal}</Text>

                    <Text
                      style={styles.descriptionText}
                      numberOfLines={metaExpandida === item.id ? undefined : 1}
                    >
                      Descrição: {item.descricao}
                    </Text>

                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() =>
                        setMetaExpandida(metaExpandida === item.id ? null : item.id)
                      }
                    >
                      <Text style={styles.expandButtonText}>
                        {metaExpandida === item.id ? 'Ver menos' : 'Ver mais'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={() => excluirMeta(item.id)}>
                      <Text style={styles.deleteButtonText}>Excluir Meta</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/(tabs)/home')}>
            <Ionicons name="home-outline" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Início</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/consumo/analise-consumos')}
          >
            <Ionicons name="bar-chart-outline" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Consumo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCenterButton}
            onPress={() => router.push('/consumo/registro-consumo')}
          >
            <Feather name="plus" size={26} color="#103221" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItemActive}>
            <Feather name="target" size={20} color="#7AF46C" />
            <Text style={styles.navTextActive}>Metas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/documento')}>
            <MaterialCommunityIcons name="file-upload-outline" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Arquivo</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <MenuLateralPerfil
        aberto={menuAberto}
        fechar={() => setMenuAberto(false)}
        usuario={usuario}
        router={router}
/>
    </SafeAreaView>
  );
}
function MenuLateralPerfil({
  aberto,
  fechar,
  usuario,
  router,
}: {
  aberto: boolean;
  fechar: () => void;
  usuario: Usuario | null;
  router: ReturnType<typeof useRouter>;
}) {
  async function sair() {
    await AsyncStorage.clear();
    router.replace('/(auth)/login');
  }

  if (!aberto) return null;

  return (
    <View style={styles.menuOverlay}>
      <TouchableOpacity
        style={styles.menuAreaFechar}
        activeOpacity={1}
        onPress={fechar}
      />

      <View style={styles.menuContainer}>
        <View style={styles.menuHeader}>
          <View style={styles.menuAvatar}>
            {usuario?.fotoPerfil ? (
              <Image source={{ uri: usuario.fotoPerfil }} style={styles.menuAvatarImage} />
            ) : (
              <MaterialCommunityIcons name="leaf" size={26} color="#8CFF8A" />
            )}
          </View>

          <View style={styles.menuUserInfo}>
            <Text style={styles.menuNome}>{usuario?.nome || 'Usuário'}</Text>
            <Text style={styles.menuEmail}>{usuario?.email || 'usuario@email.com'}</Text>
          </View>

          <TouchableOpacity onPress={fechar} style={styles.menuCloseButton}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            fechar();
            router.push('/configuracoes' as any);
          }}
        >
          <Feather name="settings" size={20} color="#C7D6CE" />
          <Text style={styles.menuItemText}>Configurações</Text>
        </TouchableOpacity>

        <View style={styles.menuSpacer} />

        <TouchableOpacity style={styles.menuSair} onPress={sair}>
          <Feather name="log-out" size={18} color="#FF6B4A" />
          <Text style={styles.menuSairText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.backgroundBottom },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(120,255,140,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerBrand: { color: '#E9F1EC', fontSize: 15, fontWeight: '800' },
  headerTitle: { color: '#7AF46C', fontSize: 14, marginTop: 2 },
  menuButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  mainCard: { backgroundColor: 'rgba(7, 47, 40, 0.94)', borderRadius: 24, padding: 14 },
  formTitle: { color: '#F4FFF4', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  formBox: { borderRadius: 20, backgroundColor: 'rgba(5, 53, 49, 0.45)', padding: 14, marginBottom: 18 },
  fieldLabel: { color: '#F1FFF0', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  input: { minHeight: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 10, color: '#EAFEF0', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  createButton: { marginTop: 8, height: 48, borderRadius: 14, backgroundColor: '#7AF46C', alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#103221', fontSize: 16, fontWeight: '900' },
  listTitle: { color: '#f8f8f8ff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  listBox: { borderRadius: 20, backgroundColor: 'rgba(5, 53, 49, 0.45)', padding: 12, minHeight: 250 },
  metaCard: { backgroundColor: 'rgba(18, 77, 56, 0.55)', borderRadius: 18, padding: 12, marginBottom: 14 },
  infoValue: { color: '#F4FFF4', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  descriptionText: { color: '#DCEBDD', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  expandButton: { alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: 'rgba(122,244,108,0.10)' },
  expandButtonText: { color: '#7AF46C', fontSize: 12, fontWeight: '800' },
  deleteButton: { alignSelf: 'center', borderRadius: 8, backgroundColor: '#B61919', paddingHorizontal: 10, paddingVertical: 6 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  emptyCard: { borderRadius: 16, backgroundColor: 'rgba(10, 43, 38, 0.88)', padding: 18, alignItems: 'center' },
  emptyTitle: { color: '#F4FFF4', fontSize: 16, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  emptyText: { color: '#C7D6CE', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  bottomNav: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 68, borderRadius: 24, backgroundColor: 'rgba(10, 38, 28, 0.98)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  navItem: { width: 56, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { width: 56, alignItems: 'center', justifyContent: 'center' },
  navCenterButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6EE86A', alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  navText: { color: '#C7D6CE', fontSize: 10, marginTop: 2 },
  navTextActive: { color: '#7AF46C', fontSize: 10, fontWeight: '800', marginTop: 2 },
  menuOverlay: {
  ...StyleSheet.absoluteFillObject,
  flexDirection: 'row',
  zIndex: 50,
},

menuAreaFechar: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
},

menuContainer: {
  width: '68%',
  height: '100%',
  backgroundColor: '#06452F',
  paddingTop: 36,
  paddingHorizontal: 18,
  paddingBottom: 28,
},

menuHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 28,
},

menuAvatar: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: 'rgba(120,255,140,0.10)',
  borderWidth: 1,
  borderColor: 'rgba(120,255,140,0.18)',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
  overflow: 'hidden',
},

menuAvatarImage: {
  width: 44,
  height: 44,
  borderRadius: 22,
},

menuUserInfo: {
  flex: 1,
},

menuNome: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
},

menuEmail: {
  color: '#B8C6BE',
  fontSize: 11,
  fontWeight: '600',
  marginTop: 2,
},

menuCloseButton: {
  padding: 4,
},

menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
},

menuItemText: {
  color: '#DCEBDD',
  fontSize: 15,
  fontWeight: '700',
  marginLeft: 12,
},

menuSpacer: {
  flex: 1,
},

menuSair: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
},

menuSairText: {
  color: '#FF6B4A',
  fontSize: 15,
  fontWeight: '800',
  marginLeft: 10,
},
});