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

  function isFavorited(type, externalId) {
    return favorites.some(f => f.type === type && f.external_id === externalId);
  }

  async function addFavorite({ type, externalId, name, logo }) {
    if (!user) return false;
    const { error } = await supabase.from('user_favorites').insert({
      user_id: user.id,
      type,
      external_id: externalId,
      name,
      logo: logo ?? null,
    });
    if (!error) await fetchFavorites();
    return !error;
  }

  async function removeFavorite(type, externalId) {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('type', type)
      .eq('external_id', externalId);
    if (!error) await fetchFavorites();
  }

  async function toggleFavorite(item) {
    if (isFavorited(item.type, item.externalId)) {
      await removeFavorite(item.type, item.externalId);
    } else {
      await addFavorite(item);
    }
  }

  return { favorites, loading, isFavorited, addFavorite, removeFavorite, toggleFavorite, refresh: fetchFavorites };
}
