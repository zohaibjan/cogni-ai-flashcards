// ============================================================
// Generate screen — camera / file upload → Gemini AI → flashcards
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS, SHADOW, DECK_COLORS } from '@/constants';
import { generateFromImage, generateFromFile, generateFromText } from '@/services/AIFlashcardService';
import { saveStudySet, generateId } from '@/services/StorageService';
import type { StudySet } from '@/types';

type Step = 'source' | 'camera' | 'text' | 'preview' | 'generating' | 'success';

interface PickedMedia {
  base64: string;
  mimeType: string;
  label: string;
  isImage: boolean;
  previewUri?: string;
}

const CARD_COUNT_OPTIONS = [10, 15, 20, 30] as const;
const { width: SCREEN_W } = Dimensions.get('window');

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('source');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState<10 | 15 | 20 | 30>(15);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [lastSetId, setLastSetId] = useState('');
  const [textContent, setTextContent] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const resetAll = useCallback(() => {
    setStep('source');
    setMedia(null);
    setTitle('');
    setCardCount(15);
    setError('');
    setProgress(0);
    setTextContent('');
  }, []);

  // ── Camera ──────────────────────────────────────────────────
  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) { setError('Camera permission denied.'); return; }
    }
    setStep('camera');
  };

  const takePicture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.75, exif: false });
      if (!photo?.base64) throw new Error('No photo captured.');
      setMedia({ base64: photo.base64, mimeType: 'image/jpeg', label: 'Camera photo', isImage: true, previewUri: photo.uri });
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to capture photo.');
    }
  };

  // ── Image picker ────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], base64: true, quality: 0.75,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Could not read image.');
      setMedia({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg', label: asset.fileName ?? 'Photo', isImage: true, previewUri: asset.uri });
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to pick image.');
    }
  };

  // ── Document picker ─────────────────────────────────────────
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as const });
      setMedia({ base64, mimeType: asset.mimeType ?? 'application/pdf', label: asset.name, isImage: false });
      if (!title) setTitle(asset.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to pick file.');
    }
  };

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!media || !title.trim()) return;
    setError('');
    setStep('generating');

    // Animate fake progress
    setProgress(15);
    setProgressLabel('Reading your content...');
    const t1 = setTimeout(() => { setProgress(45); setProgressLabel('Analyzing with Gemini AI...'); }, 800);
    const t2 = setTimeout(() => { setProgress(72); setProgressLabel('Generating flashcards...'); }, 2500);

    try {
      let cards;
      if (media.isImage) {
        cards = await generateFromImage(media.base64, media.mimeType, title.trim(), cardCount);
      } else {
        cards = await generateFromFile(media.base64, media.mimeType, title.trim(), cardCount);
      }
      clearTimeout(t1); clearTimeout(t2);
      setProgress(100);

      const coverColor = DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)];
      const newSet: StudySet = {
        id: generateId(),
        title: title.trim(),
        coverColor,
        cards,
        createdAt: new Date().toISOString(),
      };
      await saveStudySet(newSet);
      setGeneratedCount(cards.length);
      setLastSetId(newSet.id);
      setStep('success');
    } catch (e: unknown) {
      clearTimeout(t1); clearTimeout(t2);
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
      setStep('preview');
    }
  };

  // ── Generate from typed text ───────────────────────────────
  const handleGenerateFromText = async () => {
    if (!textContent.trim() || !title.trim()) return;
    setError('');
    setStep('generating');
    setProgress(15); setProgressLabel('Reading your content...');
    const t1 = setTimeout(() => { setProgress(45); setProgressLabel('Analyzing with Gemini AI...'); }, 800);
    const t2 = setTimeout(() => { setProgress(72); setProgressLabel('Generating flashcards...'); }, 2500);
    try {
      const cards = await generateFromText(textContent.trim(), title.trim(), cardCount);
      clearTimeout(t1); clearTimeout(t2);
      setProgress(100);
      const coverColor = DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)];
      const newSet: StudySet = { id: generateId(), title: title.trim(), coverColor, cards, createdAt: new Date().toISOString() };
      await saveStudySet(newSet);
      setGeneratedCount(cards.length);
      setLastSetId(newSet.id);
      setStep('success');
    } catch (e: unknown) {
      clearTimeout(t1); clearTimeout(t2);
      setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
      setStep('text');
    }
  };

  // ── Camera full-screen ──────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <StatusBar barStyle="light-content" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
          {/* Header bar */}
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={[styles.cameraHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setStep('source')} style={styles.cameraBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Scan Notes</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>

          {/* Viewfinder guide */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder}>
              {/* Corners */}
              {(['tl','tr','bl','br'] as const).map((c) => (
                <View key={c} style={[styles.corner, styles[c]]} />
              ))}
            </View>
            <Text style={styles.viewfinderHint}>
              Point at notes, textbooks, or whiteboards
            </Text>
          </View>

          {/* Capture button */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={[styles.cameraFooter, { paddingBottom: insets.bottom + 40 }]}>
            <TouchableOpacity onPress={takePicture} style={styles.captureRing} activeOpacity={0.85}>
              <View style={styles.captureBtn} />
            </TouchableOpacity>
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  // ── Scrollable steps ────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Source selection ──────────────── */}
        {step === 'source' && (
          <>
            <Text style={styles.screenTitle}>Create New Set</Text>

            {error ? <ErrorBanner msg={error} /> : null}

            {/* Large upload zone */}
            <TouchableOpacity
              onPress={openCamera}
              disabled={Platform.OS === 'web'}
              activeOpacity={0.85}
              style={[styles.uploadZone, Platform.OS === 'web' && styles.uploadZoneDisabled]}
            >
              <Ionicons name="camera" size={44} color={COLORS.primary} style={{ marginBottom: 10 }} />
              <Text style={styles.uploadZoneTitle}>Scan Notes or Upload Materials</Text>
            </TouchableOpacity>

            {/* 4 option buttons */}
            <View style={styles.optionGrid}>
              <OptionBtn
                icon="camera-outline"
                label="Scan Page"
                color={COLORS.primary}
                onPress={openCamera}
                disabled={Platform.OS === 'web'}
              />
              <OptionBtn
                icon="document-attach-outline"
                label="File Upload"
                color={COLORS.secondary}
                onPress={pickDocument}
              />
              <OptionBtn
                icon="image-outline"
                label="Photo Library"
                color="#10B981"
                onPress={pickImage}
              />
              <OptionBtn
                icon="text-outline"
                label="Text/Doc"
                color="#F59E0B"
                onPress={() => setStep('text')}
              />
            </View>
            {Platform.OS === 'web' && (
              <Text style={styles.webNote}>📱 Camera only available on mobile app.</Text>
            )}
          </>
        )}

        {/* ── Text input mode ──────────────── */}
        {step === 'text' && (
          <>
            <TouchableOpacity onPress={resetAll} style={styles.backRow} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.screenTitle}>Type or Paste Text</Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={textContent}
                onChangeText={setTextContent}
                placeholder="Paste your notes, article, or any content here..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
                testID="text-content-input"
              />
            </View>

            <Text style={styles.formLabel}>Deck Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Biology Chapter 4"
                placeholderTextColor={COLORS.textMuted}
                maxLength={100}
                returnKeyType="done"
                testID="deck-title-input"
              />
            </View>

            <Text style={styles.formLabel}>Number of Cards</Text>
            <View style={styles.countRow}>
              {CARD_COUNT_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCardCount(n)}
                  style={[styles.countBtn, cardCount === n && styles.countBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.countLabel, cardCount === n && styles.countLabelActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <ErrorBanner msg={error} /> : null}

            <TouchableOpacity
              onPress={handleGenerateFromText}
              disabled={!title.trim() || !textContent.trim()}
              activeOpacity={0.85}
              style={[styles.genBtn, (!title.trim() || !textContent.trim()) && styles.genBtnDisabled]}
            >
              <LinearGradient
                colors={[...GRADIENTS.brand]}
                style={styles.genBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.genBtnText}>Generate {cardCount} Flashcards</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Preview + form ────────────────── */}
        {step === 'preview' && media && (
          <>
            <TouchableOpacity onPress={resetAll} style={styles.backRow} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
              <Text style={styles.backText}>Change source</Text>
            </TouchableOpacity>

            <Text style={styles.screenTitle}>Create New Set</Text>

            {/* Preview card(s) row */}
            <View style={styles.fileRow}>
              <View style={styles.fileCard}>
                {media.isImage && media.previewUri ? (
                  <Image source={{ uri: media.previewUri }} style={styles.fileThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.fileDocIcon}>
                    <Ionicons name="document-text" size={32} color={COLORS.primary} />
                  </View>
                )}
                <TouchableOpacity onPress={resetAll} style={styles.fileRemove}>
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.fileName} numberOfLines={2}>{media.label}</Text>
              </View>
            </View>

            {/* Deck title */}
            <Text style={styles.formLabel}>Deck Name *</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Chemistry Chapter 5"
                placeholderTextColor={COLORS.textMuted}
                maxLength={100}
                returnKeyType="done"
              />
            </View>

            {/* Card count */}
            <Text style={styles.formLabel}>Number of Cards</Text>
            <View style={styles.countRow}>
              {CARD_COUNT_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCardCount(n)}
                  style={[styles.countBtn, cardCount === n && styles.countBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.countLabel, cardCount === n && styles.countLabelActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <ErrorBanner msg={error} /> : null}

            {/* Generate CTA */}
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={!title.trim()}
              activeOpacity={0.85}
              style={[styles.genBtn, !title.trim() && styles.genBtnDisabled]}
            >
              <LinearGradient
                colors={[...GRADIENTS.brand]}
                style={styles.genBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.genBtnText}>Generate {cardCount} Flashcards</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Generating ────────────────────── */}
        {step === 'generating' && (
          <View style={styles.centered}>
            <View style={styles.generatingIconWrap}>
              <Ionicons name="sparkles" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.genTitle}>{progressLabel || 'Analyzing content...'}</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPct}>{progress}%</Text>

            {/* Step pills */}
            <View style={styles.stepRow}>
              <StepPill label="Text Extraction" active={progress >= 15} done={progress >= 45} />
              <StepPill label="Generation" active={progress >= 45} done={progress >= 100} />
            </View>

            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: SPACING.xl }} />
          </View>
        )}

        {/* ── Success ───────────────────────── */}
        {step === 'success' && (
          <View style={styles.centered}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>{generatedCount} Flashcards Ready!</Text>
            <Text style={styles.successSub}>
              "{title}" has been saved to your library.
            </Text>

            <TouchableOpacity
              onPress={() => router.push(`/study/${lastSetId}`)}
              activeOpacity={0.85}
              style={styles.genBtn}
            >
              <LinearGradient
                colors={[...GRADIENTS.brand]}
                style={styles.genBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.genBtnText}>Start Studying</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetAll} activeOpacity={0.7} style={styles.newLink}>
              <Text style={styles.newLinkText}>Create another set</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Small components ─────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <View style={errStyles.banner}>
      <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
      <Text style={errStyles.text}>{msg}</Text>
    </View>
  );
}
const errStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)',
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  text: { color: COLORS.error, fontSize: 13, flex: 1, lineHeight: 18 },
});

