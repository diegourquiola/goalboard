import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export function useMatchSubscription(fixture) {
  const { user } = useAuth();
  const fixtureId = fixture?.id ?? fixture?.fixture_id;
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !fixtureId) { setSubscribed(false); return; }
    supabase
      .from('match_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('fixture_id', fixtureId)
      .maybeSingle()
      .then(({ data }) => setSubscribed(!!data));
  }, [user, fixtureId]);

  const toggle = useCallback(async () => {
    if (!user || !fixtureId) return false;
    setLoading(true);
    if (subscribed) {
      await supabase
        .from('match_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('fixture_id', fixtureId);
      setSubscribed(false);
    } else {
      await supabase.from('match_subscriptions').insert({
        user_id: user.id,
        fixture_id: fixtureId,
        home_team_id: fixture?.teams?.home?.id ?? null,
        away_team_id: fixture?.teams?.away?.id ?? null,
        home_name: fixture?.teams?.home?.name ?? null,
        away_name: fixture?.teams?.away?.name ?? null,
      });
      setSubscribed(true);
    }
    setLoading(false);
    return true;
  }, [user, fixtureId, subscribed, fixture]);

  return { subscribed, toggle, loading };
}
