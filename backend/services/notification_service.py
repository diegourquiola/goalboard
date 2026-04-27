import datetime
import httpx
import logging
from services.supabase_client import get_supabase
from services.football_api import _get

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _get_sent_keys(fixture_ids: list[int]) -> set[str]:
    if not fixture_ids:
        return set()
    try:
        supabase = get_supabase()
        rows = (
            supabase.table("notification_log")
            .select("fixture_id,event_key")
            .in_("fixture_id", fixture_ids)
            .execute()
            .data
        )
        return {f"{r['fixture_id']}:{r['event_key']}" for r in rows}
    except Exception as e:
        logger.error("[Dedup] failed to fetch sent keys: %s", e)
        return set()


def _mark_sent(fixture_id: int, event_key: str) -> None:
    try:
        supabase = get_supabase()
        supabase.table("notification_log").upsert(
            {"fixture_id": fixture_id, "event_key": event_key},
            on_conflict="fixture_id,event_key",
        ).execute()
    except Exception as e:
        logger.error("[Dedup] failed to mark sent %s:%s: %s", fixture_id, event_key, e)


def _already_sent(sent_keys: set[str], fixture_id: int, event_key: str) -> bool:
    return f"{fixture_id}:{event_key}" in sent_keys


def _get_live_fixtures() -> list[dict]:
    data = _get("/fixtures", {"live": "all"}, ttl=0)
    return data.get("response", [])


def _get_todays_fixtures() -> list[dict]:
    today = datetime.date.today().isoformat()
    data = _get("/fixtures", {"date": today}, ttl=0)
    return data.get("response", [])


def _get_fixture_lineups(fixture_id: int) -> list[dict]:
    data = _get("/fixtures/lineups", {"fixture": fixture_id}, ttl=60)
    return data.get("response", [])


def _get_fixture_events(fixture_id: int) -> list[dict]:
    data = _get("/fixtures/events", {"fixture": fixture_id}, ttl=0)
    return data.get("response", [])


def _get_tokens_for_fixture(fixture_id: int, home_id: int, away_id: int) -> list[str]:
    supabase = get_supabase()

    # Users who favorited either team
    fav_rows = (
        supabase.table("user_favorites")
        .select("user_id")
        .eq("type", "team")
        .in_("external_id", [str(home_id), str(away_id)])
        .execute()
        .data
    )
    # Users who manually subscribed to this match
    sub_rows = (
        supabase.table("match_subscriptions")
        .select("user_id")
        .eq("fixture_id", fixture_id)
        .execute()
        .data
    )

    user_ids = list({r["user_id"] for r in (fav_rows + sub_rows)})
    if not user_ids:
        return []

    tokens = (
        supabase.table("push_tokens")
        .select("token")
        .in_("user_id", user_ids)
        .execute()
        .data
    )
    return [t["token"] for t in tokens]


def _send_notifications(tokens: list[str], title: str, body: str) -> None:
    if not tokens:
        return
    messages = [{"to": t, "title": title, "body": body, "sound": "default"} for t in tokens]
    try:
        with httpx.Client() as client:
            resp = client.post(EXPO_PUSH_URL, json=messages, timeout=10)
        result = resp.json()
        logger.info("[Push] sent '%s' to %d token(s) → %s", title, len(tokens), result)
    except Exception as e:
        logger.error("[Push] failed to send '%s': %s", title, e)


