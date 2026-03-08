// src/screens/admin/AdminDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  useWindowDimensions,
  TextInput,
  Platform,
  Linking,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../../config/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useFonts } from 'expo-font';

// ==================== CONSTANTS & THEME ====================
const COLORS = {
  primary: '#0EB27C',
  primaryHover: '#0A8F62',
  primaryLight: 'rgba(14, 178, 124, 0.15)',
  bgMain: '#F4F7F6',
  bgWhite: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  whatsapp: '#25D366',
  accentRed: '#EF4444',
  border: 'rgba(0, 0, 0, 0.08)',
  
  // Status Colors (Optimized for light mode contrast)
  success: '#0EB27C',
  warning: '#F59E0B', 
  error: '#EF4444',
  info: '#3B82F6',
};

const STATUS_CONFIG = {
  new: { 
    label: 'جديد', 
    color: COLORS.info,
    icon: 'fiber-new',
    nextStatus: 'contacted'
  },
  contacted: { 
    label: 'تم الاتصال', 
    color: COLORS.warning,
    icon: 'phone',
    nextStatus: 'qualified'
  },
  qualified: { 
    label: 'مؤهل', 
    color: COLORS.success,
    icon: 'check-circle',
    nextStatus: 'converted'
  },
  converted: { 
    label: 'محول', 
    color: COLORS.primary,
    icon: 'trending-up',
    nextStatus: 'lost'
  },
  lost: { 
    label: 'منسحب', 
    color: COLORS.error,
    icon: 'cancel',
    nextStatus: null
  },
};

