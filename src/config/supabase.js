import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// PASTE YOUR KEYS DIRECTLY HERE
const supabaseUrl = "https://iyqiqghadxfzfkrbxewr.supabase.co";
const supabaseKey = "sb_publishable_llKxCoXSdY0bEv111vvF8A_4tg0rUVV";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});