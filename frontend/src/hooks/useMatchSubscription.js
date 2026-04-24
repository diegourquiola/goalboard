import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from './useFavorites';

export function useMatchSubscription(fixture) {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const fixtureId = fixture?.id ?? fixture?.fixture_id;
  const homeTeamId = fixture?.teams?.home?.id;
  const awayTeamId = fixture?.teams?.away?.id;

  const [explicitSubscribed, setExplicitSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const isTeamFavorited = user && favorites.some(f =>
    f.type === 'team' && (
      String(f.external_id) === String(homeTeamId) ||
      String(f.external_id) === String(awayTeamId)
    )
  );

  const subscribed = explicitSubscribed || !!isTeamFavorited;

  useEffect(() => {
    if (!user || !fixtureId) { setExplicitSubscribed(false); return; }
    supabase
      .from('match_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('fixture_id', fixtureId)
      .maybeSingle()
      .then(({ data }) => setExplicitSubscribed(!!data));
  }, [user, fixtureId]);

  const toggle = useCallback(async () => {
    if (!user || !fixtureId) return false;
    setLoading(true);
    if (explicitSubscribed) {
      await supabase
        .from('match_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('fixture_id', fixtureId);
      setExplicitSubscribed(false);
    } else {
      await supabase.from('match_subscriptions').insert({
        user_id: user.id,
        fixture_id: fixtureId,
        home_team_id: fixture?.teams?.home?.id ?? null,
        away_team_id: fixture?.teams?.away?.id ?? null,
        home_name: fixture?.teams?.home?.name ?? null,
        away_name: fixture?.teams?.away?.name ?? null,
      });
      setExplicitSubscribed(true);
    }
    setLoading(false);
    return true;
  }, [user, fixtureId, explicitSubscribed, fixture]);

  return { subscribed, toggle, loading };
}
