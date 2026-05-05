import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { API_ROUTES, apiFetch } from '../../services/api';

const BAR_MAX_HEIGHT = 140;

type Periodo = '1mes' | '3meses' | '6meses' | '1ano';

type Usuario = {
  id?: number | string;
  nome?: string;
  email?: string;
  fotoPerfil?: string | null;
};

type Consumo = {
  id_consumos: number;
  tipo: string;
  valor: number;
  data: string;
  id_usuario: number;
  id_meta?: number | null;
};

type DadoGrafico = {
  label: string;
  valor: number;
  tipo: string;
};

const periodoLabels: Record<Periodo, string> = {
  '1mes': '1 mês',
  '3meses': '3 meses',
  '6meses': '6 meses',
  '1ano': '1 ano',
};
function converterDataConsumo(data: string) {
  if (!data) return null;

  if (data.includes('/')) {
    const [dia, mes, ano] = data.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  const somenteData = data.split('T')[0];
  const [ano, mes, dia] = somenteData.split('-');

  if (!ano || !mes || !dia) return null;

  return new Date(Number(ano), Number(mes) - 1, Number(dia));
}
// Agrupa consumos reais por período selecionado
function agruparPorPeriodo(consumos: Consumo[], periodo: Periodo): DadoGrafico[] {
  const agora = new Date();
  let dataInicio: Date;

  // Ajuste para garantir que pegamos desde o início do dia/mês
  if (periodo === '1mes') {
    dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  } else if (periodo === '3meses') {
    dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 2, 1);
  } else if (periodo === '6meses') {
    dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 5, 1);
  } else {
    dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 11, 1);
  }

  const filtrados = consumos.filter((c) => {
    const dataConsumo = converterDataConsumo(c.data);
    // REMOVA o "&& dataConsumo <= agora" para testar ou normalize as horas
    return dataConsumo !== null && dataConsumo >= dataInicio;
  });
  
  // ... resto da função

  if (filtrados.length === 0) return [];

  if (periodo === '1mes') {
    const semanas: Record<string, Record<string, number>> = {};

    filtrados.forEach((c) => {
      const dataConsumo = converterDataConsumo(c.data);
      if (!dataConsumo) return;

      const dia = dataConsumo.getDate();

      let semana = 'Sem 4';

      if (dia <= 7) semana = 'Sem 1';
      else if (dia <= 14) semana = 'Sem 2';
      else if (dia <= 21) semana = 'Sem 3';

      const tipo = c.tipo || 'Consumo';

      if (!semanas[semana]) {
        semanas[semana] = {};
      }

      semanas[semana][tipo] =
        (semanas[semana][tipo] || 0) + Number(c.valor || 0);
    });

    return Object.entries(semanas).flatMap(([semana, tipos]) =>
      Object.entries(tipos).map(([tipo, valor]) => ({
        label: semana,
        tipo,
        valor: parseFloat(valor.toFixed(2)),
      }))
    );
  }

  const mesesNomes = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const mapasMeses: Record<string, Record<string, number>> = {};

  let cursor = new Date(dataInicio);

  while (cursor <= agora) {
    const chave = `${mesesNomes[cursor.getMonth()]}/${cursor.getFullYear()}`;
    mapasMeses[chave] = {};
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  filtrados.forEach((c) => {
    const d = converterDataConsumo(c.data);
    if (!d) return;

    const chave = `${mesesNomes[d.getMonth()]}/${d.getFullYear()}`;
    const tipo = c.tipo || 'Consumo';

    if (mapasMeses[chave] !== undefined) {
      mapasMeses[chave][tipo] =
        (mapasMeses[chave][tipo] || 0) + Number(c.valor || 0);
    }
  });

  return Object.entries(mapasMeses).flatMap(([chave, tipos]) =>
    Object.entries(tipos).map(([tipo, valor]) => ({
      label: chave.split('/')[0],
      tipo,
      valor: parseFloat(valor.toFixed(2)),
    }))
  );
}



