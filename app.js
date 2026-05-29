const appEl = document.querySelector(".app");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveListEl = document.getElementById("moveList");
const twoPlayerBtn = document.getElementById("twoPlayerBtn");
const aiBtn = document.getElementById("aiBtn");
const onlineBtn = document.getElementById("onlineBtn");
const replayModeBtn = document.getElementById("replayModeBtn");
const resetBtn = document.getElementById("resetBtn");
const surrenderBtn = document.getElementById("surrenderBtn");
const undoBtn = document.getElementById("undoBtn");
const hintBtn = document.getElementById("hintBtn");
const difficultySelect = document.getElementById("difficultySelect");
const sideSelect = document.getElementById("sideSelect");
const soundToggle = document.getElementById("soundToggle");
const voiceToggle = document.getElementById("voiceToggle");
const musicToggle = document.getElementById("musicToggle");
const musicVolume = document.getElementById("musicVolume");
const backendToggle = document.getElementById("backendToggle");
const backendUrlInput = document.getElementById("backendUrlInput");
const hintBox = document.getElementById("hintBox");
const redCapturedEl = document.getElementById("redCaptured");
const blackCapturedEl = document.getElementById("blackCaptured");
const playerNameInput = document.getElementById("playerNameInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const resetRoomBtn = document.getElementById("resetRoomBtn");
const liveStatusEl = document.getElementById("liveStatus");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const quickMatchBtn = document.getElementById("quickMatchBtn");
const authScreen = document.getElementById("authScreen");
const authEmailInput = document.getElementById("authEmailInput");
const authNameInput = document.getElementById("authNameInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const visitorBtn = document.getElementById("visitorBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const resetPasswordPanel = document.getElementById("resetPasswordPanel");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const updatePasswordBtn = document.getElementById("updatePasswordBtn");
const authMessage = document.getElementById("authMessage");
const userBadge = document.getElementById("userBadge");
const logoutBtn = document.getElementById("logoutBtn");
const switchAccountBtn = document.getElementById("switchAccountBtn");
const historyBtn = document.getElementById("historyBtn");
const historySelect = document.getElementById("historySelect");
const loadReplayBtn = document.getElementById("loadReplayBtn");
const deleteReplayBtn = document.getElementById("deleteReplayBtn");
const exportReplayBtn = document.getElementById("exportReplayBtn");
const replayStatus = document.getElementById("replayStatus");
const replayIntro = document.getElementById("replayIntro");
const replayControls = document.getElementById("replayControls");
const replayFirstBtn = document.getElementById("replayFirstBtn");
const replayPrevBtn = document.getElementById("replayPrevBtn");
const replayPlayBtn = document.getElementById("replayPlayBtn");
const replayNextBtn = document.getElementById("replayNextBtn");
const replayLastBtn = document.getElementById("replayLastBtn");
const analyzeReplayBtn = document.getElementById("analyzeReplayBtn");
const exitReplayBtn = document.getElementById("exitReplayBtn");
const exitReplayTopBtn = document.getElementById("exitReplayTopBtn");

const RED = "red";
const BLACK = "black";
let mode = "two";
let board = [];
let turn = RED;
let selected = null;
let legalTargets = [];
let moveHistory = [];
let gameOver = false;
let stateHistory = [];
let capturedByRed = [];
let capturedByBlack = [];
let lastMove = null;
let hintMove = null;
let aiThinking = false;
let liveSocket = null;
let liveRoomId = "";
let liveSide = "offline";
let liveConnected = false;
let audioCtx = null;
let musicTimer = null;
let musicGain = null;
let musicStarted = false;
let musicStep = 0;
let lastAnnouncedResult = null;
let currentUser = null;
let replayMoves = [];
let currentReplay = null;
let replayIndex = 0;
let replayTimer = null;
let savedLiveGameKey = null;
let cloudHistoryCache = [];
let cloudHistoryLoaded = false;
let logoutInProgress = false;
let authOverlayFromGame = false;
const FORCE_LOGOUT_KEY = "xiangqiForceLoggedOut";

const SUPABASE_URL = "https://zrlehrdyqiqhohyqxxyx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-I-dIMLXkG3kY8l-vOSIzQ_50fMEm87";
const supabaseClient = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const DEFAULT_BACKEND_URL = "https://xiangqi-ai-backend.onrender.com";
const savedBackendRaw = localStorage.getItem("xiangqiBackendUrl");
const savedBackendUrl = savedBackendRaw || DEFAULT_BACKEND_URL;
const savedBackendEnabled = localStorage.getItem("xiangqiBackendEnabled") !== "false";
const savedDifficulty = localStorage.getItem("xiangqiDifficulty") || "master";
const savedSoundEnabled = localStorage.getItem("xiangqiSoundEnabled");
const savedVoiceEnabled = localStorage.getItem("xiangqiVoiceEnabled");
const savedMusicEnabled = localStorage.getItem("xiangqiMusicEnabled") === "true";
const savedMusicVolume = localStorage.getItem("xiangqiMusicVolume");
const savedPlayerName = localStorage.getItem("xiangqiPlayerName") || "";
const savedPlayerSide = localStorage.getItem("xiangqiPlayerSide") || RED;
if (backendUrlInput) backendUrlInput.value = savedBackendUrl;
if (sideSelect) sideSelect.value = savedPlayerSide === BLACK ? BLACK : RED;
if (backendToggle) backendToggle.checked = savedBackendEnabled;
if (difficultySelect) difficultySelect.value = savedDifficulty;
if (soundToggle && savedSoundEnabled !== null) soundToggle.checked = savedSoundEnabled === "true";
if (voiceToggle && savedVoiceEnabled !== null) voiceToggle.checked = savedVoiceEnabled === "true";
if (musicToggle) musicToggle.checked = savedMusicEnabled;
if (musicVolume && savedMusicVolume !== null) musicVolume.value = savedMusicVolume;

const pieceNames = {
  rK: "帥", rA: "仕", rE: "相", rH: "傌", rR: "俥", rC: "炮", rP: "兵",
  bK: "將", bA: "士", bE: "象", bH: "馬", bR: "車", bC: "砲", bP: "卒",
};

const pieceValue = {
  K: 10000, R: 900, C: 450, H: 400, E: 220, A: 220, P: 120
};


function storageKeyForUser(suffix) {
  const id = currentUser ? currentUser.id : "guest";
  return `xiangqi_${id}_${suffix}`;
}

function loadCurrentUser() {
  try {
    currentUser = JSON.parse(localStorage.getItem("xiangqiCurrentUser") || "null");
  } catch {
    currentUser = null;
  }
}

async function sha256(text) {
  if (!crypto || !crypto.subtle) return btoa(unescape(encodeURIComponent(text)));
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}


function setAuthMessage(text, isOk = false) {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.style.color = isOk ? "#216b2c" : "#8b1d12";
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function appRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

function showResetPasswordPanel(show = true) {
  if (!resetPasswordPanel) return;
  resetPasswordPanel.classList.toggle("hidden", !show);
}


function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function displayNameFromSupabaseUser(user) {
  return user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Player";
}

function setCurrentSupabaseUser(user) {
  if (!user) return;
  currentUser = {
    id: user.id,
    email: user.email || "",
    name: displayNameFromSupabaseUser(user),
    visitor: false,
    provider: "supabase"
  };
  localStorage.setItem("xiangqiCurrentUser", JSON.stringify(currentUser));
  if (playerNameInput && !playerNameInput.value) playerNameInput.value = currentUser.name;
}

async function refreshCloudHistory() {
  if (!supabaseClient || !currentUser || currentUser.visitor) {
    cloudHistoryCache = [];
    cloudHistoryLoaded = false;
    return [];
  }
  const { data, error } = await supabaseClient
    .from("games")
    .select("id, mode, difficulty, player_side, winner, result, moves, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    console.warn("Supabase history load failed:", error);
    setHintText("Cloud match history failed to load. Check Supabase table/RLS policy.");
    return cloudHistoryCache;
  }
  cloudHistoryCache = (data || []).map(cloudRowToRecord);
  cloudHistoryLoaded = true;
  renderHistoryList();
  return cloudHistoryCache;
}

function applyAuthState() {
  const hasCloudUser = !!(currentUser && !currentUser.visitor);
  const hasVisitorUser = !!(currentUser && currentUser.visitor);

  if (currentUser) {
    if (!authOverlayFromGame) document.body.classList.remove("auth-locked");
    if (userBadge) {
      if (currentUser.visitor) userBadge.textContent = `Visitor: ${currentUser.name} — local history only`;
      else userBadge.textContent = `Logged in: ${currentUser.name}${currentUser.email ? " (" + currentUser.email + ")" : ""} — cloud history`;
    }
    if (playerNameInput && !playerNameInput.value) playerNameInput.value = currentUser.name;
  } else {
    document.body.classList.add("auth-locked");
    if (userBadge) userBadge.textContent = "Not logged in";
  }

  if (ingameLoginBtn) ingameLoginBtn.classList.toggle("hidden", hasCloudUser);
  if (cancelAuthBtn) cancelAuthBtn.classList.toggle("hidden", !authOverlayFromGame || !hasVisitorUser);
  if (switchAccountBtn) switchAccountBtn.classList.toggle("hidden", !currentUser);
  if (logoutBtn) logoutBtn.textContent = "Logout";
  renderHistoryList();
}

function returnToAuthMainScreen(message = "Logged out. Log in again or continue as Visitor.") {
  authOverlayFromGame = false;
  currentUser = null;
  cloudHistoryCache = [];
  cloudHistoryLoaded = false;
  currentReplay = null;
  replayMoves = [];
  replayIndex = 0;
  stopReplayAutoplay();
  try { if (liveSocket) liveSocket.close(); } catch {}
  liveSocket = null;
  liveConnected = false;
  liveRoomId = "";
  liveSide = "offline";
  if (roomCodeInput) roomCodeInput.value = "";
  if (liveStatusEl) liveStatusEl.textContent = "Not connected.";
  if (chatBox) chatBox.innerHTML = "";
  mode = "two";
  selected = null;
  legalTargets = [];
  hintMove = null;
  gameOver = false;
  initBoard();
  if (appEl) {
    appEl.classList.remove("mode-ai", "mode-online", "mode-replay");
    appEl.classList.add("mode-two");
  }
  document.body.classList.add("auth-locked");
  if (userBadge) userBadge.textContent = "Not logged in";
  setAuthMessage(message, true);
  applyAuthState();
}

async function initializeAuth() {
  const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
  const authError = hashParams.get("error_description") || hashParams.get("error");
  if (authError) {
    setAuthMessage(decodeURIComponent(authError.replace(/\+/g, " ")));
    if (window.history && window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  if (forceLoggedOut()) {
    currentUser = null;
    cloudHistoryCache = [];
    cloudHistoryLoaded = false;
    clearSupabaseAuthStorage();
    localStorage.removeItem("xiangqiCurrentUser");
    applyAuthState();
    setAuthMessage("Logged out. Log in again or continue as Visitor.", true);
    // Also ask Supabase to clear any stale cookie/session, but do not restore it on this page load.
    try { if (supabaseClient) await supabaseClient.auth.signOut({ scope: "local" }); } catch {}
    return;
  }
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) {
        setCurrentSupabaseUser(data.session.user);
        setAuthMessage("Supabase session restored.", true);
        applyAuthState();
        await refreshCloudHistory();
        return;
      }
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (forceLoggedOut()) {
          currentUser = null;
          cloudHistoryCache = [];
          cloudHistoryLoaded = false;
          applyAuthState();
          return;
        }
        if (logoutInProgress) {
          currentUser = null;
          cloudHistoryCache = [];
          cloudHistoryLoaded = false;
          applyAuthState();
          return;
        }
        if (event === "PASSWORD_RECOVERY") {
          showResetPasswordPanel(true);
          setAuthMessage("Password reset link accepted. Enter a new password below.", true);
          if (session?.user) setCurrentSupabaseUser(session.user);
          applyAuthState();
          return;
        }
        if (event === "SIGNED_OUT" || !session?.user) {
          currentUser = null;
          localStorage.removeItem("xiangqiCurrentUser");
          cloudHistoryCache = [];
          cloudHistoryLoaded = false;
          applyAuthState();
          setAuthMessage("Logged out.", true);
          return;
        }
        if (session?.user) {
          setCurrentSupabaseUser(session.user);
          applyAuthState();
          await refreshCloudHistory();
        }
      });
    } catch (err) {
      console.warn("Supabase session check failed:", err);
    }
  }
  loadCurrentUser();
  applyAuthState();
}

function loadCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("xiangqiCurrentUser") || "null");
    // Only restore visitor/local state here. Real Supabase users are restored through Supabase session.
    currentUser = stored && stored.visitor ? stored : null;
  } catch {
    currentUser = null;
  }
}

async function signupLocalUser() {
  clearForceLogoutFlag();
  if (!supabaseClient) return setAuthMessage("Supabase client failed to load. Check internet/CDN.");
  const email = normalizeEmail(authEmailInput?.value);
  const name = (authNameInput?.value || "").trim() || email.split("@")[0];
  const password = authPasswordInput?.value || "";
  if (!validEmail(email)) return setAuthMessage("Enter a valid email address.");
  if (!password) return setAuthMessage("Enter a password.");
  if (password.length < 6) return setAuthMessage("Use at least 6 characters for Supabase email login.");
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } }
  });
  if (error) return setAuthMessage(error.message || "Sign up failed.");
  if (data?.session?.user) {
    setCurrentSupabaseUser(data.session.user);
    authOverlayFromGame = false;
    setAuthMessage("Signed up and logged in with Supabase.", true);
    applyAuthState();
    await refreshCloudHistory();
  } else {
    setAuthMessage("Sign up successful. Check your email to confirm before logging in.", true);
  }
}

async function loginLocalUser() {
  clearForceLogoutFlag();
  if (!supabaseClient) return setAuthMessage("Supabase client failed to load. Check internet/CDN.");
  const email = normalizeEmail(authEmailInput?.value);
  const password = authPasswordInput?.value || "";
  if (!validEmail(email)) return setAuthMessage("Enter your email address.");
  if (!password) return setAuthMessage("Enter your password.");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage(error.message || "Invalid email or password.");
  if (data?.user) {
    setCurrentSupabaseUser(data.user);
    authOverlayFromGame = false;
    setAuthMessage("Logged in with Supabase email.", true);
    applyAuthState();
    await refreshCloudHistory();
  }
}


async function sendPasswordResetEmail() {
  if (!supabaseClient) return setAuthMessage("Supabase client failed to load. Check internet/CDN.");
  const email = normalizeEmail(authEmailInput?.value);
  if (!validEmail(email)) return setAuthMessage("Enter your account email first, then press Forgot password.");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: appRedirectUrl()
  });
  if (error) return setAuthMessage(error.message || "Could not send reset email.");
  setAuthMessage("Password reset email sent. Open the newest email link, then enter a new password here.", true);
  showResetPasswordPanel(false);
}

async function updatePasswordFromRecovery() {
  if (!supabaseClient) return setAuthMessage("Supabase client failed to load. Check internet/CDN.");
  const password = newPasswordInput?.value || "";
  const confirm = confirmPasswordInput?.value || "";
  if (password.length < 6) return setAuthMessage("New password must be at least 6 characters.");
  if (password !== confirm) return setAuthMessage("New password and confirmation do not match.");
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) return setAuthMessage(error.message || "Password update failed. Try requesting a new reset link.");
  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
  showResetPasswordPanel(false);
  setAuthMessage("Password updated. You are logged in now.", true);
  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) {
    setCurrentSupabaseUser(data.user);
    authOverlayFromGame = false;
    applyAuthState();
    await refreshCloudHistory();
  }
}

function openLoginFromGame() {
  if (currentUser && !currentUser.visitor) {
    setAuthMessage("You are already logged in with cloud history.", true);
    return;
  }
  authOverlayFromGame = true;
  document.body.classList.add("auth-locked");
  if (authEmailInput) authEmailInput.focus();
  setAuthMessage("Log in or sign up to enable cloud match history. Your current board will stay open if you go back.", true);
  applyAuthState();
}

function closeLoginOverlayToGame() {
  if (!currentUser || !currentUser.visitor) return;
  authOverlayFromGame = false;
  document.body.classList.remove("auth-locked");
  setAuthMessage("Returned to visitor game. Cloud history remains off until you log in.", true);
  applyAuthState();
}

function enterVisitorMode() {
  clearForceLogoutFlag();
  const name = (authNameInput?.value || "Visitor").trim() || `Visitor${Math.floor(Math.random() * 900 + 100)}`;
  authOverlayFromGame = false;
  currentUser = { id: "visitor", name, visitor: true };
  localStorage.setItem("xiangqiCurrentUser", JSON.stringify(currentUser));
  localStorage.setItem("xiangqiPlayerName", name);
  if (playerNameInput) playerNameInput.value = name;
  cloudHistoryCache = [];
  cloudHistoryLoaded = false;
  setAuthMessage("Visitor mode: replays save only on this browser.", true);
  applyAuthState();
}

function removeAuthKeysFromStorage(storage) {
  if (!storage) return;
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    const lower = key.toLowerCase();
    if (
      key === "xiangqiCurrentUser" ||
      lower.includes("supabase") ||
      lower.includes("zrlehrdyqiqhohyqxxyx") ||
      (key.startsWith("sb-") && lower.includes("auth"))
    ) {
      keys.push(key);
    }
  }
  keys.forEach(key => storage.removeItem(key));
}

function clearSupabaseAuthStorage() {
  try {
    removeAuthKeysFromStorage(localStorage);
    removeAuthKeysFromStorage(sessionStorage);
  } catch (err) {
    console.warn("Could not clear auth storage:", err);
  }
}

function forceLoggedOut() {
  try { return localStorage.getItem(FORCE_LOGOUT_KEY) === "1"; }
  catch { return false; }
}

function clearForceLogoutFlag() {
  try { localStorage.removeItem(FORCE_LOGOUT_KEY); }
  catch {}
}

function setForceLogoutFlag() {
  try { localStorage.setItem(FORCE_LOGOUT_KEY, "1"); }
  catch {}
}

async function logoutUser(options = {}) {
  if (options && options.preventDefault) options = {};
  const switching = !!options.switching;
  const promptText = switching
    ? "Switch account and return to the login screen? Saved match history remains."
    : "Logout and return to the main login screen? Saved match history remains.";
  const ok = confirm(promptText);
  if (!ok) return;

  logoutInProgress = true;
  setForceLogoutFlag();
  if (logoutBtn) logoutBtn.disabled = true;
  if (switchAccountBtn) switchAccountBtn.disabled = true;
  const wasSupabaseUser = currentUser && !currentUser.visitor;

  // Immediately show the real main/login screen. Do not wait for Supabase network response.
  returnToAuthMainScreen(switching ? "Choose another account or continue as Visitor." : "Logging out...");

  try {
    if (supabaseClient && wasSupabaseUser) {
      const result = await supabaseClient.auth.signOut({ scope: "global" });
      if (result?.error) {
        console.warn("Supabase global logout warning:", result.error);
        await supabaseClient.auth.signOut({ scope: "local" });
      }
    }
  } catch (err) {
    console.warn("Supabase logout failed, clearing local session anyway:", err);
  }

  clearSupabaseAuthStorage();
  localStorage.removeItem("xiangqiCurrentUser");
  logoutInProgress = false;
  if (logoutBtn) logoutBtn.disabled = false;
  if (switchAccountBtn) switchAccountBtn.disabled = false;
  returnToAuthMainScreen(switching ? "Choose another account or continue as Visitor." : "Logged out. Log in again or continue as Visitor.");

  // Replace hash/query fragments that may contain old recovery or auth data, without leaving the app screen.
  try {
    if (window.history) window.history.replaceState(null, "", window.location.pathname + "?signedout=" + Date.now());
  } catch {}
}

