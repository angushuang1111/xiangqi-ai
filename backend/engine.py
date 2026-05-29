import os
import subprocess
import random
import time
from math import inf

RED = "red"
BLACK = "black"

# Level 2 Python AI notes:
# - still pure Python, so it deploys easily on Render
# - better evaluation, move ordering, transposition table, opening preferences,
#   quiescence search, and iterative deepening / time limit

PIECE_VALUE = {
    "K": 30000,
    "R": 1000,
    "C": 520,
    "H": 470,
    "E": 230,
    "A": 230,
    "P": 120,
}

CENTER_FILES = [0, 3, 8, 13, 16, 13, 8, 3, 0]

# Bigger values mean the pawn has advanced to more useful rows.
PAWN_ADVANCE = {
    RED:   [120, 105, 90, 70, 50, 28, 10, 0, 0, 0],
    BLACK: [0, 0, 0, 10, 28, 50, 70, 90, 105, 120],
}

HORSE_TABLE = [
    [0,  4,  8, 10, 12, 10,  8,  4, 0],
    [4,  8, 12, 18, 20, 18, 12,  8, 4],
    [6, 12, 18, 24, 28, 24, 18, 12, 6],
    [8, 16, 24, 30, 34, 30, 24, 16, 8],
    [8, 16, 24, 32, 36, 32, 24, 16, 8],
    [8, 16, 24, 32, 36, 32, 24, 16, 8],
    [8, 16, 24, 30, 34, 30, 24, 16, 8],
    [6, 12, 18, 24, 28, 24, 18, 12, 6],
    [4,  8, 12, 18, 20, 18, 12,  8, 4],
    [0,  4,  8, 10, 12, 10,  8,  4, 0],
]

# Early-game preferences for black. These are not full opening theory; they just
# stop the AI from making ugly random-looking first moves.
BLACK_OPENING_PREFERENCES = [
    ((0, 1), (2, 2)),  # left horse develops
    ((0, 7), (2, 6)),  # right horse develops
    ((2, 1), (2, 4)),  # cannon centralizes
    ((2, 7), (2, 4)),
    ((0, 0), (1, 0)),  # rook lift if available
    ((0, 8), (1, 8)),
    ((3, 4), (4, 4)),  # center pawn forward
]


def color_of(piece):
    if not piece:
        return None
    return RED if piece[0] == "r" else BLACK


def enemy_of(color):
    return BLACK if color == RED else RED


def in_board(r, c):
    return 0 <= r < 10 and 0 <= c < 9


def clone_board(board):
    return [row[:] for row in board]


def board_key(board):
    # Compact, hashable board representation for transposition table.
    return "|".join("".join(p or ".." for p in row) for row in board)


def is_in_palace(color, r, c):
    if c < 3 or c > 5:
        return False
    if color == RED:
        return 7 <= r <= 9
    return 0 <= r <= 2


def crossed_river(color, r):
    return r <= 4 if color == RED else r >= 5


def push_if_valid(board, moves, from_pos, r, c, color):
    if not in_board(r, c):
        return
    target = board[r][c]
    if not target or color_of(target) != color:
        moves.append({"from": from_pos, "to": {"r": r, "c": c}})


