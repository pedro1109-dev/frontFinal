import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ROUTES, apiFetch } from '../../services/api';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';

// label = valor enviado ao backend (já em lowercase, como o validador espera após .lower())
// display = texto exibido ao usuário
const unidadesConsumo = [
  { label: 'l',   display: 'L',    descricao: 'Litros (Água)',       icon: 'water-outline', color: '#6EDBFF' },
  { label: 'm3',  display: 'm³',   descricao: 'Metro cúbico (Água)', icon: 'water-outline', color: '#6EDBFF' },
  { label: 'kwh', display: 'kWh',  descricao: 'Quilowatt-hora',      icon: 'flash-outline', color: '#FFD84D' },
  { label: 'm3g', display: 'm³g',  descricao: 'Metro cúbico (Gás)',  icon: 'flame-outline', color: '#FF7A59' },
] as const;

type Usuario = {
  nome?: string;
  email?: string;
  fotoPerfil?: string | null;
};

type MetaOption = {
  id: number;
  objetivo: string;
  valorLimite: string;
  dataFinal: string;
};

export default function RegistroConsumo() {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [unidade, setUnidade] = useState('l');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [abrirTipos, setAbrirTipos] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  // ── NOVIDADE: estado para metas e seleção ──────────────────────────
  const [metas, setMetas] = useState<MetaOption[]>([]);
  const [metaSelecionada, setMetaSelecionada] = useState<MetaOption | null>(null);
  const [abrirMetas, setAbrirMetas] = useState(false);
  // ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    carregarUsuario();
    carregarMetas();
  }, []);

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

  // ── NOVIDADE: busca as metas do usuário na API ──────────────────────
  async function carregarMetas() {
    try {
      const usuarioId =
        await AsyncStorage.getItem('usuario_id') ||
        await AsyncStorage.getItem('id_usuario') ||
        await AsyncStorage.getItem('user_id');

      if (!usuarioId) return;

      const dados = await apiFetch(
        `${API_ROUTES.METAS.LISTAR}?id_usuario=${usuarioId}`
      );

      const lista: MetaOption[] = (dados || []).map((item: any) => {
        const id = Number(
          item.id_metas ?? item.id ?? item.meta_id ?? item.id_meta ?? item.metas_id
        );
        const numero = Number(item.valor_limit || 0);
        const valorFmt = numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let dataFmt = '';
        if (item.data_meta) {
          const d = new Date(item.data_meta);
          dataFmt = Number.isNaN(d.getTime())
            ? item.data_meta
            : d.toLocaleDateString('pt-BR');
        }

        return {
          id,
          objetivo: item.objetivo || 'Sem objetivo',
          valorLimite: valorFmt,
          dataFinal: dataFmt,
        };
      });

      setMetas(lista);
    } catch (error) {
      console.log('ERRO AO CARREGAR METAS:', error);
    }
  }
  // ──────────────────────────────────────────────────────────────────

  function selecionarUnidade(novaUnidade: string) {
    setUnidade(novaUnidade);
    setAbrirTipos(false);
  }

  function formatarData(dataValor: Date) {
    const dia = String(dataValor.getDate()).padStart(2, '0');
    const mes = String(dataValor.getMonth() + 1).padStart(2, '0');
    const ano = dataValor.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataWebParaBr(valorData: string) {
    if (!valorData) return '';
    const [ano, mes, dia] = valorData.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function formatarMoeda(texto: string) {
    const numeros = texto.replace(/\D/g, '');
    if (!numeros) return '';
    const valorNumerico = Number(numeros) / 100;
    return valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatarDataBrParaWeb(valorBr: string) {
    if (!valorBr || valorBr.length !== 10) return '';
    const [dia, mes, ano] = valorBr.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarDataBrParaISO(data: string) {
  const [dia, mes, ano] = data.split('/');
  return `${ano}-${mes}-${dia}`;
  }

  async function buscarIdUsuario() {
    const idDireto =
      await AsyncStorage.getItem('id_usuario') ||
      await AsyncStorage.getItem('usuario_id') ||
      await AsyncStorage.getItem('user_id');

    if (idDireto) return Number(idDireto);

    const usuarioSalvo = await AsyncStorage.getItem('usuario');
    if (usuarioSalvo) {
      const usuario = JSON.parse(usuarioSalvo);
      return Number(
        usuario.id_usuario || usuario.usuario_id || usuario.id || usuario.user_id
      );
    }
    return null;
  }

  async function registrarConsumo() {
    if (!unidade || !valor) {
      Alert.alert('Preencha a unidade e o valor');
      return;
    }

    try {
      const idUsuario = await buscarIdUsuario();
      if (!idUsuario) {
        Alert.alert('Usuário não encontrado. Faça login novamente.');
        return;
      }

      // Converte o valor formatado em pt-BR ("1.234,56") para número puro
      const valorNumerico = Number(valor.replace(/\./g, '').replace(',', '.'));

      await apiFetch(API_ROUTES.CONSUMO.CRIAR, {
        method: 'POST',
        body: JSON.stringify({
          valor: valorNumerico,
          unidade: unidade,
          data: formatarDataBrParaISO(data), // enviado direto — backend faz .lower() e infere o tipo
          id_usuario: Number(idUsuario),
          id_meta: metaSelecionada ? metaSelecionada.id : null,
        }),
      });

      setMensagemSucesso(true);

      setTimeout(() => {
        setMensagemSucesso(false);
        setValor('');
        setData('');
        setMetaSelecionada(null);
        router.replace('/(tabs)/home');
      }, 1200);
    } catch (error: any) {
      console.log('ERRO COMPLETO:', error);
      Alert.alert(JSON.stringify(error?.data || error?.message || error, null, 2));
    }
  }

  const unidadeSelecionada =
    unidadesConsumo.find((item) => item.label === unidade) || unidadesConsumo[0];

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
                <MaterialCommunityIcons name="leaf" size={22} color="#8CFF8A" />
              </View>
              <View>
                <Text style={styles.headerBrand}>ECO CONTROL</Text>
                <Text style={styles.headerTitle}>Registro de consumos</Text>
              </View>
            </View> 

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuAberto(true)}
            >
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.mainCard}>
            <View style={styles.formHeaderCard}>
              <View style={styles.formHeaderIcon}>
                <Ionicons name="document-text-outline" size={30} color="#8CFF8A" />
              </View>
              <Text style={styles.formHeaderText}>
                Registre um{'\n'}
                <Text style={styles.formHeaderHighlight}>consumo:</Text>
              </Text>
            </View>

            <View style={styles.formCard}>
              {/* ── Unidade ─────────────────────────────────────────── */}
              <Text style={styles.label}>Unidade:</Text>
              <View style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  activeOpacity={0.9}
                  onPress={() => { setAbrirTipos(!abrirTipos); setAbrirMetas(false); }}
                >
                  <View style={styles.dropdownLeft}>
                    <Ionicons
                      name={unidadeSelecionada.icon}
                      size={20}
                      color={unidadeSelecionada.color}
                    />
                    <Text style={styles.dropdownText}>{unidadeSelecionada.display}</Text>
                  </View>
                  <Feather
                    name={abrirTipos ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#E7F2EA"
                  />
                </TouchableOpacity>

                {abrirTipos && (
                  <View style={styles.dropdownMenu}>
                    {unidadesConsumo.map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={styles.dropdownItem}
                        onPress={() => selecionarUnidade(item.label)}
                      >
                        <Ionicons name={item.icon} size={19} color={item.color} />
                        <View>
                          <Text style={styles.dropdownItemText}>{item.display}</Text>
                          <Text style={[styles.dropdownItemText, { fontSize: 11, color: '#8AADA0', marginLeft: 0, marginTop: 1 }]}>{item.descricao}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* ── Valor ──────────────────────────────────────────── */}
              <Text style={styles.label}>Valor:</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputPrefix}>R$</Text>
                <TextInput
                  value={valor}
                  onChangeText={(texto) => setValor(formatarMoeda(texto))}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              {/* ── Data ───────────────────────────────────────────── */}
              <Text style={styles.label}>Data:</Text>

              {Platform.OS === 'web' ? (
                <View style={styles.inputBox}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#8CFF8A"
                    style={styles.inputIcon}
                  />
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={formatarDataBrParaWeb(data)}
                    onChange={(e) => {
                      setData(formatarDataWebParaBr((e.target as HTMLInputElement).value));
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#F3FFF2',
                      fontSize: '15px',
                    }}
                  />
                  

                </View>
              ) : (
                <TouchableOpacity
                  style={styles.inputBox}
                  activeOpacity={0.9}
                  onPress={() => setMostrarCalendario(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#8CFF8A"
                    style={styles.inputIcon}
                  />
                  <Text
                    style={[
                      styles.input,
                      { color: data ? '#F3FFF2' : theme.colors.placeholder },
                    ]}
                  >
                    {data || 'Selecione uma data'}
                  </Text>
                  <Feather name="calendar" size={18} color="#E7F2EA" />
                </TouchableOpacity>
              )}

              {/* ── NOVIDADE: Associar Meta (opcional) ─────────────── */}
              <Text style={styles.label}>
                Meta associada:{' '}
                <Text style={styles.labelOptional}>(opcional)</Text>
              </Text>

              <View style={[styles.dropdownWrapper, { zIndex: 9 }]}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    metaSelecionada && styles.dropdownButtonActive,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => { setAbrirMetas(!abrirMetas); setAbrirTipos(false); }}
                >
                  <View style={styles.dropdownLeft}>
                    <Feather
                      name="target"
                      size={18}
                      color={metaSelecionada ? '#7AF46C' : '#C7D6CE'}
                    />
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: metaSelecionada ? '#F1FFF0' : '#8AADA0' },
                      ]}
                      numberOfLines={1}
                    >
                      {metaSelecionada
                        ? metaSelecionada.objetivo
                        : 'Nenhuma meta selecionada'}
                    </Text>
                  </View>
                  <Feather
                    name={abrirMetas ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#E7F2EA"
                  />
                </TouchableOpacity>

                {abrirMetas && (
                  <View style={styles.dropdownMenu}>
                    {/* Opção "Nenhuma" para limpar associação */}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setMetaSelecionada(null);
                        setAbrirMetas(false);
                      }}
                    >
                      <Feather name="x-circle" size={17} color="#C7D6CE" />
                      <Text style={[styles.dropdownItemText, { color: '#8AADA0' }]}>
                        Nenhuma
                      </Text>
                    </TouchableOpacity>

                    {metas.length === 0 ? (
                      <View style={styles.metaEmptyItem}>
                        <Text style={styles.metaEmptyText}>
                          Nenhuma meta cadastrada
                        </Text>
                      </View>
                    ) : (
                      metas.map((meta) => (
                        <TouchableOpacity
                          key={meta.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setMetaSelecionada(meta);
                            setAbrirMetas(false);
                          }}
                        >
                          <Feather name="target" size={17} color="#7AF46C" />
                          <View style={styles.metaOptionInfo}>
                            <Text style={styles.dropdownItemText} numberOfLines={1}>
                              {meta.objetivo}
                            </Text>
                            <Text style={styles.metaOptionSub}>
                              {meta.valorLimite} • {meta.dataFinal}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Badge da meta selecionada */}
              {metaSelecionada && (
                <View style={styles.metaBadge}>
                  <View style={styles.metaBadgeLeft}>
                    <View style={styles.metaBadgeIconCircle}>
                      <Feather name="target" size={14} color="#7AF46C" />
                    </View>
                    <View>
                      <Text style={styles.metaBadgeTitle} numberOfLines={1}>
                        {metaSelecionada.objetivo}
                      </Text>
                      <Text style={styles.metaBadgeSub}>
                        Limite: {metaSelecionada.valorLimite} • Até {metaSelecionada.dataFinal}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMetaSelecionada(null)}
                    style={styles.metaBadgeRemove}
                  >
                    <Feather name="x" size={15} color="#8AADA0" />
                  </TouchableOpacity>
                </View>
              )}
              {/* ─────────────────────────────────────────────────── */}
             {/* Botão Registrar */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={registrarConsumo}
            >
              <Text style={styles.registerButtonText}>Registrar</Text>
            </TouchableOpacity>
          </View>

            {mensagemSucesso && (
              <View style={styles.successCard}>
                <View style={styles.successLeft}>
                  <View style={styles.successIconCircle}>
                    <Feather name="check" size={20} color="#8CFF8A" />
                  </View>
                  <Text style={styles.successText}>
                    Consumo cadastrado{'\n'}com sucesso!
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="leaf"
                  size={30}
                  color="rgba(140,255,138,0.20)"
                />
              </View>
            )}
          </View>
        </ScrollView>

        {mostrarCalendario && Platform.OS !== 'web' && (
          <DateTimePicker
            value={dataSelecionada}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setMostrarCalendario(false);
              if (selectedDate) {
                setDataSelecionada(selectedDate);
                setData(formatarData(selectedDate));
              }
            }}
          />
        )}
        
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/home')}
          >
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

          <TouchableOpacity style={styles.navCenterButton}>
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
    paddingBottom: 130,
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
  headerTitle: {
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
  mainCard: {
    backgroundColor: 'rgba(7, 47, 40, 0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(120, 255, 140, 0.12)',
    padding: 14,
  },
  formHeaderCard: {
    backgroundColor: 'rgba(12, 58, 50, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.10)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  formHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(120,255,140,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formHeaderText: {
    color: '#F5FFF4',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  formHeaderHighlight: {
    color: '#7AF46C',
  },
  formCard: {
  backgroundColor: 'rgba(5, 53, 49, 0.76)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(120,255,140,0.10)',
  padding: 14,
  marginBottom: 14,
  flex: 1, // Garantir que o card de formulário tenha flex para distribuir bem os elementos
},
  label: {
    color: '#F1FFF0',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 2,
  },
  // ── NOVIDADE: label opcional ──────────────────────────────────────
  labelOptional: {
    color: '#8AADA0',
    fontSize: 12,
    fontWeight: '600',
  },
  // ──────────────────────────────────────────────────────────────────
 // Aumentar o z-index da parte de "Meta associada" e diminuir o do botão "Registrar"
dropdownWrapper: {
  marginBottom: 14,
  position: 'relative',
  zIndex: 12, // Aumentamos o z-index aqui
},

dropdownButton: {
  height: 54,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(120,255,140,0.22)',
  backgroundColor: 'rgba(4, 39, 37, 0.92)',
  paddingHorizontal: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 21,  // Garantir que o botão de selecionar meta tenha um z-index maior
},

registerButton: {
  height: 60,
  borderRadius: 50,
  backgroundColor: '#7AF46C',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
  shadowColor: '#7AF46C',
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 8,
  zIndex: 5,  // O botão "Registrar" tem z-index menor agora
},

  // ── NOVIDADE: botão ativo quando meta selecionada ─────────────────
  dropdownButtonActive: {
    borderColor: 'rgba(122,244,108,0.45)',
    backgroundColor: 'rgba(4, 44, 38, 0.96)',
  },
  // ──────────────────────────────────────────────────────────────────
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dropdownText: {
    color: '#F1FFF0',
    fontSize: 15,
    marginLeft: 10,
    fontWeight: '600',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(4, 39, 37, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.22)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItemText: {
    color: '#F1FFF0',
    fontSize: 15,
    marginLeft: 10,
  },
  // ── NOVIDADE: estilos para o seletor de meta ──────────────────────
  metaOptionInfo: {
    marginLeft: 10,
    flex: 1,
  },
  metaOptionSub: {
    color: '#8AADA0',
    fontSize: 11,
    marginTop: 1,
  },
  metaEmptyItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metaEmptyText: {
    color: '#8AADA0',
    fontSize: 13,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(122,244,108,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.20)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: -4,
    marginBottom: 4,
  },
  metaBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  metaBadgeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(122,244,108,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metaBadgeTitle: {
    color: '#F1FFF0',
    fontSize: 13,
    fontWeight: '700',
  },
  metaBadgeSub: {
    color: '#8AADA0',
    fontSize: 11,
    marginTop: 2,
  },
  metaBadgeRemove: {
    padding: 4,
  },
  // ──────────────────────────────────────────────────────────────────
  inputBox: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.22)',
    backgroundColor: 'rgba(4, 39, 37, 0.92)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputPrefix: {
    color: '#7AF46C',
    fontSize: 17,
    fontWeight: '900',
    marginRight: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F3FFF2',
    fontSize: 15,
  },
  registerButtonText: {
    color: '#123220',
    fontSize: 20,
    fontWeight: '900',
  },
  successCard: {
    height: 78,
    borderRadius: 20,
    backgroundColor: 'rgba(8, 42, 38, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.10)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successText: {
    color: '#F1FFF0',
    fontSize: 13,
    lineHeight: 18,
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
    width: 58,
    height: 58,
    borderRadius: 28,
    backgroundColor: '#7AF46C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    shadowColor: '#7AF46C',
    shadowOpacity: 1.2,
    shadowRadius: 10,
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