function OptionBtn({
  icon, label, color, onPress, disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.optionBtn, disabled && { opacity: 0.4 }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View style={[
      styles.stepPill,
      active && styles.stepPillActive,
      done && styles.stepPillDone,
    ]}>
      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
      <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  scroll: { paddingHorizontal: SPACING.lg },
  centered: { alignItems: 'center', paddingTop: 60 },

  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: SPACING.lg,
  },

  // Upload zone
  uploadZone: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  uploadZoneDisabled: { borderColor: COLORS.border, opacity: 0.6 },
  uploadZoneTitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Option grid
  optionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  optionBtn: { alignItems: 'center', gap: 6, flex: 1 },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  webNote: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: -SPACING.md },

  // Back row
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: SPACING.md,
  },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  // File preview
  fileRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
  fileCard: {
    width: 110, backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden', ...SHADOW.card,
  },
  fileThumb: { width: '100%', height: 80 },
  fileDocIcon: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryBg,
  },
  fileRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  fileName: {
    color: COLORS.textSecondary, fontSize: 10, fontWeight: '600',
    padding: 6, lineHeight: 13,
  },

  // Form
  formLabel: {
    color: COLORS.textMuted, fontSize: 12, fontWeight: '700',
    letterSpacing: 0.8, marginBottom: 8, marginTop: 4,
  },
  inputWrap: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  input: { color: COLORS.textPrimary, fontSize: 15, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  textArea: { height: 180, paddingTop: 14 },

  // Card count
  countRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
  countBtn: {
    flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  countBtnActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  countLabel: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700' },
  countLabelActive: { color: COLORS.primary },

  // Generate button
  genBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: 4, width: '100%' },
  genBtnDisabled: { opacity: 0.5 },
  genBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  genBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Generating
  generatingIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primaryBg, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg,
  },
  genTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center' },
  progressTrack: {
    width: SCREEN_W - SPACING.lg * 2, height: 8,
    backgroundColor: COLORS.bgInput, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressPct: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, marginBottom: SPACING.md },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.bgInput,
  },
  stepPillActive: { backgroundColor: COLORS.primaryBg },
  stepPillDone: { backgroundColor: COLORS.primary },
  stepLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  stepLabelActive: { color: COLORS.primary },

  // Success
  successEmoji: { fontSize: 68, marginBottom: SPACING.md },
  successTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  successSub: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center',
    marginBottom: SPACING.xl, paddingHorizontal: SPACING.md,
  },
  newLink: { paddingVertical: 12 },
  newLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  // Camera
  cameraHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg,
  },
  cameraBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  cameraTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  viewfinderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 260, height: 200 },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  viewfinderHint: {
    color: '#fff', fontSize: 13, marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full, overflow: 'hidden',
  },
  cameraFooter: {
    paddingTop: 40, alignItems: 'center',
  },
  captureRing: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtn: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff',
  },
});