def raw_moves_for_piece(board, r, c):
    piece = board[r][c]
    if not piece:
        return []

    color = color_of(piece)
    ptype = piece[1]
    from_pos = {"r": r, "c": c}
    moves = []

    if ptype == "K":
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            if is_in_palace(color, nr, nc):
                push_if_valid(board, moves, from_pos, nr, nc, color)

        step = -1 if color == RED else 1
        nr = r + step
        while in_board(nr, c):
            p = board[nr][c]
            if p:
                if p[1] == "K" and color_of(p) != color:
                    moves.append({"from": from_pos, "to": {"r": nr, "c": c}})
                break
            nr += step

    elif ptype == "A":
        for dr, dc in [(1, 1), (1, -1), (-1, 1), (-1, -1)]:
            nr, nc = r + dr, c + dc
            if is_in_palace(color, nr, nc):
                push_if_valid(board, moves, from_pos, nr, nc, color)

    elif ptype == "E":
        for dr, dc in [(2, 2), (2, -2), (-2, 2), (-2, -2)]:
            nr, nc = r + dr, c + dc
            eye_r, eye_c = r + dr // 2, c + dc // 2
            stays_side = nr >= 5 if color == RED else nr <= 4
            if in_board(nr, nc) and stays_side and not board[eye_r][eye_c]:
                push_if_valid(board, moves, from_pos, nr, nc, color)

    elif ptype == "H":
        candidates = [
            (-2, -1, -1, 0), (-2, 1, -1, 0), (2, -1, 1, 0), (2, 1, 1, 0),
            (-1, -2, 0, -1), (1, -2, 0, -1), (-1, 2, 0, 1), (1, 2, 0, 1),
        ]
        for dr, dc, leg_r, leg_c in candidates:
            nr, nc = r + dr, c + dc
            if in_board(nr, nc) and not board[r + leg_r][c + leg_c]:
                push_if_valid(board, moves, from_pos, nr, nc, color)

    elif ptype == "R":
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            while in_board(nr, nc):
                if not board[nr][nc]:
                    moves.append({"from": from_pos, "to": {"r": nr, "c": nc}})
                else:
                    if color_of(board[nr][nc]) != color:
                        moves.append({"from": from_pos, "to": {"r": nr, "c": nc}})
                    break
                nr += dr
                nc += dc

    elif ptype == "C":
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            screen_found = False
            while in_board(nr, nc):
                if not screen_found:
                    if not board[nr][nc]:
                        moves.append({"from": from_pos, "to": {"r": nr, "c": nc}})
                    else:
                        screen_found = True
                else:
                    if board[nr][nc]:
                        if color_of(board[nr][nc]) != color:
                            moves.append({"from": from_pos, "to": {"r": nr, "c": nc}})
                        break
                nr += dr
                nc += dc

    elif ptype == "P":
        forward = -1 if color == RED else 1
        push_if_valid(board, moves, from_pos, r + forward, c, color)
        if crossed_river(color, r):
            push_if_valid(board, moves, from_pos, r, c - 1, color)
            push_if_valid(board, moves, from_pos, r, c + 1, color)

    return moves


def find_king(board, color):
    king = "rK" if color == RED else "bK"
    for r in range(10):
        for c in range(9):
            if board[r][c] == king:
                return {"r": r, "c": c}
    return None


def kings_facing(board):
    red_king = find_king(board, RED)
    black_king = find_king(board, BLACK)
    if not red_king or not black_king or red_king["c"] != black_king["c"]:
        return False
    c = red_king["c"]
    start = min(red_king["r"], black_king["r"]) + 1
    end = max(red_king["r"], black_king["r"])
    return not any(board[r][c] for r in range(start, end))


def same_pos(a, b):
    return a and b and a["r"] == b["r"] and a["c"] == b["c"]


def make_move(board, move):
    next_board = clone_board(board)
    moving = next_board[move["from"]["r"]][move["from"]["c"]]
    next_board[move["to"]["r"]][move["to"]["c"]] = moving
    next_board[move["from"]["r"]][move["from"]["c"]] = None
    return next_board


def is_in_check(board, color):
    if kings_facing(board):
        return True
    king = find_king(board, color)
    if not king:
        return True
    opponent = enemy_of(color)
    for r in range(10):
        for c in range(9):
            p = board[r][c]
            if p and color_of(p) == opponent:
                attacks = raw_moves_for_piece(board, r, c)
                if any(same_pos(m["to"], king) for m in attacks):
                    return True
    return False


def legal_moves_for_piece(board, r, c):
    p = board[r][c]
    if not p:
        return []
    color = color_of(p)
    return [m for m in raw_moves_for_piece(board, r, c) if not is_in_check(make_move(board, m), color)]


def all_legal_moves(board, color):
    moves = []
    for r in range(10):
        for c in range(9):
            p = board[r][c]
            if p and color_of(p) == color:
                moves.extend(legal_moves_for_piece(board, r, c))
    return moves


