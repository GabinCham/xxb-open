import { useState } from 'react';
import { ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const SHOP_BACKGROUND = require('../../assets/grand-line-tcg-shop.png');

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setMessage('Renseigne un e-mail et un mot de passe de 6 caractères minimum.');
      return;
    }
    setBusy(true);
    setMessage(null);
    if (mode === 'login') {
      const error = await signIn(email, password);
      setMessage(error);
    } else {
      const result = await signUp(email, password);
      setMessage(result.error ?? (result.confirmationRequired ? 'Compte créé. Vérifie tes e-mails puis reconnecte-toi.' : null));
    }
    setBusy(false);
  };

  return (
    <ImageBackground source={SHOP_BACKGROUND} style={styles.background} resizeMode="cover">
      <View style={styles.shade} />
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.kicker}>GRAND LINE TCG SHOP</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Bon retour, pirate.' : 'Rejoins l’équipage.'}</Text>
          <Text style={styles.copy}>Ton compte garde tes Berrys, tes cartes et ton classeur sur tous tes appareils.</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor="#8e826b"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            placeholderTextColor="#8e826b"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.mainButton, (pressed || busy) && styles.pressed]}>
            {busy ? <ActivityIndicator color="#211407" /> : <Text style={styles.mainLabel}>{mode === 'login' ? 'ENTRER DANS LA BOUTIQUE' : 'CRÉER MON COMPTE'}</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }} style={styles.switchButton}>
            <Text style={styles.switchLabel}>{mode === 'login' ? 'Pas encore de compte ? Crée-le' : 'Déjà un compte ? Connecte-toi'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.bg },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9, 5, 2, 0.58)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 420, backgroundColor: 'rgba(20, 12, 5, 0.94)', borderColor: '#e8c36a', borderWidth: 1, borderRadius: 18, padding: 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, elevation: 8 },
  kicker: { color: colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },
  title: { color: colors.cream, fontSize: 27, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  copy: { color: '#d2c2a1', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  input: { backgroundColor: '#0f0b07', borderColor: '#80642c', borderWidth: 1, borderRadius: 10, color: colors.cream, fontSize: 16, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 13 },
  message: { color: '#ffd88b', fontSize: 13, lineHeight: 18, marginBottom: 10, textAlign: 'center' },
  mainButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 10, justifyContent: 'center', minHeight: 48, marginTop: 4 },
  mainLabel: { color: '#211407', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  switchButton: { alignItems: 'center', paddingTop: 18 },
  switchLabel: { color: '#e8c36a', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
