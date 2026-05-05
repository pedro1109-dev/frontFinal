import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { API_ROUTES, apiFetch } from '../../services/api';
import MenuLateral from '../../components/Menulateral';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

type ConsumoItem = {
  id: number;
  tipo: string;
  valor: number;
  dataConsumo: string;
  dataRegistro: string;
};
type Usuario = {
  id?: number | string;
  nome?: string;
  email?: string;
  fotoPerfil?: string | null;
};

type TipoConsumo = 'geral' | 'água' | 'energia' | 'combustível' | 'gás';

type Dica = {
  icon: string;
  titulo: string;
  texto: string;
  cor: string;
  bgColor: string;
  borderColor: string;
};

const dicasPorTipo: Record<TipoConsumo, Dica[]> = {
  geral: [
    {
      icon: '🌿',
      titulo: 'Registre seus consumos',
      texto: 'Acompanhar seus gastos é o primeiro passo para economizar e preservar o meio ambiente.',
      cor: '#6EE86A',
      bgColor: 'rgba(110,232,106,0.08)',
      borderColor: 'rgba(110,232,106,0.20)',
    },
    {
      icon: '♻️',
      titulo: 'Reduza o desperdício',
      texto: 'Pequenas mudanças de hábito podem reduzir seu gasto mensal em até 25%.',
      cor: '#6EE86A',
      bgColor: 'rgba(110,232,106,0.08)',
      borderColor: 'rgba(110,232,106,0.20)',
    },
    {
      icon: '📊',
      titulo: 'Compare seus gastos',
      texto: 'Use os gráficos para identificar em qual mês você gastou mais e ajuste seus hábitos.',
      cor: '#6EE86A',
      bgColor: 'rgba(110,232,106,0.08)',
      borderColor: 'rgba(110,232,106,0.20)',
    },
  ],
  água: [
    {
      icon: '💧',
      titulo: 'Reduza no banho',
      texto: 'Banhos de até 5 minutos podem economizar até 40 litros de água por dia.',
      cor: '#5BC4F5',
      bgColor: 'rgba(91,196,245,0.10)',
      borderColor: 'rgba(91,196,245,0.22)',
    },
    {
      icon: '🚿',
      titulo: 'Feche a torneira',
      texto: 'Fechar a torneira ao escovar os dentes poupa até 12 litros por minuto.',
      cor: '#5BC4F5',
      bgColor: 'rgba(91,196,245,0.10)',
      borderColor: 'rgba(91,196,245,0.22)',
    },
  ],
  energia: [
    {
      icon: '⚡',
      titulo: 'Desligue o stand-by',
      texto: 'Aparelhos em stand-by consomem até 12% da energia da sua conta mensal.',
      cor: '#F5E030',
      bgColor: 'rgba(245,224,48,0.08)',
      borderColor: 'rgba(245,224,48,0.20)',
    },
    {
      icon: '💡',
      titulo: 'Troque para LED',
      texto: 'Lâmpadas LED consomem até 80% menos energia que as incandescentes.',
      cor: '#F5E030',
      bgColor: 'rgba(245,224,48,0.08)',
      borderColor: 'rgba(245,224,48,0.20)',
    },
  ],
  combustível: [
    {
      icon: '⛽',
      titulo: 'Calibre os pneus',
      texto: 'Pneus com pressão correta reduzem o consumo de combustível em até 8%.',
      cor: '#F5B731',
      bgColor: 'rgba(245,183,49,0.10)',
      borderColor: 'rgba(245,183,49,0.22)',
    },
    {
      icon: '🚗',
      titulo: 'Evite acelerações',
      texto: 'Acelerações bruscas aumentam o consumo de combustível em até 40%.',
      cor: '#F5B731',
      bgColor: 'rgba(245,183,49,0.10)',
      borderColor: 'rgba(245,183,49,0.22)',
    },
  ],
  gás: [
    {
      icon: '🔥',
      titulo: 'Tampe as panelas',
      texto: 'Cozinhar com a panela tampada reduz o tempo de preparo e economiza até 30% de gás.',
      cor: '#FF8C42',
      bgColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.22)',
    },
    {
      icon: '🍳',
      titulo: 'Chama adequada',
      texto: 'Use sempre a chama no tamanho certo para a panela.',
      cor: '#FF8C42',
      bgColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.22)',
    },
  ],
};