def poll_live_events() -> None:
    try:
        fixtures = _get_live_fixtures()
    except Exception as e:
        logger.error("[Poll] failed to fetch live fixtures: %s", e)
        return

    logger.info("[Poll] %d live fixture(s)", len(fixtures))
    if not fixtures:
        return

    fixture_ids = [f["fixture"]["id"] for f in fixtures]
    sent_keys   = _get_sent_keys(fixture_ids)

    for fixture in fixtures:
        fixture_id  = fixture["fixture"]["id"]
        home        = fixture["teams"]["home"]
        away        = fixture["teams"]["away"]
        status      = fixture["fixture"]["status"]["short"]
        elapsed     = fixture["fixture"]["status"]["elapsed"] or 0
        home_score  = fixture["goals"]["home"] or 0
        away_score  = fixture["goals"]["away"] or 0

        try:
            tokens = _get_tokens_for_fixture(fixture_id, home["id"], away["id"])
        except Exception as e:
            logger.error("[Poll] token lookup failed for fixture %d: %s", fixture_id, e)
            continue

        logger.info("[Poll] fixture %d (%s vs %s, %s): %d token(s)", fixture_id, home["name"], away["name"], status, len(tokens))
        if not tokens:
            continue

        def sent(key):
            return _already_sent(sent_keys, fixture_id, key)

        def mark(key):
            sent_keys.add(f"{fixture_id}:{key}")
            _mark_sent(fixture_id, key)

        # Kick-off
        if status == "1H" and elapsed <= 2 and not sent("KO"):
            _send_notifications(tokens, f"Kick Off! {home['name']} vs {away['name']}", "The match has started!")
            mark("KO")

        # Halftime
        if status == "HT" and not sent("HT"):
            _send_notifications(tokens, f"Half Time | {home['name']} vs {away['name']}", f"Score: {home['name']} {home_score} - {away_score} {away['name']}")
            mark("HT")

        # Full time
        if status in ("FT", "AET", "PEN") and not sent("FT"):
            _send_notifications(tokens, f"Full Time | {home['name']} vs {away['name']}", f"Final: {home['name']} {home_score} - {away_score} {away['name']}")
            mark("FT")

        # Extra time
        if status in ("ET", "BT") and not sent("ET"):
            _send_notifications(tokens, f"⏱️ Extra Time | {home['name']} vs {away['name']}", f"Score after 90 min: {home['name']} {home_score} - {away_score} {away['name']}")
            mark("ET")

        # Penalty shootout
        if status == "P" and not sent("P"):
            _send_notifications(tokens, f"🥅 Penalty Shootout! {home['name']} vs {away['name']}", f"It goes to penalties! {home['name']} {home_score} - {away_score} {away['name']}")
            mark("P")

        # Lineups
        if status in ("1H", "2H", "ET", "BT", "HT") and not sent("lineups"):
            try:
                if _get_fixture_lineups(fixture_id):
                    _send_notifications(tokens, f"📋 Lineups Available | {home['name']} vs {away['name']}", "Starting lineups have been confirmed.")
                    mark("lineups")
            except Exception:
                pass

        # Event-based notifications
        try:
            events = _get_fixture_events(fixture_id)
        except Exception:
            continue

        for event in events:
            elapsed_min = event.get("time", {}).get("elapsed", "?")
            event_type  = event.get("type", "")
            detail      = event.get("detail", "")
            team_name   = event.get("team", {}).get("name", "")
            player_name = event.get("player", {}).get("name", "Unknown")
            event_key   = f"evt-{elapsed_min}-{event_type}-{event.get('player', {}).get('id')}"

            if sent(event_key):
                continue

            if event_type == "Goal":
                _send_notifications(tokens, f"⚽ Goal! {team_name} ({elapsed_min}')", f"{player_name} scores! {home['name']} {home_score} - {away_score} {away['name']}")
                mark(event_key)
            elif event_type == "Card" and detail == "Red Card":
                _send_notifications(tokens, f"🟥 Red Card! {team_name} ({elapsed_min}')", f"{player_name} has been sent off.")
                mark(event_key)
            elif event_type == "Var" and "Penalty" in detail:
                _send_notifications(tokens, f"🥅 Penalty! {team_name} ({elapsed_min}')", f"Penalty awarded to {team_name}.")
                mark(event_key)


def poll_upcoming_events() -> None:
    """Handle pre-match 30-min reminders and postponed/cancelled notifications."""
    try:
        fixtures = _get_todays_fixtures()
    except Exception:
        return

    if not fixtures:
        return

    fixture_ids = [f["fixture"]["id"] for f in fixtures]
    sent_keys   = _get_sent_keys(fixture_ids)
    now         = datetime.datetime.now(datetime.timezone.utc)

    for fixture in fixtures:
        fixture_id = fixture["fixture"]["id"]
        home       = fixture["teams"]["home"]
        away       = fixture["teams"]["away"]
        status     = fixture["fixture"]["status"]["short"]
        date_str   = fixture["fixture"].get("date")

        if not date_str:
            continue

        tokens = _get_tokens_for_fixture(fixture_id, home["id"], away["id"])
        if not tokens:
            continue

        def sent(key):
            return _already_sent(sent_keys, fixture_id, key)

        def mark(key):
            sent_keys.add(f"{fixture_id}:{key}")
            _mark_sent(fixture_id, key)

        if status == "NS":
            try:
                kickoff = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                minutes_until = (kickoff - now).total_seconds() / 60

                if not sent("lineups") and minutes_until <= 120:
                    lineups = _get_fixture_lineups(fixture_id)
                    if lineups:
                        _send_notifications(tokens, f"📋 Lineups | {home['name']} vs {away['name']}", "Starting lineups have been confirmed.")
                        mark("lineups")

                if not sent("reminder") and 25 <= minutes_until <= 35:
                    _send_notifications(tokens, "⏰ Match Starts in 30 min", f"{home['name']} vs {away['name']} — kick off soon!")
                    mark("reminder")
            except Exception:
                pass

        if status == "PST" and not sent("cancelled"):
            _send_notifications(tokens, "📅 Match Postponed", f"{home['name']} vs {away['name']} has been postponed.")
            mark("cancelled")

        if status == "CANC" and not sent("cancelled"):
            _send_notifications(tokens, "❌ Match Cancelled", f"{home['name']} vs {away['name']} has been cancelled.")
            mark("cancelled")
