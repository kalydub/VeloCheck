
import { supabase } from './supabaseClient';
import { BikeProfile } from '../types';

export const supabaseService = {
  async saveBikes(userId: string, bikes: BikeProfile[]) {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: userId, 
        bikes: bikes,
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' });
    
    if (error) throw error;
    return data;
  },

  async loadBikes(userId: string): Promise<BikeProfile[] | null> {
    const { data, error } = await supabase
      .from('user_data')
      .select('bikes')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data?.bikes || null;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};