export default function AnaliseConsumos() {
  const router = useRouter();

  const [menuAberto, setMenuAberto] = useState(false);
  const [periodoAtivo, setPeriodoAtivo] = useState<Periodo>('1mes');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  async function carregarDados() {
    setCarregando(true);
    await Promise.all([carregarUsuario(), carregarConsumos()]);
    setCarregando(false);
  }

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
      console.log('ERRO AO CARREGAR USUÁRIO:', error);
    }
  }

  async function carregarConsumos() {
    try {
      // Busca o id do usuário de várias fontes possíveis
      const idDireto =
        (await AsyncStorage.getItem('id_usuario')) ||
        (await AsyncStorage.getItem('usuario_id')) ||
        (await AsyncStorage.getItem('user_id'));

      let idUsuario: number | null = idDireto ? Number(idDireto) : null;

      if (!idUsuario) {
        const usuarioSalvo = await AsyncStorage.getItem('usuario');
        if (usuarioSalvo) {
          const u = JSON.parse(usuarioSalvo);
          idUsuario = Number(
            u.id_usuario || u.usuario_id || u.id || u.user_id
          );
        }
      }

      if (!idUsuario) return;

      const resposta = await apiFetch(
        `${API_ROUTES.CONSUMO.LISTAR}?id_usuario=${idUsuario}`
      );
      console.log('CONSUMOS DA ANÁLISE:', resposta);

      const dados: Consumo[] = Array.isArray(resposta) ? resposta : [];
      setConsumos(dados);
    } catch (error) {
      console.log('ERRO AO CARREGAR CONSUMOS:', error);
      setConsumos([]);
    }
  }

  // Calcula os stats em tempo real com base nos consumos reais
  const totalConsumos = consumos.reduce((acc, c) => acc + c.valor, 0);
  const totalRegistros = consumos.length;
  const mediaGasto = totalRegistros > 0 ? totalConsumos / totalRegistros : 0;

  // Gera dados do gráfico baseados nos consumos reais e no período selecionado
  const dados = agruparPorPeriodo(consumos, periodoAtivo);
  const maxValor = dados.length > 0 ? Math.max(...dados.map((d) => d.valor)) : 0;

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
                <Text style={styles.headerSub}>Análise de consumos</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => setMenuAberto(true)}
            >
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.mainCard}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Análise de seus consumos</Text>
            </View>

            {carregando ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6EE86A" />
                <Text style={styles.loadingText}>Carregando dados...</Text>
              </View>
            ) : (
              <>
                {/* STATS */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total de{'\n'}consumos</Text>
                    <View style={styles.statIconWrap}>
                      <Ionicons name="cash-outline" size={20} color="#F5B731" />
                    </View>
                    <Text style={styles.statValueYellow}>
                      R${totalConsumos.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  <View style={[styles.statBox, styles.statBoxCenter]}>
                    <Text style={[styles.statLabel, styles.statLabelBlue]}>
                      Registros
                    </Text>
                    <View style={[styles.statIconWrap, styles.statIconBlue]}>
                      <Ionicons name="document-text-outline" size={20} color="#5BC4F5" />
                    </View>
                    <Text style={styles.statValueBlue}>{totalRegistros}</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Média de{'\n'}gasto</Text>
                    <View style={styles.statIconWrap}>
                      <Ionicons name="calculator-outline" size={20} color="#F5B731" />
                    </View>
                    <Text style={styles.statValueYellow}>
                      R${mediaGasto.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* GRÁFICO */}
                <View style={styles.chartSection}>
                  <View style={styles.chartHeaderRow}>
                    <View style={styles.chartTitleWrap}>
                      <Ionicons name="bar-chart" size={16} color="#6EE86A" />
                      <Text style={styles.chartTitle}>Consumo por período</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.verRegistrosBtn}
                      onPress={() => router.push('/consumo/listagem-consumos' as any)}
                    >
                      <Text style={styles.verRegistrosText}>Ver registros</Text>
                      <Ionicons name="chevron-forward" size={14} color="#6EE86A" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsScroll}
                    contentContainerStyle={styles.tabsContent}
                  >
                    {(Object.keys(periodoLabels) as Periodo[]).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.tab, periodoAtivo === p && styles.tabActive]}
                        onPress={() => setPeriodoAtivo(p)}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            periodoAtivo === p && styles.tabTextActive,
                          ]}
                        >
                          {periodoLabels[p]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {dados.length === 0 ? (
                    <View style={styles.emptyChart}>
                      <MaterialCommunityIcons
                        name="chart-bar"
                        size={40}
                        color="rgba(110,232,106,0.20)"
                      />
                      <Text style={styles.emptyChartText}>
                        Nenhum consumo neste período
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.chartArea}>
                      <View style={styles.yAxis}>
                        {[
                          maxValor,
                          parseFloat((maxValor * 0.66).toFixed(2)),
                          parseFloat((maxValor * 0.33).toFixed(2)),
                          0,
                        ].map((v, i) => (
                          <Text key={i} style={styles.yLabel}>
                            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                          </Text>
                        ))}
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.barsContainer}
                      >
                        {dados.map((item, idx) => {
                          const barH = Math.max(
                            8,
                            (item.valor / maxValor) * BAR_MAX_HEIGHT
                          );
                          const isMax = item.valor === maxValor;

                          return (
                            <View key={idx} style={styles.barWrap}>
                              <Text style={styles.barValueLabel}>
                                {item.valor >= 1000
                                  ? `${(item.valor / 1000).toFixed(1)}k`
                                  : item.valor}
                              </Text>

                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.bar,
                                    { height: barH },
                                    isMax && styles.barHighlight,
                                  ]}
                                />
                              </View>

                              <Text style={styles.barXLabel}>{item.tipo}</Text>
                              <Text style={styles.barPeriodLabel}>{item.label}</Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Maior gasto</Text>
                      <Text style={styles.summaryValue}>
                        {maxValor > 0
                          ? `R$${maxValor.toFixed(2).replace('.', ',')}`
                          : 'R$0,00'}
                      </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Período</Text>
                      <Text style={styles.summaryValue}>
                        {periodoLabels[periodoAtivo]}
                      </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Registros</Text>
                      <Text style={styles.summaryValue}>{dados.length}</Text>
                    </View>
                  </View>
                </View>
              </>
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
            <Ionicons name="bar-chart" size={20} color="#7AF46C" />
            <Text style={styles.navTextActive}>Consumo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCenterButton}
            onPress={() => router.push('/consumo/registro-consumo')}
          >
            <Feather name="plus" size={26} color="#103221" />
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
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={20}
              color="#C7D6CE"
            />
            <Text style={styles.navText}>Arquivo</Text>
          </TouchableOpacity>
        </View>

        <MenuLateralPerfil
          aberto={menuAberto}
          fechar={() => setMenuAberto(false)}
          usuario={usuario}
          router={router}
        />
      </LinearGradient>
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
              <Image
                source={{ uri: usuario.fotoPerfil }}
                style={styles.menuAvatarImage}
              />
            ) : (
              <MaterialCommunityIcons name="leaf" size={26} color="#8CFF8A" />
            )}
          </View>

          <View style={styles.menuUserInfo}>
            <Text style={styles.menuNome}>{usuario?.nome || 'Usuário'}</Text>
            <Text style={styles.menuEmail}>
              {usuario?.email || 'usuario@email.com'}
            </Text>
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
    marginBottom: 16,
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

  mainCard: {
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.14)',
    overflow: 'hidden',
  },

  cardTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(110,232,106,0.08)',
  },

  cardTitle: {
    color: '#F0FFF4',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },

  loadingText: {
    color: '#7AAF90',
    fontSize: 13,
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },

  statBox: {
    flex: 1,
    backgroundColor: 'rgba(18, 55, 40, 0.70)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.10)',
    padding: 12,
    alignItems: 'flex-start',
    gap: 6,
  },

  statBoxCenter: {
    borderColor: 'rgba(91,196,245,0.20)',
    backgroundColor: 'rgba(15, 50, 70, 0.60)',
  },

  statLabel: {
    color: '#B8E8C4',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  statLabelBlue: {
    color: '#90D4F5',
  },

  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(245,183,49,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,183,49,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIconBlue: {
    backgroundColor: 'rgba(91,196,245,0.12)',
    borderColor: 'rgba(91,196,245,0.20)',
  },

  statValueYellow: {
    color: '#F5B731',
    fontSize: 14,
    fontWeight: '800',
  },

  statValueBlue: {
    color: '#5BC4F5',
    fontSize: 26,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(110,232,106,0.08)',
    marginHorizontal: 0,
  },

  chartSection: {
    padding: 14,
  },

  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  chartTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  chartTitle: {
    color: '#F0FFF4',
    fontSize: 14,
    fontWeight: '800',
  },

  verRegistrosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(110,232,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 2,
  },

  verRegistrosText: {
    color: '#6EE86A',
    fontSize: 12,
    fontWeight: '700',
  },

  tabsScroll: {
    marginBottom: 14,
  },

  tabsContent: {
    gap: 8,
    paddingRight: 4,
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  tabActive: {
    backgroundColor: '#6EE86A',
    borderColor: '#6EE86A',
  },

  tabText: {
    color: '#7AAF90',
    fontSize: 12,
    fontWeight: '600',
  },

  tabTextActive: {
    color: '#0D2B22',
    fontWeight: '800',
  },

  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
    backgroundColor: 'rgba(5,30,22,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.08)',
    marginBottom: 14,
  },

  emptyChartText: {
    color: '#7AAF90',
    fontSize: 13,
    fontWeight: '600',
  },

  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    backgroundColor: 'rgba(5,30,22,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.08)',
    padding: 12,
  },

  yAxis: {
    height: BAR_MAX_HEIGHT + 20,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginRight: 8,
    paddingBottom: 18,
  },

  yLabel: {
    color: '#7AAF90',
    fontSize: 10,
    fontWeight: '500',
    width: 32,
    textAlign: 'right',
  },

  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingBottom: 0,
  },

  barWrap: {
    alignItems: 'center',
    gap: 4,
  },

  barValueLabel: {
    color: '#A8F5A0',
    fontSize: 10,
    fontWeight: '700',
  },

  barTrack: {
    width: 28,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },

  bar: {
    width: 28,
    borderRadius: 8,
    backgroundColor: '#6EE86A',
    opacity: 0.82,
  },

  barHighlight: {
    opacity: 1,
    backgroundColor: '#A8F5A0',
  },

  barXLabel: {
    color: '#7AAF90',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  barPeriodLabel: {
  color: '#5F9F7A',
  fontSize: 9,
  fontWeight: '600',
  marginTop: -2,
},

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,55,40,0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(110,232,106,0.10)',
    padding: 12,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(110,232,106,0.12)',
    marginVertical: 2,
  },

  summaryLabel: {
    color: '#7AAF90',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  summaryValue: {
    color: '#F0FFF4',
    fontSize: 13,
    fontWeight: '800',
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