// ==================== WEB COMPATIBILITY FIXES ====================
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'rnw-responsive-overrides-admin';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        background-color: ${COLORS.bgMain} !important; 
        min-height: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        color: ${COLORS.textMain};
      }
      body {
        overscroll-behavior-y: none;
      }
      #root {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      ::-webkit-scrollbar {
        width: 8px;
        background-color: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background-color: rgba(0,0,0,0.2);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: ${COLORS.primary};
      }
    `;
    document.head.append(style);
  }
}

// ==================== BRAND BACKGROUND GRAPHICS ====================
const BrandBackground = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgMain, overflow: 'hidden' }]} pointerEvents="none">
    <View style={[styles.redSun, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]} />
    <View style={[styles.redSun, { backgroundColor: 'rgba(239, 68, 68, 0.15)', transform:[{ scale: 1.9 }] }]} />
    <View style={[styles.greenWave1, { opacity: 0.08 }]} />
    <View style={[styles.greenWave2, { opacity: 0.08 }]} />
    <View style={[styles.greenWave3, { opacity: 0.08 }]} />
    <View style={[styles.lineArtGrid, { borderColor: 'rgba(14, 178, 124, 0.15)' }]} />
  </View>
);

// ==================== CUSTOM TEXT COMPONENT ====================
const ArText = ({ style, children, weight = '400', align = 'right', ...props }) => {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../../fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../../fonts/Tajawal-Bold.ttf'),
    'Tajawal-Black': require('../../fonts/Tajawal-Black.ttf'),
  });

  let fontFamily = 'Tajawal-Regular';
  if (weight === '700') fontFamily = 'Tajawal-Bold';
  if (weight === '900') fontFamily = 'Tajawal-Black';

  return (
    <Text
      {...props}
      style={[
        {
          textAlign: align,
          color: COLORS.textMain,
          writingDirection: 'rtl',
          fontFamily: fontsLoaded ? fontFamily : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

// ==================== CUSTOM INPUT COMPONENT ====================
const ArInput = ({ style, wrapperStyle, icon, error, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../../fonts/Tajawal-Regular.ttf'),
  });

  return (
    <View style={[styles.inputWrapper, wrapperStyle, isFocused && styles.inputFocused, error && styles.inputError]}>
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={20} 
          color={error ? COLORS.error : (isFocused ? COLORS.primary : COLORS.textMuted)} 
          style={styles.inputIcon} 
        />
      )}
      <TextInput
        {...props}
        style={[
          styles.input,
          { fontFamily: fontsLoaded && Platform.OS === 'ios' ? 'Tajawal-Regular' : undefined },
          style,
        ]}
        placeholderTextColor={COLORS.textLight}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        textAlign="right"
      />
    </View>
  );
};

// ==================== STAT CARD ====================
const StatCard = ({ title, value, icon, color, trend, onClick }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <Pressable 
      onPress={onClick} 
      style={({ pressed }) =>[
        styles.statCard, 
        isMobile && styles.statCardMobile,
        pressed && { transform:[{ scale: 0.98 }] }
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
        <ArText style={styles.statTitle}>{title}</ArText>
      </View>
      <ArText weight="900" style={styles.statValue}>
        {value || 0}
      </ArText>
      {trend !== undefined && (
        <View style={styles.statTrend}>
          <MaterialIcons
            name={trend > 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={trend > 0 ? COLORS.success : COLORS.error}
          />
          <ArText style={{ color: trend > 0 ? COLORS.success : COLORS.error, fontSize: 13 }} weight="700">
            {Math.abs(trend)}%
          </ArText>
        </View>
      )}
    </Pressable>
  );
};

// ==================== MAIN DASHBOARD ====================
export default function AdminDashboard() {
  const { user, signOut } = useAdminAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // State
  const [registrations, setRegistrations] = useState([]);
  const[filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const[refreshing, setRefreshing] = useState(false);
  const[error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const[statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const[editModalVisible, setEditModalVisible] = useState(false);
  const[viewModalVisible, setViewModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  });
  const[selectedIds, setSelectedIds] = useState(new Set());

  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Trigger animation when selection changes
  useEffect(() => {
    if (selectedIds.size > 0) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [selectedIds.size]);

  // ==================== DATA FETCHING ====================
  const fetchRegistrations = async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRegistrations(data ||[]);
      
      const newStats = {
        total: data?.length || 0,
        new: data?.filter(r => r?.status === 'new').length || 0,
        contacted: data?.filter(r => r?.status === 'contacted').length || 0,
        qualified: data?.filter(r => r?.status === 'qualified').length || 0,
        converted: data?.filter(r => r?.status === 'converted').length || 0,
        lost: data?.filter(r => r?.status === 'lost').length || 0,
      };
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError(error.message);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    const subscription = supabase
      .channel('registrations_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'registrations' },
        () => fetchRegistrations()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  },[]);

  // ==================== FILTERING ====================
  useEffect(() => {
    let filtered =[...registrations];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r?.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r?.name?.toLowerCase().includes(query) ||
        r?.phone?.includes(query) ||
        r?.email?.toLowerCase().includes(query) ||
        r?.wilaya?.toLowerCase().includes(query) ||
        r?.business_field?.toLowerCase().includes(query)
      );
    }
    setFilteredRegistrations(filtered);
  }, [registrations, searchQuery, statusFilter]);

  // ==================== CRUD OPERATIONS ====================
  const handleUpdateRegistration = async (id, updates) => {
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      const { error } = await supabase
        .from('registrations')
        .update({
          ...cleanUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      Alert.alert('نجاح', 'تم تحديث البيانات بنجاح');
      fetchRegistrations();
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating registration:', error);
      Alert.alert('خطأ', 'فشل في تحديث البيانات');
    }
  };

  const handleDeleteRegistration = (id) => {
    const executeDelete = async () => {
      try {
        const { error } = await supabase.from('registrations').delete().eq('id', id);
        if (error) throw error;
        if (Platform.OS === 'web') window.alert('تم حذف التسجيل بنجاح');
        else Alert.alert('نجاح', 'تم حذف التسجيل بنجاح');
        fetchRegistrations();
      } catch (error) {
        if (Platform.OS === 'web') window.alert('فشل في حذف التسجيل');
        else Alert.alert('خطأ', 'فشل في حذف التسجيل');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من حذف هذا التسجيل؟')) executeDelete();
    } else {
      Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا التسجيل؟',[
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const message = `هل أنت متأكد من حذف ${count} تسجيلات محددة؟`;
  
    const executeDelete = async () => {
      try {
        const idsToDelete = Array.from(selectedIds);
        const { error } = await supabase.from('registrations').delete().in('id', idsToDelete);
        if (error) throw error;
  
        if (Platform.OS === 'web') window.alert('تم حذف التسجيلات بنجاح');
        else Alert.alert('نجاح', 'تم حذف التسجيلات بنجاح');
        
        setSelectedIds(new Set());
        fetchRegistrations();
      } catch (error) {
        if (Platform.OS === 'web') window.alert('فشل في حذف التسجيلات');
        else Alert.alert('خطأ', 'فشل في حذف التسجيلات');
      }
    };
  
    if (Platform.OS === 'web') {
      if (window.confirm(message)) executeDelete();
    } else {
      Alert.alert('تأكيد الحذف', message,[
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };
  
  const handleBulkStatusChange = (newStatus) => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const statusLabel = STATUS_CONFIG[newStatus]?.label;
    const message = `هل أنت متأكد من تغيير حالة ${count} تسجيلات إلى "${statusLabel}"؟`;
  
    const executeUpdate = async () => {
      try {
        const idsToUpdate = Array.from(selectedIds);
        const { error } = await supabase
          .from('registrations')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in('id', idsToUpdate);
  
        if (error) throw error;
  
        if (Platform.OS === 'web') window.alert('تم تحديث الحالة بنجاح');
        else Alert.alert('نجاح', 'تم تحديث الحالة بنجاح');
  
        setSelectedIds(new Set());
        fetchRegistrations();
      } catch (error) {
        if (Platform.OS === 'web') window.alert('فشل في تحديث الحالة');
        else Alert.alert('خطأ', 'فشل في تحديث الحالة');
      }
    };
  
    if (Platform.OS === 'web') {
      if (window.confirm(message)) executeUpdate();
    } else {
      Alert.alert('تأكيد التحديث', message,[
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تحديث', onPress: executeUpdate },
      ]);
    }
  };

  // ==================== EXPORT FUNCTIONS ====================
  const exportToExcel = async () => {
    try {
      const dataToExport = filteredRegistrations.map(r => ({
        'الاسم': r.name || '',
        'الهاتف': r.phone || '',
        'البريد الإلكتروني': r.email || '',
        'الولاية': r.wilaya || '',
        'مجال النشاط': r.business_field || '',
        'رأس المال': r.capital || '',
        'زيارة كانتون': r.visited_canton ? 'نعم' : 'لا',
        'الحالة': STATUS_CONFIG[r.status]?.label || 'جديد',
        'تاريخ التسجيل': r.created_at ? new Date(r.created_at).toLocaleString('ar-DZ') : '',
        'ملاحظات': r.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
        link.download = fileName;
        link.click();
      } else {
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, wbout, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(filePath);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تصدير البيانات');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRegistrations();
  },[]);

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRegistrations.map(r => r.id)));
  };
  
  const clearSelection = () => setSelectedIds(new Set());

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <BrandBackground />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <ArText style={{ marginTop: 16 }}>جاري تحميل البيانات...</ArText>
      </View>
    );
  }

  const ActionButtons = ({ isMobile }) => (
    <View style={styles.floatingActions}>
      <Pressable 
        style={[styles.fabActionDelete, !isMobile && styles.fabActionDeleteDesktop]} 
        onPress={handleBulkDelete}
      >
        <MaterialIcons name="delete" size={isMobile ? 18 : 20} color={COLORS.textWhite} />
        <ArText weight="700" style={[styles.fabActionText, !isMobile && { fontSize: 14 }]}>حذف</ArText>
      </Pressable>

      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <Pressable
          key={key}
          style={[styles.fabActionStatus, !isMobile && styles.fabActionStatusDesktop]}
          onPress={() => handleBulkStatusChange(key)}
        >
            <MaterialIcons name={config.icon} size={isMobile ? 18 : 20} color={COLORS.textWhite} />
            <ArText weight="700" style={{color: COLORS.textWhite, fontSize: isMobile ? 13 : 14}}>
              {config.label}
            </ArText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <BrandBackground />

      {/* Header */}
      <BlurView intensity={90} tint="light" style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <MaterialIcons name="admin-panel-settings" size={isMobile ? 24 : 28} color={COLORS.primary} />
            </View>
            <View>
              <ArText weight="900" style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>
                لوحة التحكم
              </ArText>
              <ArText style={[styles.headerSubtitle, isMobile && styles.headerSubtitleMobile]}>
                السلام عليكم، صل على رسول الله
              </ArText>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={exportToExcel} style={styles.headerButton}>
              <MaterialIcons name="download" size={isMobile ? 20 : 22} color={COLORS.textMain} />
            </Pressable>
            <Pressable onPress={fetchRegistrations} style={styles.headerButton}>
              <MaterialIcons name="refresh" size={isMobile ? 20 : 22} color={COLORS.textMain} />
            </Pressable>
            <Pressable onPress={signOut} style={[styles.headerButton, { backgroundColor: COLORS.error + '15' }]}>
              <MaterialIcons name="logout" size={isMobile ? 20 : 22} color={COLORS.error} />
            </Pressable>
          </View>
        </View>
      </BlurView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Stats Cards */}
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          <StatCard 
            title="الإجمالي" 
            value={stats.total} 
            icon="people" 
            color={COLORS.info}
            onClick={() => setStatusFilter('all')}
          />
          <StatCard 
            title="جديد" 
            value={stats.new} 
            icon="fiber-new" 
            color={STATUS_CONFIG.new.color}
            onClick={() => setStatusFilter('new')}
          />
          <StatCard 
            title="تم الاتصال" 
            value={stats.contacted} 
            icon="phone" 
            color={STATUS_CONFIG.contacted.color}
            onClick={() => setStatusFilter('contacted')}
          />
          <StatCard 
            title="مؤهل" 
            value={stats.qualified} 
            icon="check-circle" 
            color={STATUS_CONFIG.qualified.color}
            onClick={() => setStatusFilter('qualified')}
          />
          <StatCard 
            title="محول" 
            value={stats.converted} 
            icon="trending-up" 
            color={STATUS_CONFIG.converted.color}
            onClick={() => setStatusFilter('converted')}
          />
          <StatCard 
            title="منسحب" 
            value={stats.lost} 
            icon="cancel" 
            color={STATUS_CONFIG.lost.color}
            onClick={() => setStatusFilter('lost')}
          />
        </View>

        {/* Search and Filters */}
        <View style={styles.filters}>
          <ArInput
            wrapperStyle={styles.searchWrapper}
            icon="search"
            placeholder="بحث بالاسم، الهاتف، الولاية..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterTabsScroll}
            contentContainerStyle={styles.filterTabsContent}
          >
            <View style={styles.filterTabs}>
              <Pressable
                style={[styles.filterTab, statusFilter === 'all' && styles.filterTabActive]}
                onPress={() => setStatusFilter('all')}
              >
                <ArText weight={statusFilter === 'all' ? "700" : "400"} style={[styles.filterTabText, statusFilter === 'all' && { color: COLORS.primary }]}>
                  الكل ({stats.total})
                </ArText>
              </Pressable>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[styles.filterTab, statusFilter === key && { borderColor: config.color, backgroundColor: config.color + '15' }]}
                  onPress={() => setStatusFilter(key)}
                >
                  <ArText weight={statusFilter === key ? "700" : "400"} style={[styles.filterTabText, statusFilter === key && { color: config.color }]}>
                    {config.label} ({stats[key] || 0})
                  </ArText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color={COLORS.error} />
            <ArText style={styles.errorText}>{error}</ArText>
          </View>
        )}

        {/* Select All Header */}
        <View style={styles.selectionHeader}>
          <Pressable style={styles.selectAllBtn} onPress={handleSelectAll}>
            <MaterialIcons 
              name={selectedIds.size === filteredRegistrations.length && filteredRegistrations.length > 0 ? "check-box" : "check-box-outline-blank"} 
              size={24} 
              color={selectedIds.size > 0 ? COLORS.primary : COLORS.textLight} 
            />
            <ArText weight="700" style={{color: selectedIds.size > 0 ? COLORS.primary : COLORS.textMuted}}>
              {selectedIds.size === filteredRegistrations.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </ArText>
          </Pressable>
          <ArText style={{color: COLORS.textMuted}}>
            تم تحديد: {selectedIds.size}
          </ArText>
        </View>

        {/* Registrations List */}
        <View style={[styles.list, !isMobile && styles.listDesktop]}>
          {filteredRegistrations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <MaterialIcons name="inbox" size={isMobile ? 40 : 54} color={COLORS.textLight} />
              </View>
              <ArText weight="700" style={[styles.emptyStateText, isMobile && styles.emptyStateTextMobile]}>
                لا توجد تسجيلات
              </ArText>
              <ArText style={[styles.emptyStateSubText, isMobile && styles.emptyStateSubTextMobile]}>
                {searchQuery || statusFilter !== 'all' 
                  ? 'حاول تغيير معايير البحث'
                  : 'عندما يقوم أحد بالتسجيل، ستظهر البيانات هنا'}
              </ArText>
            </View>
          ) : (
            filteredRegistrations.map((reg) => (
              <RegistrationCard
                key={reg.id}
                registration={reg}
                isMobile={isMobile}
                isSelected={selectedIds.has(reg.id)}
                onToggleSelect={() => toggleSelection(reg.id)}
                onView={() => { setSelectedRegistration(reg); setViewModalVisible(true); }}
                onEdit={() => { setSelectedRegistration(reg); setEditModalVisible(true); }}
                onDelete={() => handleDeleteRegistration(reg.id)}
                onStatusChange={(newStatus) => handleUpdateRegistration(reg.id, { status: newStatus })}
              />
            ))
          )}
        </View>

        <View style={{ height: isMobile ? 80 : 100 }} />
      </ScrollView>

      {/* Floating Bulk Actions Bar */}
      <Animated.View 
        style={[
          styles.floatingContainer, 
          { 
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange:[200, 0] }) }],
            opacity: slideAnim
          } 
        ]}
      >
        <View style={[styles.floatingBar, isMobile ? styles.floatingBarMobile : styles.floatingBarDesktop]}>
          <View style={styles.floatingBarLeft}>
            <Pressable onPress={clearSelection} style={styles.closeBtn}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textWhite} />
            </Pressable>
            <View>
              <ArText weight="900" style={styles.selectedCountText}>
                {selectedIds.size} {isMobile ? 'محدد' : 'عناصر محددة'}
              </ArText>
              {!isMobile && (
                <ArText style={styles.selectedSubText}>اختر إجراءً لتطبيقه</ArText>
              )}
            </View>
          </View>
          
          <View style={styles.verticalDivider} />

          {isMobile ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floatingActionsContent}>
              <ActionButtons isMobile={true} />
            </ScrollView>
          ) : (
            <View style={styles.desktopActionsRow}>
              <ActionButtons isMobile={false} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Modals */}
      <ViewRegistrationModal
        visible={viewModalVisible}
        registration={selectedRegistration}
        onClose={() => { setViewModalVisible(false); setSelectedRegistration(null); }}
        isMobile={isMobile}
      />

      <EditRegistrationModal
        visible={editModalVisible}
        registration={selectedRegistration}
        onClose={() => { setEditModalVisible(false); setSelectedRegistration(null); }}
        onSave={(updates) => handleUpdateRegistration(selectedRegistration.id, updates)}
        isMobile={isMobile}
      />
    </View>
  );
}

// ==================== REGISTRATION CARD COMPONENT ====================
const RegistrationCard = ({ registration, onView, onEdit, onDelete, onStatusChange, isMobile, isSelected, onToggleSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(0);
  const animation = React.useRef(new Animated.Value(0)).current;
  
  if (!registration) return null;

  const status = registration.status || 'new';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const nextStatus = statusConfig.nextStatus;

  const handleCall = () => {
    if (registration.phone) {
      if (Platform.OS === 'web') window.location.href = `tel:${registration.phone}`;
      else Linking.openURL(`tel:${registration.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (registration.phone) {
      const cleanPhone = registration.phone.replace(/[^0-9]/g, '');
      if (Platform.OS === 'web') window.open(`https://wa.me/${cleanPhone}`, '_blank');
      else Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
    }
  };

  // --- DESKTOP CARD LAYOUT (Fully expanded grid style) ---
  if (!isMobile) {
    return (
      <View style={[styles.cardDesktop, isSelected && styles.cardSelectedDesktop]}>
        
        {/* Header Row */}
        <View style={styles.cdHeader}>
          <View style={styles.cdHeaderRight}>
            <Pressable onPress={onToggleSelect} style={styles.checkboxContainer} hitSlop={10}>
              <MaterialIcons name={isSelected ? "check-box" : "check-box-outline-blank"} size={26} color={isSelected ? COLORS.primary : COLORS.textLight} />
            </Pressable>
            <View style={styles.cdNameBox}>
              <ArText weight="900" style={styles.cdName}>{registration.name || 'بدون اسم'}</ArText>
              <ArText style={styles.cdDate}>
                {registration.created_at ? new Date(registration.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric'}) : 'تاريخ غير محدد'}
              </ArText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <ArText style={styles.statusText} weight="700">{statusConfig.label}</ArText>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.cdDetailsGrid}>
          {registration.phone && (
            <View style={styles.detailItemDesktop}>
              <MaterialIcons name="phone" size={18} color={COLORS.primary} />
              <ArText style={styles.detailText}>{registration.phone}</ArText>
            </View>
          )}
          {registration.email && (
            <View style={styles.detailItemDesktop}>
              <MaterialIcons name="email" size={18} color={COLORS.primary} />
              <ArText style={styles.detailText}>{registration.email}</ArText>
            </View>
          )}
          <View style={styles.detailItemDesktop}>
            <MaterialIcons name="location-on" size={18} color={COLORS.primary} />
            <ArText style={styles.detailText}>{registration.wilaya || 'غير محدد'}</ArText>
          </View>
          <View style={styles.detailItemDesktop}>
            <MaterialIcons name="business" size={18} color={COLORS.primary} />
            <ArText style={styles.detailText}>{registration.business_field || 'غير محدد'}</ArText>
          </View>
          <View style={styles.detailItemDesktop}>
            <MaterialIcons name="attach-money" size={18} color={COLORS.primary} />
            <ArText style={styles.detailText}>{registration.capital || 'غير محدد'}</ArText>
          </View>
          <View style={styles.detailItemDesktop}>
            <MaterialCommunityIcons name="factory" size={18} color={COLORS.primary} />
            <ArText style={styles.detailText}>{registration.visited_canton ? 'زار المعرض' : 'لم يزر المعرض'}</ArText>
          </View>
        </View>

        {/* Notes */}
        {registration.notes && (
          <View style={[styles.detailItemDesktop, { width: '100%', alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12 }]}>
            <MaterialIcons name="note" size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
            <ArText style={[styles.detailText, { flex: 1 }]}>{registration.notes}</ArText>
          </View>
        )}

        {/* Action Footer */}
        <View style={styles.cdFooter}>
          <View style={styles.cdFooterQuick}>
            {registration.phone && (
              <>
                <Pressable style={[styles.cdQuickBtn, {backgroundColor: COLORS.success + '15'}]} onPress={handleCall}>
                  <MaterialIcons name="phone" size={18} color={COLORS.success} />
                </Pressable>
                <Pressable style={[styles.cdQuickBtn, {backgroundColor: COLORS.whatsapp + '15'}]} onPress={handleWhatsApp}>
                  <MaterialIcons name="chat" size={18} color={COLORS.whatsapp} />
                </Pressable>
              </>
            )}
            {nextStatus && (
               <Pressable style={[styles.cdQuickBtn, {backgroundColor: STATUS_CONFIG[nextStatus].color + '15', paddingHorizontal: 12}]} onPress={() => onStatusChange(nextStatus)}>
                 <ArText weight="700" style={{color: STATUS_CONFIG[nextStatus].color, fontSize: 13}}>تغيير لـ {STATUS_CONFIG[nextStatus].label}</ArText>
               </Pressable>
            )}
          </View>
          
          <View style={styles.cdFooterMain}>
             <Pressable style={[styles.cdActionBtn, {backgroundColor: COLORS.info + '10'}]} onPress={onView}>
               <MaterialIcons name="visibility" size={18} color={COLORS.info} />
             </Pressable>
             <Pressable style={[styles.cdActionBtn, {backgroundColor: COLORS.warning + '10'}]} onPress={onEdit}>
               <MaterialIcons name="edit" size={18} color={COLORS.warning} />
             </Pressable>
             <Pressable style={[styles.cdActionBtn, {backgroundColor: COLORS.error + '10'}]} onPress={onDelete}>
               <MaterialIcons name="delete" size={18} color={COLORS.error} />
             </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // --- MOBILE CARD LAYOUT (Expandable Accordion) ---
  const toggleExpand = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    Animated.timing(animation, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const animatedHeight = animation.interpolate({ inputRange: [0, 1], outputRange:[0, bodyHeight > 0 ? bodyHeight : 300] });
  const spin = animation.interpolate({ inputRange:[0, 1], outputRange: ['0deg', '180deg'] });
  const contentOpacity = animation.interpolate({ inputRange: [0, 0.3, 1], outputRange:[0, 0, 1] });

  return (
    <View style={[styles.card, styles.cardMobile, isSelected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Pressable onPress={onToggleSelect} style={styles.checkboxContainer} hitSlop={10}>
          <MaterialIcons 
            name={isSelected ? "check-box" : "check-box-outline-blank"} 
            size={24} 
            color={isSelected ? COLORS.primary : COLORS.textLight} 
          />
        </Pressable>

        <Pressable onPress={toggleExpand} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <ArText style={styles.statusTextMobile} weight="700">
                {statusConfig.label}
              </ArText>
            </View>
            <View style={styles.cardHeaderInfo}>
              <ArText weight="700" style={styles.cardNameMobile}>
                {registration.name || 'بدون اسم'}
              </ArText>
              <ArText style={styles.cardPhoneMobile}>
                {registration.phone || ''}
              </ArText>
            </View>
          </View>
          
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons name="expand-more" size={22} color={COLORS.textLight} />
          </Animated.View>
        </Pressable>
      </View>

      <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        <Animated.View 
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== bodyHeight) setBodyHeight(h);
          }}
          style={{ position: 'absolute', width: '100%', top: 0, opacity: contentOpacity }}
        >
          <View style={styles.cardContent}>
            
            {nextStatus && (
              <Pressable
                style={[styles.nextStatusButton, { borderColor: STATUS_CONFIG[nextStatus].color, backgroundColor: STATUS_CONFIG[nextStatus].color + '0A' }]}
                onPress={() => onStatusChange(nextStatus)}
              >
                <MaterialIcons name="arrow-forward" size={16} color={STATUS_CONFIG[nextStatus].color} />
                <ArText weight="700" style={{ color: STATUS_CONFIG[nextStatus].color, fontSize: 12 }}>
                  تغيير إلى: {STATUS_CONFIG[nextStatus].label}
                </ArText>
              </Pressable>
            )}

            {registration.phone && (
              <View style={styles.quickActionsMobile}>
                <Pressable style={[styles.callButton, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success }]} onPress={handleCall}>
                  <MaterialIcons name="phone" size={16} color={COLORS.success} />
                  <ArText weight="700" style={{ color: COLORS.success, marginLeft: 6, fontSize: 12 }}>اتصال</ArText>
                </Pressable>
                
                <Pressable style={[styles.whatsappButton, { backgroundColor: COLORS.whatsapp + '15', borderColor: COLORS.whatsapp }]} onPress={handleWhatsApp}>
                  <MaterialIcons name="chat" size={16} color={COLORS.whatsapp} />
                  <ArText weight="700" style={{ color: COLORS.whatsapp, marginLeft: 6, fontSize: 12 }}>واتساب</ArText>
                </Pressable>
              </View>
            )}

            <View style={styles.detailsGridMobile}>
              {registration.email && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="email" size={16} color={COLORS.primary} />
                  <ArText style={styles.detailTextMobile}>{registration.email}</ArText>
                </View>
              )}
              <View style={styles.detailItem}>
                <MaterialIcons name="location-on" size={16} color={COLORS.primary} />
                <ArText style={styles.detailTextMobile}>{registration.wilaya || 'غير محدد'}</ArText>
              </View>
              <View style={styles.detailItem}>
                <MaterialIcons name="business" size={16} color={COLORS.primary} />
                <ArText style={styles.detailTextMobile}>{registration.business_field || 'غير محدد'}</ArText>
              </View>
              <View style={styles.detailItem}>
                <MaterialIcons name="attach-money" size={16} color={COLORS.primary} />
                <ArText style={styles.detailTextMobile}>{registration.capital || 'غير محدد'}</ArText>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="factory" size={16} color={COLORS.primary} />
                <ArText style={styles.detailTextMobile}>{registration.visited_canton ? 'زار المعرض' : 'لم يزر المعرض'}</ArText>
              </View>
              <View style={styles.detailItem}>
                <MaterialIcons name="access-time" size={16} color={COLORS.primary} />
                <ArText style={styles.detailTextMobile}>
                  {registration.created_at ? new Date(registration.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric'}) : 'غير محدد'}
                </ArText>
              </View>
              {registration.notes && (
                <View style={[styles.detailItem, { width: '100%', alignItems: 'flex-start' }]}>
                  <MaterialIcons name="note" size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <ArText style={[styles.detailTextMobile, { flex: 1 }]}>{registration.notes}</ArText>
                </View>
              )}
            </View>

            <View style={styles.cardActionsMobile}>
              <Pressable style={[styles.actionButton, styles.actionView]} onPress={onView}>
                <MaterialIcons name="visibility" size={16} color={COLORS.info} />
                <ArText weight="700" style={[styles.actionTextMobile, {color: COLORS.info}]}>عرض</ArText>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionEdit]} onPress={onEdit}>
                <MaterialIcons name="edit" size={16} color={COLORS.warning} />
                <ArText weight="700" style={[styles.actionTextMobile, {color: COLORS.warning}]}>تعديل</ArText>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionDelete]} onPress={onDelete}>
                <MaterialIcons name="delete" size={16} color={COLORS.error} />
                <ArText weight="700" style={[styles.actionTextMobile, {color: COLORS.error}]}>حذف</ArText>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ==================== VIEW MODAL ====================
