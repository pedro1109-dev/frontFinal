import React, { useCallback, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { apiFetch, API_ROUTES } from '../../services/api';
import { theme } from '../../constants/theme';

type TipoGrafico = 'tipo' | 'dia' | 'mes' | 'todos';

type Usuario = {
  id?: string | number;
  nome?: string;

  fotoPerfil?: string | null;
};

type Consumo = {
  gasto?: number;
  valor?: number;
  valor_consumo?: number;
  valor_gasto?: number;
  valor_conta?: number;
  tipo?: string;
  tipo_consumo?: string;
  categoria?: string;
  tipo_recurso?: string;
  data?: string;
  data_consumo?: string;
  data_registro?: string;
};

// Tipo da meta vinda da API (igual ao que MetasRotas.py retorna)
type MetaApi = {
  id_metas?: number;
  id?: number;
  objetivo?: string;
  valor_limit?: number;
  data_meta?: string;
  id_usuario?: number;
};

const CORES_GRAFICO = ['#6EEB62', '#7CE35A', '#FF6B4A', '#C6E34E', '#53D8FF'];

const MODOS_GRAFICO: { key: TipoGrafico; label: string }[] = [
  { key: 'tipo', label: 'Tipo' },
  { key: 'dia', label: 'Dia' },
  { key: 'mes', label: 'Mês' },
  { key: 'todos', label: 'Todos' },
];

/** Retorna a meta "mais importante": aquela com a data final mais distante.
    Se houver empate, prioriza a de maior valor_limit.
    Retorna null se a lista estiver vazia.
 */
function selecionarMetaImportante(metas: MetaApi[]): MetaApi | null {
  if (!metas || metas.length === 0) return null;

  // CORREÇÃO: Ordenar por DATA (vencimento mais próximo)
  const metasOrdenadas = [...metas].sort((a, b) => {
    const dataA = new Date(a.data_meta || '').getTime();
    const dataB = new Date(b.data_meta || '').getTime();
    return dataA - dataB;
  });

  return metasOrdenadas[0];
}

/**
 * Soma todos os valores de consumo para usar como "gasto atual" na meta.
 */
function calcularTotalConsumido(consumos: any[]): number {
  return consumos.reduce((acc, item) => acc + pegarValorConsumo(item), 0);
}

/**
 * Formata data ISO para DD/MM/AAAA.
 */
function formatarData(dataIso?: string): string {
  if (!dataIso) return '—';
  const d = new Date(dataIso);
  if (Number.isNaN(d.getTime())) return dataIso;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
async function pegarMetasConcluidasLocais() {
  const salvo = await AsyncStorage.getItem('metas_concluidas');
  return salvo ? JSON.parse(salvo) : [];
}

async function salvarMetaConcluidaLocal(id: number) {
  const metasConcluidas = await pegarMetasConcluidasLocais();
  const listaNumerica = metasConcluidas.map(Number);

  if (!listaNumerica.includes(Number(id))) {
    listaNumerica.push(Number(id));
    await AsyncStorage.setItem('metas_concluidas', JSON.stringify(listaNumerica));
  }
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
function pegarValorConsumo(item: any) {
  return Number(
    item.gasto ??
    item.valor ??
    item.valor_consumo ??
    item.valor_gasto ??
    item.valor_conta ??
    0
  ) || 0;
}

export default function Home() {
  const router = useRouter();
  const metasAvisadasRef = useRef<number[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('tipo');
  const [menuAberto, setMenuAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Estado das metas
  const [metas, setMetas] = useState<MetaApi[]>([]);

  const carregarHome = useCallback(async () => {
    try {
      setCarregando(true);

      const [usuarioSalvo, usuarioId] = await Promise.all([
        AsyncStorage.getItem('usuario'),
        AsyncStorage.getItem('usuario_id'),
      ]);

      if (!usuarioSalvo || !usuarioId) {
        router.replace('/(auth)/login');
        return;
      }

      let usuarioLocal: Usuario | null = null;
      try {
        usuarioLocal = JSON.parse(usuarioSalvo);
        setUsuario(usuarioLocal);
      } catch {
        setUsuario(null);
      }

      // Carrega consumos e metas em paralelo
      const [dadosConsumo, dadosMetas] = await Promise.all([
        apiFetch(`${API_ROUTES.CONSUMO.LISTAR}?id_usuario=${usuarioId}`),
        apiFetch(`${API_ROUTES.METAS.LISTAR}?id_usuario=${usuarioId}`),
      ]);

      setConsumos(Array.isArray(dadosConsumo) ? dadosConsumo : []);
      const metasConcluidas = await pegarMetasConcluidasLocais();

      const metasFiltradas = Array.isArray(dadosMetas)
        ? dadosMetas.filter((meta: any) => {
            const idMeta = pegarIdMeta(meta);
            return !metasConcluidas.map(Number).includes(idMeta);
          })
        : [];

      setMetas(metasFiltradas);
    } catch (error) {
      console.log('ERRO AO CARREGAR HOME:', error);
      setConsumos([]);
      setMetas([]);
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      carregarHome();
    }, [carregarHome])
  );

  const chartData = useMemo(() => {
    if (consumos.length === 0) {
      return [{ label: 'Água', value: 0, color: CORES_GRAFICO[0] }];
    }

    const resumo = consumos.reduce<Record<string, number>>((acc, item, index) => {
      const valor =
        Number(
          item.gasto ??
            item.valor ??
            item.valor_consumo ??
            item.valor_gasto ??
            item.valor_conta ??
            0
        ) || 0;

      let chave =
        item.tipo ??
        item.tipo_consumo ??
        item.categoria ??
        item.tipo_recurso ??
        'Consumo';

      const dataRaw = item.data ?? item.data_consumo ?? item.data_registro;
      const dataItem = dataRaw ? new Date(dataRaw) : null;
      const dataValida = dataItem && !Number.isNaN(dataItem.getTime());

      if (tipoGrafico === 'dia') {
        chave = dataValida
          ? `Dia ${String(dataItem.getDate()).padStart(2, '0')}`
          : 'Sem data';
      }

      if (tipoGrafico === 'mes') {
        chave = dataValida
          ? `${String(dataItem.getMonth() + 1).padStart(2, '0')}/${dataItem.getFullYear()}`
          : 'Sem data';
      }

      if (tipoGrafico === 'todos') {
        chave = `${chave} ${index + 1}`;
      }

      acc[chave] = (acc[chave] || 0) + valor;
      return acc;
    }, {});

    return Object.keys(resumo)
      .sort((a, b) => resumo[b] - resumo[a])
      .slice(0, 7)
      .map((chave, index) => ({
        label: chave,
        value: resumo[chave],
        color: CORES_GRAFICO[index % CORES_GRAFICO.length],
      }));
  }, [consumos, tipoGrafico]);

  const maxValue = Math.max(...chartData.map((item) => Number(item.value || 0)), 1);

  // Meta importante calculada dinamicamente
  const metaImportante = useMemo(() => selecionarMetaImportante(metas), [metas]);
  const totalConsumido = useMemo(() => calcularTotalConsumido(consumos), [consumos]);
  React.useEffect(() => {
  async function verificarMetaConcluida() {
    if (carregando) return;
    if (!metaImportante) return;

    const idMeta = pegarIdMeta(metaImportante);
    const valorLimite = Number(metaImportante.valor_limit ?? 0);
    const objetivo = metaImportante.objetivo || 'sua meta';

    if (!idMeta || valorLimite <= 0) return;

    if (totalConsumido >= valorLimite) {
      if (metasAvisadasRef.current.includes(idMeta)) return;

      metasAvisadasRef.current.push(idMeta);

      await salvarMetaConcluidaLocal(idMeta);

      setMetas((anteriores) =>
        anteriores.filter((meta) => pegarIdMeta(meta) !== idMeta)
      );

      setTimeout(() => {
        Alert.alert(
          'Meta concluída! 🎉',
          `Parabéns! Você concluiu a meta "${objetivo}".`
        );
      }, 300);
    }
  }

  verificarMetaConcluida();
}, [carregando, metaImportante, totalConsumido]);

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
          <Header
            carregando={carregando}
            nome={usuario?.nome}
            abrirMenu={() => setMenuAberto(true)}
          />

          <CardsResumo
            metaImportante={metaImportante}
            totalConsumido={totalConsumido}
            carregando={carregando}
          />

          <Text style={styles.sectionTitle}>Resumo do seu consumo</Text>

          <BotoesGrafico tipoGrafico={tipoGrafico} setTipoGrafico={setTipoGrafico} />

          <Grafico chartData={chartData} maxValue={maxValue} />
        </ScrollView>

        <BottomNav router={router} />

        <MenuLateralHome
          aberto={menuAberto}
          fechar={() => setMenuAberto(false)}
          usuario={usuario}
          router={router}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────

function Header({
  carregando,
  nome,
  abrirMenu,
}: {
  carregando: boolean;
  nome?: string;
  abrirMenu: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="leaf" size={24} color="#8CFF8A" />
        </View>

        <View>
          <Text style={styles.title}>
            {carregando ? 'Carregando...' : nome ? `Bem-vindo, ${nome}!` : 'Bem-vindo!'}
          </Text>
          <Text style={styles.brand}>ECO CONTROL</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.circleButton} onPress={abrirMenu}>
        <Feather name="menu" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Cards de resumo (meta importante + card verde)
// ─────────────────────────────────────────────

function CardsResumo({
  metaImportante,
  totalConsumido,
  carregando,
}: {
  metaImportante: MetaApi | null;
  totalConsumido: number;
  carregando: boolean;
}) {
  // Calcula progresso: quanto do valor_limit já foi consumido
  const valorLimit = metaImportante?.valor_limit ?? 0;
  const gastoAtual = Math.min(totalConsumido, valorLimit); // não ultrapassa 100%
  const porcentagem =
    valorLimit > 0 ? Math.round((gastoAtual / valorLimit) * 100) : 0;

  const gastoFormatado = gastoAtual.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const limitFormatado =
    valorLimit > 0
      ? valorLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'R$0,00';

  const dataLimite = formatarData(metaImportante?.data_meta);
  const objetivo = metaImportante?.objetivo ?? null;

  return (
    <View style={styles.topCardsRow}>
      <View style={styles.metaCard}>
        <View style={styles.metaHeader}>
          <Feather name="target" size={18} color="#9BFF81" />
          <Text style={styles.metaTitle}>Meta importante</Text>
        </View>

        {carregando ? (
          // Skeleton enquanto carrega
          <Text style={styles.metaSubtitle}>Carregando...</Text>
        ) : !metaImportante ? (
          // Sem metas cadastradas
          <>
            <Text style={styles.metaSubtitle}>Nenhuma meta</Text>
            <Text style={[styles.metaDate, { marginTop: 8 }]}>
              Cadastre uma meta na aba Metas
            </Text>
          </>
        ) : (
          // Meta dinâmica
          <>
            <Text style={styles.metaSubtitle} numberOfLines={2}>
              {objetivo}
            </Text>

            <Text style={styles.metaMoney}>
              <Text style={styles.metaMoneyStrong}>{gastoFormatado}</Text>
              <Text style={styles.metaMoneySoft}> / {limitFormatado}</Text>
            </Text>

            <View style={styles.progressTrack}>
              {/* Largura da barra proporcional à porcentagem */}
              <View style={[styles.progressFill, { width: `${porcentagem}%` }]} />
              <Text style={styles.progressText}>{porcentagem}%</Text>
            </View>

            <Text style={styles.metaProgressText}>
              {porcentagem}% da meta atingida
            </Text>

            <View style={styles.metaDateRow}>
              <Feather name="calendar" size={15} color="#B8C6BE" />
              <Text style={styles.metaDate}>Data limite: {dataLimite}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.visualCard}>
        <MaterialCommunityIcons name="sprout" size={54} color="#A8FF8A" />
        <Text style={styles.visualText}>
          Pequenas atitudes geram grandes{'\n'}
          <Text style={styles.visualTextHighlight}>transformações.</Text>
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Menu lateral
// ─────────────────────────────────────────────

function MenuLateralHome({
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

          </View>

          <TouchableOpacity onPress={fechar} style={styles.menuCloseButton}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            fechar();
            router.push('/configuracoes');
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

// ─────────────────────────────────────────────
// Botões filtro gráfico
// ─────────────────────────────────────────────

function BotoesGrafico({
  tipoGrafico,
  setTipoGrafico,
}: {
  tipoGrafico: TipoGrafico;
  setTipoGrafico: (tipo: TipoGrafico) => void;
}) {
  return (
    <View style={styles.filtroContainer}>
      {MODOS_GRAFICO.map((item) => {
        const ativo = tipoGrafico === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => setTipoGrafico(item.key)}
            style={[styles.filtroBotao, ativo && styles.filtroBotaoAtivo]}
          >
            <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// Gráfico de barras
// ─────────────────────────────────────────────

function Grafico({
  chartData,
  maxValue,
}: {
  chartData: { label: string; value: number; color: string }[];
  maxValue: number;
}) {
  const semDados =
    chartData.length === 1 && chartData[0].value === 0 && chartData[0].label === 'Água';

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartArea}>
        {semDados ? (
          <View style={styles.semDadosContainer}>
            <MaterialCommunityIcons name="leaf-off" size={40} color="#6B8F7E" />

            <Text style={styles.semDadosTitulo}>Nenhum consumo registrado</Text>

            <Text style={styles.semDadosSub}>
              Comece adicionando seu primeiro consumo para visualizar os dados aqui.
            </Text>
          </View>
        ) : (
          chartData.map((item) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * 95 : 0;

            return (
              <View key={item.label} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {item.value.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>

                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.color,
                    },
                  ]}
                />

                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Bottom nav
// ─────────────────────────────────────────────

function BottomNav({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItemActive}>
        <Ionicons name="home" size={20} color="#7AF46C" />
        <Text style={styles.navTextActive}>Início</Text>
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

      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/metas')}>
        <Feather name="target" size={20} color="#C7D6CE" />
        <Text style={styles.navText}>Metas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => router.push('/documento')}>
        <MaterialCommunityIcons name="file-upload-outline" size={20} color="#C7D6CE" />
        <Text style={styles.navText}>Arquivo</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBottom,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 150,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(120,255,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  brand: {
    color: '#6BE36D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
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

  topCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metaCard: {
    flex: 1.2,
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderRadius: 24,
    padding: 16,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaTitle: {
    color: '#F4FFF4',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  metaSubtitle: {
    color: '#E1ECE4',
    fontSize: 16,
    marginBottom: 14,
  },
  metaMoney: {
    marginBottom: 18,
  },
  metaMoneyStrong: {
    color: '#74F05E',
    fontSize: 20,
    fontWeight: '900',
  },
  metaMoneySoft: {
    color: '#E4ECE6',
    fontSize: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
  },
  progressFill: {
    // width é definido inline com base na porcentagem
    height: '100%',
    backgroundColor: '#6EEB62',
    borderRadius: 999,
  },
  progressText: {
    position: 'absolute',
    right: 10,
    color: '#F7FFF6',
    fontSize: 13,
    fontWeight: '800',
  },
  metaProgressText: {
    color: '#74F05E',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 14,
  },
  metaDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDate: {
    color: '#B8C6BE',
    fontSize: 12,
    marginLeft: 8,
  },
  visualCard: {
    flex: 0.82,
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  visualText: {
    color: '#F2FFF2',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  visualTextHighlight: {
    color: '#7AF46C',
    fontWeight: '900',
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 14,
  },
  filtroContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 6,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  filtroBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filtroBotaoAtivo: {
    backgroundColor: '#7AF46C',
  },
  filtroTexto: {
    color: '#9FB5AA',
    fontSize: 13,
    fontWeight: '700',
  },
  filtroTextoAtivo: {
    color: '#103221',
    fontWeight: '900',
  },

  chartCard: {
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
  },
  chartArea: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  semDadosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  semDadosTitulo: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  semDadosSub: {
    color: '#9BB3A8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    color: '#F0FFF0',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  bar: {
    width: 36,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barLabel: {
    color: '#E5F1E8',
    fontSize: 11,
    marginTop: 10,
  },

  bottomNav: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 38, 28, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
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
});