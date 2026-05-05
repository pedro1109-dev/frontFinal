import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { API_ROUTES,apiFetch } from '../../services/api';
import { theme } from '../../constants/theme';

type ArquivoSelecionado = {
  name: string;
  uri: string;
  mimeType?: string;
  size?: number;
};

type ResultadoAnalise = {
  id: string;
  titulo: string;
  dataCriacao: string;
  oculto: boolean;
  consumo: string;
  valor: string;
  vencimento: string;
  distribuidora: string;
  unidade: string;
  mesReferencia: string;
  tipoFatura: string;
  estimativaProximoMes: string;
  estimativaValorProximo: string;
  nivelLabel: string;
};

type ResumoUsuario = {
  agua?: any;
  energia?: any;
};
type Usuario = {
  nome?: string;
  email?: string;
  fotoPerfil?: string | null;
};

export default function DocumentosScreen() {
  const router = useRouter();

  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [arquivo, setArquivo] = useState<ArquivoSelecionado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<ResultadoAnalise[]>([]);
  const [resumo, setResumo] = useState<ResumoUsuario | null>(null);
  const [convertendo, setConvertendo] = useState<string | null>(null);
  const [jaConvertidos, setJaConvertidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarUsuario();
    iniciarTela();
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

  async function iniciarTela() {
    try {
      const idUsuario = await buscarIdUsuario();

      if (!idUsuario) return;

      await carregarHistoricoLocal(idUsuario);
      await carregarResumo(idUsuario);
      await carregarConvertidos(idUsuario);
    } catch (error) {
      console.log('ERRO AO INICIAR TELA:', error);
    }
  }

  async function carregarResumo(idUsuario: number) {
    try {
      const response = await apiFetch(API_ROUTES.OCR.RESUMO(idUsuario));
      setResumo(response || null);
    } catch (error) {
      console.log('ERRO AO CARREGAR RESUMO:', error);
      setResumo(null);
    }
  }

  async function carregarConvertidos(idUsuario: number) {
    try {
      const chave = `convertidos_${idUsuario}`;
      const salvo = await AsyncStorage.getItem(chave);
      if (salvo) {
        setJaConvertidos(new Set(JSON.parse(salvo)));
      }
    } catch (error) {
      console.log('ERRO AO CARREGAR CONVERTIDOS:', error);
    }
  }

  async function salvarConvertidos(idUsuario: number, ids: Set<string>) {
    const chave = `convertidos_${idUsuario}`;
    await AsyncStorage.setItem(chave, JSON.stringify([...ids]));
  }

  async function converterParaConsumo(idLeitura: string) {
    try {
      setConvertendo(idLeitura);

      const idUsuario = await buscarIdUsuario();
      if (!idUsuario) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        return;
      }

      await apiFetch(API_ROUTES.OCR.CONVERTER(Number(idLeitura)), {
        method: 'POST',
      });

      const novosConvertidos = new Set(jaConvertidos);
      novosConvertidos.add(idLeitura);
      setJaConvertidos(novosConvertidos);
      await salvarConvertidos(idUsuario, novosConvertidos);

      Alert.alert('Sucesso', 'Consumo registrado com sucesso!');
    } catch (error: any) {
      // Se o backend retornar 400, o consumo desse mês já existe no banco.
      // Marcamos localmente como convertido para o botão sumir e não confundir o usuário.
      if (error?.status === 400) {
        const idUsuario = await buscarIdUsuario();
        const novosConvertidos = new Set(jaConvertidos);
        novosConvertidos.add(idLeitura);
        setJaConvertidos(novosConvertidos);
        if (idUsuario) await salvarConvertidos(idUsuario, novosConvertidos);

        const mensagem = error?.data?.detail || 'Este consumo já foi registrado anteriormente.';
        Alert.alert('Aviso', mensagem);
      } else {
        const mensagem =
          error?.data?.detail || error?.message || 'Erro ao converter para consumo.';
        Alert.alert('Erro', mensagem);
      }
    } finally {
      setConvertendo(null);
    }
  }

  async function carregarHistoricoLocal(idUsuario: number) {
    try {
      const chave = `historico_analises_${idUsuario}`;
      const salvo = await AsyncStorage.getItem(chave);

      if (salvo) {
        setHistorico(JSON.parse(salvo));
      } else {
        setHistorico([]);
      }
    } catch (error) {
      console.log('ERRO AO CARREGAR HISTÓRICO:', error);
      setHistorico([]);
    }
  }

  async function salvarHistoricoLocal(
    idUsuario: number,
    novoHistorico: ResultadoAnalise[]
  ) {
    const chave = `historico_analises_${idUsuario}`;
    await AsyncStorage.setItem(chave, JSON.stringify(novoHistorico));
  }

  function dataHojeFormatada() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    return `${dia}/${mes}/${ano}`;
  }

  async function escolherArquivo() {
    const resposta = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (resposta.canceled) return;

    const file = resposta.assets[0];

    setArquivo({
      name: file.name,
      uri: file.uri,
      mimeType: file.mimeType || 'image/jpeg',
      size: file.size,
    });
  }

  function tratarResultado(response: any): ResultadoAnalise {
    const dados = response?.dados_extraidos || {};
    const analise = response?.analise || {};
    const data = dataHojeFormatada();

    return {
      id: String(response?.id_leitura || Date.now()),
      titulo: `Análise ${data}`,
      dataCriacao: data,
      oculto: false,

      consumo:
        dados?.consumo !== undefined && dados?.consumo !== null
          ? `${dados.consumo} ${dados.unidade || ''}`
          : 'Não encontrado',

      valor:
        dados?.total !== undefined && dados?.total !== null
          ? Number(dados.total).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : 'Não encontrado',

      vencimento: dados?.vencimento || 'Não encontrado',

      distribuidora:
        dados?.concessionaria || dados?.distribuidora || 'Não encontrado',

      unidade: dados?.unidade || 'Não encontrado',

      mesReferencia: dados?.mes_referencia || 'Não encontrado',

      tipoFatura: dados?.tipo_fatura || 'Não encontrado',

      estimativaProximoMes:
        analise?.estimativa_proximo_mes !== undefined &&
        analise?.estimativa_proximo_mes !== null
          ? `${analise.estimativa_proximo_mes}`
          : 'Não encontrado',

      estimativaValorProximo:
        analise?.estimativa_valor_proximo_mes !== undefined &&
        analise?.estimativa_valor_proximo_mes !== null
          ? Number(analise.estimativa_valor_proximo_mes).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : 'Não encontrado',

      nivelLabel:
        analise?.nivel_label ||
        analise?.classificacao ||
        analise?.nivel ||
        'Não encontrado',
    };
  }

  async function analisarDocumento() {
    if (!arquivo) {
      Alert.alert('Atenção', 'Selecione uma conta de energia primeiro.');
      return;
    }

    try {
      setCarregando(true);

      const idUsuario = await buscarIdUsuario();

      if (!idUsuario) {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        router.replace('/(auth)/login');
        return;
      }

      const formData = new FormData();

      formData.append('id_usuario', String(idUsuario));

      const arquivoBlob = await fetch(arquivo.uri).then((res) => res.blob());

      formData.append('file', arquivoBlob, arquivo.name || 'conta.jpg');

      const response = await apiFetch(API_ROUTES.OCR.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      const novaAnalise = tratarResultado(response);
      const novoHistorico = [novaAnalise, ...historico];

      setHistorico(novoHistorico);
      await salvarHistoricoLocal(idUsuario, novoHistorico);
      await carregarResumo(idUsuario);

      Alert.alert('Sucesso', 'Documento analisado e salvo no histórico.');
    } catch (error: any) {
      console.log('ERRO AO ANALISAR DOCUMENTO:', error);

      Alert.alert(
        'Erro ao analisar',
        JSON.stringify(error?.data || error?.message || error, null, 2)
      );
    } finally {
      setCarregando(false);
    }
  }

  async function alternarOcultarAnalise(id: string) {
    const idUsuario = await buscarIdUsuario();

    if (!idUsuario) return;

    const novoHistorico = historico.map((item) =>
      item.id === id ? { ...item, oculto: !item.oculto } : item
    );

    setHistorico(novoHistorico);
    await salvarHistoricoLocal(idUsuario, novoHistorico);
  }

  function renderResumoTipo(nome: string, dados: any) {
    if (!dados || dados?.mensagem) {
      return (
        <View style={styles.resumoItem}>
          <Text style={styles.resultLabel}>{nome}</Text>
          <Text style={styles.resumoText}>Nenhuma leitura disponível</Text>
        </View>
      );
    }

    return (
      <View style={styles.resumoItem}>
        <Text style={styles.resultLabel}>{nome}</Text>
        <Text style={styles.resumoText}>Faturas: {dados.total_faturas}</Text>
        <Text style={styles.resumoText}>
          Média consumo: {dados.media_consumo} {dados.unidade}
        </Text>
        <Text style={styles.resumoText}>
          Média valor:{' '}
          {Number(dados.media_valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </Text>
        <Text style={styles.resumoText}>
          Tendência: {dados.tendencia || 'Sem dados'}
        </Text>
        <Text style={styles.resumoText}>
          Nível: {dados.nivel_label || 'Sem classificação'}
        </Text>
      </View>
    );
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
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={22}
                  color="#8CFF8A"
                />
              </View>

              <View>
                <Text style={styles.headerBrand}>ECO CONTROL</Text>
                <Text style={styles.headerTitle}>Análise de documento</Text>
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
            <View style={styles.uploadCard}>
              <Text style={styles.cardTitle}>Upload de arquivo</Text>
              <Text style={styles.cardSubtitle}>
                Envie uma conta de energia em PDF, PNG ou JPG.
              </Text>

              <TouchableOpacity style={styles.uploadBox} onPress={escolherArquivo}>
                <Feather name="upload-cloud" size={58} color="#7AF46C" />
                <Text style={styles.uploadText}>
                  {arquivo ? arquivo.name : 'Selecionar arquivo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={analisarDocumento}
                disabled={carregando}
              >
                {carregando ? (
                  <ActivityIndicator color="#103221" />
                ) : (
                  <Text style={styles.submitButtonText}>Analisar documento</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.analysisCard}>
              <View style={styles.analysisHeader}>
                <Text style={styles.cardTitle}>Resumo geral</Text>
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={22}
                  color="#7AF46C"
                />
              </View>

              {renderResumoTipo('Água', resumo?.agua)}
              {renderResumoTipo('Energia', resumo?.energia)}
            </View>

            <View style={styles.analysisCard}>
              <View style={styles.analysisHeader}>
                <Text style={styles.cardTitle}>Histórico de análises</Text>
                <MaterialCommunityIcons name="history" size={22} color="#7AF46C" />
              </View>

              {historico.length === 0 ? (
                <View style={styles.emptyResult}>
                  <Feather
                    name="file-text"
                    size={42}
                    color="rgba(199,214,206,0.45)"
                  />
                  <Text style={styles.emptyText}>
                    As análises feitas pelo usuário aparecerão aqui.
                  </Text>
                </View>
              ) : (
                <View style={styles.resultBox}>
                  {historico.map((item) => (
                    <View key={item.id} style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyTitle}>{item.titulo}</Text>
                          <Text style={styles.historyDate}>
                            Salvo em {item.dataCriacao}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.hideButton}
                          onPress={() => alternarOcultarAnalise(item.id)}
                        >
                          <Feather
                            name={item.oculto ? 'eye' : 'eye-off'}
                            size={18}
                            color="#7AF46C"
                          />
                        </TouchableOpacity>
                      </View>

                      {!item.oculto && (
                        <>
                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Consumo</Text>
                            <Text style={styles.resultValue}>{item.consumo}</Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Valor da conta</Text>
                            <Text style={styles.resultValue}>{item.valor}</Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Vencimento</Text>
                            <Text style={styles.resultValue}>{item.vencimento}</Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Distribuidora</Text>
                            <Text style={styles.resultValue}>{item.distribuidora}</Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Mês referência</Text>
                            <Text style={styles.resultValue}>
                              {item.mesReferencia}
                            </Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Tipo da fatura</Text>
                            <Text style={styles.resultValue}>{item.tipoFatura}</Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>
                              Estimativa próximo mês
                            </Text>
                            <Text style={styles.resultValue}>
                              {item.estimativaProximoMes}
                            </Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>
                              Valor estimado próximo mês
                            </Text>
                            <Text style={styles.resultValue}>
                              {item.estimativaValorProximo}
                            </Text>
                          </View>

                          <View style={styles.resultItem}>
                            <Text style={styles.resultLabel}>Nível de consumo</Text>
                            <Text style={styles.resultValue}>{item.nivelLabel}</Text>
                          </View>

                          {jaConvertidos.has(item.id) ? (
                            <View style={styles.convertedBadge}>
                              <Feather name="check-circle" size={15} color="#7AF46C" />
                              <Text style={styles.convertedBadgeText}>
                                Já salvo no consumo
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.convertButton}
                              onPress={() => converterParaConsumo(item.id)}
                              disabled={convertendo === item.id}
                            >
                              {convertendo === item.id ? (
                                <ActivityIndicator color="#103221" size="small" />
                              ) : (
                                <>
                                  <Feather name="save" size={15} color="#103221" />
                                  <Text style={styles.convertButtonText}>
                                    Salvar no consumo
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
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

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/metas' as any)}
          >
            <Feather name="target" size={20} color="#C7D6CE" />
            <Text style={styles.navText}>Metas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItemActive}>
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={20}
              color="#7AF46C"
            />
            <Text style={styles.navTextActive}>Arquivo</Text>
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
  uploadCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(10, 54, 46, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.12)',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#F4FFF4',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#C7D6CE',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  uploadBox: {
    height: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.22)',
    backgroundColor: 'rgba(0,0,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  uploadText: {
    color: '#EAFEF0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  submitButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#7AF46C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7AF46C',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  submitButtonText: {
    color: '#103221',
    fontSize: 16,
    fontWeight: '900',
  },
  analysisCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(10, 54, 46, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(120,255,140,0.12)',
    padding: 16,
    marginBottom: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyResult: {
    minHeight: 160,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginTop: 10,
  },
  emptyText: {
    color: '#C7D6CE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 12,
  },
  resultBox: {
    marginTop: 10,
  },
  resultItem: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  resultLabel: {
    color: '#AFC2B8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultValue: {
    color: '#7AF46C',
    fontSize: 18,
    fontWeight: '900',
  },
  resumoItem: {
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  resumoText: {
    color: '#EAFEF0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  historyCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(5, 38, 33, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.16)',
    padding: 12,
    marginBottom: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    color: '#F4FFF4',
    fontSize: 16,
    fontWeight: '900',
  },
  historyDate: {
    color: '#AFC2B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  hideButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(122,244,108,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#7AF46C',
    marginTop: 10,
    shadowColor: '#7AF46C',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  convertButtonText: {
    color: '#103221',
    fontSize: 13,
    fontWeight: '900',
  },
  convertedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(122,244,108,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(122,244,108,0.20)',
  },
  convertedBadgeText: {
    color: '#7AF46C',
    fontSize: 13,
    fontWeight: '700',
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