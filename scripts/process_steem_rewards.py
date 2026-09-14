import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SCANNER = ROOT / "data/rewards/scanner.json"
LEADERBOARD = ROOT / "data/leaderboard.json"
RPC = "https://api.steemit.com"
REWARD_ID = "steemflags_reward_v1"
BATCH_SIZE = 100
MAX_BLOCKS_PER_RUN = 5000
INITIAL_LOOKBACK = 1000


def rpc(method, params=None):
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or []}).encode()
    req = Request(RPC, data=payload, headers={"Content-Type": "application/json", "User-Agent": "SteemFlags-GitHubAction/1.2"})
    with urlopen(req, timeout=30) as response:
        body = json.loads(response.read().decode())
    if body.get("error"):
        raise RuntimeError(body["error"])
    return body.get("result")


def batch_get_ops(start_block, end_block):
    calls = [
        {"jsonrpc": "2.0", "id": block, "method": "condenser_api.get_ops_in_block", "params": [block, False]}
        for block in range(start_block, end_block + 1)
    ]
    payload = json.dumps(calls).encode()
    req = Request(RPC, data=payload, headers={"Content-Type": "application/json", "User-Agent": "SteemFlags-GitHubAction/1.2"})
    with urlopen(RPC, data=payload, timeout=120) as response:
        body = json.loads(response.read().decode())

    # Some Steem RPC responses do not support JSON-RPC batch requests and
    # return a single object instead of a list. Fall back to individual calls.
    if isinstance(body, dict):
        if body.get("error"):
            raise RuntimeError(body["error"])
        return {
            block: rpc("condenser_api.get_ops_in_block", [block, False]) or []
            for block in range(start_block, end_block + 1)
        }

    if not isinstance(body, list):
        raise RuntimeError("Unexpected Steem RPC batch response")

    results = {
        int(item["id"]): item.get("result", [])
        for item in body
        if isinstance(item, dict) and "id" in item and not item.get("error")
    }
    if len(results) != end_block - start_block + 1:
        raise RuntimeError("Incomplete Steem block batch")
    return results


def main():
    scanner = json.loads(SCANNER.read_text(encoding="utf-8"))
    lb = json.loads(LEADERBOARD.read_text(encoding="utf-8"))
    head = int(rpc("condenser_api.get_dynamic_global_properties")["head_block_number"])
    last_block = int(scanner.get("last_block", 0))

    if last_block <= 0:
        last_block = max(1, head - INITIAL_LOOKBACK)

    if last_block >= head:
        scanner["last_block"] = last_block
        scanner["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        SCANNER.write_text(json.dumps(scanner, indent=2) + "\n", encoding="utf-8")
        return

    target_end = min(head, last_block + MAX_BLOCKS_PER_RUN)
    processed = set(str(x) for x in lb.get("processed_events", []))
    players = lb.setdefault("players", {})
    added = 0
    end_block = last_block

    while end_block < target_end:
        batch_end = min(target_end, end_block + BATCH_SIZE)
        blocks = batch_get_ops(end_block + 1, batch_end)
        for block_num in range(end_block + 1, batch_end + 1):
            for item in blocks[block_num]:
                op = item.get("op")
                if not isinstance(op, list) or len(op) != 2 or op[0] != "custom_json":
                    continue
                data = op[1]
                if data.get("id") != REWARD_ID:
                    continue
                auths = data.get("required_posting_auths") or []
                if len(auths) != 1:
                    continue
                username = str(auths[0]).strip().lower()
                try:
                    payload = json.loads(data.get("json", "{}"))
                except (TypeError, ValueError):
                    continue
                if payload.get("type") != "reward" or payload.get("app") != "steem-flags":
                    continue
                if str(payload.get("username", "")).strip().lower() != username:
                    continue
                event_id = str(payload.get("event_id", "")).strip()
                try:
                    sf = int(payload.get("sf"))
                except (TypeError, ValueError):
                    continue
                if not event_id or event_id in processed or not 1 <= sf <= 20:
                    continue
                player = players.setdefault(username, {"sf": 0})
                player["sf"] = max(0, int(player.get("sf", 0)) + sf)
                processed.add(event_id)
                added += 1
        end_block = batch_end

    scanner["last_block"] = end_block
    scanner["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if added:
        lb["processed_events"] = list(processed)[-5000:]
        lb["updated_at"] = scanner["updated_at"]
        lb["version"] = 2
        LEADERBOARD.write_text(json.dumps(lb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    SCANNER.write_text(json.dumps(scanner, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Scanned through block {end_block}; added {added} reward event(s).")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Reward scanner failed: {exc}", file=sys.stderr)
        raise
