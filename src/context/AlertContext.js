// src/context/AlertContext.js
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  Animated, 
  Easing, 
  Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// Shared Colors
const COLORS = {
  primary: '#0EB27C',
  bgDark: '#0D1B22',
  bgDarker: '#081116',
  textWhite: '#F8FAFC',
  textGray: '#94A3B8',
  error: '#FF453A',
  warning: '#FFB340',
  info: '#3A7BFF',
  border: 'rgba(255,255,255,0.1)',
};

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../../fonts/Tajawal-Regular.ttf'), // Adjust path if needed
    'Tajawal-Bold': require('../../fonts/Tajawal-Bold.ttf'),
  });

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons:[],
    type: 'info', // 'info', 'warning', 'error', 'success'
  });

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Function to trigger the alert
  const showAlert = ({ title, message, buttons, type = 'info' }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'حسناً', style: 'default' }]
    });

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Function to hide the alert
  const hideAlert = (callback) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  const getIcon = (type) => {
    switch(type) {
      case 'error': return { name: 'error-outline', color: COLORS.error };
      case 'warning': return { name: 'warning', color: COLORS.warning };
      case 'success': return { name: 'check-circle-outline', color: COLORS.primary };
      default: return { name: 'info-outline', color: COLORS.info };
    }
  };

  const iconConfig = getIcon(alertConfig.type);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      <Modal
        transparent
        visible={alertConfig.visible}
        animationType="none"
        onRequestClose={() => hideAlert()}
      >
        <View style={styles.overlay}>
          {/* Background Dim */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', opacity: opacityAnim }]} />
          
          {/* Alert Box */}
          <Animated.View 
            style={[
              styles.alertBox, 
              { 
                opacity: opacityAnim,
                transform:[{ scale: scaleAnim }] 
              }
            ]}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name={iconConfig.name} size={40} color={iconConfig.color} />
            </View>

            <Text style={[styles.title, fontsLoaded && { fontFamily: 'Tajawal-Bold' }]}>
              {alertConfig.title}
            </Text>
            
            <Text style={[styles.message, fontsLoaded && { fontFamily: 'Tajawal-Regular' }]}>
              {alertConfig.message}
            </Text>

            <View style={styles.buttonContainer}>
              {alertConfig.buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                
                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) =>[
                      styles.button,
                      isCancel ? styles.buttonCancel : styles.buttonDefault,
                      isDestructive && styles.buttonDestructive,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => hideAlert(btn.onPress)}
                  >
                    <Text style={[
                      styles.buttonText, 
                      isCancel && { color: COLORS.textWhite },
                      fontsLoaded && { fontFamily: 'Tajawal-Bold' }
                    ]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  alertBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.bgDark,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 50,
  },
  title: {
    fontSize: 20,
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textGray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDefault: {
    backgroundColor: COLORS.primary,
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDestructive: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.bgDarker,
    fontSize: 15,
  },
});