def is_capture(board, move):
    return bool(board[move["to"]["r"]][move["to"]["c"]])


def piece_count(board):
    return sum(1 for row in board for p in row if p)


def attacked_squares(board, by_color):
    attacked = set()
    for r in range(10):
        for c in range(9):
            p = board[r][c]
            if p and color_of(p) == by_color:
                for m in raw_moves_for_piece(board, r, c):
                    attacked.add((m["to"]["r"], m["to"]["c"]))
    return attacked


def is_protected(board, color, r, c):
    for rr in range(10):
        for cc in range(9):
            p = board[rr][cc]
            if p and color_of(p) == color and not (rr == r and cc == c):
                if any(m["to"]["r"] == r and m["to"]["c"] == c for m in raw_moves_for_piece(board, rr, cc)):
                    return True
    return False


def cannon_screen_count(board, r, c):
    count = 0
    for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        nr, nc = r + dr, c + dc
        seen_screen = False
        while in_board(nr, nc):
            if board[nr][nc]:
                if not seen_screen:
                    seen_screen = True
                else:
                    if color_of(board[nr][nc]) != color_of(board[r][c]):
                        count += 1
                    break
            nr += dr
            nc += dc
    return count


def rook_open_file_bonus(board, r, c):
    bonus = 0
    for dr in [-1, 1]:
        nr = r + dr
        empty = 0
        while in_board(nr, c) and not board[nr][c]:
            empty += 1
            nr += dr
        bonus += min(empty, 4) * 6
    return bonus


def hanging_penalty(board, color):
    opp_attacks = attacked_squares(board, enemy_of(color))
    my_attacks = attacked_squares(board, color)
    penalty = 0
    for r in range(10):
        for c in range(9):
            p = board[r][c]
            if not p or color_of(p) != color or p[1] == "K":
                continue
            if (r, c) in opp_attacks:
                val = PIECE_VALUE[p[1]]
                penalty += val * (0.18 if (r, c) in my_attacks else 0.45)
    return penalty


def evaluate_board(board, color):
    opponent = enemy_of(color)
    my_moves = all_legal_moves(board, color)
    opp_moves = all_legal_moves(board, opponent)

    if not my_moves:
        return -999999
    if not opp_moves:
        return 999999

    score = 0
    material_total = 0
    for r in range(10):
        for c in range(9):
            p = board[r][c]
            if not p:
                continue
            side = color_of(p)
            sign = 1 if side == color else -1
            ptype = p[1]
            val = PIECE_VALUE.get(ptype, 0)
            material_total += val

            pos = CENTER_FILES[c]
            if ptype == "P":
                pos += PAWN_ADVANCE[side][r]
                if crossed_river(side, r):
                    pos += 45
                # Pawns in the center after crossing are useful attackers.
                if crossed_river(side, r) and c in (3, 4, 5):
                    pos += 20
            elif ptype == "H":
                rr = r if side == BLACK else 9 - r
                pos += HORSE_TABLE[rr][c]
            elif ptype == "R":
                pos += CENTER_FILES[c] + rook_open_file_bonus(board, r, c)
            elif ptype == "C":
                pos += CENTER_FILES[c] + cannon_screen_count(board, r, c) * 20
            elif ptype in ("A", "E"):
                pos += 8
            elif ptype == "K":
                # In late game, king should remain safe in palace center.
                pos += 10 if c == 4 else 0

            if is_protected(board, side, r, c) and ptype != "K":
                pos += min(val * 0.035, 30)

            score += sign * (val + pos)

    if is_in_check(board, opponent):
        score += 280
    if is_in_check(board, color):
        score -= 360

    score += (len(my_moves) - len(opp_moves)) * 5
    score -= hanging_penalty(board, color)
    score += hanging_penalty(board, opponent)

    # Encourage attacking the opposing palace.
    enemy_king = find_king(board, opponent)
    if enemy_king:
        for m in my_moves:
            if abs(m["to"]["r"] - enemy_king["r"]) + abs(m["to"]["c"] - enemy_king["c"]) <= 2:
                score += 4

    return score


