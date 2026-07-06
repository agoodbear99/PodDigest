import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import PrimaryButton from './PrimaryButton';

export default function AudioUploadTab() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handlePickFile = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    setFile(result.assets[0]);
  };

  const handleSummarize = () => {
    if (!file) return;
    navigation.navigate('Summary', {
      source: {
        type: 'audio',
        file: { uri: file.uri, name: file.name, mimeType: file.mimeType },
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('audio.label')}</Text>

      <PrimaryButton
        title={file ? t('audio.reselectButton') : t('audio.chooseButton')}
        onPress={handlePickFile}
      />

      {file && (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileMeta}>
            {file.mimeType || t('audio.unknownFormat')}
            {file.size ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
          </Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>{t('audio.notice')}</Text>
      </View>

      <PrimaryButton title={t('audio.generateButton')} onPress={handleSummarize} disabled={!file} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  fileInfo: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  fileMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  noticeBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
