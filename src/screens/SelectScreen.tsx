import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TradingCard } from '../components/TradingCard';
import { BOOSTER_SETS, boosterPrice, dailyBoosterIds, shopDayKey } from '../data/sets';
import { packTextureModule } from '../data/packTextures';
import { OP13_DISPLAY_PACKS, OP13_DISPLAY_PRICE, useGame } from '../game/GameContext';

const SHOP_BACKGROUND = require('../../assets/grand-line-tcg-shop.png');
const BINDER_IMAGE = require('../../assets/tcg-binder.png');
const METAL_SHUTTER = require('../../assets/shop-metal-shutter.png');
const BERRY_COIN = require('../../assets/berry-coin.png');
const OP13_DISPLAY_IMAGE = require('../../assets/op13-display.png');
const OP13_DISPLAY_OPEN_IMAGE = require('../../assets/op13-display-open.png');

type Props = { blurred?: boolean };

export function SelectScreen({ blurred = false }: Props) {
  const { coins, collection, binderSlots, selectSet, selectOp13Display, resumeDisplay, openWelcomeGift, welcomeGiftPackId, setTab, startSelling, displayPacksRemaining } = useGame();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [shutterVisible, setShutterVisible] = useState(false);
  const [shutterMessage, setShutterMessage] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const [speechVisible, setSpeechVisible] = useState(false);
  const shutter = useRef(new Animated.Value(0)).current;
  const dayKey = shopDayKey(new Date(clock));
  const featuredBoosterIds = useMemo(() => dailyBoosterIds(new Date(clock)), [dayKey]);
  const featuredCard = binderSlots[0] ? collection.find((card) => card.id === binderSlots[0]) : undefined;
  const shopRatio = 2 / 3;
  const shopWidth = Math.min(width, height * shopRatio);
  const shopHeight = shopWidth / shopRatio;
  const shopLeft = (width - shopWidth) / 2;
  const shopTop = (height - shopHeight) / 2;

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const storageKey = welcomeGiftPackId ? 'shop-welcome-speech' : `shop-speech-${dayKey}`;
    AsyncStorage.getItem(storageKey).then((value) => {
      if (value !== '1') setSpeechVisible(true);
    });
  }, [dayKey, welcomeGiftPackId]);

  const dismissSpeech = () => {
    setSpeechVisible(false);
    void AsyncStorage.setItem(welcomeGiftPackId ? 'shop-welcome-speech' : `shop-speech-${dayKey}`, '1');
  };
  const giftPackImage = welcomeGiftPackId ? packTextureModule(welcomeGiftPackId) : null;
  const shelfStyle = {
    left: (width - shopWidth) / 2 + shopWidth * 0.11,
    top: height * 0.18,
    width: shopWidth * 0.54,
    height: height * 0.14,
  };
  const binderStyle = {
    left: (width - shopWidth) / 2 + shopWidth * 0.64,
    top: height * 0.22,
    width: shopWidth * 0.34,
    height: height * 0.39,
  };
  const displayStyle = {
    // Centered inside the lower shelf, between its acrylic dividers.
    left: (width - shopWidth) / 2 + shopWidth * 0.03,
    top: height * 0.32,
    width: shopWidth * 0.46,
    height: height * 0.14,
  };
  const closeShop = () => {
    setShutterMessage('Tu n’as pas assez de Berrys pour l’instant.');
    setShutterVisible(true);
    Animated.sequence([
      Animated.timing(shutter, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.delay(1350),
      Animated.timing(shutter, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start(() => setShutterVisible(false));
  };

  return (
    <View style={styles.fill}>
      <Image source={SHOP_BACKGROUND} resizeMode="contain" blurRadius={blurred ? 18 : 0} style={styles.shopBackground} />
      <View style={[styles.fill, blurred && styles.nonInteractive]}>
        {blurred ? <View style={styles.dim} /> : null}
        {!blurred ? (
        <View style={[styles.shelf, shelfStyle]}>
          {featuredBoosterIds.map((id) => {
            const set = BOOSTER_SETS.find((candidate) => candidate.id === id);
            const image = packTextureModule(id);
            if (!set || !image) return null;
            return (
              <Pressable
                key={id}
                accessibilityLabel={`Ouvrir ${set.code}`}
                onPress={() => {
                  if (coins < boosterPrice(id)) {
                closeShop();
                    return;
                  }
                  selectSet(id);
                }}
                style={({ pressed }) => [styles.boosterButton, pressed && coins >= boosterPrice(id) && styles.pressed, coins < boosterPrice(id) && styles.empty]}
              >
                <Image source={image} resizeMode="contain" style={styles.booster} />
                <View style={styles.price}>
                  <Image source={BERRY_COIN} style={styles.priceCoin} />
                  <Text style={styles.priceText}>{boosterPrice(id)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        ) : null}
        {!blurred ? (
          <Pressable
            accessibilityLabel="Ouvrir une display OP-13 de 24 boosters"
            onPress={() => {
              if (displayPacksRemaining) {
                setShutterMessage('Finis d’abord ta display déjà ouverte, en bas de l’écran.');
                setShutterVisible(true);
                Animated.sequence([
                  Animated.timing(shutter, { toValue: 1, duration: 420, useNativeDriver: true }),
                  Animated.delay(1350),
                  Animated.timing(shutter, { toValue: 0, duration: 480, useNativeDriver: true }),
                ]).start(() => setShutterVisible(false));
                return;
              }
              if (coins < OP13_DISPLAY_PRICE) {
                closeShop();
                return;
              }
              selectOp13Display();
            }}
            style={({ pressed }) => [styles.displayButton, displayStyle, pressed && coins >= OP13_DISPLAY_PRICE && !displayPacksRemaining && styles.pressed, (coins < OP13_DISPLAY_PRICE || displayPacksRemaining) && styles.displayEmpty]}
          >
            <Image source={OP13_DISPLAY_IMAGE} resizeMode="contain" style={styles.displayImage} />
            <View style={styles.displayFooter}>
              <Text style={styles.displayTitle}>DISPLAY OP-13</Text>
              <Text style={styles.displaySubtitle}>24 boosters · 3 HITS garantis</Text>
              <View style={styles.displayPrice}>
                <Image source={BERRY_COIN} style={styles.displayCoin} />
                <Text style={styles.displayPriceText}>{OP13_DISPLAY_PRICE}</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
        {!blurred ? (
          <Pressable
            accessibilityLabel="Ouvrir le classeur"
            onPress={() => setTab('binder')}
            style={({ pressed }) => [styles.binderButton, binderStyle, pressed && styles.binderPressed]}
          >
            <Image source={BINDER_IMAGE} resizeMode="contain" style={styles.binderImage} />
          </Pressable>
        ) : null}
        {!blurred && featuredCard ? (
          <View pointerEvents="none" style={styles.featuredCardSpot}>
            <View style={styles.cardPedestal}>
              <Text style={styles.favoriteHeart}>♥</Text>
            </View>
            <View style={styles.featuredCardTilt}>
              <TradingCard card={{ ...featuredCard, pullId: `featured-${featuredCard.id}` }} compact />
            </View>
          </View>
        ) : null}
        {!blurred ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vendre des cartes"
            onPress={startSelling}
            style={({ pressed }) => [
              styles.sellButton,
              {
                left: shopLeft + shopWidth * 0.055,
                top: shopTop + shopHeight * 0.758,
                width: shopWidth * 0.1,
                height: shopWidth * 0.1,
              },
              pressed && styles.sellPressed,
            ]}
          >
            <Image source={BERRY_COIN} style={styles.sellCoin} />
            <Text style={styles.sellLabel}>Vendre</Text>
          </Pressable>
        ) : null}
        {!blurred && !giftPackImage && displayPacksRemaining ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Continuer ta display, ${displayPacksRemaining} boosters restants`}
            onPress={resumeDisplay}
            style={({ pressed }) => {
              const resumeWidth = Math.min(340, shopWidth * 0.86);
              return [
                styles.resumeDisplay,
                {
                  width: resumeWidth,
                  left: (width - resumeWidth) / 2,
                  bottom: Math.max(insets.bottom, 2) + 36,
                },
                pressed && styles.pressed,
              ];
            }}
          >
            <Text style={styles.resumeLabel}>{displayPacksRemaining}</Text>
            <Image
              source={displayPacksRemaining >= OP13_DISPLAY_PACKS ? OP13_DISPLAY_IMAGE : OP13_DISPLAY_OPEN_IMAGE}
              resizeMode="contain"
              style={styles.resumeImage}
            />
          </Pressable>
        ) : null}
        {!blurred && giftPackImage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir ton booster cadeau"
            onPress={openWelcomeGift}
            style={({ pressed }) => {
              const resumeWidth = Math.min(168, shopWidth * 0.42);
              return [
                styles.resumeDisplay,
                {
                  width: resumeWidth,
                  left: (width - resumeWidth) / 2,
                  bottom: Math.max(insets.bottom, 2) + 36,
                },
                pressed && styles.pressed,
              ];
            }}
          >
            <Text style={styles.resumeLabel}>1</Text>
            <Image source={giftPackImage} resizeMode="contain" style={styles.giftPackImage} />
          </Pressable>
        ) : null}
        {!blurred && speechVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={welcomeGiftPackId ? 'Premier jour, un booster cadeau. Appuie pour fermer.' : 'Nouveau booster tous les jours à 12 heures. Appuie pour fermer.'}
            onPress={dismissSpeech}
            style={[
              styles.speech,
              welcomeGiftPackId ? styles.welcomeSpeech : null,
              {
                left: shopLeft + shopWidth * 0.48,
                top: shopTop + shopHeight * 0.34,
              },
            ]}
          >
            <Text style={styles.speechText}>
              {welcomeGiftPackId ? '1er jour ?! Tiens cadeau voici un booster' : 'Nouveau booster tous les jours à 12h'}
            </Text>
            <View style={styles.speechTailBorder} />
            <View style={styles.speechTail} />
          </Pressable>
        ) : null}
      </View>
      {shutterVisible ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.shutter,
            { transform: [{ translateY: shutter.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] },
          ]}
        >
          <Image source={METAL_SHUTTER} resizeMode="repeat" style={styles.shutterGrid} />
          <View style={styles.shutterMessage}>
            <Text style={styles.shutterTitle}>BOUTIQUE FERMÉE</Text>
            <Text style={styles.shutterText}>{shutterMessage}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shopBackground: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', backgroundColor: '#130b08' },
  nonInteractive: { pointerEvents: 'none' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 10, 6, 0.42)' },
  shelf: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: '3%',
  },
  boosterButton: { width: '25%', height: '94%', alignItems: 'center', justifyContent: 'flex-end' },
  booster: { width: '100%', height: '88%' },
  displayButton: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  displayImage: { width: '100%', height: '76%', opacity: 1 },
  displayFooter: { position: 'absolute', alignSelf: 'center', bottom: 0, alignItems: 'center', backgroundColor: 'rgba(30, 12, 7, 0.88)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 },
  displayTitle: { color: '#ffe2a0', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  displaySubtitle: { color: '#f3c66d', fontSize: 7, fontWeight: '700', textAlign: 'center' },
  displayPrice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#201408', borderColor: '#f3c66d', borderWidth: 1, borderRadius: 999, marginTop: 3, paddingHorizontal: 6, paddingVertical: 3 },
  displayCoin: { width: 13, height: 13, marginRight: 3 },
  displayPriceText: { color: '#ffe2a0', fontWeight: '900', fontSize: 11 },
  pressed: { transform: [{ scale: 0.94 }] },
  binderButton: { position: 'absolute', borderRadius: 20 },
  binderImage: { width: '100%', height: '100%' },
  binderPressed: { backgroundColor: 'rgba(255, 211, 112, 0.12)' },
  featuredCardSpot: { position: 'absolute', right: 10, bottom: 8, width: 116, height: 165, alignItems: 'center', justifyContent: 'flex-end', zIndex: 12 },
  cardPedestal: { position: 'absolute', bottom: 3, width: 95, height: 18, borderRadius: 12, backgroundColor: '#4b260e', borderWidth: 2, borderColor: '#d39b42', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.65, shadowRadius: 8, elevation: 9 },
  favoriteHeart: { color: '#ff6b75', fontSize: 14, fontWeight: '900', lineHeight: 15 },
  featuredCardTilt: { marginBottom: 2, transform: [{ perspective: 700 }, { rotateX: '-18deg' }, { rotateZ: '6deg' }, { scale: 0.72 }], shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 10, elevation: 10 },
  empty: { opacity: 0.38 },
  displayEmpty: { opacity: 0.78 },
  price: { position: 'absolute', bottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#201408', borderColor: '#f3c66d', borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  priceCoin: { width: 12, height: 12, marginRight: 3 },
  priceText: { color: '#ffe2a0', fontWeight: '900', fontSize: 10 },
  shutter: { ...StyleSheet.absoluteFill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shutterGrid: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', opacity: 0.78 },
  shutterMessage: { alignItems: 'center', backgroundColor: 'rgba(20, 13, 6, 0.92)', borderWidth: 2, borderColor: '#f3c66d', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 18 },
  shutterTitle: { color: '#ffe2a0', fontWeight: '900', fontSize: 20, letterSpacing: 1.5 },
  shutterText: { color: '#fff2d1', fontSize: 16, fontWeight: '700', marginTop: 7 },
  resumeDisplay: {
    position: 'absolute',
    zIndex: 18,
    alignItems: 'center',
  },
  resumeImage: { width: '100%', height: 148, marginTop: 4 },
  giftPackImage: { width: '100%', height: 148, marginTop: 4 },
  welcomeSpeech: { width: 196 },
  resumeLabel: {
    color: '#ffe2a0',
    fontSize: 16,
    fontWeight: '900',
    backgroundColor: 'rgba(32, 20, 8, 0.88)',
    borderColor: '#f3c66d',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sellButton: {
    position: 'absolute',
    zIndex: 16,
    borderRadius: 999,
    backgroundColor: '#201408',
    borderWidth: 2,
    borderColor: '#f3c66d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 10,
  },
  sellPressed: { transform: [{ scale: 0.94 }] },
  sellCoin: { width: '42%', height: '42%' },
  sellLabel: { color: '#ffe2a0', fontSize: 8, fontWeight: '900', marginTop: 1 },
  speech: {
    position: 'absolute',
    zIndex: 20,
    width: 168,
    backgroundColor: '#fffdf4',
    borderColor: '#1a1208',
    borderWidth: 3,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    transform: [{ rotate: '-5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 12,
  },
  speechText: {
    color: '#1a1208',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    textAlign: 'center',
  },
  speechTailBorder: {
    position: 'absolute',
    left: 22,
    bottom: -13,
    width: 18,
    height: 18,
    backgroundColor: '#1a1208',
    transform: [{ rotate: '48deg' }],
  },
  speechTail: {
    position: 'absolute',
    left: 25,
    bottom: -8,
    width: 13,
    height: 13,
    backgroundColor: '#fffdf4',
    transform: [{ rotate: '48deg' }],
  },
});