function switchAccount() {
  logoutUser({ switching: true });
}

function getHistory() {
  if (currentUser && !currentUser.visitor) return cloudHistoryCache;
  try { return JSON.parse(localStorage.getItem(storageKeyForUser("matchHistory")) || "[]"); }
  catch { return []; }
}

function setHistory(list) {
  if (currentUser && !currentUser.visitor) {
    cloudHistoryCache = list.slice(0, 80);
    return;
  }
  localStorage.setItem(storageKeyForUser("matchHistory"), JSON.stringify(list.slice(0, 80)));
}

function cloudRowToRecord(row) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    user: meta.user || currentUser?.name || "Player",
    visitor: false,
    mode: row.mode,
    difficulty: row.difficulty,
    playerSide: row.player_side,
    winner: row.winner,
    reason: row.result,
    movesText: meta.movesText || [],
    moves: row.moves || [],
    createdAt: row.created_at,
    roomId: meta.roomId || null,
    dedupeKey: meta.dedupeKey || row.id,
    metadata: meta
  };
}

async function saveMatchRecord(winner, reason = "", extra = {}) {
  if (!currentUser) ensureReplayUserForLocalSave();
  if (!moveHistory.length && !replayMoves.length && !extra.forceSave) return;
  const key = `${mode}-${winner}-${reason}-${moveHistory.length}-${JSON.stringify(replayMoves).length}`;
  if (extra.key && extra.key === savedLiveGameKey) return;
  const record = {
    id: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user: currentUser.name,
    visitor: Boolean(currentUser.visitor),
    mode,
    difficulty: difficultySelect?.value || "master",
    playerSide: mode === "online" ? liveSide : getPlayerSide(),
    winner,
    reason,
    movesText: [...moveHistory],
    moves: replayMoves.map(x => JSON.parse(JSON.stringify(x))),
    createdAt: new Date().toISOString(),
    roomId: liveRoomId || null,
    ...extra
  };
  record.dedupeKey = key;
  if (currentUser.visitor) {
    const list = getHistory();
    if (list.some(r => r.dedupeKey === key)) return;
    list.unshift(record);
    setHistory(list);
    renderHistoryList();
    return;
  }

  // Optimistic replay visibility: show the finished/surrendered game immediately, then replace it with the cloud row if insert succeeds.
  if (!cloudHistoryCache.some(r => r.dedupeKey === key)) {
    record.pendingCloudSave = true;
    cloudHistoryCache.unshift(record);
    cloudHistoryCache = cloudHistoryCache.slice(0, 80);
    renderHistoryList();
  }

  if (!supabaseClient) {
    record.cloudSaveFailed = true;
    record.pendingCloudSave = false;
    renderHistoryList();
    return setHintText("Supabase unavailable. Replay kept in this session only.");
  }
  const metadata = {
    user: currentUser.name,
    email: currentUser.email || null,
    movesText: record.movesText,
    roomId: record.roomId,
    dedupeKey: key,
    rawRecordId: record.id,
    extra
  };
  const { data, error } = await supabaseClient
    .from("games")
    .insert({
      user_id: currentUser.id,
      mode: record.mode,
      difficulty: record.difficulty,
      player_side: record.playerSide,
      winner: record.winner,
      result: record.reason,
      moves: record.moves,
      metadata
    })
    .select("id, mode, difficulty, player_side, winner, result, moves, metadata, created_at")
    .single();
  if (error) {
    console.warn("Cloud save failed:", error);
    // Keep a visible session fallback so users still see surrendered or finished games in Replay Center.
    const existing = cloudHistoryCache.find(r => r.dedupeKey === key);
    if (existing) {
      existing.cloudSaveFailed = true;
      existing.pendingCloudSave = false;
    }
    renderHistoryList();
    setHintText("Cloud replay save failed, but this match was kept in this session. Check Supabase games table/RLS policy.");
    return;
  }
  const saved = cloudRowToRecord(data);
  cloudHistoryCache = [saved, ...cloudHistoryCache.filter(r => r.dedupeKey !== key && r.id !== saved.id)].slice(0, 80);
  renderHistoryList();
}

function hasReplayableProgress() {
  return Boolean(moveHistory.length || replayMoves.length);
}

function ensureReplayUserForLocalSave() {
  if (currentUser) return;
  currentUser = { id: "guest", name: "Guest", visitor: true };
}

function terminalTextForEvent(eventName, winner, loser) {
  if (eventName === "surrender") {
    return `${sideLabel(loser)} surrendered. ${sideLabel(winner)} wins!`;
  }
  if (eventName === "new_game") {
    return "Game saved as unfinished before starting a new game.";
  }
  if (eventName === "mode_switch") {
    return "Game saved as unfinished before switching modes.";
  }
  return "Game saved as unfinished.";
}

async function saveUnfinishedReplayBeforeLeaving(eventName = "new_game") {
  if (mode === "replay") return false;
  if (!hasReplayableProgress()) return false;
  if (gameOver) return false;

  const ok = confirm("Save the current unfinished game to Replay / Match History before leaving it?");
  if (!ok) return false;

  ensureReplayUserForLocalSave();
  const text = terminalTextForEvent(eventName, "none", null);
  moveHistory.push(text);
  replayMoves.push({
    event: eventName,
    loser: null,
    winner: "none",
    text,
    board: JSON.parse(JSON.stringify(board)),
    createdAt: new Date().toISOString()
  });
  await saveMatchRecord("none", text, { forceSave: true, endEvent: eventName, unfinished: true });
  setHintText("Current game saved to Replay / Match History.");
  return true;
}

function renderHistoryList() {
  if (!historySelect) return;
  const list = getHistory();
  historySelect.innerHTML = "";
  if (currentUser && !currentUser.visitor && !cloudHistoryLoaded) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Cloud history not loaded yet";
    historySelect.appendChild(opt);
    return;
  }
  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = currentUser && !currentUser.visitor ? "No cloud games yet" : "No local saved games yet";
    historySelect.appendChild(opt);
    return;
  }
  list.forEach(record => {
    const opt = document.createElement("option");
    opt.value = record.id;
    const d = new Date(record.createdAt).toLocaleString();
    const lowerReason = (record.reason || "").toLowerCase();
    const resultLabel = lowerReason.includes("surrender") ? "surrender" : lowerReason.includes("unfinished") || lowerReason.includes("new game") || lowerReason.includes("switching") ? "unfinished" : "finished";
    const cloudLabel = record.pendingCloudSave ? " | saving..." : record.cloudSaveFailed ? " | local fallback" : "";
    opt.textContent = `${d} | ${record.mode} | ${record.difficulty || ""} | ${resultLabel} | winner: ${record.winner}${cloudLabel}`;
    historySelect.appendChild(opt);
  });
}

function selectedHistoryRecord() {
  const id = historySelect?.value;
  return getHistory().find(r => r.id === id) || null;
}

function applyReplayTo(index) {
  if (!currentReplay) return;
  board = initialBoard();
  capturedByRed = [];
  capturedByBlack = [];
  moveHistory = [];
  let terminalEvent = null;
  replayIndex = Math.max(0, Math.min(index, currentReplay.moves.length));
  for (let i = 0; i < replayIndex; i++) {
    const item = currentReplay.moves[i];
    if (item && item.event) {
      if (item.board) board = JSON.parse(JSON.stringify(item.board));
      moveHistory.push(currentReplay.movesText?.[i] || item.text || item.event);
      terminalEvent = item;
      continue;
    }
    const mv = item.move || item;
    if (!mv || !mv.from || !mv.to) continue;
    const p = board[mv.from.r][mv.from.c];
    const captured = board[mv.to.r][mv.to.c];
    if (captured) {
      if (colorOf(p) === RED) capturedByRed.push(captured);
      else capturedByBlack.push(captured);
    }
    board = makeMoveOnBoard(board, mv);
    moveHistory.push(currentReplay.movesText?.[i] || `${i + 1}. (${mv.from.r},${mv.from.c}) → (${mv.to.r},${mv.to.c})`);
  }
  turn = replayIndex % 2 === 0 ? RED : BLACK;
  selected = null; legalTargets = []; hintMove = null;
  gameOver = Boolean(terminalEvent) || replayIndex >= currentReplay.moves.length;
  updateStatus();
  if (terminalEvent) {
    statusEl.textContent = terminalEvent.text || (terminalEvent.winner === "none" ? "Unfinished game." : `${sideLabel(terminalEvent.winner)} wins.`);
    statusEl.style.color = terminalEvent.winner === RED ? "var(--red)" : terminalEvent.winner === BLACK ? "var(--black)" : "#6f5b2d";
  } else if (gameOver && currentReplay.winner) {
    statusEl.textContent = currentReplay.reason || `${sideLabel(currentReplay.winner)} wins.`;
    statusEl.style.color = currentReplay.winner === RED ? "var(--red)" : "var(--black)";
  }
  renderBoard(); renderMoves(); renderCaptured();
  if (replayStatus) {
    const endNote = terminalEvent ? ` — ${terminalEvent.event === "surrender" ? "game ended by surrender" : "unfinished game saved"}` : gameOver ? " — game ended" : "";
    replayStatus.textContent = `Replay ${replayIndex}/${currentReplay.moves.length} — ${currentReplay.mode}, winner: ${currentReplay.winner}${endNote}`;
  }
}