const ViewRegistrationModal = ({ visible, registration, onClose, isMobile }) => {
  if (!visible || !registration) return null;

  const handleCall = () => {
    if (registration.phone) {
      if (Platform.OS === 'web') window.location.href = `tel:${registration.phone}`;
      else Linking.openURL(`tel:${registration.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (registration.phone) {
      const cleanPhone = registration.phone.replace(/[^0-9]/g, '');
      if (Platform.OS === 'web') window.open(`https://wa.me/${cleanPhone}`, '_blank');
      else Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <ArText weight="900" style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>تفاصيل التسجيل</ArText>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textMain} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.modalSection}>
              {registration.phone && (
                <View style={[styles.modalCallActions, isMobile && styles.modalCallActionsMobile]}>
                  <Pressable style={[styles.modalCallButton, { backgroundColor: COLORS.success }]} onPress={handleCall}>
                    <MaterialIcons name="phone" size={isMobile ? 18 : 20} color={COLORS.bgWhite} />
                    <ArText weight="700" style={{ color: COLORS.bgWhite, marginLeft: 6, fontSize: isMobile ? 13 : 15 }}>اتصال</ArText>
                  </Pressable>
                  <Pressable style={[styles.modalCallButton, { backgroundColor: COLORS.whatsapp }]} onPress={handleWhatsApp}>
                    <MaterialIcons name="chat" size={isMobile ? 18 : 20} color={COLORS.bgWhite} />
                    <ArText weight="700" style={{ color: COLORS.bgWhite, marginLeft: 6, fontSize: isMobile ? 13 : 15 }}>واتساب</ArText>
                  </Pressable>
                </View>
              )}

              {[
                { label: 'الاسم', value: registration.name },
                { label: 'الهاتف', value: registration.phone },
                { label: 'البريد', value: registration.email },
                { label: 'الولاية', value: registration.wilaya },
                { label: 'مجال النشاط', value: registration.business_field },
                { label: 'رأس المال', value: registration.capital },
                { label: 'زيارة كانتون', value: registration.visited_canton ? 'نعم' : 'لا' },
                { label: 'تاريخ التسجيل', value: registration.created_at ? new Date(registration.created_at).toLocaleString('ar-DZ') : '' },
              ].map((item, index) => (
                <View key={index} style={styles.modalRow}>
                  <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>{item.label}:</ArText>
                  <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>{item.value || '—'}</ArText>
                </View>
              ))}

              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>الحالة:</ArText>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[registration.status]?.color || COLORS.info }]}>
                  <ArText style={[styles.statusText, isMobile && styles.statusTextMobile]} weight="700">
                    {STATUS_CONFIG[registration.status]?.label || 'جديد'}
                  </ArText>
                </View>
              </View>

              {registration.notes && (
                <View style={[styles.modalRow, { alignItems: 'flex-start' }]}>
                  <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>ملاحظات:</ArText>
                  <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile, { flex: 1 }]}>{registration.notes}</ArText>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==================== EDIT MODAL ====================
