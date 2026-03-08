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
  Animated, // <--- Add this
  Easing,   // <--- Add this
  LayoutAnimation, // <--- Add this
  UIManager,       // <--- Add this
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../config/supabase';
import { useAdminAuth } from '../../context/AdminAuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useFonts } from 'expo-font';


// ==================== CONSTANTS ====================
const COLORS = {
  primary: '#0EB27C',
  primaryLight: 'rgba(14, 178, 124, 0.15)',
  bgDark: '#0D1B22',
  bgDarker: '#081116',
  textWhite: '#F8FAFC',
  textGray: '#94A3B8',
  textLight: '#CBD5E1',
  success: '#0EB27C',
  warning: '#FFB340',
  error: '#FF453A',
  info: '#3A7BFF',
  border: 'rgba(255,255,255,0.1)',
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
  const styleId = 'rnw-responsive-overrides';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 1. MATCH BACKGROUND TO APP THEME (Fixed the blue color) */
      html, body, #root {
        background-color: ${COLORS.bgDarker} !important; 
        min-height: 100%;
        height: 100%;
      }

      /* 2. PREVENT SCROLL BOUNCE / RUBBER BANDING */
      body {
        overscroll-behavior-y: none;
      }

      /* 3. ENSURE ROOT DIV FILLS HEIGHT */
      #root {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      
      /* 4. CUSTOM SCROLLBAR (Optional - matches theme) */
      ::-webkit-scrollbar {
        width: 8px;
        background-color: ${COLORS.bgDarker};
      }
      ::-webkit-scrollbar-thumb {
        background-color: #1E293B;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: ${COLORS.primary};
      }
    `;
    document.head.append(style);
  }
}

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

// ==================== CUSTOM INPUT COMPONENT ====================
const ArInput = ({ style, icon, error, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../../fonts/Tajawal-Regular.ttf'),
  });

  return (
    <View style={[styles.inputWrapper, isFocused && styles.inputFocused, error && styles.inputError]}>
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={20} 
          color={error ? COLORS.error : (isFocused ? COLORS.primary : COLORS.textGray)} 
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
        placeholderTextColor={COLORS.textGray}
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
      style={[
        styles.statCard, 
        { borderColor: color },
        isMobile && styles.statCardMobile
      ]}
    >
      <View style={styles.statHeader}>
        <MaterialIcons name={icon} size={24} color={color} />
        <ArText style={[styles.statTitle, { color }]}>{title}</ArText>
      </View>
      <ArText weight="900" style={[styles.statValue, { color: COLORS.textWhite }]}>
        {value || 0}
      </ArText>
      {trend !== undefined && (
        <View style={styles.statTrend}>
          <MaterialIcons
            name={trend > 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={trend > 0 ? COLORS.success : COLORS.error}
          />
          <ArText style={{ color: trend > 0 ? COLORS.success : COLORS.error, fontSize: 12 }}>
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
  const isTablet = width >= 768 && width < 1024;

  // State
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  });
  const [selectedIds, setSelectedIds] = useState(new Set());

  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Trigger animation when selection changes
  useEffect(() => {
    if (selectedIds.size > 0) {
      // Slide Up
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)), // Bouncy effect
        useNativeDriver: true,
      }).start();
    } else {
      // Slide Down
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [selectedIds.size]);

  // Interpolate value to Y position (starts 150px down, moves to 0)
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 0],
  });

  // ==================== DATA FETCHING ====================
  const fetchRegistrations = async () => {
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRegistrations(data || []);
      
      // Calculate stats
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

    // Real-time subscription
    const subscription = supabase
      .channel('registrations_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'registrations' },
        () => fetchRegistrations()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // ==================== FILTERING ====================
  useEffect(() => {
    let filtered = [...registrations];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r?.status === statusFilter);
    }

    // Apply search filter
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
      // Remove any undefined values
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
    // Define the delete logic separately to reuse it
    const executeDelete = async () => {
      try {
        const { error } = await supabase
          .from('registrations')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Show success message compatible with platform
        if (Platform.OS === 'web') {
          window.alert('تم حذف التسجيل بنجاح');
        } else {
          Alert.alert('نجاح', 'تم حذف التسجيل بنجاح');
        }
        fetchRegistrations();
      } catch (error) {
        console.error('Error deleting registration:', error);
        // Show error message compatible with platform
        if (Platform.OS === 'web') {
          window.alert('فشل في حذف التسجيل');
        } else {
          Alert.alert('خطأ', 'فشل في حذف التسجيل');
        }
      }
    };

    // Use native browser confirm for Web, standard Alert for Mobile
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من حذف هذا التسجيل؟')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذا التسجيل؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'حذف',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  const handleBulkAction = async (action) => {
    if (filteredRegistrations.length === 0) return;

    const message = `هل أنت متأكد من تغيير حالة ${filteredRegistrations.length} تسجيل إلى "${STATUS_CONFIG[action]?.label}"؟`;

    const executeBulkUpdate = async () => {
      try {
        const ids = filteredRegistrations.map(r => r.id);
        const { error } = await supabase
          .from('registrations')
          .update({ 
            status: action,
            updated_at: new Date().toISOString(),
          })
          .in('id', ids);

        if (error) throw error;

        const successMsg = `تم تحديث ${ids.length} تسجيل`;
        if (Platform.OS === 'web') window.alert(successMsg);
        else Alert.alert('نجاح', successMsg);
        
        fetchRegistrations();
      } catch (error) {
        console.error('Error bulk updating:', error);
        const errorMsg = 'فشل في تطبيق الإجراء';
        if (Platform.OS === 'web') window.alert(errorMsg);
        else Alert.alert('خطأ', errorMsg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        executeBulkUpdate();
      }
    } else {
      Alert.alert(
        'تأكيد الإجراء',
        message,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تطبيق', onPress: executeBulkUpdate },
        ]
      );
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
        await FileSystem.writeAsStringAsync(filePath, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath);
        }
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('خطأ', 'فشل في تصدير البيانات');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRegistrations();
  }, []);

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <ArText style={{ marginTop: 16 }}>جاري تحميل البيانات...</ArText>
      </View>
    );
  }

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      const allIds = filteredRegistrations.map(r => r.id);
      setSelectedIds(new Set(allIds));
    }
  };
  
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
  
    const count = selectedIds.size;
    const message = `هل أنت متأكد من حذف ${count} تسجيلات محددة؟`;
  
    const executeDelete = async () => {
      try {
        const idsToDelete = Array.from(selectedIds);
        const { error } = await supabase
          .from('registrations')
          .delete()
          .in('id', idsToDelete);
  
        if (error) throw error;
  
        if (Platform.OS === 'web') {
          window.alert('تم حذف التسجيلات بنجاح');
        } else {
          Alert.alert('نجاح', 'تم حذف التسجيلات بنجاح');
        }
        
        setSelectedIds(new Set()); // Clear selection
        fetchRegistrations();
      } catch (error) {
        console.error('Error bulk deleting:', error);
        if (Platform.OS === 'web') {
          window.alert('فشل في حذف التسجيلات');
        } else {
          Alert.alert('خطأ', 'فشل في حذف التسجيلات');
        }
      }
    };
  
    if (Platform.OS === 'web') {
      if (window.confirm(message)) executeDelete();
    } else {
      Alert.alert('تأكيد الحذف', message, [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };
  
  // Function to Update Status for Selected Items
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
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .in('id', idsToUpdate);
  
        if (error) throw error;
  
        if (Platform.OS === 'web') {
          window.alert('تم تحديث الحالة بنجاح');
        } else {
          Alert.alert('نجاح', 'تم تحديث الحالة بنجاح');
        }
  
        setSelectedIds(new Set()); // Clear selection
        fetchRegistrations();
      } catch (error) {
        console.error('Error bulk updating:', error);
        if (Platform.OS === 'web') {
          window.alert('فشل في تحديث الحالة');
        } else {
          Alert.alert('خطأ', 'فشل في تحديث الحالة');
        }
      }
    };
  
    if (Platform.OS === 'web') {
      if (window.confirm(message)) executeUpdate();
    } else {
      Alert.alert('تأكيد التحديث', message, [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تحديث', onPress: executeUpdate },
      ]);
    }
  };

  const ActionButtons = ({ isMobile }) => (
    <View style={styles.floatingActions}>
      <Pressable 
        style={[styles.fabActionDelete, !isMobile && styles.fabActionDeleteDesktop]} 
        onPress={handleBulkDelete}
      >
        <MaterialIcons name="delete" size={isMobile ? 18 : 22} color={COLORS.textWhite} />
        <ArText weight="700" style={[styles.fabActionText, !isMobile && { fontSize: 14 }]}>
          حذف
        </ArText>
      </Pressable>

      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <Pressable
          key={key}
          style={[
            styles.fabActionStatus, 
            { backgroundColor: config.color + '15', borderColor: config.color },
            !isMobile && styles.fabActionStatusDesktop
          ]}
          onPress={() => handleBulkStatusChange(key)}
        >
            <MaterialIcons name={config.icon} size={isMobile ? 18 : 22} color={config.color} />
            <ArText weight="700" style={{color: config.color, fontSize: isMobile ? 13 : 14}}>
              {config.label}
            </ArText>
        </Pressable>
      ))}
    </View>
  );

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.bgDark, COLORS.bgDarker]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="admin-panel-settings" size={isMobile ? 24 : 32} color={COLORS.primary} />
            <View>
              <ArText weight="900" style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>
                لوحة التحكم
              </ArText>
              <ArText style={[styles.headerSubtitle, isMobile && styles.headerSubtitleMobile]}>
                مرحباً {user?.email || 'المسؤول'}
              </ArText>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={exportToExcel} style={styles.headerButton}>
              <MaterialIcons name="download" size={isMobile ? 18 : 20} color={COLORS.textWhite} />
            </Pressable>
            <Pressable onPress={fetchRegistrations} style={styles.headerButton}>
              <MaterialIcons name="refresh" size={isMobile ? 18 : 20} color={COLORS.textWhite} />
            </Pressable>
            <Pressable onPress={signOut} style={styles.headerButton}>
              <MaterialIcons name="logout" size={isMobile ? 18 : 20} color={COLORS.error} />
            </Pressable>
          </View>
        </View>
      </View>

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
            style={styles.searchInput}
            icon="search"
            placeholder="بحث بالاسم، الهاتف، الولاية..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Status Filter Tabs - Horizontal Scroll on Mobile */}
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
                <ArText style={[styles.filterTabText, statusFilter === 'all' && { color: COLORS.primary }]}>
                  الكل ({stats.total})
                </ArText>
              </Pressable>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[styles.filterTab, statusFilter === key && styles.filterTabActive]}
                  onPress={() => setStatusFilter(key)}
                >
                  <ArText style={[styles.filterTabText, statusFilter === key && { color: config.color }]}>
                    {config.label} ({stats[key] || 0})
                  </ArText>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Bulk Actions - Collapsible on Mobile */}
          
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color={COLORS.error} />
            <ArText style={styles.errorText}>{error}</ArText>
          </View>
        )}

{/* Select All Header (Add above the list) */}
<View style={styles.selectionHeader}>
  <Pressable style={styles.selectAllBtn} onPress={handleSelectAll}>
    <MaterialIcons 
      name={selectedIds.size === filteredRegistrations.length && filteredRegistrations.length > 0 ? "check-box" : "check-box-outline-blank"} 
      size={24} 
      color={COLORS.textLight} 
    />
    <ArText style={{color: COLORS.textLight}}>
      {selectedIds.size === filteredRegistrations.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
    </ArText>
  </Pressable>
  <ArText style={{color: COLORS.textGray}}>
    تم تحديد: {selectedIds.size}
  </ArText>
</View>

        {/* Registrations List */}
        <View style={styles.list}>
          {filteredRegistrations.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={isMobile ? 48 : 64} color={COLORS.textGray} />
              <ArText style={[styles.emptyStateText, isMobile && styles.emptyStateTextMobile]}>
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
        // NEW PROPS HERE
        isSelected={selectedIds.has(reg.id)}
        onToggleSelect={() => toggleSelection(reg.id)}
        // EXISTING PROPS
        onView={() => {
          setSelectedRegistration(reg);
          setViewModalVisible(true);
        }}
        onEdit={() => {
          setSelectedRegistration(reg);
          setEditModalVisible(true);
        }}
        onDelete={() => handleDeleteRegistration(reg.id)} // Use the new Safe Delete
        onStatusChange={(newStatus) => 
          handleUpdateRegistration(reg.id, { status: newStatus })
        }
      />
            ))
          )}
        </View>

      

        {/* Bottom Padding */}
        <View style={{ height: isMobile ? 20 : 40 }} />
      </ScrollView>

  {/* ✅ ANIMATED FLOATING ACTION BAR ✅ */}
  <Animated.View 
        style={[
          styles.floatingContainer, 
          { 
            transform: [{ 
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [200, 0] // Start further down to hide completely
              }) 
            }],
            opacity: slideAnim // Fade in as it slides up
          } 
        ]}
      >
        <View style={[styles.floatingBar, isMobile ? styles.floatingBarMobile : styles.floatingBarDesktop]}>
          
          {/* Left Side: Counter & Close */}
          <View style={styles.floatingBarLeft}>
            <Pressable onPress={clearSelection} style={styles.closeBtn}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textWhite} />
            </Pressable>
            <View>
              <ArText weight="700" style={styles.selectedCountText}>
                {selectedIds.size} {isMobile ? 'محدد' : 'عناصر محددة'}
              </ArText>
              {!isMobile && (
                <ArText style={styles.selectedSubText}>اختر إجراءً لتطبيقه</ArText>
              )}
            </View>
          </View>
          
          {/* Vertical Divider */}
          <View style={styles.verticalDivider} />

          {/* Right Side: Actions */}
          {/* Logic: If Mobile -> Scroll. If Desktop -> Show All Grid */}
          {isMobile ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.floatingActionsContent}
            >
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
        onClose={() => {
          setViewModalVisible(false);
          setSelectedRegistration(null);
        }}
        isMobile={isMobile}
      />

      <EditRegistrationModal
        visible={editModalVisible}
        registration={selectedRegistration}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedRegistration(null);
        }}
        onSave={(updates) => handleUpdateRegistration(selectedRegistration.id, updates)}
        isMobile={isMobile}
      />
    </View>
  );
}

// ==================== REGISTRATION CARD COMPONENT ====================
// ==================== REGISTRATION CARD COMPONENT ====================
const RegistrationCard = ({ 
  registration, 
  onView, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  isMobile,
  isSelected,      
  onToggleSelect   
}) => {
  const [expanded, setExpanded] = useState(false);
  const[bodyHeight, setBodyHeight] = useState(0); // Stores the exact height of the content
  const animation = React.useRef(new Animated.Value(0)).current;
  
  if (!registration) return null;

  const status = registration.status || 'new';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const nextStatus = statusConfig.nextStatus;

  // Toggle Expansion smoothly
  const toggleExpand = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);

    Animated.timing(animation, {
      toValue: willExpand ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // Must be false when animating Layout properties (height)
    }).start();
  };

  // 1. Interpolate Height (0 to measured height)
  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange:[0, bodyHeight > 0 ? bodyHeight : 300], // Fallback to 300 before first measurement
  });

  // 2. Interpolate Arrow Rotation
  const spin = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // 3. Interpolate Opacity (Fades in slightly after opening)
  const contentOpacity = animation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

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
    <View style={[
      styles.card, 
      isMobile && styles.cardMobile,
      isSelected && styles.cardSelected 
    ]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        
        {/* CHECKBOX */}
        <Pressable 
          onPress={onToggleSelect}
          style={styles.checkboxContainer}
          hitSlop={10}
        >
          <MaterialIcons 
            name={isSelected ? "check-box" : "check-box-outline-blank"} 
            size={24} 
            color={isSelected ? COLORS.primary : COLORS.textGray} 
          />
        </Pressable>

        {/* Expandable Click Area */}
        <Pressable 
          onPress={toggleExpand} 
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <ArText style={[styles.statusText, isMobile && styles.statusTextMobile]} weight="700">
                {statusConfig.label}
              </ArText>
            </View>
            <View style={styles.cardHeaderInfo}>
              <ArText weight="700" style={[styles.cardName, isMobile && styles.cardNameMobile]}>
                {registration.name || 'بدون اسم'}
              </ArText>
              <ArText style={[styles.cardPhone, isMobile && styles.cardPhoneMobile]}>
                {registration.phone || ''}
              </ArText>
            </View>
          </View>
          
          {/* Animated Arrow */}
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaterialIcons
              name="expand-more"
              size={isMobile ? 20 : 24}
              color={COLORS.textGray}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* Expanded Details - ANIMATED WRAPPER */}
      <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        
        {/* INNER WRAPPER: Measures content exact height instantly on render */}
        <Animated.View 
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== bodyHeight) setBodyHeight(h);
          }}
          style={{ 
            position: 'absolute', 
            width: '100%', 
            top: 0,
            opacity: contentOpacity // Smooth fade in
          }}
        >
          <View style={styles.cardContent}>
            
            {/* Quick Status Change */}
            {nextStatus && (
              <Pressable
                style={[styles.nextStatusButton, { borderColor: STATUS_CONFIG[nextStatus].color }]}
                onPress={() => onStatusChange(nextStatus)}
              >
                <MaterialIcons name="arrow-forward" size={isMobile ? 14 : 16} color={STATUS_CONFIG[nextStatus].color} />
                <ArText style={{ color: STATUS_CONFIG[nextStatus].color, fontSize: isMobile ? 11 : 12 }}>
                  تغيير إلى: {STATUS_CONFIG[nextStatus].label}
                </ArText>
              </Pressable>
            )}

            {/* Call Actions */}
            {registration.phone && (
              <View style={[styles.quickActions, isMobile && styles.quickActionsMobile]}>
                <Pressable
                  style={[styles.callButton, { backgroundColor: COLORS.success + '20' }]}
                  onPress={handleCall}
                >
                  <MaterialIcons name="phone" size={isMobile ? 16 : 18} color={COLORS.success} />
                  <ArText style={{ color: COLORS.success, marginLeft: 4, fontSize: isMobile ? 12 : 14 }}>
                    اتصال
                  </ArText>
                </Pressable>
                
                <Pressable
                  style={[styles.whatsappButton, { backgroundColor: '#25D36620' }]}
                  onPress={handleWhatsApp}
                >
                  <MaterialIcons name="chat" size={isMobile ? 16 : 18} color="#25D366" />
                  <ArText style={{ color: '#25D366', marginLeft: 4, fontSize: isMobile ? 12 : 14 }}>
                    واتساب
                  </ArText>
                </Pressable>
              </View>
            )}

            {/* Details Grid */}
            <View style={[styles.detailsGrid, isMobile && styles.detailsGridMobile]}>
              {registration.email && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="email" size={isMobile ? 14 : 16} color={COLORS.primary} />
                  <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>{registration.email}</ArText>
                </View>
              )}
              
              <View style={styles.detailItem}>
                <MaterialIcons name="location-on" size={isMobile ? 14 : 16} color={COLORS.primary} />
                <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>{registration.wilaya || 'غير محدد'}</ArText>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialIcons name="business" size={isMobile ? 14 : 16} color={COLORS.primary} />
                <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>{registration.business_field || 'غير محدد'}</ArText>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialIcons name="attach-money" size={isMobile ? 14 : 16} color={COLORS.primary} />
                <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>{registration.capital || 'غير محدد'}</ArText>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="factory" size={isMobile ? 14 : 16} color={COLORS.primary} />
                <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>
                  {registration.visited_canton ? 'زار معرض كانتون' : 'لم يزر المعرض'}
                </ArText>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialIcons name="access-time" size={isMobile ? 14 : 16} color={COLORS.primary} />
                <ArText style={[styles.detailText, isMobile && styles.detailTextMobile]}>
                  {registration.created_at 
                    ? new Date(registration.created_at).toLocaleDateString('ar-DZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'تاريخ غير محدد'}
                </ArText>
              </View>

              {registration.notes && (
                <View style={[styles.detailItem, { width: '100%' }]}>
                  <MaterialIcons name="note" size={isMobile ? 14 : 16} color={COLORS.primary} />
                  <ArText style={[styles.detailText, isMobile && styles.detailTextMobile, { flex: 1 }]}>
                    {registration.notes}
                  </ArText>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={[styles.cardActions, isMobile && styles.cardActionsMobile]}>
              <Pressable style={[styles.actionButton, styles.actionView]} onPress={onView}>
                <MaterialIcons name="visibility" size={isMobile ? 16 : 18} color={COLORS.textWhite} />
                <ArText style={[styles.actionText, isMobile && styles.actionTextMobile]}>عرض</ArText>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionEdit]} onPress={onEdit}>
                <MaterialIcons name="edit" size={isMobile ? 16 : 18} color={COLORS.textWhite} />
                <ArText style={[styles.actionText, isMobile && styles.actionTextMobile]}>تعديل</ArText>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionDelete]} onPress={onDelete}>
                <MaterialIcons name="delete" size={isMobile ? 16 : 18} color={COLORS.textWhite} />
                <ArText style={[styles.actionText, isMobile && styles.actionTextMobile]}>حذف</ArText>
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
      if (Platform.OS === 'web') {
        window.location.href = `tel:${registration.phone}`;
      } else {
        Linking.openURL(`tel:${registration.phone}`);
      }
    }
  };

  const handleWhatsApp = () => {
    if (registration.phone) {
      const cleanPhone = registration.phone.replace(/[^0-9]/g, '');
      if (Platform.OS === 'web') {
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      } else {
        Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
      }
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <ArText weight="900" style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>
              تفاصيل التسجيل
            </ArText>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textWhite} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.modalSection}>
              {/* Call Actions */}
              {registration.phone && (
                <View style={[styles.modalCallActions, isMobile && styles.modalCallActionsMobile]}>
                  <Pressable
                    style={[styles.modalCallButton, { backgroundColor: COLORS.success }]}
                    onPress={handleCall}
                  >
                    <MaterialIcons name="phone" size={isMobile ? 18 : 20} color={COLORS.textWhite} />
                    <ArText weight="700" style={{ color: COLORS.textWhite, marginLeft: 4, fontSize: isMobile ? 12 : 14 }}>
                      اتصال
                    </ArText>
                  </Pressable>

                  <Pressable
                    style={[styles.modalCallButton, { backgroundColor: '#25D366' }]}
                    onPress={handleWhatsApp}
                  >
                    <MaterialIcons name="chat" size={isMobile ? 18 : 20} color={COLORS.textWhite} />
                    <ArText weight="700" style={{ color: COLORS.textWhite, marginLeft: 4, fontSize: isMobile ? 12 : 14 }}>
                      واتساب
                    </ArText>
                  </Pressable>
                </View>
              )}

              {/* Details */}
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>الاسم:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.name || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>الهاتف:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.phone || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>البريد الإلكتروني:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.email || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>الولاية:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.wilaya || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>مجال النشاط:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.business_field || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>رأس المال:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.capital || '—'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>زيارة كانتون فير:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.visited_canton ? 'نعم' : 'لا'}
                </ArText>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>الحالة:</ArText>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[registration.status]?.color || COLORS.info }]}>
                  <ArText style={[styles.statusText, isMobile && styles.statusTextMobile]} weight="700">
                    {STATUS_CONFIG[registration.status]?.label || 'جديد'}
                  </ArText>
                </View>
              </View>
              
              <View style={styles.modalRow}>
                <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>تاريخ التسجيل:</ArText>
                <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile]}>
                  {registration.created_at 
                    ? new Date(registration.created_at).toLocaleString('ar-DZ')
                    : '—'}
                </ArText>
              </View>
              
              {registration.notes && (
                <View style={[styles.modalRow, { alignItems: 'flex-start' }]}>
                  <ArText style={[styles.modalLabel, isMobile && styles.modalLabelMobile]}>ملاحظات:</ArText>
                  <ArText weight="700" style={[styles.modalValue, isMobile && styles.modalValueMobile, { flex: 1 }]}>
                    {registration.notes}
                  </ArText>
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
    name: '',
    phone: '',
    email: '',
    wilaya: '',
    business_field: '',
    capital: '',
    visited_canton: false,
    status: 'new',
    notes: '',
    company_name: '',
    interest_level: 0,
    source: 'app_signup',
  });
  
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (registration) {
      setInitializing(true);
      setFormData({
        name: registration.name || '',
        phone: registration.phone || '',
        email: registration.email || '',
        wilaya: registration.wilaya || '',
        business_field: registration.business_field || '',
        capital: registration.capital || '',
        visited_canton: registration.visited_canton ?? false,
        status: registration.status || 'new',
        notes: registration.notes || '',
        company_name: registration.company_name || '',
        interest_level: registration.interest_level ?? 0,
        source: registration.source || 'app_signup',
      });
      setInitializing(false);
    }
  }, [registration]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!visible) return null;

  if (initializing) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile, styles.centerContent]}>
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
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile, { maxWidth: 700 }]}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <ArText weight="900" style={[styles.modalTitle, isMobile && styles.modalTitleMobile]}>
              تعديل بيانات التسجيل
            </ArText>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons name="close" size={isMobile ? 20 : 24} color={COLORS.textWhite} />
            </Pressable>
          </View>

          {/* Tabs - Horizontal Scroll on Mobile */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.editTabsScroll}
          >
            <View style={styles.editTabs}>
              <Pressable 
                style={[styles.editTab, activeTab === 'basic' && styles.editTabActive]}
                onPress={() => setActiveTab('basic')}
              >
                <MaterialIcons name="person" size={isMobile ? 16 : 18} color={activeTab === 'basic' ? COLORS.primary : COLORS.textGray} />
                <ArText style={[styles.editTabText, isMobile && styles.editTabTextMobile, activeTab === 'basic' && { color: COLORS.primary }]}>
                  أساسي
                </ArText>
              </Pressable>
              <Pressable 
                style={[styles.editTab, activeTab === 'advanced' && styles.editTabActive]}
                onPress={() => setActiveTab('advanced')}
              >
                <MaterialIcons name="settings" size={isMobile ? 16 : 18} color={activeTab === 'advanced' ? COLORS.primary : COLORS.textGray} />
                <ArText style={[styles.editTabText, isMobile && styles.editTabTextMobile, activeTab === 'advanced' && { color: COLORS.primary }]}>
                  متقدم
                </ArText>
              </Pressable>
            </View>
          </ScrollView>

          <ScrollView style={styles.modalBody}>
            {activeTab === 'basic' ? (
              // Basic Information Tab
              <View style={styles.modalSection}>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>
                      الاسم الكامل <Text style={{ color: COLORS.error }}>*</Text>
                    </ArText>
                    <ArInput
                      value={formData.name}
                      onChangeText={(text) => updateField('name', text)}
                      placeholder="أدخل الاسم الكامل"
                      icon="person"
                    />
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>
                      رقم الهاتف <Text style={{ color: COLORS.error }}>*</Text>
                    </ArText>
                    <ArInput
                      value={formData.phone}
                      onChangeText={(text) => updateField('phone', text)}
                      placeholder="05XX XXX XXX"
                      keyboardType="phone-pad"
                      icon="phone"
                    />
                  </View>

                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>البريد الإلكتروني</ArText>
                    <ArInput
                      value={formData.email}
                      onChangeText={(text) => updateField('email', text)}
                      placeholder="example@domain.com"
                      keyboardType="email-address"
                      icon="email"
                    />
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>
                      الولاية <Text style={{ color: COLORS.error }}>*</Text>
                    </ArText>
                    <ArInput
                      value={formData.wilaya}
                      onChangeText={(text) => updateField('wilaya', text)}
                      placeholder="الجزائر العاصمة"
                      icon="location-on"
                    />
                  </View>

                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>
                      مجال النشاط <Text style={{ color: COLORS.error }}>*</Text>
                    </ArText>
                    <ArInput
                      value={formData.business_field}
                      onChangeText={(text) => updateField('business_field', text)}
                      placeholder="التجارة, الخدمات, ..."
                      icon="business"
                    />
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>
                      رأس المال <Text style={{ color: COLORS.error }}>*</Text>
                    </ArText>
                    <ArInput
                      value={formData.capital}
                      onChangeText={(text) => updateField('capital', text)}
                      placeholder="أقل من 10 مليون"
                      icon="attach-money"
                    />
                  </View>

                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الشركة (اختياري)</ArText>
                    <ArInput
                      value={formData.company_name}
                      onChangeText={(text) => updateField('company_name', text)}
                      placeholder="اسم الشركة"
                      icon="apartment"
                    />
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>زيارة كانتون فير</ArText>
                    <View style={styles.toggleSwitch}>
                      <Pressable
                        style={[styles.toggleOption, !formData.visited_canton && styles.toggleOptionActive]}
                        onPress={() => updateField('visited_canton', false)}
                      >
                        <ArText style={{ color: !formData.visited_canton ? COLORS.primary : COLORS.textGray, fontSize: isMobile ? 12 : 14 }}>
                          لا
                        </ArText>
                      </Pressable>
                      <Pressable
                        style={[styles.toggleOption, formData.visited_canton && styles.toggleOptionActive]}
                        onPress={() => updateField('visited_canton', true)}
                      >
                        <ArText style={{ color: formData.visited_canton ? COLORS.primary : COLORS.textGray, fontSize: isMobile ? 12 : 14 }}>
                          نعم
                        </ArText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // Advanced Settings Tab
              <View style={styles.modalSection}>
                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>الحالة</ArText>
                    <View style={styles.statusSelector}>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.statusOption,
                            formData.status === key && styles.statusOptionActive,
                            { borderColor: config.color }
                          ]}
                          onPress={() => updateField('status', key)}
                        >
                          <ArText
                            style={[
                              styles.statusOptionText,
                              formData.status === key && { color: config.color },
                              isMobile && { fontSize: 10 }
                            ]}
                          >
                            {config.label}
                          </ArText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>مصدر التسجيل</ArText>
                    <ArInput
                      value={formData.source}
                      onChangeText={(text) => updateField('source', text)}
                      placeholder="app_signup"
                      icon="source"
                    />
                  </View>

                  <View style={[styles.formField, isMobile && styles.formFieldMobile]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>مستوى الاهتمام (0-10)</ArText>
                    <View style={styles.interestSlider}>
                      <ArInput
                        value={String(formData.interest_level || 0)}
                        onChangeText={(text) => {
                          const value = parseInt(text) || 0;
                          updateField('interest_level', Math.min(10, Math.max(0, value)));
                        }}
                        keyboardType="numeric"
                        icon="trending-up"
                        style={{ textAlign: 'center' }}
                      />
                      <View style={styles.sliderLabels}>
                        {[0, 2, 4, 6, 8, 10].map(num => (
                          <Pressable key={num} onPress={() => updateField('interest_level', num)}>
                            <ArText style={{ 
                              color: num <= formData.interest_level ? COLORS.primary : COLORS.textGray, 
                              fontSize: isMobile ? 8 : 10 
                            }}>
                              {num}
                            </ArText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
                  <View style={[styles.formField, isMobile && styles.formFieldMobile, { width: '100%' }]}>
                    <ArText style={[styles.inputLabel, isMobile && styles.inputLabelMobile]}>ملاحظات</ArText>
                    <View style={[styles.inputWrapper, { alignItems: 'flex-start', height: 'auto', minHeight: isMobile ? 80 : 100 }]}>
                      <MaterialIcons name="note" size={isMobile ? 18 : 20} color={COLORS.primary} style={[styles.inputIcon, { marginTop: 12 }]} />
                      <TextInput
                        style={[styles.input, { height: 'auto', minHeight: isMobile ? 60 : 80, textAlignVertical: 'top' }]}
                        value={formData.notes}
                        onChangeText={(text) => updateField('notes', text)}
                        multiline
                        numberOfLines={isMobile ? 3 : 4}
                        placeholder="أضف ملاحظات هنا..."
                        placeholderTextColor={COLORS.textGray}
                        textAlign="right"
                      />
                    </View>
                  </View>
                </View>

                {/* Metadata Display */}
                <View style={styles.metadataSection}>
                  <ArText style={[styles.metadataTitle, isMobile && styles.metadataTitleMobile]}>معلومات النظام</ArText>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>تاريخ الإنشاء:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>
                      {registration?.created_at ? new Date(registration.created_at).toLocaleString('ar-DZ') : '—'}
                    </ArText>
                  </View>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>آخر تحديث:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>
                      {registration?.updated_at ? new Date(registration.updated_at).toLocaleString('ar-DZ') : '—'}
                    </ArText>
                  </View>
                  <View style={styles.metadataRow}>
                    <ArText style={[styles.metadataLabel, isMobile && styles.metadataLabelMobile]}>المعرف:</ArText>
                    <ArText style={[styles.metadataValue, isMobile && styles.metadataValueMobile]}>{registration?.id || '—'}</ArText>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalActions, isMobile && styles.modalActionsMobile]}>
            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <ArText style={{ fontSize: isMobile ? 12 : 14 }}>إلغاء</ArText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.bgDark} />
              ) : (
                <>
                  <MaterialIcons name="save" size={isMobile ? 18 : 20} color={COLORS.bgDark} />
                  <ArText weight="700" style={{ color: COLORS.bgDark, marginLeft: 4, fontSize: isMobile ? 12 : 14 }}>
                    حفظ
                  </ArText>
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
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(13, 27, 34, 0.95)',
  },
  headerMobile: {
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: COLORS.textWhite,
  },
  headerTitleMobile: {
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  headerSubtitleMobile: {
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statsGridMobile: {
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  statCardMobile: {
    minWidth: '100%',
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 28,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  filters: {
    marginBottom: 24,
    gap: 16,
  },
  searchInput: {
    height: 50,
  },
  filterTabsScroll: {
    flexGrow: 0,
  },
  filterTabsContent: {
    paddingRight: 20,
  },
  filterTabs: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  filterTabText: {
    fontSize: 13,
    color: COLORS.textGray,
  },
  bulkActions: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    gap: 12,
  },
  bulkActionsMobile: {
    padding: 12,
  },
  bulkButtonsScroll: {
    flexGrow: 0,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    flex: 1,
  },
  list: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: COLORS.textGray,
    marginTop: 16,
    fontSize: 16,
  },
  emptyStateTextMobile: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyStateSubText: {
    color: COLORS.textGray,
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  emptyStateSubTextMobile: {
    fontSize: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardMobile: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.bgDark,
  },
  statusTextMobile: {
    fontSize: 10,
  },
  cardName: {
    fontSize: 16,
  },
  cardNameMobile: {
    fontSize: 14,
  },
  cardPhone: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 2,
  },
  cardPhoneMobile: {
    fontSize: 10,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  nextStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionsMobile: {
    gap: 8,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailsGridMobile: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '45%',
  },
  detailText: {
    color: COLORS.textGray,
    fontSize: 13,
  },
  detailTextMobile: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cardActionsMobile: {
    gap: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionView: {
    backgroundColor: COLORS.info + '20',
  },
  actionEdit: {
    backgroundColor: COLORS.warning + '20',
  },
  actionDelete: {
    backgroundColor: COLORS.error + '20',
  },
  actionText: {
    fontSize: 12,
    color: COLORS.textWhite,
  },
  actionTextMobile: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: COLORS.bgDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  modalContentMobile: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalTitleMobile: {
    fontSize: 16,
  },
  modalClose: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    gap: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalLabel: {
    color: COLORS.textGray,
    fontSize: 14,
    minWidth: 100,
  },
  modalLabelMobile: {
    fontSize: 12,
    minWidth: 80,
  },
  modalValue: {
    color: COLORS.textWhite,
    fontSize: 14,
    flex: 1,
  },
  modalValueMobile: {
    fontSize: 12,
  },
  modalCallActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalCallActionsMobile: {
    gap: 8,
  },
  modalCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  editTabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  editTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  editTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  editTabActive: {
    borderBottomColor: COLORS.primary,
  },
  editTabText: {
    fontSize: 14,
    color: COLORS.textGray,
  },
  editTabTextMobile: {
    fontSize: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  formField: {
    flex: 1,
  },
  formFieldMobile: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textGray,
    marginBottom: 6,
  },
  inputLabelMobile: {
    fontSize: 11,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  inputIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textWhite,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  toggleSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    height: 50,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statusOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  statusOptionText: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  interestSlider: {
    gap: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  metadataSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metadataTitle: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 12,
  },
  metadataTitleMobile: {
    fontSize: 12,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  metadataLabel: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  metadataLabelMobile: {
    fontSize: 10,
  },
  metadataValue: {
    fontSize: 12,
    color: COLORS.textWhite,
  },
  metadataValueMobile: {
    fontSize: 10,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalActionsMobile: {
    padding: 12,
    gap: 8,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  // Add these to existing styles object
  checkboxContainer: {
    padding: 8,
    marginLeft: -8, // Pull it slightly left
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
// ==================== FLOATING BAR STYLES ====================
  
floatingContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  alignItems: 'center', // Centers the bar horizontally
  zIndex: 9999,
  paddingBottom: 30, // Lift it up slightly
  pointerEvents: 'box-none',
},

floatingBar: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#0F172A', // Very dark blue/slate
  borderRadius: 100, // Pill shape
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.15)',
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.5,
  shadowRadius: 25,
  elevation: 20,
  overflow: 'hidden', // Ensures inner content respects border radius
},

// Mobile: Compact, scrollable
floatingBarMobile: {
  width: '92%',
  paddingVertical: 10,
  paddingHorizontal: 12,
},

// Desktop: Big, wide, grid layout
floatingBarDesktop: {
  width: 'auto',
  minWidth: 600,
  maxWidth: 1000, // Much wider
  paddingVertical: 16,
  paddingHorizontal: 32,
  borderRadius: 24, // Slightly less rounded for a "panel" look
},

floatingBarLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 1,
},

closeBtn: {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 50,
  padding: 8,
},

selectedCountText: {
  color: COLORS.textWhite,
  fontSize: 16,
},

selectedSubText: {
  color: COLORS.textGray,
  fontSize: 12,
  marginTop: 2,
},

verticalDivider: {
  width: 1,
  height: '60%',
  backgroundColor: 'rgba(255,255,255,0.1)',
  marginHorizontal: 2,
},

// Container for Mobile ScrollView content
floatingActionsContent: {
  paddingRight: 4,
},

// Container for Desktop Row
desktopActionsRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  flex: 1,
},

floatingActions: {
  flexDirection: 'row',
  gap: 10,
  alignItems: 'center',
},

// BUTTON STYLES
fabActionDelete: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: COLORS.error,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 50,
},

fabActionDeleteDesktop: {
  paddingVertical: 12,
  paddingHorizontal: 24,
  marginRight: 12, // Separate delete from status
},

fabActionText: {
  color: COLORS.textWhite,
  fontSize: 13,
},

fabActionStatus: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 50,
  borderWidth: 1,
  backgroundColor: 'rgba(255,255,255,0.05)',
},

fabActionStatusDesktop: {
  paddingVertical: 12,
  paddingHorizontal: 20,
  minWidth: 120, // Ensure buttons have good width
  justifyContent: 'center',
},
});