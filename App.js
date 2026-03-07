// --- START OF FILE App.js ---

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  useWindowDimensions, 
  Platform,
  StatusBar,
  Animated,
  Easing
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

// Prevent splash screen from hiding automatically until fonts are loaded
SplashScreen.preventAutoHideAsync();

// --- FACEBOOK PIXEL CONFIGURATION ---
const FACEBOOK_PIXEL_ID = 'YOUR_PIXEL_ID_HERE'; // Replace with your actual Pixel ID

const pixelOptions = {
  autoConfig: true,
  debug: true, // Set to false in production
};

// Initialize Facebook Pixel
ReactPixel.init(FACEBOOK_PIXEL_ID, null, pixelOptions);

// --- DESIGN TOKENS ---
const COLORS = {
  primary: '#0EB27C',       
  primaryHover: '#0A8F62',
  primaryLight: 'rgba(14, 178, 124, 0.15)',
  bgDark: '#0D1B22',        
  bgDarker: '#081116',      
  textWhite: '#F8FAFC',
  textGray: '#94A3B8',      
  textLight: '#CBD5E1',     
  success: '#0EB27C',       
  accentRed: '#FF3B30',     
  border: 'rgba(255, 255, 255, 0.1)',
};

// --- PERFORMANCE OPTIMIZED COMPONENTS ---

// 1. TranslucentView: Fast, hardware-friendly view for general UI (No lag)
const TranslucentView = ({ style, children }) => {
  return (
    <View style={[styles.glassBase, styles.translucentBg, style]}>
      {children}
    </View>
  );
};

// 2. BlurCard: Real BlurView used ONLY where requested (Benefits & Pricing)
const BlurCard = ({ style, children, intensity = 40 }) => {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.glassBase, style]}>
      {children}
    </BlurView>
  );
};

// --- BRAND BACKGROUND ---
const BrandBackground = () => {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgDark, overflow: 'hidden' }]} pointerEvents="none">
      <View style={styles.redSun} />
      <View style={[styles.redSun, { backgroundColor: 'rgba(255, 59, 48, 0.2)', transform:[{ scale: 1.8 }] }]} />
      <View style={[styles.redSun, { backgroundColor: 'rgba(255, 59, 48, 0.1)', transform:[{ scale: 2.5 }] }]} />
      
      <View style={styles.greenWave1} />
      <View style={styles.greenWave2} />
      <View style={styles.greenWave3} />
      <View style={styles.lineArtGrid} />
    </View>
  );
};

// --- ANIMATION COMPONENT ---
const FadeInUp = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 800,
        delay: delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform:[{ translateY: translateAnim }], width: '100%' }}>
      {children}
    </Animated.View>
  );
};

// --- TYPEWRITER EFFECT COMPONENT ---
const TypewriterText = ({ texts, speed = 150, delay = 2000, style }) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const cursorBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorBlink, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let timeout;

    const currentFullText = texts[currentTextIndex];
    
    if (!isDeleting && displayText === currentFullText) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, delay);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayText((prev) => {
          if (isDeleting) {
            return prev.slice(0, -1);
          } else {
            return currentFullText.slice(0, prev.length + 1);
          }
        });
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentTextIndex, texts, speed, delay]);

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
      <Text style={style}>
        {displayText}
      </Text>
      <Animated.Text 
        style={[
          style, 
          { 
            color: COLORS.primary,
            opacity: cursorBlink,
            marginLeft: 2,
            marginRight: 7,
            width: 2,
          }
        ]}
      >
        |
      </Animated.Text>
    </View>
  );
};

