// --- START OF FILE signup.js ---

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Easing,
  PanResponder,
  BackHandler,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import FORM_CONFIG from '../data/formConfig.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONSTANTS ---
const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

const STORAGE_KEYS = {
  SIGNUP_FORM: 'signup_form_data',
  SIGNUP_FORM_TIMESTAMP: 'signup_form_timestamp'
};
const FORM_EXPIRY_DAYS = 7;

const COLORS = {
  primary: '#0EB27C',
  primaryLight: 'rgba(14, 178, 124, 0.15)',
  bgDark: '#0D1B22',
  bgDarker: '#081116',
  surface: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.12)',
  error: '#FF453A',
  errorBg: 'rgba(255, 69, 58, 0.1)',
  textWhite: '#F8FAFC',
  textGray: '#94A3B8',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// --- HELPER: FACEBOOK PIXEL ---
const trackPixelEvent = (event, data = {}, isCustom = false) => {
  if (IS_WEB && typeof window !== 'undefined' && window.fbq) {
    window.fbq(isCustom ? 'trackCustom' : 'track', event, data);
  }
};

// --- HELPER: SHADOW GENERATOR ---
const getShadow = (intensity = 1) => {
  if (IS_WEB) {
    return { boxShadow: `0px ${4 * intensity}px ${12 * intensity}px rgba(0,0,0,${0.2 * intensity})` };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 * intensity },
    shadowOpacity: 0.2 * intensity,
    shadowRadius: 8 * intensity,
    elevation: 5 * intensity,
  };
};

// --- TYPOGRAPHY ---
const ArText = ({ style, children, weight = '400', align = 'right', ...props }) => {
  let fontFamily = 'Tajawal-Regular';
  if (weight === '700') fontFamily = 'Tajawal-Bold';
  if (weight === '900') fontFamily = 'Tajawal-Black';
  return (
    <Text {...props} style={[{ textAlign: align, color: COLORS.textWhite, writingDirection: 'rtl', fontFamily }, style]}>
      {children}
    </Text>
  );
};

// --- FORM COMPONENTS ---
const InputField = ({ icon, label, placeholder, value, onChangeText, error, keyboardType = 'default' }) => {
  const[isFocused, setIsFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
      <View style={[ styles.inputContainer, isFocused && styles.inputFocused, error && styles.inputError ]}>
        <TextInput 
          style={[styles.input, { writingDirection: 'rtl' }]} 
          placeholder={placeholder} 
          placeholderTextColor={COLORS.textGray} 
          value={value} 
          onChangeText={onChangeText} 
          keyboardType={keyboardType} 
          textAlign="right" 
          onFocus={() => setIsFocused(true)} 
          onBlur={() => setIsFocused(false)} 
        />
        <View style={styles.inputIcon}>
          <MaterialIcons name={icon} size={22} color={error ? COLORS.error : (isFocused ? COLORS.primary : COLORS.textGray)} />
        </View>
      </View>
      {error && <ArText style={styles.errorText} align="right">{error}</ArText>}
    </View>
  );
};

const DropdownTrigger = ({ icon, label, placeholder, onPress, value, error }) => (
    <View style={{ marginBottom: 16 }}>
        <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
        <Pressable onPress={onPress}>
            <View style={[styles.inputContainer, error && styles.inputError]}>
                <View style={{ paddingLeft: 16, justifyContent: 'center' }}>
                    <MaterialIcons name="keyboard-arrow-down" size={24} color={error ? COLORS.error : COLORS.textGray} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 4, justifyContent: 'center' }}>
                    <ArText align="right" style={{ fontSize: 16, color: value ? COLORS.textWhite : COLORS.textGray }}>{value || placeholder}</ArText>
                </View>
                <View style={styles.inputIcon}>
                  <MaterialIcons name={icon} size={22} color={error ? COLORS.error : (value ? COLORS.primary : COLORS.textGray)} />
                </View>
            </View>
        </Pressable>
        {error && <ArText style={styles.errorText} align="right">{error}</ArText>}
    </View>
);

