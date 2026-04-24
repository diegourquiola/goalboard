import httpx
from services.supabase_client import get_supabase
from services.football_api import _get

# In-memory state tracking per fixture
_processed_events: dict[int, set] = {}
_status_sent: dict[int, set] = {}
_lineups_sent: set[int] = set()

EXPO_PUSH_URL = "https://exp.host/--/push/v2/send"


def _get_live_fixtures() -> list[dict]:
    data = _get("/fixtures", {"live": "all"}, ttl=0)
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
            client.post(EXPO_PUSH_URL, json=messages, timeout=10)
    except Exception:
        pass


def poll_live_events() -> None:
    try:
        fixtures = _get_live_fixtures()
    except Exception:
        return

    for fixture in fixtures:
        fixture_id  = fixture["fixture"]["id"]
        home        = fixture["teams"]["home"]
        away        = fixture["teams"]["away"]
        status      = fixture["fixture"]["status"]["short"]
        elapsed     = fixture["fixture"]["status"]["elapsed"] or 0
        home_score  = fixture["goals"]["home"] or 0
        away_score  = fixture["goals"]["away"] or 0

        tokens = _get_tokens_for_fixture(fixture_id, home["id"], away["id"])
        if not tokens:
            continue

        status_sent = _status_sent.setdefault(fixture_id, set())

        # Kick-off
        if status == "1H" and elapsed <= 2 and "KO" not in status_sent:
            _send_notifications(
                tokens,
                f"Kick Off! {home['name']} vs {away['name']}",
                "The match has started!",
            )
            status_sent.add("KO")

        # Halftime
        if status == "HT" and "HT" not in status_sent:
            _send_notifications(
                tokens,
                f"Half Time | {home['name']} vs {away['name']}",
                f"Score: {home['name']} {home_score} - {away_score} {away['name']}",
            )
            status_sent.add("HT")

        # Full time
        if status in ("FT", "AET", "PEN") and "FT" not in status_sent:
            _send_notifications(
                tokens,
                f"Full Time | {home['name']} vs {away['name']}",
                f"Final: {home['name']} {home_score} - {away_score} {away['name']}",
            )
            status_sent.add("FT")

        # Lineups available (sent once per fixture when match goes live)
        if status in ("1H", "2H", "ET", "HT") and fixture_id not in _lineups_sent:
            try:
                lineups = _get_fixture_lineups(fixture_id)
                if lineups:
                    _send_notifications(
                        tokens,
                        f"📋 Lineups Available | {home['name']} vs {away['name']}",
                        "Starting lineups have been confirmed.",
                    )
                    _lineups_sent.add(fixture_id)
            except Exception:
                pass

        # Event-based notifications
        try:
            events = _get_fixture_events(fixture_id)
        except Exception:
            continue

        processed = _processed_events.setdefault(fixture_id, set())

        for event in events:
            elapsed_min = event.get("time", {}).get("elapsed", "?")
            event_type  = event.get("type", "")
            detail      = event.get("detail", "")
            team_name   = event.get("team", {}).get("name", "")
            player_name = event.get("player", {}).get("name", "Unknown")
            event_key   = f"{elapsed_min}-{event_type}-{event.get('player', {}).get('id')}"

            if event_key in processed:
                continue
            processed.add(event_key)

            if event_type == "Goal":
                _send_notifications(
                    tokens,
                    f"⚽ Goal! {team_name} ({elapsed_min}')",
                    f"{player_name} scores! {home['name']} {home_score} - {away_score} {away['name']}",
                )
            elif event_type == "Card" and detail == "Red Card":
                _send_notifications(
                    tokens,
                    f"🟥 Red Card! {team_name} ({elapsed_min}')",
                    f"{player_name} has been sent off.",
                )
            elif event_type == "Var" and "Penalty" in detail:
                _send_notifications(
                    tokens,
                    f"🥅 Penalty! {team_name} ({elapsed_min}')",
                    f"Penalty awarded to {team_name}.",
                )

        # Clean up memory for finished matches
        if status in ("FT", "AET", "PEN"):
            _processed_events.pop(fixture_id, None)
            _status_sent.pop(fixture_id, None)
            _lineups_sent.discard(fixture_id)
