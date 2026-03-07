import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Animated,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Easing,
  PanResponder,
  BackHandler
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../config/supabase';
import FORM_CONFIG from '../data/formConfig.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactPixel from 'react-facebook-pixel';

// --- CONSTANTS ---
const IS_WEB = Platform.OS === 'web';
const STORAGE_KEYS = {
  SIGNUP_FORM: 'signup_form_data',
  SIGNUP_FORM_TIMESTAMP: 'signup_form_timestamp'
};
const FORM_EXPIRY_DAYS = 7; // Keep form data for 7 days

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
  blueTint: 'rgba(0, 100, 200, 0.1)',
  blueTintLight: 'rgba(0, 50, 100, 0.15)',
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
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
      <View style={[ styles.inputContainer, isFocused && styles.inputFocused, error && styles.inputError ]}>
        <TextInput 
          style={styles.input} 
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
                <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center' }}>
                    <ArText align="right" style={{ fontSize: 15, color: value ? COLORS.textWhite : COLORS.textGray }}>{value || placeholder}</ArText>
                </View>
                <View style={styles.inputIcon}>
                  <MaterialIcons name={icon} size={22} color={error ? COLORS.error : (value ? COLORS.primary : COLORS.textGray)} />
                </View>
            </View>
        </Pressable>
        {error && <ArText style={styles.errorText} align="right">{error}</ArText>}
    </View>
);

const ChipsSelector = ({ label, options, selected, onSelect, error }) => (
    <View style={{ marginBottom: 20 }}>
        <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
        <View style={styles.chipsWrap}>
            {options.map((opt) => {
                const isActive = selected === opt.label;
                return (
                    <Pressable 
                      key={opt.id} 
                      onPress={() => onSelect(opt.label)} 
                      style={[styles.chip, isActive && styles.chipActive, error && !selected && { borderColor: COLORS.error }]}
                    >
                        <ArText style={[styles.chipText, isActive && { color: COLORS.bgDark }]} weight="700">{opt.label}</ArText>
                    </Pressable>
                )
            })}
        </View>
        {error && <ArText style={styles.errorText} align="right">{error}</ArText>}
    </View>
);

const ToggleSwitch = ({ label, value, onValueChange }) => {
    const [width, setWidth] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      if (width > 0) {
        Animated.timing(slideAnim, {
          toValue: value ? width / 2 : 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: !IS_WEB,
        }).start();
      }
    }, [value, width]);
  
    return (
      <View style={{ marginBottom: 24 }}>
        <ArText weight="700" style={styles.inputLabel}>{label}</ArText>
        <View 
          style={styles.toggleContainer} 
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View 
            style={[
              styles.toggleHighlight, 
              { transform: [{ translateX: slideAnim }] }
            ]} 
          />
          
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
  }, []);

  return (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIconBox, { transform: [{ scale: scaleAnim }] }]}>
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

