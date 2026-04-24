import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .order('created_at', { ascending: false });
    setFavorites(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const isFavorited = useCallback((type, externalId) => {
    return favorites.some(f => f.type === type && String(f.external_id) === String(externalId));
  }, [favorites]);

  const addFavorite = useCallback(async ({ type, externalId, name, logo }) => {
    if (!user) return false;
    const { error } = await supabase.from('user_favorites').insert({
      user_id: user.id,
      type,
      external_id: String(externalId),
      name,
      logo: logo ?? null,
    });
    if (!error) await fetchFavorites();
    return !error;
  }, [user, fetchFavorites]);

  const removeFavorite = useCallback(async (type, externalId) => {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('type', type)
      .eq('external_id', String(externalId));
    if (!error) await fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (item) => {
    if (isFavorited(item.type, item.externalId)) {
      await removeFavorite(item.type, item.externalId);
    } else {
      await addFavorite(item);
    }
  }, [isFavorited, addFavorite, removeFavorite]);

  return { favorites, loading, isFavorited, addFavorite, removeFavorite, toggleFavorite, refresh: fetchFavorites };
}
