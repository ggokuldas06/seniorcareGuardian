// src/screens/elders/AddElderScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { apiService } from '../../services/api';
import { useEldersStore } from '../../store/eldersStore';

interface AddElderScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddElderScreen({ onSuccess, onCancel }: AddElderScreenProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const { addElder } = useEldersStore();

  // Refs for input focus management
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow digits
    if (text && !/^\d$/.test(text)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    // Handle paste of 6-digit code
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) {
      const newCode = digits.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const pairingCode = code.join('');

    if (pairingCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit pairing code');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔗 Pairing with code:', pairingCode);

      const response = await apiService.pairWithElder(pairingCode);

      if (response.success && response.data) {
        const { elderId, pairedAt } = response.data;

        console.log('✅ Pairing successful:', elderId);

        // Add elder to local store
        await addElder({
          id: elderId,
          name: 'Elder', // We'll get actual name from elder device later
          isOnline: false,
          lastSeen: pairedAt,
        });

        Alert.alert('Success', 'Elder paired successfully!', [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]);
      } else {
        console.error('❌ Pairing failed:', response.error);
        Alert.alert('Pairing Failed', response.error || 'Invalid or expired code');
      }
    } catch (error) {
      console.error('❌ Pairing error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCodeComplete = code.every((digit) => digit !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Elder</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit pairing code shown on the elder's device
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit !== '' && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
              onPaste={(e: any) => {
                if (index === 0) {
                  handlePaste(e.nativeEvent.text);
                }
              }}
            />
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to pair:</Text>
          <Text style={styles.instructionText}>
            1. Open the Elder app on their device
          </Text>
          <Text style={styles.instructionText}>
            2. Tap "Generate Pairing Code"
          </Text>
          <Text style={styles.instructionText}>
            3. Enter the 6-digit code shown above
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (!isCodeComplete || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isCodeComplete || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Pair Elder</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 48,
    gap: 12,
  },
  codeInput: {
    width: 48,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  instructions: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: COLORS.text,
  },
});