const tiposDica: { key: TipoConsumo; label: string; cor: string }[] = [
  { key: 'geral', label: '🌿 Geral', cor: '#6EE86A' },
  { key: 'água', label: '💧 Água', cor: '#5BC4F5' },
  { key: 'energia', label: '⚡ Energia', cor: '#F5E030' },
  { key: 'combustível', label: '⛽ Combustível', cor: '#F5B731' },
  { key: 'gás', label: '🔥 Gás', cor: '#FF8C42' },
];

const tipoConfig: Record<
  string,
  { icon: string; cor: string; bgColor: string; borderColor: string }
> = {
  combustível: {
    icon: '⛽',
    cor: '#F5B731',
    bgColor: 'rgba(245,183,49,0.12)',
    borderColor: 'rgba(245,183,49,0.22)',
  },
  gasolina: {
    icon: '⛽',
    cor: '#F5B731',
    bgColor: 'rgba(245,183,49,0.12)',
    borderColor: 'rgba(245,183,49,0.22)',
  },
  água: {
    icon: '💧',
    cor: '#5BC4F5',
    bgColor: 'rgba(91,196,245,0.12)',
    borderColor: 'rgba(91,196,245,0.22)',
  },
  energia: {
    icon: '⚡',
    cor: '#F5E030',
    bgColor: 'rgba(245,224,48,0.10)',
    borderColor: 'rgba(245,224,48,0.20)',
  },
  gás: {
    icon: '🔥',
    cor: '#FF8C42',
    bgColor: 'rgba(255,140,66,0.10)',
    borderColor: 'rgba(255,140,66,0.22)',
  },
};
function formatarDiaMes(dataApi: string) {
  if (!dataApi) return '';

  const somenteData = dataApi.split('T')[0];
  const partes = somenteData.split('-');

  if (partes.length !== 3) return '';

  const [ano, mes, dia] = partes;

  return `${dia}/${mes}`;
}

function getTipoConfig(tipo: string) {
  return (
    tipoConfig[tipo?.toLowerCase()] ?? {
      icon: '📦',
      cor: '#6EE86A',
      bgColor: 'rgba(110,232,106,0.10)',
      borderColor: 'rgba(110,232,106,0.20)',
    }
  );
}

function fmtBRL(v: number) {
  return `R$${v.toFixed(2).replace('.', ',')}`;
}

function formatarDataLista(dataApi: string) {
  if (!dataApi) return 'Sem data';

  if (dataApi.includes('/')) {
    return dataApi;
  }

  const somenteData = dataApi.split('T')[0];
  const partes = somenteData.split('-');

  if (partes.length !== 3) return 'Sem data';

  const [ano, mes, dia] = partes;

  return `${dia}/${mes}/${ano}`;
}

function pegarDataHojeBr() {
  const hoje = new Date();

  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();

  return `${dia}/${mes}/${ano}`;
}
async function pegarDatasRegistroLocais() {
  const salvo = await AsyncStorage.getItem('datas_registro_consumos');
  return salvo ? JSON.parse(salvo) : {};
}