def move_capture_value(board, move):
    target = board[move["to"]["r"]][move["to"]["c"]]
    moving = board[move["from"]["r"]][move["from"]["c"]]
    if not target:
        return 0
    return PIECE_VALUE.get(target[1], 0) * 12 - PIECE_VALUE.get(moving[1], 0)


def evaluate_move(board, move, color):
    target = board[move["to"]["r"]][move["to"]["c"]]
    moving = board[move["from"]["r"]][move["from"]["c"]]
    next_board = make_move(board, move)
    opponent = enemy_of(color)
    score = 0

    if target:
        score += PIECE_VALUE.get(target[1], 0) * 14
        if moving:
            score -= PIECE_VALUE.get(moving[1], 0) * 0.35

    if is_in_check(next_board, opponent):
        score += 600

    opp_replies = all_legal_moves(next_board, opponent)
    if not opp_replies:
        score += 999999

    if moving:
        to_square = move["to"]
        can_be_taken = any(reply["to"] == to_square for reply in opp_replies)
        if can_be_taken:
            score -= PIECE_VALUE.get(moving[1], 0) * (1.8 if target else 2.4)

    score += evaluate_board(next_board, color) * 0.06
    score += CENTER_FILES[move["to"]["c"]]
    return score


def ordered_moves(board, color, limit=None):
    moves = all_legal_moves(board, color)
    moves.sort(key=lambda m: evaluate_move(board, m, color), reverse=True)
    if limit and len(moves) > limit:
        return moves[:limit]
    return moves


def opening_book_move(board, color):
    if color != BLACK or piece_count(board) < 28:
        return None
    legal = all_legal_moves(board, color)
    for (fr, fc), (tr, tc) in BLACK_OPENING_PREFERENCES:
        for m in legal:
            if m["from"] == {"r": fr, "c": fc} and m["to"] == {"r": tr, "c": tc}:
                return m
    return None


class SearchContext:
    def __init__(self, start_time, time_limit=4.0, max_nodes=60000):
        self.start_time = start_time
        self.time_limit = time_limit
        self.max_nodes = max_nodes
        self.nodes = 0
        self.cache = {}
        self.timeout = False

    def tick(self):
        self.nodes += 1
        if self.nodes > self.max_nodes or (time.time() - self.start_time) > self.time_limit:
            self.timeout = True
        return self.timeout


def quiescence(board, side_to_move, root_color, alpha, beta, ctx, qdepth=2):
    stand_pat = evaluate_board(board, root_color)
    if qdepth <= 0 or ctx.tick():
        return stand_pat

    if side_to_move == root_color:
        if stand_pat >= beta:
            return beta
        alpha = max(alpha, stand_pat)
        noisy = [m for m in ordered_moves(board, side_to_move, limit=12)
                 if is_capture(board, m) or is_in_check(make_move(board, m), enemy_of(side_to_move))]
        for m in noisy[:8]:
            score = quiescence(make_move(board, m), enemy_of(side_to_move), root_color, alpha, beta, ctx, qdepth - 1)
            alpha = max(alpha, score)
            if alpha >= beta or ctx.timeout:
                break
        return alpha
    else:
        if stand_pat <= alpha:
            return alpha
        beta = min(beta, stand_pat)
        noisy = [m for m in ordered_moves(board, side_to_move, limit=12)
                 if is_capture(board, m) or is_in_check(make_move(board, m), enemy_of(side_to_move))]
        for m in noisy[:8]:
            score = quiescence(make_move(board, m), enemy_of(side_to_move), root_color, alpha, beta, ctx, qdepth - 1)
            beta = min(beta, score)
            if beta <= alpha or ctx.timeout:
                break
        return beta


