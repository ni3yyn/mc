// src/screens/admin/AdminLogin.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';

const COLORS = {
  primary: '#0EB27C',
  bgDark: '#0D1B22',
  textWhite: '#F8FAFC',
  textGray: '#94A3B8',
  error: '#FF453A',
};

// Custom Text Component with Fonts
const ArText = ({ style, children, weight = '400', align = 'right', ...props }) => {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../../fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../../fonts/Tajawal-Bold.ttf'),
    'Tajawal-Black': require('../../fonts/Tajawal-Black.ttf'),
  });

  let fontFamily = 'Tajawal-Regular';
  if (weight === '700') fontFamily = 'Tajawal-Bold';
  if (weight === '900') fontFamily = 'Tajawal-Black';

  if (!fontsLoaded) {
    return (
      <Text
        {...props}
        style={[
          {
            textAlign: align,
            color: COLORS.textWhite,
            writingDirection: 'rtl',
          },
          style,
        ]}
      >
        {children}
      </Text>
    );
  }

  return (
    <Text
      {...props}
      style={[
        {
          textAlign: align,
          color: COLORS.textWhite,
          writingDirection: 'rtl',
          fontFamily,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAdminAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      onLoginSuccess?.();
    } else {
      Alert.alert('خطأ في تسجيل الدخول', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={[COLORS.bgDark, '#081116']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <BlurView intensity={40} tint="dark" style={styles.loginCard}>
          <View style={styles.header}>
            <MaterialIcons name="admin-panel-settings" size={48} color={COLORS.primary} />
            <ArText weight="900" style={styles.title}>لوحة التحكم</ArText>
            <ArText style={styles.subtitle}>تسجيل الدخول للمسؤولين</ArText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color={COLORS.textGray} />
              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={COLORS.textGray}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color={COLORS.textGray} />
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor={COLORS.textGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={COLORS.textGray}
                />
              </Pressable>
            </View>

            <Pressable
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.bgDark} />
              ) : (
                <ArText weight="700" style={styles.loginButtonText}>تسجيل الدخول</ArText>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <ArText style={styles.footerText}>منطقة مخصصة للمسؤولين فقط</ArText>
          </View>
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    color: COLORS.textWhite,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textGray,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 56,
  },
  input: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 16,
    marginHorizontal: 12,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Tajawal-Regular' : undefined,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.bgDark,
    fontSize: 18,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textGray,
    fontSize: 12,
  },
});