// --- WILAYA PICKER BOTTOM SHEET ---
const SelectionBottomSheet = ({ visible, onClose, data, onSelect }) => {
    const { height } = useWindowDimensions();
    const sheetAnim = useRef(new Animated.Value(height)).current;
    const [isModalVisible, setIsModalVisible] = useState(visible);

    useEffect(() => {
        if (visible) {
            setIsModalVisible(true);
            Animated.timing(sheetAnim, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: !IS_WEB,
            }).start();
        } else {
            Animated.timing(sheetAnim, {
                toValue: height,
                duration: 300,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: !IS_WEB,
            }).start(() => {
                setIsModalVisible(false);
            });
        }
    }, [visible]);

    if (!isModalVisible) {
        return null;
    }

    const handleSelect = (item) => {
        onSelect(item);
        onClose();
    };

    return (
        <Modal transparent visible={isModalVisible} animationType="none" onRequestClose={onClose}>
            <View style={styles.wilayaOverlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.blueTintLight }]} />
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                
                <Animated.View style={[styles.wilayaSheet, { transform: [{ translateY: sheetAnim }] }]}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
                    <View style={styles.dragHandle} />
                    <ArText weight="700" style={{ fontSize: 18, marginBottom: 16 }}>اختر الولاية</ArText>
                    <View style={styles.searchBar}>
                        <MaterialIcons name="search" size={20} color={COLORS.textGray} />
                        <TextInput 
                          placeholder="بحث..." 
                          placeholderTextColor={COLORS.textGray} 
                          style={styles.searchInput} 
                          onChangeText={() => {}} 
                          textAlign="right" 
                        />
                    </View>
                    <FlatList 
                        data={data} 
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <Pressable style={styles.listItem} onPress={() => handleSelect(item)}>
                                <ArText align="right" style={{ fontSize: 16 }}>{item.name}</ArText>
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
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

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
  const [showWilayaModal, setShowWilayaModal] = useState(false);
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);

  // --- ANIMATIONS & GESTURES ---
  const sheetY = useRef(new Animated.Value(height)).current;
  const scrollViewRef = useRef(null);

  // --- PERSISTENCE FUNCTIONS ---
  const saveFormToStorage = async (formData) => {
    try {
      const dataToSave = {
        ...formData,
        _timestamp: Date.now()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_FORM, JSON.stringify(dataToSave));
      await AsyncStorage.setItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.error('Error saving form to storage:', error);
    }
  };

  const loadFormFromStorage = async () => {
    try {
      setIsLoadingStorage(true);
      
      // Check if form data is expired
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP);
      if (timestamp) {
        const savedTime = parseInt(timestamp);
        const now = Date.now();
        const daysSinceSaved = (now - savedTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceSaved > FORM_EXPIRY_DAYS) {
          // Clear expired data
          await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM);
          await AsyncStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM_TIMESTAMP);
          setIsLoadingStorage(false);
          return;
        }
      }

      const savedForm = await AsyncStorage.getItem(STORAGE_KEYS.SIGNUP_FORM);
      if (savedForm) {
        const parsedForm = JSON.parse(savedForm);
        // Remove the _timestamp field before setting state
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

  // Load saved form when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadFormFromStorage();
    }
  }, [visible]);

  // Save form whenever it changes (debounced)
  useEffect(() => {
    if (!isLoadingStorage && visible && !isSuccess) {
      const timeoutId = setTimeout(() => {
        saveFormToStorage(form);
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [form, visible, isSuccess, isLoadingStorage]);

  // --- BACK HANDLER FOR WEB ---
  useEffect(() => {
    if (IS_WEB) {
      const handlePopState = (event) => {
        if (visible) {
          event.preventDefault();
          fullClose();
          // Push a dummy state to prevent actual back navigation
          window.history.pushState(null, '', window.location.pathname);
        }
      };

      if (visible) {
        // Push a state when modal opens
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);
      }

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // Native back button handler
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (visible) {
          fullClose();
          return true; // Prevent default back behavior
        }
        return false;
      });

      return () => backHandler.remove();
    }
  }, [visible]);

  const handleCloseAnimation = (callback) => {
    Keyboard.dismiss();
    Animated.timing(sheetY, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: !IS_WEB,
    }).start(callback);
  };
  
  const fullClose = () => {
    // Don't clear form data when closing - keep it saved
    handleCloseAnimation(() => {
      onClose();
      // Only clear errors, keep form data
      setErrors({});
      setIsSuccess(false);
    });
  };
  
  useEffect(() => {
    if (visible) {
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 10,
        tension: 80,
        useNativeDriver: !IS_WEB,
      }).start();
    }
  }, [visible]);

  // --- PanResponder for Swipe-to-Close ---
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
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  // --- FORM LOGIC ---
  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
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
      
      // Track successful registration with Facebook Pixel
      ReactPixel.track('Lead', {
        content_name: 'Course Registration',
        content_category: 'Signup',
        value: 15000,
        currency: 'DZD',
        user_data: {
          email: form.email,
          phone: form.phone,
        }
      });
      
      // Also track custom event
      ReactPixel.trackCustom('RegistrationComplete', {
        name: form.name,
        wilaya: form.wilaya,
        capital: form.budget
      });
      
      await clearFormStorage();
      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      alert("تعذر الاتصال بالخادم. يرجى التحقق من الانترنت.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator while restoring saved form
  if (isLoadingStorage && visible) {
    return (
      <Modal transparent visible={visible} animationType="none">
        <View style={styles.overlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.blueTint }]} />
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
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.blueTint }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={fullClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }} 
          pointerEvents="box-none"
        >
          <View style={[styles.bottomSheetWrapper, !isMobile && { alignItems: 'center' }]}>
            <Animated.View 
              style={[styles.sheetContainer, getShadow(2), { 
                width: isMobile ? '100%' : 600, 
                height: isMobile ? height * 0.96 : 850,
                transform:[{ translateY: sheetY }] 
              }]}
              {...panResponder.panHandlers}
            >
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
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
                  onTouchStart={() => {
                    if (!isScrollAtTop) {
                      setIsDragging(false);
                    }
                  }}
                  onScrollBeginDrag={() => {
                    setIsDragging(false);
                  }}
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
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <InputField 
                            label="رقم الهاتف" 
                            icon="phone-iphone" 
                            placeholder="05XX..." 
                            keyboardType="phone-pad" 
                            value={form.phone} 
                            onChangeText={(t) => updateField('phone', t)} 
                            error={errors.phone} 
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <InputField 
                            label="البريد الإلكتروني" 
                            icon="mail-outline" 
                            placeholder="اختياري" 
                            keyboardType="email-address" 
                            value={form.email} 
                            onChangeText={(t) => updateField('email', t)} 
                          />
                        </View>
                    </View>
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
                    <ChipsSelector 
                      label="رأس المال المتوفر للبدء (تقريباً)" 
                      options={FORM_CONFIG.budgetOptions} 
                      selected={form.budget} 
                      onSelect={(val) => updateField('budget', val)} 
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
                    style={({pressed}) => [styles.submitBtn, pressed && { opacity: 0.9, transform:[{scale:0.98}] }]}
                  >
                      {loading ? <ActivityIndicator color={COLORS.bgDark} /> : (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
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
            data={FORM_CONFIG.wilayas} 
            onClose={() => setShowWilayaModal(false)} 
            onSelect={(item) => { updateField('wilaya', item.name); setShowWilayaModal(false); }}
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
  sheetContainer: {
    backgroundColor: 'rgba(13, 27, 34, 0.85)',
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
    fontSize: 16 
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

  chipsWrap: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  chip: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    height: 48, 
    justifyContent: 'center' 
  },
  chipActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary 
  },
  chipText: { 
    color: COLORS.textWhite 
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
    width: '50%',
    backgroundColor: COLORS.primary, 
    borderRadius: 10 
  },
  toggleBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  submitBtn: { 
    backgroundColor: COLORS.primary, 
    height: 60, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
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

  wilayaOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  wilayaSheet: {
    height: '60%',
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    padding: 20, 
    overflow: 'hidden',
    backgroundColor: 'rgba(13, 27, 34, 0.85)',
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