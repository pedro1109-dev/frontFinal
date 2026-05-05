import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pegarUsuario, removerToken } from '../services/auth-storage';
import { router } from 'expo-router';
interface Props {
  aberto: boolean;
  fechar: () => void;
}

export default function MenuLateral({ aberto, fechar }: Props) {
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    async function carregarUsuario() {
      const dados = await pegarUsuario();
      setUsuario(dados);
    }

    if (aberto) {
      carregarUsuario();
    }
  }, [aberto]);

  async function sair() {
  await removerToken();
  fechar();
  router.replace('/(auth)/login');
}

  if (!aberto) return null;

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="leaf" size={24} color="#6EEB83" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>
            {usuario?.nome || 'Usuário'}
          </Text>
          <Text style={styles.email}>
            {usuario?.email || 'email não encontrado'}
          </Text>
        </View>

        <TouchableOpacity onPress={fechar}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CONFIGURAÇÕES */}
      <TouchableOpacity
        style={styles.item}
        onPress={() => {
          fechar();
          router.push('/configuracoes' as any)
        }}
      >
        <Ionicons name="settings-outline" size={20} color="#fff" />
        <Text style={styles.itemText}>Configurações</Text>
      </TouchableOpacity>

      {/* SAIR */}
      <TouchableOpacity style={styles.sair} onPress={sair}>
        <Ionicons name="log-out-outline" size={20} color="#ff5c5c" />
        <Text style={styles.sairText}>Sair</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: '#0b3d2e',
    padding: 20,
    zIndex: 999
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#134e3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  nome: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },

  email: {
    color: '#aaa',
    fontSize: 12
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },

  itemText: {
    color: '#fff',
    fontSize: 16
  },

  sair: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },

  sairText: {
    color: '#ff5c5c',
    fontSize: 16
  }
});