async function salvarDataRegistroLocal(id: number, dataIso: string) {
  const datas = await pegarDatasRegistroLocais();

  if (!datas[id]) {
    datas[id] = dataIso;
    await AsyncStorage.setItem('datas_registro_consumos', JSON.stringify(datas));
  }
}
export default function ListagemConsumos() {
  const router = useRouter();

  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [consumos, setConsumos] = useState<ConsumoItem[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoConsumo>('geral');
  const [dicaIndex, setDicaIndex] = useState(0);
  const [itemAberto, setItemAberto] = useState<number | null>(null);

function toggleItem(id: number) {
  if (itemAberto === id) {
    setItemAberto(null);
  } else {
    setItemAberto(id);
  }
}

  useFocusEffect(
  useCallback(() => {
    carregarUsuario();
    carregarConsumos();
  }, [])
);
async function carregarUsuario() {
  try {
    const usuarioSalvo = await AsyncStorage.getItem('usuario');

    if (usuarioSalvo) {
      const usuarioLocal = JSON.parse(usuarioSalvo);

      setUsuario({
        id: usuarioLocal.id || usuarioLocal.id_usuario || usuarioLocal.usuario_id,
        nome: usuarioLocal.nome || usuarioLocal.name || 'Usuário',
        email: usuarioLocal.email || 'usuario@email.com',
        fotoPerfil: usuarioLocal.fotoPerfil || null,
      });
    }
  } catch (error) {
    console.log('ERRO AO CARREGAR USUÁRIO NO MENU:', error);
  }
}
  async function buscarIdUsuario() {
    const idDireto =
      (await AsyncStorage.getItem('id_usuario')) ||
      (await AsyncStorage.getItem('usuario_id')) ||
      (await AsyncStorage.getItem('user_id'));

    if (idDireto) return Number(idDireto);

    const usuarioSalvo = await AsyncStorage.getItem('usuario');

    if (usuarioSalvo) {
      const usuario = JSON.parse(usuarioSalvo);

      return Number(
        usuario.id_usuario ||
          usuario.usuario_id ||
          usuario.id ||
          usuario.user_id ||
          usuario.id_user
      );
    }

    return null;
  }

  async function carregarConsumos() {
    try {
      const idUsuario = await buscarIdUsuario();

      if (!idUsuario) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        return;
      }

      const dados = await apiFetch(`${API_ROUTES.CONSUMO.LISTAR}?id_usuario=${idUsuario}`);
      const datasLocais = await pegarDatasRegistroLocais();

      console.log('DADOS DA API:', dados);

      const lista = await Promise.all(
        (dados || []).map(async (item: any) => {
          const id = item.id_consumos ?? item.id ?? item.consumo_id;

          if (!datasLocais[id]) {
            await salvarDataRegistroLocal(id, new Date().toISOString());
          }

          const datasAtualizadas = await pegarDatasRegistroLocais();

          return {
            id,
            tipo: item.tipo,
            valor: Number(item.valor ?? 0),

            // ESSA É A DATA QUE ELE COLOCOU NO REGISTRO
            dataConsumo: formatarDataLista(item.data),

            // ESSA É A DATA LOCAL EM QUE O APP GUARDOU O REGISTRO
            dataRegistro: formatarDataLista(datasAtualizadas[id]),
          };
        })
      );

      setConsumos(lista);
    } catch (error: any) {
      console.log('Erro ao carregar consumos:', error);

      Alert.alert(
        'Erro ao carregar consumos',
        error?.data?.detail || error?.message || 'Não foi possível carregar.'
      );
    }
  }
async function removerDataRegistroLocal(id: number) {
  const datas = await pegarDatasRegistroLocais();
  delete datas[id];
  await AsyncStorage.setItem('datas_registro_consumos', JSON.stringify(datas));
}
  async function confirmarExcluir(id: number) {
    try {
      await apiFetch(API_ROUTES.CONSUMO.DELETAR(id), {
        method: 'DELETE',
      });
      await removerDataRegistroLocal(id);
      setConsumos((prev) => prev.filter((item) => item.id !== id));
      Alert.alert('Sucesso', 'Consumo excluído.');
    } catch (error: any) {
      console.log('ERRO DELETE:', error);

      Alert.alert(
        'Erro ao excluir',
        error?.data?.detail || error?.message || 'Não foi possível excluir.'
      );
    }
  }

  const dicasDoTipo = dicasPorTipo[tipoSelecionado];
  const dicaAtual = dicasDoTipo[dicaIndex % dicasDoTipo.length];

  function proximaDica() {
    setDicaIndex((prev) => prev + 1);
  }

  const totalValor = consumos.reduce((s, c) => s + c.valor, 0);

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
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="leaf" size={22} color="#6EE86A" />
              </View>
              <View>
                <Text style={styles.headerBrand}>ECO CONTROL</Text>
                <Text style={styles.headerSub}>Listagem de consumos</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuAberto(true)}
            >
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.topRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#6EE86A" />
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Registros</Text>
              <Text style={styles.statValue}>{consumos.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total gasto</Text>
              <Text style={[styles.statValue, { fontSize: 16 }]}>
                {fmtBRL(totalValor)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Média</Text>
              <Text style={[styles.statValue, { fontSize: 16 }]}>
                {consumos.length > 0 ? fmtBRL(totalValor / consumos.length) : 'R$0,00'}
              </Text>
            </View>
          </View>

          <View style={styles.dicasCard}>
            <View style={styles.dicasHeaderRow}>
              <Text style={styles.dicasTitle}>💡 Dicas para economizar</Text>
              <TouchableOpacity style={styles.proximaDicaBtn} onPress={proximaDica}>
                <Ionicons name="refresh" size={13} color="#6EE86A" />
                <Text style={styles.proximaDicaText}>Outra dica</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dicasTabsContent}
              style={styles.dicasTabsScroll}
            >
              {tiposDica.map((t) => {
                const ativo = tipoSelecionado === t.key;

                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.dicaTab,
                      ativo && {
                        backgroundColor: t.cor + '22',
                        borderColor: t.cor + '66',
                      },
                    ]}
                    onPress={() => {
                      setTipoSelecionado(t.key);
                      setDicaIndex(0);
                    }}
                  >
                    <Text
                      style={[
                        styles.dicaTabText,
                        ativo && { color: t.cor, fontWeight: '800' },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View
              style={[
                styles.dicaConteudo,
                {
                  backgroundColor: dicaAtual.bgColor,
                  borderColor: dicaAtual.borderColor,
                },
              ]}
            >
              <Text style={styles.dicaEmoji}>{dicaAtual.icon}</Text>

              <View style={styles.dicaTextoWrap}>
                <Text style={[styles.dicaTitulo, { color: dicaAtual.cor }]}>
                  {dicaAtual.titulo}
                </Text>
                <Text style={styles.dicaTexto}>{dicaAtual.texto}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Seus Consumos</Text>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {consumos.length} {consumos.length === 1 ? 'item' : 'itens'}
              </Text>
            </View>
          </View>

          <View style={styles.listWrapper}>
            {consumos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>Nenhum consumo registrado</Text>
                <Text style={styles.emptyText}>
                  Assim que você registrar um consumo, ele aparecerá aqui.
                </Text>
              </View>
            ) : (
              consumos.map((item) => {
                const cfg = getTipoConfig(item.tipo);

                return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.consumoCard}
                  activeOpacity={0.9}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={styles.cardHeaderBar}>
                    <View style={styles.cardTipoWrap}>
                      <View
                        style={[
                          styles.tipoIconBox,
                          {
                            backgroundColor: cfg.bgColor,
                            borderColor: cfg.borderColor,
                          },
                        ]}
                      >
                        <Text style={styles.tipoEmoji}>{cfg.icon}</Text>
                      </View>

                      <Text style={[styles.tipoLabel, { color: cfg.cor }]}>
                        {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                      </Text>
                    </View>

                    <Feather
                      name={itemAberto === item.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#7AAF90"
                    />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.valorSection}>
                      <Text style={styles.valorLabel}>Valor gasto</Text>
                      <Text style={styles.valorNum}>{fmtBRL(item.valor)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      activeOpacity={0.75}
                      onPress={(event) => {
                        event.stopPropagation();
                        confirmarExcluir(item.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FF8A8A" />
                      <Text style={styles.deleteButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>

                  {itemAberto === item.id && (
                    <View style={styles.boxDetalhe}>
                      <Text style={styles.textDetalhe}>
                        🕒 Registrado em: {item.dataRegistro}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
                
              })
            )}
            
          </View>
          
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Ionicons name="home-outline" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Início</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItemActive}>
            <Ionicons name="bar-chart" size={20} color="#6EE86A" />
            <Text style={styles.navTextActive}>Consumo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCenterButton}
            onPress={() => router.push('/consumo/registro-consumo')}
          >
            <Feather name="plus" size={26} color="#0D2B22" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/metas' as any)}
          >
            <Feather name="target" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Metas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/documento' as any)}
          >
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
      <TouchableOpacity style={styles.menuAreaFechar} activeOpacity={1} onPress={fechar} />

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
  safe: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBottom,
  },
  boxDetalhe: {
  marginHorizontal: 12, // 👉 aumenta espaço lateral
  marginTop: 10,        // 👉 espaço do conteúdo de cima
  marginBottom: 24,
  padding: 14,          // 👉 aumenta respiro interno
  borderRadius: 15,
  backgroundColor: 'rgba(0,0,0,0.22)',
  borderWidth: 1,
  borderColor: 'rgba(110,232,106,0.20)',
},

textDetalhe: {
  color: '#CFFFE0',
  fontSize: 12,
  marginBottom: 5,
},
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(120,255,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerBrand: {
    color: '#E9F1EC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerSub: {
    color: '#7AF46C',
    fontSize: 14,
    marginTop: 2,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    marginBottom: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(110,232,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#6EE86A',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(12, 40, 30, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.14)',
    padding: 12,
    gap: 4,
  },
  statLabel: {
    color: '#7AAF90',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    color: '#A8F5A0',
    fontSize: 20,
    fontWeight: '800',
  },
  dicasCard: {
    backgroundColor: 'rgba(12, 40, 30, 0.96)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.14)',
    padding: 14,
    marginBottom: 18,
  },
  dicasHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dicasTitle: {
    color: '#F0FFF4',
    fontSize: 14,
    fontWeight: '800',
  },
  proximaDicaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(110,232,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  proximaDicaText: {
    color: '#6EE86A',
    fontSize: 12,
    fontWeight: '700',
  },
  dicasTabsScroll: {
    marginTop: 10,
    marginBottom: 14,
    maxWidth: '100%',
  },
  dicasTabsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 70,
  },
  dicaTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dicaTabText: {
    color: '#7AAF90',
    fontSize: 12,
    fontWeight: '600',
  },
  dicaConteudo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  dicaEmoji: {
    fontSize: 26,
    marginTop: 2,
  },
  dicaTextoWrap: {
    flex: 1,
    gap: 4,
  },
  dicaTitulo: {
    fontSize: 14,
    fontWeight: '800',
  },
  dicaTexto: {
    color: '#B8E8C4',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F0FFF4',
    fontSize: 18,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: 'rgba(110,232,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: '#6EE86A',
    fontSize: 12,
    fontWeight: '700',
  },
  listWrapper: {
    gap: 12,
  },
  consumoCard: {
    backgroundColor: 'rgba(18, 50, 36, 0.90)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.12)',
    overflow: 'hidden',
  },
  cardHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(110,232,106,0.08)',
  },
  cardTipoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoEmoji: {
    fontSize: 16,
  },
  tipoLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    color: '#7AAF90',
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  valorSection: {
    gap: 2,
  },
  valorLabel: {
    color: '#7AAF90',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valorNum: {
    color: '#A8F5A0',
    fontSize: 22,
    fontWeight: '800',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(224,64,64,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,64,64,0.28)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#FF8A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: 'rgba(12,40,30,0.80)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.10)',
    borderStyle: 'dashed',
    padding: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#F0FFF4',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#7AAF90',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  bottomNav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 38, 28, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navItem: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6EE86A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    shadowColor: '#6EE86A',
    shadowOpacity: 0.30,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  navText: {
    color: '#C7D6CE',
    fontSize: 10,
    marginTop: 2,
  },
  navTextActive: {
    color: '#7AF46C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
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