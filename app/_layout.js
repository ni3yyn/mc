// app/index.js
import React from 'react';
import { ScrollView, View, Text, ImageBackground, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// --- REUSABLE COMPONENTS FOR HIGH-END UX ---

const Button = ({ title, icon, variant = 'primary', className = '' }) => (
  <Pressable 
    className={`flex-row-reverse items-center justify-center gap-2 py-4 px-8 rounded-xl transition-all active:scale-95 ${
      variant === 'primary' 
        ? 'bg-primary hover:bg-primary-hover shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
        : 'bg-surface-dark border border-border-dark hover:bg-border-dark'
    } ${className}`}
  >
    {icon && <MaterialIcons name={icon} size={24} color={variant === 'primary' ? '#101820' : '#94a3b8'} />}
    <Text className={`text-lg font-bold ${variant === 'primary' ? 'text-background-dark' : 'text-white'}`}>
      {title}
    </Text>
  </Pressable>
);

const FeatureCard = ({ icon, title, desc, color }) => (
  <Pressable className="bg-surface-dark border border-border-dark rounded-2xl p-6 flex-col items-end hover:-translate-y-2 transition-all hover:border-primary/50 group w-full md:w-[48%] lg:w-[23%] mb-4">
    <View className={`w-14 h-14 rounded-xl items-center justify-center mb-6 bg-${color}-900/30`}>
      <MaterialIcons name={icon} size={32} color={color === 'red' ? '#ef4444' : color === 'blue' ? '#60a5fa' : color === 'orange' ? '#fb923c' : '#c084fc'} />
    </View>
    <Text className="text-xl font-bold text-white mb-3 text-right w-full">{title}</Text>
    <Text className="text-slate-400 text-sm leading-relaxed text-right">{desc}</Text>
  </Pressable>
);

// --- MAIN LANDING PAGE ---

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView className="flex-1 bg-background-dark" showsVerticalScrollIndicator={false}>
      
      {/* HEADER */}
      <View className="sticky top-0 z-50 w-full border-b border-border-dark bg-background-dark/90 backdrop-blur-md">
        <View className="flex-row-reverse items-center justify-between px-6 h-20 max-w-7xl mx-auto w-full">
          {/* Logo */}
          <View className="flex-row-reverse items-center gap-2">
            <MaterialIcons name="directions-boat" size={32} color="#d4af37" />
            <Text className="font-bold text-2xl tracking-tight text-white">
              إستيراد<Text className="text-primary">برو</Text>
            </Text>
          </View>

          {/* Nav Links (Desktop) */}
          {!isMobile && (
            <View className="flex-row-reverse gap-8">
              <Text className="text-slate-300 hover:text-white text-lg cursor-pointer">المشاكل</Text>
              <Text className="text-slate-300 hover:text-white text-lg cursor-pointer">الحل</Text>
              <Text className="text-slate-300 hover:text-white text-lg cursor-pointer">النتائج</Text>
            </View>
          )}

          {/* Header CTA */}
          <Pressable className="bg-primary hover:bg-primary-hover py-2 px-6 rounded-lg active:scale-95">
            <Text className="text-background-dark font-bold text-lg">سجل الآن</Text>
          </Pressable>
        </View>
      </View>

      {/* HERO SECTION */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1551280336-db26b8969e06?q=80&w=2000&auto=format&fit=crop' }} // Shipping port image
        className="w-full justify-center items-center py-20 lg:py-32"
      >
        <LinearGradient
          colors={['rgba(16, 24, 32, 0.85)', 'rgba(16, 24, 32, 1)']}
          className="absolute inset-0"
        />
        <View className="px-4 flex-col items-center max-w-4xl z-10 w-full">
          <View className="flex-row-reverse items-center gap-2 px-4 py-2 rounded-full bg-surface-dark/80 border border-primary/30 mb-6">
            <MaterialIcons name="workspace-premium" size={20} color="#d4af37" />
            <Text className="text-primary text-sm font-bold">دورة تدريبية عملية 100%</Text>
          </View>
          
          <Text className="text-white text-5xl md:text-7xl font-black text-center leading-tight mb-6">
            من الصفر حتى <Text className="text-primary">أول شحنة</Text>
          </Text>
          
          <Text className="text-slate-300 text-lg md:text-xl text-center mb-10 max-w-2xl leading-relaxed">
            جاهز تخرج من العشوائية؟ ابدأ معنا وخلي عندك نظام واضح. تعلم كيف تستورد من الصين للجزائر بأمان وبأقل التكاليف.
          </Text>

          <View className="flex-col md:flex-row-reverse gap-4 w-full justify-center px-4">
            <Button title="سجل الآن وابدأ التكوين" icon="arrow-back" variant="primary" />
            <Button title="شاهد المقدمة" icon="play-circle-outline" variant="outline" />
          </View>

          {/* Social Proof */}
          <View className="mt-12 flex-row-reverse items-center gap-4 bg-surface-dark/50 p-4 rounded-xl border border-border-dark/50">
            <Text className="text-slate-300 text-sm">
              انضم لأكثر من <Text className="text-white font-bold">+500</Text> رائد أعمال جزائري
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* PROBLEMS SECTION */}
      <View className="w-full py-20 items-center px-4">
        <View className="max-w-7xl w-full">
          <View className="items-center mb-16">
            <Text className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">واش راك تعاني من هاد المشاكل؟</Text>
            <Text className="text-slate-400 text-lg text-center">تعرف على التحديات التي تواجهك في الاستيراد وكيف يمكننا مساعدتك في تخطيها</Text>
          </View>
          
          {/* Grid Layout for Web */}
          <View className="flex-row flex-wrap justify-between w-full">
            <FeatureCard icon="gpp-bad" title="الخوف من النصب" desc="تخشى تحويل أموالك لموردين وهميين أو استلام بضاعة غير مطابقة للمواصفات." color="red" />
            <FeatureCard icon="local-shipping" title="تعقيدات الشحن" desc="صعوبة فهم طرق الشحن المختلفة والتعامل مع الجمارك والوثائق." color="blue" />
            <FeatureCard icon="calculate" title="خسارة المال" desc="سوء حساب التكاليف الإجمالية مما يؤدي لبيع المنتجات بخسارة أو بهامش ضعيف." color="orange" />
            <FeatureCard icon="alt-route" title="عدم معرفة البداية" desc="الضياع وسط كم هائل من المعلومات العشوائية وعدم وجود خطة عمل واضحة." color="purple" />
          </View>
        </View>
      </View>

      {/* FINAL CTA / PRICING */}
      <View className="w-full py-20 bg-surface-dark border-t border-border-dark items-center px-4">
        <MaterialIcons name="rocket-launch" size={60} color="#d4af37" className="mb-6" />
        <Text className="text-3xl md:text-5xl font-black text-white mb-6 text-center">مستعد لتبدأ رحلتك في الاستيراد؟</Text>
        <Text className="text-xl text-slate-300 mb-10 text-center">ماشي كلام نظري... نشارك معك الخطوات اللي نطبقوها فعلاً في عملنا اليومي.</Text>
        
        <View className="bg-background-dark p-8 rounded-2xl border border-border-dark shadow-xl max-w-3xl w-full flex-col md:flex-row-reverse items-center justify-between gap-6">
          <View className="items-end">
            <Text className="text-slate-400 mb-1 text-lg">سعر التكوين</Text>
            <View className="flex-row-reverse items-end gap-2">
              <Text className="text-5xl font-bold text-white">15,000</Text>
              <Text className="text-primary font-bold text-xl mb-1">د.ج</Text>
            </View>
          </View>
          <Button title="ابدأ التكوين الآن" variant="primary" className="w-full md:w-auto px-12 py-5" />
        </View>
        <Text className="text-slate-500 mt-6 text-center">دفع آمن بوسائل الدفع المحلية (BaridiMob, CCP) متاح أيضاً</Text>
      </View>

      {/* FOOTER */}
      <View className="w-full border-t border-border-dark py-8 items-center bg-background-dark">
        <Text className="text-slate-500">© 2026 إستيراد برو - جميع الحقوق محفوظة</Text>
      </View>

    </ScrollView>
  );
}