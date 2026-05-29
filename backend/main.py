import json
import random
import string
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine import choose_ai_move, all_legal_moves, is_in_check, make_move, color_of, RED, BLACK, pikafish_status

app = FastAPI(title="Xiangqi Backend AI + Live Battle", version="1.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AiMoveRequest(BaseModel):
    board: List[List[Optional[str]]] = Field(..., description="10x9 Xiangqi board using rK/bK notation")
    side: Literal["red", "black"] = "black"
    difficulty: Literal["easy", "normal", "hard", "expert", "master"] = "normal"

class ValidateRequest(BaseModel):
    board: List[List[Optional[str]]]
    side: Literal["red", "black"]


def validate_board(board: Any):
    if not isinstance(board, list) or len(board) != 10:
        raise HTTPException(status_code=400, detail="board must have 10 rows")
    for row in board:
        if not isinstance(row, list) or len(row) != 9:
            raise HTTPException(status_code=400, detail="each board row must have 9 columns")


def initial_board() -> List[List[Optional[str]]]:
    empty = [[None for _ in range(9)] for _ in range(10)]
    empty[0] = ["bR", "bH", "bE", "bA", "bK", "bA", "bE", "bH", "bR"]
    empty[2][1] = "bC"; empty[2][7] = "bC"
    for c in [0, 2, 4, 6, 8]:
        empty[3][c] = "bP"
    empty[9] = ["rR", "rH", "rE", "rA", "rK", "rA", "rE", "rH", "rR"]
    empty[7][1] = "rC"; empty[7][7] = "rC"
    for c in [0, 2, 4, 6, 8]:
        empty[6][c] = "rP"
    return empty

piece_names = {
    "rK": "帥", "rA": "仕", "rE": "相", "rH": "傌", "rR": "俥", "rC": "炮", "rP": "兵",
    "bK": "將", "bA": "士", "bE": "象", "bH": "馬", "bR": "車", "bC": "砲", "bP": "卒",
}


def new_room(room_id: str) -> Dict[str, Any]:
    return {
        "roomId": room_id,
        "board": initial_board(),
        "turn": RED,
        "players": {RED: None, BLACK: None},
        "capturedByRed": [],
        "capturedByBlack": [],
        "moveHistory": [],
        "rawMoves": [],
        "gameOver": False,
        "winner": None,
        "resultReason": None,
        "chat": [],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

rooms: Dict[str, Dict[str, Any]] = {}
room_connections: Dict[str, List[WebSocket]] = {}
connection_meta: Dict[WebSocket, Dict[str, str]] = {}
waiting_quick_room: Optional[str] = None


def generate_room_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "XQ" + "".join(random.choice(alphabet) for _ in range(4))
        if code not in rooms:
            return code


def public_room_state(room: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": "state",
        "roomId": room["roomId"],
        "board": room["board"],
        "turn": room["turn"],
        "players": room["players"],
        "capturedByRed": room["capturedByRed"],
        "capturedByBlack": room["capturedByBlack"],
        "moveHistory": room["moveHistory"],
        "rawMoves": room.get("rawMoves", []),
        "gameOver": room["gameOver"],
        "winner": room["winner"],
        "resultReason": room.get("resultReason"),
        "inCheck": is_in_check(room["board"], room["turn"]),
    }

async def send_json(ws: WebSocket, data: Dict[str, Any]):
    await ws.send_text(json.dumps(data, ensure_ascii=False))

async def broadcast(room_id: str, data: Dict[str, Any]):
    dead = []
    for ws in room_connections.get(room_id, []):
        try:
            await send_json(ws, data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in room_connections.get(room_id, []):
            room_connections[room_id].remove(ws)
        connection_meta.pop(ws, None)


def assign_side(room: Dict[str, Any], name: str, requested: str) -> str:
    requested = requested.lower()
    if requested in [RED, BLACK] and room["players"].get(requested) in [None, name]:
        room["players"][requested] = name
        return requested
    if room["players"][RED] is None:
        room["players"][RED] = name
        return RED
    if room["players"][BLACK] is None:
        room["players"][BLACK] = name
        return BLACK
    return "spectator"


def move_to_text(board: List[List[Optional[str]]], move: Dict[str, Any], captured: Optional[str]) -> str:
    moving = board[move["from"]["r"]][move["from"]["c"]]
    side = "紅" if color_of(moving) == RED else "黑"
    name = piece_names.get(moving, moving or "?")
    cap = f" 吃 {piece_names.get(captured, captured)}" if captured else ""
    return f"{side} {name}: ({move['from']['r']},{move['from']['c']}) → ({move['to']['r']},{move['to']['c']}){cap}"


def is_same_move(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    return (
        a.get("from", {}).get("r") == b.get("from", {}).get("r") and
        a.get("from", {}).get("c") == b.get("from", {}).get("c") and
        a.get("to", {}).get("r") == b.get("to", {}).get("r") and
        a.get("to", {}).get("c") == b.get("to", {}).get("c")
    )

@app.get("/")
def root():
    return {"ok": True, "message": "Xiangqi backend AI + live battle is running."}

@app.get("/api/create-room")
def create_room():
    code = generate_room_code()
    rooms[code] = new_room(code)
    return {"roomId": code}




@app.get("/api/quick-match")
def quick_match():
    global waiting_quick_room
    # If a valid waiting room exists with fewer than two active players, pair into it.
    if waiting_quick_room and waiting_quick_room in rooms:
        room = rooms[waiting_quick_room]
        occupied = sum(1 for v in room["players"].values() if v is not None)
        if occupied < 2 and not room.get("gameOver"):
            code = waiting_quick_room
            waiting_quick_room = None
            return {"roomId": code, "matched": True, "message": "Opponent found."}
    code = generate_room_code()
    rooms[code] = new_room(code)
    waiting_quick_room = code
    return {"roomId": code, "matched": False, "message": "Waiting for opponent. Share nothing; next Quick Match player will join."}

@app.get("/api/engine-status")
def engine_status():
    return {"pikafish": pikafish_status()}

@app.post("/api/ai-move")
def ai_move(req: AiMoveRequest):
    validate_board(req.board)
    move, score, reason = choose_ai_move(req.board, req.side, req.difficulty)
    if not move:
        return {"move": None, "score": score, "reason": reason}
    return {
        "move": move,
        "score": score,
        "reason": reason,
        "side": req.side,
        "difficulty": req.difficulty,
        "check": is_in_check(req.board, req.side),
    }

@app.post("/api/legal-moves")
def legal_moves(req: ValidateRequest):
    validate_board(req.board)
    return {
        "moves": all_legal_moves(req.board, req.side),
        "inCheck": is_in_check(req.board, req.side),
    }

@app.websocket("/ws/{room_id}")
async def websocket_room(websocket: WebSocket, room_id: str):
    await websocket.accept()
    room_id = room_id.upper().strip()
    name = websocket.query_params.get("name") or "Guest"
    requested_side = websocket.query_params.get("side") or "auto"

    if room_id not in rooms:
        rooms[room_id] = new_room(room_id)

    room = rooms[room_id]
    side = assign_side(room, name, requested_side)
    room_connections.setdefault(room_id, []).append(websocket)
    connection_meta[websocket] = {"roomId": room_id, "name": name, "side": side}

    await send_json(websocket, {"type": "joined", "roomId": room_id, "side": side, "name": name})
    await send_json(websocket, public_room_state(room))
    await broadcast(room_id, {"type": "system", "message": f"{name} joined as {side}.", "players": room["players"]})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_json(websocket, {"type": "error", "message": "Invalid JSON message."})
                continue

            meta = connection_meta.get(websocket, {})
            user_side = meta.get("side", "spectator")
            user_name = meta.get("name", "Guest")

            if msg.get("type") == "chat":
                text = str(msg.get("message", "")).strip()[:300]
                if text:
                    chat_msg = {
                        "type": "chat",
                        "name": user_name,
                        "side": user_side,
                        "message": text,
                        "time": datetime.now(timezone.utc).isoformat(),
                    }
                    room["chat"].append(chat_msg)
                    room["chat"] = room["chat"][-80:]
                    await broadcast(room_id, chat_msg)
                continue

            if msg.get("type") == "reset":
                # First version: either red or black can reset the room.
                old_players = room["players"].copy()
                rooms[room_id] = new_room(room_id)
                rooms[room_id]["players"] = old_players
                room = rooms[room_id]
                await broadcast(room_id, {"type": "system", "message": f"{user_name} reset the room."})
                await broadcast(room_id, public_room_state(room))
                continue

            if msg.get("type") == "resign":
                if user_side not in [RED, BLACK]:
                    await send_json(websocket, {"type": "error", "message": "Spectators cannot surrender."})
                    continue
                if room["gameOver"]:
                    await send_json(websocket, {"type": "error", "message": "Game is already over."})
                    continue
                winner = BLACK if user_side == RED else RED
                room["gameOver"] = True
                room["winner"] = winner
                room["resultReason"] = "surrender"
                room["moveHistory"].append(f"{('紅方' if user_side == RED else '黑方')} 投降，{('紅方' if winner == RED else '黑方')}獲勝")
                room.setdefault("rawMoves", []).append({"type": "resign", "by": user_side, "winner": winner, "name": user_name})
                await broadcast(room_id, {"type": "system", "message": f"{user_name} surrendered. {winner} wins."})
                await broadcast(room_id, public_room_state(room))
                continue

            if msg.get("type") == "move":
                if room["gameOver"]:
                    await send_json(websocket, {"type": "error", "message": "Game is already over. Reset the room to play again."})
                    continue
                if user_side not in [RED, BLACK]:
                    await send_json(websocket, {"type": "error", "message": "Spectators cannot move."})
                    continue
                if user_side != room["turn"]:
                    await send_json(websocket, {"type": "error", "message": "It is not your turn."})
                    continue

                move = msg.get("move")
                if not isinstance(move, dict):
                    await send_json(websocket, {"type": "error", "message": "Missing move."})
                    continue

                legal = all_legal_moves(room["board"], user_side)
                if not any(is_same_move(m, move) for m in legal):
                    await send_json(websocket, {"type": "error", "message": "Illegal move."})
                    continue

                captured = room["board"][move["to"]["r"]][move["to"]["c"]]
                room["moveHistory"].append(move_to_text(room["board"], move, captured))
                room.setdefault("rawMoves", []).append({"move": move, "by": user_side, "captured": captured, "name": user_name})
                if captured:
                    if user_side == RED:
                        room["capturedByRed"].append(captured)
                    else:
                        room["capturedByBlack"].append(captured)

                room["board"] = make_move(room["board"], move)
                if captured and captured[1] == "K":
                    room["gameOver"] = True
                    room["winner"] = user_side
                    room["resultReason"] = "king captured"
                else:
                    room["turn"] = BLACK if room["turn"] == RED else RED
                    replies = all_legal_moves(room["board"], room["turn"])
                    if not replies:
                        room["gameOver"] = True
                        room["winner"] = BLACK if room["turn"] == RED else RED
                        room["resultReason"] = "no legal moves"

                await broadcast(room_id, {"type": "move", "move": move, "captured": captured, "by": user_side, "name": user_name})
                await broadcast(room_id, public_room_state(room))
                continue

            await send_json(websocket, {"type": "error", "message": "Unknown message type."})

    except WebSocketDisconnect:
        pass
    finally:
        meta = connection_meta.pop(websocket, {"name": name, "side": side})
        if websocket in room_connections.get(room_id, []):
            room_connections[room_id].remove(websocket)
        # Free the color if this player owns it.
        room = rooms.get(room_id)
        if room and meta.get("side") in [RED, BLACK] and room["players"].get(meta["side"]) == meta.get("name"):
            room["players"][meta["side"]] = None
        await broadcast(room_id, {"type": "system", "message": f"{meta.get('name', 'Guest')} disconnected.", "players": room["players"] if room else {}})
        if room:
            await broadcast(room_id, public_room_state(room))
