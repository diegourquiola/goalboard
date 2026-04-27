import datetime
import httpx
import logging
from services.supabase_client import get_supabase
from services.football_api import _get

logger = logging.getLogger(__name__)

# In-memory state tracking per fixture
_processed_events: dict[int, set] = {}
_status_sent: dict[int, set] = {}
_lineups_sent: set[int] = set()   # covers both pre-match and during-match
_reminder_sent: set[int] = set()
_cancelled_sent: set[int] = set()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


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

        # Extra time start (ET = extra time playing, BT = break between ET halves)
        if status in ("ET", "BT") and "ET" not in status_sent:
            _send_notifications(
                tokens,
                f"⏱️ Extra Time | {home['name']} vs {away['name']}",
                f"Score after 90 min: {home['name']} {home_score} - {away_score} {away['name']}",
            )
            status_sent.add("ET")

        # Penalty shootout start
        if status == "P" and "P" not in status_sent:
            _send_notifications(
                tokens,
                f"🥅 Penalty Shootout! {home['name']} vs {away['name']}",
                f"It goes to penalties! {home['name']} {home_score} - {away_score} {away['name']}",
            )
            status_sent.add("P")

        # Lineups available (sent once per fixture when match goes live)
        if status in ("1H", "2H", "ET", "BT", "HT") and fixture_id not in _lineups_sent:
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


def poll_upcoming_events() -> None:
    """Handle pre-match 30-min reminders and postponed/cancelled notifications.

    PST/CANC statuses never appear in the live feed, so today's full fixture
    list is queried separately. The 25-35 min reminder window accounts for the
    60-second polling interval so every kickoff is caught exactly once.
    """
    try:
        fixtures = _get_todays_fixtures()
    except Exception:
        return

    now = datetime.datetime.now(datetime.timezone.utc)

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

        if status == "NS":
            try:
                kickoff = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                minutes_until = (kickoff - now).total_seconds() / 60

                # Pre-match lineups — check once per minute once within 2h of kickoff
                if fixture_id not in _lineups_sent and minutes_until <= 120:
                    lineups = _get_fixture_lineups(fixture_id)
                    if lineups:
                        _send_notifications(
                            tokens,
                            f"📋 Lineups | {home['name']} vs {away['name']}",
                            "Starting lineups have been confirmed.",
                        )
                        _lineups_sent.add(fixture_id)

                # Pre-match reminder — send once when kickoff is 25-35 min away
                if fixture_id not in _reminder_sent and 25 <= minutes_until <= 35:
                    _send_notifications(
                        tokens,
                        f"⏰ Match Starts in 30 min",
                        f"{home['name']} vs {away['name']} — kick off soon!",
                    )
                    _reminder_sent.add(fixture_id)
            except Exception:
                pass

        # Postponed
        if status == "PST" and fixture_id not in _cancelled_sent:
            _send_notifications(
                tokens,
                f"📅 Match Postponed",
                f"{home['name']} vs {away['name']} has been postponed.",
            )
            _cancelled_sent.add(fixture_id)

        # Cancelled
        if status == "CANC" and fixture_id not in _cancelled_sent:
            _send_notifications(
                tokens,
                f"❌ Match Cancelled",
                f"{home['name']} vs {away['name']} has been cancelled.",
            )
            _cancelled_sent.add(fixture_id)