// --- UTILITY COMPONENTS ---
const MaxWidthContainer = ({ children, style }) => {
  const { width } = useWindowDimensions();
  return (
    <View style={[{ width: '100%', alignItems: 'center' }, style]}>
      <View style={{ width: Math.min(width, 1200), paddingHorizontal: width < 768 ? 20 : 40, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
};

// --- CUSTOM TEXT COMPONENT ---
const ArText = ({ style, children, weight = '400', align = 'right', ...props }) => {
  let fontFamily = 'Tajawal-Regular';
  if (weight === '700') fontFamily = 'Tajawal-Bold';
  if (weight === '900') fontFamily = 'Tajawal-Black';

  return (
    <Text 
      {...props} 
      style={[
        { 
          textAlign: align,
          color: COLORS.textWhite,
          writingDirection: 'rtl',
          fontFamily: fontFamily,
        }, 
        weight === '900' && { letterSpacing: -0.5 }, 
        style
      ]}
    >
      {children}
    </Text>
  );
};

// --- BUTTONS ---
const PrimaryButton = ({ title, icon, onPress, fullWidth, style, pixelEvent }) => (
  <Pressable 
    onPress={() => {
      // Track button click with Facebook Pixel
      if (pixelEvent) {
        ReactPixel.trackCustom(pixelEvent, {
          button_name: title,
          location: 'hero_section'
        });
      }
      onPress?.();
    }}
    style={({pressed}) =>[
      styles.btnBase, 
      styles.btnPrimary, 
      pressed && { opacity: 0.9, transform:[{scale: 0.98}] },
      fullWidth && { width: '100%' },
      style
    ]}
  >
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <ArText style={styles.btnTextPrimary} weight="700" align="right">{title}</ArText>
      {icon && <MaterialIcons name={icon} size={20} color={COLORS.textWhite} />}
    </View>
  </Pressable>
);

const OutlineButton = ({ title, icon, onPress, fullWidth, style, isSuccess }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    flipAnim.setValue(0);
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.timing(bgAnim, {
      toValue: isSuccess ? 1 : 0,
      duration: 700,
      useNativeDriver: false
    }).start();
  }, [isSuccess, title]);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', COLORS.primaryLight]
  });

  const borderColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.2)', COLORS.primary]
  });

  const rotateX = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '0deg']
  });
  
  const opacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });

  return (
    <Pressable 
      onPress={() => {
        // Track "Read More" click
        ReactPixel.trackCustom('ReadMoreClick', {
          button_name: title,
          location: 'hero_section'
        });
        onPress?.();
      }}
      style={({pressed}) =>[
        pressed && !isSuccess && { opacity: 0.8 },
        fullWidth && { width: '100%' },
        style
      ]}
    >
      <Animated.View 
        style={[
          styles.btnBase, 
          styles.btnOutline, 
          { 
            backgroundColor: bgColor,
            borderColor: borderColor,
            width: '100%'
          }
        ]}
      >
        <Animated.View 
          style={{ 
            flexDirection: 'row-reverse', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%',
            opacity: opacity,
            transform: [{ rotateX: rotateX }, { perspective: 1000 }]
          }}
        >
          <ArText style={[styles.btnTextOutline, isSuccess && { color: COLORS.primary }]} weight="700" align="right">
            {title}
          </ArText>
          {icon && (
            <MaterialIcons 
              name={icon} 
              size={22} 
              color={isSuccess ? COLORS.primary : COLORS.textWhite} 
            />
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

// --- SECTIONS ---
const Header = ({ setSignupVisible }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <BlurView intensity={70} tint="dark" style={styles.header}>
      <View style={styles.headerContainer}>
         <Pressable 
           style={styles.headerBtn} 
           onPress={() => {
             ReactPixel.trackCustom('HeaderSignupClick', {
               location: 'header'
             });
             setSignupVisible(true);
           }}
         >
           <ArText style={{color: COLORS.textWhite, fontSize: 14}} weight="700" align="center">سجل الان</ArText>
         </Pressable>

         {!isMobile && (
            <View style={styles.navLinks}>
               <ArText style={styles.navLink} weight="700">النتائج</ArText>
               <ArText style={styles.navLink} weight="700">المحتوى</ArText>
               <ArText style={styles.navLink} weight="700">المسار</ArText>
            </View>
         )}

         <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <ArText style={styles.logoText} weight="900">كلاس</ArText>
            <ArText style={[styles.logoText, {color: COLORS.primary}]} weight="900"> ماستر</ArText>
         </View>
      </View>
    </BlurView>
  );
};

const FeatureCard = ({ icon, title, desc, delay }) => (
  <FadeInUp delay={delay}>
    <BlurCard style={styles.glassCard}>
      <View style={styles.iconBoxOutline}>
        <MaterialCommunityIcons name={icon} size={36} color={COLORS.textWhite} />
      </View>
      <ArText style={styles.probTitle} weight="700" align="center">{title}</ArText>
      <ArText style={styles.probDesc} align="center">{desc}</ArText>
    </BlurCard>
  </FadeInUp>
);

const TimelineItem = ({ icon, title, desc, isLast, isHighlight, delay }) => (
  <FadeInUp delay={delay}>
    <View style={styles.tlRow}>
      <View style={{ flex: 1, paddingRight: 24, paddingBottom: 40, alignItems: 'flex-end' }}>
        <TranslucentView style={[styles.tlCard, isHighlight && styles.tlCardHighlight]}>
          <ArText style={[styles.tlTitle, isHighlight && { color: COLORS.primary }]} weight="700" align="right">
            {title}
          </ArText>
          <ArText style={[styles.tlDesc, isHighlight && { color: COLORS.textLight }]} align="right">
            {desc}
          </ArText>
        </TranslucentView>
      </View>

      <View style={styles.tlLineCol}>
        <View style={[styles.tlBubble, isHighlight ? styles.tlBubbleHighlight : styles.tlBubbleDefault]}>
          <MaterialCommunityIcons 
            name={icon} 
            size={isHighlight ? 20 : 18} 
            color={isHighlight ? COLORS.bgDark : COLORS.primary} 
          />
        </View>
        {!isLast && <View style={styles.tlLine} />}
      </View>
    </View>
  </FadeInUp>
);

const CodeWindow = () => (
  <TranslucentView style={styles.codeWindow}>
    <View style={styles.codeHeader}>
      <View style={styles.windowControls}>
        <View style={[styles.dot, { backgroundColor: '#FF5F56' }]} />
        <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
        <View style={[styles.dot, { backgroundColor: '#27C93F' }]} />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'flex-end' }}>
        <ArText style={{ fontSize: 12, color: COLORS.textWhite }} weight="700" align="right">دراسة حالة حقيقية</ArText>
        <ArText style={{ fontSize: 10, color: COLORS.textGray }} align="right">منتج تقني مربح</ArText>
      </View>
      <View style={styles.folderIcon}>
        <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.primary} />
      </View>
    </View>

    <View style={{ padding: 24, gap: 12 }}>
      {[
        { label: 'سعر الشراء (الصين):', val: '1.20 $', color: COLORS.textWhite },
        { label: 'تكلفة الشحن (للجزائر):', val: '0.45 $', color: COLORS.textWhite },
        { label: 'التكلفة الإجمالية:', val: '1.65 $', color: COLORS.textWhite },
      ].map((row, i) => (
        <View key={i} style={styles.codeRow}>
          <ArText style={styles.codeVal} align="left">{row.val}</ArText>
          <ArText style={styles.codeLabel} align="right">{row.label}</ArText>
        </View>
      ))}
      
      <View style={styles.codeDivider} />
      
      <View style={styles.codeRow}>
        <ArText style={[styles.codeVal, { color: COLORS.primary, fontSize: 18 }]} weight="700" align="left">6.50 $</ArText>
        <ArText style={[styles.codeLabel, { color: COLORS.textLight }]} weight="700" align="right">سعر البيع المقترح:</ArText>
      </View>

      <View style={styles.marginBadge}>
        <ArText style={{ color: COLORS.primary, fontSize: 13 }} weight="700" align="center">هامش ربح صافي: ~300%</ArText>
      </View>
    </View>
  </TranslucentView>
);

