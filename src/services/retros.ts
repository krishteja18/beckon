import { supabase } from './supabase';
import { Database } from './database.types';

type Retro = Database['public']['Tables']['retros']['Row'];

export type RetroType = 'daily' | 'weekly' | 'monthly';

export async function fetchRetros(type?: RetroType): Promise<Retro[]> {
  let q = supabase
    .from('retros')
    .select('*')
    .order('period_end_date', { ascending: false })
    .limit(30);
  if (type) q = q.eq('retro_type', type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