function loadSelectedReplay() {
  const rec = selectedHistoryRecord();
  if (!rec) return setHintText("No replay selected.");
  currentReplay = rec;
  replayIndex = 0;
  mode = "replay";
  if (appEl) {
    appEl.classList.add("replay-active");
    appEl.classList.add("replay-loaded");
  }
  updateModeButtons();
  showReplayControls(true);
  applyReplayTo(0);
  setHintText("Replay loaded. The replay board is now active below the Replay Center.");
}

function exitReplay() {
  currentReplay = null;
  replayIndex = 0;
  clearInterval(replayTimer); replayTimer = null;
  if (appEl) {
    appEl.classList.remove("replay-active");
    appEl.classList.remove("replay-loaded");
  }
  showReplayControls(false);
  mode = "two";
  updateModeButtons();
  resetGame();
}

async function analyzeReplayPosition() {
  if (!currentReplay) return setHintText("Load a replay first.");
  try {
    setHintText("Analyzing replay position with backend AI...");
    const move = await requestBackendAiMove(turn);
    if (move) {
      hintMove = move;
      renderBoard();
    }
  } catch (err) {
    console.error(err);
    setHintText("Analyze failed. Check backend URL and Render status.");
  }
}

async function deleteSelectedReplay() {
  const id = historySelect?.value;
  if (!id) return;
  if (!confirm("Delete this replay record?")) return;
  if (currentUser && !currentUser.visitor && supabaseClient) {
    const { error } = await supabaseClient.from("games").delete().eq("id", id);
    if (error) {
      console.warn("Cloud delete failed:", error);
      return setHintText("Cloud delete failed. Check Supabase RLS policy.");
    }
    cloudHistoryCache = cloudHistoryCache.filter(r => r.id !== id);
    renderHistoryList();
  } else {
    setHistory(getHistory().filter(r => r.id !== id));
    renderHistoryList();
  }
  showReplayControls(false);
  currentReplay = null;
  if (appEl) appEl.classList.remove("replay-loaded");
  if (replayStatus) replayStatus.textContent = "Replay deleted. Select another saved game.";
  setHintText("Replay deleted.");
}