// --- MAIN COMPONENT ---
export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [isSignupVisible, setSignupVisible] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const scrollViewRef = useRef(null);
  const [benefitsSectionY, setBenefitsSectionY] = useState(0);
  const [isReadMoreClicked, setIsReadMoreClicked] = useState(false);

  // Track page view on mount
  useEffect(() => {
    ReactPixel.pageView();
    ReactPixel.trackCustom('LandingPageView', {
      page: 'home',
      device: Platform.OS,
      screen_width: width
    });
  }, []);

  useEffect(() => {
    async function loadIconFonts() {
      if (Platform.OS === 'web') {
        try {
          await Font.loadAsync({
            ...MaterialIcons.font,
            ...MaterialCommunityIcons.font,
          });
          console.log('Icon fonts loaded successfully');
        } catch (error) {
          console.error('Failed to load icon fonts:', error);
        }
      }
    }
    
    loadIconFonts();
  }, []);

  // Check for admin route on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (window.location.pathname.startsWith('/admin')) {
        setShowAdmin(true);
        // Track admin view
        ReactPixel.trackCustom('AdminPageView', {
          page: 'admin'
        });
      }
    }
  }, []);

  // For mobile, add a secret gesture
  const handleLogoPress = () => {
    let pressCount = 0;
    return () => {
      pressCount++;
      if (pressCount === 3) {
        setShowAdmin(true);
        pressCount = 0;
      }
      setTimeout(() => (pressCount = 0), 3000);
    };
  };

  const handleReadMoreClick = () => {
    setIsReadMoreClicked(true);
    setTimeout(() => {
      if (scrollViewRef.current && benefitsSectionY > 0) {
        scrollViewRef.current.scrollTo({ y: benefitsSectionY - 80, animated: true });
        // Track scroll to benefits
        ReactPixel.trackCustom('ScrollToBenefits', {
          from: 'hero'
        });
      }
    }, 600); 
    setTimeout(() => setIsReadMoreClicked(false), 3000);
  };

  const handleSignupOpen = () => {
    ReactPixel.trackCustom('SignupModalOpen', {
      location: 'main_cta'
    });
    setSignupVisible(true);
  };

  const handleSignupClose = () => {
    ReactPixel.trackCustom('SignupModalClose', {
      location: 'main_cta'
    });
    setSignupVisible(false);
  };

  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('./src/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('./src/fonts/Tajawal-Bold.ttf'),
    'Tajawal-Black': require('./src/fonts/Tajawal-Black.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Show admin panel if route matches
  if (showAdmin) {
    return <AdminNavigator />;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />
      <BrandBackground />
      <Header setSignupVisible={handleSignupOpen} />

      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        onScroll={() => {
          // Track scroll depth (optional)
          // You can implement scroll depth tracking here
        }}
        scrollEventThrottle={16}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={{ paddingTop: 140, paddingBottom: 100, width: '100%', alignItems: 'center' }}>
            <MaxWidthContainer>
              <FadeInUp>
                <View style={{ alignItems: 'center' }}>
                  <TranslucentView style={styles.heroBadge}>
                    <ArText style={styles.badgeText} weight="700">دورة تدريبية عملية 100%</ArText>
                    <MaterialIcons name="lock-outline" size={14} color={COLORS.primary} />
                  </TranslucentView>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <TypewriterText 
                      texts={['أول شحنة', 'أول ربح', 'ألف قطعة', 'الوصول']}
                      speed={60}
                      delay={1500}
                      style={[styles.heroHeading, { color: COLORS.primary, fontFamily: 'Tajawal-Black' }]}
                    />
                    <ArText style={styles.heroHeading} weight="900" align="center">
                      من الصفر حتى{' '}
                    </ArText>
                    
                  </View>

                  <ArText style={styles.heroSub} align="center">
                    ستتعلم المسار الكامل للاستيراد بطريقة واضحة وعملية بدل الاعتماد على معلومات متفرقة أو غير دقيقة.
                  </ArText>

                  <View style={[styles.heroBtnGroup, isMobile && { flexDirection: 'column', gap: 16 }]}>
                    <PrimaryButton 
                      title="سجل الآن" 
                      icon="arrow-back" 
                      style={!isMobile && { marginLeft: 16 }}
                      fullWidth={isMobile}
                      onPress={handleSignupOpen}
                      pixelEvent="HeroSignupClick"
                    />
                    <OutlineButton 
                      title={isReadMoreClicked ? "عندك الحق خويا" : "نزيد نقرا قبل"} 
                      icon={isReadMoreClicked ? "check" : "arrow-downward"} 
                      isSuccess={isReadMoreClicked}
                      fullWidth={isMobile}
                      onPress={handleReadMoreClick}
                    />
                  </View>
                </View>
              </FadeInUp>
            </MaxWidthContainer>
          </View>
        </View>

        {/* BENEFITS GRID - Uses True Blur */}
        <View 
          style={{ paddingVertical: 10 }}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setBenefitsSectionY(y);
          }}
        >
          <MaxWidthContainer>
            <View style={{ alignItems: 'center', marginBottom: 60 }}>
              <ArText style={styles.sectionTitle} weight="900" align="center">ماذا ستستفيد من هذا التكوين؟</ArText>
              <ArText style={styles.sectionSub} align="center">محتوى حصري يمشيك على الطريق الصحيح</ArText>
            </View>

            <View style={[styles.gridContainer, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <FeatureCard 
                delay={100} 
                icon="shield-alert-outline" 
                title="تجنب الأخطاء التي تكلف آلاف الدولارات" 
                desc="نتحدث عن الأخطاء الشائعة التي يقع فيها المستوردون الجدد وكيف يمكن تجنبها قبل أن تستثمر أموالك." 
              />
              <FeatureCard 
                delay={200} 
                icon="storefront-outline" 
                title="فهم عملي لمعرض كانتون فير" 
                desc="ستتعرف على كيفية الاستفادة من أكبر معرض تجاري في الصين وكيف تبحث عن الموردين المناسبين هناك." 
              />
              <FeatureCard 
                delay={300} 
                icon="file-pdf-box" 
                title="دليل PDF شامل وجاهز للعمل" 
                desc="يتضمن معلومات عن الاستيراد، كانتون فير، أسواق الجملة، إضافة إلى قائمة موردين ومصانع." 
              />
              <FeatureCard 
                delay={400} 
                icon="account-group-outline" 
                title="فرصة Networking مع رجال أعمال" 
                desc="التعرف على أشخاص يعملون أو يريدون العمل في الاستيراد قد يفتح لك فرص شراكات وأفكار مشاريع." 
              />
            </View>
          </MaxWidthContainer>
        </View>

        {/* TIMELINE */}
        <View style={{ backgroundColor: 'rgba(8, 17, 22, 0.4)', paddingVertical: 80, marginTop: 40 }}>
          <MaxWidthContainer>
            <View style={{ alignItems: 'center', marginBottom: 60 }}>
              <ArText style={styles.eyebrow} weight="700" align="center">المسار الكامل</ArText>
              <ArText style={styles.sectionTitle} weight="900" align="center">خريطة طريق واضحة للبدء بثقة</ArText>
              <ArText style={styles.sectionSub} align="center">خطوات عملية من شاشة حاسوبك حتى وصول بضاعتك للجزائر</ArText>
            </View>

            <View style={{ width: '100%', maxWidth: 800 }}>
              <TimelineItem 
                delay={100}
                icon="map-search-outline" 
                title="تفهم الخطوات الحقيقية للاستيراد من الصين" 
                desc="ستتعلم المسار الكامل للاستيراد بطريقة واضحة وعملية بدل الاعتماد على معلومات متفرقة أو غير دقيقة." 
              />
              <TimelineItem 
                delay={200}
                icon="factory" 
                title="كيف تختار المورد أو المصنع المناسب" 
                desc="ستعرف كيف تميّز بين المصنع الحقيقي والوسيط، وكيف تختار المورد الذي يناسب مشروعك." 
              />
              <TimelineItem 
                delay={300}
                icon="handshake" 
                title="تعلم أساسيات التفاوض مع الموردين الصينيين" 
                desc="ستفهم كيف تناقش السعر، شروط الدفع، والكميات بطريقة احترافية." 
              />
              <TimelineItem 
                delay={400}
                icon="flag-checkered" 
                title="خطة واضحة للبدء في الاستيراد بثقة" 
                desc="ستغادر الجلسة بفهم عملي وخطوات واضحة يمكنك تطبيقها مباشرة في مشروعك." 
                isLast
                isHighlight
              />
            </View>
          </MaxWidthContainer>
        </View>

        {/* OUTCOMES & CODE WINDOW */}
        <View style={{ paddingVertical: 80, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <MaxWidthContainer>
            <View style={[styles.splitSection, isMobile && { flexDirection: 'column' }]}>
              <View style={{ flex: 1, paddingLeft: isMobile ? 0 : 40, marginBottom: isMobile ? 40 : 0 }}>
                <FadeInUp delay={200}>
                  <ArText style={styles.sectionTitle} weight="900" align="right">
                    نتيجة هذا <Text style={{ color: COLORS.primary }}>التكوين</Text>
                  </ArText>
                  <ArText style={[styles.sectionSub, { marginBottom: 32 }]} align="right">
                    بناء أساس متين لمشروع تجاري مربح ومستدام، مدعوم بخطوات مجربة وحسابات دقيقة.
                  </ArText>

                  <View style={{ gap: 16 }}>
                    {[
                      "مسار كامل وواضح للاستيراد من الصين.",
                      "أسرار تجنب الأخطاء المكلفة مادياً.",
                      "مهارات التفاوض وتحديد الكميات باحترافية.",
                    ].map((txt, i) => (
                      <View key={i} style={styles.checkRow}>
                        <ArText style={styles.checkText} align="right">{txt}</ArText>
                        <View style={styles.checkIcon}>
                          <MaterialIcons name="check" size={14} color={COLORS.bgDark} />
                        </View>
                      </View>
                    ))}
                    <View style={styles.checkRow}>
                      <ArText style={[styles.checkText, { color: COLORS.textWhite }]} weight="700" align="right">قائمة موردين ومصانع جاهزة للعمل مع دليل PDF.</ArText>
                      <View style={[styles.checkIcon, { backgroundColor: COLORS.primary }]}>
                        <MaterialIcons name="check" size={14} color={COLORS.bgDark} />
                      </View>
                    </View>
                  </View>
                </FadeInUp>
              </View>

              <View style={{ flex: 1, width: '100%', minHeight: 300 }}>
                <FadeInUp delay={400}>
                  <CodeWindow />
                </FadeInUp>
              </View>
            </View>
          </MaxWidthContainer>
        </View>

        {/* CTA SECTION - Uses True Blur */}
        <View style={{ paddingVertical: 80 }}>
          <MaxWidthContainer>
            <FadeInUp>
              <View style={{ width: '100%', maxWidth: 700, alignItems: 'center' }}>
                <View style={styles.iconBoxOutline}>
                   <MaterialIcons name="rocket-launch" size={40} color={COLORS.textWhite} />
                </View>
                <ArText style={[styles.ctaTitle, {marginTop: 24}]} weight="900" align="center">مستعد لتبدأ رحلتك في الاستيراد؟</ArText>
                <ArText style={styles.ctaSub} align="center">لا تفوت فرصة بناء مشروعك بالطريقة الصحيحة، احجز مقعدك وانضم للناجحين.</ArText>

                <BlurCard style={styles.pricingCard} intensity={40}>
                  <View style={[styles.priceRow, isMobile && { flexDirection: 'column-reverse', gap: 20 }]}>
                    <PrimaryButton 
                      title="ابدأ التكوين الآن" 
                      style={{ paddingHorizontal: 40 }}
                      fullWidth={isMobile}
                      onPress={handleSignupOpen}
                      pixelEvent="CTASignupClick"
                    />
                    <View style={styles.priceInfo}>
                      <ArText style={styles.priceLabel} align="right">سعر التكوين</ArText>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end' }}>
                        <ArText style={styles.priceNum} weight="700">15,000</ArText>
                        <ArText style={styles.priceCurr} weight="700">د.ج</ArText>
                      </View>
                    </View>
                  </View>
                  <ArText style={styles.secureText} align="center">دفع آمن بوسائل الدفع المحلية (BaridiMob, CCP) متاح أيضاً</ArText>
                </BlurCard>
              </View>
            </FadeInUp>
          </MaxWidthContainer>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <MaxWidthContainer>
            <View style={[styles.footerContent, isMobile && { flexDirection: 'column-reverse', gap: 20 }]}>
              <View style={styles.iconTxt}>
                <ArText style={styles.copy}>© 2024 جميع الحقوق محفوظة</ArText>
                <ArText style={styles.copy}> | </ArText>
                <ArText style={[styles.logoText, { fontSize: 14 }]} weight="700">
                  إستيراد <Text style={{ color: COLORS.primary }}>برو</Text>
                </ArText>
              </View>
              <View style={{ flexDirection: 'row-reverse', gap: 24 }}>
                 <View style={styles.iconTxt}>
                    <ArText style={styles.footerLink}>contact@importpro.dz</ArText>
                    <MaterialIcons name="mail-outline" size={16} color={COLORS.textGray} />
                 </View>
                 <View style={styles.iconTxt}>
                    <ArText style={styles.footerLink}>الدعم الفني</ArText>
                    <MaterialIcons name="support-agent" size={16} color={COLORS.textGray} />
                 </View>
              </View>
            </View>
          </MaxWidthContainer>
        </View>

      </ScrollView>
      <SignupModal 
        visible={isSignupVisible} 
        onClose={handleSignupClose}
        onOpen={() => ReactPixel.trackCustom('SignupModalViewed')}
      />
    </View>
  );
}

// --- STYLES --- (keep your existing styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  glassBase: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  translucentBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  redSun: {
    position: 'absolute',
    top: 100,
    right: '15%',
    width: 50,
    height: 50,
    borderRadius: 45,
    backgroundColor: COLORS.accentRed,
  },
  greenWave1: {
    position: 'absolute',
    top: -200,
    left: '-20%',
    width: '120%',
    height: 450,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    transform:[{ rotate: '-12deg' }],
    borderBottomRightRadius: 600,
    borderBottomLeftRadius: 200,
  },
  greenWave2: {
    position: 'absolute',
    top: '30%',
    right: '-40%',
    width: 80,
    height: 250,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
    transform:[{ rotate: '-35deg' }],
    borderTopLeftRadius: 500,
    borderBottomLeftRadius: 500,
  },
  greenWave3: {
    position: 'absolute',
    bottom: -100,
    left: '-10%',
    width: '120%',
    height: 350,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    transform:[{ rotate: '15deg' }],
    borderTopRightRadius: 600,
    borderTopLeftRadius: 300,
  },
  lineArtGrid: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 400,
    height: 400,
    borderWidth: 1,
    borderColor: 'rgba(14, 178, 124, 0.05)',
    borderRadius: 200,
    transform:[{ scale: 2 }, { translateX: 100 }, { translateY: 100 }],
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(13, 27, 34, 0.90)',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    color: '#fff',
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentRed,
    marginRight: 6,
    marginTop: -10,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 30,
  },
  navLink: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  headerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  heroSection: {
    width: '100%',
    minHeight: 800,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderRadius: 30,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 14,
    marginRight: 8,
  },
  heroHeading: {
    fontSize: 48,
    lineHeight: 64,
    marginBottom: 24,
  },
  heroSub: {
    fontSize: 18,
    color: COLORS.textLight,
    maxWidth: 680,
    marginBottom: 40,
    lineHeight: 30,
  },
  heroBtnGroup: {
    flexDirection: 'row-reverse',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 60,
  },
  btnBase: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 180,
    borderWidth: 1, 
    borderColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  btnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  btnTextPrimary: {
    color: COLORS.textWhite,
    fontSize: 16,
  },
  btnTextOutline: {
    color: COLORS.textWhite,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 36,
    marginBottom: 16,
    lineHeight: 50,
  },
  sectionSub: {
    fontSize: 18,
    color: COLORS.textGray,
    maxWidth: 600,
    lineHeight: 28,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    width: '100%',
  },
  glassCard: {
    padding: 32,
    flex: 1,
    minWidth: 280,
    alignItems: 'center',
  },
  iconBoxOutline: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.textWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  probTitle: {
    fontSize: 22,
    marginBottom: 12,
  },
  probDesc: {
    color: COLORS.textGray,
    fontSize: 15,
    lineHeight: 24,
  },
  eyebrow: {
    color: COLORS.primary,
    marginBottom: 12,
    letterSpacing: 1,
    fontSize: 16,
  },
  tlRow: {
    flexDirection: 'row',
    width: '100%',
  },
  tlLineCol: {
    width: 60,
    alignItems: 'center',
  },
  tlBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: COLORS.bgDark,
  },
  tlBubbleDefault: {
    borderColor: COLORS.border,
  },
  tlBubbleHighlight: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  tlLine: {
    width: 2,
    backgroundColor: COLORS.border,
    flex: 1,
    marginVertical: 4,
  },
  tlCard: {
    padding: 24,
    alignItems: 'flex-end',
    width: '100%',
    borderRadius: 16,
  },
  tlCardHighlight: {
    borderColor: 'rgba(14, 178, 124, 0.4)',
    backgroundColor: 'rgba(14, 178, 124, 0.05)',
  },
  tlTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  tlDesc: {
    color: COLORS.textGray,
    fontSize: 15,
    lineHeight: 26,
  },
  splitSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginLeft: 16,
  },
  checkText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textLight,
    lineHeight: 28,
  },
  codeWindow: {
    borderRadius: 16,
  },
  codeHeader: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  windowControls: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  folderIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  codeVal: {
    color: COLORS.textWhite,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  codeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  marginBadge: {
    backgroundColor: 'rgba(14, 178, 124, 0.15)',
    borderColor: 'rgba(14, 178, 124, 0.4)',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  cursor: {
    marginLeft: 2,
    marginRight: 2,
  },
  ctaTitle: {
    fontSize: 42,
    marginBottom: 16,
  },
  ctaSub: {
    fontSize: 18,
    color: COLORS.textLight,
    marginBottom: 48,
  },
  pricingCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    color: COLORS.textGray,
    fontSize: 15,
    marginBottom: 8,
  },
  priceNum: {
    fontSize: 42,
    color: COLORS.textWhite,
  },
  priceCurr: {
    fontSize: 22,
    color: COLORS.primary,
    marginBottom: 8,
    marginLeft: 10,
  },
  secureText: {
    marginTop: 32,
    color: COLORS.textGray,
    fontSize: 13,
  },
  footer: {
    backgroundColor: COLORS.bgDarker,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 40,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  iconTxt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    color: COLORS.textGray,
    fontSize: 14,
  },
  copy: {
    color: COLORS.textGray,
    fontSize: 14,
  }
});