import { useEffect, useRef, useState } from 'react';
import {View,Text,Button,Linking,ScrollView,StyleSheet,Alert,} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = 'qr_historico';

type ItemHistorico = {
  dado: string;
  em: string;
};

const ehlink = (texto: string | null) => /^https?:\/\//i.test(texto ?? '');

export default function QRCodeScreen() {
  const [perm, pedir] = useCameraPermissions();
  const [lido, setLido] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const travando = useRef(false);

  useEffect(() => {
    async function carregarHistorico() {
      try {
        const valor = await AsyncStorage.getItem(CHAVE);

        if (valor) {
          const lista: ItemHistorico[] = JSON.parse(valor);
          setHistorico(lista);
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar o histórico.');
      } finally {
        setCarregando(false);
      }
    }

    carregarHistorico();

}, []);

  async function atualizar(lista: ItemHistorico[]) {
    try {
      await AsyncStorage.setItem(CHAVE, JSON.stringify(lista));
      setHistorico(lista);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o histórico.');
    }
  }

  function aoLer({ data }: { data: string }) {
    if (travando.current) return;
    travando.current = true;
    setLido(data);
  }

  async function salvar() {
    if (lido === null) return;

    const item: ItemHistorico = {
      dado: lido,
      em: new Date().toLocaleString('pt-BR'),
    };

    await atualizar([item, ...historico]);
    Alert.alert('Sucesso', 'QR Code salvo no histórico.');
  }

  async function abrir(url: string) {
    if (!ehlink(url)) {
      Alert.alert('Aviso', 'Este QR Code não contém um link HTTP ou HTTPS.');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  function lerOutro() {
    travando.current = false;
    setLido(null);
  }

  function limparHistorico() {
    Alert.alert(
      'Limpar histórico',
      'Deseja apagar todos os QR Codes salvos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            void atualizar([]);
          },
        },
      ]
    );
  }

  if (!perm) {
    return <View style={s.centro} />;
  }

  if (!perm.granted) {
    return (
      <View style={s.centro}>
        <Text>Precisamos da câmera para ler QR Codes.</Text>
        <Button title="Solicitar permissão" onPress={() => void pedir()}/>
      </View>
    );
  }

  if (lido !== null) {
    return (
      <ScrollView contentContainerStyle={s.pagina}>
        <Text style={s.titulo}>QR Code lido</Text>
        <Text selectable style={s.dado}>{lido}</Text>
        {ehlink(lido) && (<Button title="🔗 Abrir link" onPress={() => void abrir(lido)}/>)}
        <Button title="💾 Salvar no histórico" onPress={() => void salvar()} />
        <Button title="📷 Ler outro" color="#5b6573" onPress={lerOutro} />
        <Text style={s.titulo}>Histórico</Text>
        {carregando ? (
          <Text>Carregando histórico...</Text>
        ) : historico.length === 0 ? (
          <Text>Nenhum QR Code salvo.</Text>
        ) : (
          historico.map((h, i) => (
            <Text key={`${h.em}-${i}`} style={s.item} onPress={() => { if (ehlink(h.dado)) { void abrir(h.dado);}}} >
              {h.em} - {h.dado}
            </Text>
          ))
        )}

        {historico.length > 0 && (
          <Button title="🗑️ Limpar histórico" color="#c0392b" onPress={limparHistorico}/> )}
      </ScrollView>
    );
  }

  return (
    <View style={s.tudo}>
      <CameraView style={s.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'],}} onBarcodeScanned={travando.current ? undefined : aoLer}/>
      <View style={s.instrucao}>
        <Text style={s.dica}>
          Aponte a câmera para um QR Code
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tudo: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  pagina: {
    padding: 20,
    gap: 12,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  dado: {
    fontSize: 16,
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
  },
  item: {
    color: '#0b6e99',
    paddingVertical: 8,
  },
  instrucao: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#0009',
    padding: 12,
    borderRadius: 8,
  },
  dica: {
    color: '#fff',
    fontSize: 16,
  },
});