const ToggleSwitch = ({ label, value, onValueChange }) => {
    const [containerWidth, setContainerWidth] = useState(0);
    const slideAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  
    useEffect(() => {
        Animated.timing(slideAnim, {
          toValue: value ? 1 : 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: !IS_WEB,
        }).start();
    },[value]);

    const PADDING = 4;
    const buttonWidth = containerWidth > 0 ? (containerWidth - PADDING * 2) / 2 : 0;
  
    return (
      <View style={{ marginBottom: 24 }}>
        <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
        <View 
          style={styles.toggleContainer} 
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {containerWidth > 0 && (
            <Animated.View 
              style={[
                styles.toggleHighlight, 
                { 
                  width: buttonWidth,
                  transform:[{ 
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange:[0, buttonWidth]
                    }) 
                  }] 
                }
              ]} 
            />
          )}
          
          <Pressable style={styles.toggleBtn} onPress={() => onValueChange(false)}>
            <ArText 
              style={{ color: value ? COLORS.textGray : COLORS.bgDark }} 
              weight="700"
            >
              لا، لم أزره
            </ArText>
          </Pressable>
          
          <Pressable style={styles.toggleBtn} onPress={() => onValueChange(true)}>
            <ArText 
              style={{ color: value ? COLORS.bgDark : COLORS.textGray }} 
              weight="700"
            >
              نعم، زرت المعرض
            </ArText>
          </Pressable>
        </View>
      </View>
    );
};

// --- SUCCESS VIEW ---
const SuccessView = ({ name, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: !IS_WEB }).start();
  },[]);

  return (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIconBox, { transform:[{ scale: scaleAnim }] }]}>
        <MaterialIcons name="check" size={48} color={COLORS.primary} />
      </Animated.View>
      <ArText weight="900" style={styles.successTitle}>تم التسجيل بنجاح!</ArText>
      <ArText style={styles.successDesc} align="center">
        مرحباً بك {name}، لقد تم استلام طلبك.{'\n'}سيقوم فريقنا بالاتصال بك قريباً لتأكيد الحجز.
      </ArText>
      <Pressable onPress={onClose} style={styles.successBtn}>
        <ArText weight="700" style={{ color: COLORS.bgDark }}>ممتاز، شكراً لكم</ArText>
      </Pressable>
    </View>
  );
};

