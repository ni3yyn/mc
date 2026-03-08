// --- START OF FILE App.js ---

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  Platform,
  StatusBar,
  Animated,
  Easing,
  Linking,
  useWindowDimensions,
  PanResponder,
  Image // Ensure Image is imported for non-animated fallbacks if needed
} from 'react-native';
import * as Font from 'expo-font';

import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BlurView } from 'expo-blur'; 
import SignupModal from './src/components/signup'; 
import ReactPixel from 'react-facebook-pixel';
import AdminNavigator from './src/navigation/AdminNavigator';

// --- PURE WEB CSS INJECTION ---
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rnw-responsive-overrides';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        background-color: #F4F7F6 !important;
        height: 100%;
        width: 100%;
        overscroll-behavior-y: none;
        overflow-x: hidden !important; 
        margin: 0;
        padding: 0;
        color: #0F172A;
      }
      ::-webkit-scrollbar {
        width: 0px;
        background: transparent;
        display: none;
      }
    `;
    document.head.append(style);
  }
}

SplashScreen.preventAutoHideAsync();

// --- FACEBOOK PIXEL ---
const FACEBOOK_PIXEL_ID = '4367566626898675'; 
if (Platform.OS === 'web' && FACEBOOK_PIXEL_ID) {
  ReactPixel.init(FACEBOOK_PIXEL_ID, null, { autoConfig: true, debug: false });
}

const trackPixelEvent = (eventName, data = {}) => {
  if (Platform.OS === 'web' && FACEBOOK_PIXEL_ID) {
    eventName === 'PageView' ? ReactPixel.pageView() : ReactPixel.trackCustom(eventName, data);
  }
};

// --- ASSETS & TOKENS ---
const HERO_IMAGES =[
  'https://res.cloudinary.com/de122nwjr/image/upload/v1772900792/n9kivzlwncou4dvpx1om.jpg', 
  'https://res.cloudinary.com/de122nwjr/image/upload/v1772902795/hvuy9taktj9sgrkup3ch.jpg', 
  'https://res.cloudinary.com/de122nwjr/image/upload/v1772900792/k26tsyyf6yi8krreddgg.jpg',
  'https://res.cloudinary.com/de122nwjr/image/upload/v1772990654/hirkrexoefbmg6bm7e6l.jpg',
  'https://res.cloudinary.com/de122nwjr/image/upload/v1772991295/zppjil9mxadxt1949w83.jpg'
];

const COLORS = {
  primary: '#0EB27C',       
  primaryHover: '#0A8F62',
  primaryLight: 'rgba(14, 178, 124, 0.1)',
  bgMain: '#F4F7F6',        
  bgWhite: '#FFFFFF',       
  textMain: '#0F172A',      
  textMuted: '#475569',     
  textLight: '#94A3B8',     
  whatsapp: '#25D366',
  accentRed: '#EF4444',
  border: 'rgba(0, 0, 0, 0.08)',
};

// --- SCROLL REVEAL ANIMATION COMPONENT (THE CONVERSION BEAST ENGINE) ---
const ScrollReveal = ({ children, direction = 'up', delay = 0, style, duration = 800 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const viewRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Only animate once
          }
        },
        { threshold: 0.15 } // Trigger when 15% visible
      );
      
      if (viewRef.current) {
        observer.observe(viewRef.current);
      }
      return () => observer.disconnect();
    } else {
      // Fallback for native: simple delay mount
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(animValue, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, delay]);

  // Interpolations based on direction
  const translateY = direction === 'up' || direction === 'down' 
    ? animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [direction === 'up' ? 50 : -50, 0] 
      }) 
    : 0;

  const translateX = direction === 'left' || direction === 'right'
    ? animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [direction === 'left' ? -50 : 50, 0] // Left means coming FROM left
      })
    : 0;

  const scale = direction === 'zoom'
    ? animValue.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
    : 1;

  return (
    <Animated.View
      ref={viewRef}
      // On web, we assign the ID to finding the DOM node easier if needed, but ref usually works
      style={[
        style,
        {
          opacity: animValue,
          transform: [
            { translateY },
            { translateX },
            { scale }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// --- COMPONENTS ---
const BlurCard = ({ style, children }) => (
  <View style={[styles.cardBase, style]}>{children}</View>
);

const BrandBackground = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgMain, overflow: 'hidden' }]} pointerEvents="none">
    <View style={[styles.redSun, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]} />
    <View style={[styles.redSun, { backgroundColor: 'rgba(239, 68, 68, 0.06)', transform:[{ scale: 1.9 }] }]} />
    <View style={[styles.greenWave1, { opacity: 0.12 }]} />
    <View style={[styles.greenWave2, { opacity: 0.12 }]} />
    <View style={[styles.greenWave3, { opacity: 0.12 }]} />
    <View style={[styles.lineArtGrid, { borderColor: 'rgba(14, 178, 124, 0.12)' }]} />
  </View>
);

// --- HERO IMAGE SHOWCASE ---
const HeroImageShowcase = () => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const[activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const handPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMobile) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(handPulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(handPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isMobile]);

  const goToIndex = useCallback((newIndex) => {
    if (newIndex === activeIndex) return;
    Animated.timing(scrollAnim, {
      toValue: newIndex,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    setActiveIndex(newIndex);
  },[activeIndex]);

  const nextImage = useCallback(() => goToIndex((activeIndex + 1) % HERO_IMAGES.length), [activeIndex, goToIndex]);
  const prevImage = useCallback(() => goToIndex((activeIndex - 1 + HERO_IMAGES.length) % HERO_IMAGES.length), [activeIndex, goToIndex]);

  useEffect(() => {
    const timer = setInterval(nextImage, 5000);
    return () => clearInterval(timer);
  }, [nextImage]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) prevImage();
        else if (gestureState.dx < -50) nextImage();
      }
    })
  ).current;

  return (
    <View style={styles.showcaseContainer} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} {...panResponder.panHandlers}>
      {containerWidth > 0 && (
        <Animated.View style={{ flexDirection: 'row', width: containerWidth * HERO_IMAGES.length, height: '100%', transform:[{ translateX: scrollAnim.interpolate({ inputRange: HERO_IMAGES.map((_, i) => i), outputRange: HERO_IMAGES.map((_, i) => -i * containerWidth) }) }] }}>
          {HERO_IMAGES.map((img, index) => (
            <Animated.Image key={index} source={{ uri: img }} style={{ width: containerWidth, height: '100%' }} resizeMode="cover" />
          ))}
        </Animated.View>
      )}
      <View style={styles.floatingCredibilityPill}>
        <View style={styles.pillIconBox}><MaterialIcons name="verified" size={16} color={COLORS.primary} /></View>
        <ArText style={styles.pillText} weight="700">صور من معرض كانتون فير - الصين 🇨🇳</ArText>
      </View>
      {!isMobile ? (
        <View style={styles.showcaseNavOverlay} pointerEvents="box-none">
          <Pressable onPress={prevImage} style={({pressed}) =>[styles.navArrow, pressed && { opacity: 0.7 }]}><MaterialIcons name="chevron-left" size={28} color={COLORS.textMain} /></Pressable>
          <Pressable onPress={nextImage} style={({pressed}) =>[styles.navArrow, pressed && { opacity: 0.7 }]}><MaterialIcons name="chevron-right" size={28} color={COLORS.textMain} /></Pressable>
        </View>
      ) : (
        <View style={[styles.showcaseNavOverlay, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
          <Pressable onPress={nextImage} style={({pressed}) => [pressed && { opacity: 0.7 }]} hitSlop={20}>
            <Animated.View style={[styles.mobileHintBtn, { transform: [{ scale: handPulseAnim }] }]}>
              <MaterialIcons name="touch-app" size={22} color={COLORS.textMain} />
            </Animated.View>
          </Pressable>
        </View>
      )}
      <View style={styles.dotsContainer}>
        {HERO_IMAGES.map((_, i) => (
          <Pressable key={i} onPress={() => goToIndex(i)} hitSlop={10}>
            <Animated.View style={[styles.dot, { width: scrollAnim.interpolate({ inputRange:[i - 1, i, i + 1], outputRange:[8, 24, 8], extrapolate: 'clamp' }), opacity: scrollAnim.interpolate({ inputRange:[i - 1, i, i + 1], outputRange:[0.5, 1, 0.5], extrapolate: 'clamp' }), backgroundColor: '#FFFFFF' }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

// --- TYPEWRITER ---
const TypewriterText = ({ texts, speed = 150, delay = 2000, style }) => {
  const[displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const[currentTextIndex, setCurrentTextIndex] = useState(0);
  const cursorBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 500, useNativeDriver: true }),
    ])).start();
  },[]);

  useEffect(() => {
    let timeout;
    const currentFullText = texts[currentTextIndex];
    if (!isDeleting && displayText === currentFullText) {
      timeout = setTimeout(() => setIsDeleting(true), delay);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayText((prev) => isDeleting ? prev.slice(0, -1) : currentFullText.slice(0, prev.length + 1));
      }, speed);
    }
    return () => clearTimeout(timeout);
  },[displayText, isDeleting, currentTextIndex, texts]);

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
      <Text style={style}>{displayText}</Text>
      <Animated.Text style={[style, { color: COLORS.primary, opacity: cursorBlink, marginLeft: 2, marginRight: 7, width: 2 }]}>|</Animated.Text>
    </View>
  );
};

// --- UTILS ---
const MaxWidthContainer = ({ children, style }) => (
  <View style={[{ width: '100%', alignItems: 'center', justifyContent: 'center' }, style]}>
    <View style={{ width: '100%', maxWidth: 1200, paddingHorizontal: 20, alignItems: 'center' }}>{children}</View>
  </View>
);

const ArText = ({ style, children, weight = '400', align = 'right', ...props }) => {
  let fontFamily = 'Tajawal-Regular';
  if (weight === '700') fontFamily = 'Tajawal-Bold';
  if (weight === '900') fontFamily = 'Tajawal-Black';
  return <Text {...props} style={[{ textAlign: align, color: COLORS.textMain, writingDirection: 'rtl', fontFamily }, weight === '900' && { letterSpacing: -0.5 }, style]}>{children}</Text>;
};

// --- BUTTONS ---
const PrimaryButton = ({ title, icon, onPress, style, pixelEvent }) => (
  <Pressable 
    onPress={() => {
      if (pixelEvent) trackPixelEvent(pixelEvent, { button_name: title });
      onPress?.();
    }}
    style={({pressed}) =>[styles.btnBase, styles.btnPrimary, pressed && { opacity: 0.9, transform:[{scale: 0.98}] }, style]}
  >
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <ArText style={styles.btnTextPrimary} weight="700" align="right">{title}</ArText>
      {icon && <MaterialIcons name={icon} size={20} color={COLORS.bgWhite} />}
    </View>
  </Pressable>
);

const OutlineButton = ({ title, icon, onPress, style, isSuccess }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(flipAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
    Animated.timing(bgAnim, { toValue: isSuccess ? 1 : 0, duration: 700, useNativeDriver: false }).start();
  },[isSuccess, title]);

  return (
    <Pressable 
      onPress={() => { trackPixelEvent('ReadMoreClick', { button_name: title }); onPress?.(); }}
      style={({pressed}) =>[pressed && !isSuccess && { opacity: 0.8 }, style]}
    >
      <Animated.View style={[styles.btnBase, styles.btnOutline, { backgroundColor: bgAnim.interpolate({ inputRange: [0, 1], outputRange:['rgba(0, 0, 0, 0.02)', COLORS.primaryLight] }), borderColor: bgAnim.interpolate({ inputRange:[0, 1], outputRange:['rgba(0, 0, 0, 0.1)', COLORS.primary] }), width: '100%' }]}>
        <Animated.View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%', opacity: flipAnim.interpolate({ inputRange:[0, 0.5, 1], outputRange:[0, 0, 1] }), transform:[{ rotateX: flipAnim.interpolate({ inputRange:[0, 1], outputRange:['90deg', '0deg'] }) }] }}>
          <ArText style={[styles.btnTextOutline, isSuccess && { color: COLORS.primary }]} weight="700" align="right">{title}</ArText>
          {icon && <MaterialIcons name={icon} size={22} color={isSuccess ? COLORS.primary : COLORS.textMain} />}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const Logo = ({ size = 'normal', showDot = true }) => {
  const fontSize = size === 'small' ? 14 : 22;
  return (
    <View style={styles.logoRow}>
      {showDot && <View style={[styles.logoDot, size === 'small' && { width: 4, height: 4, marginRight: 4 }]} />}
      <ArText style={[styles.logoText, { fontSize }]} weight="900">كلاس</ArText>
      <ArText style={[styles.logoText, { color: COLORS.primary, fontSize }]} weight="900"> ماستر</ArText>
    </View>
  );
};

const Header = ({ setSignupVisible }) => (
  <BlurView intensity={80} tint="light" style={styles.header}>
    <View style={styles.headerContainer}>
       <Pressable style={styles.headerBtn} onPress={() => { trackPixelEvent('HeaderSignupClick'); setSignupVisible(true); }}>
         <ArText style={{color: COLORS.bgWhite, fontSize: 14}} weight="700" align="center">سجل الان</ArText>
       </Pressable>
       <Logo />
    </View>
  </BlurView>
);

const FloatingWhatsApp = () => {
  const[noteVisible, setNoteVisible] = useState(false);
  const[hasInteracted, setHasInteracted] = useState(false);
  const noteAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.25, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ])).start();
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setNoteVisible(true);
        Animated.sequence([ Animated.timing(noteAnim, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.delay(4000), Animated.timing(noteAnim, { toValue: 0, duration: 500, useNativeDriver: true }) ]).start(() => setNoteVisible(false));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasInteracted]);

  return (
    <View style={styles.whatsappContainer}>
      
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.whatsapp, borderRadius: 30, opacity: pulseAnim.interpolate({ inputRange:[1, 1.25], outputRange: [0.6, 0] }), transform:[{ scale: pulseAnim.interpolate({ inputRange:[1, 1.25], outputRange:[1, 1.7] }) }] }]} pointerEvents="none" />
        <Pressable onPress={() => { setHasInteracted(true); setNoteVisible(false); Linking.openURL('https://wa.me/213557033050'); }} style={({ pressed }) =>[styles.whatsappButton, pressed && styles.whatsappButtonPressed]}>
          <MaterialCommunityIcons name="whatsapp" size={34} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

// --- MAIN APP ---
export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992; 
  const [isSignupVisible, setSignupVisible] = useState(false);
  const[showAdmin, setShowAdmin] = useState(false);
  const scrollViewRef = useRef(null);
  const[benefitsSectionY, setBenefitsSectionY] = useState(0);
  const[isReadMoreClicked, setIsReadMoreClicked] = useState(false);

  useEffect(() => { trackPixelEvent('PageView'); trackPixelEvent('LandingPageView', { page: 'home', device: Platform.OS }); },[]);
  useEffect(() => { if (Platform.OS === 'web' && window.location.pathname.startsWith('/admin')) setShowAdmin(true); },[]);

  const handleReadMoreClick = () => {
    setIsReadMoreClicked(true);
    setTimeout(() => { if (scrollViewRef.current && benefitsSectionY > 0) scrollViewRef.current.scrollTo({ y: benefitsSectionY - 80, animated: true }); }, 600); 
    setTimeout(() => setIsReadMoreClicked(false), 3000);
  };

  const[fontsLoaded] = useFonts({
    'Tajawal-Regular': require('./src/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('./src/fonts/Tajawal-Bold.ttf'),
    'Tajawal-Black': require('./src/fonts/Tajawal-Black.ttf'),
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  const onLayoutRootView = useCallback(async () => { if (fontsLoaded) await SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  if (showAdmin) return <AdminNavigator />;

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgMain} />
      <BrandBackground />
      <Header setSignupVisible={() => setSignupVisible(true)} />
      <FloatingWhatsApp />

      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <MaxWidthContainer>
            <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: isDesktop ? 60 : 40 }}>
              
              {/* Text: Slides in from Right (Arabic direction) */}
              <ScrollReveal direction="right" style={{ flex: 1.2, alignItems: isDesktop ? 'flex-end' : 'center', zIndex: 10 }}>
                <View style={[styles.heroBadge, { alignSelf: isDesktop ? 'flex-end' : 'center' }]}>
                  <ArText style={styles.badgeText} weight="700">دورة تدريبية عملية 100%</ArText>
                  <MaterialIcons name="lock-outline" size={14} color={COLORS.primary} />
                </View>

                <View style={[styles.titleWrapper, { alignItems: isDesktop ? 'flex-end' : 'center' }]}>
                  <ArText style={[styles.heroHeading, { textAlign: isDesktop ? 'right' : 'center', marginBottom: 0 }]} weight="900">من الصفر حتى</ArText>
                  <TypewriterText texts={['أول شحنة', 'أول ربح', 'ألف قطعة', 'الوصول']} speed={60} delay={1500} style={[styles.heroHeading, styles.heroHeadingDynamic, { textAlign: isDesktop ? 'right' : 'center' }]} />
                </View>

                <ArText style={styles.heroSub} align={isDesktop ? 'right' : 'center'}>ستتعلم المسار الكامل للإستيراد بطريقة واضحة وعملية من معرض كانتون فير بدل الاعتماد على معلومات متفرقة و غير واضحة.</ArText>

                <View style={[styles.heroBtnGroup, { justifyContent: isDesktop ? 'flex-end' : 'center' }]}>
                  <PrimaryButton title="سجل الآن" icon="arrow-back" style={{ flexGrow: 1, flexBasis: 180, maxWidth: 350 }} onPress={() => setSignupVisible(true)} pixelEvent="HeroSignupClick" />
                  <OutlineButton title={isReadMoreClicked ? "بالطبع" : "قراءة المزيد"} icon={isReadMoreClicked ? "check" : "arrow-downward"} isSuccess={isReadMoreClicked} style={{ flexGrow: 1, flexBasis: 180, maxWidth: 350 }} onPress={handleReadMoreClick} />
                </View>
              </ScrollReveal>

              {/* Image: Slides in from Left (Meeting the text) */}
              <ScrollReveal direction="left" delay={200} style={{ flex: 1, width: '100%', alignItems: 'center' }}>
                <HeroImageShowcase />
              </ScrollReveal>

            </View>
          </MaxWidthContainer>
        </View>

        {/* BENEFITS GRID */}
        <View style={{ paddingVertical: 80 }} onLayout={(e) => setBenefitsSectionY(e.nativeEvent.layout.y)}>
          <MaxWidthContainer>
            <ScrollReveal direction="up" style={{ alignItems: 'center', marginBottom: 60, width: '100%' }}>
              <ArText style={styles.sectionTitle} weight="900" align="center">ماذا ستستفيد من هذا التكوين؟</ArText>
              <ArText style={styles.sectionSub} align="center">محتوى حصري يضعك على الطريق الصحيح</ArText>
            </ScrollReveal>

            <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'stretch', justifyContent: 'center', gap: 24, width: '100%' }}>
              {[
                { icon: "shield-alert-outline", title: "تجنب الأخطاء المكلفة", desc: "نتحدث عن الأخطاء الشائعة التي يقع فيها المستوردون الجدد وكيف يمكن تجنبها قبل أن تستثمر أموالك." },
                { icon: "storefront-outline", title: "فهم معرض كانتون فير", desc: "ستتعرف على كيفية الاستفادة من أكبر معرض تجاري في الصين وكيف تبحث عن الموردين المناسبين هناك." },
                { icon: "file-pdf-box", title: "دليل PDF جاهز للعمل", desc: "يتضمن معلومات عن الاستيراد، كانتون فير، أسواق الجملة، إضافة إلى قائمة موردين ومصانع." },
                { icon: "account-group-outline", title: "فرصة Networking", desc: "التعرف على أشخاص يعملون أو يريدون العمل في الاستيراد قد يفتح لك فرص شراكات وأفكار مشاريع." }
              ].map((item, index) => (
                <ScrollReveal key={index} direction="up" delay={index * 150} style={isDesktop ? { flex: 1 } : { width: '100%' }}>
                  <BlurCard style={[styles.glassCard, { width: '100%', height: '100%', padding: 24 }]}>
                    <View style={[styles.iconBoxOutline, { width: 60, height: 60, borderRadius: 30, marginBottom: 20 }]}>
                      <MaterialCommunityIcons name={item.icon} size={28} color={COLORS.primary} />
                    </View>
                    <ArText style={[styles.probTitle, { fontSize: 20 }]} weight="700" align="center">{item.title}</ArText>
                    <ArText style={[styles.probDesc, { fontSize: 14 }]} align="center">{item.desc}</ArText>
                  </BlurCard>
                </ScrollReveal>
              ))}
            </View>
          </MaxWidthContainer>
        </View>

        {/* TIMELINE */}
        <View style={{ backgroundColor: COLORS.bgWhite, paddingVertical: 80, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <MaxWidthContainer>
            <ScrollReveal direction="up" style={{ alignItems: 'center', marginBottom: 60, width: '100%' }}>
              <ArText style={styles.eyebrow} weight="700" align="center">المسار الكامل</ArText>
              <ArText style={styles.sectionTitle} weight="900" align="center">خريطة طريق واضحة للبدء بثقة</ArText>
              <ArText style={styles.sectionSub} align="center">خطوات عملية من شاشة حاسوبك حتى وصول بضاعتك للجزائر</ArText>
            </ScrollReveal>

            <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center' }}>
              {[
                { icon: "map-search-outline", title: "فهم الخطوات الحقيقية للاستيراد من الصين", desc: "ستتعلم المسار الكامل للاستيراد بطريقة واضحة وعملية من معرض كانتون فير بدل الاعتماد على معلومات متفرقة غير عملية." },
                { icon: "factory", title: "كيف تختار المورد أو المصنع المناسب", desc: "ستعرف كيف تميّز بين المصنع الحقيقي والوسيط، وكيف تختار المورد الذي يناسب مشروعك." },
                { icon: "handshake", title: "تعلم أساسيات التفاوض مع الموردين الصينيين", desc: "ستفهم كيف تناقش السعر، شروط الدفع، والكميات بطريقة احترافية." },
                { icon: "flag-checkered", title: "خطة واضحة للبدء في الاستيراد بثقة", desc: "ستغادر الجلسة بفهم عملي وخطوات واضحة يمكنك تطبيقها مباشرة في مشروعك.", isLast: true, isHighlight: true }
              ].map((item, index) => (
                <ScrollReveal key={index} direction="right" delay={index * 100}>
                  <View style={styles.tlRow}>
                    <View style={{ flex: 1, paddingRight: 24, paddingBottom: 40, alignItems: 'flex-end' }}>
                      <View style={[styles.tlCard, item.isHighlight && styles.tlCardHighlight]}>
                        <ArText style={[styles.tlTitle, item.isHighlight && { color: COLORS.primary }]} weight="700" align="right">{item.title}</ArText>
                        <ArText style={styles.tlDesc} align="right">{item.desc}</ArText>
                      </View>
                    </View>
                    <View style={styles.tlLineCol}>
                      <View style={[styles.tlBubble, item.isHighlight ? styles.tlBubbleHighlight : styles.tlBubbleDefault]}>
                        <MaterialCommunityIcons name={item.icon} size={item.isHighlight ? 20 : 18} color={item.isHighlight ? COLORS.bgWhite : COLORS.primary} />
                      </View>
                      {!item.isLast && <View style={styles.tlLine} />}
                    </View>
                  </View>
                </ScrollReveal>
              ))}
            </View>
          </MaxWidthContainer>
        </View>

        {/* OUTCOMES SECTION */}
        <View style={{ paddingVertical: 80, backgroundColor: COLORS.bgMain }}>
          <MaxWidthContainer>
            <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: isDesktop ? 60 : 20 }}>
              
              <ScrollReveal direction="right" style={{ flex: 1, alignItems: isDesktop ? 'flex-end' : 'center', width: '100%' }}>
                <ArText style={styles.sectionTitle} weight="900" align={isDesktop ? "right" : "center"}>نتيجة هذا <Text style={{ color: COLORS.primary }}>التكوين</Text></ArText>
                <ArText style={[styles.sectionSub, { marginBottom: isDesktop ? 0 : 10 }]} align={isDesktop ? "right" : "center"}>بناء أساس متين لمشروع تجاري مربح ومستدام.</ArText>
              </ScrollReveal>

              <View style={{ flex: 1.2, width: '100%', gap: 12 }}> 
                {[
                  "مسار كامل وواضح للاستيراد من الصين.",
                  "أسرار تجنب الأخطاء المكلفة مادياً.",
                  "مهارات التفاوض وتحديد الكميات باحترافية.",
                ].map((txt, i) => (
                  <ScrollReveal key={i} direction="left" delay={i * 100}>
                    <BlurCard style={{ padding: 18, backgroundColor: COLORS.bgWhite, shadowOpacity: 0.02 }}>
                      <View style={styles.checkRow}>
                        <ArText style={styles.checkText} align="right">{txt}</ArText>
                        <View style={styles.checkIcon}><MaterialIcons name="check" size={14} color={COLORS.primary} /></View>
                      </View>
                    </BlurCard>
                  </ScrollReveal>
                ))}
                
                <ScrollReveal direction="left" delay={400}>
                  <BlurCard style={{ padding: 18, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, borderWidth: 1, shadowOpacity: 0 }}>
                    <View style={styles.checkRow}>
                      <ArText style={[styles.checkText, { color: COLORS.textMain }]} weight="700" align="right">قائمة موردين ومصانع جاهزة للعمل مع دليل PDF.</ArText>
                      <View style={[styles.checkIcon, { backgroundColor: COLORS.primary }]}><MaterialIcons name="check" size={14} color={COLORS.bgWhite} /></View>
                    </View>
                  </BlurCard>
                </ScrollReveal>
              </View>

            </View>
          </MaxWidthContainer>
        </View>

        {/* CTA SECTION - ZOOM EFFECT */}
        <View style={{ paddingVertical: 100, alignSelf: 'center', width: '100%' }}>
          <MaxWidthContainer>
            <View style={{ flexDirection: isDesktop ? 'row-reverse' : 'column', alignItems: 'center', width: '100%', gap: isDesktop ? 60 : 40 }}>
              
              <ScrollReveal direction="right" style={{ flex: 1, alignItems: isDesktop ? 'flex-end' : 'center', width: '100%' }}>
                <View style={[styles.iconBoxOutline, isDesktop && { alignSelf: 'flex-end' }, { backgroundColor: COLORS.primaryLight, borderColor: 'transparent' }]}>
                   <MaterialIcons name="rocket-launch" size={40} color={COLORS.primary} />
                </View>
                <ArText style={[styles.ctaTitle, {marginTop: 24}]} weight="900" align={isDesktop ? "right" : "center"}>مستعد لتبدأ رحلتك في الاستيراد؟</ArText>
                <ArText style={styles.ctaSub} align={isDesktop ? "right" : "center"}>لا تفوت فرصة بناء مشروعك بالطريقة الصحيحة، احجز مقعدك وانضم للناجحين.</ArText>
              </ScrollReveal>

              <ScrollReveal direction="zoom" delay={200} style={{ flex: 1.2, width: '100%', maxWidth: 600 }}>
                <BlurCard style={styles.pricingCard}>
                  <View style={styles.priceRow}>
                    <View style={{ flexGrow: 1, flexBasis: 200 }}>
                      <PrimaryButton title="سجل في الدورة الآن" style={{ paddingHorizontal: 40 }} onPress={() => setSignupVisible(true)} pixelEvent="CTASignupClick" />
                    </View>
                    <View style={styles.priceInfo}>
                      <ArText style={styles.priceLabel} align="right">سعر التكوين</ArText>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <ArText style={styles.priceNum} weight="700">23,000</ArText>
                        <ArText style={styles.priceCurr} weight="700">د.ج</ArText>
                      </View>
                    </View>
                  </View>
                  <ArText style={styles.secureText} align="center">دفع آمن بوسائل الدفع المحلية (BaridiMob, CCP)</ArText>
                </BlurCard>
              </ScrollReveal>

            </View>
          </MaxWidthContainer>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <MaxWidthContainer>
            <View style={styles.footerContent}>
              <Logo />
              <View style={styles.footerContactRow}>
                 <ArText style={styles.footerLink}>abdelkaderlahouadji@gmail.com</ArText>
                 <MaterialIcons name="mail-outline" size={18} color={COLORS.textMuted} />
              </View>
              <ArText style={styles.copy}>© 2026 جميع الحقوق محفوظة</ArText>
            </View>
          </MaxWidthContainer>
        </View>

      </ScrollView>
      <SignupModal visible={isSignupVisible} onClose={() => setSignupVisible(false)} onOpen={() => trackPixelEvent('SignupModalViewed')} />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgMain, overflow: 'hidden' },
  cardBase: { backgroundColor: COLORS.bgWhite, borderColor: COLORS.border, borderWidth: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  redSun: { position: 'absolute', top: 120, right: '17%', width: 50, height: 50, borderRadius: 45, backgroundColor: COLORS.accentRed },
  greenWave1: { position: 'absolute', top: -200, left: '-20%', width: '120%', height: 450, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '-12deg' }], borderBottomRightRadius: 600, borderBottomLeftRadius: 200 },
  greenWave2: { position: 'absolute', top: '30%', right: '-40%', width: 80, height: 250, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '-35deg' }], borderTopLeftRadius: 500, borderBottomLeftRadius: 500 },
  greenWave3: { position: 'absolute', bottom: -100, left: '-10%', width: '120%', height: 350, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '15deg' }], borderTopRightRadius: 600, borderTopLeftRadius: 300 },
  lineArtGrid: { position: 'absolute', bottom: 0, right: 0, width: 400, height: 400, borderWidth: 1, borderColor: 'rgba(14, 178, 124, 0.12)', borderRadius: 200, transform:[{ scale: 2 }, { translateX: 100 }, { translateY: 100 }] },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 70, zIndex: 100, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 1200, paddingHorizontal: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 22, color: COLORS.textMain },
  logoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accentRed, marginRight: 6, marginTop: -10 },
  headerBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  heroSection: { width: '100%', paddingTop: 120, paddingBottom: 60, position: 'relative', zIndex: 2 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 24, borderRadius: 30, backgroundColor: COLORS.bgWhite, borderWidth: 1, borderColor: COLORS.border },
  badgeText: { color: COLORS.primary, fontSize: 14, marginRight: 8 },
  titleWrapper: { flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 24 },
  heroHeading: { fontSize: Platform.OS === 'web' ? 'clamp(40px, 5vw, 64px)' : 48, lineHeight: Platform.OS === 'web' ? 'clamp(50px, 6vw, 76px)' : 58, color: COLORS.textMain },
  heroHeadingDynamic: { color: COLORS.primary, fontFamily: 'Tajawal-Black' },
  heroSub: { fontSize: Platform.OS === 'web' ? 'clamp(18px, 2.5vw, 22px)' : 16, color: COLORS.textMuted, maxWidth: 680, marginBottom: 40, lineHeight: Platform.OS === 'web' ? 'clamp(28px, 3.5vw, 34px)' : 26 },
  heroBtnGroup: { flexDirection: 'row-reverse', flexWrap: 'wrap', width: '100%', gap: 16 },
  showcaseContainer: { width: '100%', maxWidth: 500, aspectRatio: 0.8, borderRadius: 24, overflow: 'hidden', backgroundColor: COLORS.bgWhite, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 15, borderWidth: 4, borderColor: COLORS.bgWhite, position: 'relative' },
  floatingCredibilityPill: { position: 'absolute', top: 20, alignSelf: 'center', flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 10 },
  pillIconBox: { backgroundColor: COLORS.primaryLight, padding: 4, borderRadius: 12, marginLeft: 8 },
  pillText: { fontSize: 13, color: COLORS.textMain },
  showcaseNavOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, zIndex: 10 },
  navArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.85)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  mobileHintBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  dotsContainer: { position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dot: { height: 8, borderRadius: 4 },
  btnBase: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, minWidth: 180, borderWidth: 1, borderColor: 'transparent' },
  btnPrimary: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  btnOutline: { backgroundColor: 'rgba(0, 0, 0, 0.02)', borderColor: 'rgba(0, 0, 0, 0.1)' },
  btnTextPrimary: { color: COLORS.bgWhite, fontSize: 16 },
  btnTextOutline: { color: COLORS.textMain, fontSize: 16 },
  sectionTitle: { fontSize: Platform.OS === 'web' ? 'clamp(28px, 4vw, 36px)' : 28, marginBottom: 16, lineHeight: Platform.OS === 'web' ? 'clamp(40px, 5vw, 50px)' : 40, color: COLORS.textMain },
  sectionSub: { fontSize: 18, color: COLORS.textMuted, maxWidth: 600, lineHeight: 28 },
  glassCard: { padding: 32, flexGrow: 1, flexBasis: 280, maxWidth: 400, alignSelf: 'center' },
  iconBoxOutline: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignSelf: 'center', borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: COLORS.primaryLight },
  probTitle: { fontSize: 22, marginBottom: 12 },
  probDesc: { color: COLORS.textMuted, fontSize: 15, lineHeight: 24 },
  eyebrow: { color: COLORS.primary, marginBottom: 12, letterSpacing: 1, fontSize: 16 },
  tlRow: { flexDirection: 'row', width: '100%' },
  tlLineCol: { width: 60, alignItems: 'center' },
  tlBubble: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 10, backgroundColor: COLORS.bgWhite },
  tlBubbleDefault: { borderColor: COLORS.border },
  tlBubbleHighlight: { borderColor: COLORS.primary, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.4, shadowRadius: 10 },
  tlLine: { width: 2, backgroundColor: COLORS.border, flex: 1, marginVertical: 4 },
  tlCard: { padding: 24, alignItems: 'flex-end', width: '100%', borderRadius: 16, backgroundColor: COLORS.bgWhite, borderWidth: 1, borderColor: COLORS.border },
  tlCardHighlight: { borderColor: COLORS.primaryLight, backgroundColor: COLORS.bgMain },
  tlTitle: { fontSize: 20, marginBottom: 10 },
  tlDesc: { color: COLORS.textMuted, fontSize: 15, lineHeight: 26 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end' },
  checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginLeft: 16 },
  checkText: { flex: 1, fontSize: 16, color: COLORS.textMuted, lineHeight: 28 },
  ctaTitle: { fontSize: Platform.OS === 'web' ? 'clamp(32px, 5vw, 42px)' : 36, marginBottom: 16 },
  ctaSub: { fontSize: 18, color: COLORS.textMuted, marginBottom: 48 },
  pricingCard: { width: '100%', padding: Platform.OS === 'web' ? 'clamp(24px, 4vw, 40px)' : 30, borderRadius: 24 },
  priceRow: { flexDirection: 'row-reverse', flexWrap: 'wrap-reverse', justifyContent: 'center', alignItems: 'center', gap: 30, width: '100%' },
  priceInfo: { alignItems: 'center', justifyContent: 'center', flexGrow: 1, flexBasis: 200 },
  priceLabel: { color: COLORS.textMuted, fontSize: 15, marginBottom: 8 },
  priceNum: { fontSize: 42, color: COLORS.textMain },
  priceCurr: { fontSize: 22, color: COLORS.primary, marginBottom: 8, marginLeft: 10 },
  secureText: { marginTop: 32, color: COLORS.textLight, fontSize: 13 },
  footer: { backgroundColor: COLORS.bgWhite, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 50 },
  footerContent: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%' },
  footerContactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 4 },
  footerLink: { color: COLORS.textMuted, fontSize: 15 },
  copy: { color: COLORS.textLight, fontSize: 14 },
  whatsappContainer: { position: 'absolute', bottom: Platform.OS === 'web' ? 'clamp(20px, 4vw, 30px)' : 24, right: Platform.OS === 'web' ? 'clamp(20px, 4vw, 30px)' : 24, zIndex: 1000, alignItems: 'flex-end' },
  whatsappButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.whatsapp, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.whatsapp, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  whatsappButtonPressed: { transform:[{ scale: 0.92 }] },
  whatsappNote: { position: 'absolute', bottom: 74, right: 0, marginBottom: 10 },
  whatsappNoteContent: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, backgroundColor: COLORS.bgWhite, borderWidth: 1, borderColor: COLORS.whatsapp, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  whatsappNoteText: { color: COLORS.textMain, fontSize: 15 },
  whatsappNoteArrow: { position: 'absolute', bottom: -6, right: 24, width: 12, height: 12, backgroundColor: COLORS.bgWhite, borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.whatsapp, transform:[{ rotate: '45deg' }] },
});
// --- END OF FILE App.js ---