def negamax(board, side_to_move, root_color, depth, alpha, beta, ctx):
    if ctx.tick():
        return evaluate_board(board, root_color), None

    key = (board_key(board), side_to_move, root_color, depth)
    if key in ctx.cache:
        cached_depth, cached_score, cached_move = ctx.cache[key]
        if cached_depth >= depth:
            return cached_score, cached_move

    moves = ordered_moves(board, side_to_move)
    if not moves:
        val = evaluate_board(board, root_color)
        return val, None
    if depth == 0:
        return quiescence(board, side_to_move, root_color, alpha, beta, ctx), None

    # Candidate pruning keeps Render response time reasonable.
    if depth >= 4:
        cap = 16
    elif depth == 3:
        cap = 18
    elif depth == 2:
        cap = 14
    else:
        cap = 10
    moves = moves[:cap]

    maximizing = side_to_move == root_color
    best_move = None

    if maximizing:
        best_score = -10**9
        for m in moves:
            score, _ = negamax(make_move(board, m), enemy_of(side_to_move), root_color, depth - 1, alpha, beta, ctx)
            if score > best_score:
                best_score, best_move = score, m
            alpha = max(alpha, best_score)
            if beta <= alpha or ctx.timeout:
                break
    else:
        best_score = 10**9
        for m in moves:
            score, _ = negamax(make_move(board, m), enemy_of(side_to_move), root_color, depth - 1, alpha, beta, ctx)
            if score < best_score:
                best_score, best_move = score, m
            beta = min(beta, best_score)
            if beta <= alpha or ctx.timeout:
                break

    ctx.cache[key] = (depth, best_score, best_move)
    return best_score, best_move



FILES = "abcdefghi"


def board_to_xiangqi_fen(board, side_to_move):
    """Convert internal 10x9 board to a Xiangqi FEN-like string for UCI engines.
    Coordinates follow the board rows used by most Xiangqi FEN strings: row 0 is Black back rank.
    """
    piece_map = {
        "rK": "K", "rA": "A", "rE": "B", "rH": "N", "rR": "R", "rC": "C", "rP": "P",
        "bK": "k", "bA": "a", "bE": "b", "bH": "n", "bR": "r", "bC": "c", "bP": "p",
    }
    rows = []
    for r in range(10):
        empty = 0
        out = []
        for c in range(9):
            p = board[r][c]
            if not p:
                empty += 1
            else:
                if empty:
                    out.append(str(empty)); empty = 0
                out.append(piece_map.get(p, "1"))
        if empty:
            out.append(str(empty))
        rows.append("".join(out))
    side = "w" if side_to_move == RED else "b"
    return "/".join(rows) + f" {side} - - 0 1"


def coord_to_uci(pos):
    # Pikafish/UCI Xiangqi coordinates use rank 0 on Red's home side.
    # Our internal board uses row 0 on Black's home side, so ranks must be flipped.
    return f"{FILES[pos['c']]}{9 - int(pos['r'])}"


def uci_to_move(text):
    text = (text or "").strip().lower()
    if text in ("", "none", "0000", "(none)"):
        return None
    if len(text) < 4 or text[0] not in FILES or text[2] not in FILES:
        return None
    try:
        fr_rank = int(text[1])
        to_rank = int(text[3])
        if not (0 <= fr_rank <= 9 and 0 <= to_rank <= 9):
            return None
        return {
            "from": {"c": FILES.index(text[0]), "r": 9 - fr_rank},
            "to": {"c": FILES.index(text[2]), "r": 9 - to_rank},
        }
    except Exception:
        return None


def same_move(a, b):
    return a and b and a["from"]["r"] == b["from"]["r"] and a["from"]["c"] == b["from"]["c"] and a["to"]["r"] == b["to"]["r"] and a["to"]["c"] == b["to"]["c"]


def default_pikafish_path():
    # Render build.sh installs here by default. A user-supplied PIKAFISH_PATH still wins.
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "pikafish", "pikafish")


def default_pikafish_nnue_path():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "pikafish", "pikafish.nnue")


def resolved_pikafish_nnue_path():
    env_path = os.environ.get("PIKAFISH_NNUE_PATH", "").strip()
    if env_path:
        return env_path, "env"
    return default_pikafish_nnue_path(), "auto"