const EditRegistrationModal = ({ visible, registration, onClose, onSave, isMobile }) => {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', wilaya: '', business_field: '', capital: '', visited_canton: false, status: 'new', notes: '', company_name: '', interest_level: 0, source: 'app_signup',
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (registration) {
      setInitializing(true);
      setFormData({
        name: registration.name || '', phone: registration.phone || '', email: registration.email || '', wilaya: registration.wilaya || '', business_field: registration.business_field || '', capital: registration.capital || '', visited_canton: registration.visited_canton ?? false, status: registration.status || 'new', notes: registration.notes || '', company_name: registration.company_name || '', interest_level: registration.interest_level ?? 0, source: registration.source || 'app_signup',
      });
      setInitializing(false);
    }
  }, [registration]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  if (!visible) return null;

  if (initializing) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile, styles.centerContent, { padding: 40 }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <ArText style={{ marginTop: 16 }}>جاري تحميل البيانات...</ArText>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile, { maxWidth: 700 }]}>
          
          <View style={styles.modalHeader}>
            <ArText weight="900" style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>تعديل بيانات التسجيل</ArText>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textMain} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editTabsScroll}>
            <View style={styles.editTabs}>
              <Pressable style={[styles.editTab, activeTab === 'basic' && styles.editTabActive]} onPress={() => setActiveTab('basic')}>
                <MaterialIcons name="person" size={isMobile ? 18 : 20} color={activeTab === 'basic' ? COLORS.primary : COLORS.textMuted} />
                <ArText weight={activeTab === 'basic' ? "700" : "400"} style={[styles.editTabText, isMobile && styles.editTabTextMobile, activeTab === 'basic' && { color: COLORS.primary }]}>أساسي</ArText>
              </Pressable>
              <Pressable style={[styles.editTab, activeTab === 'advanced' && styles.editTabActive]} onPress={() => setActiveTab('advanced')}>
                <MaterialIcons name="settings" size={isMobile ? 18 : 20} color={activeTab === 'advanced' ? COLORS.primary : COLORS.textMuted} />
                <ArText weight={activeTab === 'advanced' ? "700" : "400"} style={[styles.editTabText, isMobile && styles.editTabTextMobile, activeTab === 'advanced' && { color: COLORS.primary }]}>متقدم</ArText>
              </Pressable>
            </View>
          </ScrollView>

          <ScrollView style={styles.modalBody}>
            {activeTab === 'basic' ? (
              <View style={styles.modalSection}>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الاسم الكامل <Text style={{ color: COLORS.error }}>*</Text></ArText>
                    <ArInput value={formData.name} onChangeText={(t) => updateField('name', t)} placeholder="أدخل الاسم الكامل" icon="person" />
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>رقم الهاتف <Text style={{ color: COLORS.error }}>*</Text></ArText>
                    <ArInput value={formData.phone} onChangeText={(t) => updateField('phone', t)} placeholder="05XX XXX XXX" keyboardType="phone-pad" icon="phone" />
                  </View>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>البريد الإلكتروني</ArText>
                    <ArInput value={formData.email} onChangeText={(t) => updateField('email', t)} placeholder="example@domain.com" keyboardType="email-address" icon="email" />
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الولاية <Text style={{ color: COLORS.error }}>*</Text></ArText>
                    <ArInput value={formData.wilaya} onChangeText={(t) => updateField('wilaya', t)} placeholder="الجزائر العاصمة" icon="location-on" />
                  </View>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>مجال النشاط <Text style={{ color: COLORS.error }}>*</Text></ArText>
                    <ArInput value={formData.business_field} onChangeText={(t) => updateField('business_field', t)} placeholder="التجارة, الخدمات, ..." icon="business" />
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>رأس المال <Text style={{ color: COLORS.error }}>*</Text></ArText>
                    <ArInput value={formData.capital} onChangeText={(t) => updateField('capital', t)} placeholder="أقل من 10 مليون" icon="attach-money" />
                  </View>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الشركة (اختياري)</ArText>
                    <ArInput value={formData.company_name} onChangeText={(t) => updateField('company_name', t)} placeholder="اسم الشركة" icon="apartment" />
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>زيارة كانتون فير</ArText>
                    <View style={styles.toggleSwitch}>
                      <Pressable style={[styles.toggleOption, !formData.visited_canton && styles.toggleOptionActive]} onPress={() => updateField('visited_canton', false)}>
                        <ArText weight={!formData.visited_canton ? "700" : "400"} style={{ color: !formData.visited_canton ? COLORS.primary : COLORS.textMuted, fontSize: isMobile ? 13 : 15 }}>لا</ArText>
                      </Pressable>
                      <Pressable style={[styles.toggleOption, formData.visited_canton && styles.toggleOptionActive]} onPress={() => updateField('visited_canton', true)}>
                        <ArText weight={formData.visited_canton ? "700" : "400"} style={{ color: formData.visited_canton ? COLORS.primary : COLORS.textMuted, fontSize: isMobile ? 13 : 15 }}>نعم</ArText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.modalSection}>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الحالة</ArText>
                    <View style={styles.statusSelector}>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <Pressable key={key} style={[styles.statusOption, formData.status === key && { backgroundColor: config.color + '15', borderColor: config.color }]} onPress={() => updateField('status', key)}>
                          <ArText weight={formData.status === key ? "700" : "400"} style={[styles.statusOptionText, formData.status === key && { color: config.color }, isMobile && { fontSize: 11 }]}>{config.label}</ArText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>مصدر التسجيل</ArText>
                    <ArInput value={formData.source} onChangeText={(t) => updateField('source', t)} placeholder="app_signup" icon="source" />
                  </View>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>مستوى الاهتمام (0-10)</ArText>
                    <View style={styles.interestSlider}>
                      <ArInput value={String(formData.interest_level || 0)} onChangeText={(t) => { const v = parseInt(t) || 0; updateField('interest_level', Math.min(10, Math.max(0, v))); }} keyboardType="numeric" icon="trending-up" style={{ textAlign: 'center' }} />
                      <View style={styles.sliderLabels}>
                        {[0, 2, 4, 6, 8, 10].map(num => (
                          <Pressable key={num} onPress={() => updateField('interest_level', num)}>
                            <ArText weight={num <= formData.interest_level ? "700" : "400"} style={{ color: num <= formData.interest_level ? COLORS.primary : COLORS.textLight, fontSize: isMobile ? 10 : 12 }}>{num}</ArText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile, { width: '100%' }]}>
                    <ArText weight="700" style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>ملاحظات</ArText>
                    <View style={[styles.inputWrapper, { alignItems: 'flex-start', height: 'auto', minHeight: isMobile ? 80 : 100 }]}>
                      <MaterialIcons name="note" size={isMobile ? 18 : 20} color={COLORS.primary} style={[styles.inputIcon, { marginTop: 12 }]} />
                      <TextInput style={[styles.input, { height: 'auto', minHeight: isMobile ? 60 : 80, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 }]} value={formData.notes} onChangeText={(t) => updateField('notes', t)} multiline numberOfLines={isMobile ? 3 : 4} placeholder="أضف ملاحظات هنا..." placeholderTextColor={COLORS.textLight} textAlign="right" />
                    </View>
                  </View>
                </View>
                <View style={styles.metadataSection}>
                  <ArText weight="700" style={[styles.metadataTitle, isMobile && styles.metadataTitleMobile]}>معلومات النظام</ArText>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>تاريخ الإنشاء:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>{registration?.created_at ? new Date(registration.created_at).toLocaleString('ar-DZ') : '—'}</ArText>
                  </View>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>آخر تحديث:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>{registration?.updated_at ? new Date(registration.updated_at).toLocaleString('ar-DZ') : '—'}</ArText>
                  </View>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>المعرف:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>{registration?.id || '—'}</ArText>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalActions, isMobile && styles.modalActionsMobile]}>
            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <ArText weight="700" style={{ fontSize: isMobile ? 13 : 15, color: COLORS.textMain }}>إلغاء</ArText>
            </Pressable>
            <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.bgWhite} />
              ) : (
                <>
                  <MaterialIcons name="save" size={isMobile ? 18 : 20} color={COLORS.bgWhite} />
                  <ArText weight="700" style={{ color: COLORS.bgWhite, marginLeft: 6, fontSize: isMobile ? 13 : 15 }}>حفظ</ArText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Background Graphics (Matches App.js)
  redSun: { position: 'absolute', top: 120, right: '17%', width: 50, height: 50, borderRadius: 45, backgroundColor: COLORS.accentRed },
  greenWave1: { position: 'absolute', top: -200, left: '-20%', width: '120%', height: 450, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '-12deg' }], borderBottomRightRadius: 600, borderBottomLeftRadius: 200 },
  greenWave2: { position: 'absolute', top: '30%', right: '-40%', width: 80, height: 250, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '-35deg' }], borderTopLeftRadius: 500, borderBottomLeftRadius: 500 },
  greenWave3: { position: 'absolute', bottom: -100, left: '-10%', width: '120%', height: 350, backgroundColor: COLORS.primary, opacity: 0.12, transform:[{ rotate: '15deg' }], borderTopRightRadius: 600, borderTopLeftRadius: 300 },
  lineArtGrid: { position: 'absolute', bottom: 0, right: 0, width: 400, height: 400, borderWidth: 1, borderColor: 'rgba(14, 178, 124, 0.12)', borderRadius: 200, transform:[{ scale: 2 }, { translateX: 100 }, { translateY: 100 }] },
  
  container: { flex: 1, backgroundColor: COLORS.bgMain },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 10,
  },
  headerMobile: {
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1400, alignSelf: 'center', width: '100%' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconBox: { backgroundColor: COLORS.primaryLight, padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 22, color: COLORS.textMain },
  headerTitleMobile: { fontSize: 18 },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  headerSubtitleMobile: { fontSize: 11 },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerButton: { padding: 10, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12 },
  
  content: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 0, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 30 },
  statsGridMobile: { gap: 12 },
  statCard: {
    flex: 1, minWidth: 160, backgroundColor: COLORS.bgWhite, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2
  },
  statCardMobile: { minWidth: '45%', padding: 16, borderRadius: 16 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  statIconBox: { padding: 8, borderRadius: 12 },
  statTitle: { fontSize: 15, color: COLORS.textMuted },
  statValue: { fontSize: 32, color: COLORS.textMain },
  statTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  
  filters: { marginBottom: 24, gap: 16 },
  
  searchWrapper: {
    height: 54, 
    backgroundColor: COLORS.bgWhite, 
    borderRadius: 16, 
    borderColor: 'transparent',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 12, 
    elevation: 2 
  },
  
  filterTabsScroll: { flexGrow: 0 },
  filterTabsContent: { paddingRight: 4 },
  filterTabs: { flexDirection: 'row-reverse', gap: 10 },
  filterTab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: COLORS.bgWhite, borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  filterTabText: { fontSize: 14, color: COLORS.textMuted },
  
  errorContainer: { backgroundColor: COLORS.error + '15', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, borderWidth: 1, borderColor: COLORS.error + '40' },
  errorText: { color: COLORS.error, flex: 1, fontSize: 15 },
  
  list: { gap: 16 },
  listDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, width: '100%' },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.02)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyStateText: { color: COLORS.textMain, fontSize: 20 },
  emptyStateTextMobile: { fontSize: 18 },
  emptyStateSubText: { color: COLORS.textMuted, marginTop: 8, fontSize: 15 },
  emptyStateSubTextMobile: { fontSize: 13 },
  
  // --- MOBILE CARD ---
  card: { backgroundColor: COLORS.bgWhite, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardMobile: { borderRadius: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardHeaderInfo: { flex: 1 },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12 },
  statusText: { fontSize: 13, color: COLORS.bgWhite },
  statusTextMobile: { fontSize: 11 },
  cardName: { fontSize: 18, color: COLORS.textMain },
  cardNameMobile: { fontSize: 16 },
  cardPhone: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  cardPhoneMobile: { fontSize: 12 },
  cardContent: { padding: 20, paddingTop: 0, gap: 18 },
  nextStatusButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  quickActionsMobile: { flexDirection: 'row', gap: 8 },
  callButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  whatsappButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  detailsGridMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: '45%' },
  detailTextMobile: { color: COLORS.textMuted, fontSize: 12 },
  cardActionsMobile: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionView: { backgroundColor: COLORS.info + '10' },
  actionEdit: { backgroundColor: COLORS.warning + '10' },
  actionDelete: { backgroundColor: COLORS.error + '10' },
  actionTextMobile: { fontSize: 12 },
  
  // --- DESKTOP CARD ---
  cardDesktop: {
    width: Platform.OS === 'web' ? 'calc(50% - 10px)' : '48%',
    flexGrow: 1,
    minWidth: 350,
    backgroundColor: COLORS.bgWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    gap: 20
  },
  cardSelectedDesktop: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  cdHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  cdHeaderRight: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  cdNameBox: { paddingTop: 2 },
  cdName: { fontSize: 20, color: COLORS.textMain },
  cdDate: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  cdDetailsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 16 },
  detailItemDesktop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, minWidth: '45%' },
  detailText: { color: COLORS.textMuted, fontSize: 14 },
  cdFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20, marginTop: 'auto' },
  cdFooterQuick: { flexDirection: 'row-reverse', gap: 10 },
  cdFooterMain: { flexDirection: 'row-reverse', gap: 10 },
  cdQuickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, minWidth: 40, borderRadius: 12, paddingHorizontal: 12 },
  cdActionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  // --- MODALS ---
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalContent: { width: '90%', maxWidth: 600, maxHeight: '85%', backgroundColor: COLORS.bgWhite, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 10, overflow: 'hidden' },
  modalContentMobile: { width: '95%', maxHeight: '90%', borderRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, color: COLORS.textMain },
  modalTitleMobile: { fontSize: 18 },
  modalClose: { padding: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20 },
  modalBody: { padding: 24 },
  modalSection: { gap: 16 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalLabel: { color: COLORS.textMuted, fontSize: 15, minWidth: 110 },
  modalLabelMobile: { fontSize: 13, minWidth: 90 },
  modalValue: { color: COLORS.textMain, fontSize: 15, flex: 1 },
  modalValueMobile: { fontSize: 13 },
  modalCallActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modalCallActionsMobile: { gap: 10 },
  modalCallButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  
  editTabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editTabs: { flexDirection: 'row', paddingHorizontal: 24 },
  editTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  editTabActive: { borderBottomColor: COLORS.primary },
  editTabText: { fontSize: 15, color: COLORS.textMuted },
  editTabTextMobile: { fontSize: 13 },
  formRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  formRowMobile: { flexDirection: 'column', gap: 16, marginBottom: 16 },
  formField: { flex: 1 },
  formFieldMobile: { width: '100%' },
  inputLabel: { fontSize: 14, color: COLORS.textMain, marginBottom: 8 },
  inputLabelMobile: { fontSize: 13, marginBottom: 6 },
  
  // Custom Input styling inside ArInput wrapper
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, height: 54, paddingHorizontal: 14 },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.bgWhite, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 1 },
  inputError: { borderColor: COLORS.error, backgroundColor: COLORS.error + '05' },
  inputIcon: { marginLeft: 10 },
  input: { flex: 1, color: COLORS.textMain, fontSize: 15, height: '100%', padding: 0 },
  
  toggleSwitch: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', height: 54 },
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  toggleOptionActive: { backgroundColor: COLORS.primaryLight },
  statusSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusOption: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, backgroundColor: COLORS.bgWhite, borderColor: COLORS.border },
  statusOptionText: { fontSize: 14, color: COLORS.textMuted },
  interestSlider: { gap: 10 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  metadataSection: { marginTop: 24, padding: 20, backgroundColor: COLORS.bgMain, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  metadataTitle: { fontSize: 15, color: COLORS.primary, marginBottom: 16 },
  metadataTitleMobile: { fontSize: 14, marginBottom: 12 },
  metadataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  metadataLabel: { fontSize: 13, color: COLORS.textMuted },
  metadataLabelMobile: { fontSize: 12 },
  metadataValue: { fontSize: 13, color: COLORS.textMain },
  metadataValueMobile: { fontSize: 12 },
  modalActions: { flexDirection: 'row', padding: 24, gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bgWhite },
  modalActionsMobile: { padding: 16, gap: 12 },
  modalButton: { flex: 1, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  cancelButton: { backgroundColor: 'rgba(0,0,0,0.04)' },
  saveButton: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  
  checkboxContainer: { padding: 10, marginLeft: -10 },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 16 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  // --- FLOATING BULK ACTIONS ---
  floatingContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 9999, paddingBottom: 30, pointerEvents: 'box-none' },
  floatingBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20, overflow: 'hidden' },
  floatingBarMobile: { width: '92%', paddingVertical: 12, paddingHorizontal: 16 },
  floatingBarDesktop: { width: 'auto', minWidth: 600, maxWidth: 1000, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 24 },
  floatingBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 50, padding: 8 },
  selectedCountText: { color: COLORS.textWhite, fontSize: 16 },
  selectedSubText: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  verticalDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  floatingActionsContent: { paddingRight: 4 },
  desktopActionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  floatingActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  fabActionDelete: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.error, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 50 },
  fabActionDeleteDesktop: { paddingVertical: 12, paddingHorizontal: 24, marginRight: 16 },
  fabActionText: { color: COLORS.textWhite, fontSize: 13 },
  fabActionStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' },
  fabActionStatusDesktop: { paddingVertical: 12, paddingHorizontal: 20, minWidth: 120, justifyContent: 'center' },
});