// --- REUSABLE SELECTION BOTTOM SHEET ---
const SelectionBottomSheet = ({ visible, onClose, data, onSelect, title, searchable = true }) => {
    const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isModalVisible, setIsModalVisible] = useState(visible);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            setIsModalVisible(true);
            setSearchQuery('');
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: !IS_WEB,
                }),
                Animated.timing(sheetAnim, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: !IS_WEB,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: !IS_WEB,
                }),
                Animated.timing(sheetAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 300,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: !IS_WEB,
                })
            ]).start(() => {
                setIsModalVisible(false);
            });
        }
    }, [visible]);

    const filteredData = data ? data.filter(item => {
        const text = item.name || item.label || '';
        return text.toLowerCase().includes(searchQuery.toLowerCase());
    }) :[];

    if (!isModalVisible) return null;

    return (
        <Modal transparent visible={isModalVisible} animationType="none" onRequestClose={onClose}>
            <View style={styles.sheetOverlay}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay, opacity: fadeAnim }]} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                
                <Animated.View style={[styles.sheetContent, { transform: [{ translateY: sheetAnim }] }]}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1B22' }]} />
                    <View style={styles.dragHandle} />
                    <ArText weight="700" style={{ fontSize: 18, marginBottom: 16 }}>{title}</ArText>
                    
                    {searchable && (
                        <View style={styles.searchBar}>
                            <MaterialIcons name="search" size={20} color={COLORS.textGray} />
                            <TextInput 
                              placeholder="بحث..." 
                              placeholderTextColor={COLORS.textGray} 
                              style={[styles.searchInput, { writingDirection: 'rtl' }]} 
                              onChangeText={setSearchQuery} 
                              value={searchQuery}
                              textAlign="right" 
                            />
                        </View>
                    )}

                    <FlatList 
                        data={filteredData} 
                        keyExtractor={(item, index) => item.id || index.toString()}
                        renderItem={({ item }) => (
                            <Pressable style={styles.listItem} onPress={() => { onSelect(item); onClose(); }}>
                                <ArText align="right" style={{ fontSize: 16 }}>{item.name || item.label}</ArText>
                            </Pressable>
                        )}
                        keyboardShouldPersistTaps="handled"
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- MAIN MODAL COMPONENT ---
export default function SignupModal({ visible, onClose }) {
  const [form, setForm] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    wilaya: '', 
    businessField: '', 
    budget: '', 
    visitedCanton: false 
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Modals state
  const [showWilayaModal, setShowWilayaModal] = useState(false);
  const[showBudgetModal, setShowBudgetModal] = useState(false);

  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const[isLoadingStorage, setIsLoadingStorage] = useState(true);

  // --- ANIMATIONS ---
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // --- PERSISTENCE FUNCTIONS ---
  const saveFormToStorage = async (formData) => {
    try {
      const dataToSave = { ...formData, _timestamp: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_FORM, JSON.stringify(dataToSave));
      await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.error('Error saving form to storage:', error);
    }
  };

  const loadFormFromStorage = async () => {
    try {
      setIsLoadingStorage(true);
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP);
      if (timestamp) {
        const savedTime = parseInt(timestamp);
        const now = Date.now();
        const daysSinceSaved = (now - savedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceSaved > FORM_EXPIRY_DAYS) {
          await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM);
          await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP);
          setIsLoadingStorage(false);
          return;
        }
      }
      const savedForm = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_FORM);
      if (savedForm) {
        const parsedForm = JSON.parse(savedForm);
        const { _timestamp, ...formData } = parsedForm;
        setForm(formData);
      }
    } catch (error) {
      console.error('Error loading form from storage:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const clearFormStorage = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM);
      await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP);
    } catch (error) {
      console.error('Error clearing form storage:', error);
    }
  };

  useEffect(() => {
    if (visible) loadFormFromStorage();
  }, [visible]);

  useEffect(() => {
    if (!isLoadingStorage && visible && !isSuccess) {
      const timeoutId = setTimeout(() => saveFormToStorage(form), 500);
      return () => clearTimeout(timeoutId);
    }
  },[form, visible, isSuccess, isLoadingStorage]);

  // --- BACK HANDLER ---
  useEffect(() => {
    if (IS_WEB) {
      const handlePopState = (event) => {
        if (visible) {
          event.preventDefault();
          fullClose();
          window.history.pushState(null, '', window.location.pathname);
        }
      };
      if (visible) {
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);
      }
      return () => window.removeEventListener('popstate', handlePopState);
    } else {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (visible) {
          fullClose();
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [visible]);

  // --- ANIMATION CONTROLS ---
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: !IS_WEB,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          friction: 10,
          tension: 80,
          useNativeDriver: !IS_WEB,
        }),
      ]).start();
    }
  }, [visible]);

  const handleCloseAnimation = (callback) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: !IS_WEB,
      }),
      Animated.timing(sheetY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: !IS_WEB,
      }),
    ]).start(callback);
  };
  
  const fullClose = () => {
    handleCloseAnimation(() => {
      onClose();
      setErrors({});
      setIsSuccess(false);
    });
  };

  // --- PanResponder ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const shouldSet = isScrollAtTop && gestureState.dy > 10 && Math.abs(gestureState.dx) < 5;
        if (shouldSet) {
          setIsDragging(true);
          return true;
        }
        return false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && isDragging) {
          sheetY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDragging) {
          if (gestureState.dy > 100 || gestureState.vy > 0.7) {
            fullClose();
          } else {
            Animated.spring(sheetY, {
              toValue: 0,
              friction: 7,
              useNativeDriver: !IS_WEB,
            }).start();
          }
        }
        setIsDragging(false);
      },
      onPanResponderTerminate: () => setIsDragging(false),
    })
  ).current;

  // --- FORM LOGIC ---
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    let valid = true;
    let newErrors = {};
    if (!form.name.trim()) { newErrors.name = 'يرجى إدخال الاسم'; valid = false; }
    if (!form.phone.trim()) { newErrors.phone = 'يرجى إدخال رقم الهاتف'; valid = false; }
    if (!form.wilaya) { newErrors.wilaya = 'يرجى اختيار الولاية'; valid = false; }
    if (!form.businessField.trim()) { newErrors.businessField = 'يرجى ذكر مجالك الحالي'; valid = false; }
    if (!form.budget) { newErrors.budget = 'يرجى تحديد رأس المال'; valid = false; }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('registrations').insert([{ 
        name: form.name.trim(), 
        phone: form.phone.trim(), 
        email: form.email.trim(),
        wilaya: form.wilaya, 
        business_field: form.businessField.trim(), 
        capital: form.budget,
        visited_canton: form.visitedCanton, 
        status: 'new', 
        source: 'app_signup_final'
      }]);
      if (error) throw error;
      
      // -- UPDATED PIXEL TRACKING LOGIC --
      trackPixelEvent('Lead', {
        content_name: 'Course Registration',
        content_category: 'Signup',
        value: 23000,
        currency: 'DZD',
        user_data: { email: form.email, phone: form.phone }
      });
      
      trackPixelEvent('RegistrationComplete', {
        name: form.name,
        wilaya: form.wilaya,
        capital: form.budget
      }, true); // true = trackCustom
      
      await clearFormStorage();
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert("تعذر الاتصال بالخادم. يرجى التحقق من الانترنت.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isLoadingStorage && visible) {
    return (
      <Modal transparent visible={visible} animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay, opacity: fadeAnim }]} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <ArText style={styles.loadingText}>جاري تحميل البيانات...</ArText>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} onRequestClose={fullClose} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.overlay, opacity: fadeAnim }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={fullClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }} 
          pointerEvents="box-none"
        >
          <View style={[styles.bottomSheetWrapper, !IS_MOBILE && styles.bottomSheetWrapperDesktop]}>
            <Animated.View 
              style={[styles.sheetContainer, getShadow(2), { 
                width: IS_MOBILE ? '100%' : 600, 
                height: IS_MOBILE ? SCREEN_HEIGHT * 0.96 : 850,
                transform: [{ translateY: sheetY }] 
              }]}
              {...panResponder.panHandlers}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1B22' }]} />
              <View style={styles.dragHandle} />

              {isSuccess ? (
                <SuccessView name={form.name} onClose={fullClose} />
              ) : (
                <ScrollView 
                  ref={scrollViewRef}
                  contentContainerStyle={styles.scrollContent} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  scrollEventThrottle={16}
                  onScroll={({ nativeEvent }) => {
                    const isTop = nativeEvent.contentOffset.y <= 2;
                    setIsScrollAtTop(isTop);
                  }}
                  onTouchStart={() => { if (!isScrollAtTop) setIsDragging(false); }}
                  onScrollBeginDrag={() => setIsDragging(false)}
                >
                  <View style={styles.header}>
                      <Pressable onPress={fullClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color={COLORS.textWhite} />
                      </Pressable>
                      <View>
                        <ArText weight="900" style={styles.titleText}>معلومات التسجيل</ArText>
                        <ArText style={styles.subTitleText}>خطوة واحدة تفصلك عن حجز مكانك.</ArText>
                      </View>
                  </View>

                  <View style={{ marginBottom: 30 }}>
                    <InputField 
                      label="الإسم واللقب" 
                      icon="person" 
                      placeholder="الاسم الكامل" 
                      value={form.name} 
                      onChangeText={(t) => updateField('name', t)} 
                      error={errors.name}
                    />
                    
                    <InputField 
                      label="رقم الهاتف" 
                      icon="phone-iphone" 
                      placeholder="05XX..." 
                      keyboardType="phone-pad" 
                      value={form.phone} 
                      onChangeText={(t) => updateField('phone', t)} 
                      error={errors.phone} 
                    />
                    
                    <InputField 
                      label="البريد الإلكتروني" 
                      icon="mail-outline" 
                      placeholder="اختياري" 
                      keyboardType="email-address" 
                      value={form.email} 
                      onChangeText={(t) => updateField('email', t)} 
                    />

                    <DropdownTrigger 
                      label="الولاية" 
                      placeholder="اختر ولاية الإقامة" 
                      icon="map" 
                      value={form.wilaya} 
                      onPress={() => setShowWilayaModal(true)} 
                      error={errors.wilaya}
                    />
                    <InputField 
                      label="مجال النشاط الحالي" 
                      icon="store" 
                      placeholder="تجارة، طالب، موظف..." 
                      value={form.businessField} 
                      onChangeText={(t) => updateField('businessField', t)} 
                      error={errors.businessField}
                    />
                    <DropdownTrigger 
                      label="رأس المال المتوفر للبدء (تقريباً)" 
                      placeholder="اختر رأس المال" 
                      icon="account-balance-wallet" 
                      value={form.budget} 
                      onPress={() => setShowBudgetModal(true)} 
                      error={errors.budget}
                    />
                    <ToggleSwitch 
                      label="هل زرت معرض كانتون فير من قبل؟" 
                      value={form.visitedCanton} 
                      onValueChange={(val) => updateField('visitedCanton', val)} 
                    />
                  </View>

                  <Pressable 
                    onPress={handleSubmit} 
                    disabled={loading} 
                    style={({pressed}) =>[styles.submitBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                  >
                      {loading ? <ActivityIndicator color={COLORS.bgDark} /> : (
                        <View style={styles.submitContent}>
                            <ArText weight="900" style={styles.submitText}>إتمام التسجيل</ArText>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.bgDark} />
                        </View>
                      )}
                  </Pressable>
                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        <SelectionBottomSheet 
            visible={showWilayaModal} 
            title="اختر الولاية"
            data={FORM_CONFIG.wilayas} 
            searchable={true}
            onClose={() => setShowWilayaModal(false)} 
            onSelect={(item) => { updateField('wilaya', item.name); setShowWilayaModal(false); }}
        />

        <SelectionBottomSheet 
            visible={showBudgetModal} 
            title="اختر رأس المال"
            data={FORM_CONFIG.budgetOptions} 
            searchable={false}
            onClose={() => setShowBudgetModal(false)} 
            onSelect={(item) => { updateField('budget', item.label); setShowBudgetModal(false); }}
        />
      </View>
    </Modal>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  overlay: { 
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomSheetWrapper: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    pointerEvents: 'box-none' 
  },
  bottomSheetWrapperDesktop: {
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dragHandle: { 
    width: 40, 
    height: 5, 
    borderRadius: 3, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    alignSelf: 'center', 
    marginTop: 12,
    zIndex: 10,
  },
  scrollContent: { 
    padding: 30, 
    paddingTop: 10, 
    paddingBottom: 50 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 30 
  },
  closeBtn: { 
    padding: 8, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 20, 
    height: 40, 
    width: 40, 
    alignItems: 'center', 
    justifyContent:'center' 
  },
  titleText: { 
    fontSize: 24, 
    color: COLORS.textWhite, 
    textAlign: 'right' 
  },
  subTitleText: { 
    fontSize: 14, 
    color: COLORS.textGray, 
    textAlign: 'right', 
    marginTop: 4 
  },
  inputLabel: { 
    fontSize: 14, 
    color: COLORS.textWhite, 
    marginBottom: 8, 
    paddingRight: 4 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    height: 54 
  },
  inputFocused: { 
    borderColor: COLORS.primary, 
    backgroundColor: 'rgba(14, 178, 124, 0.1)', 
  },
  inputError: { 
    borderColor: COLORS.error, 
    backgroundColor: 'rgba(255, 69, 58, 0.1)', 
  },
  input: { 
    flex: 1, 
    height: '100%', 
    color: COLORS.textWhite, 
    fontFamily: 'Tajawal-Bold', 
    paddingHorizontal: 20, 
    fontSize: 16,
    textAlign: 'right'
  },
  inputIcon: { 
    paddingHorizontal: 16 
  },
  errorText: { 
    color: COLORS.error, 
    fontSize: 12, 
    marginTop: 4, 
    paddingRight: 4 
  },
  toggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 12, 
    padding: 4, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    position: 'relative'
  },
  toggleHighlight: { 
    position: 'absolute', 
    top: 4, 
    left: 4,
    bottom: 4, 
    backgroundColor: COLORS.primary, 
    borderRadius: 10,
    zIndex: 0,
  },
  toggleBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 10,
    zIndex: 1,
  },
  submitBtn: { 
    backgroundColor: COLORS.primary, 
    height: 60, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  submitContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  submitText: { 
    color: COLORS.bgDark, 
    fontSize: 18 
  },
  successContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40 
  },
  successIconBox: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: COLORS.primaryLight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24, 
    borderWidth: 2, 
    borderColor: COLORS.primary 
  },
  successTitle: { 
    fontSize: 28, 
    color: COLORS.textWhite, 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  successDesc: { 
    fontSize: 16, 
    color: COLORS.textGray, 
    lineHeight: 26, 
    marginBottom: 40, 
    textAlign: 'center' 
  },
  successBtn: { 
    width: '100%', 
    height: 56, 
    backgroundColor: COLORS.primary, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  sheetOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheetContent: {
    maxHeight: '75%',
    minHeight: 300,
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    padding: 20, 
    overflow: 'hidden',
    backgroundColor: '#0D1B22',
  },
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 12, 
    padding: 10, 
    marginBottom: 10, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  searchInput: { 
    flex: 1, 
    color: '#fff', 
    textAlign: 'right', 
    marginLeft: 10, 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 16 
  },
  listItem: { 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textWhite,
  },
});
// --- END OF FILE signup.js ---