def resolved_pikafish_path():
    env_path = os.environ.get("PIKAFISH_PATH", "").strip()
    if env_path:
        return env_path, "env"
    return default_pikafish_path(), "auto"


def pikafish_status():
    path, source = resolved_pikafish_path()
    nnue_path, nnue_source = resolved_pikafish_nnue_path()
    engine_ok = bool(path and os.path.exists(path) and os.access(path, os.X_OK))
    nnue_ok = bool(nnue_path and os.path.exists(nnue_path) and os.path.getsize(nnue_path) > 1000000)
    return {
        "configured": engine_ok and nnue_ok,
        "engine_configured": engine_ok,
        "nnue_configured": nnue_ok,
        "path": path,
        "source": source,
        "nnue_path": nnue_path,
        "nnue_source": nnue_source,
        "message": "Pikafish active with NNUE" if engine_ok and nnue_ok else ("Pikafish engine installed but NNUE missing; Master falls back to Expert" if engine_ok else "Pikafish not installed; Master falls back to Expert"),
    }


def _read_until(proc, targets, timeout=3.0):
    """Read UCI output until one of the target tokens appears or timeout."""
    targets = tuple(targets)
    lines = []
    deadline = time.time() + timeout
    if proc.stdout is None:
        return lines, None
    while time.time() < deadline:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if line:
            lines.append(line)
        if any(t in line.lower() for t in targets):
            return lines, line
    return lines, None


