import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_HEIGHT } from '../components/TabBar';
import type { ScanLang } from '../data/cardPrices';
import { applyScanLang, recognizeCard, type ScanResult } from '../data/recognizeCard';
import { applyScannerFocus, pulseAutofocus } from '../data/scannerFocus';
import { colors } from '../theme';

export function ScannerScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Cadre toute la carte · reconnaissance par illustration');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = async (uri: string) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(uri);
    try {
      const hit = await recognizeCard(uri, setStatus);
      setResult(hit);
      setStatus('Carte reconnue');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan impossible');
      setStatus('Réessaie avec plus de lumière');
    } finally {
      setBusy(false);
    }
  };

  const shoot = async () => {
    if (busy) return;
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 1,
      base64: true,
      imageType: 'jpg',
      scale: 1,
    });
    if (!photo) return;
    const uri =
      photo.uri?.startsWith('data:') || photo.uri?.startsWith('http') || photo.uri?.startsWith('file')
        ? photo.uri
        : photo.base64
          ? `data:image/jpeg;base64,${photo.base64}`
          : photo.uri;
    if (uri) await runScan(uri);
  };

  const fromLibrary = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    await runScan(uri);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPreview(null);
    setStatus('Cadre toute la carte · reconnaissance par illustration');
  };

  return (
    <LinearGradient colors={['#101018', colors.bg]} style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.kicker}>IDENTIFY</Text>
        <Text style={styles.title}>Scanner</Text>
        <Text style={styles.lead}>{status}</Text>
      </View>

      <View style={styles.stage}>
        {result ? (
          <View style={styles.card}>
            {result.imageUrl ? <Image source={{ uri: result.imageUrl }} style={styles.art} resizeMode="contain" /> : null}
            <Text style={styles.code}>{result.code}</Text>
            <Text style={styles.name}>{result.name}</Text>
            <Text style={styles.meta}>{result.variant}</Text>
            <View style={styles.langs}>
              {(['en', 'fr', 'jp'] as ScanLang[]).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={async () => setResult(await applyScanLang(result, lang))}
                  style={[styles.langChip, result.lang === lang && styles.langChipOn]}
                >
                  <Text style={[styles.langText, result.lang === lang && styles.langTextOn]}>
                    {lang === 'en' ? 'EN' : lang === 'fr' ? 'FR' : 'JP'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.langLabel}>Langue scannée : {result.langLabel}</Text>
            <Text style={styles.price}>{result.priceLabel}</Text>
            <Text style={styles.market}>{result.market}</Text>
            <Pressable style={styles.again} onPress={reset}>
              <Text style={styles.againText}>Scanner une autre</Text>
            </Pressable>
          </View>
        ) : preview && (busy || error) ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
            {busy ? <ActivityIndicator color={colors.gold} style={styles.spinner} /> : null}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </View>
        ) : permission?.granted ? (
          <Pressable
            nativeID="scanner-viewfinder"
            style={styles.viewfinder}
            onPress={() => {
              const node = typeof document !== 'undefined' ? document.getElementById('scanner-viewfinder') : null;
              void pulseAutofocus(node);
            }}
          >
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              autofocus="on"
              enableTorch={torch}
              onCameraReady={() => {
                const run = (tries: number) => {
                  const node = typeof document !== 'undefined' ? document.getElementById('scanner-viewfinder') : null;
                  if (node?.querySelector('video')) {
                    void applyScannerFocus(node);
                    return;
                  }
                  if (tries > 0) setTimeout(() => run(tries - 1), 200);
                };
                setTimeout(() => run(8), 80);
              }}
            />
            <View pointerEvents="none" style={styles.guide} />
          </Pressable>
        ) : (
          <View style={styles.need}>
            <Text style={styles.needText}>Autorise la caméra pour viser tes cartes, ou importe une photo.</Text>
            <Pressable style={styles.shutter} onPress={() => requestPermission()}>
              <Text style={styles.shutterText}>Autoriser la caméra</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {result ? null : (
          <>
            <Pressable style={[styles.shutter, busy && styles.disabled]} onPress={shoot} disabled={busy || !permission?.granted}>
              <Text style={styles.shutterText}>{busy ? 'Analyse…' : 'Photographier'}</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable style={styles.ghost} onPress={error ? reset : fromLibrary} disabled={busy}>
                <Text style={styles.ghostText}>{error ? 'Réessayer' : 'Galerie'}</Text>
              </Pressable>
              <Pressable style={styles.ghost} onPress={() => setTorch((on) => !on)} disabled={busy || !permission?.granted}>
                <Text style={styles.ghostText}>{torch ? 'Lampe off' : 'Lampe'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: '800', fontSize: 12 },
  title: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  lead: { color: colors.muted, marginTop: 8, lineHeight: 22 },
  stage: { flex: 1, paddingHorizontal: 20, paddingTop: 16, justifyContent: 'center' },
  viewfinder: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    aspectRatio: 0.72,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.goldDim,
  },
  camera: { flex: 1 },
  guide: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '10%',
    bottom: '10%',
    borderWidth: 2,
    borderColor: 'rgba(232,195,106,0.7)',
    borderRadius: 12,
  },
  previewWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    aspectRatio: 0.72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  preview: { width: '100%', height: '100%' },
  spinner: { position: 'absolute', alignSelf: 'center', top: '48%' },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    padding: 18,
    alignItems: 'center',
  },
  art: { width: 180, height: 250, marginBottom: 12 },
  code: { color: colors.gold, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  name: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  meta: { color: colors.muted, marginTop: 8 },
  langs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  langChip: {
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  langChipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  langText: { color: colors.gold, fontWeight: '800' },
  langTextOn: { color: '#1a1408' },
  langLabel: { color: colors.muted, marginTop: 8, fontSize: 12 },
  price: { color: colors.cream, fontSize: 34, fontWeight: '900', marginTop: 14 },
  market: { color: colors.muted, fontSize: 12, marginTop: 4 },
  again: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  againText: { color: colors.gold, fontWeight: '800' },
  err: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    color: colors.cream,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 10,
    borderRadius: 10,
  },
  need: { padding: 24, alignItems: 'center', gap: 16 },
  needText: { color: colors.muted, textAlign: 'center', lineHeight: 22 },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: TAB_BAR_HEIGHT + 16,
    gap: 10,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  shutter: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shutterText: { color: '#1a1408', fontWeight: '900', fontSize: 16 },
  ghost: { alignItems: 'center', paddingVertical: 8, flex: 1 },
  ghostText: { color: colors.gold, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  ghostText: { color: colors.gold, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