function exportSelectedReplay() {
  const rec = selectedHistoryRecord();
  if (!rec) return setHintText("No replay selected.");
  const blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${rec.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function tone(freq, duration = 0.12, type = "sine", delay = 0, volume = 0.05) {
  if (!soundToggle || !soundToggle.checked) return;
  unlockAudio();
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

function speakChinese(text) {
  if (!voiceToggle || !voiceToggle.checked) return;
  if (!("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = text.length <= 1 ? 0.82 : 0.9;
    utterance.pitch = text === "將軍" ? 1.15 : 0.95;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => /zh|Chinese|Taiwan|Mandarin/i.test(v.lang + " " + v.name));
    if (zhVoice) utterance.voice = zhVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Chinese voice unavailable:", err);
  }
}

function playSound(kind) {
  if (!soundToggle || !soundToggle.checked) {
    if (kind === "capture") speakChinese("吃");
    if (kind === "check") speakChinese("將軍");
    return;
  }
  if (kind === "move") tone(420, 0.08, "triangle", 0, 0.035);
  if (kind === "capture") {
    tone(220, 0.10, "square", 0, 0.035);
    tone(145, 0.11, "sawtooth", 0.08, 0.03);
    speakChinese("吃");
  }
  if (kind === "check") {
    tone(760, 0.11, "triangle", 0, 0.045);
    tone(960, 0.13, "triangle", 0.11, 0.045);
    setTimeout(() => speakChinese("將軍"), 80);
  }
  if (kind === "win" || kind === "victory") {
    tone(392, 0.12, "sine", 0, 0.05);
    tone(523.25, 0.12, "sine", 0.12, 0.055);
    tone(659.25, 0.14, "sine", 0.24, 0.055);
    tone(783.99, 0.28, "triangle", 0.38, 0.06);
    setTimeout(() => speakChinese("勝利"), 150);
  }
  if (kind === "loss") {
    tone(392, 0.16, "triangle", 0, 0.045);
    tone(329.63, 0.18, "triangle", 0.18, 0.04);
    tone(261.63, 0.30, "sawtooth", 0.38, 0.035);
    setTimeout(() => speakChinese("失敗"), 150);
  }
  if (kind === "undo") tone(300, 0.11, "triangle", 0, 0.035);
}

function getMusicVolume() {
  if (!musicVolume) return 0.018;
  return Math.max(0, Math.min(0.08, Number(musicVolume.value || 28) / 100 * 0.065));
}

function musicNote(freq, start, duration, volume = 0.018) {
  if (!audioCtx || !musicGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function scheduleMusicBar() {
  if (!musicToggle || !musicToggle.checked || !audioCtx || !musicGain) return;

  const t = audioCtx.currentTime;
  const melody = [392, 440, 523.25, 587.33, 523.25, 440, 392, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 329.63, 392];
  const bass = [196, 196, 220, 220, 174.61, 174.61, 196, 196];
  const beat = 0.42;

  for (let i = 0; i < 8; i++) {
    const m = melody[(musicStep + i) % melody.length];
    const b = bass[Math.floor((musicStep + i) / 2) % bass.length];
    musicNote(m, t + i * beat, beat * 0.82, getMusicVolume());
    if (i % 2 === 0) musicNote(b, t + i * beat, beat * 1.55, getMusicVolume() * 0.48);
  }
  musicStep = (musicStep + 8) % melody.length;
}

function startBackgroundMusic() {
  if (!musicToggle || !musicToggle.checked) return;
  unlockAudio();
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 1;
    musicGain.connect(audioCtx.destination);
  }
  if (musicStarted) return;
  musicStarted = true;
  scheduleMusicBar();
  musicTimer = setInterval(scheduleMusicBar, 8 * 420 - 120);
}

function stopBackgroundMusic() {
  musicStarted = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

function syncBackgroundMusic() {
  if (musicToggle && musicToggle.checked) startBackgroundMusic();
  else stopBackgroundMusic();
}

function setHintText(text) {
  if (hintBox) hintBox.textContent = text;
}


function getBackendUrl() {
  if (!backendUrlInput) return "";
  return backendUrlInput.value.trim().replace(/\/$/, "");
}

function shouldUseBackendAi() {
  return Boolean(backendToggle && backendToggle.checked && getBackendUrl());
}

async function requestBackendAiMove(color) {
  const url = getBackendUrl();
  if (!url) throw new Error("Backend URL is empty.");

  const res = await fetch(`${url}/api/ai-move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      board,
      side: color,
      difficulty: difficultySelect.value
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.move) return null;
  if (data.reason) setHintText(`Backend AI：${data.reason} Score: ${Math.round(data.score ?? 0)}`);
  return data.move;
}


function setLiveStatus(text) {
  if (liveStatusEl) liveStatusEl.textContent = text;
}

function addChatLine(text, cls = "") {
  if (!chatBox) return;
  const div = document.createElement("div");
  div.className = `chat-line ${cls}`.trim();
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function backendHttpUrl() {
  const url = getBackendUrl();
  if (!url) return "";
  return url.replace(/\/$/, "");
}

async function refreshEngineStatus() {
  if (!shouldUseBackendAi()) return;
  try {
    const base = getBackendUrl();
    const res = await fetch(`${base}/api/engine-status`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.pikafish) {
      const msg = data.pikafish.configured
        ? `Master engine: Pikafish active (${data.pikafish.source}).`
        : "Master engine: Pikafish not installed yet; Master will use Expert fallback.";
      setHintText(msg);
    }
  } catch (err) {
    console.warn("Engine status unavailable", err);
  }
}

function backendWsUrl(roomId, name) {
  const base = backendHttpUrl();
  if (!base) throw new Error("Backend URL is empty.");
  const wsBase = base.startsWith("https://")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  return `${wsBase}/ws/${encodeURIComponent(roomId)}?name=${encodeURIComponent(name || "Guest")}&side=${encodeURIComponent(getPlayerSide())}`;
}

async function createLiveRoom() {
  const base = backendHttpUrl();
  if (!base) {
    setHintText("Enter your Render backend URL first.");
    return;
  }
  try {
    const res = await fetch(`${base}/api/create-room`);
    const data = await res.json();
    if (roomCodeInput) roomCodeInput.value = data.roomId;
    joinLiveRoom(data.roomId);
  } catch (err) {
    console.error(err);
    setHintText("Could not create room. Check backend URL and Render status.");
  }
}

async function quickMatch() {
  const base = backendHttpUrl();
  if (!base) return setHintText("Enter your Render backend URL first.");
  const name = ((playerNameInput && playerNameInput.value) || currentUser?.name || "Guest").trim() || "Guest";
  localStorage.setItem("xiangqiPlayerName", name);
  try {
    setHintText("Searching for opponent...");
    const res = await fetch(`${base}/api/quick-match?name=${encodeURIComponent(name)}&side=${encodeURIComponent(getPlayerSide())}`);
    const data = await res.json();
    if (roomCodeInput) roomCodeInput.value = data.roomId;
    joinLiveRoom(data.roomId);
    setHintText(data.matched ? "Opponent found. Joining match..." : "Waiting for opponent. Keep this page open.");
  } catch (err) {
    console.error(err);
    setHintText("Quick Match failed. Check backend URL and Render status.");
  }
}

function joinLiveRoom(roomId = null) {
  const code = (roomId || (roomCodeInput && roomCodeInput.value) || "").trim().toUpperCase();
  if (!code) {
    setHintText("Enter a room code or create a room first.");
    return;
  }
  const name = ((playerNameInput && playerNameInput.value) || "Guest").trim() || "Guest";
  localStorage.setItem("xiangqiPlayerName", name);
  if (roomCodeInput) roomCodeInput.value = code;
  leaveLiveRoom(false);
  mode = "online";
  updateModeButtons();
  try {
    liveSocket = new WebSocket(backendWsUrl(code, name));
  } catch (err) {
    setHintText(err.message);
    return;
  }
  liveRoomId = code;
  liveSide = "connecting";
  liveConnected = false;
  setLiveStatus(`Connecting to room ${code}...`);

  liveSocket.onopen = () => {
    liveConnected = true;
    setLiveStatus(`Connected to ${code}. Waiting for room assignment...`);
  };
  liveSocket.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    handleLiveMessage(msg);
  };
  liveSocket.onclose = () => {
    liveConnected = false;
    setLiveStatus("Disconnected from live room.");
  };
  liveSocket.onerror = () => {
    setLiveStatus("Live connection error. Check backend URL or Render logs.");
  };
}

function handleLiveMessage(msg) {
  if (msg.type === "joined") {
    liveRoomId = msg.roomId;
    liveSide = msg.side;
    setLiveStatus(`Room ${msg.roomId} — you are ${msg.side}. Share code: ${msg.roomId}`);
    renderBoard();
    addChatLine(`System: joined ${msg.roomId} as ${msg.side}.`, "system-chat");
    return;
  }
  if (msg.type === "state") {
    board = cloneBoard(msg.board);
    turn = msg.turn;
    moveHistory = [...(msg.moveHistory || [])];
    capturedByRed = [...(msg.capturedByRed || [])];
    capturedByBlack = [...(msg.capturedByBlack || [])];
    replayMoves = (msg.rawMoves || []).filter(x => x.move).map(x => ({ move: x.move, by: x.by, captured: x.captured, name: x.name }));
    const wasGameOver = gameOver;
    gameOver = Boolean(msg.gameOver);
    selected = null;
    legalTargets = [];
    hintMove = null;
    updateStatus();
    renderBoard();
    renderMoves();
    renderCaptured();
    if (gameOver && msg.winner && !wasGameOver) {
      const reason = `${sideLabel(msg.winner)} wins${msg.resultReason ? ` — ${msg.resultReason}` : ""}.`;
      showResultEffect(msg.winner, reason);
      const liveKey = `${msg.roomId}-${msg.winner}-${(msg.rawMoves || []).length}-${msg.resultReason || ""}`;
      if (savedLiveGameKey !== liveKey) {
        savedLiveGameKey = liveKey;
        saveMatchRecord(msg.winner, reason, { key: liveKey, mode: "online", roomId: msg.roomId });
      }
    }
    const players = msg.players || {};
    const redName = players.red || "waiting";
    const blackName = players.black || "waiting";
    setLiveStatus(`Room ${msg.roomId} | You: ${liveSide} | Red: ${redName} | Black: ${blackName}`);
    return;
  }
  if (msg.type === "chat") {
    const sideLabel = msg.side === RED ? "Red" : msg.side === BLACK ? "Black" : "Spectator";
    addChatLine(`${msg.name} (${sideLabel}): ${msg.message}`);
    return;
  }
  if (msg.type === "system") {
    addChatLine(`System: ${msg.message}`, "system-chat");
    return;
  }
  if (msg.type === "error") {
    addChatLine(`Error: ${msg.message}`, "error-chat");
    setHintText(msg.message);
  }
}

function leaveLiveRoom(updateUi = true) {
  if (liveSocket) {
    try { liveSocket.close(); } catch {}
  }
  liveSocket = null;
  liveConnected = false;
  liveSide = "offline";
  if (updateUi) setLiveStatus("Offline. Create or join a room to play online.");
}

function sendLiveMove(move) {
  if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) {
    setHintText("Live room is not connected.");
    return;
  }
  liveSocket.send(JSON.stringify({ type: "move", move }));
}

function sendLiveChat() {
  if (!chatInput) return;
  const message = chatInput.value.trim();
  if (!message) return;
  if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) {
    setHintText("Join a live room before chatting.");
    return;
  }
  liveSocket.send(JSON.stringify({ type: "chat", message }));
  chatInput.value = "";
}

function resetLiveRoom() {
  if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) {
    setHintText("Join a live room first.");
    return;
  }
  liveSocket.send(JSON.stringify({ type: "reset" }));
}

function sendLiveResign() {
  if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) {
    setHintText("Join a live room first.");
    return;
  }
  liveSocket.send(JSON.stringify({ type: "resign" }));
}

function showReplayControls(show) {
  if (replayControls) replayControls.classList.toggle("hidden", !show);
  if (replayIntro) replayIntro.classList.toggle("hidden", show);
}

function enterReplayMode() {
  leaveLiveRoom(false);
  mode = "replay";
  currentReplay = null;
  replayIndex = 0;
  clearInterval(replayTimer); replayTimer = null;
  if (replayPlayBtn) replayPlayBtn.textContent = "▶ Play";
  if (appEl) {
    appEl.classList.add("replay-active");
    appEl.classList.remove("replay-loaded");
  }
  updateModeButtons();
  renderHistoryList();
  showReplayControls(false);
  if (replayStatus) replayStatus.textContent = "Replay Center opened. Select a saved game, then press Load Replay.";
  setHintText("Replay Center opened. Choose a saved match first; the board appears after loading a replay.");
}

function updateModeButtons() {
  if (twoPlayerBtn) twoPlayerBtn.classList.toggle("active", mode === "two");
  if (aiBtn) aiBtn.classList.toggle("active", mode === "ai");
  if (onlineBtn) onlineBtn.classList.toggle("active", mode === "online");
  if (replayModeBtn) replayModeBtn.classList.toggle("active", mode === "replay");
  if (appEl) {
    appEl.classList.toggle("mode-two", mode === "two");
    appEl.classList.toggle("mode-ai", mode === "ai");
    appEl.classList.toggle("mode-online", mode === "online");
    appEl.classList.toggle("mode-replay", mode === "replay");
  }
}

function initialBoard() {
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[0] = ["bR", "bH", "bE", "bA", "bK", "bA", "bE", "bH", "bR"];
  empty[2][1] = "bC"; empty[2][7] = "bC";
  [0, 2, 4, 6, 8].forEach(c => empty[3][c] = "bP");
  empty[9] = ["rR", "rH", "rE", "rA", "rK", "rA", "rE", "rH", "rR"];
  empty[7][1] = "rC"; empty[7][7] = "rC";
  [0, 2, 4, 6, 8].forEach(c => empty[6][c] = "rP");
  return empty;
}

function resetGame() {
  board = initialBoard();
  turn = RED;
  selected = null;
  legalTargets = [];
  moveHistory = [];
  replayMoves = [];
  stateHistory = [];
  capturedByRed = [];
  capturedByBlack = [];
  lastMove = null;
  hintMove = null;
  aiThinking = false;
  gameOver = false;
  updateStatus();
  renderBoard();
  renderMoves();
  renderCaptured();
  setHintText("Board refreshed. Choose a mode above. Backend AI defaults to Render cloud and Master / Pikafish difficulty.");
}

function colorOf(piece) {
  if (!piece) return null;
  return piece[0] === "r" ? RED : BLACK;
}

function enemyOf(color) {
  return color === RED ? BLACK : RED;
}

function getPlayerSide() {
  return sideSelect && sideSelect.value === BLACK ? BLACK : RED;
}

function getAiSide() {
  return enemyOf(getPlayerSide());
}

function getViewSide() {
  if (mode === "online" && [RED, BLACK].includes(liveSide)) return liveSide;
  return getPlayerSide();
}

function actualToDisplay(r, c) {
  if (getViewSide() === BLACK) return { r: 9 - r, c: 8 - c };
  return { r, c };
}

function sideLabel(color) {
  return color === RED ? "Red / 紅方" : "Black / 黑方";
}

function perspectiveSideForResult() {
  if (mode === "ai") return getPlayerSide();
  if (mode === "online" && [RED, BLACK].includes(liveSide)) return liveSide;
  return null;
}

function clearResultEffect() {
  const old = document.querySelector(".result-effect");
  if (old) old.remove();
  lastAnnouncedResult = null;
}

function showResultEffect(winner, reason = "") {
  if (!winner) return;
  const key = `${mode}-${winner}-${reason}-${moveHistory.length}`;
  if (lastAnnouncedResult === key) return;
  lastAnnouncedResult = key;

  const viewSide = perspectiveSideForResult();
  const isVictory = viewSide ? winner === viewSide : true;
  const isLoss = viewSide ? winner !== viewSide : false;
  const cls = isVictory ? "victory" : isLoss ? "defeat" : "neutral";
  const title = isVictory ? "勝利 Victory" : isLoss ? "失敗 Defeat" : `${sideLabel(winner)} wins`;
  const subtitle = reason || `${sideLabel(winner)} wins.`;

  document.querySelectorAll(".result-effect").forEach(el => el.remove());
  const overlay = document.createElement("div");
  overlay.className = `result-effect ${cls}`;
  overlay.innerHTML = `
    <div class="result-card">
      <div class="result-burst">${isVictory ? "🏆" : isLoss ? "☗" : "🎉"}</div>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      <button type="button" class="result-close">Continue</button>
    </div>
  `;
  overlay.querySelector(".result-close").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);

  playSound(isLoss ? "loss" : "victory");
  setTimeout(() => overlay.classList.add("show"), 20);
}

function finishGame(winner, reason = "", saveExtra = {}) {
  gameOver = true;
  selected = null;
  legalTargets = [];
  hintMove = null;
  statusEl.textContent = reason || `${sideLabel(winner)} wins!`;
  statusEl.style.color = winner === RED ? "var(--red)" : "var(--black)";
  renderBoard();
  renderMoves();
  renderCaptured();
  showResultEffect(winner, reason);
  saveMatchRecord(winner, reason, saveExtra);
}

function maybeStartAiTurn(delay = 450) {
  if (mode === "ai" && !gameOver && !aiThinking && turn === getAiSide()) {
    aiThinking = true;
    setTimeout(aiMove, delay);
  }
}

function inBoard(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 9;
}

function cloneBoard(src) {
  return src.map(row => [...row]);
}

function snapshotState() {
  return {
    board: cloneBoard(board),
    turn,
    selected: selected ? { ...selected } : null,
    legalTargets: legalTargets.map(pos => ({ ...pos })),
    moveHistory: [...moveHistory],
    replayMoves: replayMoves.map(x => JSON.parse(JSON.stringify(x))),
    capturedByRed: [...capturedByRed],
    capturedByBlack: [...capturedByBlack],
    gameOver,
    lastMove: lastMove ? { from: { ...lastMove.from }, to: { ...lastMove.to } } : null,
    hintMove: null
  };
}

function restoreState(state) {
  board = cloneBoard(state.board);
  turn = state.turn;
  selected = state.selected;
  legalTargets = state.legalTargets;
  moveHistory = [...state.moveHistory];
  replayMoves = (state.replayMoves || []).map(x => JSON.parse(JSON.stringify(x)));
  capturedByRed = [...state.capturedByRed];
  capturedByBlack = [...state.capturedByBlack];
  gameOver = state.gameOver;
  lastMove = state.lastMove;
  hintMove = null;
  aiThinking = false;
  updateStatus();
  renderBoard();
  renderMoves();
  renderCaptured();
  setHintText("Undo complete.");
}

function makeMoveOnBoard(src, move) {
  const next = cloneBoard(src);
  next[move.to.r][move.to.c] = next[move.from.r][move.from.c];
  next[move.from.r][move.from.c] = null;
  return next;
}

function samePos(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

function isInPalace(color, r, c) {
  if (c < 3 || c > 5) return false;
  if (color === RED) return r >= 7 && r <= 9;
  return r >= 0 && r <= 2;
}

function crossedRiver(color, r) {
  return color === RED ? r <= 4 : r >= 5;
}

function pushIfValid(moves, from, r, c, color) {
  if (!inBoard(r, c)) return;
  const target = board[r][c];
  if (!target || colorOf(target) !== color) {
    moves.push({ from, to: { r, c } });
  }
}

function rawMovesForPiece(r, c, customBoard = board) {
  const oldBoard = board;
  board = customBoard;
  const piece = board[r][c];
  if (!piece) {
    board = oldBoard;
    return [];
  }
  const color = colorOf(piece);
  const type = piece[1];
  const from = { r, c };
  const moves = [];

  if (type === "K") {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (isInPalace(color, nr, nc)) pushIfValid(moves, from, nr, nc, color);
    });

    // Flying general rule: king may capture directly if no pieces between.
    const dc = c;
    for (let nr = color === RED ? r - 1 : r + 1; inBoard(nr, dc); nr += color === RED ? -1 : 1) {
      const p = board[nr][dc];
      if (p) {
        if (p[1] === "K" && colorOf(p) !== color) moves.push({ from, to: { r: nr, c: dc } });
        break;
      }
    }
  }

  if (type === "A") {
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (isInPalace(color, nr, nc)) pushIfValid(moves, from, nr, nc, color);
    });
  }

  if (type === "E") {
    [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      const eyeR = r + dr / 2, eyeC = c + dc / 2;
      const staysSide = color === RED ? nr >= 5 : nr <= 4;
      if (inBoard(nr, nc) && staysSide && !board[eyeR][eyeC]) {
        pushIfValid(moves, from, nr, nc, color);
      }
    });
  }

  if (type === "H") {
    const candidates = [
      [-2,-1,-1,0], [-2,1,-1,0], [2,-1,1,0], [2,1,1,0],
      [-1,-2,0,-1], [1,-2,0,-1], [-1,2,0,1], [1,2,0,1]
    ];
    candidates.forEach(([dr, dc, legR, legC]) => {
      const nr = r + dr, nc = c + dc;
      if (inBoard(nr, nc) && !board[r + legR][c + legC]) {
        pushIfValid(moves, from, nr, nc, color);
      }
    });
  }

  if (type === "R") {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
      let nr = r + dr, nc = c + dc;
      while (inBoard(nr, nc)) {
        if (!board[nr][nc]) {
          moves.push({ from, to: { r: nr, c: nc } });
        } else {
          if (colorOf(board[nr][nc]) !== color) moves.push({ from, to: { r: nr, c: nc } });
          break;
        }
        nr += dr; nc += dc;
      }
    });
  }

  if (type === "C") {
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
      let nr = r + dr, nc = c + dc;
      let screenFound = false;
      while (inBoard(nr, nc)) {
        if (!screenFound) {
          if (!board[nr][nc]) {
            moves.push({ from, to: { r: nr, c: nc } });
          } else {
            screenFound = true;
          }
        } else {
          if (board[nr][nc]) {
            if (colorOf(board[nr][nc]) !== color) moves.push({ from, to: { r: nr, c: nc } });
            break;
          }
        }
        nr += dr; nc += dc;
      }
    });
  }

  if (type === "P") {
    const forward = color === RED ? -1 : 1;
    pushIfValid(moves, from, r + forward, c, color);
    if (crossedRiver(color, r)) {
      pushIfValid(moves, from, r, c - 1, color);
      pushIfValid(moves, from, r, c + 1, color);
    }
  }

  board = oldBoard;
  return moves;
}

function findKing(src, color) {
  const king = color === RED ? "rK" : "bK";
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (src[r][c] === king) return { r, c };
    }
  }
  return null;
}

function kingsFacing(src) {
  const redKing = findKing(src, RED);
  const blackKing = findKing(src, BLACK);
  if (!redKing || !blackKing || redKing.c !== blackKing.c) return false;
  const c = redKing.c;
  for (let r = blackKing.r + 1; r < redKing.r; r++) {
    if (src[r][c]) return false;
  }
  return true;
}

function isInCheck(src, color) {
  if (kingsFacing(src)) return true;
  const king = findKing(src, color);
  if (!king) return true;
  const opponent = enemyOf(color);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = src[r][c];
      if (p && colorOf(p) === opponent) {
        const attacks = rawMovesForPiece(r, c, src);
        if (attacks.some(m => samePos(m.to, king))) return true;
      }
    }
  }
  return false;
}

function legalMovesForPiece(r, c, src = board) {
  const p = src[r][c];
  if (!p) return [];
  const color = colorOf(p);
  const raw = rawMovesForPiece(r, c, src);
  return raw.filter(move => !isInCheck(makeMoveOnBoard(src, move), color));
}

function allLegalMoves(color, src = board) {
  const moves = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = src[r][c];
      if (p && colorOf(p) === color) {
        moves.push(...legalMovesForPiece(r, c, src));
      }
    }
  }
  return moves;
}

function boardPosition(r, c) {
  const x = 12.5 + c * 9.375;
  const y = 5 + r * 10;
  return { left: `${x}%`, top: `${y}%` };
}

function renderGrid() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "board-grid");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");

  const xs = Array.from({ length: 9 }, (_, c) => 12.5 + c * 9.375);
  const ys = Array.from({ length: 10 }, (_, r) => 5 + r * 10);

  const addLine = (x1, y1, x2, y2, cls = "") => {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    if (cls) line.setAttribute("class", cls);
    svg.appendChild(line);
  };

  // 10 horizontal lines, from left border to right border.
  ys.forEach(y => addLine(xs[0], y, xs[8], y));

  // Left and right borders are continuous.
  addLine(xs[0], ys[0], xs[0], ys[9]);
  addLine(xs[8], ys[0], xs[8], ys[9]);

  // Inner vertical lines stop at the river, which is the correct Xiangqi board style.
  for (let c = 1; c <= 7; c++) {
    addLine(xs[c], ys[0], xs[c], ys[4]);
    addLine(xs[c], ys[5], xs[c], ys[9]);
  }

  // Palace diagonals: exact corner-to-corner lines.
  addLine(xs[3], ys[0], xs[5], ys[2], "palace-diagonal");
  addLine(xs[5], ys[0], xs[3], ys[2], "palace-diagonal");
  addLine(xs[3], ys[7], xs[5], ys[9], "palace-diagonal");
  addLine(xs[5], ys[7], xs[3], ys[9], "palace-diagonal");

  return svg;
}

function renderBoard() {
  boardEl.innerHTML = "";

  boardEl.appendChild(renderGrid());

  const river = document.createElement("div");
  river.className = "river";
  river.textContent = "楚河　漢界";
  boardEl.appendChild(river);

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const point = document.createElement("div");
      point.className = "point";
      const display = actualToDisplay(r, c);
      const pos = boardPosition(display.r, display.c);
      point.style.left = pos.left;
      point.style.top = pos.top;
      point.dataset.r = r;
      point.dataset.c = c;

      if (selected && selected.r === r && selected.c === c) point.classList.add("selected");
      if (legalTargets.some(pos => pos.r === r && pos.c === c)) point.classList.add("highlight");
      if (lastMove && (samePos(lastMove.from, { r, c }) || samePos(lastMove.to, { r, c }))) point.classList.add("last-move");
      if (hintMove && samePos(hintMove.from, { r, c })) point.classList.add("hint-from");
      if (hintMove && samePos(hintMove.to, { r, c })) point.classList.add("hint-to");

      const piece = board[r][c];
      if (piece) {
        const pieceEl = document.createElement("div");
        pieceEl.className = `piece ${colorOf(piece)}`;
        pieceEl.textContent = pieceNames[piece];
        point.appendChild(pieceEl);
      }

      point.addEventListener("click", () => handlePointClick(r, c));
      boardEl.appendChild(point);
    }
  }
}

function handlePointClick(r, c) {
  unlockAudio();
  if (mode === "replay") { setHintText(currentReplay ? "Replay mode is read-only. Click Exit Replay to play." : "Replay Center is read-only. Load a replay or choose another game mode."); return; }
  syncBackgroundMusic();
  if (gameOver || aiThinking) return;
  if (mode === "ai" && turn !== getPlayerSide()) return;
  if (mode === "online") {
    if (!liveConnected || ![RED, BLACK].includes(liveSide)) {
      setHintText("Join a live room as Red or Black before moving.");
      return;
    }
    if (turn !== liveSide) {
      setHintText("Waiting for the other player.");
      return;
    }
  }
  hintMove = null;

  const piece = board[r][c];

  if (!selected) {
    if (piece && colorOf(piece) === turn) selectPiece(r, c);
    return;
  }

  const move = legalTargets.find(pos => pos.r === r && pos.c === c);
  if (move) {
    const fullMove = { from: selected, to: { r, c } };
    selected = null;
    legalTargets = [];
    if (mode === "online") {
      sendLiveMove(fullMove);
      renderBoard();
      return;
    }
    movePiece(fullMove);
    renderBoard();
    maybeStartAiTurn(450);
    return;
  }

  if (piece && colorOf(piece) === turn) {
    selectPiece(r, c);
  } else {
    selected = null;
    legalTargets = [];
    renderBoard();
  }
}

function selectPiece(r, c) {
  selected = { r, c };
  legalTargets = legalMovesForPiece(r, c).map(m => m.to);
  renderBoard();
}

function moveToText(move, captured) {
  const p = board[move.from.r][move.from.c];
  const name = pieceNames[p];
  const side = colorOf(p) === RED ? "紅" : "黑";
  const cap = captured ? ` 吃 ${pieceNames[captured]}` : "";
  return `${side} ${name}: (${move.from.r},${move.from.c}) → (${move.to.r},${move.to.c})${cap}`;
}

function movePiece(move, options = {}) {
  const moving = board[move.from.r][move.from.c];
  const captured = board[move.to.r][move.to.c];
  if (!moving) return;

  if (!options.skipSnapshot) stateHistory.push(snapshotState());

  moveHistory.push(moveToText(move, captured));
  replayMoves.push({ move: JSON.parse(JSON.stringify(move)), by: colorOf(moving), piece: moving, captured });
  board[move.to.r][move.to.c] = moving;
  board[move.from.r][move.from.c] = null;
  lastMove = { from: { ...move.from }, to: { ...move.to } };
  hintMove = null;

  if (captured) {
    if (colorOf(moving) === RED) capturedByRed.push(captured);
    else capturedByBlack.push(captured);
  }

  if (captured && captured[1] === "K") {
    const winner = colorOf(moving);
    finishGame(winner, `${sideLabel(winner)} wins by capturing the king!`);
    return;
  }

  turn = enemyOf(turn);
  const opponentMoves = allLegalMoves(turn);
  if (opponentMoves.length === 0) {
    const winner = turn === RED ? BLACK : RED;
    finishGame(winner, `${sideLabel(turn)} has no legal moves. ${sideLabel(winner)} wins!`);
  } else {
    updateStatus();
    if (isInCheck(board, turn)) playSound("check");
    else playSound(captured ? "capture" : "move");
  }
  renderMoves();
  renderCaptured();
}

function renderCaptured() {
  const render = arr => arr.length
    ? arr.map(p => `<span class="captured-piece ${colorOf(p)}">${pieceNames[p]}</span>`).join(" ")
    : "None";
  redCapturedEl.innerHTML = render(capturedByRed);
  blackCapturedEl.innerHTML = render(capturedByBlack);
}

function undoOnce() {
  const previous = stateHistory.pop();
  if (!previous) return false;
  restoreState(previous);
  return true;
}

function undoMove() {
  unlockAudio();
  if (mode === "online") {
    setHintText("Undo is local-only for now. In Live Battle, use Reset Room or agree in chat.");
    return;
  }
  if (aiThinking) return;
  if (!stateHistory.length) {
    setHintText("No move to undo yet.");
    return;
  }
  if (mode === "ai" && turn === getPlayerSide() && moveHistory.length >= 2) {
    undoOnce();
    undoOnce();
  } else {
    undoOnce();
  }
  playSound("undo");
}

function updateStatus() {
  const checkText = isInCheck(board, turn) ? " — Check!" : "";
  if (mode === "ai") {
    const side = turn === RED ? "Red" : "Black";
    statusEl.textContent = turn === getPlayerSide() ? `Your turn, ${side}${checkText}` : `AI thinking, ${side}${checkText}`;
  } else if (mode === "online") {
    const you = liveSide === turn ? "Your turn" : "Waiting";
    statusEl.textContent = `${you} — ${turn === RED ? "Red" : "Black"} to move${checkText}`;
  } else {
    statusEl.textContent = `${turn === RED ? "Red" : "Black"} to move${checkText}`;
  }
  statusEl.style.color = turn === RED ? "var(--red)" : "var(--black)";
}

function renderMoves() {
  moveListEl.innerHTML = "";
  moveHistory.slice().reverse().forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    moveListEl.appendChild(li);
  });
}

function evaluateMoveForColor(move, color, src = board) {
  const target = src[move.to.r][move.to.c];
  let score = 0;
  if (target) score += pieceValue[target[1]] * 10;

  const moving = src[move.from.r][move.from.c];
  const next = makeMoveOnBoard(src, move);
  const opponent = enemyOf(color);
  if (isInCheck(next, opponent)) score += 80;

  // Avoid moving into squares that can be captured immediately.
  if (difficultySelect.value === "hard" || difficultySelect.value === "expert") {
    const replies = allLegalMoves(opponent, next);
    const danger = replies.some(reply => reply.to.r === move.to.r && reply.to.c === move.to.c);
    if (danger && moving) score -= pieceValue[moving[1]] * 2;

    // Light material evaluation after this move.
    score += evaluateBoardMaterial(next, color) * 0.05;
  }

  // Encourage center activity a little.
  score += 10 - Math.abs(move.to.c - 4);
  score += Math.random() * 20;
  return score;
}

function evaluateBoardMaterial(src, color) {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = src[r][c];
      if (!p) continue;
      score += (colorOf(p) === color ? 1 : -1) * pieceValue[p[1]];
    }
  }
  return score;
}

function chooseMove(color) {
  const moves = allLegalMoves(color);
  if (moves.length === 0) return null;
  if (difficultySelect.value === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  moves.sort((a, b) => evaluateMoveForColor(b, color) - evaluateMoveForColor(a, color));
  return moves[0];
}

function showHint() {
  unlockAudio();
  if (gameOver || aiThinking) return;
  const color = turn;
  if (mode === "ai" && color !== getPlayerSide()) return;
  const move = chooseMove(color);
  if (!move) {
    setHintText("No legal hint available.");
    return;
  }
  hintMove = move;
  const piece = board[move.from.r][move.from.c];
  const target = board[move.to.r][move.to.c];
  const cap = target ? `，可以吃 ${pieceNames[target]}` : "";
  setHintText(`Hint：${pieceNames[piece]} from (${move.from.r},${move.from.c}) to (${move.to.r},${move.to.c})${cap}`);
  renderBoard();
}

async function aiMove() {
  const aiSide = getAiSide();
  if (gameOver || turn !== aiSide) {
    aiThinking = false;
    return;
  }

  let move = null;
  try {
    if (shouldUseBackendAi()) {
      setHintText("Backend AI thinking...");
      move = await requestBackendAiMove(aiSide);
    }
  } catch (err) {
    console.error(err);
    setHintText("Backend AI failed, using local fallback AI. Check backend URL / CORS / deployment.");
  }

  aiThinking = false;
  if (!move) move = chooseMove(aiSide);
  if (!move) return;

  // Safety check: only accept backend move if it is legal in the frontend rule engine too.
  const legal = allLegalMoves(aiSide).some(m =>
    samePos(m.from, move.from) && samePos(m.to, move.to)
  );
  if (!legal) {
    setHintText("Backend returned an illegal move, using local fallback AI.");
    move = chooseMove(aiSide);
  }

  movePiece(move);
  renderBoard();
}

function hasActiveGameProgress() {
  return Boolean(moveHistory.length || replayMoves.length || stateHistory.length || liveConnected || mode === "replay");
}

function confirmModeSwitch(targetModeLabel) {
  if (!hasActiveGameProgress()) return true;
  if (gameOver && mode !== "online" && mode !== "replay") return true;
  return confirm(`Switch to ${targetModeLabel}? The current board will reset. You will be asked whether to save a replay if this game has moves.`);
}

function prepareModeSwitch() {
  leaveLiveRoom(false);
  currentReplay = null;
  clearInterval(replayTimer);
  replayTimer = null;
  if (replayPlayBtn) replayPlayBtn.textContent = "▶ Play";
  if (appEl) {
    appEl.classList.remove("replay-active");
    appEl.classList.remove("replay-loaded");
  }
  showReplayControls(false);
  selected = null;
  legalTargets = [];
  hintMove = null;
}

twoPlayerBtn.addEventListener("click", async () => {
  if (mode === "two") return;
  if (!confirmModeSwitch("Local 2 Player")) return;
  await saveUnfinishedReplayBeforeLeaving("mode_switch");
  prepareModeSwitch();
  mode = "two";
  updateModeButtons();
  resetGame();
});

aiBtn.addEventListener("click", async () => {
  if (mode === "ai") return;
  if (!confirmModeSwitch("Play vs AI")) return;
  await saveUnfinishedReplayBeforeLeaving("mode_switch");
  prepareModeSwitch();
  mode = "ai";
  updateModeButtons();
  resetGame();
  maybeStartAiTurn(450);
});

if (onlineBtn) {
  onlineBtn.addEventListener("click", async () => {
    if (mode === "online") return;
    if (!confirmModeSwitch("Live Battle")) return;
    await saveUnfinishedReplayBeforeLeaving("mode_switch");
    prepareModeSwitch();
    mode = "online";
    updateModeButtons();
    resetGame();
    setHintText("Live Battle mode: create or join a room on the right panel.");
    updateStatus();
  });
}

undoBtn.addEventListener("click", undoMove);
hintBtn.addEventListener("click", showHint);
difficultySelect.addEventListener("change", () => {
  localStorage.setItem("xiangqiDifficulty", difficultySelect.value);
  setHintText(`AI difficulty set to ${difficultySelect.options[difficultySelect.selectedIndex].text}.`);
  if (difficultySelect.value === "master") refreshEngineStatus();
});
if (backendUrlInput) {
  backendUrlInput.addEventListener("change", () => {
    localStorage.setItem("xiangqiBackendUrl", getBackendUrl());
    setHintText("Backend URL saved.");
  });
}
if (backendToggle) {
  backendToggle.addEventListener("change", () => {
    localStorage.setItem("xiangqiBackendEnabled", backendToggle.checked ? "true" : "false");
    setHintText(backendToggle.checked ? "Backend AI enabled." : "Backend AI disabled. Local AI will be used.");
  });
}
if (soundToggle) {
  soundToggle.addEventListener("change", () => {
    localStorage.setItem("xiangqiSoundEnabled", soundToggle.checked ? "true" : "false");
    setHintText(soundToggle.checked ? "Sound effects enabled." : "Sound effects muted.");
  });
}
if (voiceToggle) {
  voiceToggle.addEventListener("change", () => {
    localStorage.setItem("xiangqiVoiceEnabled", voiceToggle.checked ? "true" : "false");
    setHintText(voiceToggle.checked ? "Chinese voice enabled：吃、將軍." : "Chinese voice muted.");
  });
}
if (musicToggle) {
  musicToggle.addEventListener("change", () => {
    localStorage.setItem("xiangqiMusicEnabled", musicToggle.checked ? "true" : "false");
    syncBackgroundMusic();
    setHintText(musicToggle.checked ? "Background music enabled. Use the checkbox again to mute it." : "Background music muted.");
  });
}
if (musicVolume) {
  musicVolume.addEventListener("input", () => {
    localStorage.setItem("xiangqiMusicVolume", musicVolume.value);
  });
}

if (sideSelect) {
  sideSelect.addEventListener("change", () => {
    localStorage.setItem("xiangqiPlayerSide", getPlayerSide());
    setHintText(`Side / POV set to ${sideLabel(getPlayerSide())}.`);
    if (mode === "online" && liveConnected) {
      setHintText("Side choice will apply when you create/join the next live room. Leave and rejoin to switch sides.");
    }
    renderBoard();
    updateStatus();
    if (mode === "ai") {
      resetGame();
      maybeStartAiTurn(450);
    }
  });
}

function surrenderGame() {
  if (gameOver) return;
  if (mode === "online") {
    if (!liveConnected || ![RED, BLACK].includes(liveSide)) {
      setHintText("Only an active live player can surrender.");
      return;
    }
    if (!confirm("Confirm surrender? This will give the win to your opponent.")) return;
    sendLiveResign();
    return;
  }
  const loser = mode === "ai" ? getPlayerSide() : turn;
  const winner = enemyOf(loser);
  if (!confirm(`${sideLabel(loser)} surrender?`)) return;
  ensureReplayUserForLocalSave();
  const surrenderText = `${loser === RED ? "紅方" : "黑方"} 投降，${winner === RED ? "紅方" : "黑方"}獲勝`;
  moveHistory.push(surrenderText);
  replayMoves.push({
    event: "surrender",
    loser,
    winner,
    text: surrenderText,
    board: JSON.parse(JSON.stringify(board)),
    createdAt: new Date().toISOString()
  });
  finishGame(winner, `${sideLabel(loser)} surrendered. ${sideLabel(winner)} wins!`, { forceSave: true, endEvent: "surrender" });
}

if (surrenderBtn) surrenderBtn.addEventListener("click", surrenderGame);

if (playerNameInput) {
  playerNameInput.value = savedPlayerName || `Player${Math.floor(Math.random() * 900 + 100)}`;
  playerNameInput.addEventListener("change", () => localStorage.setItem("xiangqiPlayerName", playerNameInput.value.trim()));
}
if (createRoomBtn) createRoomBtn.addEventListener("click", createLiveRoom);
if (joinRoomBtn) joinRoomBtn.addEventListener("click", () => joinLiveRoom());
if (leaveRoomBtn) leaveRoomBtn.addEventListener("click", () => leaveLiveRoom(true));
if (resetRoomBtn) resetRoomBtn.addEventListener("click", async () => {
  await saveUnfinishedReplayBeforeLeaving("new_game");
  resetLiveRoom();
});
if (quickMatchBtn) quickMatchBtn.addEventListener("click", quickMatch);
if (sendChatBtn) sendChatBtn.addEventListener("click", sendLiveChat);
if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendLiveChat();
  });
}


if (loginBtn) loginBtn.addEventListener("click", loginLocalUser);
if (signupBtn) signupBtn.addEventListener("click", signupLocalUser);
if (visitorBtn) visitorBtn.addEventListener("click", enterVisitorMode);
if (forgotPasswordBtn) forgotPasswordBtn.addEventListener("click", sendPasswordResetEmail);
if (ingameLoginBtn) ingameLoginBtn.addEventListener("click", openLoginFromGame);
if (cancelAuthBtn) cancelAuthBtn.addEventListener("click", closeLoginOverlayToGame);
if (updatePasswordBtn) updatePasswordBtn.addEventListener("click", updatePasswordFromRecovery);
if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
if (switchAccountBtn) switchAccountBtn.addEventListener("click", switchAccount);
if (replayModeBtn) replayModeBtn.addEventListener("click", async () => {
  if (mode === "replay") return;
  if (!confirmModeSwitch("Replay Center")) return;
  await saveUnfinishedReplayBeforeLeaving("mode_switch");
  enterReplayMode();
});
if (historyBtn) historyBtn.addEventListener("click", async () => {
  if (mode !== "replay") await saveUnfinishedReplayBeforeLeaving("mode_switch");
  enterReplayMode();
});
if (loadReplayBtn) loadReplayBtn.addEventListener("click", loadSelectedReplay);
if (deleteReplayBtn) deleteReplayBtn.addEventListener("click", deleteSelectedReplay);
if (exportReplayBtn) exportReplayBtn.addEventListener("click", exportSelectedReplay);
if (replayFirstBtn) replayFirstBtn.addEventListener("click", () => applyReplayTo(0));
if (replayPrevBtn) replayPrevBtn.addEventListener("click", () => applyReplayTo(replayIndex - 1));
if (replayNextBtn) replayNextBtn.addEventListener("click", () => applyReplayTo(replayIndex + 1));
if (replayLastBtn) replayLastBtn.addEventListener("click", () => currentReplay && applyReplayTo(currentReplay.moves.length));
if (analyzeReplayBtn) analyzeReplayBtn.addEventListener("click", analyzeReplayPosition);
if (exitReplayBtn) exitReplayBtn.addEventListener("click", exitReplay);
if (exitReplayTopBtn) exitReplayTopBtn.addEventListener("click", exitReplay);
if (replayPlayBtn) replayPlayBtn.addEventListener("click", () => {
  if (!currentReplay) return setHintText("Load a replay first.");
  if (replayTimer) { clearInterval(replayTimer); replayTimer = null; replayPlayBtn.textContent = "▶ Play"; return; }
  replayPlayBtn.textContent = "⏸ Pause";
  replayTimer = setInterval(() => {
    if (!currentReplay || replayIndex >= currentReplay.moves.length) {
      clearInterval(replayTimer); replayTimer = null; replayPlayBtn.textContent = "▶ Play"; return;
    }
    applyReplayTo(replayIndex + 1);
  }, 750);
});

resetBtn.addEventListener("click", async () => {
  if (mode === "online" && liveConnected) {
    await saveUnfinishedReplayBeforeLeaving("new_game");
    resetLiveRoom();
  } else if (mode === "replay") {
    exitReplay();
  } else {
    await saveUnfinishedReplayBeforeLeaving("new_game");
    resetGame();
    maybeStartAiTurn(450);
  }
});

initializeAuth();
resetGame();
updateModeButtons();
refreshEngineStatus();