def pikafish_move(board, color, legal_moves, time_limit_ms=1500, depth=8):
    """Ask a local Pikafish/UCI-compatible Xiangqi engine for a move.
    Render build.sh installs it to backend/vendor/pikafish/pikafish.
    If anything fails, return None so the app can fall back to Expert.
    """
    path, source = resolved_pikafish_path()
    if not path or not os.path.exists(path):
        return None, f"Pikafish not installed at {path}. Master is using Expert fallback."
    if not os.access(path, os.X_OK):
        return None, f"Pikafish exists but is not executable: {path}. Master is using Expert fallback."

    nnue_path, nnue_source = resolved_pikafish_nnue_path()
    if not nnue_path or not os.path.exists(nnue_path):
        return None, f"Pikafish NNUE file missing at {nnue_path}. Master is using Expert fallback."

    fen = board_to_xiangqi_fen(board, color)
    try:
        proc = subprocess.Popen(
            [path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1
        )
        assert proc.stdin is not None and proc.stdout is not None

        # Proper UCI handshake. Sending all commands at once can work locally, but on Render
        # it can cause us to read startup lines and miss/timeout before bestmove.
        proc.stdin.write("uci\n"); proc.stdin.flush()
        _read_until(proc, ["uciok"], timeout=4.0)

        # Pikafish is already a Xiangqi engine, but this is harmless for builds that expose the option.
        try:
            proc.stdin.write("setoption name UCI_Variant value xiangqi\n"); proc.stdin.flush()
        except Exception:
            pass

        # Recent Pikafish builds require the NNUE network file path explicitly on Render.
        # Use the full absolute path, otherwise the engine terminates with EvalFile errors.
        try:
            proc.stdin.write(f"setoption name EvalFile value {nnue_path}\n"); proc.stdin.flush()
        except Exception:
            pass

        proc.stdin.write("isready\n"); proc.stdin.flush()
        _read_until(proc, ["readyok"], timeout=4.0)

        proc.stdin.write(f"position fen {fen}\n"); proc.stdin.flush()
        # Use either movetime or depth. Movetime is safer on Render Free.
        proc.stdin.write(f"go movetime {int(time_limit_ms)}\n"); proc.stdin.flush()

        deadline = time.time() + (time_limit_ms / 1000.0) + 5.0
        best = None
        raw_lines = []
        while time.time() < deadline:
            line = proc.stdout.readline()
            if not line:
                break
            line = line.strip()
            if line:
                raw_lines.append(line)
            if line.lower().startswith("bestmove"):
                parts = line.split()
                if len(parts) >= 2:
                    best = parts[1]
                break

        try:
            proc.stdin.write("quit\n"); proc.stdin.flush()
        except Exception:
            pass
        try:
            proc.terminate()
        except Exception:
            pass

        move = uci_to_move(best or "")
        if move and any(same_move(move, m) for m in legal_moves):
            return move, f"Master mode: Pikafish bestmove {best} using NNUE."

        # If the coordinate convention ever differs, try the unflipped legacy mapping as a fallback.
        legacy = None
        if best and len(best) >= 4 and best[0] in FILES and best[2] in FILES:
            try:
                legacy = {
                    "from": {"c": FILES.index(best[0]), "r": int(best[1])},
                    "to": {"c": FILES.index(best[2]), "r": int(best[3])},
                }
            except Exception:
                legacy = None
        if legacy and any(same_move(legacy, m) for m in legal_moves):
            return legacy, f"Master mode: Pikafish bestmove {best} using legacy coordinate mapping."

        tail = "; ".join(raw_lines[-3:]) if raw_lines else "no engine output"
        return None, f"Pikafish returned unusable bestmove ({best}); using Expert fallback. FEN: {fen}. Engine tail: {tail}"
    except Exception as exc:
        return None, f"Pikafish error: {exc}; using Expert fallback."

def choose_ai_move(board, color=BLACK, difficulty="normal"):
    moves = all_legal_moves(board, color)
    if not moves:
        return None, 0, "No legal move."

    if difficulty == "master":
        move, reason = pikafish_move(board, color, moves, time_limit_ms=1800, depth=10)
        if move:
            return move, evaluate_move(board, move, color), reason
        # No engine configured on Render/local: safely fall back to Expert Level 2 AI.
        difficulty = "expert"
        fallback_reason = reason
    else:
        fallback_reason = ""

    # Immediate mate check first.
    for m in ordered_moves(board, color):
        nb = make_move(board, m)
        if not all_legal_moves(nb, enemy_of(color)):
            return m, 999999, ((fallback_reason + " ") if 'fallback_reason' in locals() and fallback_reason else "") + "Found immediate checkmate."

    if difficulty == "easy":
        move = random.choice(moves)
        return move, 0, "Easy mode selected a random legal move."

    # Opening preference for early black moves.
    if difficulty in ("hard", "expert"):
        book = opening_book_move(board, color)
        if book:
            return book, evaluate_move(board, book, color), ((fallback_reason + " ") if 'fallback_reason' in locals() and fallback_reason else "") + "Opening book: developed a major piece."

    if difficulty == "normal":
        moves = ordered_moves(board, color)
        top = moves[:4]
        move = random.choice(top)
        return move, evaluate_move(board, move, color), "Normal mode picked from the top tactical moves."

    if difficulty == "expert":
        max_depth = 4
        time_limit = 5.5
        max_nodes = 85000
    else:
        max_depth = 3
        time_limit = 3.5
        max_nodes = 50000

    ctx = SearchContext(time.time(), time_limit=time_limit, max_nodes=max_nodes)
    best_move = None
    best_score = -10**9
    completed_depth = 0

    # Iterative deepening: if time runs out, still return the best completed depth.
    for depth in range(1, max_depth + 1):
        score, move = negamax(board, color, color, depth, -10**9, 10**9, ctx)
        if ctx.timeout:
            break
        if move:
            best_move, best_score = move, score
            completed_depth = depth

    if not best_move:
        ordered = ordered_moves(board, color)
        best_move = ordered[0]
        best_score = evaluate_move(board, best_move, color)
        completed_depth = 0

    mode_name = "Expert" if difficulty == "expert" else "Hard"
    prefix = (fallback_reason + " ") if 'fallback_reason' in locals() and fallback_reason else ""
    return best_move, best_score, prefix + f"{mode_name} Level 2 AI: depth {completed_depth}/{max_depth}, {ctx.nodes} nodes, quiescence + cache + improved evaluation."
