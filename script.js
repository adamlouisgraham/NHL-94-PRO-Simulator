// =========================================================
// NHL '94 PRO SIMULATOR - MASTER JAVASCRIPT ENGINE
// =========================================================
// =========================================================
// 1. CORE UTILITIES (Must be defined first)
// =========================================================

const $ = (id) => document.getElementById(id);
const getGradeMod = (grade) => { 
    const m = { 
        'A+': 1.65, 'A': 1.40, 'A-': 1.25, 
        'B+': 1.15, 'B': 1.00, 'B-': 0.95, 
        'C+': 0.90, 'C': 0.80, 'C-': 0.70, 
        'D': 0.50, 'F': 0.15 
    }; 
    return m[grade] || 0.80; 
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gradeToNumber(grade) {
    switch (grade) {
        case 'A+': return getRandomInt(97, 99);
        case 'A':  return getRandomInt(91, 96);
        case 'A-': return getRandomInt(86, 90);
        case 'B+': return getRandomInt(81, 85);
        case 'B':  return getRandomInt(75, 80);
        case 'B-': return getRandomInt(69, 74);
        case 'C+': return getRandomInt(64, 68);
        case 'C':  return getRandomInt(58, 63);
        case 'C-': return getRandomInt(52, 57);
        case 'D+': return getRandomInt(46, 51);
        case 'D':  return getRandomInt(40, 45);
        case 'D-': return getRandomInt(34, 39);
        case 'F':  return getRandomInt(30, 33);
        default:   return 30; // Fallback for empty or invalid data
    }
}
// ==========================================
// 🏒 GLOBAL ATTRIBUTE & ARCHETYPE UTILITIES
// ==========================================

// Attribute Getters: Handle potential naming inconsistencies in spreadsheet headers
const getOff = (pName) => parseInt(playerStats[pName]?.attr.off || playerStats[pName]?.attr.OFF || 0);
const getDef = (pName) => parseInt(playerStats[pName]?.attr.def || playerStats[pName]?.attr.DEF || 0);
const getChk = (pName) => parseInt(playerStats[pName]?.attr.chk || playerStats[pName]?.attr.CHK || 0);
const getWgt = (pName) => getGradeMod(playerStats[pName]?.attr.weight || 'C'); // Column AC

/**
 * 🛡️ THE ARCHETYPE FIREWALL
 * Prevents stacking 2 Snipers or 2 Playmakers on the same unit
 */
function canAddForward(player, line, lineType = 'EV') {
    // 1. PP Exception: Disable the firewall for Power Play lines. Let them stack!
    if (lineType === 'PP') {
        return true; 
    }

    // 2. Standard Firewall checks for Even Strength / PK
    // Extract tags from the current line array
    const lineTags = line.map(p => {
        let stats = getPlayerWeightedStats(p.name);
        return stats ? stats.tag : '';
    });

    const hasSniper = lineTags.includes('SNIPER') || lineTags.includes('SN');
    const hasPlaymaker = lineTags.includes('PLAYMAKER') || lineTags.includes('PL');

    const pStats = getPlayerWeightedStats(player.name);
    const playerTag = pStats ? pStats.tag : '';
    const isSniper = playerTag === 'SNIPER' || playerTag === 'SN';
    const isPlaymaker = playerTag === 'PLAYMAKER' || playerTag === 'PL';

    // Reject if trying to add a duplicate archetype to an Even Strength line
    if (hasSniper && isSniper) return false;
    if (hasPlaymaker && isPlaymaker) return false;

    return true;
}

let awardConfig = { streaks: true, chemistry: true, rivalries: true, aging: false, draft: false, retirements: false, headlines: true, milestones: true, injuries: true, legacy_schedule: true, trades: false };
let league = []; let rosters = {}; let playerStats = {}; let tradeLog = []; let hallOfFame = []; let leagueHistory = []; let retiredPlayers = []; let calendar = []; let realDatesMap = []; let gameMilestones = []; let monthSnapshot = {}; let pendingTrades = []; let playoffBracket = { round: 1, series: [] };
let currentDay = 0; let currentSeason = 1; let isPlayoffs = false; let isASG = false; let activeIdx = null; let statMode = 'season'; let isSimulating = false; let isSimSeason = false; let isTurboMode = false; let currentCupChamp = ""; let activeSubInfo = null; let customRosterData = null; let customRosterSource = 'google'; let customTeamData = null; let customPlayerData = null; let customScheduleData = null; let customEventLogData = null; let eventLogData = null;

const SAVE_STORAGE_KEY = 'nhl94dynasty'; const HISTORY_STORAGE_KEY = 'nhl94history'; const HOF_STORAGE_KEY = 'nhl94hof'; const RETIRED_STORAGE_KEY = 'nhl94retired';
const SAVE_SLOT_KEYS = { AUTO: SAVE_STORAGE_KEY, SLOT_1: `${SAVE_STORAGE_KEY}_slot1`, SLOT_2: `${SAVE_STORAGE_KEY}_slot2`, SLOT_3: `${SAVE_STORAGE_KEY}_slot3` };
const LEGACY_SAVE_VERSION = 1; const CURRENT_SAVE_SCHEMA_VERSION = 2; const SUPPORTED_SAVE_VERSIONS = [LEGACY_SAVE_VERSION, CURRENT_SAVE_SCHEMA_VERSION];
let saveGameTimer = null;

// --- SAVE & LOAD ENGINE ---
function getSaveSlotKey(slot = 'AUTO') { return SAVE_SLOT_KEYS[slot] || SAVE_STORAGE_KEY; }
function getSelectedSaveSlot() { const select = document.getElementById('saveSlotSelect'); return select ? select.value : 'AUTO'; }
function setSelectedSaveSlot(slot) { const select = document.getElementById('saveSlotSelect'); if (!select) return; select.value = slot; renderSaveSlotHistory(); updateSaveMetadataDisplay(slot); renderScheduleDashboard(); }
function getSelectedSaveSlotLabel() { const slot = getSelectedSaveSlot(); return slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); }
function writeSavePayload(storageKey, slot = 'AUTO') { localStorage.setItem(storageKey, JSON.stringify(buildSavePayload())); updateSaveMetadataDisplay(slot); renderSaveSlotHistory(); }
function saveGame({slot = 'AUTO', force = false} = {}) { const storageKey = getSaveSlotKey(slot); if (saveGameTimer) clearTimeout(saveGameTimer); if (force) { writeSavePayload(storageKey, slot); return; } saveGameTimer = setTimeout(() => writeSavePayload(storageKey, slot), 220); }
function saveSlot() { const slot = getSelectedSaveSlot(); saveGame({slot, force: true}); displaySaveStateInfo(`Saved to ${getSelectedSaveSlotLabel()}.`, 'success'); }
function displaySaveStateInfo(message, type = 'info') { const el = document.getElementById('saveStateInfo'); if (!el) return; el.innerText = message; el.className = `save-state-info ${type}`; }
function buildSavePayload() {
    // 🛡️ STORAGE FIX: Create a lightweight copy of the calendar to save space
    // This deletes the massive HTML play-by-play strings from old games so you don't hit the 5MB limit!
    const lightweightCalendar = (Array.isArray(calendar) ? calendar : []).map((day, dIdx) => {
        const safeDay = Array.isArray(day) ? day : [];
        return safeDay.map(g => {
            if (!g || typeof g !== 'object') return g;
            if (dIdx < currentDay && g.result && g.result.boxLog) {
                // Clone the game object but wipe the heavy boxLog array
                return { 
                    ...g, 
                    result: { ...g.result, boxLog: [] } 
                };
            }
            return g;
        });
    });

    // 🛡️ STORAGE FIX: Keep trade logs and history trimmed so they don't grow infinitely
    if (tradeLog.length > 200) tradeLog = tradeLog.slice(0, 200);
    if (leagueHistory.length > 25) leagueHistory = leagueHistory.slice(0, 25);

    return {
        meta: { version: CURRENT_SAVE_SCHEMA_VERSION, savedAt: new Date().toISOString(), label: 'EASN Dynasty Save' },
        data: { 
            league, rosters, playerStats, tradeLog, hallOfFame, leagueHistory, 
            retiredPlayers, calendar: lightweightCalendar, currentDay, currentSeason, 
            isPlayoffs, isASG, currentCupChamp, playoffBracket, awardConfig, 
            monthSnapshot, pendingTrades, realDatesMap
        }
    };
}
function normalizeSavePackage(raw) { if (!raw || typeof raw !== 'object') return null; if (raw.meta && raw.data) { if (!isSupportedSaveVersion(raw.meta.version)) return null; return { payload: raw.data, meta: raw.meta }; } return { payload: raw, meta: { version: LEGACY_SAVE_VERSION, savedAt: null, label: 'Legacy EASN Save', migratedFromLegacy: true } }; }
function isSupportedSaveVersion(version) { return SUPPORTED_SAVE_VERSIONS.includes(Number(version)); }
function getSaveMeta(slot = 'AUTO') { try { const raw = localStorage.getItem(getSaveSlotKey(slot)); if (!raw) return null; const parsed = JSON.parse(raw); const normalized = normalizeSavePackage(parsed); return normalized ? normalized.meta : null; } catch { return null; } }
function getAllSaveSlotHistory() { return Object.keys(SAVE_SLOT_KEYS).map(slot => { const meta = getSaveMeta(slot); return { slot, label: slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '), savedAt: meta ? meta.savedAt : null, version: meta ? meta.version : null, valid: Boolean(meta) }; }); }
function selectHistorySaveSlot(slot) { setSelectedSaveSlot(slot); const meta = getSaveMeta(slot); if (!meta) { displaySaveStateInfo(`${slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ')} is empty.`, 'info'); return; } const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); const savedAt = formatSaveTimestamp(meta.savedAt); if (!confirm(`Load ${label} saved at ${savedAt}? This will replace current progress.`)) return; loadSlot(); }
function renderSaveSlotHistory() { const container = document.getElementById('saveSlotHistory'); if (!container) return; const history = getAllSaveSlotHistory(); container.innerHTML = history.map(item => { const timestamp = item.savedAt ? formatSaveTimestamp(item.savedAt) : 'empty'; const version = item.version ? `v${item.version}` : '--'; const activeClass = item.slot === getSelectedSaveSlot() ? ' save-slot-history-active' : ''; return `<div class="save-slot-history-item${activeClass}" onclick="selectHistorySaveSlot('${item.slot}')"><span>${item.label}</span><span>${timestamp} • ${version}</span></div>`; }).join(''); }
function formatSaveTimestamp(value) { if (!value) return 'unknown'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function updateSaveMetadataDisplay(slot = 'AUTO') { const el = document.getElementById('saveMetadata'); if (!el) return; const meta = getSaveMeta(slot); const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); if (!meta) { el.innerText = `SAVE: no backup yet (${label})`; return; } el.innerText = `SAVE ${label} v${meta.version} • ${formatSaveTimestamp(meta.savedAt)}`; }
function isValidSaveData(data) {
    if (!data || typeof data !== 'object') return false;
    const core = data.meta && data.data ? data.data : data;
    const requiredKeys = ['league', 'rosters', 'playerStats', 'calendar', 'currentDay', 'currentSeason'];
    if (!requiredKeys.every(k => Object.prototype.hasOwnProperty.call(core, k))) return false;
    if (!Array.isArray(core.league) || !Array.isArray(core.calendar)) return false;
    if (!core.rosters || typeof core.rosters !== 'object') return false;
    if (!core.playerStats || typeof core.playerStats !== 'object') return false;
    if (!Number.isFinite(Number(core.currentDay)) || !Number.isFinite(Number(core.currentSeason))) return false;
    return true;
}
function applyLoadedSave(data) { 
    league = Array.isArray(data.league) ? data.league : []; 
    rosters = typeof data.rosters === 'object' && data.rosters ? data.rosters : {}; 
    playerStats = typeof data.playerStats === 'object' && data.playerStats ? data.playerStats : {}; 
    tradeLog = Array.isArray(data.tradeLog) ? data.tradeLog : []; 
    hallOfFame = Array.isArray(data.hallOfFame) ? data.hallOfFame : []; 
    leagueHistory = Array.isArray(data.leagueHistory) ? data.leagueHistory : []; 
    retiredPlayers = Array.isArray(data.retiredPlayers) ? data.retiredPlayers : []; 
    calendar = Array.isArray(data.calendar) ? data.calendar : []; 
    currentDay = Number.isInteger(data.currentDay) ? data.currentDay : parseInt(data.currentDay, 10) || 0; 
    currentSeason = Number.isInteger(data.currentSeason) ? data.currentSeason : parseInt(data.currentSeason, 10) || 1; 
    isPlayoffs = Boolean(data.isPlayoffs); 
    isASG = Boolean(data.isASG); 
    currentCupChamp = data.currentCupChamp || ""; 
    playoffBracket = typeof data.playoffBracket === 'object' && data.playoffBracket ? data.playoffBracket : { round: 1, series: [] }; 
    awardConfig = typeof data.awardConfig === 'object' && data.awardConfig ? data.awardConfig : awardConfig; 
    monthSnapshot = typeof data.monthSnapshot === 'object' && data.monthSnapshot ? data.monthSnapshot : {}; 
    pendingTrades = Array.isArray(data.pendingTrades) ? data.pendingTrades : []; 
    realDatesMap = Array.isArray(data.realDatesMap) ? data.realDatesMap : [];

    if (currentDay < 0) currentDay = 0;
    if (currentDay > calendar.length) currentDay = calendar.length;

    // 🛡️ STANDINGS FIX: Re-link the schedule calendar back to the master league array
    calendar.forEach(day => {
        day.forEach(g => {
            if (g.h && g.h.nrm) g.h = league.find(t => t.nrm === g.h.nrm) || g.h;
            if (g.a && g.a.nrm) g.a = league.find(t => t.nrm === g.a.nrm) || g.a;
        });
    });
    
    // Re-link the playoff bracket just in case!
    if (playoffBracket && playoffBracket.series) {
        playoffBracket.series.forEach(s => {
            if (s.h && s.h.nrm) s.h = league.find(t => t.nrm === s.h.nrm) || s.h;
            if (s.a && s.a.nrm) s.a = league.find(t => t.nrm === s.a.nrm) || s.a;
        });
    }
}

function loadSlot() {
    const slot = getSelectedSaveSlot(); const raw = localStorage.getItem(getSaveSlotKey(slot));
    if (!raw) return displaySaveStateInfo(`No save stored in ${getSelectedSaveSlotLabel()}.`, 'error');
    try {
        const parsed = JSON.parse(raw); const normalized = normalizeSavePackage(parsed);
        if (!normalized || !isSupportedSaveVersion(normalized.meta.version)) return displaySaveStateInfo(`Unsupported save version.`, 'error');
        if (!isValidSaveData(normalized.payload)) return displaySaveStateInfo(`Invalid save data.`, 'error');
        applyLoadedSave(normalized.payload);
        document.getElementById('startScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; document.getElementById('seasonYearDisplay').innerText = currentSeason;
        displaySaveStateInfo(`Loaded ${getSelectedSaveSlotLabel()}.`, 'success');
        updateUI(); saveGame({force: true}); renderSaveSlotHistory(); updateSaveMetadataDisplay(slot);
        if(isPlayoffs) initPlayoffsUI();
    } catch (err) { displaySaveStateInfo(`Error loading: ${err.message}`, 'error'); }
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY); if (!raw) return alert('No saved dynasty found.');
    try {
        const parsed = JSON.parse(raw); const normalized = normalizeSavePackage(parsed);
        if (!normalized || !isSupportedSaveVersion(normalized.meta.version)) throw new Error('Unsupported schema version.');
        if (!isValidSaveData(normalized.payload)) throw new Error('Missing league data.');
        applyLoadedSave(normalized.payload); saveGame({force: true});
    } catch (err) {
        localStorage.removeItem(SAVE_STORAGE_KEY); document.getElementById('btnContinue').style.display = 'none'; return alert('Unable to load. Save data corrupt.');
    }
    document.getElementById('startScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; document.getElementById('seasonYearDisplay').innerText = currentSeason;
    if(isPlayoffs) initPlayoffsUI(); else if(calendar.length === 0) handleEndOfSeasonRestart();
    populateTeamSelect(); updateTradeDropdowns(); updateUI(); renderTradeLog(); renderLeagueHistory(); renderHallOfFame(); renderRetiredPlayers();
}

window.loadGame = loadGame; // This makes the function clickable from your HTML button

function refreshScheduleDashboardUI() {
    const dayEl = document.getElementById('dayDisplay');
    if (dayEl) {
        if (calendar.length === 0) dayEl.innerText = 'DAY 0/0';
        else {
            const dayNumber = Math.min(currentDay + 1, calendar.length); 
            const dateText = realDatesMap && realDatesMap[currentDay] ? ` | ${realDatesMap[currentDay]}` : ''; 
            const asgText = (isASG && calendar[currentDay] && calendar[currentDay].some(g => g.isASG_game)) ? ' | ALL-STAR DAY' : '';
            dayEl.innerText = `DAY ${dayNumber}/${calendar.length}${dateText}${asgText}`;
        }
    }
    const progressFill = document.getElementById('scheduleProgressFill');
    if (progressFill) { 
        const totalDays = Math.max(calendar.length, 1); 
        const percent = currentDay >= calendar.length ? 100 : Math.round((currentDay / totalDays) * 100); 
        progressFill.style.width = `${percent}%`; 
    }
    renderScheduleDashboard(); 
    updateSaveMetadataDisplay();
}

function renderScheduleDashboard() {
    const summaryEl = document.getElementById('scheduleSummaryText'); 
    const upcomingEl = document.getElementById('scheduleUpcomingGames');
    if (!summaryEl || !upcomingEl) return;
    const totalDays = Math.max(calendar.length, 0); 
    const completedDays = Math.min(currentDay, totalDays); 
    const remainingDays = Math.max(totalDays - currentDay, 0);
    const slot = getSelectedSaveSlot(); 
    const meta = getSaveMeta(slot) || {}; 
    const currentDate = realDatesMap && realDatesMap[currentDay] ? realDatesMap[currentDay] : ''; 
    const slotLabel = getSelectedSaveSlotLabel(); 
    const versionLabel = meta.version ? `Save ${slotLabel} • v${meta.version}` : `Save ${slotLabel} • n/a`; 
    const isAsgDay = isASG && calendar[currentDay] && calendar[currentDay].some(g => g.isASG_game);
    const statusText = totalDays === 0 ? 'Schedule not loaded' : currentDay >= totalDays ? 'Season complete' : `${isAsgDay ? 'ALL-STAR DAY' : `Day ${currentDay + 1} / ${totalDays}`}`;

    summaryEl.innerHTML = `<span>${statusText}</span><span>Completed: ${completedDays}</span><span>Remaining: ${remainingDays}</span><span>${currentDate}</span><span>${versionLabel}</span>`;
    if (totalDays === 0 || currentDay >= totalDays) { upcomingEl.innerHTML = `<div class="schedule-game-line">No upcoming matchups.</div>`; return; }

    const upcomingLines = (calendar[currentDay] || []).slice(0, 3).map(g => {
        const home = g.h ? (g.h.code || g.h.name || 'HOME') : 'HOME'; 
        const away = g.a ? (g.a.code || g.a.name || 'AWAY') : 'AWAY'; 
        const when = realDatesMap && realDatesMap[currentDay] ? realDatesMap[currentDay] : `Day ${currentDay + 1}`;
        return `<div class="schedule-game-line"><span>${home} vs ${away}</span><span>${when}</span></div>`;
    }).join('');
    upcomingEl.innerHTML = `<div style="font-size:8px; color:var(--silver-mid); margin-bottom:6px;">Upcoming</div>${upcomingLines || '<div class="schedule-game-line">No games scheduled.</div>'}`;
}
// --- LOGOS & DICTIONARIES ---
const teamLogos = { 'anaheim': 'Team Logos/Anaheim_Ducks_logo_2024.png', 'boston': 'Team Logos/Bruins.png', 'buffalo': 'Team Logos/sabres.png', 'calgary': 'Team Logos/Calgary_Flames_logo.png', 'chicago': 'Team Logos/blackhawks.png', 'dallas': 'Team Logos/North_Stars.png', 'minnesota': 'Team Logos/North_Stars.png', 'detroit': 'Team Logos/Red_Wings.png', 'edmonton': 'Team Logos/Oilers.png', 'florida': 'Team Logos/Panthers.png', 'hartford': 'Team Logos/whalers.png', 'los angeles': 'Team Logos/kings.png', 'montreal': 'Team Logos/Montreal_Canadiens.png', 'new jersey': 'Team Logos/New_Jersey_Devils.png', 'new york islanders': 'Team Logos/New_York_Islanders.png', 'new york rangers': 'Team Logos/Rangers.png', 'ottawa': 'Team Logos/Senators.png', 'philadelphia': 'Team Logos/Flyers.png', 'pittsburgh': 'Team Logos/Penguins.png', 'quebec': 'Team Logos/Nordiques.png', 'san jose': 'Team Logos/SanJoseSharksLogo.png', 'st. louis': 'Team Logos/St._Louis_Blues_logo.png', 'tampa bay': 'Team Logos/tampa_bay_lightning.png', 'toronto': 'Team Logos/Toronto_Maple_Leafs_2016_logo.png', 'vancouver': 'Team Logos/canucks.png', 'washington': 'Team Logos/capitals.png', 'winnipeg': 'Team Logos/jets.png', 'wales': 'wales.jpg', 'campbell': 'campbell.jpg' };
function getTeamLogoPath(teamName) { 
    if (!teamName) return ''; 
    let key = teamName.toLowerCase(); 
    const shortNames = { 
        'anaheim': 'anaheim', 'mighty ducks': 'anaheim', 'mighty ducks of anaheim': 'anaheim', 'anaheim ducks': 'anaheim',
        'boston': 'boston', 'boston bruins': 'boston', 
        'buffalo': 'buffalo', 'buffalo sabres': 'buffalo', 
        'calgary': 'calgary', 'calgary flames': 'calgary', 
        'chicago': 'chicago', 'chicago blackhawks': 'chicago', 
        'minnesota': 'minnesota', 'minnesota north stars': 'minnesota', 
        'detroit': 'detroit', 'detroit red wings': 'detroit', 
        'edmonton': 'edmonton', 'edmonton oilers': 'edmonton', 
        'florida': 'florida', 'florida panthers': 'florida', 
        'hartford': 'hartford', 'hartford whalers': 'hartford', 
        'los angeles': 'los angeles', 'los angeles kings': 'los angeles', 
        'montreal': 'montreal', 'montreal canadiens': 'montreal', 
        'new jersey': 'new jersey', 'new jersey devils': 'new jersey', 
        'new york islanders': 'new york islanders', 
        'new york rangers': 'new york rangers', 
        'ottawa': 'ottawa', 'ottawa senators': 'ottawa', 
        'philadelphia': 'philadelphia', 'philadelphia flyers': 'philadelphia', 
        'pittsburgh': 'pittsburgh', 'pittsburgh penguins': 'pittsburgh', 
        'quebec': 'quebec', 'quebec nordiques': 'quebec', 
        'san jose': 'san jose', 'san jose sharks': 'san jose', 
        'st. louis': 'st. louis', 'st. louis blues': 'st. louis', 
        'tampa bay': 'tampa bay', 'tampa bay lightning': 'tampa bay', 
        'toronto': 'toronto', 'toronto maple leafs': 'toronto', 
        'vancouver': 'vancouver', 'vancouver canucks': 'vancouver', 
        'washington': 'washington', 'washington capitals': 'washington', 
        'winnipeg': 'winnipeg', 'winnipeg jets': 'winnipeg', 
        'wales conference': 'wales', 'campbell conference': 'campbell', 'wal': 'wales', 'cam': 'campbell' 
    }; 
    return teamLogos[shortNames[key] || key] || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
}
function getTeamLogoHtml(teamName) { if(!teamName) return '<div style="display:inline-block; width:32px; height:32px; margin:0 5px; flex-shrink:0;"></div>'; return `<img src="${getTeamLogoPath(teamName)}" style="width:36px; height:32px; object-fit:contain; border:none; box-shadow:none; padding:0; margin: 0 5px; vertical-align:middle; flex-shrink:0; transform: scale(1.15);">`; }
const teamMap = { "Mighty Ducks of Anaheim": "ANA", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Chicago Blackhawks": "CHI", "Minnesota North Stars": "MIN", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", "Florida Panthers": "FLA", "Hartford Whalers": "HAR", "Los Angeles Kings": "LAK", "Montreal Canadiens": "MTL", "New Jersey Devils": "NJD", "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT", "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "Quebec Nordiques": "QUE", "San Jose Sharks": "SJS", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL", "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Washington Capitals": "WSH", "Winnipeg Jets": "WPG" };
const teamColors = { 'har': ['#00B140', '#00539B', '#A2AAAD'], 'hfd': ['#00B140', '#00539B', '#A2AAAD'], 'ana': ['#532a44', '#00685E', '#c4ced4'], 'win': ['#00468B', '#CE1126', '#E0E8EE'], 'wpg': ['#00468B', '#CE1126', '#E0E8EE'], 'bos': ['#FFB81C', '#000000', '#8A630B'], 'buf': ['#002654', '#FCB514', '#A2AAAD'], 'cgy': ['#C8102E', '#F1BE48', '#590613'], 'car': ['#CC0000', '#000000', '#A2AAAD'], 'chi': ['#CF0A2C', '#000000', '#D0CACA'], 'col': ['#6F263D', '#236192', '#A2AAAD'], 'min': ['#009639', '#FFD100', '#00331D'], 'det': ['#CE1126', '#FFFFFF', '#A2AAAD'], 'edm': ['#FF4C00', '#041E42', '#C65C10'], 'fla': ['#C8102E', '#041E42', '#B9975B'], 'la': ['#111111', '#A2AAAD', '#555555'], 'lak': ['#111111', '#A2AAAD', '#555555'], 'mon': ['#AF1E2D', '#192168', '#E0E8EE'], 'mtl': ['#AF1E2D', '#192168', '#E0E8EE'], 'nj': ['#CE1126', '#00533B', '#889398'], 'njd': ['#CE1126', '#00533B', '#889398'], 'nyi': ['#00539B', '#F47D30', '#002040'], 'nyr': ['#0038A8', '#CE1126', '#7FA9D6'], 'ott': ['#E31837', '#000000', '#B9975B'], 'phi': ['#F74902', '#000000', '#F3E9D2'], 'pit': ['#000000', '#FCBA03', '#B08D00'], 'que': ['#003E7E', '#FFFFFF', '#CE1126'], 'sa': ['#006D75', '#000000', '#A2AAAD'], 'sjs': ['#006D75', '#000000', '#A2AAAD'], 'stl': ['#002F87', '#FCB514', '#041E42'], 'tb': ['#002868', '#FFFFFF', '#A2AAAD'], 'tbl': ['#002868', '#FFFFFF', '#A2AAAD'], 'tor': ['#00205B', '#FFFFFF', '#B0C4DE'], 'van': ['#000000', '#F2A900', '#C8102E'], 'was': ['#041E42', '#C8102E', '#0033A0'], 'wsh': ['#041E42', '#C8102E', '#0033A0'], 'cbj': ['#002654', '#CE1126', '#A2AAAD'], 'wales': ['#000000', '#FF6600', '#FFFFFF'], 'campbell': ['#FF6600', '#000000', '#FFFFFF'] };
const rivals = { 'chi': ['det','stl','tor'], 'det': ['chi','tor','nyr'], 'mtl': ['tor','bos','que'], 'tor': ['mtl','det','chi'], 'nyr': ['nyi','njd','phi'], 'edm': ['cgy','van','win'], 'bos': ['mtl','nyr','har'], 'phi': ['njd','nyr','pit'], 'pit': ['phi','wsh','njd'], 'cgy': ['edm','van','win'], 'njd': ['nyr','phi','pit'] };

const DEFAULT_TEAM_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=732700653&single=true&output=csv";
const DEFAULT_PLAYER_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=1253001256&single=true&output=csv";
const DEFAULT_SCHEDULE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=184342160&single=true&output=csv";
const DEFAULT_EVENT_LOG_URL = "";
const SHEET_URL_STORAGE_KEY = "nhl94CustomSheetUrls";
let teamUrl = DEFAULT_TEAM_URL; let playerUrl = DEFAULT_PLAYER_URL; let scheduleUrl = DEFAULT_SCHEDULE_URL; let eventLogUrl = DEFAULT_EVENT_LOG_URL;
let sheetSources = { TEAM: 'default sheet', PLAYER: 'default sheet', SCHEDULE: 'default sheet', EVENT_LOG: 'default sheet' };

// --- SHEET VALIDATION & LOADING ---
function saveSheetUrlPreferences(t, p, s, e) { try { localStorage.setItem(SHEET_URL_STORAGE_KEY, JSON.stringify({teamSheetUrl: t||"", playerSheetUrl: p||"", scheduleSheetUrl: s||"", eventLogSheetUrl: e||""})); } catch(err){} }
function hasSavedSheetUrlPreferences() { try { const r = localStorage.getItem(SHEET_URL_STORAGE_KEY); if(!r)return false; const p = JSON.parse(r); return Boolean(p.teamSheetUrl || p.playerSheetUrl || p.scheduleSheetUrl || p.eventLogSheetUrl); } catch{return false;} }
function setSheetSourceBadge(v, txt='Saved sheet settings loaded') { const b = document.getElementById('sheetUrlBadge'); if(b) { b.innerText = txt; b.style.display = v ? 'inline-block' : 'none'; } }
function resetSheetSourcesToDefault() { sheetSources = { TEAM: 'default sheet', PLAYER: 'default sheet', SCHEDULE: 'default sheet', EVENT_LOG: 'default sheet' }; }
function getSheetSourceLabel(s) { return sheetSources[s] || 'default sheet'; }

function loadSheetUrlPreferences() {
    const raw = localStorage.getItem(SHEET_URL_STORAGE_KEY); if (!raw) return;
    try {
        const prefs = JSON.parse(raw);
        if($('teamSheetUrl')) $('teamSheetUrl').value = prefs.teamSheetUrl || ''; if($('playerSheetUrl')) $('playerSheetUrl').value = prefs.playerSheetUrl || '';
        if($('scheduleSheetUrl')) $('scheduleSheetUrl').value = prefs.scheduleSheetUrl || ''; if($('eventLogSheetUrl')) $('eventLogSheetUrl').value = prefs.eventLogSheetUrl || '';
        if (hasSavedSheetUrlPreferences()) { applyCustomSheetUrls(false); if($('sheetUrlMessage')) $('sheetUrlMessage').innerText = 'Loaded saved sheet URLs.'; setSheetSourceBadge(true); }
    } catch (err) {}
}

function setSheetStatusLine(sheetName, text, status, source) {
    const map = { TEAM: 'teamSheetStatus', PLAYER: 'playerSheetStatus', SCHEDULE: 'scheduleSheetStatus', EVENT_LOG: 'eventLogSheetStatus' };
    const el = document.getElementById(map[sheetName]); if (!el) return;
    el.innerText = `${sheetName}: ${text}${source ? ` (${source})` : ''}`; el.classList.toggle('ok', status === 'ok'); el.classList.toggle('error', status === 'error');
}

function clearLocalSheetFileState() {
    customTeamData = null; customPlayerData = null; customScheduleData = null; customEventLogData = null;
    ['teamSheetFile', 'playerSheetFile', 'scheduleSheetFile', 'eventLogSheetFile'].forEach(id => { const i = document.getElementById(id); if (i) i.value = ''; });
    ['team', 'player', 'schedule', 'eventLog'].forEach(t => setSheetFileLabel(t, `No ${t.toUpperCase()} file selected`));
}

function formatSheetStatus(statuses) { return statuses.map(s => `${s.name}: ${s.ok ? 'OK' : `ERROR${s.error ? ` - ${s.error}` : ''}`}`).join(' | '); }
function rowHasAnyHeader(hRow, cands) { 
    // We check if 'cands' (our search terms) exist in any 'col' (column) of the row
    return cands.some(c => hRow.some(col => col.includes(c)));
}
function validateSheetHeaders(sheetName, headerRow) { return null; } // Disabled strict validation for mod flexibility
function getHeaderIndex(hRow, keys, fb = -1) { const norm = hRow.map(h => String(h || '').trim().toUpperCase()); const idx = norm.findIndex(h => keys.some(k => h.includes(k))); return idx !== -1 ? idx : (fb >= 0 && fb < norm.length ? fb : -1); }
function validateScheduleData(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return { ok: false, error: 'Schedule must include a header row and at least one game row.' };
    const headerRow = rows[0] || [];
    const dateIdx = getHeaderIndex(headerRow, ['DATE', 'GAME DATE', 'MATCH DATE'], 0);
    const homeIdx = getHeaderIndex(headerRow, ['HOME', 'HOST'], 3);
    const awayIdx = getHeaderIndex(headerRow, ['AWAY', 'VISITOR', 'GUEST'], 2);
    if (dateIdx === -1 || homeIdx === -1 || awayIdx === -1) return { ok: false, error: 'Missing DATE, HOME, or AWAY column.' };

    let valid = 0;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;
        const gameDate = String(row[dateIdx] || '').trim();
        const homeName = String(row[homeIdx] || '').trim();
        const awayName = String(row[awayIdx] || '').trim();
        if (gameDate && homeName && awayName) valid++;
    }
    if (valid === 0) return { ok: false, error: 'No valid schedule rows were found.' };
    return { ok: true };
}
function setSheetFileLabel(sheetType, fileName) { const map = { team: 'teamSheetFileLabel', player: 'playerSheetFileLabel', schedule: 'scheduleSheetFileLabel', eventLog: 'eventLogSheetFileLabel' }; const el = document.getElementById(map[sheetType]); if (el) el.innerText = fileName; }

function normalizeSheetUrl(rawUrl) {
    const u = String(rawUrl || '').trim(); if (!u) return '';
    if (u.toLowerCase().includes('docs.google.com') && /\/export\?|\/pub\?|\/pubhtml|output=csv/i.test(u)) return u;
    try {
        const p = new URL(u); let sId = null, gid = '0';
        const sM = p.pathname.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/); if (sM) sId = sM[1]; else if (p.searchParams.has('id')) sId = p.searchParams.get('id');
        if (!sId) return u;
        if (p.searchParams.get('gid')) gid = p.searchParams.get('gid'); else if (p.hash) { const hM = p.hash.match(/gid=(\d+)/); if (hM) gid = hM[1]; }
        return `https://docs.google.com/spreadsheets/d/${sId}/export?gid=${gid}&format=csv`;
    } catch { return u; }
}

async function testSheetConnection() { return true; } // Bypassed for speed
function applyCustomSheetUrls(test = true) {
    teamUrl = normalizeSheetUrl($('teamSheetUrl')?.value) || DEFAULT_TEAM_URL; playerUrl = normalizeSheetUrl($('playerSheetUrl')?.value) || DEFAULT_PLAYER_URL;
    scheduleUrl = normalizeSheetUrl($('scheduleSheetUrl')?.value) || DEFAULT_SCHEDULE_URL; eventLogUrl = normalizeSheetUrl($('eventLogSheetUrl')?.value) || DEFAULT_EVENT_LOG_URL;
}
function resetSheetUrlsToDefault() { teamUrl = DEFAULT_TEAM_URL; playerUrl = DEFAULT_PLAYER_URL; scheduleUrl = DEFAULT_SCHEDULE_URL; eventLogUrl = DEFAULT_EVENT_LOG_URL; localStorage.removeItem(SHEET_URL_STORAGE_KEY); resetSheetSourcesToDefault(); }
function clearSheetStatusLines() {}

async function fetchCSV(url) {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) throw new Error("CSV URL is empty.");
    const sep = cleanUrl.includes('?') ? '&' : '?';
    const res = await fetch(cleanUrl + sep + "t=" + new Date().getTime()); if (!res.ok) throw new Error("HTTP error " + res.status);
    const txt = await res.text(); if (!txt.trim() || txt.toLowerCase().startsWith("<!doctype html")) throw new Error("Google returned invalid CSV."); return txt;
}
function parseCSV(text) { return new Promise((resolve, reject) => { Papa.parse(text, { header: false, skipEmptyLines: true, complete: (res) => resolve(res.data), error: (err) => reject(err) }); }); }

// --- CUSTOM CSV UPLOADERS ---
function loadLocalSheetFile(event, sheetType) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const rows = await parseCSV(e.target.result);
            if (sheetType === 'team') customTeamData = rows; else if (sheetType === 'player') customPlayerData = rows; else if (sheetType === 'schedule') customScheduleData = rows; else if (sheetType === 'eventLog') customEventLogData = rows;
            setSheetFileLabel(sheetType, file.name); setSheetSourceBadge(false);
        } catch (err) { event.target.value = ''; alert(`Failed to load CSV: ${err.message}`); }
    };
    reader.readAsText(file);
}

function loadCustomRoster(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const rows = await parseCSV(e.target.result);
            const headers = rows[0].map(h => String(h || '').trim());
            const loaded = rows.slice(1).map(row => { const obj = {}; headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; }); return obj; });
            customRosterData = loaded; customRosterSource = 'custom';
            alert(`Loaded ${customRosterData.length} entries. Starting custom roster game.`);
            await startNewGame(true);
        } catch (err) { alert('Failed to load custom roster: ' + err.message); } finally { event.target.value = ''; }
    };
    reader.readAsText(file);
} 

async function importEventLogSheet() {
    try {
        let rows = customEventLogData;
        if (!rows) {
            const normalizedUrl = normalizeSheetUrl($('eventLogSheetUrl')?.value) || eventLogUrl;
            if (!normalizedUrl) {
                alert('No EVENT LOG source found. Add a URL or upload a CSV first.');
                return;
            }
            rows = await parseCSV(await fetchCSV(normalizedUrl));
        }
        if (!Array.isArray(rows) || rows.length < 2) {
            alert('EVENT LOG sheet is empty or missing a header row.');
            return;
        }

        const header = (rows[0] || []).map(h => String(h || '').trim().toUpperCase());
        const getIdx = (aliases, fallback = -1) => {
            const idx = header.findIndex(h => aliases.some(a => h.includes(a)));
            return idx !== -1 ? idx : fallback;
        };

        const idIdx = getIdx(['GAME_ID', 'GAME ID', 'ID'], 0);
        const typeIdx = getIdx(['TYPE', 'EVENT TYPE'], 1);
        const periodIdx = getIdx(['PERIOD', 'PER'], 2);
        const timeIdx = getIdx(['TIME', 'TIMESTAMP'], 3);
        const teamIdx = getIdx(['TEAM', 'TEAM CODE'], 4);
        const playerIdx = getIdx(['PLAYER', 'PLAYER NAME'], 5);
        const assist1Idx = getIdx(['ASSIST_1', 'ASSIST 1', 'ASSIST1'], -1);
        const assist2Idx = getIdx(['ASSIST_2', 'ASSIST 2', 'ASSIST2'], -1);
        const detailIdx = getIdx(['DETAIL', 'DETAILS', 'EVENT DETAIL'], -1);

        const parsedEvents = rows.slice(1).map(row => ({
            gameId: String(row[idIdx] || '').trim(),
            type: String(row[typeIdx] || '').trim(),
            period: String(row[periodIdx] || '').trim(),
            time: String(row[timeIdx] || '').trim(),
            team: String(row[teamIdx] || '').trim(),
            player: String(row[playerIdx] || '').trim(),
            assist1: assist1Idx >= 0 ? String(row[assist1Idx] || '').trim() : '',
            assist2: assist2Idx >= 0 ? String(row[assist2Idx] || '').trim() : '',
            detail: detailIdx >= 0 ? String(row[detailIdx] || '').trim() : ''
        })).filter(ev => ev.gameId && ev.type && ev.period && ev.time && ev.team && ev.player);

        if (!parsedEvents.length) {
            alert('No valid EVENT LOG rows were found.');
            return;
        }

        eventLogData = parsedEvents;
        setSheetStatusLine('EVENT_LOG', `${parsedEvents.length} rows imported`, 'ok', customEventLogData ? 'local file' : 'google sheet');
        if ($('sheetUrlMessage')) $('sheetUrlMessage').innerText = `EVENT LOG imported: ${parsedEvents.length} events ready.`;
        alert(`EVENT LOG imported: ${parsedEvents.length} events.`);
    } catch (err) {
        setSheetStatusLine('EVENT_LOG', 'import failed', 'error');
        alert(`Failed to import EVENT LOG: ${err.message}`);
    }
}

    function importRosterFromCSV(csvText) {
  const rows = csvText.trim().split('\n');
  const roster = [];

  // Start at i = 1 to skip the header row
  for (let i = 1; i < rows.length; i++) {
    const columns = rows[i].split(',');

    // Skip empty rows or rows missing a player's last name
    if (!columns[4] || columns[4].trim() === "") continue; 

    // Extract the position early so we can test it
    const playerPosition = columns[7].trim().toUpperCase();
    
    // Set up an empty container for the attributes
    let playerAttributes = {};

    // THE FORK: Build different profiles based on position
    if (playerPosition === 'G') {
      // Build GOALIE attributes
      playerAttributes = {
        // Note: You will need to change '1' to whatever column holds the goalie defense rating
        goalieDefense: parseInt(columns[1]) || 30, 
        // Goalies in NHL 94 usually share agility and speed columns with skaters
        agility: gradeToNumber(columns[17]),
        speed: gradeToNumber(columns[18])
      };
    } else {
      // Build SKATER attributes (F or D)
      playerAttributes = {
        shotPower: gradeToNumber(columns[9]),
        passing: gradeToNumber(columns[10]),
        aggression: gradeToNumber(columns[11]),
        roughness: gradeToNumber(columns[12]),
        endurance: gradeToNumber(columns[13]),
        checking: gradeToNumber(columns[14]),
        shotAccuracy: gradeToNumber(columns[15]),
        stickHandling: gradeToNumber(columns[16]),
        agility: gradeToNumber(columns[17]),
        speed: gradeToNumber(columns[18])
      };
    }

    // Assemble the final player object
    const player = {
      teamCode: columns[2].trim(),
      firstName: columns[8].trim(),
      lastName: columns[4].trim(),
      position: playerPosition,
      overall: parseInt(columns[19]) || 30, 
      attributes: playerAttributes
    };

    roster.push(player);
  }
  
  return roster;
}

let momentum = {
    abs: 0.0,
    rel: 0.0,
    carryoverTimer: 0,
    bufferedFloor: 0
};
// =========================================================
// 🌊 UNIFIED MOMENTUM & CHAOS SYSTEM
// =========================================================

// Make sure your global object looks like this
let gameStatus = {
    globalChaos: 0.15, // Base Volatility
    momentum: {
        abs: 0.0, // Game Heat (Volume)
        rel: 0.0, // Team Edge (Pos = Home, Neg = Away)
        alpha: 0.15, // Blending sensitivity
        carryoverTimer: 0,
        bufferedFloor: 0
    }
};

// ⏱️ 1. THE TICK ENGINE (Runs every game second/frame to decay momentum)
function updateMomentumDecay(deltaSeconds, timeRemaining, scoreDiff) {
    let m = gameStatus.momentum;

    // Standard Absolute Momentum (The Heat) decay continues as normal
    m.abs = Math.max(0, m.abs - (0.004 * deltaSeconds));

    // Determine the Desperation/Sentiment Floor
    let sentimentFloor = 0;
    
    // If trailing in the final 2 minutes, establish a desperation floor
    if (timeRemaining <= 120 && scoreDiff !== 0) {
        // Floor anchors to the deficit (e.g., -2 goals = -0.10 floor)
        sentimentFloor = (scoreDiff < 0) ? Math.max(-0.15, (scoreDiff * 0.05)) : 0;
    } else if (m.carryoverTimer > 0) {
        // If a shock event just happened, respect the carryover floor
        sentimentFloor = m.bufferedFloor;
        m.carryoverTimer -= deltaSeconds;
    }

    // Decay the Relative Momentum (The Edge) but stop at the active floor
    if (m.rel > sentimentFloor) {
        m.rel = Math.max(sentimentFloor, m.rel - (0.015 * deltaSeconds));
    } else if (m.rel < sentimentFloor) {
        // If somehow below the floor, gently pull it back up
        m.rel = Math.min(sentimentFloor, m.rel + (0.015 * deltaSeconds));
    }
}

// 💥 2. THE EVENT SHOCK ENGINE (Run this when a big play happens)
// Example usage: applyMomentumShock('GOAL', 'BOS', true)
function applyMomentumShock(eventType, teamCode, isHomeTeam, customValue = null) {
    let m = gameStatus.momentum;
    
    // A NEW EVENT ELIMINATES THE CARRYOVER (Resets the floor hold)
    m.carryoverTimer = 0;
    m.bufferedFloor = 0;

    let absShift = 0;
    let relShift = 0;

    // Determine shift values based on event type
    if (customValue !== null) {
        relShift = isHomeTeam ? customValue : -customValue;
        absShift = Math.abs(customValue) / 2;
    } else if (eventType === 'GOAL') {
        absShift = 0.10;
        relShift = isHomeTeam ? 0.15 : -0.15;
    } else if (eventType === 'SAVE' || eventType === 'HIT') {
        absShift = 0.02;
        relShift = isHomeTeam ? 0.10 : -0.10;
    }

    // Apply the Alpha-Blended Trend
    m.abs = (absShift * m.alpha) + (m.abs * (1 - m.alpha));
    m.rel = (relShift * m.alpha) + (m.rel * (1 - m.alpha));
    
    // Apply Hard Caps (Circuit Breakers)
    m.abs = Math.min(0.25, Math.max(0, m.abs));
    m.rel = Math.max(-0.20, Math.min(0.20, m.rel));
}

// =========================================================
// ⚖️ UNIFIED PENALTY SYSTEM
// =========================================================

// Global Referee Strictness (Bell Curve 0.5 - 1.5)
const REF_STRICTNESS = (() => {
    const roll = (Math.random() + Math.random() + Math.random()) / 3; 
    return parseFloat((0.5 + (roll * 1.0)).toFixed(2)); 
})();

// 🥊 1. THE HIT PENALTY ENGINE (Call this immediately after a hit is calculated)
function checkHitPenalty(attacker, severity) {
    // Failsafe: safely find the roughness stat depending on your object structure
    let roughness = 50;
    if (attacker.stats && attacker.stats.RGH) roughness = attacker.stats.RGH;
    else if (attacker.attr && attacker.attr.rough) {
        // Handle letter grades if necessary
        roughness = typeof attacker.attr.rough === 'string' ? 75 : attacker.attr.rough;
    }

    let penaltyChance = 0;

    // Scale chance based on the severity of the hit
    if (severity === 3) penaltyChance = 1.0; // Hard Violation (Guaranteed)
    else if (severity === 2) penaltyChance = (roughness / 100) * 0.60 * REF_STRICTNESS;
    else if (severity === 1) penaltyChance = (roughness / 100) * 0.25 * REF_STRICTNESS;

    if (Math.random() < penaltyChance) {
        if (typeof stopPlay === 'function') stopPlay('PENALTY', attacker.team);
        return true;
    }
    return false;
}

// 🎲 2. THE BACKGROUND PENALTY ROLLER (Call this randomly during standard play)
// Example usage: let penResult = rollGeneralPenalty(playerStats['Cam Neely']);
function rollGeneralPenalty(playerStatsObj) {
    // Safely extract roughness
    let roughness = playerStatsObj.roughness || (playerStatsObj.attr ? playerStatsObj.attr.rough : 50); 
    
    // If your stats are still letter grades (e.g., 'B+'), convert it to a number roughly 0-99
    if (typeof roughness === 'string') {
        roughness = getGradeMod(roughness) * 60; // Helper to turn grades into numerical weight
    }

    // Base chance for a penalty during a standard time tick (Adjust this up/down to tune gameplay)
    let basePenaltyChance = 0.05; 

    // Roughness Modifier: 50 = 1.0x, 99 = ~2.0x chance to take a penalty
    let roughnessModifier = (roughness / 50); 
    
    // Calculate final probability including Ref Strictness
    let finalPenaltyChance = basePenaltyChance * roughnessModifier * REF_STRICTNESS;

    // Roll the dice!
    if (Math.random() < finalPenaltyChance) {
        // 85% chance of a Minor (2 min), 15% chance of a Major (5 min)
        let isMajor = Math.random() < 0.15; 
        
        return {
            penaltyCalled: true,
            minutes: isMajor ? 5 : 2,
            type: isMajor ? "Major" : "Minor"
        };
    }

    // No penalty occurred
    return {
        penaltyCalled: false,
        minutes: 0,
        type: "None"
    };
}

function onEventTrigger(type, team) {
    // A NEW EVENT ELIMINATES THE CARRYOVER
    // This allows momentum to "pick right back up" without being held by a floor
    momentum.carryoverTimer = 0;
    momentum.bufferedFloor = 0;

    // Process the new event normally to increase Relative Momentum
    processEvent(type, team);
}

function getEffectiveStat(player, statName) {
    const ps = playerStats[player.name];
    if (!ps) return 50; // Safety fallback

    // 1. Helper to convert letter grades to numerical values
    const getVal = (grade) => {
        const m = { 'A+': 98, 'A': 94, 'A-': 88, 'B+': 83, 'B': 78, 'B-': 72, 'C+': 66, 'C': 60, 'C-': 55, 'D': 45, 'F': 30 };
        return m[grade] || 60;

    // 2. Linear Fatigue Decay (60% Performance Floor)
    let baseStat = (typeof ps.attr[statName] === 'string') ? getVal(ps.attr[statName]) : (ps.attr[statName] || 50);
    let fatigueMod = 1 - ((player.currentFatigue || 0) * 0.4); 
    let decayedStat = (statName === 'END' || statName === 'endur') ? baseStat : baseStat * fatigueMod;

    // 3. Calculate Virtual Composure (The Clutch Factor)
    let composure = ((ps.attr.def || 50) * 0.5) + (getVal(ps.attr.endur || 'C') * 0.3) + ((ps.attr.ovr || 50) * 0.2);

    // 4. Game Pressure Scaling (Safeguarded for global variables)
    let pressure = 1.0;
    let tRemain = typeof finalTime !== 'undefined' ? finalTime : 999;
    let sDiff = typeof scoreDiff !== 'undefined' ? scoreDiff : 0;
    let isEN = typeof isEmptyNet !== 'undefined' ? isEmptyNet : false;

    if (tRemain <= 300) pressure = 1.15; // Final 5 minutes (Crunch Time)
    if (tRemain <= 120 && Math.abs(sDiff) <= 1) pressure = 1.30; // Final 2 mins (Clutch Moment)
    if (tRemain <= 60 && isEN) pressure = 1.50; // Desperation (Empty Net)

    // 5. Execution Penalty (Stress Tax)
    let clutchPenalty = Math.max(0, (pressure * 100) - composure) * 0.005;

    // 6. Global Chaos & Momentum (The Additive System)
    let chaos = gameStatus.globalChaos || 0.15;
    let roll = (Math.random() * (1 - chaos)) + (0.5 * chaos);
    let teamMod = 0;
    if (gameStatus.momentum) {
        teamMod = (player.team === 'HOME') ? gameStatus.momentum.rel : -gameStatus.momentum.rel;
    }

    // Final Additive Result
    let finalValue = decayedStat * (roll + teamMod - clutchPenalty);
    return Math.max(1, finalValue);
}
};
function useTimeout(team) {
    // 1. Reset Global Chaos (Calm the game down)
    gameStatus.globalChaos = Math.max(0.1, gameStatus.globalChaos - 0.4);

    // 2. Momentum Reset
    gameStatus.momentum.rel = gameStatus.momentum.rel * 0.5;

    // 3. Optional: Restore a small amount of endurance to the current line
    // Assuming 'players' array is accessible in this scope
    if (typeof players !== 'undefined') {
        players.forEach(p => {
            if (p.team === team && p.isOnIce) {
                p.currentFatigue = Math.max(0, p.currentFatigue - 0.15);
            }
        });
    }

    console.log(`${team} calls a timeout. Chaos subsided.`);
    if (typeof renderGameUI === 'function') renderGameUI(); 
} // <--- Added the missing closing bracket here!

function triggerPenaltyEvent(attacker) {
    // Log the event to your engine's console/tracker
    console.log(`Penalty called on ${attacker.name} (${attacker.team})!`);
    
    // Trigger the stop play state using your existing logic
    stopPlay('PENALTY', attacker.team);
}

function handleHit(attacker, victim) {
    // Calculate Strength Delta
    let power = (attacker.stats.CHK * 0.7) + (attacker.stats.AGR * 0.3) + (gameStatus.globalChaos * 10);
    let resistance = (victim.stats.BAL * (1 - victim.currentFatigue * 0.4)) + (victim.stats.WGT * 0.2);

    let delta = power / resistance;
    let severity = 0;

    if (delta > 1.5) severity = 3;      // Grade 3: Injury/Penalty
    else if (delta > 1.25) severity = 2; // Grade 2: Stun
    else if (delta > 1.0) severity = 1;  // Grade 1: Loose Puck

    if (severity > 0) {
        // Trigger Shock (Fatigue acceleration)
        victim.isShocked = true;
        victim.shockTimer = 3.0; // Seconds
        
        // Spike Global Chaos
        gameStatus.globalChaos = Math.min(1.0, gameStatus.globalChaos + (severity * 0.05));
        
        // Check for Penalty based on Roughness and Ref Strictness
        checkHitPenalty(attacker, severity);
        // Log the hit event       
        console.log(`Hit Severity: ${severity} | Power: ${power.toFixed(2)} | Resistance: ${resistance.toFixed(2)} | Delta: ${delta.toFixed(2)}`);
    }   
    
    return severity;
}

function checkHitPenalty(attacker, severity) {
    const roughness = attacker.stats.RGH || 50;
    let penaltyChance = 0;

    if (severity === 3) penaltyChance = 1.0; // Hard Violation
    else if (severity === 2) penaltyChance = (roughness / 100) * 0.60 * REF_STRICTNESS;
    else if (severity === 1) penaltyChance = (roughness / 100) * 0.25 * REF_STRICTNESS;

    if (Math.random() < penaltyChance) {
        stopPlay('PENALTY', attacker.team); // Stabilizing Event
        return true;
    }
    return false;
}

function updateEngine(delta) {
    let m = gameStatus.momentum;

    // 1. Determine Desperation Floor (Final 2 Mins)
    let activeFloor = 0;
    if (gameTime <= 120 && scoreDiff !== 0) {
        // Floor anchors to the deficit
        activeFloor = (scoreDiff < 0) ? Math.max(-0.15, scoreDiff * 0.05) : 0;
    } else if (m.carryoverTimer > 0) {
        activeFloor = m.bufferedFloor;
        m.carryoverTimer -= delta;
    }

    // 2. Apply Decay (Relative decays faster than Absolute)
    if (m.rel > activeFloor) {
        m.rel = Math.max(activeFloor, m.rel - (0.015 * delta)); // Sentiment Decay
    }
    m.abs = Math.max(0, m.abs - (0.004 * delta)); // Heat Decay

    // 3. Fatigue Accumulation (Shock Multiplier)
    players.forEach(p => {
        let shockMult = p.isShocked ? (100 / 20) : 1.0; // 5x Drain during shock
        p.currentFatigue += (0.001 * (1 + gameStatus.globalChaos) * shockMult) / (p.stats.END / 100);
    });
}

// --- INITIALIZATION ---
async function startNewGame(useCustomRoster = false) {  
    const btn = document.querySelector('button[onclick="startNewGame()"]'); 
    const origText = btn ? btn.innerText : "LOADING..."; 
    if (btn) { btn.innerText = "VALIDATING SATELLITE FEED..."; btn.disabled = true; }

    try {
        let tData = customTeamData;
        if (!tData) { try { tData = await parseCSV(await fetchCSV(teamUrl)); } catch(e) { tData = [['TEAM NAME','TEAM CODE','CONFERENCE','DIVISION']]; } }
        
        let pData = customPlayerData;
        if (useCustomRoster && customRosterData) {
            const hdrs = Object.keys(customRosterData[0]).map(h => String(h).trim());
            pData = [hdrs, ...customRosterData.map(row => {
                const normalizedRow = {};
                Object.keys(row || {}).forEach(key => {
                    normalizedRow[String(key).trim().toUpperCase()] = row[key];
                });
                return hdrs.map(k => String(normalizedRow[String(k).trim().toUpperCase()] || '').trim());
            })];
        } else if (!pData) {
            try { pData = await parseCSV(await fetchCSV(playerUrl)); } catch(e) { pData = [['FIRST NAME','LAST NAME','TEAM CODE','POS','OFFENSE','DEFENSE','G DEF','SPEED','AGILITY']]; }
        }
        
        const tHeaders = tData[0].map(h => String(h).trim().toUpperCase());
        const getTCol = (row, keywords, fallbackIdx) => { let idx = tHeaders.findIndex(h => keywords.some(k => h.includes(k))); if (idx === -1) idx = fallbackIdx; return row[idx] ? String(row[idx]).trim() : ''; };

        league = tData.slice(1).map(r => {
            const teamName = getTCol(r, ["TEAM NAME", "FRANCHISE", "TEAM"], 0) || 'Unknown';
            let teamCode = getTCol(r, ["TEAM CODE", "CODE", "ABBR"], 1).toUpperCase();
            if (!teamCode) teamCode = teamName.slice(0, 3).toUpperCase();
            const nrm = teamName.toLowerCase().replace(/\s+/g, ''); 
            return {
                name: teamName, code: teamCode, nrm: nrm, conf: getTCol(r, ["CONFERENCE", "CONF"], 2) || 'Eastern', div: getTCol(r, ["DIVISION", "DIV"], 3) || 'Unknown', logo: getTeamLogoPath(teamName), db: 80, 
                season: {gp:0, w:0, l:0, t:0, pts:0, gf:0, ga:0, ppo:0, ppg:0, ts:0, ppga:0},
                winStreak: 0, loseStreak: 0, teamMeeting: false, playersMeeting: false, coachFired: false, 
                undefeated: 0, winless: 0, chem: {f:[0,0,0,0], d:[0,0,0], lastUnit:null},
                specialTeams: { pp1:[], pp2:[], pk1:[], pk2:[], exa:[] }
            };
        }).filter(x => x.name !== 'Unknown');
        
        rosters = {}; playerStats = {};
        const pHeaders = pData[0].map(h => String(h).trim().toUpperCase());
        // 🛡️ THE ULTIMATE COLUMN FINDER (Blocks "G DEF" from hijacking "DEF")
        const getCol = (row, keywords, fallbackIdx, excludeList = []) => {
        // 1. Try for an exact match first
        let idx = pHeaders.findIndex(h => keywords.some(k => h === k));

        // 2. Try partial match, but strictly block our exclude list
        if (idx === -1) {
        idx = pHeaders.findIndex(h => 
            keywords.some(k => h.includes(k)) && 
            !excludeList.some(ex => h.includes(ex))
        );
    }

    // 3. Fallback to index if nothing found
    if (idx === -1) idx = fallbackIdx;
    return row[idx] ? String(row[idx]).trim() : '';
            };
       
        pData.slice(1).forEach(r => {
            const rawCode = getCol(r, ["TEAM CODE", "TEAM", "CODE"], 1).toUpperCase().trim();
            if (!rawCode) return; 
            const teamObj = league.find(l => l.code === rawCode || l.name.toUpperCase() === rawCode); 
            if(!teamObj) return;
            const tk = teamObj.nrm; if(!rosters[tk]) rosters[tk] = [];
            
            const lastName = getCol(r, ["LAST NAME", "LAST"], 0); const firstName = getCol(r, ["FIRST NAME", "FIRST"], 8);
            const pN = firstName ? `${firstName} ${lastName}` : lastName;
            const rawPos = getCol(r, ["POS", "POSITION"], 5).toUpperCase();
            let pos = (rawPos === 'D' || rawPos === 'LD' || rawPos === 'RD' || rawPos.startsWith('DEF')) ? 'D' : 'F';

            if (pN && pN !== '') {
                if(!playerStats[pN]) {
                    rosters[tk].push({ name: pN, pos: pos });
                    playerStats[pN] = {
                        name: pN, team: teamObj.name, teamCode: teamObj.code, pos: pos, age: parseInt(getCol(r, ["AGE"], -1)) || (Math.floor(Math.random()*15)+18), 
                        streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, injury: 0, 
                        asgAppearances: parseInt(getCol(r, ["ASG", "ALL STAR", "APP"], 20)) || 0,
                        attr: { 
                            off: parseInt(getCol(r, ["OFFENSE", "OFF"], 3)) || 70, 
                            def: parseInt(getCol(r, ["DEFENSE", "DEF"], 4, ["G DEF", "GOALIE", "G_DEF"])) || 70,
                            gDef: 50, shotPwr: getCol(r, ["SHOT POWER", "PWR"], 9) || 'C', pass: getCol(r, ["PASS", "PAS"], 10) || 'C', 
                            aggr: getCol(r, ["AGGRESSION", "AGR"], 11) || 'C', rough: getCol(r, ["ROUGHNESS", "RGH"], 12) || 'C', 
                            endur: getCol(r, ["ENDURANCE", "END"], 13) || 'C', check: getCol(r, ["CHECKING", "CHK"], 14) || 'C', 
                            shotAcc: getCol(r, ["SHOT ACC", "ACC"], 15) || 'C', stkHnd: getCol(r, ["STICK", "STK"], 16) || 'C', 
                            agil: getCol(r, ["AGILITY", "AGL"], 17) || 'C', speed: getCol(r, ["SPEED", "SPD"], 18) || 'C', 
                            ovr: parseInt(getCol(r, ["OVERALL", "OVR"], 19)) || 70 
                        },
                        potential: Math.random() < 0.05 ? 'Franchise' : (Math.random() < 0.25 ? 'Top 6' : (Math.random() < 0.60 ? 'Depth' : 'Bust')),
                        career: { gp: parseInt(getCol(r, ["CAREER GP", "C_GP", "CAR GP"], -1)) || 0, g: parseInt(getCol(r, ["CAREER G", "C_G", "CAR G"], -1)) || 0, a: parseInt(getCol(r, ["CAREER A", "C_A", "CAR A"], -1)) || 0, pts: parseInt(getCol(r, ["CAREER PTS", "C_PTS", "CAR PTS"], -1)) || 0, pm: parseInt(getCol(r, ["CAREER PM", "C_PM", "CAR PM", "CAREER +/-"], -1)) || 0, pim: 0, ppg: 0, shg: 0, gwg: 0, s: 0, awards: 0 }, 
                        season: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0}, playoff: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0}
                    };
                }
            }
            
            const gN = getCol(r, ["GOALIE NAME", "G NAME", "G_NAME"], 6);
            if (gN && gN.toUpperCase() !== 'TRUE' && gN.toUpperCase() !== 'G' && gN.toUpperCase() !== 'FALSE') {
                if(!playerStats[gN]) {
                    rosters[tk].push({ name: gN, pos: 'G' });
                    playerStats[gN] = {
                        name: gN, team: teamObj.name, teamCode: teamObj.code, pos: 'G', age: parseInt(getCol(r, ["AGE"], -1)) || (Math.floor(Math.random()*15)+18), 
                        streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, injury: 0, asgAppearances: 0,
                        attr: { off: 20, def: 20, gDef: parseInt(getCol(r, ["G DEF", "GOALIE DEF", "GOALIE DEFENSE RATING"], 7)) || 70, agil: getCol(r, ["AGILITY", "AGL"], 17) || 'C', speed: getCol(r, ["SPEED", "SPD"], 18) || 'C' },
                        potential: 'Depth',
                        career: {gp:0, g:0, a:0, pts:0, pm:0, w:0, so:0, sv:0, sa:0, pim:0, ppg:0}, 
                        season: {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0,lastGAA: 0, lastSV: 0, consStarts: 0}, 
                        playoff: {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, pim:0, ppg:0,lastGAA: 0, lastSV: 0, consStarts: 0}                    
                    };
                }
            }
        });

        await loadScheduleFromCSV(customScheduleData); populateTeamSelect(); updateTradeDropdowns(); takeMonthSnapshot(); updateUI(); saveGame(); 
        document.getElementById('startScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; 
        if (btn) { btn.innerText = origText; btn.disabled = false; }
    } catch (error) { console.error(error); alert("ERROR: Could not load data."); if (btn) { btn.innerText = origText; btn.disabled = false; } }
}

// --- RATING ENGINE ---
function getPlayerWeightedStats(pName) {
    const p = playerStats[pName]; 
    if (!p) return { ovr: 50, tag: 'NONE' };

    const hasGrade = (val, grades) => val && typeof val === 'string' && grades.some(g => val.toUpperCase().includes(g));

    // Helper to convert grades to numbers for the logical checks below
    const getVal = (grade) => {
        const m = { 'A+': 98, 'A': 94, 'A-': 88, 'B+': 83, 'B': 78, 'B-': 72, 'C+': 66, 'C': 60, 'C-': 55, 'D': 45, 'F': 30 };
        return m[grade] || 60;
    };

    // --- DEFINE THE MISSING VARIABLES ---
    let off = parseInt(p.attr.off) || 70;
    let def = parseInt(p.attr.def) || 70;
    let spd = getVal(p.attr.speed);
    let agl = getVal(p.attr.agil);
    let pwr = getVal(p.attr.shotPwr);
    let tag = "NONE";

    if (p.pos === 'G') {
        let gDef = parseInt(p.attr.gDef || p.attr.def) || 50;
        if (gDef > 84) return { ovr: gDef, tag: 'WALL' };
        return { ovr: gDef, tag: 'GOALTENDER' };
    }
    
    if (p.pos === 'D') {
        let diff = Math.abs(off - def);
        
        // --- TIER 1: THE ELITE ---
        if (off >= 80 && def >= 80) tag = "FRANCHISE D";
        
        // --- TIER 2: SPECIALIZED OFFENSE ---
        // Prioritize Quarterbacks and Boomers so they aren't labeled "Offensive D"
        else if (off >= 76 && hasGrade(p.attr.pass, ['A', 'A+'])) tag = "QUARTERBACK";
        else if (pwr >= 90) tag = "BOOMER"; 
        
        // --- TIER 3: ELITE SPECIALISTS ---
        else if (def >= 78 && def > off) tag = "SHUTDOWN"; 
        else if (off >= 72 && def >= 72) tag = "TWO-WAY STAR";
        
        // --- TIER 4: PURE PHYSICAL ---
        // Updated to require both high Roughness and Aggression
        else if (getVal(p.attr.rough) >= 90 && getVal(p.attr.aggr) >= 90) tag = "ENFORCER D"; 
        
        // --- TIER 5: GENERAL FALLBACKS ---
        else if (off > def) tag = "OFFENSIVE D"; 
        else if (diff <= 5) tag = "TWO-WAY D"; 
        else tag = "DEFENSIVE D"; 
    }

   else {
        // --- TIER 1: ELITE OFFENSE ---
        if (hasGrade(p.attr.pass, ['A+', 'A', 'A-']) && off >= 80) tag = "PLAYMAKER";
        else if (hasGrade(p.attr.shotAcc, ['A+', 'A', 'A-']) && off >= 80) tag = "SNIPER";
        
        // --- TIER 2: SKILL & SPEED ---
        else if (hasGrade(p.attr.agil, ['A+', 'A', 'A-']) && hasGrade(p.attr.speed, ['A+', 'A', 'A-'])) tag = "SPEEDSTER"; 
        else if (hasGrade(p.attr.agil, ['A+', 'A', 'A-']) && hasGrade(p.attr.stkHnd, ['A+', 'A', 'A-'])) tag = "DANGLER";
        
        // --- TIER 3: PHYSICAL OFFENSE ---
        else if (off >= 80 && hasGrade(p.attr.check, ['A']) && pwr >= 85) tag = "POWER FORWARD";
        
        // --- TIER 4: HYBRIDS & ROLE PLAYERS ---
        else if (def >= 70 && off >= 70) tag = "TWO-WAY FWD";
        else if (def >= 60 && off >= 60 && hasGrade(p.attr.check, ['A+', 'A', 'A-'])) tag = "GRINDER";
        
        // --- TIER 5: PURE PHYSICAL ---
        else if (getVal(p.attr.rough) >= 90 && getVal(p.attr.aggr) >= 90) tag = "ENFORCER F";
        
        // --- TIER 6: BASE TAGS ---
        else if (off >= def) tag = "OFFENSIVE FWD"; 
        else tag = "DEFENSIVE FWD"; 
    }
    
    return { ovr: p.attr.ovr || 70, tag: tag };
}

// ==========================================
// --- EXPECTATION ENGINE & STREAKS ---
// ==========================================

// 1. The Auto-Coach Evaluation (Used for building lines)
function getCoachEvaluation(pName) {
    let ps = playerStats[pName];
    if (!ps) return 0;
    
    // Get Base OVR from your archetype function
    let baseOvr = getPlayerWeightedStats(pName).ovr; 
    let multiplier = 1.0;

    // Apply Fatigue (1.5% penalty per point of fatigue)
    let fatigue = typeof getPlayerFatigueAmount === 'function' ? getPlayerFatigueAmount(pName) : 0;
    multiplier *= (1 - (fatigue * 0.015));

    // Apply Streaks (+10% Hot, -10% Cold)
    let streakStatus = ps.macro_streak || ps.micro_streak || 'NONE';
    if (streakStatus === 'HOT') multiplier *= 1.10;
    if (streakStatus === 'COLD') multiplier *= 0.90;

    return baseOvr * multiplier;
}
class CreaseManager {
    constructor(starter, backup) {
        this.starter = starter;
        this.backup = backup;
    }

    /**
     * PRE-GAME: Determine who gets the start
     * Evaluates resting constraints and macro streaks.
     */
    determineStarter(isBackToBack, gamesPlayedInRow) {
        // Base case: Starter gets the nod
        let activeGoalie = this.starter;
        let reason = "Standard start";

        // 1. Fatigue Firewall
        if (isBackToBack || gamesPlayedInRow >= 5) {
            activeGoalie = this.backup;
            reason = "Resting starter (Fatigue/Schedule)";
            return { activeGoalie, reason };
        }

        // 2. The "Riding the Hot Hand" Protocol
        // Assuming a macroStreak rating between -5 (Ice Cold) and +5 (On Fire)
        if (this.starter.macroStreak <= -3 && this.backup.macroStreak >= 1) {
            activeGoalie = this.backup;
            reason = "Starter cold, riding the hot backup";
            return { activeGoalie, reason };
        }

        // 3. The "Pity Start" (If backup hasn't played in 8+ games)
        if (this.backup.gamesRested >= 8) {
             activeGoalie = this.backup;
             reason = "Keeping the backup fresh";
             return { activeGoalie, reason };
        }

        return { activeGoalie, reason };
    }

    /**
     * IN-GAME: The Patrick Roy Protocol (When to pull the goalie)
     * Evaluates live game state to trigger a goalie change or empty net.
     */
    evaluateInGamePull(currentGoalie, goalsAllowed, scoreDeficit, period, minutesRemaining) {
        // 1. The Blowout Pull (Mercy Rule)
        if (goalsAllowed >= 4 && scoreDeficit >= 3 && period <= 2) {
            return {
                action: "SWAP_GOALIE",
                message: `Coach has seen enough. ${currentGoalie.name} is pulled after allowing ${goalsAllowed} goals.`
            };
        }

        // 2. The Empty Net Desperation
        if (period === 3 && minutesRemaining <= 1.5 && scoreDeficit >= 1 && scoreDeficit <= 2) {
            return {
                action: "EMPTY_NET",
                message: "Goalie pulled for the extra attacker!"
            };
        }

        return { action: "HOLD", message: "Goalie stays in." };
    }
}

// --- Example Execution ---
const belfour = { name: "Ed Belfour", ovr: 93, macroStreak: -4, gamesRested: 0 };
const hackett = { name: "Jeff Hackett", ovr: 82, macroStreak: 2, gamesRested: 4 };

const chiCrease = new CreaseManager(belfour, hackett);

// Pre-game check
const tonightStart = chiCrease.determineStarter(false, 3);
console.log(`Starting Goalie: ${tonightStart.activeGoalie.name} - ${tonightStart.reason}`); 
// Output: Starting Goalie: Jeff Hackett - Starter cold, riding the hot backup

// 2. The Daily "Any Given Night" Micro Streaks (Run Pre-Game)
function assignMicroStreaks(rosterArray) {
    // Clear old micro streaks for this team
    rosterArray.forEach(p => { if (playerStats[p.name]) playerStats[p.name].micro_streak = null; });

    // Filter eligible players (Must be healthy and NOT on a 5-game Macro streak)
    let eligible = rosterArray.filter(p => {
        let ps = playerStats[p.name];
        return ps && ps.injury === 0 && !ps.macro_streak;
    });

    if (eligible.length >= 2) {
        // Shuffle the eligible players and pick 2 randomly
        let shuffled = eligible.sort(() => 0.5 - Math.random());
        playerStats[shuffled[0].name].micro_streak = 'HOT';
        playerStats[shuffled[1].name].micro_streak = 'COLD';
    }
}

// 3. The 5-Game Rolling "Macro" Streaks (Run Post-Game)
function processPostGameStreaks(skaters, goalies) {
    // --- SKATERS ---
    skaters.forEach(p => {
        let ps = playerStats[p.name];
        if (!ps) return;
        
        if (!ps.recentGames) ps.recentGames = [];
        
        // Push this game's stats (Points and Plus/Minus)
        ps.recentGames.push({
            pts: (p.goals || 0) + (p.assists || 0),
            pm: p.pm || 0
        });
        
        // Rolling window: Keep only the last 5 games
        if (ps.recentGames.length > 5) ps.recentGames.shift();

        // Evaluate ONLY if they have a full 5-game sample size
        if (ps.recentGames.length === 5) {
            let pts5 = ps.recentGames.reduce((sum, g) => sum + g.pts, 0);
            let pm5 = ps.recentGames.reduce((sum, g) => sum + g.pm, 0);
            let ovr = getPlayerWeightedStats(p.name).ovr;

            ps.macro_streak = null; // Reset to stable by default

            if (ovr >= 85) {
                // STARS (85+ OVR)
                if (pts5 >= 7) ps.macro_streak = 'HOT';
                else if (pts5 <= 2) ps.macro_streak = 'COLD';
            } else if (ovr >= 75) {
                // TOP 6 / TOP 4 (75-84 OVR)
                if (pts5 >= 4) ps.macro_streak = 'HOT';
                else if (pts5 === 0) ps.macro_streak = 'COLD';
            } else {
                // DEPTH (<75 OVR)
                if (pts5 >= 3) ps.macro_streak = 'HOT';
                else if (pm5 <= -4) ps.macro_streak = 'COLD';
            }
        }
    });

    // --- GOALIES ---
    goalies.forEach(g => {
        let ps = playerStats[g.name];
        if (!ps) return;
        
        if (!ps.recentStarts) ps.recentStarts = [];
        
        // Push this game's shots and saves
        ps.recentStarts.push({
            sv: g.saves || 0,
            sa: g.shotsAgainst || 0
        });
        
        // Rolling window: Keep only the last 3 starts
        if (ps.recentStarts.length > 3) ps.recentStarts.shift();

        if (ps.recentStarts.length === 3) {
            let totalSv = ps.recentStarts.reduce((sum, start) => sum + start.sv, 0);
            let totalSa = ps.recentStarts.reduce((sum, start) => sum + start.sa, 0);
            let svPct = totalSa > 0 ? (totalSv / totalSa) : 0;
            let ovr = getPlayerWeightedStats(g.name).ovr;

            ps.macro_streak = null;

            if (ovr >= 85) {
                // ELITE GOALIES
                if (svPct >= 0.940) ps.macro_streak = 'HOT';
                else if (svPct <= 0.885) ps.macro_streak = 'COLD';
            } else {
                // AVERAGE/BACKUP GOALIES
                if (svPct >= 0.920) ps.macro_streak = 'HOT';
                else if (svPct <= 0.860) ps.macro_streak = 'COLD';
            }
        }
    });
}


// 🏷️ UI BADGE GENERATOR (2-Letter Abbreviation Version)
function getArchetypeBadge(pName) {
    const tag = getPlayerWeightedStats(pName).tag;
    if (!tag || tag === 'NONE' || tag === 'GOALTENDER') return ''; 
    
    const abbrevMap = {
        'PLAYMAKER': 'PL',
        'SNIPER': 'SN',
        'DANGLER': 'DA',
        'TWO-WAY FWD': 'TW',
        'GRINDER': 'GR',
        'FRANCHISE D': 'FD',
        'QUARTERBACK': 'QB',
        'SHUTDOWN': 'SD',
        'DEFENSIVE D': 'DD',
        'OFFENSIVE D': 'OD',
        'TWO-WAY D': 'TD',
        'OFFENSIVE FWD': 'OF',
        'DEFENSIVE FWD': 'DF',
        'WALL': 'WL'
    };

    const abbrev = abbrevMap[tag] || tag.substring(0, 2).toUpperCase();
    return `<span style="margin-left: 6px; font-weight: bold; font-size: 0.85em; color: #888;">[${abbrev}]</span>`;
}
// --- MACRO TEAM AURA CALCULATOR ---
function getTeamSystemAura(tk) {
    // Failsafe: Strictly enforce 3-letter team codes
    if (!rosters[tk]) return 'NONE'; 
    
    // Pull only the 18 active dressed skaters (no goalies, no injured players)
    let skaters = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury === 0).slice(0, 18);
    if (skaters.length < 18) return 'NONE'; 
    
    let avgOff = skaters.reduce((s, p) => s + (playerStats[p.name].attr.off || 70), 0) / skaters.length;
    let avgDef = skaters.reduce((s, p) => s + (playerStats[p.name].attr.def || 70), 0) / skaters.length;
    
    let aura = 'NONE';
    // The threshold is strictly set to 82+ Average for the entire team
    let offMargin = avgOff - 82;
    let defMargin = avgDef - 82;
    
    // Force a dominant identity if they qualify for both
    if (offMargin >= 0 && defMargin >= 0) {
        aura = defMargin >= offMargin ? 'DEFENSIVE TEAM' : 'OFFENSIVE TEAM';
    } else if (defMargin >= 0) {
        aura = 'DEFENSIVE TEAM';
    } else if (offMargin >= 0) {
        aura = 'OFFENSIVE TEAM';
    }
    
    return aura;
}

function getLiveIceOvr(pName) {
    const p = playerStats[pName]; if (!p) return 0;
    // Base OVR strictly from the Google Sheet
    let live = getPlayerWeightedStats(pName).ovr;
    
    // Apply ONLY Hot/Cold Streaks and Chemistry to the live roster display
    if (p.streakType === 'hot') live += 10; 
    if (p.streakType === 'cold') live -= 10;
    live -= getPlayerFatigueAmount(pName);
    
    const tObj = league.find(t => t.code === p.teamCode);
    if (tObj && tObj.chem && tObj.chem.lastUnit) {
        let chemVal = 0, isTelepathic = false;
        const lineIdx = tObj.chem.lastUnit.f.findIndex(l => l.some(x => x.name === pName));
        if (lineIdx !== -1) { chemVal = tObj.chem.f[lineIdx] || 0; if (tObj.chem.fYears && tObj.chem.fYears[lineIdx] >= 2) isTelepathic = true; } 
        else { const pairIdx = tObj.chem.lastUnit.d.findIndex(l => l.some(x => x.name === pName)); if (pairIdx !== -1) { chemVal = tObj.chem.d[pairIdx] || 0; if (tObj.chem.dYears && tObj.chem.dYears[pairIdx] >= 2) isTelepathic = true; } }
        if (chemVal === 10 && isTelepathic) live += 5; else if (chemVal === 10) live += 3; else if (chemVal >= 5) live += 1;                    
    }
    return Math.round(live);
}

function getDynamicTeamOvr(tk) {
    if (!rosters[tk] || rosters[tk].length === 0) return 0;
    const struct = getRosterStructure(tk);
    const topSkaters = [...struct.f[0], ...struct.f[1], ...struct.d[0], ...struct.d[1]];
    const bottomSkaters = [...struct.f[2], ...struct.f[3], ...struct.d[2]];
    const calcAvg = (list) => list.length ? list.reduce((sum, p) => sum + getLiveIceOvr(p.name), 0) / list.length : 0;
    let finalOvr = Math.round((calcAvg(topSkaters) * 0.45) + (calcAvg(bottomSkaters) * 0.20) + ((struct.g.length ? getLiveIceOvr(struct.g[0].name) : 60) * 0.35));
    const allSkaters = [...topSkaters, ...bottomSkaters];
    if (allSkaters.length > 0) { const bestOvr = getLiveIceOvr(allSkaters.reduce((b, c) => getLiveIceOvr(c.name) > getLiveIceOvr(b.name) ? c : b).name); if (bestOvr >= 94) finalOvr += 1; else if (bestOvr >= 90) finalOvr += 0.5; }    
    return Math.max(0, finalOvr);
}

function playedYesterday(tk) { if (currentDay === 0 || !calendar[currentDay - 1]) return false; return calendar[currentDay - 1].some(g => (g.h && g.h.nrm === tk) || (g.a && g.a.nrm === tk)); }

function getPlayerFatigueAmount(pName) { 
    const p = playerStats[pName]; if (!p) return 0;
    let pen = 0; let endur = p.attr.endur || 'C';
    
    // 📅 Back-to-Back Schedule Penalty
    if (playedYesterday(p.teamCode || p.team)) {
        if (endur.includes('A')) pen += 1;
        else if (endur.includes('B')) pen += 4;
        else pen += 8; // Low endurance crashes on back-to-backs
    }
    
    // 🥵 In-Game Exhaustion (Covering for injured teammates)
    if (p.extra_shifts && p.extra_shifts > 0) {
        if (endur.includes('A')) pen += 2;
        else if (endur.includes('B')) pen += 5;
        else pen += 10; // Hitting the "3rd Period Wall"
    }
    return pen;
}

// --- LINES & SPECIAL TEAMS ---
// 🏒 5v5 TACTICAL AUTO-COACH ENGINE
// 🤝 DYNAMIC DUO REGISTRY
// Forces the auto-coach to draft these players onto the same line if both are healthy
const dynamicDuos = [
    ['Adam Oates', 'Cam Neely'],
    ['Mario Lemieux', 'Jaromir Jagr'],
    ['Paul Kariya', 'Teemu Selanne'],
    ['Wayne Gretzky', 'Jari Kurri']
];

function getDuoPartner(playerName) {
    for (let pair of dynamicDuos) {
        if (pair[0] === playerName) return pair[1];
        if (pair[1] === playerName) return pair[0];
    }
    return null;
}

function getRosterStructure(tk) {
    let sks = rosters[tk] || [];
    let available = sks.filter(p => playerStats[p.name] && playerStats[p.name].injury === 0);

    let fPool = available.filter(p => p.pos !== 'D' && p.pos !== 'G');
    let dPool = available.filter(p => p.pos === 'D');
    let gPool = available.filter(p => p.pos === 'G');

    let fLines = [[], [], [], []];
    let usedNames = new Set();

    // 1. LINE 1 & 2: TOP-HEAVY PRIORITY DRAFT (With Duo Override)
    let offensiveSort = [...fPool].sort((a, b) => getOff(b.name) - getOff(a.name));
    
    // Using a while loop instead of the strict pattern array allows us to pull 2 players at once
    while ((fLines[0].length < 3 || fLines[1].length < 3) && usedNames.size < fPool.length) {
        // Pick target line: prioritize the one with fewer players, cap at 3
        let targetLine = 0;
        if (fLines[0].length >= 3) targetLine = 1;
        else if (fLines[1].length < fLines[0].length) targetLine = 1;

        let bestFit = null;
        let lineTags = fLines[targetLine].map(p => getPlayerWeightedStats(p.name).tag);

        // 🔗 THE GUARANTEE: If we have a PL, find a SN. If we have a SN, find a PL.
        if (lineTags.includes('PLAYMAKER')) {
            bestFit = offensiveSort.find(p => !usedNames.has(p.name) && getPlayerWeightedStats(p.name).tag === 'SNIPER');
        } else if (lineTags.includes('SNIPER')) {
            bestFit = offensiveSort.find(p => !usedNames.has(p.name) && getPlayerWeightedStats(p.name).tag === 'PLAYMAKER');
        }

        // If no chemistry partner is needed or available, use the standard offensive fit
        if (!bestFit) {
            bestFit = offensiveSort.find(p => !usedNames.has(p.name) && canAddForward(p, fLines[targetLine]));
        }
        
        // Final fallback to prevent empty slots
        if (!bestFit) bestFit = offensiveSort.find(p => !usedNames.has(p.name));
        
        if (bestFit) {
            fLines[targetLine].push(bestFit);
            usedNames.add(bestFit.name);

            // 🚨 THE DYNAMIC DUO OVERRIDE 🚨
            // If the guy we just drafted has a legendary partner, pull the partner immediately!
            let partnerName = getDuoPartner(bestFit.name);
            if (partnerName && fLines[targetLine].length < 3 && !usedNames.has(partnerName)) {
                let partner = offensiveSort.find(p => p.name === partnerName);
                if (partner) {
                    fLines[targetLine].push(partner);
                    usedNames.add(partner.name);
                }
            }
        } else {
            break; // Failsafe
        }
    }

    // 2. LINE 3: DEFENSIVE LOCKDOWN (DEF + CHK)
    let defensiveSort = [...fPool]
        .filter(p => !usedNames.has(p.name))
        .sort((a, b) => (getDef(b.name) + getChk(b.name)) - (getDef(a.name) + getChk(a.name)));

    fLines[2] = defensiveSort.splice(0, 3);
    fLines[2].forEach(p => usedNames.add(p.name));

    // 3. LINE 4: REMAINING DEPTH
    fLines[3] = fPool.filter(p => !usedNames.has(p.name)).slice(0, 3);

    // 4. DEFENSE PAIRS (OVR RANKED)
    let dPairs = [[], [], []];
    dPool.sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr);
    dPairs[0] = dPool.slice(0, 2);
    dPairs[1] = dPool.slice(2, 4);
    dPairs[2] = dPool.slice(4, 6);

    return { f: fLines, d: dPairs, g: gPool.sort((a,b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr) };
}

// 🛡️ SPECIAL TEAMS AUTO-COACH ENGINE
function getSpecialTeamsUnit(tk, type, unitNum) {
    let sks = rosters[tk] ? rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury === 0) : [];
    let f = sks.filter(p => p.pos !== 'D');
    let d = sks.filter(p => p.pos === 'D');

    let unit = [];

    if (type === 'PP') {
        // Sort by Offense for Power Play efficiency.
        f.sort((a, b) => getOff(b.name) - getOff(a.name));
        d.sort((a, b) => getOff(b.name) - getOff(a.name));
        
        let pool = (unitNum === 1) ? f : f.slice(4); 
        let selectedF = [];

        // Build 4-forward unit. 
        // 🚨 Passing 'PP' here drops the Firewall so Snipers/Playmakers can stack!
        for (let p of pool) {
            if (selectedF.length < 4 && canAddForward(p, selectedF, 'PP')) {
                selectedF.push(p);
            }
        }
        
        // Safety: Ensure unit is full even if archetype rules were restrictive.
        while (selectedF.length < 4 && pool.length > selectedF.length) {
            let next = pool.find(p => !selectedF.includes(p));
            if (next) selectedF.push(next);
        }

        let bestD = (unitNum === 1) ? d[0] : (d[1] || d[0]);
        unit = [...selectedF, bestD];
    } 
    else if (type === 'PK') {
        // Sort by Defense for Penalty Kill stability.
        f.sort((a, b) => getDef(b.name) - getDef(a.name));
        d.sort((a, b) => getDef(b.name) - getDef(a.name));
        
        // PK1 uses the #1 and #2 defensive forwards; PK2 uses #3 and #4.
        unit = (unitNum === 1) ? [...f.slice(0, 2), ...d.slice(0, 2)] : [...f.slice(2, 4), ...d.slice(2, 4)];
    }

    // Always ensure D-men are at the end of the array for clean logging.
    return unit.sort((a, b) => (a.pos === 'D' ? 1 : 0) - (b.pos === 'D' ? 1 : 0));
}

function getSpecialTeamsRating(tk, mode = 'PP', unitNum = 1) {
    const isPP = mode === 'PP'; const players = getSpecialTeamsUnit(tk, mode, unitNum);
    let score = players.reduce((sum, p) => { const stats = playerStats[p.name]; if (!stats) return sum; const ovr = getLiveIceOvr(p.name); if (isPP) { return sum + ovr + getGradeMod(stats.attr.pass || 'C') * 2 + getGradeMod(stats.attr.shotPwr || 'C') * 1.5; } else { return sum + ovr * 0.9 + getGradeMod(stats.attr.def || 'C') * 2 + getGradeMod(stats.attr.check || 'C') * 1.5; } }, 0);
    return Math.max(0, score / Math.max(players.length, 1));
}
function getSpecialTeamsChance(attackingTk, defendingTk) { const diff = getSpecialTeamsRating(attackingTk, 'PP') - getSpecialTeamsRating(defendingTk, 'PK'); const pace = Math.max(0.90, Math.min(1.12, getSpecialTeamsRating(attackingTk, 'PP') / 85)); return Math.max(0.10, Math.min(0.46, 0.18 + diff * 0.0028 * pace)); }
function getDefenseAndGoalieModifiers(defRating, goalie) {
    const shot = Math.max(0.75, Math.min(1.25, 1 - (defRating - 70) * 0.004));
    if (!goalie || !playerStats[goalie.name]) return { shot, goal: 1.0 };
    const gStats = playerStats[goalie.name]; const agilMod = getGradeMod(gStats.attr.agil || 'C'); const speedMod = getGradeMod(gStats.attr.speed || 'C');
    const streakModifier = gStats.streakType === 'hot' ? 1.10 : (gStats.streakType === 'cold' ? 0.90 : 1.0);
    const quality = Math.max(0.75, Math.min(1.25, (gStats.attr.gDef || 70) / 70 * ((agilMod + speedMod) / 2) * streakModifier));
    return { shot, goal: Math.max(0.80, Math.min(1.25, 1 - (quality - 1) * 0.30)) };
}
function getActiveSkaters(tk) { const s = getRosterStructure(tk); return [...s.f.flat(), ...s.d.flat(), ...(s.g.slice(0, 2))]; }

// --- GAME MATH & STATS ---
function pois(l) { if(isNaN(l) || l <= 0 || l === Infinity) return 0; let L = Math.exp(-l), kv = 0, pr = 1; do { kv++; pr *= Math.random(); } while(pr > L); return kv - 1; }
function checkMilestones(pName) { } function processStreaks(pName, nightPts) { } function processGoalieStreaks(pName, ga, sa, win) { }
function calculateStars(hSc, aSc, hGn, aGn, hW, aW, hGA, aGA) { 
    let c = []; const add = (n, pts) => { if(!n) return; let ex = c.find(x => x.n === n); if(ex) ex.s += pts; else c.push({n, s:pts}); }; 
    hSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); aSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); 
    if(hGn) add(hGn, (25-hGA) + (hGA === 0 ? 50 : 0) + (hW ? 20 : 0)); if(aGn) add(aGn, (25-aGA) + (aGA === 0 ? 50 : 0) + (aW ? 20 : 0)); 
    return c.sort((a,b) => b.s - a.s).slice(0,3).map(x => x.n); 
}

function creditStats(tk, oppTk, goals, k, baseOff, hPPG, teamSHG, teamEXA, activeSkaters) {
    let ev = []; 
    const blendStat = (base, comp) => base * (1 + ((comp - 1) * 0.75)); // Dampener at 0.75

    for(let i = 0; i < goals; i++) {
        let pG = false, sH = false, isEN = false;
        if (hPPG > 0 && Math.random() < (hPPG / goals)) { pG = true; hPPG--; }
        else if (teamSHG > 0 && Math.random() < (teamSHG / Math.max(1, goals - hPPG))) { sH = true; teamSHG--; }
        if (!pG && teamEXA > 0 && Math.random() < 0.22) { isEN = true; teamEXA--; }

        let u; let dUnit = [];
        let struct = getRosterStructure(tk);
        
        if (pG) {
            u = getSpecialTeamsUnit(tk, 'PP', (Math.random() < 0.55 ? 1 : 2));
        } else if (sH) {
            u = getSpecialTeamsUnit(tk, 'PK', (Math.random() < 0.60 ? 1 : 2));
        } else {
            // --- ICE TIME WEIGHTS (5v5 ONLY) ---
            const fWeights = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3];
            const fIndex = fWeights[Math.floor(Math.random() * fWeights.length)];
            const activeForwards = struct.f[fIndex] || struct.f[0];

            const dWeights = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2];
            const dIndex = dWeights[Math.floor(Math.random() * dWeights.length)];
            const activeDefense = struct.d[dIndex] || struct.d[0]; 

            // Combine to create the 5-man unit currently on the ice
            u = [...activeForwards, ...activeDefense];
        }

        let oppStruct = getRosterStructure(oppTk); 
        dUnit = [...(oppStruct.f[0] || []), ...(oppStruct.d[0] || [])];

        let shotRoll = Math.random();
        let goalDist = (shotRoll < 0.35) ? 'Close' : (shotRoll > 0.87 ? 'Far' : 'Medium');

        // ==========================================
        // 🚨 MULTIPLICATIVE GOAL WEIGHT MAPPING 🚨
        // ==========================================
        const gWeights = u.map(p => {
            let pA = playerStats[p.name].attr;
            let pwrM = getGradeMod(pA.shotPwr || 'C');
            let wgtM = getWgt(p.name);
            const tag = getPlayerWeightedStats(p.name).tag;

            let modifier = 1.0; 
            
            // Empty Net gets a massive multiplier
            if (isEN) modifier *= 3.20;

            // Chaos/Volatility Index
            if (pwrM >= 1.25) {
                gameStatus.globalChaos = Math.min(1.0, gameStatus.globalChaos + 0.05);
                modifier *= 1.05; 
            }    

            // Momentum / Chaos variables (Converted from +/- 15 flat to 20% swings)
            if (playerStats[p.name].isHot) modifier *= 1.20;
            if (playerStats[p.name].isCold) modifier *= 0.80;

            // --- BASE POSITIONAL LOGIC ---
            let compMod = p.pos === 'D' ? 0.70 : 1.25; 

            // Shot Distance Logic for Defensemen
            if (p.pos === 'D') {
                if (goalDist === 'Far') {
                    compMod *= 1.0; 
                } else {
                    compMod *= 0.60; 
                }
            }

            // --- ARCHETYPES & TWEAKS (Now acting as Multipliers) ---
            if (tag === 'SNIPER') modifier *= 1.88;
            else if (tag === 'DANGLER') modifier *= 1.42; 
            else if (tag === 'POWER FORWARD' || tag === 'POWER FWD' || tag === 'PF') modifier *= (wgtM >= 1.20 ? 1.40 : 1.20);
            else if (tag === 'SPEEDSTER') modifier *= 1.25;
            else if (tag === 'GRINDER') { modifier *= 1.12; compMod += 0.05; } 
            else if (tag === 'PLAYMAKER') { modifier *= 0.82; compMod -= 0.05; } // Reduced scoring chance for pure passers
            else if (tag === 'OFFENSIVE FWD') modifier *= 1.09;
            else if (tag === 'TWO-WAY FWD') modifier *= 1.08;
            else if (tag === 'DEFENSIVE FWD') modifier *= 0.95; // Slight penalty
            else if (tag === 'FRANCHISE D') modifier *= 1.47;
            else if (tag === 'BOOMER') modifier *= (goalDist === 'Far' ? 1.43 : 1.16);
            else if (tag === 'QUARTERBACK') modifier *= 1.16;
            else if (tag === 'TWO-WAY STAR') modifier *= 1.17;
            else if (tag === 'OFFENSIVE D') modifier *= 1.08;
            else if (tag === 'TWO-WAY D') modifier *= 1.07;
            else if (tag === 'SHUTDOWN') modifier *= 1.07; 
            else if (tag === 'DEFENSIVE D') modifier *= 1.03;

            // Generate the random 1-100 base roll
            let r = Math.floor(Math.random() * 100) + 1;

            // 🚨 THE FIX: Calculate base chance FIRST, then apply the master modifier 🚨
            let baseChance = (r * compMod) + (pA.off * 0.10);
            let finalStat = Math.max(1, baseChance * modifier);            
            
            return finalStat;
        });

        let tGW = gWeights.reduce((a,b)=>a+b,0), rG = Math.random()*tGW, cG = 0, scr = u[0];
        for(let j=0; j<u.length; j++){ cG+=gWeights[j]; if(rG<=cG){ scr=u[j]; break; }}

        playerStats[scr.name][k].g++; 
        playerStats[scr.name][k].pts = (playerStats[scr.name][k].pts || 0) + 1; 
        if(pG) playerStats[scr.name][k].ppg = (playerStats[scr.name][k].ppg || 0) + 1;
        if(sH) playerStats[scr.name][k].shg = (playerStats[scr.name][k].shg || 0) + 1;

        // Grinder Momentum Check
        if (getPlayerWeightedStats(scr.name).tag === 'GRINDER') {
            rosters[tk].forEach(p => { if(playerStats[p.name]) playerStats[p.name].fatigue = Math.max(0, (playerStats[p.name].fatigue || 0) - 2); });
        }

        // ==========================================
        // 🚨 MULTIPLICATIVE ASSIST SYSTEM 🚨
        // ==========================================
        let a1N = null, a2N = null;
        let pPassers = u.filter(p => p.name !== scr.name);
        
        const getAWeight = (p, isSec) => {
            let passM = getGradeMod(playerStats[p.name].attr.pass || 'C');
            
            // Base positional mod: Defensemen are heavily penalized (30% secondary, 10% primary)
            let mod = (playerStats[p.name].pos === 'D') ? (isSec ? 0.50 : 0.25) : 1.0;
            const t = getPlayerWeightedStats(p.name).tag;
            
            // Multipliers override the base mod
            if (t === 'PLAYMAKER') {
                mod *= 1.25;
            } else if (t === 'QUARTERBACK' || t === 'FRANCHISE D') {
                mod *= 1.25;  
            }
            return blendStat(baseOff, passM) * mod;
        };

        if (pPassers.length > 0 && Math.random() < 0.96) {
            let tA1 = pPassers.reduce((s, p) => s + getAWeight(p, false), 0);
            let rA1 = Math.random()*tA1, cA1 = 0, a1 = pPassers[0];
            for(let p of pPassers){ cA1 += getAWeight(p, false); if(rA1 <= cA1){ a1 = p; break; }}
            playerStats[a1.name][k].a++; playerStats[a1.name][k].pts++; a1N = a1.name;
            if (pG) playerStats[a1.name][k].ppa = (playerStats[a1.name][k].ppa || 0) + 1; 

            let sPassers = pPassers.filter(p => p.name !== a1N);
            let sChance = u.some(p => getPlayerWeightedStats(p.name).tag === 'PLAYMAKER') ? 0.88 : 0.70;
            if (sPassers.length > 0 && Math.random() < sChance) {
                let tA2 = sPassers.reduce((s, p) => s + getAWeight(p, true), 0);
                let rA2 = Math.random()*tA2, cA2 = 0, a2 = sPassers[0];
                for(let p of sPassers){ cA2 += getAWeight(p, true); if(rA2 <= cA2){ a2 = p; break; }}
                playerStats[a2.name][k].a++; playerStats[a2.name][k].pts++; a2N = a2.name;
                if (pG) playerStats[a2.name][k].ppa = (playerStats[a2.name][k].ppa || 0) + 1; 
            }
        }
        
        ev.push({scorer: scr.name, a1: a1N, a2: a2N, onIce: u.map(p=>p.name), oppOnIce: dUnit.map(p=>p.name), isPP: pG, isEN: isEN});
    }
    return ev;
}

function simGame(idx) {
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[idx];
    if(!g || g.result) return;
    gameMilestones = [];
    const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
    let matchStats = {}; const trk = (pN, st, v=1) => { if(pN){ if(!matchStats[pN]) matchStats[pN] = {g:0,a:0,s:0,pm:0,pim:0,sa:0,sv:0,ga:0}; matchStats[pN][st] += v; } };
    const heal = tk => { if(rosters[tk]) rosters[tk].forEach(p => { if(playerStats[p.name] && playerStats[p.name].injury > 0) playerStats[p.name].injury--; }); }; heal(g.h.nrm); heal(g.a.nrm);
    // 🎲 NEW: PRE-GAME MICRO STREAKS (The "Any Given Night" factor)
    if (rosters[g.h.nrm]) assignMicroStreaks(rosters[g.h.nrm]);
    if (rosters[g.a.nrm]) assignMicroStreaks(rosters[g.a.nrm]);
    // 🩹 IN-GAME INJURY EVENT ROLL
    let postGameInjuries = [];
        const rollInGameInjuries = (tk) => {
        if (!awardConfig.injuries) return;
        let skaters = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury === 0);
        if (skaters.length < 5) return;

        // Pick a potential victim
        let pool = skaters.sort(() => Math.random() - 0.5).slice(0, 3);
        let victim = pool[0]; let ps = playerStats[victim.name];
        
        let injChance = 0.033; // Slightly higher base chance for "minor" stuff
        let fatg = getPlayerFatigueAmount(victim.name);
        if (fatg >= 5) injChance += 0.04; 
        if (ps.age >= 32) injChance += 0.015;
        
        let endur = ps.attr.endur || 'C';
        if (endur.includes('A')) injChance -= 0.015; 
        else if (endur.includes('C')) injChance += 0.025;

        if (Math.random() < Math.max(0.01, injChance)) {
            let daysOut = 0; 
            let sevRoll = Math.random();
            let gamesOut; // 👈 DECLARE IT HERE FIRST
            
            // --- NEW DISTRIBUTION: 50% chance of a 5-10 Game Injury ---
            if (sevRoll < 0.15) {
                gamesOut = -1; // 10% chance: Leaves game, back next game
            } else if (sevRoll < 0.25) {
                gamesOut = 0;  // 10% chance: Stays in game (Minor stinger)
            } else if (sevRoll < 0.60) {
                gamesOut = Math.floor(Math.random() * 4) + 1; // 30% chance: 1-4 Games
            } else {
                gamesOut = Math.floor(Math.random() * 6) + 5; // 50% chance: 5-10 Games
            }
            
            // Modifiers (These can now see gamesOut successfully!)
            if (ps.age >= 35 && gamesOut > 0) gamesOut += 1;
            if (endur.includes('A') && gamesOut > 1) gamesOut -= 1;
            
            // Ensure we don't exceed your 10-game cap
            gamesOut = Math.max(-1, Math.min(10, gamesOut));
            
            // Failsafe Extreme Crisis Check
            let isD = victim.pos === 'D';
            let healthyCount = rosters[tk].filter(p => playerStats[p.name] && playerStats[p.name].injury === 0 && ((isD && p.pos === 'D') || (!isD && p.pos !== 'D' && p.pos !== 'G'))).length;
            
            if ((isD && healthyCount <= 4) || (!isD && healthyCount <= 9)) {
                gamesOut = 0; 
                tradeLog.unshift({ day: currentDay, details: `🩹 MIRACLE RECOVERY: ${victim.name} (${tk.toUpperCase()}) shook off an injury due to an empty bench!` });
            } else if (gamesOut !== 0) {
                // 🛡️ MODIFIED: Now accurately says "games" instead of "days"
                let severityLabel = gamesOut === -1 ? "will return next game" : `will miss ${gamesOut} games`;
                tradeLog.unshift({ day: currentDay, details: `🚨 INJURY: ${victim.name} (${tk.toUpperCase()}) left the game and ${severityLabel}.` });
            }

            if (gamesOut !== 0) postGameInjuries.push({ name: victim.name, games: gamesOut }); // Changed variable to games
            
            // Double-Shift Fatigue Hit for the bench
            let replacements = rosters[tk].filter(p => p.pos === victim.pos && p.name !== victim.name && playerStats[p.name].injury === 0);
            if (replacements.length > 0) {
                let rep = replacements[Math.floor(Math.random() * replacements.length)];
                playerStats[rep.name].extra_shifts = (playerStats[rep.name].extra_shifts || 0) + 1;
            }
        }
    };
    rollInGameInjuries(g.h.nrm); rollInGameInjuries(g.a.nrm);

    const selG = (tk) => { 
        const gs = rosters[tk] ? rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury === 0).sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr) : []; 
        if (!gs.length) return null;
        if (gs.length === 1 || isPlayoffs || isASG) return gs[0];
        const starter = gs[0]; const backup = gs[1]; const sStats = playerStats[starter.name][k];
        let diff = getPlayerWeightedStats(starter.name).ovr - getPlayerWeightedStats(backup.name).ovr;
        let restChance = 0.15; if (diff <= 2) restChance = 0.45; else if (diff <= 5) restChance = 0.30; 
        if (playedYesterday(tk)) restChance += 0.40;
        
        if (sStats.consStarts >= 4 || (sStats.consStarts >= 3 && Math.random() < 0.5) || Math.random() < restChance) {
            sStats.consStarts = 0; if(playerStats[backup.name][k]) playerStats[backup.name][k].consStarts = (playerStats[backup.name][k].consStarts || 0) + 1;
            return backup;
        } else {
            sStats.consStarts = (sStats.consStarts || 0) + 1; if(playerStats[backup.name][k]) playerStats[backup.name][k].consStarts = 0;
            return starter;
        }
    };  
    const hG_obj = selG(g.h.nrm), aG_obj = selG(g.a.nrm);
    
    const getRat = (tk, aG_o) => {
        if(!rosters[tk] || rosters[tk].length === 0) return {final:1, off:1, sks:[]};
        const struct = getRosterStructure(tk); const sks = [...struct.f.flat(), ...struct.d.flat()]; if (sks.length === 0) return {final:1, off:1, sks: []};
        let off = sks.reduce((s,p) => { const ps = playerStats[p.name]; return s + ps.attr.off + (getGradeMod(ps.attr.speed || 'C') + getGradeMod(ps.attr.agil || 'C') - 1.6) * 4; }, 0) / sks.length;        
        let def = (sks.reduce((s,p) => s + playerStats[p.name].attr.def, 0) / sks.length * 0.3) + ((aG_o ? playerStats[aG_o.name].attr.gDef : 60) * 0.7);
        return {final: Math.max((off + def) / 2, 1), off: Math.max(off,1), def: def, sks: sks};
    }; 
    
    const hT = getRat(g.h.nrm, hG_obj); const aT = getRat(g.a.nrm, aG_obj); const noise = 1;
    [g.h, g.a].forEach(t => { if(t.undefeated === undefined) t.undefeated = 0; if(t.winless === undefined) t.winless = 0; });
    let ratio = hT.final / aT.final; let power = (hT.final > 85 && aT.final > 85) ? 0.35 : 0.42;
    
    let hPPRate = getSpecialTeamsChance(g.h.nrm, g.a.nrm); 
    let aPPRate = getSpecialTeamsChance(g.a.nrm, g.h.nrm);
    
    // 🛡️ SHUTDOWN D PENALTY KILL BONUS: Subtract 5% (0.05) from opponent's PP conversion rate
    if (getSpecialTeamsUnit(g.h.nrm, 'PK', 1).some(p => getPlayerWeightedStats(p.name).tag === 'SHUTDOWN')) aPPRate = Math.max(0.01, aPPRate - 0.05);
    if (getSpecialTeamsUnit(g.a.nrm, 'PK', 1).some(p => getPlayerWeightedStats(p.name).tag === 'SHUTDOWN')) hPPRate = Math.max(0.01, hPPRate - 0.05);

    let hPPG = 0, aPPG = 0, hSHG = 0, aSHG = 0, penaltyEvents = []; let hPR = Math.floor(Math.random() * 5); let aPR = Math.floor(Math.random() * 5);

    if(!isASG) {
        const processPenalties = (tk_penalized, numEvents, sks, ppRate) => {
            let ppg = 0, shg = 0; let events = []; if (!numEvents) return { ppg, shg, events };
            for (let i = 0; i < numEvents; i++) {
                if (sks.length > 0) { let off = sks[0].name; playerStats[off][k].pim += 2; trk(off, 'pim', 2); }
                if (Math.random() < ppRate) ppg++; else if (Math.random() < 0.035) shg++;
                events.push({ p: 1, m: 10, s: 0, str: `P1 10:00`, tm: tk_penalized, cl: teamColors[tk_penalized] ? teamColors[tk_penalized][0] : '#fff', txt: `PENALTY: 2-minute minor`, isPenalty: true });
            }
            return { ppg, shg, events };
        };
        const hPP_Result = processPenalties(g.a.nrm, aPR, aT.sks, hPPRate); hPPG = hPP_Result.ppg; aSHG = hPP_Result.shg; penaltyEvents.push(...hPP_Result.events);
        const aPP_Result = processPenalties(g.h.nrm, hPR, hT.sks, aPPRate); aPPG = aPP_Result.ppg; hSHG = aPP_Result.shg; penaltyEvents.push(...aPP_Result.events);
    }

    let hQual = Math.max(0.65, Math.min(1.35, hT.off / 75)); let aQual = Math.max(0.65, Math.min(1.35, aT.off / 75));
    const hMod = getDefenseAndGoalieModifiers(aT.def, hG_obj); const aMod = getDefenseAndGoalieModifiers(hT.def, aG_obj);
    
    // 🧱 NEW: MACRO AURAS & WALL GOALIE MATH
    let hAuraMod = (getTeamSystemAura(g.h.nrm) === 'OFFENSIVE TEAM' ? 1.15 : (getTeamSystemAura(g.h.nrm) === 'DEFENSIVE TEAM' ? 0.85 : 1.0));
    let aAuraMod = (getTeamSystemAura(g.a.nrm) === 'OFFENSIVE TEAM' ? 1.15 : (getTeamSystemAura(g.a.nrm) === 'DEFENSIVE TEAM' ? 0.85 : 1.0));
    let hWallMod = (hG_obj && getPlayerWeightedStats(hG_obj.name).tag === 'WALL') ? 0.82 : 1.0;
    let aWallMod = (aG_obj && getPlayerWeightedStats(aG_obj.name).tag === 'WALL') ? 0.82 : 1.0;
    
    let asgBoost = isASG ? 2.2 : 1.0;
    let hBase = (4.64 * hQual * hMod.goal) * asgBoost * hAuraMod * aWallMod; 
    let aBase = (4.64 * aQual * aMod.goal) * asgBoost * aAuraMod * hWallMod;
    let hG = pois(hBase * Math.pow(ratio, power)) + hPPG + hSHG; let aG = pois(aBase * Math.pow(1 / ratio, power)) + aPPG + aSHG;

    let hEN = 0, aEN = 0; let hEXA = 0, aEXA = 0; 
    if (!isASG && (Math.abs(hG - aG) <= 2)) {
        let enRoll = Math.random();
        if (enRoll < 0.15) { tradeLog.unshift({day: currentDay, details: `🏒 EXTRA ATTACKER: ${hG > aG ? g.a.code : g.h.code} scores with the goalie pulled!`}); if (hG > aG) { aG++; aEXA++; } else { hG++; hEXA++; } } 
        else if (enRoll < 0.45) { tradeLog.unshift({day: currentDay, details: `🥅 EMPTY NET: ${hG > aG ? g.h.code : g.a.code} puts the game away!`}); if (hG > aG) { hG++; hEN++; } else { aG++; aEN++; } }
    }

    let otPeriods = 0;
    if(isPlayoffs && hG === aG) { 
        while (hG === aG && otPeriods < 7) { otPeriods++; let hOT = pois((0.85 + noise*0.2) * Math.pow(ratio, power)); let aOT = pois(0.85 * Math.pow(1 / ratio, power)); if (hOT > aOT) hG++; else if (aOT > hOT) aG++; else if (hOT > 0) { Math.random() < 0.5 ? hG++ : aG++; } }
        if (hG === aG) Math.random() < (hT.final / (hT.final + aT.final)) ? hG++ : aG++;
    }
    const hSc = creditStats(g.h.nrm, g.a.nrm, hG, k, hT.off, hPPG, hSHG, hEXA, hT.sks);
    const aSc = creditStats(g.a.nrm, g.h.nrm, aG, k, aT.off, aPPG, aSHG, aEXA, aT.sks);
    [...hSc, ...aSc].forEach(gl => { trk(gl.scorer, 'g'); if(gl.a1) trk(gl.a1, 'a'); if(gl.a2) trk(gl.a2, 'a'); });
    
    // 📊 TRUE PLUS-MINUS (+/-) TRACKER
    const applyPM = (goals) => {
        goals.forEach(gl => {
            if (!gl.isPP && !gl.isSH) { 
                gl.onIce.forEach(pN => { if(playerStats[pN]) { playerStats[pN][k].pm++; trk(pN, 'pm', 1); } });
                if (gl.oppOnIce) gl.oppOnIce.forEach(pN => { if(playerStats[pN]) { playerStats[pN][k].pm--; trk(pN, 'pm', -1); } });
            }
        });
    };
    applyPM(hSc); applyPM(aSc); 

    let allGoals = []; const makeTime = () => { let p = Math.floor(Math.random() * 3) + 1; let m = Math.floor(Math.random() * 20); let s = Math.floor(Math.random() * 60); return { p, m, s, str: `P${p} ${m}:${s < 10 ? '0'+s : s}` }; };
    hSc.forEach(goal => { let t = makeTime(); let aStr = goal.a1 ? `(${goal.a1}${goal.a2 ? ', ' + goal.a2 : ''})` : '(Unassisted)'; allGoals.push({ ...t, tm: g.h.code, cl: teamColors[g.h.nrm] ? teamColors[g.h.nrm][0] : '#fff', txt: `${t.str} - ${goal.scorer} ${aStr}${goal.isPP ? ' [PP]' : ''}`, isPenalty: false }); });
    aSc.forEach(goal => { let t = makeTime(); let aStr = goal.a1 ? `(${goal.a1}${goal.a2 ? ', ' + goal.a2 : ''})` : '(Unassisted)'; allGoals.push({ ...t, tm: g.a.code, cl: teamColors[g.a.nrm] ? teamColors[g.a.nrm][0] : '#fff', txt: `${t.str} - ${goal.scorer} ${aStr}${goal.isPP ? ' [PP]' : ''}`, isPenalty: false }); });
    allGoals.push(...penaltyEvents); allGoals.sort((a,b) => a.p !== b.p ? a.p - b.p : (a.m !== b.m ? a.m - b.m : a.s - b.s));
    
    g.result = { hG, aG, ot: otPeriods, boxLog: allGoals, hSc, aSc, matchStats, awayRoster: aT.sks.map(p=>p.name), homeRoster: hT.sks.map(p=>p.name) }; 

    const pG = (tk, ga, resultStatus, oOff, aG_o, defShotMod = 1) => {
        if (!aG_o) return [null, 0]; const gN = aG_o.name; 
        let sh = Math.round((Math.floor(Math.random() * 15) + 32 + Math.floor(oOff / 10)) * defShotMod); if (otPeriods > 0) sh += Math.floor(Math.random() * 8 + 5) * otPeriods; if (sh < ga) sh = ga + Math.floor(Math.random() * 5);
        
        let allGoalies = rosters[tk] ? rosters[tk].filter(p => p.pos === 'G') : [];
        if (isASG && allGoalies.length >= 3) {
            let p1G = allGoalies[0].name, p2G = allGoalies[1].name, p3G = allGoalies[2].name;
            let baseSh = Math.floor(sh / 3); let sh1 = baseSh + (Math.floor(Math.random() * 5) - 2); let sh2 = baseSh + (Math.floor(Math.random() * 5) - 2); let sh3 = sh - sh1 - sh2;
            let ga1 = 0, ga2 = 0, ga3 = 0; for (let i = 0; i < ga; i++) { let roll = Math.random(); if (roll < 0.33) ga1++; else if (roll < 0.66) ga2++; else ga3++; }
            if (sh1 < ga1) sh1 = ga1; if (sh2 < ga2) sh2 = ga2; if (sh3 < ga3) sh3 = ga3;
            trk(p1G, 'sa', sh1); trk(p1G, 'sv', sh1 - ga1); trk(p1G, 'ga', ga1); trk(p2G, 'sa', sh2); trk(p2G, 'sv', sh2 - ga2); trk(p2G, 'ga', ga2); trk(p3G, 'sa', sh3); trk(p3G, 'sv', sh3 - ga3); trk(p3G, 'ga', ga3);
            return [p1G, sh]; 
        }

        let backup = rosters[tk] ? rosters[tk].find(p => p.pos === 'G' && p.name !== gN && playerStats[p.name].injury === 0) : null;
        let wasPulled = false; let starterGA = ga, starterSH = sh; let backupGA = 0, backupSH = 0;

        if (!isASG && ga >= 5 && otPeriods === 0 && backup && Math.random() < 0.15) {  
            wasPulled = true; starterGA = 3 + Math.floor(Math.random() * (ga - 3)); backupGA = ga - starterGA;
            starterSH = starterGA + Math.floor(Math.random() * 10) + 1; backupSH = Math.max(backupGA + 2, sh - starterSH); sh = starterSH + backupSH; 
            if (awardConfig.headlines && Math.random() < 0.3) tradeLog.unshift({day: currentDay, details: `🚨 MERCY PULL: ${gN} (${tk.toUpperCase()}) hooked after ${starterGA} goals. ${backup.name} steps in.`});
        }

        if (!isASG) { 
            const s = playerStats[gN][k]; s.gp++; s.sa += starterSH; s.sv += (starterSH - starterGA); 
            if (starterGA === 0 && !wasPulled) s.so++; 
            if (resultStatus === 'win') s.w++; else if (resultStatus === 'loss') s.l++; else s.t++; 
            trk(gN, 'sa', starterSH); trk(gN, 'sv', starterSH - starterGA); trk(gN, 'ga', starterGA);
            if (wasPulled && backup) {
                const bS = playerStats[backup.name][k]; bS.gp++; bS.sa += backupSH; bS.sv += (backupSH - backupGA);
                trk(backup.name, 'sa', backupSH); trk(backup.name, 'sv', backupSH - backupGA); trk(backup.name, 'ga', backupGA); 
            }
        } else { trk(gN, 'sa', starterSH); trk(gN, 'sv', starterSH - starterGA); trk(gN, 'ga', starterGA); }
        return [gN, sh];  
    };
    
    let hStatus = hG > aG ? 'win' : (hG < aG ? 'loss' : 'tie'); let aStatus = aG > hG ? 'win' : (aG < hG ? 'loss' : 'tie');
    const [hGn, hShots] = pG(g.h.nrm, Math.max(0, aG - aEN), hStatus, aT.off, hG_obj, hMod.shot); 
    const [aGn, aShots] = pG(g.a.nrm, Math.max(0, hG - hEN), aStatus, hT.off, aG_obj, aMod.shot);
    g.result.hGoalie = hGn; g.result.aGoalie = aGn; g.result.hShots = aShots; g.result.aShots = hShots; g.result.stars = calculateStars(hSc, aSc, hGn, aGn, hG > aG, aG > hG, aG, hG); 
    
    if (!isASG) {
        // 🥇 GWG (GAME WINNING GOAL) TRACKER
        if (hG > aG && hSc.length > aG) { let scorer = hSc[aG].scorer; if (playerStats[scorer]) { playerStats[scorer][k].gwg++; trk(scorer, 'gwg', 1); } } 
        else if (aG > hG && aSc.length > hG) { let scorer = aSc[hG].scorer; if (playerStats[scorer]) { playerStats[scorer][k].gwg++; trk(scorer, 'gwg', 1); } }

        const distributeShots = (tk, totalShots, goalsList, activeSkaters) => {
            if(!activeSkaters || activeSkaters.length === 0) return; const skaters = activeSkaters;
            goalsList.forEach(gl => { if(gl.scorer && playerStats[gl.scorer]) { playerStats[gl.scorer][k].s = (playerStats[gl.scorer][k].s || 0) + 1; trk(gl.scorer, 's', 1); totalShots--; } });
            if(totalShots <= 0) return;
            const weights = skaters.map(p => playerStats[p.name].attr.off * (p.pos === 'D' ? 0.55 : 1.0)); // 📉 REDUCED FROM 0.3 TO 0.1
            const totalWeight = weights.reduce((a,b)=>a+b, 0);
            for(let i=0; i<totalShots; i++) { let roll = Math.random() * totalWeight; let cum = 0; for(let j=0; j<skaters.length; j++) { cum += weights[j]; if(roll <= cum) { playerStats[skaters[j].name][k].s = (playerStats[skaters[j].name][k].s || 0) + 1; trk(skaters[j].name, 's', 1); break; } } }
        };
        distributeShots(g.h.nrm, hShots, hSc, hT.sks); distributeShots(g.a.nrm, aShots, aSc, aT.sks); 
        [hT.sks, aT.sks].forEach(list => list.forEach(s => { if(playerStats[s.name]) playerStats[s.name][k].gp++; }));
        
        if(!isPlayoffs) {
            if(hG > aG) { g.h.season.w++; g.h.season.pts += 2; g.a.season.l++; g.h.winStreak++; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless = 0; g.a.loseStreak++; g.a.winless++; g.a.winStreak = 0; g.a.undefeated = 0; } 
            else if(aG > hG) { g.a.season.w++; g.a.season.pts += 2; g.h.season.l++; g.a.winStreak++; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless = 0; g.h.loseStreak++; g.h.winless++; g.h.winStreak = 0; g.h.undefeated = 0; } 
            else { g.h.season.t++; g.a.season.t++; g.h.season.pts++; g.a.season.pts++; g.h.winStreak = 0; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless++; g.a.winStreak = 0; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless++; }
            g.h.season.gp++; g.a.season.gp++; g.h.season.gf += hG; g.h.season.ga += aG; g.a.season.gf += aG; g.a.season.ga += hG;
        } else if(g.series) { if(hG > aG) g.series.hW++; else g.series.aW++; }
    }
    // 🧹 POST-GAME CLEANUP
    postGameInjuries.forEach(inj => { if(playerStats[inj.name]) playerStats[inj.name].injury = Math.max(0, inj.games); });
    [...hT.sks, ...aT.sks].forEach(p => { if(playerStats[p.name]) playerStats[p.name].extra_shifts = 0; });
    
// 🚨 NEW: Evaluate rolling performance streaks (FIXED GOALIE VARIABLES)
    let activeGoalies = [hG_obj, aG_obj].filter(g => g !== null);
    processPostGameStreaks([...hT.sks, ...aT.sks], activeGoalies);
}
// Standalone function to handle penalty logic
function checkHitPenalty(attacker, severity) {
    // 1. Get the roughness rating (assumes a 0-99 scale, defaults to 50 if missing)
    let roughness = ps.roughness || 50; 

    // 2. Set a base chance for a penalty. 
    // IMPORTANT: You will need to tune this number based on how often 
    // you call this function (e.g., every second, every shift, or every shot)
    let basePenaltyChance = 0.05; // Example: 5% base chance

    // 3. Create the Roughness Modifier
    // Roughness of 50 = 1.0 (Normal chance)
    // Roughness of 99 = ~2.0 (Double the chance)
    // Roughness of  0 = 0.0 (Won't take penalties)
    let roughnessModifier = (roughness / 50); 
    
    // 4. Calculate final probability
    let finalPenaltyChance = basePenaltyChance * roughnessModifier;

    // 5. Roll the dice!
    if (Math.random() < finalPenaltyChance) {
        
        // A penalty is called! Let's determine the severity.
        // 85% chance of a Minor (2 min), 15% chance of a Major (5 min)
        let isMajor = Math.random() < 0.15; 
        let pim = isMajor ? 5 : 2;

        return {
            penaltyCalled: true,
            minutes: pim,
            type: isMajor ? "Major" : "Minor"
            // You could expand this later to pick random names like "Tripping" or "Fighting"
        };
    }

    // No penalty occurred
    return {
        penaltyCalled: false,
        minutes: 0,
        type: "None"
    };
}
// --- SEASON CALENDAR LOGIC ---
async function loadScheduleFromCSV(customRows = null) {
    try {
        const rows = customRows ? customRows : await (async () => {
            try { const text = await fetchCSV(scheduleUrl); return await parseCSV(text); } 
            catch (err) { if (scheduleUrl === DEFAULT_SCHEDULE_URL) return SAMPLE_SCHEDULE_DATA; else throw err; }
        })();
        const scheduleValidation = validateScheduleData(rows);
        if (!scheduleValidation.ok) throw new Error(scheduleValidation.error || 'Invalid schedule data.');
        const headerRow = rows[0] || [];
        const dateIdx = getHeaderIndex(headerRow, ['DATE', 'GAME DATE', 'MATCH DATE'], 0);
        const homeIdx = getHeaderIndex(headerRow, ['HOME', 'HOST'], 3);
        const awayIdx = getHeaderIndex(headerRow, ['AWAY', 'VISITOR', 'GUEST'], 2);

        if (dateIdx === -1 || homeIdx === -1 || awayIdx === -1) throw new Error('Schedule CSV must include DATE, HOME, and AWAY columns.');

        const findTeam = (csvName) => {
            if (!csvName) return null; const cleanName = String(csvName).trim(); const nrmName = cleanName.toLowerCase().replace(/\s+/g, '');
            let t = league.find(x => x.nrm === nrmName); if (t) return t;
            const mappedCode = teamMap[cleanName]; if (mappedCode) { t = league.find(x => x.code === mappedCode); if (t) return t; }
            t = league.find(x => x.code === cleanName.toUpperCase()); if (t) return t;
            return league.find(x => x.name.toLowerCase().includes(cleanName.toLowerCase()));
        };

        let tempDayMap = {};
        let validRows = 0;
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i]; if (!row || !row.length) continue;
            const gameDate = String(row[dateIdx] || '').trim(); const visitorName = String(row[awayIdx] || '').trim(); const homeName = String(row[homeIdx] || '').trim();
            if (!gameDate || !visitorName || !homeName) continue;
            const awayTeam = findTeam(visitorName); const homeTeam = findTeam(homeName);
            if (!awayTeam || !homeTeam) continue;
            if (!tempDayMap[gameDate]) tempDayMap[gameDate] = [];
            tempDayMap[gameDate].push({ h: homeTeam, a: awayTeam, result: null });
            validRows++;
        }

        const sortedDates = Object.keys(tempDayMap).sort((a, b) => { const aTime = Date.parse(a); const bTime = Date.parse(b); if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime; return a.localeCompare(b); });
        calendar = sortedDates.map(date => tempDayMap[date]); realDatesMap = sortedDates;
        if (calendar.length === 0 || validRows === 0) buildCalendar();
    } catch (error) { buildCalendar(); realDatesMap = []; }
}

function buildCalendar() {
    calendar = []; currentDay = 0; let gamesList = [];
    let targetGames = awardConfig.legacy_schedule ? 84 : 82;
    league.forEach(t => { t.season.gp = 0; t.gamesTarget = targetGames; });

    for (let i = 0; i < league.length; i++) {
        for (let j = i + 1; j < league.length; j++) {
            const t1 = league[i]; const t2 = league[j];
            let gamesNeeded = 2; 
            if (t1.conf === t2.conf) gamesNeeded = (t1.div === t2.div) ? (awardConfig.legacy_schedule ? 6 : 4) : (awardConfig.legacy_schedule ? 4 : 3);
            for (let k = 0; k < gamesNeeded; k++) {
                if (t1.season.gp < targetGames && t2.season.gp < targetGames) { let isHome = Math.random() > 0.5; gamesList.push({ h: isHome ? t1 : t2, a: isHome ? t2 : t1, result: null }); t1.season.gp++; t2.season.gp++; }
            }
        }
    }
    gamesList.sort(() => Math.random() - 0.5);
    while (gamesList.length > 0) {
        let dayGames = []; let teamsPlayingToday = new Set();
        for (let i = 0; i < gamesList.length; i++) {
            const g = gamesList[i];
            if (!teamsPlayingToday.has(g.h.nrm) && !teamsPlayingToday.has(g.a.nrm)) { dayGames.push(g); teamsPlayingToday.add(g.h.nrm); teamsPlayingToday.add(g.a.nrm); gamesList.splice(i, 1); i--; }
            if (dayGames.length >= 13) break; 
        }
        calendar.push(dayGames);
    }
    league.forEach(t => t.season.gp = 0);
}

function initPlayoffs() {
    isPlayoffs = true; currentDay = 0; calendar = [];
    const sortTeams = (a, b) => { if (b.season.pts !== a.season.pts) return b.season.pts - a.season.pts; if (b.season.w !== a.season.w) return b.season.w - a.season.w; return (b.season.gf - b.season.ga) - (a.season.gf - a.season.ga); };
    const eastTeams = league.filter(t => t.conf === 'Eastern'); const westTeams = league.filter(t => t.conf === 'Western');

    const atlanticWinner = eastTeams.filter(t => t.div === 'Atlantic').sort(sortTeams)[0]; const northeastWinner = eastTeams.filter(t => t.div === 'Northeast').sort(sortTeams)[0];
    let eastSeeds = [atlanticWinner, northeastWinner].sort(sortTeams); const eastRest = eastTeams.filter(t => t.nrm !== eastSeeds[0].nrm && t.nrm !== eastSeeds[1].nrm).sort(sortTeams); eastSeeds = eastSeeds.concat(eastRest.slice(0, 6));

    const centralWinner = westTeams.filter(t => t.div === 'Central').sort(sortTeams)[0]; const pacificWinner = westTeams.filter(t => t.div === 'Pacific').sort(sortTeams)[0];
    let westSeeds = [centralWinner, pacificWinner].sort(sortTeams); const westRest = westTeams.filter(t => t.nrm !== westSeeds[0].nrm && t.nrm !== westSeeds[1].nrm).sort(sortTeams); westSeeds = westSeeds.concat(westRest.slice(0, 6));

    playoffBracket = { round: 1,
        east: [ { h: eastSeeds[0].nrm, a: eastSeeds[7].nrm, hW: 0, aW: 0, games: [] }, { h: eastSeeds[1].nrm, a: eastSeeds[6].nrm, hW: 0, aW: 0, games: [] }, { h: eastSeeds[2].nrm, a: eastSeeds[5].nrm, hW: 0, aW: 0, games: [] }, { h: eastSeeds[3].nrm, a: eastSeeds[4].nrm, hW: 0, aW: 0, games: [] } ],
        west: [ { h: westSeeds[0].nrm, a: westSeeds[7].nrm, hW: 0, aW: 0, games: [] }, { h: westSeeds[1].nrm, a: westSeeds[6].nrm, hW: 0, aW: 0, games: [] }, { h: westSeeds[2].nrm, a: westSeeds[5].nrm, hW: 0, aW: 0, games: [] }, { h: westSeeds[3].nrm, a: westSeeds[4].nrm, hW: 0, aW: 0, games: [] } ],
        nextEast: [], nextWest: [], finals: null
    };
    buildPlayoffRound(); initPlayoffsUI(); updateUI(); saveGame(); alert("The Regular Season has ended! The Playoff Bracket is now set.");
}

function buildPlayoffRound() {
    playoffBracket.series = [];
    if (playoffBracket.east) { playoffBracket.east.forEach(m => { m.conf = 'WALES'; playoffBracket.series.push(m); }); }
    if (playoffBracket.west) { playoffBracket.west.forEach(m => { m.conf = 'CAMPBELL'; playoffBracket.series.push(m); }); }
    playoffBracket.series.forEach(s => { if (typeof s.h === 'string') s.h = league.find(t => t.nrm === s.h); if (typeof s.a === 'string') s.a = league.find(t => t.nrm === s.a); });
    genPlayoffSlate();
}
function genPlayoffSlate() { calendar = [[]]; playoffBracket.series.filter(s => s.hW < 4 && s.aW < 4).forEach(s => { calendar[0].push({h:s.h, a:s.a, result:null, series:s}); }); currentDay = 0; updateUI(); showBracket(); }

function handleRoundEnd() {
    const w = playoffBracket.series.map(s => s.hW === 4 ? s.h : s.a);
    if(playoffBracket.round === 4) { if(w[0]) currentCupChamp = w[0].name; runEndOfSeasonAwards(); return; }
    playoffBracket.round++; playoffBracket.series = [];
    if(playoffBracket.round < 4) { 
        const reseed = (ts, cL) => { let s = ts.sort((a, b) => b.season.pts - a.season.pts); for(let i=0; i < Math.floor(s.length/2); i++) { if(s[i] && s[s.length-1-i]) playoffBracket.series.push({h:s[i], a:s[s.length-1-i], hW:0, aW:0, conf:cL}); } }; 
        reseed(w.filter(x => x && x.conf.toLowerCase().includes('east')), 'WALES'); reseed(w.filter(x => x && x.conf.toLowerCase().includes('west')), 'CAMPBELL'); 
    } else { if(w[0] && w[1]) playoffBracket.series.push({h:w[0], a:w[1], hW:0, aW:0, conf:'FINALS'}); }
    const btnNR = document.getElementById('btnNextRound'); if(btnNR) btnNR.remove(); 
    genPlayoffSlate();
}

function processOffseasonGrowth() {
    let logs = [];
    Object.values(playerStats).forEach(p => {
        p.age++; 
        if (!awardConfig.aging) return; 
        let oChg = 0, dChg = 0, pChg = 0;
        if (p.age <= 24) {
            let r = Math.random();
            if (p.potential === 'Franchise') { oChg = 2 + Math.floor(r * 3); dChg = 2 + Math.floor(r * 3); pChg = r > 0.5 ? 1 : 0; }
            else if (p.potential === 'Top 6') { oChg = 1 + Math.floor(r * 2); dChg = 1 + Math.floor(r * 2); pChg = r > 0.7 ? 1 : 0; }
            else if (p.potential === 'Depth') { oChg = Math.floor(r * 2); dChg = Math.floor(r * 2); }
            else { oChg = Math.floor(r * 1.5); dChg = Math.floor(r * 1.5); } 
        } else if (p.age >= 25 && p.age <= 30) {
            if (Math.random() < 0.15) { oChg = Math.random() > 0.5 ? 1 : -1; dChg = Math.random() > 0.5 ? 1 : -1; }
        } else if (p.age >= 31) {
            let sev = p.age >= 35 ? 2 : 1; let r = Math.random(); oChg = -(Math.floor(r * 2) + sev); dChg = -(Math.floor(r * 2) + (sev - 1)); pChg = -(Math.floor(r * 1.5) + sev);
        }
        if (p.pos === 'G') { p.attr.gDef = Math.max(20, Math.min(99, p.attr.gDef + dChg)); p.attr.ovr = p.attr.gDef; } 
        else { p.attr.off = Math.max(20, Math.min(99, p.attr.off + oChg)); p.attr.def = Math.max(20, Math.min(99, p.attr.def + dChg)); p.attr.ovr = getPlayerWeightedStats(p.name).ovr; }
        if (awardConfig.headlines) {
            if (oChg >= 4 && p.age <= 22) logs.push(`📈 BREAKOUT: ${p.name} (${p.teamCode}) gained +${oChg} OVR this summer!`);
            if (pChg <= -2 && p.age >= 34 && Math.random() < 0.3) logs.push(`📉 FATHER TIME: ${p.name} (${p.teamCode}) lost a step over the summer.`);
        }
    });
    if (logs.length > 0 && awardConfig.headlines) { logs.sort(() => 0.5 - Math.random()).slice(0, 5).forEach(msg => { tradeLog.unshift({ day: 'OFFSEASON', details: msg }); }); }
}

async function beginNewYear() {
    currentSeason++; isPlayoffs = false;
    league.forEach(t => { 
        t.season = {gp:0, w:0, l:0, t:0, pts:0, gf:0, ga:0, ppo:0, ppg:0, ts:0, ppga:0}; t.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null}; 
        t.specialTeams = { pp1:[], pp2:[], pk1:[], pk2:[], exa:[] }; 
        t.winStreak = 0; t.loseStreak = 0; t.teamMeeting = false; t.coachFired = false; t.undefeated=0; t.winless=0;
    });

    processOffseasonGrowth();
    Object.values(playerStats).forEach(p => { 
        if (p.pos === 'G') {
            p.career.gp += p.season.gp; p.career.w += p.season.w; p.career.l += (p.season.l || 0); p.career.t += (p.season.t || 0); p.career.so += p.season.so; p.career.sv += p.season.sv; p.career.sa += p.season.sa;
            p.season = {gp:0, w:0, l:0, t:0, so:0, sv:0, sa:0, consStarts:0}; p.playoff = {gp:0, w:0, l:0, so:0, sv:0, sa:0, consStarts:0};
        } else {
            p.career.gp += p.season.gp; p.career.g += p.season.g; p.career.a += p.season.a; p.career.pts += (p.season.g + p.season.a); p.career.pm += (p.season.pm || 0); p.career.pim += (p.season.pim || 0); p.career.ppg += (p.season.ppg || 0); p.career.shg += (p.season.shg || 0); p.career.gwg += (p.season.gwg || 0); p.career.s += (p.season.s || 0); 
            p.season = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0}; p.playoff = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0};
        }
        p.streakType = 'stable'; p.hasScored = false; 
    });
    
    takeMonthSnapshot(); 
    document.getElementById('bracketContainer').style.display = 'none'; document.getElementById('playoffViewToggles').style.display = 'none'; document.getElementById('standingsGrids').style.display = 'grid'; 
    document.getElementById('tabStandings').className = 'mode-btn active'; document.getElementById('tabBracket').className = 'mode-btn'; document.getElementById('seasonYearDisplay').innerText = currentSeason; 
    
    const sBtn = document.getElementById('btnStartNextSeason'); if (sBtn) sBtn.remove();
    document.querySelectorAll('#officeControls button').forEach(b => { const act = b.getAttribute('onclick') || ''; if(act === 'simDay()' || act === 'simWeek()' || act === 'simMonth()' || act === 'simSeason()' || act === 'advanceCalendar()') b.style.display = 'inline-block'; });
    
    calendar = []; await loadScheduleFromCSV(); 
    if (calendar.length === 0) buildCalendar();
    updateUI(); saveGame();
}

// --- SIMULATION CONTROLLERS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function simDay(slowMode = true, bypassLock = false) {
    if (currentDay >= calendar.length) return;
    if (!bypassLock && isSimulating) return;
    if (!bypassLock) isSimulating = true; 
    try {
        if (calendar[currentDay]) { for (let i = 0; i < calendar[currentDay].length; i++) { const g = calendar[currentDay][i]; if (!g.result) { simGame(i); updateUI(); if (slowMode) { await sleep(200); } } } }
        if (!bypassLock) { advanceCalendar(); }
    } finally { if (!bypassLock) isSimulating = false; updateUI(); }
}

function advanceCalendar() {
    if (currentDay >= calendar.length) return false;
    currentDay++;
    
    if (currentDay === Math.floor(calendar.length / 2) && !isPlayoffs && !isASG && awardConfig.streaks) { initAllStarGame(); return false; }
    if (isASG && calendar[currentDay] && !calendar[currentDay].some(g => g.isASG_game)) isASG = false;
    
    // 🏆 PLAYOFF FIX: Automatically spawn the next games OR end the round and show the Advance button!
    if (isPlayoffs && currentDay >= calendar.length) {
        if (playoffBracket.series.some(s => s.hW < 4 && s.aW < 4)) {
            genPlayoffSlate(); // Keep generating games until a team reaches 4 wins
        } else {
            showBracket(); // Round is 100% over! Draw the UI and activate the ADVANCE ROUND button.
        }
    }

    updateUI(); saveGame(); return true; 
}

async function simWeek() {
    if (isSimulating) return;
    isSimulating = true;
    for (let i = 0; i < 7; i++) { if (currentDay >= calendar.length) break; await simDay(false, true); updateUI(); await sleep(800); let keepGoing = advanceCalendar(); if (!keepGoing) break; }
    isSimulating = false; updateUI(); saveGame();
}

async function simMonth() {
    if (isSimulating) return;
    isSimulating = true;
    for (let i = 0; i < 30; i++) { if (currentDay >= calendar.length) break; await simDay(false, true); updateUI(); await sleep(200); let keepGoing = advanceCalendar(); if (!keepGoing) break; }
    isSimulating = false; checkMonthlyAwards(); updateUI(); saveGame();
}

async function simSeason(useTurbo = false) {
    if (isSimulating && !isSimSeason) return;
    const btnSim = document.getElementById('btnSimSeason'); const btnTurbo = document.getElementById('btnTurboSimSeason');
    const isPauseAction = isSimulating && isSimSeason;

    if (isPauseAction) {
        isSimulating = false; isSimSeason = false; isTurboMode = false;
        if (btnSim) { btnSim.innerText = 'SIM SEASON'; btnSim.style.borderColor = '#00FFFF'; btnSim.style.color = '#00FFFF'; }
        if (btnTurbo) { btnTurbo.innerText = 'TURBO SIM SEASON'; btnTurbo.style.borderColor = '#FFAA00'; btnTurbo.style.color = '#FFAA00'; }
        document.getElementById('tickerScroll').innerText = `SIMULATION PAUSED AT DAY ${currentDay}.`;
        updateUI(); saveGame(); return;
    }

    if (!confirm(`Start full season simulation${useTurbo ? ' in TURBO mode' : ''}?\n(You can click 'PAUSE SIM' at any time to stop)`)) return;

    isSimulating = true; isSimSeason = true; isTurboMode = useTurbo;
    if (btnSim) { btnSim.innerText = 'PAUSE SIM'; btnSim.style.borderColor = '#FF5555'; btnSim.style.color = '#FF5555'; }
    if (btnTurbo) { btnTurbo.innerText = 'PAUSE TURBO'; btnTurbo.style.borderColor = '#FFAA00'; btnTurbo.style.color = '#FFAA00'; }

    while (isSimulating && isSimSeason && currentDay < calendar.length) {
        await simDay(false, true); updateUI();
        let percent = Math.floor((currentDay / calendar.length) * 100);
        document.getElementById('tickerScroll').innerText = `${useTurbo ? '⚡ TURBO SIMULATING' : '⚙️ CALCULATING SEASON ALGORITHMS'}: DAY ${currentDay} OF ${calendar.length} (${percent}% COMPLETE)...`;
        if (!useTurbo) { await sleep(20); } else if (currentDay % 15 === 0) { await sleep(0); }
        let keepGoing = advanceCalendar();
        if (!keepGoing) break;
    }

    isSimulating = false; isSimSeason = false; isTurboMode = false;
    if (btnSim) { btnSim.innerText = 'SIM SEASON'; btnSim.style.borderColor = '#00FFFF'; btnSim.style.color = '#00FFFF'; }
    if (btnTurbo) { btnTurbo.innerText = 'TURBO SIM SEASON'; btnTurbo.style.borderColor = '#FFAA00'; btnTurbo.style.color = '#FFAA00'; }
    
    updateUI(); saveGame();
    if (currentDay >= calendar.length) { initPlayoffs(); }
}

async function simRound() {
    if (isSimulating) return;
    isSimulating = true; 
    const initialRound = playoffBracket.round;
    
    while (isSimulating && isPlayoffs && playoffBracket.round === initialRound && !currentCupChamp) { 
        if (currentDay < calendar.length) {
            await simDay(false, true); 
            updateUI(); 
            await sleep(400); 
            advanceCalendar(); 
        } else {
            break; // The round is 100% over.
        }
    }
    
    isSimulating = false; 
    showBracket(); // Force the bracket to update and show the ADVANCE ROUND button!
    updateUI(); 
    saveGame();
}

async function simPlayoffs() {
    if(confirm("Simulate playoffs at Balanced speed?")) {
        if (isSimulating) return;
        isSimulating = true; 
        
        while (isSimulating && isPlayoffs && !currentCupChamp) { 
            if (currentDay < calendar.length) {
                await simDay(false, true); 
                updateUI(); 
                await sleep(300); 
                advanceCalendar(); 
            } else {
                showBracket(); // The round finished. Show the final bracket...
                await sleep(2000); // Pause for 2 seconds so you can see who won!
                handleRoundEnd(); // Automatically advance to the next round!
                await sleep(1000); // Pause to show the new empty bracket before games start
            }
        }
        
        isSimulating = false; 
        updateUI(); 
        saveGame();
    }
}

// --- UI RENDERERS ---
function updateUI() {
    if(!isPlayoffs && !isASG && calendar.length > 0 && currentDay >= calendar.length) { 
        if(!document.getElementById('btnLottery') && awardConfig.draft) { const b = document.createElement('button'); b.id = 'btnLottery'; b.innerText = "RUN LOTTERY"; b.onclick = runDraftLottery; document.getElementById('officeControls').appendChild(b); } 
        else if(!awardConfig.draft && !document.getElementById('btnStartPlayoffs')) { const b = document.createElement('button'); b.id = 'btnStartPlayoffs'; b.innerText = "START PLAYOFFS"; b.onclick = initPlayoffs; document.getElementById('officeControls').appendChild(b); } 
    }

    let m = "EASN LIVE | STANDINGS | "; 
    [...league].sort((a,b) => b.season.pts - a.season.pts).slice(0,5).forEach(t => m += `${t.code}: ${t.season.pts} `);
    let ss = "WELCOME TO THE DYNASTY ENGINE"; 
    if(currentDay > 0 && calendar[currentDay-1]) { ss = calendar[currentDay-1].map(g => { if (g && g.a && g.h) { let otStr = (g.result && g.result.ot > 0) ? (g.result.ot === 1 ? ' (OT)' : ` (${g.result.ot}OT)`) : ''; return `${g.a.code} ${g.result ? g.result.aG : ''} - ${g.result ? g.result.hG : ''} ${g.h.code}${otStr}`; } return ""; }).join(' * '); }	
    const isAsgDayNow = isASG && calendar[currentDay] && calendar[currentDay].some(g => g.isASG_game);
    document.getElementById('tickerScroll').innerText = (isAsgDayNow ? '🔥 ALL-STAR GAME DAY! 🔥 | ' : '') + m + " | LATEST SCORE: " + ss;
    refreshScheduleDashboardUI();
    
    const mn = document.getElementById('gameMenuList'); mn.innerHTML = ''; 
    if (calendar[currentDay]) { calendar[currentDay].forEach((g,i) => { if (!g || !g.a || !g.h) return; const it = document.createElement('div'); it.className = 'menu-game-item'; it.onclick = () => { selectGame(i); toggleGameMenu(); }; it.innerHTML = `${getTeamLogoHtml(g.h.name)} <span style="color:#444; font-size:6px;">VS</span> ${getTeamLogoHtml(g.a.name)}`; mn.appendChild(it); }); }

    const renderStandings = (id, c) => {
        const ts = league.filter(x => x.conf.toLowerCase().includes(c)).sort((a,b) => b.season.pts - a.season.pts || b.season.w - a.season.w);
        let h = `<tr><th>TEAM</th><th style="color:#aaa;">DIV</th><th>OVR</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>PTS</th></tr>`;
        h += ts.map(t => `<tr><td style="display:flex; align-items:center;">${getTeamLogoHtml(t.name)} <span style="margin-top:2px;">${t.name}</span></td><td style="color:#888; font-size:6px;">${t.div ? t.div.slice(0,3).toUpperCase() : '-'}</td><td style="color:var(--neon-cyan);">${getDynamicTeamOvr(t.nrm)}</td><td>${t.season.gp}</td><td>${t.season.w}</td><td>${t.season.l}</td><td>${t.season.t}</td><td class="pts-hl">${t.season.pts}</td></tr>`).join('');
        document.getElementById(id).innerHTML = h;
    };   
    renderStandings('eastStand', 'east'); renderStandings('westStand', 'west');

    const k = statMode; let maxGP = k === 'season' ? Math.max(1, ...league.map(t => t.season.gp)) : Math.max(1, ...Object.values(playerStats).map(p => p.playoff.gp || 0));
    let mskp = Math.max(1, Math.floor(maxGP * 0.25)); let mglp = Math.max((maxGP >= 4 ? 2 : 1), Math.floor(maxGP * 0.45));
    const sks = Object.values(playerStats).filter(p => p.pos !== 'G' && p[k].gp >= mskp); const gls = Object.values(playerStats).filter(p => p.pos === 'G' && p[k].gp >= mglp);
    
    const renderLeaderboard = (id, ti, d, sf, vf, lim) => {    
        let h = `<div style="background:#111; padding:10px; text-align:center; color:var(--ea-yellow); text-shadow:2px 2px 0px #000;">${ti}</div><table><tr style="background:#222;"><th>#</th><th>PLAYER</th><th>VAL</th></tr>`; 
        d.sort(sf).slice(0,lim).forEach((p,idx) => { h += `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td>${idx+1}</td><td>${p.injury > 0 ? '🚑 ' : ''}${p.name} <span class="team-hl">${p.teamCode}</span></td><td class="pts-hl">${vf(p)}</td></tr>`; }); h += `</table>`; document.getElementById(id).innerHTML = h; 
    };
    
    renderLeaderboard('pointsContainer', 'POINTS', [...sks], (a,b) => ((b[k].g+b[k].a) - (a[k].g+a[k].a)), x => x[k].g+x[k].a, 25); 
    renderLeaderboard('goalsContainer', 'GOALS', [...sks], (a,b) => (b[k].g - a[k].g), x => x[k].g, 25); 
    renderLeaderboard('assistsContainer', 'ASSISTS', [...sks], (a,b) => (b[k].a - a[k].a), x => x[k].a, 25); 
    renderLeaderboard('gaaContainer', 'GAA', [...gls], (a,b) => { const ga = a[k].gp > 0 ? (a[k].sa - a[k].sv) / a[k].gp : 99; const gb = b[k].gp > 0 ? (b[k].sa - b[k].sv) / b[k].gp : 99; return ga - gb; }, x => x[k].gp > 0 ? ((x[k].sa - x[k].sv) / x[k].gp).toFixed(2) : "0.00", 25); 
    renderLeaderboard('svContainer', 'SV%', [...gls], (a,b) => { const sa = a[k].sa > 0 ? a[k].sv / a[k].sa : 0; const sb = b[k].sa > 0 ? b[k].sv / b[k].sa : 0; return sb - sa; }, x => x[k].sa > 0 ? (x[k].sv / x[k].sa).toFixed(3) : ".000", 25); 
    renderLeaderboard('soContainer', 'SO', [...gls], (a,b) => (b[k].so - a[k].so), x => x[k].so, 10);
    
    let isScheduleDone = false;
    if (currentDay < calendar.length) { if (calendar[currentDay] && calendar[currentDay].every(x => x.result)) isScheduleDone = true; } else { isScheduleDone = true; }
    document.getElementById('btnNextDay').disabled = !isScheduleDone;
}

function renderTeamStats() {
    const tk = document.getElementById('teamViewSelect').value; if(!tk) return;
    const k = statMode || (isPlayoffs ? 'playoff' : 'season'); 
    const s = getRosterStructure(tk); 
    const tD = league.find(t => t.nrm === tk);
    const dynOvr = getDynamicTeamOvr(tk);
    const getEmoji = (pName) => { let st = playerStats[pName] ? playerStats[pName].streakType : ''; return st === 'hot' ? '🔥' : (st === 'cold' ? '❄️' : ''); };
    const getChemDisplay = (val, years) => {
        if (val >= 10 && years >= 2) return '<span style="color:#FF00FF; font-weight:bold; text-shadow:1px 1px 0 #000; margin-left:10px;">TELEPATHIC +5</span>';
        if (val >= 10) return '<span class="chem-boost" style="margin-left:10px;">LOCKED IN +3</span>';
        if (val >= 5) return '<span style="color:var(--ea-yellow); font-size:7px; margin-left:10px;">FAMILIAR +1</span>';
        return `<span style="color:#555; font-size:6px; margin-left:10px;">CHEM: ${val||0}/10</span>`;
    };

    const bStyle = "padding:2px 4px; font-size:7px; margin-right:2px; height:auto; width:auto; min-height:0; min-width:0; line-height:1; display:inline-block;";
    const yStyle = "padding:2px 4px; font-size:7px; margin-right:8px; height:auto; width:auto; min-height:0; min-width:0; line-height:1; display:inline-block; border-color:var(--ea-yellow); color:var(--ea-yellow);";

    let h = `<div style="text-align:center; padding:15px; background:linear-gradient(to right, #000, #111, #000); border:2px solid var(--neon-cyan); margin-bottom:20px; box-shadow: 0 0 10px rgba(0,255,255,0.2);"><span style="color:var(--silver-light); font-size:10px;">LIVE ACTIVE ROSTER OVERALL: </span><span style="color:var(--neon-cyan); font-size:18px; margin-left:10px; text-shadow:2px 2px 0 #000;">${dynOvr}</span></div>`;
    h += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;"><div><div class="unit-header">FORWARD LINES</div>`;
    
    s.f.forEach((l, i) => {
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; align-items:center;">LINE ${i+1} ${getChemDisplay(tD.chem.f[i], (tD.chem.fYears?tD.chem.fYears[i]:0))}</div><table style="width:100%;">`;
        h += l.map(p => `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td><button style="${bStyle}" onclick="shiftLineup('${tk}', '${p.name}', -1); event.stopPropagation();">▲</button><button style="${bStyle} margin-right:8px;" onclick="shiftLineup('${tk}', '${p.name}', 1); event.stopPropagation();">▼</button><button style="${yStyle}" onclick="openSubMenu('${tk}', '${p.name}', 'F'); event.stopPropagation();">🔁</button>${playerStats[p.name].injury>0?'🚑':''}${p.name} ${getArchetypeBadge(p.name)} ${getEmoji(p.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(p.name)}</span></td></tr>`).join('');
        h += `</table>`;
    });
    
    h += `</div><div><div class="unit-header">DEFENSIVE PAIRINGS</div>`;
    s.d.forEach((l, i) => {
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; align-items:center;">PAIR ${i+1} ${getChemDisplay(tD.chem.d[i], (tD.chem.dYears?tD.chem.dYears[i]:0))}</div><table style="width:100%;">`;
        h += l.map(d => `<tr style="cursor:pointer;" onclick="showPlayerCard('${d.name}')"><td><button style="${bStyle}" onclick="shiftLineup('${tk}', '${d.name}', -1); event.stopPropagation();">▲</button><button style="${bStyle} margin-right:8px;" onclick="shiftLineup('${tk}', '${d.name}', 1); event.stopPropagation();">▼</button><button style="${yStyle}" onclick="openSubMenu('${tk}', '${d.name}', 'D'); event.stopPropagation();">🔁</button>${playerStats[d.name].injury>0?'🚑':''}${d.name} ${getArchetypeBadge(d.name)} ${getEmoji(d.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(d.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(d.name)}</span></td></tr>`).join('');       
        h += `</table>`;
    });
    
    if(s.g && s.g.length > 0) {
        h += `<div class="unit-header">GOALTENDERS</div><table style="width:100%;">`;
        h += s.g.map((g,i) => `<tr><td style="cursor:pointer;" onclick="showPlayerCard('${g.name}')"><button style="${yStyle}" onclick="openSubMenu('${tk}', '${g.name}', 'G'); event.stopPropagation();">🔁</button>${playerStats[g.name].injury>0?'🚑':''}${g.name} ${getArchetypeBadge(g.name)} ${getEmoji(g.name)} (${i===0?'STARTER':'BACKUP'})</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(g.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(g.name)}</span></td></tr>`).join('');
        h += `</table>`;
    }

    // 🛡️ SPECIAL TEAMS EDITOR INTEGRATION 
    h += `</div></div><div class="grid-2" style="margin-top:20px; border-top:2px solid #333; padding-top:15px;">`;
    
    // POWER PLAY
    h += `<div><div class="unit-header" style="background:#550000; color:var(--ea-yellow);">POWER PLAY UNITS</div>`;
    ['PP1', 'PP2'].forEach((unitName, i) => {
        let ppU = getSpecialTeamsUnit(tk, 'PP', i + 1);
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;"><span>${unitName}</span> <button onclick="openSpecialTeamsMenu('${tk}', 'PP', ${i+1})" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button></div><table style="width:100%;">`;
        h += ppU.map(p => `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td>${playerStats[p.name].injury>0?'🚑':''}${p.name} ${getArchetypeBadge(p.name)}</td><td style="text-align:right;"><span style="color:var(--ea-yellow); font-size:8px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</span></td></tr>`).join('');
        h += `</table>`;
    });
    h += `</div>`;

    // PENALTY KILL
    h += `<div><div class="unit-header" style="background:#003366; color:#00FFFF;">PENALTY KILL UNITS</div>`;
    ['PK1', 'PK2'].forEach((unitName, i) => {
        let pkU = getSpecialTeamsUnit(tk, 'PK', i + 1);
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;"><span>${unitName}</span> <button onclick="openSpecialTeamsMenu('${tk}', 'PK', ${i+1})" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button></div><table style="width:100%;">`;
        h += pkU.map(p => `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td>${playerStats[p.name].injury>0?'🚑':''}${p.name} ${getArchetypeBadge(p.name)}</td><td style="text-align:right;"><span style="color:#00FFFF; font-size:8px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</span></td></tr>`).join('');
        h += `</table>`;
    });
    
    // EXTRA ATTACKER
    h += `</div></div><div style="margin-top:15px;"><div class="unit-header" style="background:#330033; color:#FF55FF;">EXTRA ATTACKER (6-ON-5)</div>`;
    let exaU = getSpecialTeamsUnit(tk, 'EXA', 1);
    h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;"><span>PULLED GOALIE UNIT</span> <button onclick="openSpecialTeamsMenu('${tk}', 'EXA', 1)" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button></div>`;
    h += `<div style="display:flex; justify-content:space-around; flex-wrap:wrap; padding:10px 0;">`;
    h += exaU.map(p => `<div style="cursor:pointer; background:#111; padding:5px 10px; border:1px solid #333; border-radius:4px; text-align:center; min-width:80px; margin-bottom:5px;" onclick="showPlayerCard('${p.name}')">
        <div style="font-size:10px; color:#fff;">${playerStats[p.name].injury>0?'🚑':''}${p.name} ${getArchetypeBadge(p.name)}</div>
        <div style="font-size:8px; color:#FF55FF; margin-top:3px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</div>
        </div>`).join('');
    h += `</div></div><div class="grid-2" style="margin-top:20px;"><div>`; 

    const activeNames = [...s.f.flat(), ...s.d.flat(), ...(s.g || []).slice(0,2)].map(x => x.name);
    const bench = (rosters[tk] || []).filter(p => !activeNames.includes(p.name));
    if (bench.length > 0) {
        h += `<div class="unit-header" style="color:var(--silver-mid);">BENCH / SCRATCHES</div><table style="width:100%;">`;
        h += bench.map(b => `<tr><td style="cursor:pointer;" onclick="showPlayerCard('${b.name}')"><button style="${yStyle}" onclick="openSubMenu('${tk}', '${b.name}', '${b.pos}'); event.stopPropagation();">🔁</button>${playerStats[b.name].injury>0?'🚑':''}${b.name} ${getArchetypeBadge(b.name)} (${b.pos}) ${getEmoji(b.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(b.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(b.name)}</span></td></tr>`).join('');
        h += `</table>`;
    }

    h += `</div></div><div class="grid-2" style="margin-top:20px;">`;
    
    // --- GOALTENDER STATS ---
    h += `<div><div class="unit-header">GOALTENDER STATS</div><table style="width:100%; text-align:center;"><tr><th style="text-align:left;">PLAYER</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>SA</th><th>GA</th><th>SV%</th><th>GAA</th><th>SO</th></tr>`;
    if (rosters[tk]) {
        let goalies = rosters[tk].filter(p => p.pos === 'G').sort((a, b) => playerStats[b.name][k].w - playerStats[a.name][k].w);
        h += goalies.map(g => {
            const st = playerStats[g.name];
            const sa = st[k].sa || 0; const sv = st[k].sv || 0; const ga = Math.max(0, sa - sv);
            const svPct = sa > 0 ? (sv / sa).toFixed(3) : '.000'; const gaa = st[k].gp > 0 ? (ga / st[k].gp).toFixed(2) : '0.00';
            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${g.name}')"><td style="text-align:left;">${g.name} ${getArchetypeBadge(g.name)} ${getEmoji(g.name)}</td><td>${st[k].gp}</td><td>${st[k].w}</td><td>${st[k].l || 0}</td><td>${st[k].t || 0}</td><td style="color:#aaa;">${sa}</td><td style="color:#FF6666;">${ga}</td><td style="color:#aaa;">${svPct}</td><td style="color:#aaa;">${gaa}</td><td style="color:var(--ea-yellow); font-weight:bold;">${st[k].so}</td></tr>`;
        }).join('');
    }
    h += `</table></div>`;

    // --- SKATER STATS ---
    h += `<div><div class="unit-header">SKATER STATISTICS</div><table style="width:100%; text-align:center;"><tr><th style="text-align:left;">PLAYER</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>S</th><th>S%</th><th>GWG</th><th>+/-</th><th style="color:var(--ea-yellow);" title="Power Play Goals">PPG</th><th style="color:var(--ea-yellow);" title="Power Play Assists">PPA</th><th style="color:#00FFFF;" title="Short Handed Goals">SHG</th></tr>`;
    if (rosters[tk]) {
        let sk = rosters[tk].filter(p => p.pos !== 'G').sort((a, b) => (playerStats[b.name][k].g + playerStats[b.name][k].a) - (playerStats[a.name][k].g + playerStats[a.name][k].a));
        h += sk.map(p => { 
            const st = playerStats[p.name]; 
            const sPct = st[k].s > 0 ? ((st[k].g / st[k].s) * 100).toFixed(1) + '%' : '0.0%'; 
            const pmVal = st[k].pm || 0;
            const pmColor = pmVal > 0 ? '#0F0' : (pmVal < 0 ? '#F55' : '#888');
            
            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
                <td style="text-align:left;">${p.name} ${getArchetypeBadge(p.name)} ${getEmoji(p.name)}</td>
                <td>${st[k].gp}</td><td>${st[k].g}</td><td>${st[k].a}</td><td class="pts-hl">${st[k].g + st[k].a}</td>
                <td style="color:#aaa;">${st[k].s || 0}</td><td style="color:#aaa;">${sPct}</td><td style="color:var(--ea-yellow); font-weight:bold;">${st[k].gwg || 0}</td>
                <td style="color:${pmColor};">${pmVal > 0 ? '+' + pmVal : pmVal}</td>
                <td style="color:var(--ea-yellow);">${st[k].ppg || 0}</td>
                <td style="color:var(--ea-yellow);">${st[k].ppa || 0}</td>
                <td style="color:#00FFFF;">${st[k].shg || 0}</td>
            </tr>`;
        }).join('');   
    }
    h += `</table></div></div>`;    
    document.getElementById('teamStatsContainer').innerHTML = h;
}

// --- ADVANCED RECAP & BOX SCORES ---
function openBoxScore(day, idx) {
    const dayGames = Array.isArray(calendar[day]) ? calendar[day] : [];
    const g = dayGames[idx];
    if (!g || !g.result) return;
    
    let h = `<div class="menu-header" style="color:var(--ea-yellow); justify-content:center; position:sticky; top:0; z-index:10;">EASN GAME RECAP</div>`;
    h += `<div style="display:flex; justify-content:space-around; align-items:center; background:#111; padding:20px; font-size:24px;">
           <div style="text-align:center;">${getTeamLogoHtml(g.a.name)} <br><span style="color:var(--neon-cyan);">${g.result.aG}</span></div>
           <div style="font-size:10px; color:#666;">FINAL${g.result.ot > 0 ? ' (OT)' : ''}</div>
           <div style="text-align:center;">${getTeamLogoHtml(g.h.name)} <br><span style="color:var(--neon-cyan);">${g.result.hG}</span></div>
          </div>`;
          
    h += `<div style="max-height:60vh; overflow-y:auto; padding-bottom:15px; border-bottom:1px solid #333;">`;
    
    if (g.result.matchStats) {
        const buildBoxTable = (tk, rosterNames, isAway) => {
            let color = teamColors[tk] && teamColors[tk][0] ? teamColors[tk][0] : '#333';
            let teamName = isAway ? g.a.name : g.h.name;
            
            let html = `<div class="unit-header" style="margin-top:15px; background:${color};">${teamName.toUpperCase()} BOX SCORE</div>`;
            html += `<table style="width:100%; text-align:center; font-size:8px; background:#000;">
                     <tr style="background:#222; color:var(--ea-yellow);">
                        <th style="text-align:left;">SKATER</th><th>G</th><th>A</th><th>PTS</th><th>S</th><th>+/-</th><th>PIM</th>
                     </tr>`;
            
            let teamSkaters = rosterNames.filter(pN => playerStats[pN] && playerStats[pN].pos !== 'G');
            teamSkaters.sort((a, b) => {
                const sA = g.result.matchStats[a] || {g:0,a:0,s:0};
                const sB = g.result.matchStats[b] || {g:0,a:0,s:0};
                return (sB.g+sB.a) - (sA.g+sA.a) || sB.g - sA.g || sB.s - sA.s;
            });

            teamSkaters.forEach(pN => {
                let st = g.result.matchStats[pN] || {g:0, a:0, s:0, pm:0, pim:0};
                html += `<tr style="cursor:pointer;" onclick="showPlayerCard('${pN}')">
                    <td style="text-align:left; color:#fff;">${pN}</td>
                    <td>${st.g}</td><td>${st.a}</td><td style="color:var(--neon-cyan); font-weight:bold;">${st.g+st.a}</td>
                    <td>${st.s}</td><td style="color:${st.pm > 0 ? '#0F0' : (st.pm < 0 ? '#F55' : '#888')}">${st.pm > 0 ? '+'+st.pm : st.pm}</td>
                    <td>${st.pim}</td>
                </tr>`;
            });
            
            html += `<tr style="background:#222; color:var(--ea-yellow);"><th style="text-align:left; padding-top:10px;">GOALTENDER</th><th style="padding-top:10px;">SA</th><th style="padding-top:10px;">SV</th><th style="padding-top:10px;">GA</th><th style="padding-top:10px;">SV%</th><th colspan="2"></th></tr>`;
            
            let teamGoalies = rosterNames.filter(pN => playerStats[pN] && playerStats[pN].pos === 'G' && g.result.matchStats[pN] && g.result.matchStats[pN].sa > 0);

            teamGoalies.forEach(pN => {
                let st = g.result.matchStats[pN];
                let svp = st.sa > 0 ? (st.sv / st.sa).toFixed(3) : '.000';
                html += `<tr style="cursor:pointer;" onclick="showPlayerCard('${pN}')">
                    <td style="text-align:left; color:#fff;">${pN}</td>
                    <td>${st.sa}</td><td>${st.sv}</td><td style="color:#F55; font-weight:bold;">${st.ga}</td>
                    <td style="color:var(--neon-cyan);">${svp}</td><td colspan="2"></td>
                </tr>`;
            });
            html += `</table>`;
            return html;
        };

        h += buildBoxTable(g.a.nrm, g.result.awayRoster || [], true);
        h += buildBoxTable(g.h.nrm, g.result.homeRoster || [], false);
    } else {
        h += `<div style="color:#666; text-align:center; padding:15px; font-size:8px;">[ Legacy Game: Advanced box score data is unavailable for games simulated before the engine upgrade. ]</div>`;
    }

    const goalEvents = (g.result.boxLog || []).filter(ev => !ev.isPenalty);
    const penaltyEvents = (g.result.boxLog || []).filter(ev => ev.isPenalty);

    h += `<div class="unit-header" style="margin-top:15px;">SCORING SUMMARY</div><div style="background:#000; padding:15px; font-size:8px; line-height:2;">`;
    if (goalEvents.length > 0) {
        goalEvents.forEach(l => { h += `<div><span style="color:${l.cl}; font-weight:bold; margin-right:10px;">[${l.tm}]</span> <span style="color:#fff;">${l.txt}</span></div>`; });
    } else {
        h += `<div style="color:#aaa; text-align:center;">No scoring data.</div>`;
    }
    h += `</div>`;

    if (penaltyEvents.length > 0) {
        h += `<div class="unit-header">PENALTY SUMMARY</div><div style="background:#000; padding:15px; font-size:8px; line-height:2;">`;
        penaltyEvents.forEach(l => { h += `<div><span style="color:${l.cl}; font-weight:bold; margin-right:10px;">[${l.tm}]</span> <span style="color:#fff;">${l.txt}</span></div>`; });
        h += `</div>`;
    }

    if (g.result.stars && g.result.stars.length > 0) {
        h += `<div class="unit-header">THREE STARS</div><div style="background:#111; padding:15px; text-align:center; font-size:9px;">`;
        g.result.stars.forEach((s, i) => { h += `<div style="margin-bottom:10px; cursor:pointer;" onclick="showPlayerCard('${s}')"><span style="color:var(--ea-yellow);">⭐${i===0?'⭐⭐':(i===1?'⭐':'')}</span> ${s}</div>`; });
        h += `</div>`;
    }
    
    h += `</div>`; 
    h += `<button onclick="document.getElementById('boxScoreOverlay').style.display='none'" style="width:100%; padding:15px; margin-top:10px; border-color:var(--line-red); color:var(--line-red);">CLOSE RECAP</button>`;
    
    document.getElementById('boxScoreContent').innerHTML = h;
    document.getElementById('boxScoreOverlay').style.display = 'flex';
}

// --- ADVANCED BOX SCORE EDITOR ---
let advBoxScoreTemp = { away: { roster: [], entries: [] }, home: { roster: [], entries: [] } };

function openAdvEditor() {
    if(activeIdx === null) return alert("Select a game from the ARENA menu first."); 
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[activeIdx];
    if (!g) return alert("No valid game found for the selected day/index.");
    if(g.result) return alert("This game has already been finalized!");

    document.getElementById('advAwayName').innerText = g.a.code || "AWAY";
    document.getElementById('advHomeName').innerText = g.h.code || "HOME";
    
    document.getElementById('advAwayScore').value = 0; document.getElementById('advAwayEN').value = 0;
    document.getElementById('advHomeScore').value = 0; document.getElementById('advHomeEN').value = 0;
    
    document.getElementById('advAwayList').innerHTML = ''; document.getElementById('advHomeList').innerHTML = '';
    
    const getTk = (tm) => rosters[tm.nrm] ? tm.nrm : (rosters[tm.code] ? tm.code : tm.nrm);
    const aTk = getTk(g.a); const hTk = getTk(g.h);
    
    advBoxScoreTemp = { away: { roster: rosters[aTk] || [], entries: [], dressed: [] }, home: { roster: rosters[hTk] || [], entries: [], dressed: [] } };

    const preDressed = (tk) => {
        let r = rosters[tk]; if (!r || r.length === 0) return [];
        try {
            let healthy = r.filter(p => playerStats[p.name] && playerStats[p.name].injury === 0);
            let gList = healthy.filter(p => p.pos === 'G').sort((a,b) => (playerStats[b.name].attr.gDef || 0) - (playerStats[a.name].attr.gDef || 0));
            let fList = healthy.filter(p => p.pos !== 'D' && p.pos !== 'G').sort((a,b) => (playerStats[b.name].attr.off || 0) - (playerStats[a.name].attr.off || 0)).slice(0, 12);
            let dList = healthy.filter(p => p.pos === 'D').sort((a,b) => (playerStats[b.name].attr.off || 0) - (playerStats[a.name].attr.off || 0)).slice(0, 6);
            let list = [...fList, ...dList];
            if (gList.length > 0) list.push(gList[0]);
            return list.map(p => p.name);
        } catch(e) { return r.slice(0, 18).map(p => p.name); }
    };

    advBoxScoreTemp.away.dressed = preDressed(aTk);
    advBoxScoreTemp.home.dressed = preDressed(hTk);

    populateAdvDropdown('away'); populateAdvDropdown('home');
    document.getElementById('advEditorOverlay').style.display = 'flex';
}

function openManualFinalizePopup() {
    if (activeIdx === null) return alert("Select a game from the ARENA menu first.");
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[activeIdx];
    if (!g) return alert("No valid game found for the selected day/index.");
    if (g.result) return alert("This game has already been finalized!");
    openAdvEditor();
}

function populateAdvDropdown(side) {
    const sel = document.getElementById(side === 'away' ? 'advAwayPlayer' : 'advHomePlayer');
    const roster = advBoxScoreTemp[side].roster;
    let h = `<option value="">-- SELECT PLAYER --</option>`;
    
    let goalies = roster.filter(p => p.pos === 'G');
    if(goalies.length > 0) { h += `<optgroup label="GOALTENDERS">`; goalies.forEach(g => h += `<option value="${g.name}" data-pos="G">${g.name}</option>`); h += `</optgroup>`; }
    
    let skaters = roster.filter(p => p.pos !== 'G');
    if(skaters.length > 0) { h += `<optgroup label="SKATERS">`; skaters.forEach(s => h += `<option value="${s.name}" data-pos="${s.pos}">${s.name}</option>`); h += `</optgroup>`; }
    sel.innerHTML = h;
}

function toggleAdvInputs(side) {
    const sel = document.getElementById(side === 'away' ? 'advAwayPlayer' : 'advHomePlayer');
    const opt = sel.options[sel.selectedIndex];
    const isGoalie = opt && opt.getAttribute('data-pos') === 'G';
    
    const sInp = document.getElementById(side === 'away' ? 'advAwayInputs' : 'advHomeInputs');
    const gInp = document.getElementById(side === 'away' ? 'advAwayGoalieInputs' : 'advHomeGoalieInputs');
    
    if (isGoalie) {
        sInp.style.display = 'none'; gInp.style.display = 'block';
    } else {
        sInp.style.display = 'grid'; gInp.style.display = 'none';
        ['G', 'A', 'PM', 'PIM'].forEach(id => document.getElementById(`adv${side === 'away'?'Away':'Home'}${id}`).value = 0);
        ['PPG', 'SHG'].forEach(id => document.getElementById(`adv${side === 'away'?'Away':'Home'}${id}`).checked = false);
    }
}

function addAdvStatLine(side) {
    const sel = document.getElementById(side === 'away' ? 'advAwayPlayer' : 'advHomePlayer');
    const pName = sel.value;
    if(!pName) return alert("Select a player first.");
    
    const isGoalie = sel.options[sel.selectedIndex].getAttribute('data-pos') === 'G';
    const pref = side === 'away' ? 'advAway' : 'advHome';
    
    let entry = { name: pName, isGoalie: isGoalie };
    
    if (isGoalie) {
        entry.sa = parseInt(document.getElementById(`${pref}SA`).value) || 0;
    } else {
        entry.g = parseInt(document.getElementById(`${pref}G`).value) || 0;
        entry.a = parseInt(document.getElementById(`${pref}A`).value) || 0;
        entry.pm = parseInt(document.getElementById(`${pref}PM`).value) || 0;
        entry.pim = parseInt(document.getElementById(`${pref}PIM`).value) || 0;
        entry.ppg = document.getElementById(`${pref}PPG`).checked ? 1 : 0;
        entry.shg = document.getElementById(`${pref}SHG`).checked ? 1 : 0;
        
        if (entry.g === 0 && entry.a === 0 && entry.pm === 0 && entry.pim === 0) return alert("Enter at least one stat.");
        if (entry.ppg > entry.g || entry.shg > entry.g) return alert("Special teams goals cannot exceed total goals.");
    }
    
    advBoxScoreTemp[side].entries = advBoxScoreTemp[side].entries.filter(e => e.name !== pName);
    advBoxScoreTemp[side].entries.push(entry);
    
    renderAdvStatList(side); sel.value = ""; toggleAdvInputs(side);
}

function renderAdvStatList(side) {
    let h = '';
    advBoxScoreTemp[side].entries.forEach(e => {
        h += `<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="color:var(--ea-yellow);">${e.name}</span>`;
        if (e.isGoalie) { h += `<span style="color:#aaa;">SA: ${e.sa}</span>`; } 
        else { let sStr = `G:${e.g} A:${e.a} +/-:${e.pm > 0 ? '+'+e.pm : e.pm} PIM:${e.pim}`; if(e.ppg) sStr += ` PPG`; if(e.shg) sStr += ` SHG`; h += `<span style="color:#aaa;">${sStr}</span>`; }
        h += `<button onclick="removeAdvStatLine('${side}', '${e.name}')" style="color:var(--line-red); border:none; background:transparent; cursor:pointer;">[X]</button></div>`;
    });
    document.getElementById(side === 'away' ? 'advAwayList' : 'advHomeList').innerHTML = h;
}

function removeAdvStatLine(side, pName) { advBoxScoreTemp[side].entries = advBoxScoreTemp[side].entries.filter(e => e.name !== pName); renderAdvStatList(side); }

let activeChecklistSide = null;
function openRosterChecklist(side) {
    activeChecklistSide = side; let roster = advBoxScoreTemp[side].roster; let dressed = advBoxScoreTemp[side].dressed;
    let h = '';
    roster.forEach(p => {
        let isChecked = dressed.includes(p.name) ? 'checked' : '';
        h += `<div style="padding:4px; border-bottom:1px solid #222;">
            <label style="cursor:pointer; display:flex; align-items:center;">
                <input type="checkbox" class="gp-check" value="${p.name}" ${isChecked} style="margin-right:10px;"> 
                ${p.name} <span style="color:#666; font-size:6px; margin-left:5px;">(${p.pos})</span>
            </label>
        </div>`;
    });
    document.getElementById('gpChecklistContent').innerHTML = h; document.getElementById('gpChecklistOverlay').style.display = 'flex';
}

function saveRosterChecklist() {
    let checks = document.querySelectorAll('.gp-check'); let selected = [];
    checks.forEach(c => { if(c.checked) selected.push(c.value); });
    if (activeChecklistSide) { advBoxScoreTemp[activeChecklistSide].dressed = selected; }
    document.getElementById('gpChecklistOverlay').style.display = 'none';
}

function submitAdvGame() {
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[activeIdx];
    if (!g) return alert("No valid game found for the selected day/index.");
    const aScore = parseInt(document.getElementById('advAwayScore').value) || 0; const aEN = parseInt(document.getElementById('advAwayEN').value) || 0;
    const hScore = parseInt(document.getElementById('advHomeScore').value) || 0; const hEN = parseInt(document.getElementById('advHomeEN').value) || 0;
    
    const sumG = (side) => advBoxScoreTemp[side].entries.reduce((sum, e) => sum + (e.g || 0), 0);
    const aSum = sumG('away'); const hSum = sumG('home');
    if (aSum + aEN !== aScore) return alert(`ERROR: Away score (${aScore}) does not match entered Player Goals (${aSum}) + Empty Nets (${aEN}).`);
    if (hSum + hEN !== hScore) return alert(`ERROR: Home score (${hScore}) does not match entered Player Goals (${hSum}) + Empty Nets (${hEN}).`);
    
    const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
    let aG = aScore, hG = hScore;
    let hStatus = hG > aG ? 'win' : (hG < aG ? 'loss' : 'tie');
    let aStatus = aG > hG ? 'win' : (aG < hG ? 'loss' : 'tie');
    
    const applyGoalie = (tk, side, oppGoals, oppEN, status) => {
        let gEntry = advBoxScoreTemp[side].entries.find(e => e.isGoalie);
        let gName = gEntry ? gEntry.name : null;
        if (!gName && advBoxScoreTemp[side].dressed.length > 0) {
            let defG = rosters[tk].find(p => p.pos === 'G' && advBoxScoreTemp[side].dressed.includes(p.name));
            if (defG) gName = defG.name;
        }
        if (gName && playerStats[gName] && !isASG) {
            let s = playerStats[gName][k]; let ga = Math.max(0, oppGoals - oppEN);
            let sa = gEntry ? gEntry.sa : (ga + Math.floor(Math.random()*15)+20); 
            if (sa < ga) sa = ga;
            s.sa += sa; s.sv += (sa - ga); if(ga === 0) s.so++;
            if(status === 'win') s.w++; else if(status === 'loss') s.l++; else s.t++;
            checkMilestones(gName);
        }
    };
    
    applyGoalie(g.a.nrm, 'away', hG, hEN, aStatus);
    applyGoalie(g.h.nrm, 'home', aG, aEN, hStatus);
    
    const applySkaters = (side) => {
        advBoxScoreTemp[side].entries.filter(e => !e.isGoalie).forEach(e => {
            if(playerStats[e.name] && !isASG) {
                let s = playerStats[e.name][k];
                s.g += e.g; s.a += e.a; s.pm += e.pm; s.pim += e.pim; s.ppg += e.ppg; s.shg += e.shg;
                checkMilestones(e.name);
            }
        });
    };
    applySkaters('away'); applySkaters('home');
    
    if (!isASG) {
        advBoxScoreTemp.away.dressed.forEach(pN => { if(playerStats[pN]) playerStats[pN][k].gp++; });
        advBoxScoreTemp.home.dressed.forEach(pN => { if(playerStats[pN]) playerStats[pN][k].gp++; });
    }
    
    g.result = { hG: hG, aG: aG, ot: 0, boxLog: [], stars: [] }; 
    if(!isPlayoffs && !isASG) {
        if(hG > aG) { g.h.season.w++; g.h.season.pts += 2; g.a.season.l++; g.h.winStreak++; g.h.undefeated++; g.h.loseStreak=0; g.h.winless=0; g.a.loseStreak++; g.a.winless++; g.a.winStreak=0; g.a.undefeated=0; } 
        else if(aG > hG) { g.a.season.w++; g.a.season.pts += 2; g.h.season.l++; g.a.winStreak++; g.a.undefeated++; g.a.loseStreak=0; g.a.winless=0; g.h.loseStreak++; g.h.winless++; g.h.winStreak=0; g.h.undefeated=0; } 
        else { g.h.season.t++; g.a.season.t++; g.h.season.pts++; g.a.season.pts++; g.h.winStreak=0; g.h.undefeated++; g.h.loseStreak=0; g.h.winless++; g.a.winStreak=0; g.a.undefeated++; g.a.loseStreak=0; g.a.winless++; }
        g.h.season.gp++; g.a.season.gp++; g.h.season.gf += hG; g.h.season.ga += aG; g.a.season.gf += aG; g.a.season.ga += hG;
    } else if(g.series) { if(hG > aG) g.series.hW++; else g.series.aW++; }

    document.getElementById('advEditorOverlay').style.display = 'none';
    document.getElementById('aScoreLabel').innerText = g.result.aG; 
    document.getElementById('hScoreLabel').innerText = g.result.hG; 
    document.getElementById('jumboMessage').innerHTML = `ADVANCED BOX SCORE SAVED.<br>${g.a.code} ${g.result.aG} - ${g.h.code} ${g.result.hG}<br><br><span style="color:var(--ea-yellow); font-size:8px;">*Stats processed via manual override*</span>`;
    updateUI(); saveGame();
}

// --- WATCH LIVE GAME BROADCAST ---
function startWatchLive() {
    if (activeIdx === null) return alert("Select a game from the ARENA menu first.");
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[activeIdx];
    if (!g) return alert("No valid game found for the selected day/index.");
    if (g.result) return alert("This game has already been played!");

    simGame(activeIdx);
    watchGameObj = g; watchCurrentScore = { a: 0, h: 0 };

    document.getElementById('wgAwayLogo').src = g.a.logo; document.getElementById('wgHomeLogo').src = g.h.logo;
    document.getElementById('wgAwayCode').innerText = g.a.code; document.getElementById('wgHomeCode').innerText = g.h.code;
    document.getElementById('wgAwayScore').innerText = '0'; document.getElementById('wgHomeScore').innerText = '0';
    document.getElementById('wgTicker').innerHTML = '<div style="color:var(--ea-yellow); text-align:center; font-size:12px; margin-bottom:10px;">PUCK DROP! WELCOME TO THE BROADCAST...</div>';
    document.getElementById('wgClock').innerText = "P1 20:00";
    document.getElementById('btnWgSkip').style.display = 'block'; document.getElementById('btnWgClose').style.display = 'none';
    document.getElementById('watchGameOverlay').style.display = 'flex';

    let fillerEvents = [];
    const actions = ["winds up for a slapshot... Kick save and a beauty!", "lays a massive hit on the boards!", "with a quick wrist shot, gloved down.", "intercepts a sloppy pass in the neutral zone.", "fires it from the point... clanks off the iron!", "called for hooking. Referee's arm is up.", "dumps the puck deep into the corner.", "wins the faceoff cleanly.", "blocks a heavy slapshot. He's slow to get up."];
    for (let i = 0; i < 15; i++) {
        let p = Math.floor(Math.random() * 3) + 1; let m = Math.floor(Math.random() * 20); let s = Math.floor(Math.random() * 60); let t = Math.random() > 0.5 ? g.h : g.a;
        let randPlayer = "A player";
        if (rosters[t.nrm]) { let skaters = rosters[t.nrm].filter(x => x.pos !== 'G'); if(skaters.length > 0) randPlayer = skaters[Math.floor(Math.random() * skaters.length)].name; }
        fillerEvents.push({ p: p, m: m, s: s, tm: t.code, cl: '#888', isFiller: true, txt: `${randPlayer} ${actions[Math.floor(Math.random() * actions.length)]}` });
    }

    watchQueue = [...g.result.boxLog, ...fillerEvents];
    watchQueue.sort((a,b) => a.p !== b.p ? a.p - b.p : (a.m !== b.m ? a.m - b.m : a.s - b.s));
    let currentPeriod = 1;
    
    watchInterval = setInterval(() => {
        if (watchQueue.length === 0) {
            clearInterval(watchInterval);
            document.getElementById('wgClock').innerText = `FINAL${g.result.ot > 0 ? ' (OT)' : ''}`;
            document.getElementById('wgTicker').innerHTML += `<div style="color:var(--ea-yellow); text-align:center; margin-top:20px; font-size:12px;">🚨 FINAL HORN 🚨</div>`;
            document.getElementById('btnWgSkip').style.display = 'none'; document.getElementById('btnWgClose').style.display = 'block';
            let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight; return;
        }
        const ev = watchQueue.shift();
        if (ev.p > currentPeriod) { document.getElementById('wgTicker').innerHTML += `<div style="color:var(--silver-mid); text-align:center; border-bottom:1px solid #333; margin:15px 0; padding-bottom:5px;">--- END OF PERIOD ${currentPeriod} ---</div>`; currentPeriod = ev.p; }
        document.getElementById('wgClock').innerText = `P${ev.p} ${ev.m}:${ev.s < 10 ? '0'+ev.s : ev.s}`;
        
        if (ev.isFiller) {
            document.getElementById('wgTicker').innerHTML += `<div><span style="color:#555; margin-right:10px;">[${ev.tm}]</span> <span style="color:#ccc;">${ev.txt}</span></div>`;
        } else {
            if (!ev.isPenalty) {
                if (ev.tm === g.a.code) { watchCurrentScore.a++; document.getElementById('wgAwayScore').innerText = watchCurrentScore.a; }
                if (ev.tm === g.h.code) { watchCurrentScore.h++; document.getElementById('wgHomeScore').innerText = watchCurrentScore.h; }
            }
            document.getElementById('wgTicker').innerHTML += `<div style="background:#111; border:2px solid ${ev.cl}; padding:8px; margin:5px 0;"><span style="color:${ev.cl}; font-weight:bold; margin-right:10px;">[${ev.tm}]</span> <span style="color:#fff;">${ev.isPenalty ? '⛔ ' + ev.txt : '🚨 GOAL! ' + ev.txt.split(' - ')[1]}</span></div>`;
        }
        let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight;
    }, 1200); 
}

function skipWatchGame() {
    clearInterval(watchInterval); watchQueue = [];
    document.getElementById('wgAwayScore').innerText = watchGameObj.result.aG; document.getElementById('wgHomeScore').innerText = watchGameObj.result.hG;
    document.getElementById('wgClock').innerText = `FINAL${watchGameObj.result.ot > 0 ? ' (OT)' : ''}`;
    let h = '<div style="color:var(--ea-yellow); text-align:center; margin-bottom:15px;">--- FAST FORWARDED TO END ---</div>';
    watchGameObj.result.boxLog.forEach(ev => {
        if (ev.isPenalty) { h += `<div style="background:#111; border:1px solid ${ev.cl}; padding:4px; margin:4px 0;"><span style="color:${ev.cl}; font-weight:bold; margin-right:10px;">[${ev.tm}]</span> <span style="color:#fff;">⛔ ${ev.txt}</span></div>`; } 
        else { h += `<div style="background:#111; border:1px solid ${ev.cl}; padding:4px; margin:4px 0;"><span style="color:${ev.cl}; font-weight:bold; margin-right:10px;">[${ev.tm}]</span> <span style="color:#fff;">🚨 GOAL! ${ev.txt.split(' - ')[1]}</span></div>`; }
    });
    h += `<div style="color:var(--ea-yellow); text-align:center; margin-top:20px; font-size:12px;">🚨 FINAL HORN 🚨</div>`;
    document.getElementById('wgTicker').innerHTML = h; let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight;
    document.getElementById('btnWgSkip').style.display = 'none'; document.getElementById('btnWgClose').style.display = 'block';
}

function closeWatchGame() {
    document.getElementById('watchGameOverlay').style.display = 'none';
    document.getElementById('aScoreLabel').innerText = watchGameObj.result.aG; document.getElementById('hScoreLabel').innerText = watchGameObj.result.hG; 
    document.getElementById('jumboMessage').innerHTML = `BROADCAST CONCLUDED.<br><br><button onclick="openBoxScore(currentDay, activeIdx)" style="border-color:var(--neon-cyan); color:var(--neon-cyan); font-size:7px;">VIEW BOX SCORE</button>`;
    updateUI(); saveGame();
}

// --- LINE EDITORS & SPECIAL TEAMS MENUS ---
function shiftLineup(tk, pName, dir) {
    if (!rosters[tk]) return;
    const idx = rosters[tk].findIndex(p => p.name === pName);
    if (idx === -1) return;
    
    const posGroup = (rosters[tk][idx].pos === 'D') ? 'D' : (rosters[tk][idx].pos === 'G' ? 'G' : 'F');
    let targetIdx = -1;
    if (dir === -1) { 
        for (let i = idx - 1; i >= 0; i--) { let pG = (rosters[tk][i].pos === 'D') ? 'D' : (rosters[tk][i].pos === 'G' ? 'G' : 'F'); if (pG === posGroup) { targetIdx = i; break; } }
    } else { 
        for (let i = idx + 1; i < rosters[tk].length; i++) { let pG = (rosters[tk][i].pos === 'D') ? 'D' : (rosters[tk][i].pos === 'G' ? 'G' : 'F'); if (pG === posGroup) { targetIdx = i; break; } }
    }
    
    if (targetIdx !== -1) {
        const temp = rosters[tk][idx]; rosters[tk][idx] = rosters[tk][targetIdx]; rosters[tk][targetIdx] = temp;
        renderTeamStats(); saveGame(); 
    }
}

function openSubMenu(tk, pName, posGroup) {
    const roster = rosters[tk]; if (!roster) return;
    const isF = (p) => p.pos !== 'D' && p.pos !== 'G'; const isD = (p) => p.pos === 'D'; const isG = (p) => p.pos === 'G';
    
    let pool = [];
    if (posGroup === 'F' || posGroup === 'C' || posGroup === 'LW' || posGroup === 'RW') pool = roster.filter(isF);
    else if (posGroup === 'D') pool = roster.filter(isD);
    else pool = roster.filter(isG);
    
    let h = `<div style="background:#111; padding:20px; border:2px solid var(--ea-yellow); text-align:center; max-width:300px; margin:auto;">`;
    h += `<h3 style="color:var(--ea-yellow); margin-top:0;">SWAP PLAYER</h3>`;
    h += `<p style="color:#aaa; font-size:10px;">Select a player to swap spots with <strong>${pName}</strong>:</p>`;
    h += `<select id="subSelect" style="width:100%; padding:10px; background:#000; color:var(--neon-cyan); border:1px solid #333; margin-bottom:15px;">`;
    pool.forEach(p => { if (p.name !== pName) { h += `<option value="${p.name}">${p.name} (OVR: ${getPlayerWeightedStats(p.name).ovr})</option>`; } });
    h += `</select><div style="display:flex; gap:10px;">`;
    h += `<button onclick="executeSub('${tk}', '${pName}')" style="flex:1; border-color:#00FF00; color:#00FF00;">SWAP</button>`;
    h += `<button onclick="document.getElementById('subOverlay').style.display='none'" style="flex:1; border-color:var(--line-red); color:var(--line-red);">CANCEL</button>`;
    h += `</div></div>`;
    
    let overlay = document.getElementById('subOverlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'subOverlay'; overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center;'; document.body.appendChild(overlay); }
    overlay.innerHTML = h; overlay.style.display = 'flex';
}

function executeSub(tk, originalPlayerName) {
    const subSelect = document.getElementById('subSelect'); const targetPlayerName = subSelect.value;
    if (!targetPlayerName) return alert("Select a player to substitute.");
    const idx1 = rosters[tk].findIndex(p => p.name === originalPlayerName); const idx2 = rosters[tk].findIndex(p => p.name === targetPlayerName);
    
    if (idx1 !== -1 && idx2 !== -1) {
        const temp = rosters[tk][idx1]; rosters[tk][idx1] = rosters[tk][idx2]; rosters[tk][idx2] = temp;
        document.getElementById('subOverlay').style.display = 'none'; renderTeamStats(); saveGame(); 
    }
}

function openSpecialTeamsMenu(tk, mode, unitNum) {
    const tObj = league.find(t => t.nrm === tk); const roster = rosters[tk];
    if (!tObj || !roster) return console.error("[ST EDITOR] CRITICAL: Could not find Team or Roster!");
    if (!tObj.specialTeams) { tObj.specialTeams = { pp1:[], pp2:[], pk1:[], pk2:[], exa:[] }; }
    
    const manualKey = mode === 'EXA' ? 'exa' : `${mode.toLowerCase()}${unitNum}`;
    if (!tObj.specialTeams[manualKey] || tObj.specialTeams[manualKey].length === 0) {
        tObj.specialTeams[manualKey] = getSpecialTeamsUnit(tk, mode, unitNum).map(p => p.name);
    }
    
    let unit = tObj.specialTeams[manualKey]; const maxSpots = mode === 'EXA' ? 6 : (mode === 'PP' ? 5 : 4);
    
    let h = `<div style="background:#111; padding:20px; border:2px solid var(--ea-yellow); text-align:center; max-width:400px; margin:auto; box-shadow: 0 0 20px #000;">`;
    h += `<h3 style="color:var(--ea-yellow); margin-top:0;">EDIT ${mode} ${mode==='EXA'?'':unitNum}</h3>`;
    h += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">`;
    
    for (let i = 0; i < maxSpots; i++) {
        let currentPlayer = unit[i] || '';
        h += `<div style="display:flex; justify-content:space-between; align-items:center; background:#000; padding:5px; border:1px solid #333;">`;
        h += `<span style="color:#aaa; font-size:10px; width:50px; text-align:left;">SPOT ${i+1}</span>`;
        h += `<select id="st_select_${i}" style="background:#222; color:var(--neon-cyan); border:1px solid #555; padding:5px; width:200px;">`;
        let healthySkaters = roster.filter(p => p.pos !== 'G' && playerStats[p.name].injury === 0);
        healthySkaters.forEach(p => { let selected = p.name === currentPlayer ? 'selected' : ''; h += `<option value="${p.name}" ${selected}>${p.name} (${p.pos} - OVR ${getPlayerWeightedStats(p.name).ovr})</option>`; });
        h += `</select></div>`;
    }
    h += `</div><div style="display:flex; gap:10px;">`;
    h += `<button onclick="saveSpecialTeams('${tk}', '${manualKey}', ${maxSpots})" style="flex:1; border-color:#00FF00; color:#00FF00; font-weight:bold;">SAVE UNIT</button>`;
    h += `<button onclick="document.getElementById('stOverlay').style.display='none'" style="flex:1; border-color:var(--line-red); color:var(--line-red);">CANCEL</button>`;
    h += `</div></div>`;
    
    let overlay = document.getElementById('stOverlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'stOverlay'; document.body.appendChild(overlay); }
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = h; overlay.style.display = 'flex';
}

function saveSpecialTeams(tk, manualKey, maxSpots) {
    const tObj = league.find(t => t.nrm === tk); if (!tObj) return;
    let newUnit = []; for (let i = 0; i < maxSpots; i++) { let sel = document.getElementById(`st_select_${i}`); if (sel && sel.value) newUnit.push(sel.value); }
    tObj.specialTeams[manualKey] = newUnit; 
    document.getElementById('stOverlay').style.display = 'none'; renderTeamStats(); saveGame();
}

function toggleBox(el) {
    const header = el; let content = header.nextElementSibling;
    if (!content || !content.classList.contains('collapsible-content')) { content = Array.from(header.parentElement.children).find(child => child !== header && child.classList.contains('collapsible-content')); }
    if (!content) return;
    const isHidden = content.style.display === 'none' || window.getComputedStyle(content).display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const icon = header.querySelector('.toggle-icon'); if (icon) { icon.innerText = isHidden ? '[-]' : '[+]'; }
}
// =========================================================
// --- THE MISSING ENGINE: TRADES, AWARDS & ARCHIVES ---
// =========================================================

function checkMonthlyAwards() {
    if (isPlayoffs || isASG) return;
    if (currentDay % 30 === 0 && currentDay > 0) {
        let monthPerformances = Object.values(playerStats).map(p => {
            let past = monthSnapshot[p.name] || {g:0, a:0, w:0, gp:0, sv:0, sa:0}; 
            let svDiff = p.season.sv - (past.sv||0); 
            let saDiff = p.season.sa - (past.sa||0); 
            let tObj = league.find(t => t.code === p.teamCode); 
            let pConf = tObj ? tObj.conf.toLowerCase() : '';
            return { name: p.name, pos: p.pos, teamCode: p.teamCode, conf: pConf, g: p.season.g - past.g, a: p.season.a - past.a, pts: (p.season.g + p.season.a) - (past.g + past.a), w: p.season.w - past.w, gp: p.season.gp - past.gp, svp: saDiff > 0 ? (svDiff / saDiff) : 0 };
        });
        const getBest = (confStr, posFilter, sortFn) => monthPerformances.filter(p => p.conf.includes(confStr) && posFilter(p) && p.gp > 0).sort(sortFn)[0];
        const isF = p => p.pos !== 'G' && p.pos !== 'D'; const isD = p => p.pos === 'D'; const isG = p => p.pos === 'G' && p.gp >= 4; 
        const sortSkater = (a, b) => b.pts - a.pts || b.g - a.g; const sortGoalie = (a, b) => b.w - a.w || b.svp - a.svp;
        
        const eastF = getBest('east', isF, sortSkater); const eastD = getBest('east', isD, sortSkater); const eastG = getBest('east', isG, sortGoalie);
        const westF = getBest('west', isF, sortSkater); const westD = getBest('west', isD, sortSkater); const westG = getBest('west', isG, sortGoalie);
        let monthNum = Math.floor(currentDay / 30);
        
        let eF = eastF ? eastF.name : 'N/A'; let eD = eastD ? eastD.name : 'N/A'; let eG = eastG ? eastG.name : 'N/A';
        let wF = westF ? westF.name : 'N/A'; let wD = westD ? westD.name : 'N/A'; let wG = westG ? westG.name : 'N/A';
        
        document.getElementById('jumboMessage').innerHTML = `<span style="color:var(--ea-yellow)">🏆 MONTH ${monthNum} EAST AWARDS 🏆</span><br>F: ${eF} | D: ${eD} | G: ${eG}<br><span style="color:var(--ea-yellow)">🏆 MONTH ${monthNum} WEST AWARDS 🏆</span><br>F: ${wF} | D: ${wD} | G: ${wG}`;
        takeMonthSnapshot(); renderTradeLog();
    }
}

function takeMonthSnapshot() { 
    monthSnapshot = {}; 
    Object.values(playerStats).forEach(p => { monthSnapshot[p.name] = { g: p.season.g, a: p.season.a, w: p.season.w, gp: p.season.gp, sv: p.season.sv, sa: p.season.sa }; }); 
}

function initAllStarGame() {
    isASG = true; 
    const selectAS = (confTarget, confName, code, nrm, logoPath) => { 
        const isConfMatch = (teamConf) => {
            if (!teamConf) return false;
            const c = teamConf.toLowerCase();
            if (confTarget === 'east') return c.includes('east') || c.includes('wales');
            if (confTarget === 'west') return c.includes('west') || c.includes('campbell');
            return false;
        };

        const confTeams = league.filter(t => isConfMatch(t.conf));
        const pL = Object.values(playerStats).filter(p => { 
            const t = league.find(t => t.code === p.teamCode || t.name === p.team); 
            return t && isConfMatch(t.conf); 
        }); 

        let selectedPlayers = []; let repNames = new Set();
        const getScore = (p) => p.pos === 'G' ? (p.season.w * 2) + p.season.so : p.season.g + p.season.a;

        confTeams.forEach(team => {
            const teamPlayers = pL.filter(p => p.teamCode === team.code).sort((a, b) => getScore(b) - getScore(a));
            for (let p of teamPlayers) {
                let curF = selectedPlayers.filter(x => x.pos !== 'G' && x.pos !== 'D').length;
                let curD = selectedPlayers.filter(x => x.pos === 'D').length;
                let curG = selectedPlayers.filter(x => x.pos === 'G').length;
                if (p.pos === 'G' && curG < 3) { selectedPlayers.push(p); repNames.add(p.name); break; }
                if (p.pos === 'D' && curD < 8) { selectedPlayers.push(p); repNames.add(p.name); break; }
                if (p.pos !== 'G' && p.pos !== 'D' && curF < 13) { selectedPlayers.push(p); repNames.add(p.name); break; }
            }
        });

        let remainingPool = pL.filter(p => !repNames.has(p.name));
        let curF = selectedPlayers.filter(x => x.pos !== 'G' && x.pos !== 'D');
        let curD = selectedPlayers.filter(x => x.pos === 'D');
        let curG = selectedPlayers.filter(x => x.pos === 'G');
        let fillF = remainingPool.filter(p => p.pos !== 'G' && p.pos !== 'D').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 13 - curF.length));
        let fillD = remainingPool.filter(p => p.pos === 'D').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 8 - curD.length));
        let fillG = remainingPool.filter(p => p.pos === 'G').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 3 - curG.length));

        return { name: confName.toUpperCase(), code: code, nrm: nrm, season: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0}, logo: logoPath, roster: [...curF, ...fillF, ...curD, ...fillD, ...curG, ...fillG] }; 
    };
    
    const e = selectAS('east', 'WALES CONFERENCE', 'WAL', 'wales', 'wales.jpg'); 
    const w = selectAS('west', 'CAMPBELL CONFERENCE', 'CAM', 'campbell', 'campbell.jpg'); 
    
    rosters[e.nrm] = e.roster; rosters[w.nrm] = w.roster;
    calendar.splice(currentDay, 0, [{ h: e, a: w, result: null, isASG_game: true }]); 
    
    const btnArena = document.getElementById('btnGameSelect'); 
    if (btnArena) btnArena.innerText = "ASG BREAK";
    
    [...e.roster, ...w.roster].forEach(p => { if (playerStats[p.name]) playerStats[p.name].asgAppearances = (playerStats[p.name].asgAppearances || 0) + 1; }); 
    updateUI(); showASGRosters();
}

function showASGRosters() {
    if (!rosters['wales'] || !rosters['campbell']) return alert("All-Star rosters have not been generated yet.");
    let h = `<div class="menu-header" style="color:var(--ea-yellow); justify-content:center;">ALL-STAR ROSTERS</div><div style="display:flex; justify-content:space-around; gap:15px; text-align:left; font-size:9px;">`;
    const buildRosterHTML = (tk, confName, color) => {
        let html = `<div style="flex:1; border:2px solid ${color}; padding:10px; background:#000;"><div style="color:${color}; text-align:center; font-weight:bold; margin-bottom:10px; font-size:12px;">${confName}</div>`;
        let r = rosters[tk] || []; let f = r.filter(p => p.pos !== 'D' && p.pos !== 'G'); let d = r.filter(p => p.pos === 'D'); let g = r.filter(p => p.pos === 'G');
        const pLine = (p) => { let st = playerStats[p.name]; return `<div style="display:flex; justify-content:space-between; margin-bottom:4px; cursor:pointer;" onclick="showPlayerCard('${p.name}')"><span>${p.name} <span style="color:#666; font-size:6px;">(${st.teamCode})</span></span><span style="color:var(--neon-cyan);">${st.attr.ovr || getLiveIceOvr(p.name)}</span></div>`; };
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px;">FORWARDS</div>`; f.forEach(p => html += pLine(p));
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px; margin-top:10px;">DEFENSE</div>`; d.forEach(p => html += pLine(p));
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px; margin-top:10px;">GOALTENDERS</div>`; g.forEach(p => html += pLine(p));
        html += `</div>`; return html;
    };
    h += buildRosterHTML('wales', 'WALES', '#FF6600'); h += buildRosterHTML('campbell', 'CAMPBELL', '#FF6600'); 
    h += `</div><button onclick="document.getElementById('awardOverlay').style.display='none'" style="width:100%; margin-top:15px; border-color:var(--line-red); color:var(--line-red);">CLOSE ROSTERS</button>`;
    document.getElementById('awardWinnerContent').innerHTML = h; document.getElementById('awardOverlay').style.display = 'flex';
}

function awardTrophy(pName, year, tName) {
    if (!playerStats[pName]) return;
    if (!playerStats[pName].trophies) playerStats[pName].trophies = [];
    playerStats[pName].trophies.push({ year, name: tName });
    playerStats[pName].career.awards = (playerStats[pName].career.awards || 0) + 1;
}

function runEndOfSeasonAwards() {
    const maxGP = Math.max(1, ...league.map(t => t.season.gp));
    const minSkaterGP = Math.max(1, Math.floor(maxGP * 0.40)); 
    const minGoalieGP = Math.max(1, Math.floor(maxGP * 0.30)); 

    leagueHistory.unshift({ year: currentSeason, presidents: [...league].sort((a,b)=>b.season.pts-a.season.pts)[0].name, cup: currentCupChamp, standings: JSON.parse(JSON.stringify(league)) });
    const allPlayers = Object.values(playerStats);
    const skaters = allPlayers.filter(p => p.pos !== 'G' && p.season.gp >= minSkaterGP);
    const goalies = allPlayers.filter(p => p.pos === 'G' && p.season.gp >= minGoalieGP);
    
    let res = `<div class="menu-header" style="color:var(--gold-leaf); justify-content:center;">SEASON ${currentSeason} AWARDS</div>`;
    res += `<div style="text-align:center; padding:15px; background:#111; color:var(--ea-yellow); margin-bottom:15px; border:2px solid #333;">STANLEY CUP CHAMPION: <br><span style="font-size:18px;">${currentCupChamp}</span></div><table style="width:100%; font-size:8px; text-align:left;">`;
    
    const hart = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a))[0]; if (hart) awardTrophy(hart.name, currentSeason, "Hart");
    const art = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a))[0]; if (art) awardTrophy(art.name, currentSeason, "Art Ross");
    const rocket = [...skaters].sort((a, b) => b.season.g - a.season.g)[0]; if (rocket) awardTrophy(rocket.name, currentSeason, "Rocket Richard");
    
    const SKATER_ROOKIE_LIMIT = 25; const GOALIE_ROOKIE_LIMIT = 15;
    const calderEligible = allPlayers.filter(p => { const cGP = p.career.gp || 0; return p.pos === 'G' ? (cGP <= GOALIE_ROOKIE_LIMIT && p.season.gp >= minGoalieGP) : (cGP <= SKATER_ROOKIE_LIMIT && p.season.gp >= minSkaterGP); });
    const calder = [...calderEligible].sort((a, b) => { const gs = p => p.pos==='G' ? (p.season.w*4)+(p.season.so*10) : (p.season.g+p.season.a); return gs(b) - gs(a); })[0];
    if (calder) awardTrophy(calder.name, currentSeason, "Calder");

    const ladyByng = [...skaters].filter(p => (p.season.g + p.season.a) >= 40).sort((a, b) => (a.season.pim || 0) - (b.season.pim || 0) || ((b.season.g + b.season.a) - (a.season.g + a.season.a)))[0]; 
    if (ladyByng) awardTrophy(ladyByng.name, currentSeason, "Lady Byng");

    const plusMinus = [...skaters].sort((a, b) => (b.season.pm || 0) - (a.season.pm || 0))[0];
    if (plusMinus && plusMinus.season.pm > 0) awardTrophy(plusMinus.name, currentSeason, "Alka-Seltzer (+/-)");

    const defense = skaters.filter(p => p.pos === 'D');
    if (defense.length > 0) { 
        const norris = defense.sort((a, b) => ((b.season.g * 2 + b.season.a) + ((b.season.pm || 0) * 1.5)) - ((a.season.g * 2 + a.season.a) + ((a.season.pm || 0) * 1.5)))[0]; 
        awardTrophy(norris.name, currentSeason, "Norris"); 
    }
    
    const selkeFwds = skaters.filter(p => p.pos !== 'D' && p.pos !== 'G' && (p.season.pm || 0) > 0);
    if (selkeFwds.length > 0) {
        const selke = selkeFwds.sort((a, b) => (((b.season.pm || 0) * 3) + (b.attr.def * 2) + b.season.g) - (((a.season.pm || 0) * 3) + (a.attr.def * 2) + a.season.g))[0];
        awardTrophy(selke.name, currentSeason, "Selke");
    }

    if (goalies.length > 0) {
        const vezina = goalies.sort((a, b) => { const svpA = a.season.sa > 0 ? a.season.sv / a.season.sa : 0; const svpB = b.season.sa > 0 ? b.season.sv / b.season.sa : 0; return (svpB - svpA) || (b.season.w - a.season.w); })[0];
        awardTrophy(vezina.name, currentSeason, "Vezina");
    }
    
    const bestDefTeam = [...league].sort((a, b) => a.season.ga - b.season.ga)[0];
    if (bestDefTeam) goalies.filter(g => g.teamCode === bestDefTeam.code && g.season.gp >= minGoalieGP).forEach(g => awardTrophy(g.name, currentSeason, "Jennings"));

    if (currentCupChamp) { 
        const cupTeam = league.find(t => t.name === currentCupChamp); 
        if (cupTeam) { 
            const smythe = allPlayers.filter(p => p.teamCode === cupTeam.code).sort((a, b) => ((b.playoff.g + b.playoff.a) - (a.playoff.g + a.playoff.a)))[0]; 
            if (smythe) awardTrophy(smythe.name, currentSeason, "Conn Smythe"); 
        } 
    }
    
    const getWinner = (tN) => { const wAll = allPlayers.filter(p => p.trophies && p.trophies.some(t => t.year === currentSeason && t.name === tN)); return wAll.length === 0 ? "N/A" : wAll.map(w => w.name).join(', '); }; 
    
    res += `<tr><td style="color:#aaa; padding:4px 0;">HART (MVP):</td><td style="color:var(--neon-cyan);">${getWinner("Hart")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ART ROSS (PTS):</td><td style="color:var(--neon-cyan);">${getWinner("Art Ross")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ROCKET RICHARD:</td><td style="color:var(--neon-cyan);">${getWinner("Rocket Richard")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">NORRIS (DEF):</td><td style="color:var(--neon-cyan);">${getWinner("Norris")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">SELKE (DEF-FWD):</td><td style="color:var(--neon-cyan);">${getWinner("Selke")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ALKA-SELTZER (+/-):</td><td style="color:var(--neon-cyan);">${getWinner("Alka-Seltzer (+/-)")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">CALDER (ROOKIE):</td><td style="color:var(--neon-cyan);">${getWinner("Calder")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">LADY BYNG:</td><td style="color:var(--neon-cyan);">${getWinner("Lady Byng")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">VEZINA (GOALIE):</td><td style="color:var(--neon-cyan);">${getWinner("Vezina")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">JENNINGS (TEAM GA):</td><td style="color:var(--neon-cyan);">${getWinner("Jennings")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">CONN SMYTHE:</td><td style="color:var(--ea-yellow); text-shadow:1px 1px 0 #000;">${getWinner("Conn Smythe")}</td></tr></table>`;
    
    if(awardConfig.retirements) { 
        let ind = []; 
        Object.values(playerStats).forEach(p => { 
            let roll = Math.random(); 
            if((p.age > 36 && roll < 0.25) || ((p.attr.off+p.attr.def)/2 >= 90 && roll < 0.05)) { 
                ind.push(p.name); 
                hallOfFame.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: p.season.gp, g: p.season.g, a: p.season.a, pts: p.season.g+p.season.a, w: p.season.w, so: p.season.so, mvp: p.asgMvp }); 
                retiredPlayers.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: (p.career.gp || 0) + (p.season.gp || 0), g: (p.career.g || 0) + (p.season.g || 0), a: (p.career.a || 0) + (p.season.a || 0), pts: (p.career.pts || 0) + (p.season.g || 0) + (p.season.a || 0), w: (p.career.w || 0) + (p.season.w || 0), pim: (p.career.pim || 0) + (p.season.pim || 0), ppg: (p.career.ppg || 0) + (p.season.ppg || 0) });
                const tkObj = league.find(t=>t.name===p.team); const tk = tkObj ? tkObj.nrm : null; 
                if(tk && rosters[tk]) rosters[tk] = rosters[tk].filter(r => r.name !== p.name); 
                tradeLog.unshift({ day: 'POST', details: `RETIRED: Legend ${p.name} inducted.` }); 
            } 
        }); 
        res += "<h3 style='margin-top:15px; color:var(--silver-light);'>HALL OF FAME:</h3><p style='font-size:7px; color:#888;'>" + (ind.join(', ') || 'None') + "</p>"; 
    }
    
    if(awardConfig.draft) { 
        let sorting = [...league].sort((a,b) => a.season.pts - b.season.pts);
        sorting.forEach(t => { 
            const rN = "ROOKIE-" + Math.floor(Math.random()*9000+1000); 
            if (!rosters[t.nrm]) rosters[t.nrm] = []; 
            playerStats[rN] = { 
                name: rN, team: t.name, teamCode: t.code, pos: 'F', age: 18, streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, injury: 0, attr: { off: 65 + Math.floor(Math.random()*15), def: 60 + Math.floor(Math.random()*15), gDef: 60 }, 
                career: {gp:0, g:0, a:0, pts:0, w:0, so:0, sv:0, sa:0, pim:0, ppg:0}, season: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0}, playoff: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, pim:0, ppg:0} 
            }; 
            rosters[t.nrm].push({name: rN, pos: 'F'}); 
        }); 
        res += "<p style='font-size:7px; color:var(--neon-cyan);'>Draft Completed: 1 Rookie added per team.</p>"; 
    }

    document.getElementById('awardWinnerContent').innerHTML = res; 
    document.getElementById('awardOverlay').style.display = 'flex';
    saveGame();
}

function handleEndOfSeasonRestart() {
    document.getElementById('awardOverlay').style.display='none'; 
    calendar = []; currentDay = 0; 
    ['btnSimRnd', 'btnSimPlayoffs', 'btnNextRound'].forEach(id => { const b = document.getElementById(id); if(b) b.remove(); });
    document.querySelectorAll('#officeControls button').forEach(b => { const act = b.getAttribute('onclick') || ''; if(act === 'simDay()' || act === 'advanceCalendar()') b.style.display = 'none'; });
    
    if(!document.getElementById('btnStartNextSeason')) {
        const nBtn = document.createElement('button'); nBtn.id = 'btnStartNextSeason'; nBtn.innerText = `START SEASON ${currentSeason + 1}`; nBtn.style.borderColor = "var(--neon-cyan)"; nBtn.style.color = "var(--neon-cyan)"; nBtn.onclick = beginNewYear;
        const office = document.getElementById('officeControls'); office.insertBefore(nBtn, office.firstChild);
    }
    updateUI(); saveGame();
}

function updateTradeDropdowns() { 
    if (!document.getElementById('tradeTeam1')) return; 
    const tl = league.map(t => `<option value="${t.nrm}">${t.name}</option>`).join(''); 
    if(!document.getElementById('tradeTeam1').innerHTML) { document.getElementById('tradeTeam1').innerHTML = tl; document.getElementById('tradeTeam2').innerHTML = tl; } 
    const t1 = document.getElementById('tradeTeam1').value; const t2 = document.getElementById('tradeTeam2').value; 
    const getOptions = (tk) => rosters[tk] ? '<option value="">-- SELECT --</option>' + rosters[tk].map(p => `<option value="${p.name}">${p.name} (${p.pos})</option>`).join('') : '<option value="">-- EMPTY --</option>';
    for(let i=1; i<=5; i++) { 
        let d1 = document.getElementById(`tradePlayer1_${i}`); if (d1) d1.innerHTML = getOptions(t1); 
        let d2 = document.getElementById(`tradePlayer2_${i}`); if (d2) d2.innerHTML = getOptions(t2); 
    }
}

function openTradeModal() { 
    if (currentDay > 60 || isPlayoffs) return alert("TRADE DEADLINE PASSED."); 
    updateTradeDropdowns(); document.getElementById('tradeOverlay').style.display = 'flex'; 
}

function executeTrade() { 
    const t1c = document.getElementById('tradeTeam1').value; const t2c = document.getElementById('tradeTeam2').value; 
    if(t1c === t2c) return alert("Error: Teams must be different.");
    
    const s1 = [1,2,3,4,5].map(i => { let e = document.getElementById(`tradePlayer1_${i}`); return e ? e.value : ""; }).filter(v => v !== "");
    const s2 = [1,2,3,4,5].map(i => { let e = document.getElementById(`tradePlayer2_${i}`); return e ? e.value : ""; }).filter(v => v !== "");
    
    if(!s1.length && !s2.length) return alert("Select players to trade."); 
    const t1o = league.find(t => t.nrm === t1c); const t2o = league.find(t => t.nrm === t2c);
    
    s1.forEach(n => { const i = rosters[t1c].findIndex(p => p.name === n); if(i !== -1) { rosters[t2c].push(rosters[t1c].splice(i, 1)[0]); if(playerStats[n]) { playerStats[n].team = t2o.name; playerStats[n].teamCode = t2o.code; } } });
    s2.forEach(n => { const i = rosters[t2c].findIndex(p => p.name === n); if(i !== -1) { rosters[t1c].push(rosters[t2c].splice(i, 1)[0]); if(playerStats[n]) { playerStats[n].team = t1o.name; playerStats[n].teamCode = t1o.code; } } });
    
    if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null}; if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
    
    tradeLog.unshift({ day: currentDay, details: `TRADE: ${t1o.code} <-> ${t2o.code}` });
    document.getElementById('tradeOverlay').style.display = 'none'; 
    updateUI(); renderTradeLog(); saveGame();
}

function openProposalsModal() {
    let h = '';
    if (pendingTrades.length === 0) h = '<div style="color:#888; text-align:center;">No pending proposals.</div>';
    else {
        pendingTrades.forEach((t, i) => {
            h += `
            <div style="background:#000; border:2px solid #333; padding:10px; margin-bottom:10px;">
                <div style="color:var(--ea-yellow); font-size:8px; margin-bottom:10px; text-align:center;">PROPOSAL #${i+1}</div>
                <div style="display:flex; justify-content:space-between; font-size:8px; margin-bottom:15px;">
                    <div style="text-align:left; width:45%;">
                        <div style="color:#aaa;">${t.t1Name.toUpperCase()} SENDS:</div>
                        <div style="color:#fff; margin-top:5px;">${t.p1} (OVR: ${playerStats[t.p1].attr.ovr}, AGE: ${playerStats[t.p1].age})</div>
                    </div>
                    <div style="color:var(--neon-cyan); margin-top:10px;">◄ SWAP ►</div>
                    <div style="text-align:right; width:45%;">
                        <div style="color:#aaa;">${t.t2Name.toUpperCase()} SENDS:</div>
                        <div style="color:#fff; margin-top:5px;">${t.p2} (OVR: ${playerStats[t.p2].attr.ovr}, AGE: ${playerStats[t.p2].age})</div>
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="approveProposal(${t.id})" style="flex:1; border-color:#00FF00; color:#00FF00;">APPROVE</button>
                    <button onclick="rejectProposal(${t.id})" style="flex:1; border-color:var(--line-red); color:var(--line-red);">REJECT</button>
                </div>
            </div>`;
        });
    }
    document.getElementById('proposalList').innerHTML = h; document.getElementById('proposalOverlay').style.display = 'flex';
}

function approveProposal(id) {
    let t = pendingTrades.find(x => x.id === id); if (!t) return;
    const i1 = rosters[t.t1].findIndex(p => p.name === t.p1); const i2 = rosters[t.t2].findIndex(p => p.name === t.p2);
    
    if (i1 !== -1 && i2 !== -1) {
        rosters[t.t2].push(rosters[t.t1].splice(i1, 1)[0]); rosters[t.t1].push(rosters[t.t2].splice(i2, 1)[0]);
        playerStats[t.p1].team = t.t2Name; playerStats[t.p1].teamCode = league.find(l=>l.nrm===t.t2).code;
        playerStats[t.p2].team = t.t1Name; playerStats[t.p2].teamCode = league.find(l=>l.nrm===t.t1).code;
        
        let t1o = league.find(l=>l.nrm===t.t1); if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        let t2o = league.find(l=>l.nrm===t.t2); if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        tradeLog.unshift({ day: currentDay, details: `🤝 BLOCKBUSTER: ${t.p1} traded to ${t.t2Name} for ${t.p2}!` });
    }
    pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); saveGame();
}

function rejectProposal(id) { pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); saveGame(); }

function renderTradeLog() {
    let el = document.getElementById('tradeLogTable'); if (!el) return;
    let h = `<tr><th>DAY</th><th>DETAILS</th></tr>`;
    tradeLog.slice(0, 30).forEach(l => { h += `<tr><td>${l.day}</td><td>${l.details}</td></tr>`; });
    el.innerHTML = h;
}

function renderLeagueHistory() {
    let el = document.getElementById('historyTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PRESIDENTS'</th><th>STANLEY CUP</th></tr>`;
    leagueHistory.forEach(s => { h += `<tr style="cursor:pointer;" onclick="showHistoricalStandings(${s.year})"><td class="archive-hl">${s.year}</td><td>${s.presidents}</td><td style="color:var(--ea-yellow);">${s.cup}</td></tr>`; });
    el.innerHTML = h;
}

function renderHallOfFame() { 
    let el = document.getElementById('hofTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PLAYER</th><th>POS</th><th>TEAM</th><th>GP</th><th>G/W</th><th>A/SO</th><th>PTS</th><th>🏆</th></tr>`; 
    hallOfFame.forEach(p => { h += `<tr><td>${p.year}</td><td class="hof-hl">${p.name}</td><td>${p.pos}</td><td>${p.team}</td><td>${p.gp}</td><td>${p.g || p.w}</td><td>${p.a || p.so}</td><td>${p.pts || p.w}</td><td>${p.mvp?'⭐':''}</td></tr>`; }); 
    el.innerHTML = h; 
}

function renderRetiredPlayers() {
    let el = document.getElementById('retiredTable'); if (!el) return;
    let h = `<tr><th>YEAR</th><th>PLAYER</th><th>POS</th><th>LAST TEAM</th><th>GP</th><th>G/W</th><th>A/SO</th><th>PTS</th></tr>`;
    retiredPlayers.forEach(p => { h += `<tr><td>${p.year}</td><td>${p.name}</td><td>${p.pos}</td><td>${p.team}</td><td>${(p.career && p.career.gp) || p.gp}</td><td>${p.pos==='G'?((p.career && p.career.w) || p.w):((p.career && p.career.g) || p.g)}</td><td>${p.pos==='G'?((p.career && p.career.so) || p.so):((p.career && p.career.a) || p.a)}</td><td class="pts-hl">${p.pos==='G'?'-':((p.career && p.career.pts) || p.pts)}</td></tr>`; });
    el.innerHTML = h;
}

function showHistoricalStandings(y) {
    const hs = leagueHistory.find(h => h.year === y); 
    if(!hs || !hs.standings) return alert("Archive data missing."); 
    document.getElementById('historyYearTitle').innerText = y;
    const renderT = (id, cf) => { 
        const ts = hs.standings.filter(t => t.conf.toLowerCase().includes(cf)).sort((a,b) => b.pts - a.pts || b.w - a.w); 
        let h = `<tr><th>TEAM</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>PTS</th></tr>`; 
        h += ts.map(t => `<tr><td style="display:flex; align-items:center;">${getTeamLogoHtml(t.name)} ${t.name}</td><td>${t.gp}</td><td>${t.w}</td><td>${t.l}</td><td>${t.t}</td><td class="pts-hl">${t.pts}</td></tr>`).join(''); 
        document.getElementById(id).innerHTML = h; 
    }; 
    renderT('historyEastStand', 'east'); renderT('historyWestStand', 'west'); 
    document.getElementById('historyOverlay').style.display = 'flex';
}

function openAllTimeRecords() {
    let pl=[]; 
    Object.values(playerStats).forEach(p=>pl.push({name:p.name,pos:p.pos,gp:p.career.gp+p.season.gp,g:p.career.g+p.season.g,a:p.career.a+p.season.a,pts:p.career.pts+p.season.g+p.season.a,w:p.career.w+p.season.w,pim:(p.career.pim||0)+(p.season.pim||0),ppg:(p.career.ppg||0)+(p.season.ppg||0)})); 
    retiredPlayers.forEach(p=>pl.push({name:p.name+" (RET)",pos:p.pos||'F',gp:p.gp||0,g:p.g||0,a:p.a||0,pts:p.pts||0,w:p.w||0,pim:p.pim||0,ppg:p.ppg||0})); 
    
    const sk = pl.filter(p=>p.pos!=='G'); const gl = pl.filter(p=>p.pos==='G'); 
    const rLb = (id,d,vF) => { 
        let h=`<tr><th>#</th><th>PLAYER</th><th>TOTAL</th></tr>`; 
        d.slice(0,25).forEach((p,i)=>{h+=`<tr><td>${i+1}</td><td>${p.name}</td><td class="pts-hl">${vF(p)}</td></tr>`;}); 
        document.getElementById(id).innerHTML = h; 
    };
    
    rLb('allTimePts', [...sk].sort((a,b)=>b.pts-a.pts), p=>p.pts); rLb('allTimeGls', [...sk].sort((a,b)=>b.g-a.g), p=>p.g);
    rLb('allTimeAst', [...sk].sort((a,b)=>b.a-a.a), p=>p.a); rLb('allTimePpg', [...sk].sort((a,b)=>b.ppg-a.ppg), p=>p.ppg);
    rLb('allTimePim', [...sk].sort((a,b)=>b.pim-a.pim), p=>p.pim); rLb('allTimeWins', [...gl].sort((a,b)=>b.w-a.w), p=>p.w);
    
    document.getElementById('allTimeOverlay').style.display = 'flex';
}

function openLeagueSettings() { 
    let h = ''; 
    Object.keys(awardConfig).forEach(k => { h += `<div style="padding:5px;"><input type="checkbox" ${awardConfig[k]?'checked':''} onchange="awardConfig['${k}']=this.checked; saveGame();"> ${k.toUpperCase()}</div>`; }); 
    document.getElementById('leagueSettingsContent').innerHTML = h; document.getElementById('leagueSettingsOverlay').style.display = 'flex'; 
}

function openArenaSettings() { 
    let h = ''; 
    league.forEach((t, i) => { h += `<div style="margin-bottom:10px; display:flex; justify-content:space-between; font-size:8px;"><span>${t.name}</span><input type="range" min="80" max="132" value="${t.db}" oninput="league[${i}].db=parseInt(this.value); saveGame();" style="width:50%;"></div>`; }); 
    document.getElementById('arenaSettingsContent').innerHTML = h; document.getElementById('arenaSettingsOverlay').style.display = 'flex'; 
}

function resetLeague() { 
    if(confirm("Wipe dynasty data? History/HOF will remain.")) { localStorage.removeItem(SAVE_STORAGE_KEY); location.reload(); } 
} 

function clearArchives() { 
    if(confirm("Delete past History & HOF?")) { 
        leagueHistory = []; hallOfFame = []; retiredPlayers = []; 
        localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(HOF_STORAGE_KEY); localStorage.removeItem(RETIRED_STORAGE_KEY); 
        renderLeagueHistory(); renderHallOfFame(); renderRetiredPlayers(); 
    } 
}

function exportCSV() { 
    let csv = "Player,Team,Pos,Age,GP,G,A,PTS,W,SO,SV%,GAA,OVR,ASG_APP\n"; 
    Object.values(playerStats).forEach(p => { 
        const s = p.season; const svp = s.sa > 0 ? (s.sv/s.sa).toFixed(3) : "0.000"; const gaa = s.gp > 0 ? ((s.sa-s.sv)/s.gp).toFixed(2) : "0.00"; 
        const ovr = p.attr.ovr || (p.pos === 'G' ? p.attr.gDef : Math.round((p.attr.off + p.attr.def) / 2));
        csv += `${p.name},${p.team},${p.pos},${p.age},${s.gp},${s.g},${s.a},${s.g+s.a},${s.w},${s.so},${svp},${gaa},${ovr},${p.asgAppearances || 0}\n`; 
    }); 
    const b = new Blob([csv], {type: "text/csv"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); 
    a.href = u; a.download = "EASN_League_Stats.csv"; a.click(); 
}
// =========================================================
// --- THE MISSING ENGINE: TRADES, AWARDS & ARCHIVES ---
// =========================================================

function checkMonthlyAwards() {
    if (isPlayoffs || isASG) return;
    if (currentDay % 30 === 0 && currentDay > 0) {
        let monthPerformances = Object.values(playerStats).map(p => {
            let past = monthSnapshot[p.name] || {g:0, a:0, w:0, gp:0, sv:0, sa:0}; 
            let svDiff = p.season.sv - (past.sv||0); 
            let saDiff = p.season.sa - (past.sa||0); 
            let tObj = league.find(t => t.code === p.teamCode); 
            let pConf = tObj ? tObj.conf.toLowerCase() : '';
            return { name: p.name, pos: p.pos, teamCode: p.teamCode, conf: pConf, g: p.season.g - past.g, a: p.season.a - past.a, pts: (p.season.g + p.season.a) - (past.g + past.a), w: p.season.w - past.w, gp: p.season.gp - past.gp, svp: saDiff > 0 ? (svDiff / saDiff) : 0 };
        });
        const getBest = (confStr, posFilter, sortFn) => monthPerformances.filter(p => p.conf.includes(confStr) && posFilter(p) && p.gp > 0).sort(sortFn)[0];
        const isF = p => p.pos !== 'G' && p.pos !== 'D'; const isD = p => p.pos === 'D'; const isG = p => p.pos === 'G' && p.gp >= 4; 
        const sortSkater = (a, b) => b.pts - a.pts || b.g - a.g; const sortGoalie = (a, b) => b.w - a.w || b.svp - a.svp;
        
        const eastF = getBest('east', isF, sortSkater); const eastD = getBest('east', isD, sortSkater); const eastG = getBest('east', isG, sortGoalie);
        const westF = getBest('west', isF, sortSkater); const westD = getBest('west', isD, sortSkater); const westG = getBest('west', isG, sortGoalie);
        let monthNum = Math.floor(currentDay / 30);
        
        let eF = eastF ? eastF.name : 'N/A'; let eD = eastD ? eastD.name : 'N/A'; let eG = eastG ? eastG.name : 'N/A';
        let wF = westF ? westF.name : 'N/A'; let wD = westD ? westD.name : 'N/A'; let wG = westG ? westG.name : 'N/A';
        
        document.getElementById('jumboMessage').innerHTML = `<span style="color:var(--ea-yellow)">🏆 MONTH ${monthNum} EAST AWARDS 🏆</span><br>F: ${eF} | D: ${eD} | G: ${eG}<br><span style="color:var(--ea-yellow)">🏆 MONTH ${monthNum} WEST AWARDS 🏆</span><br>F: ${wF} | D: ${wD} | G: ${wG}`;
        takeMonthSnapshot(); renderTradeLog();
    }
}

function takeMonthSnapshot() { 
    monthSnapshot = {}; 
    Object.values(playerStats).forEach(p => { monthSnapshot[p.name] = { g: p.season.g, a: p.season.a, w: p.season.w, gp: p.season.gp, sv: p.season.sv, sa: p.season.sa }; }); 
}

function initAllStarGame() {
    isASG = true; 
    const selectAS = (confTarget, confName, code, nrm, logoPath) => { 
        const isConfMatch = (teamConf) => {
            if (!teamConf) return false;
            const c = teamConf.toLowerCase();
            if (confTarget === 'east') return c.includes('east') || c.includes('wales');
            if (confTarget === 'west') return c.includes('west') || c.includes('campbell');
            return false;
        };

        const confTeams = league.filter(t => isConfMatch(t.conf));
        const pL = Object.values(playerStats).filter(p => { 
            const t = league.find(t => t.code === p.teamCode || t.name === p.team); 
            return t && isConfMatch(t.conf); 
        }); 

        let selectedPlayers = []; let repNames = new Set();
        const getScore = (p) => p.pos === 'G' ? (p.season.w * 2) + p.season.so : p.season.g + p.season.a;

        confTeams.forEach(team => {
            const teamPlayers = pL.filter(p => p.teamCode === team.code).sort((a, b) => getScore(b) - getScore(a));
            for (let p of teamPlayers) {
                let curF = selectedPlayers.filter(x => x.pos !== 'G' && x.pos !== 'D').length;
                let curD = selectedPlayers.filter(x => x.pos === 'D').length;
                let curG = selectedPlayers.filter(x => x.pos === 'G').length;
                if (p.pos === 'G' && curG < 3) { selectedPlayers.push(p); repNames.add(p.name); break; }
                if (p.pos === 'D' && curD < 8) { selectedPlayers.push(p); repNames.add(p.name); break; }
                if (p.pos !== 'G' && p.pos !== 'D' && curF < 13) { selectedPlayers.push(p); repNames.add(p.name); break; }
            }
        });

        let remainingPool = pL.filter(p => !repNames.has(p.name));
        let curF = selectedPlayers.filter(x => x.pos !== 'G' && x.pos !== 'D');
        let curD = selectedPlayers.filter(x => x.pos === 'D');
        let curG = selectedPlayers.filter(x => x.pos === 'G');
        let fillF = remainingPool.filter(p => p.pos !== 'G' && p.pos !== 'D').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 13 - curF.length));
        let fillD = remainingPool.filter(p => p.pos === 'D').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 8 - curD.length));
        let fillG = remainingPool.filter(p => p.pos === 'G').sort((a,b) => getScore(b) - getScore(a)).slice(0, Math.max(0, 3 - curG.length));

        return { name: confName.toUpperCase(), code: code, nrm: nrm, season: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0}, logo: logoPath, roster: [...curF, ...fillF, ...curD, ...fillD, ...curG, ...fillG] }; 
    };
    
    const e = selectAS('east', 'WALES CONFERENCE', 'WAL', 'wales', 'wales.jpg'); 
    const w = selectAS('west', 'CAMPBELL CONFERENCE', 'CAM', 'campbell', 'campbell.jpg'); 
    
    rosters[e.nrm] = e.roster; rosters[w.nrm] = w.roster;
    calendar.splice(currentDay, 0, [{ h: e, a: w, result: null, isASG_game: true }]); 
    
    const btnArena = document.getElementById('btnGameSelect'); 
    if (btnArena) btnArena.innerText = "ASG BREAK";
    
    [...e.roster, ...w.roster].forEach(p => { if (playerStats[p.name]) playerStats[p.name].asgAppearances = (playerStats[p.name].asgAppearances || 0) + 1; }); 
    updateUI(); showASGRosters();
}

function showASGRosters() {
    if (!rosters['wales'] || !rosters['campbell']) return alert("All-Star rosters have not been generated yet.");
    let h = `<div class="menu-header" style="color:var(--ea-yellow); justify-content:center;">ALL-STAR ROSTERS</div><div style="display:flex; justify-content:space-around; gap:15px; text-align:left; font-size:9px;">`;
    const buildRosterHTML = (tk, confName, color) => {
        let html = `<div style="flex:1; border:2px solid ${color}; padding:10px; background:#000;"><div style="color:${color}; text-align:center; font-weight:bold; margin-bottom:10px; font-size:12px;">${confName}</div>`;
        let r = rosters[tk] || []; let f = r.filter(p => p.pos !== 'D' && p.pos !== 'G'); let d = r.filter(p => p.pos === 'D'); let g = r.filter(p => p.pos === 'G');
        const pLine = (p) => { let st = playerStats[p.name]; return `<div style="display:flex; justify-content:space-between; margin-bottom:4px; cursor:pointer;" onclick="showPlayerCard('${p.name}')"><span>${p.name} <span style="color:#666; font-size:6px;">(${st.teamCode})</span></span><span style="color:var(--neon-cyan);">${st.attr.ovr || getLiveIceOvr(p.name)}</span></div>`; };
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px;">FORWARDS</div>`; f.forEach(p => html += pLine(p));
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px; margin-top:10px;">DEFENSE</div>`; d.forEach(p => html += pLine(p));
        html += `<div style="color:#aaa; border-bottom:1px solid #333; margin-bottom:5px; margin-top:10px;">GOALTENDERS</div>`; g.forEach(p => html += pLine(p));
        html += `</div>`; return html;
    };
    h += buildRosterHTML('wales', 'WALES', '#FF6600'); h += buildRosterHTML('campbell', 'CAMPBELL', '#FF6600'); 
    h += `</div><button onclick="document.getElementById('awardOverlay').style.display='none'" style="width:100%; margin-top:15px; border-color:var(--line-red); color:var(--line-red);">CLOSE ROSTERS</button>`;
    document.getElementById('awardWinnerContent').innerHTML = h; document.getElementById('awardOverlay').style.display = 'flex';
}

function awardTrophy(pName, year, tName) {
    if (!playerStats[pName]) return;
    if (!playerStats[pName].trophies) playerStats[pName].trophies = [];
    playerStats[pName].trophies.push({ year, name: tName });
    playerStats[pName].career.awards = (playerStats[pName].career.awards || 0) + 1;
}

function runEndOfSeasonAwards() {
    const maxGP = Math.max(1, ...league.map(t => t.season.gp));
    const minSkaterGP = Math.max(1, Math.floor(maxGP * 0.40)); 
    const minGoalieGP = Math.max(1, Math.floor(maxGP * 0.30)); 

    leagueHistory.unshift({ year: currentSeason, presidents: [...league].sort((a,b)=>b.season.pts-a.season.pts)[0].name, cup: currentCupChamp, standings: JSON.parse(JSON.stringify(league)) });
    const allPlayers = Object.values(playerStats);
    const skaters = allPlayers.filter(p => p.pos !== 'G' && p.season.gp >= minSkaterGP);
    const goalies = allPlayers.filter(p => p.pos === 'G' && p.season.gp >= minGoalieGP);
    
    let res = `<div class="menu-header" style="color:var(--gold-leaf); justify-content:center;">SEASON ${currentSeason} AWARDS</div>`;
    res += `<div style="text-align:center; padding:15px; background:#111; color:var(--ea-yellow); margin-bottom:15px; border:2px solid #333;">STANLEY CUP CHAMPION: <br><span style="font-size:18px;">${currentCupChamp}</span></div><table style="width:100%; font-size:8px; text-align:left;">`;
    
    const hart = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a))[0]; if (hart) awardTrophy(hart.name, currentSeason, "Hart");
    const art = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a))[0]; if (art) awardTrophy(art.name, currentSeason, "Art Ross");
    const rocket = [...skaters].sort((a, b) => b.season.g - a.season.g)[0]; if (rocket) awardTrophy(rocket.name, currentSeason, "Rocket Richard");
    
    const SKATER_ROOKIE_LIMIT = 25; const GOALIE_ROOKIE_LIMIT = 15;
    const calderEligible = allPlayers.filter(p => { const cGP = p.career.gp || 0; return p.pos === 'G' ? (cGP <= GOALIE_ROOKIE_LIMIT && p.season.gp >= minGoalieGP) : (cGP <= SKATER_ROOKIE_LIMIT && p.season.gp >= minSkaterGP); });
    const calder = [...calderEligible].sort((a, b) => { const gs = p => p.pos==='G' ? (p.season.w*4)+(p.season.so*10) : (p.season.g+p.season.a); return gs(b) - gs(a); })[0];
    if (calder) awardTrophy(calder.name, currentSeason, "Calder");

    const ladyByng = [...skaters].filter(p => (p.season.g + p.season.a) >= 40).sort((a, b) => (a.season.pim || 0) - (b.season.pim || 0) || ((b.season.g + b.season.a) - (a.season.g + a.season.a)))[0]; 
    if (ladyByng) awardTrophy(ladyByng.name, currentSeason, "Lady Byng");

    const plusMinus = [...skaters].sort((a, b) => (b.season.pm || 0) - (a.season.pm || 0))[0];
    if (plusMinus && plusMinus.season.pm > 0) awardTrophy(plusMinus.name, currentSeason, "Alka-Seltzer (+/-)");

    const defense = skaters.filter(p => p.pos === 'D');
    if (defense.length > 0) { 
        const norris = defense.sort((a, b) => ((b.season.g * 2 + b.season.a) + ((b.season.pm || 0) * 1.5)) - ((a.season.g * 2 + a.season.a) + ((a.season.pm || 0) * 1.5)))[0]; 
        awardTrophy(norris.name, currentSeason, "Norris"); 
    }
    
    const selkeFwds = skaters.filter(p => p.pos !== 'D' && p.pos !== 'G' && (p.season.pm || 0) > 0);
    if (selkeFwds.length > 0) {
        const selke = selkeFwds.sort((a, b) => (((b.season.pm || 0) * 3) + (b.attr.def * 2) + b.season.g) - (((a.season.pm || 0) * 3) + (a.attr.def * 2) + a.season.g))[0];
        awardTrophy(selke.name, currentSeason, "Selke");
    }

    if (goalies.length > 0) {
        const vezina = goalies.sort((a, b) => { const svpA = a.season.sa > 0 ? a.season.sv / a.season.sa : 0; const svpB = b.season.sa > 0 ? b.season.sv / b.season.sa : 0; return (svpB - svpA) || (b.season.w - a.season.w); })[0];
        awardTrophy(vezina.name, currentSeason, "Vezina");
    }
    
    const bestDefTeam = [...league].sort((a, b) => a.season.ga - b.season.ga)[0];
    if (bestDefTeam) goalies.filter(g => g.teamCode === bestDefTeam.code && g.season.gp >= minGoalieGP).forEach(g => awardTrophy(g.name, currentSeason, "Jennings"));

    if (currentCupChamp) { 
        const cupTeam = league.find(t => t.name === currentCupChamp); 
        if (cupTeam) { 
            const smythe = allPlayers.filter(p => p.teamCode === cupTeam.code).sort((a, b) => ((b.playoff.g + b.playoff.a) - (a.playoff.g + a.playoff.a)))[0]; 
            if (smythe) awardTrophy(smythe.name, currentSeason, "Conn Smythe"); 
        } 
    }
    
    const getWinner = (tN) => { const wAll = allPlayers.filter(p => p.trophies && p.trophies.some(t => t.year === currentSeason && t.name === tN)); return wAll.length === 0 ? "N/A" : wAll.map(w => w.name).join(', '); }; 
    
    res += `<tr><td style="color:#aaa; padding:4px 0;">HART (MVP):</td><td style="color:var(--neon-cyan);">${getWinner("Hart")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ART ROSS (PTS):</td><td style="color:var(--neon-cyan);">${getWinner("Art Ross")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ROCKET RICHARD:</td><td style="color:var(--neon-cyan);">${getWinner("Rocket Richard")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">NORRIS (DEF):</td><td style="color:var(--neon-cyan);">${getWinner("Norris")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">SELKE (DEF-FWD):</td><td style="color:var(--neon-cyan);">${getWinner("Selke")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">ALKA-SELTZER (+/-):</td><td style="color:var(--neon-cyan);">${getWinner("Alka-Seltzer (+/-)")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">CALDER (ROOKIE):</td><td style="color:var(--neon-cyan);">${getWinner("Calder")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">LADY BYNG:</td><td style="color:var(--neon-cyan);">${getWinner("Lady Byng")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">VEZINA (GOALIE):</td><td style="color:var(--neon-cyan);">${getWinner("Vezina")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">JENNINGS (TEAM GA):</td><td style="color:var(--neon-cyan);">${getWinner("Jennings")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:4px 0;">CONN SMYTHE:</td><td style="color:var(--ea-yellow); text-shadow:1px 1px 0 #000;">${getWinner("Conn Smythe")}</td></tr></table>`;
    
    if(awardConfig.retirements) { 
        let ind = []; 
        Object.values(playerStats).forEach(p => { 
            let roll = Math.random(); 
            if((p.age > 36 && roll < 0.25) || ((p.attr.off+p.attr.def)/2 >= 90 && roll < 0.05)) { 
                ind.push(p.name); 
                hallOfFame.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: p.season.gp, g: p.season.g, a: p.season.a, pts: p.season.g+p.season.a, w: p.season.w, so: p.season.so, mvp: p.asgMvp }); 
                retiredPlayers.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: (p.career.gp || 0) + (p.season.gp || 0), g: (p.career.g || 0) + (p.season.g || 0), a: (p.career.a || 0) + (p.season.a || 0), pts: (p.career.pts || 0) + (p.season.g || 0) + (p.season.a || 0), w: (p.career.w || 0) + (p.season.w || 0), pim: (p.career.pim || 0) + (p.season.pim || 0), ppg: (p.career.ppg || 0) + (p.season.ppg || 0) });
                const tkObj = league.find(t=>t.name===p.team); const tk = tkObj ? tkObj.nrm : null; 
                if(tk && rosters[tk]) rosters[tk] = rosters[tk].filter(r => r.name !== p.name); 
                tradeLog.unshift({ day: 'POST', details: `RETIRED: Legend ${p.name} inducted.` }); 
            } 
        }); 
        res += "<h3 style='margin-top:15px; color:var(--silver-light);'>HALL OF FAME:</h3><p style='font-size:7px; color:#888;'>" + (ind.join(', ') || 'None') + "</p>"; 
    }
    
    if(awardConfig.draft) { 
        let sorting = [...league].sort((a,b) => a.season.pts - b.season.pts);
        sorting.forEach(t => { 
            const rN = "ROOKIE-" + Math.floor(Math.random()*9000+1000); 
            if (!rosters[t.nrm]) rosters[t.nrm] = []; 
            playerStats[rN] = { 
                name: rN, team: t.name, teamCode: t.code, pos: 'F', age: 18, streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, injury: 0, attr: { off: 65 + Math.floor(Math.random()*15), def: 60 + Math.floor(Math.random()*15), gDef: 60 }, 
                career: {gp:0, g:0, a:0, pts:0, w:0, so:0, sv:0, sa:0, pim:0, ppg:0}, season: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0}, playoff: {gp:0, g:0, a:0, so:0, sv:0, sa:0, w:0, l:0, pim:0, ppg:0} 
            }; 
            rosters[t.nrm].push({name: rN, pos: 'F'}); 
        }); 
        res += "<p style='font-size:7px; color:var(--neon-cyan);'>Draft Completed: 1 Rookie added per team.</p>"; 
    }

    document.getElementById('awardWinnerContent').innerHTML = res; 
    document.getElementById('awardOverlay').style.display = 'flex';
    saveGame();
}

function handleEndOfSeasonRestart() {
    document.getElementById('awardOverlay').style.display='none'; 
    calendar = []; currentDay = 0; 
    ['btnSimRnd', 'btnSimPlayoffs', 'btnNextRound'].forEach(id => { const b = document.getElementById(id); if(b) b.remove(); });
    document.querySelectorAll('#officeControls button').forEach(b => { const act = b.getAttribute('onclick') || ''; if(act === 'simDay()' || act === 'advanceCalendar()') b.style.display = 'none'; });
    
    if(!document.getElementById('btnStartNextSeason')) {
        const nBtn = document.createElement('button'); nBtn.id = 'btnStartNextSeason'; nBtn.innerText = `START SEASON ${currentSeason + 1}`; nBtn.style.borderColor = "var(--neon-cyan)"; nBtn.style.color = "var(--neon-cyan)"; nBtn.onclick = beginNewYear;
        const office = document.getElementById('officeControls'); office.insertBefore(nBtn, office.firstChild);
    }
    updateUI(); saveGame();
}

function updateTradeDropdowns() { 
    if (!document.getElementById('tradeTeam1')) return; 
    const tl = league.map(t => `<option value="${t.nrm}">${t.name}</option>`).join(''); 
    if(!document.getElementById('tradeTeam1').innerHTML) { document.getElementById('tradeTeam1').innerHTML = tl; document.getElementById('tradeTeam2').innerHTML = tl; } 
    const t1 = document.getElementById('tradeTeam1').value; const t2 = document.getElementById('tradeTeam2').value; 
    const getOptions = (tk) => rosters[tk] ? '<option value="">-- SELECT --</option>' + rosters[tk].map(p => `<option value="${p.name}">${p.name} (${p.pos})</option>`).join('') : '<option value="">-- EMPTY --</option>';
    for(let i=1; i<=5; i++) { 
        let d1 = document.getElementById(`tradePlayer1_${i}`); if (d1) d1.innerHTML = getOptions(t1); 
        let d2 = document.getElementById(`tradePlayer2_${i}`); if (d2) d2.innerHTML = getOptions(t2); 
    }
}

function openTradeModal() { 
    if (currentDay > 60 || isPlayoffs) return alert("TRADE DEADLINE PASSED."); 
    updateTradeDropdowns(); document.getElementById('tradeOverlay').style.display = 'flex'; 
}

function executeTrade() { 
    const t1c = document.getElementById('tradeTeam1').value; const t2c = document.getElementById('tradeTeam2').value; 
    if(t1c === t2c) return alert("Error: Teams must be different.");
    
    const s1 = [1,2,3,4,5].map(i => { let e = document.getElementById(`tradePlayer1_${i}`); return e ? e.value : ""; }).filter(v => v !== "");
    const s2 = [1,2,3,4,5].map(i => { let e = document.getElementById(`tradePlayer2_${i}`); return e ? e.value : ""; }).filter(v => v !== "");
    
    if(!s1.length && !s2.length) return alert("Select players to trade."); 
    const t1o = league.find(t => t.nrm === t1c); const t2o = league.find(t => t.nrm === t2c);
    
    s1.forEach(n => { const i = rosters[t1c].findIndex(p => p.name === n); if(i !== -1) { rosters[t2c].push(rosters[t1c].splice(i, 1)[0]); if(playerStats[n]) { playerStats[n].team = t2o.name; playerStats[n].teamCode = t2o.code; } } });
    s2.forEach(n => { const i = rosters[t2c].findIndex(p => p.name === n); if(i !== -1) { rosters[t1c].push(rosters[t2c].splice(i, 1)[0]); if(playerStats[n]) { playerStats[n].team = t1o.name; playerStats[n].teamCode = t1o.code; } } });
    
    if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null}; if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
    
    tradeLog.unshift({ day: currentDay, details: `TRADE: ${t1o.code} <-> ${t2o.code}` });
    document.getElementById('tradeOverlay').style.display = 'none'; 
    updateUI(); renderTradeLog(); saveGame();
}

function openProposalsModal() {
    let h = '';
    if (pendingTrades.length === 0) h = '<div style="color:#888; text-align:center;">No pending proposals.</div>';
    else {
        pendingTrades.forEach((t, i) => {
            h += `
            <div style="background:#000; border:2px solid #333; padding:10px; margin-bottom:10px;">
                <div style="color:var(--ea-yellow); font-size:8px; margin-bottom:10px; text-align:center;">PROPOSAL #${i+1}</div>
                <div style="display:flex; justify-content:space-between; font-size:8px; margin-bottom:15px;">
                    <div style="text-align:left; width:45%;">
                        <div style="color:#aaa;">${t.t1Name.toUpperCase()} SENDS:</div>
                        <div style="color:#fff; margin-top:5px;">${t.p1} (OVR: ${playerStats[t.p1].attr.ovr}, AGE: ${playerStats[t.p1].age})</div>
                    </div>
                    <div style="color:var(--neon-cyan); margin-top:10px;">◄ SWAP ►</div>
                    <div style="text-align:right; width:45%;">
                        <div style="color:#aaa;">${t.t2Name.toUpperCase()} SENDS:</div>
                        <div style="color:#fff; margin-top:5px;">${t.p2} (OVR: ${playerStats[t.p2].attr.ovr}, AGE: ${playerStats[t.p2].age})</div>
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="approveProposal(${t.id})" style="flex:1; border-color:#00FF00; color:#00FF00;">APPROVE</button>
                    <button onclick="rejectProposal(${t.id})" style="flex:1; border-color:var(--line-red); color:var(--line-red);">REJECT</button>
                </div>
            </div>`;
        });
    }
    document.getElementById('proposalList').innerHTML = h; document.getElementById('proposalOverlay').style.display = 'flex';
}

function approveProposal(id) {
    let t = pendingTrades.find(x => x.id === id); if (!t) return;
    const i1 = rosters[t.t1].findIndex(p => p.name === t.p1); const i2 = rosters[t.t2].findIndex(p => p.name === t.p2);
    
    if (i1 !== -1 && i2 !== -1) {
        rosters[t.t2].push(rosters[t.t1].splice(i1, 1)[0]); rosters[t.t1].push(rosters[t.t2].splice(i2, 1)[0]);
        playerStats[t.p1].team = t.t2Name; playerStats[t.p1].teamCode = league.find(l=>l.nrm===t.t2).code;
        playerStats[t.p2].team = t.t1Name; playerStats[t.p2].teamCode = league.find(l=>l.nrm===t.t1).code;
        
        let t1o = league.find(l=>l.nrm===t.t1); if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        let t2o = league.find(l=>l.nrm===t.t2); if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        tradeLog.unshift({ day: currentDay, details: `🤝 BLOCKBUSTER: ${t.p1} traded to ${t.t2Name} for ${t.p2}!` });
    }
    pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); saveGame();
}

function rejectProposal(id) { pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); saveGame(); }

function renderTradeLog() {
    let el = document.getElementById('tradeLogTable'); if (!el) return;
    let h = `<tr><th>DAY</th><th>DETAILS</th></tr>`;
    tradeLog.slice(0, 30).forEach(l => { h += `<tr><td>${l.day}</td><td>${l.details}</td></tr>`; });
    el.innerHTML = h;
}

function renderLeagueHistory() {
    let el = document.getElementById('historyTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PRESIDENTS'</th><th>STANLEY CUP</th></tr>`;
    leagueHistory.forEach(s => { h += `<tr style="cursor:pointer;" onclick="showHistoricalStandings(${s.year})"><td class="archive-hl">${s.year}</td><td>${s.presidents}</td><td style="color:var(--ea-yellow);">${s.cup}</td></tr>`; });
    el.innerHTML = h;
}

function renderHallOfFame() { 
    let el = document.getElementById('hofTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PLAYER</th><th>POS</th><th>TEAM</th><th>GP</th><th>G/W</th><th>A/SO</th><th>PTS</th><th>🏆</th></tr>`; 
    hallOfFame.forEach(p => { h += `<tr><td>${p.year}</td><td class="hof-hl">${p.name}</td><td>${p.pos}</td><td>${p.team}</td><td>${p.gp}</td><td>${p.g || p.w}</td><td>${p.a || p.so}</td><td>${p.pts || p.w}</td><td>${p.mvp?'⭐':''}</td></tr>`; }); 
    el.innerHTML = h; 
}

function renderRetiredPlayers() {
    let el = document.getElementById('retiredTable'); if (!el) return;
    let h = `<tr><th>YEAR</th><th>PLAYER</th><th>POS</th><th>LAST TEAM</th><th>GP</th><th>G/W</th><th>A/SO</th><th>PTS</th></tr>`;
    retiredPlayers.forEach(p => { h += `<tr><td>${p.year}</td><td>${p.name}</td><td>${p.pos}</td><td>${p.team}</td><td>${(p.career && p.career.gp) || p.gp}</td><td>${p.pos==='G'?((p.career && p.career.w) || p.w):((p.career && p.career.g) || p.g)}</td><td>${p.pos==='G'?((p.career && p.career.so) || p.so):((p.career && p.career.a) || p.a)}</td><td class="pts-hl">${p.pos==='G'?'-':((p.career && p.career.pts) || p.pts)}</td></tr>`; });
    el.innerHTML = h;
}

function showHistoricalStandings(y) {
    const hs = leagueHistory.find(h => h.year === y); 
    if(!hs || !hs.standings) return alert("Archive data missing."); 
    document.getElementById('historyYearTitle').innerText = y;
    const renderT = (id, cf) => { 
        const ts = hs.standings.filter(t => t.conf.toLowerCase().includes(cf)).sort((a,b) => b.pts - a.pts || b.w - a.w); 
        let h = `<tr><th>TEAM</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>PTS</th></tr>`; 
        h += ts.map(t => `<tr><td style="display:flex; align-items:center;">${getTeamLogoHtml(t.name)} ${t.name}</td><td>${t.gp}</td><td>${t.w}</td><td>${t.l}</td><td>${t.t}</td><td class="pts-hl">${t.pts}</td></tr>`).join(''); 
        document.getElementById(id).innerHTML = h; 
    }; 
    renderT('historyEastStand', 'east'); renderT('historyWestStand', 'west'); 
    document.getElementById('historyOverlay').style.display = 'flex';
}

function openAllTimeRecords() {
    let pl=[]; 
    Object.values(playerStats).forEach(p=>pl.push({name:p.name,pos:p.pos,gp:p.career.gp+p.season.gp,g:p.career.g+p.season.g,a:p.career.a+p.season.a,pts:p.career.pts+p.season.g+p.season.a,w:p.career.w+p.season.w,pim:(p.career.pim||0)+(p.season.pim||0),ppg:(p.career.ppg||0)+(p.season.ppg||0)})); 
    retiredPlayers.forEach(p=>pl.push({name:p.name+" (RET)",pos:p.pos||'F',gp:p.gp||0,g:p.g||0,a:p.a||0,pts:p.pts||0,w:p.w||0,pim:p.pim||0,ppg:p.ppg||0})); 
    
    const sk = pl.filter(p=>p.pos!=='G'); const gl = pl.filter(p=>p.pos==='G'); 
    const rLb = (id,d,vF) => { 
        let h=`<tr><th>#</th><th>PLAYER</th><th>TOTAL</th></tr>`; 
        d.slice(0,25).forEach((p,i)=>{h+=`<tr><td>${i+1}</td><td>${p.name}</td><td class="pts-hl">${vF(p)}</td></tr>`;}); 
        document.getElementById(id).innerHTML = h; 
    };
    
    rLb('allTimePts', [...sk].sort((a,b)=>b.pts-a.pts), p=>p.pts); rLb('allTimeGls', [...sk].sort((a,b)=>b.g-a.g), p=>p.g);
    rLb('allTimeAst', [...sk].sort((a,b)=>b.a-a.a), p=>p.a); rLb('allTimePpg', [...sk].sort((a,b)=>b.ppg-a.ppg), p=>p.ppg);
    rLb('allTimePim', [...sk].sort((a,b)=>b.pim-a.pim), p=>p.pim); rLb('allTimeWins', [...gl].sort((a,b)=>b.w-a.w), p=>p.w);
    
    document.getElementById('allTimeOverlay').style.display = 'flex';
}

function openLeagueSettings() { 
    let h = ''; 
    Object.keys(awardConfig).forEach(k => { h += `<div style="padding:5px;"><input type="checkbox" ${awardConfig[k]?'checked':''} onchange="awardConfig['${k}']=this.checked; saveGame();"> ${k.toUpperCase()}</div>`; }); 
    document.getElementById('leagueSettingsContent').innerHTML = h; document.getElementById('leagueSettingsOverlay').style.display = 'flex'; 
}

function openArenaSettings() { 
    let h = ''; 
    league.forEach((t, i) => { h += `<div style="margin-bottom:10px; display:flex; justify-content:space-between; font-size:8px;"><span>${t.name}</span><input type="range" min="80" max="132" value="${t.db}" oninput="league[${i}].db=parseInt(this.value); saveGame();" style="width:50%;"></div>`; }); 
    document.getElementById('arenaSettingsContent').innerHTML = h; document.getElementById('arenaSettingsOverlay').style.display = 'flex'; 
}

function resetLeague() { 
    if(confirm("Wipe dynasty data? History/HOF will remain.")) { localStorage.removeItem(SAVE_STORAGE_KEY); location.reload(); } 
} 

function clearArchives() { 
    if(confirm("Delete past History & HOF?")) { 
        leagueHistory = []; hallOfFame = []; retiredPlayers = []; 
        localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(HOF_STORAGE_KEY); localStorage.removeItem(RETIRED_STORAGE_KEY); 
        renderLeagueHistory(); renderHallOfFame(); renderRetiredPlayers(); 
    } 
}

function exportCSV() { 
    let csv = "Player,Team,Pos,Age,GP,G,A,PTS,W,SO,SV%,GAA,OVR,ASG_APP\n"; 
    Object.values(playerStats).forEach(p => { 
        const s = p.season; const svp = s.sa > 0 ? (s.sv/s.sa).toFixed(3) : "0.000"; const gaa = s.gp > 0 ? ((s.sa-s.sv)/s.gp).toFixed(2) : "0.00"; 
        const ovr = p.attr.ovr || (p.pos === 'G' ? p.attr.gDef : Math.round((p.attr.off + p.attr.def) / 2));
        csv += `${p.name},${p.team},${p.pos},${p.age},${s.gp},${s.g},${s.a},${s.g+s.a},${s.w},${s.so},${svp},${gaa},${ovr},${p.asgAppearances || 0}\n`; 
    }); 
    const b = new Blob([csv], {type: "text/csv"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); 
    a.href = u; a.download = "EASN_League_Stats.csv"; a.click(); 
}
// =========================================================
// --- MISSING UI HELPER FUNCTIONS ---
// =========================================================

function populateTeamSelect() {
    const sel = document.getElementById('teamViewSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- CHOOSE TEAM --</option>';
    league.forEach(t => {
        sel.innerHTML += `<option value="${t.nrm}">${t.name} (${getDynamicTeamOvr(t.nrm)} OVR)</option>`;
    });
}

function toggleStats() {
    statMode = statMode === 'season' ? 'playoff' : 'season';
    document.getElementById('btnStatMode').innerText = "VIEW: " + statMode.toUpperCase();
    updateUI(); renderTeamStats();
}

function toggleGameMenu() {
    document.getElementById('gameMenuList').classList.toggle('show');
}

function selectGame(idx) {
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[idx];
    if (!g || !g.a || !g.h) {
        activeIdx = null;
        document.getElementById('btnGameSelect').innerText = 'ARENA';
        return;
    }
    activeIdx = idx;
    document.getElementById('btnGameSelect').innerText = `${g.a.code} @ ${g.h.code}`;
    document.getElementById('aName').innerText = g.a.code;
    document.getElementById('hName').innerText = g.h.code;
    document.getElementById('jLogoA').src = g.a.logo;
    document.getElementById('jLogoH').src = g.h.logo;
    document.getElementById('aScoreLabel').innerText = g.result ? g.result.aG : '0';
    document.getElementById('hScoreLabel').innerText = g.result ? g.result.hG : '0';
    document.getElementById('jumboMessage').innerText = g.result ? "GAME FINAL." : "PUCK DROP PENDING...";
}

function togglePlayoffView(mode) {
    document.getElementById('standingsGrids').style.display = mode === 'standings' ? 'grid' : 'none';
    document.getElementById('bracketContainer').style.display = mode === 'bracket' ? 'block' : 'none';
    document.getElementById('tabStandings').className = mode === 'standings' ? 'mode-btn active' : 'mode-btn';
    document.getElementById('tabBracket').className = mode === 'bracket' ? 'mode-btn active' : 'mode-btn';
}

function initPlayoffsUI() {
    document.getElementById('standingsGrids').style.display = 'none';
    document.getElementById('bracketContainer').style.display = 'block';
    document.getElementById('playoffViewToggles').style.display = 'block';
    togglePlayoffView('bracket');
    const oc = document.getElementById('officeControls');
    const bSP = document.getElementById('btnStartPlayoffs'); if(bSP) bSP.remove();
    document.querySelectorAll('#officeControls button').forEach(b => {
        const a = b.getAttribute('onclick')||'';
        // Removed 'simDay()' so it stays visible during the Playoffs!
        if(['simWeek()','simMonth()','simSeason()','advanceCalendar()'].includes(a)) b.style.display = 'none';
    });
    if(!document.getElementById('btnSimRnd')) {
        const b1 = document.createElement('button'); b1.id='btnSimRnd'; b1.innerText='SIM ROUND'; b1.onclick=simRound; b1.style.borderColor='#00FFFF'; b1.style.color='#00FFFF'; oc.insertBefore(b1, oc.firstChild);
    }
    if(!document.getElementById('btnSimPlayoffs')) {
        const b2 = document.createElement('button'); b2.id='btnSimPlayoffs'; b2.innerText='SIM PLAYOFFS'; b2.onclick=simPlayoffs; b2.style.borderColor='#00FFFF'; b2.style.color='#00FFFF'; oc.insertBefore(b2, oc.firstChild);
    }
    showBracket();
}

function showBracket() {
    let h = '';
    playoffBracket.series.forEach(s => {
        let winH = s.hW === 4; let winA = s.aW === 4;
        h += `<div style="background:#111; border:2px solid ${winH||winA ? 'var(--ea-yellow)' : '#333'}; padding:10px; width:200px; text-align:center;">`;
        h += `<div style="font-size:8px; color:#aaa; margin-bottom:5px;">${s.conf || ''}</div>`;
        
        // HOME TEAM (Logo + 3-Letter Code)
        h += `<div style="display:flex; justify-content:space-between; align-items:center; color:${winH ? 'var(--ea-yellow)' : '#fff'};">
                <span style="display:flex; align-items:center; gap:5px;">${getTeamLogoHtml(s.h.name)} ${s.h.code}</span>
                <span style="font-size:14px; font-weight:bold;">${s.hW}</span>
              </div>`;
              
        // AWAY TEAM (Logo + 3-Letter Code)
        h += `<div style="display:flex; justify-content:space-between; align-items:center; color:${winA ? 'var(--ea-yellow)' : '#fff'}; margin-top:5px;">
                <span style="display:flex; align-items:center; gap:5px;">${getTeamLogoHtml(s.a.name)} ${s.a.code}</span>
                <span style="font-size:14px; font-weight:bold;">${s.aW}</span>
              </div>`;
              
        h += `</div>`;
    });
    document.getElementById('bracketContent').innerHTML = h;
    
    if(playoffBracket.series.some(s => s.hW === 4 || s.aW === 4) && !playoffBracket.series.some(s => s.hW < 4 && s.aW < 4)) {
        if(!document.getElementById('btnNextRound')) {
            const b = document.createElement('button'); b.id='btnNextRound'; b.innerText='ADVANCE ROUND'; b.onclick=handleRoundEnd; b.style.borderColor='#00FF00'; b.style.color='#00FF00'; document.getElementById('officeControls').insertBefore(b, document.getElementById('officeControls').firstChild);
        }
    }
}

function showPlayerCard(pName) {
    if(!playerStats[pName]) return;
    const p = playerStats[pName]; 
    const ovr = getLiveIceOvr(pName);
    const c = p.career;
    
    // 1. DYNAMIC DATA RETRIEVAL
    const weightedData = getPlayerWeightedStats(pName);
    const tag = weightedData.tag;
    const badge = getArchetypeBadge(pName);
    
    // 📊 FATIGUE & STREAK LOGIC
    const fatigue = getPlayerFatigueAmount(pName);
    const streak = p.macro_streak || p.micro_streak || 'STABLE';
    const streakEmoji = streak === 'HOT' ? '🔥' : (streak === 'COLD' ? '❄️' : '⚖️');
    const fatigueColor = fatigue >= 8 ? '#FF5555' : (fatigue > 0 ? '#FFAA00' : '#888');

    let h = `<div style="background:linear-gradient(to bottom, #1a1a1a, #000); padding:20px; border:2px solid var(--neon-cyan); position:relative;">`;
    
    // CORNER LOGO
    h += `<div style="position:absolute; top:10px; right:10px; font-size:10px; color:var(--ea-yellow); text-shadow:1px 1px 0 #000;">${p.teamCode}</div>`;
    
    h += `<div style="display:flex; align-items:center; gap:20px; border-bottom:2px solid #333; padding-bottom:15px; margin-bottom:15px;">`;
    
    // ICON BOX
    h += `<div style="width:80px; height:80px; background:#222; border:2px solid #444; display:flex; align-items:center; justify-content:center; font-size:32px;">${p.pos==='G'?'🥅':'🏒'}</div>`;
    
    // HEADER INFO
    h += `<div>`;
    h += `<div style="font-size:24px; color:#fff; font-family:'Press Start 2P', cursive; margin-bottom:5px;">${p.name.toUpperCase()}</div>`;
    
    // ARCHETYPE TAG
    h += `<div style="color:var(--ea-yellow); font-size:10px; margin-bottom:8px; font-weight:bold; letter-spacing:1px;">${tag} ${badge}</div>`;
    
    // 🚀 DYNAMIC STATUS INDICATORS
    h += `<div style="display:flex; gap:15px; margin-bottom:8px;">`;
    h += `<div style="font-size:9px; color:#fff; background:#222; padding:2px 6px; border:1px solid #444;">STREAK: <span style="color:${streak === 'HOT' ? 'var(--ea-yellow)' : (streak === 'COLD' ? '#55FFFF' : '#fff')}">${streakEmoji} ${streak}</span></div>`;
    h += `<div style="font-size:9px; color:#fff; background:#222; padding:2px 6px; border:1px solid #444;">FATIGUE: <span style="color:${fatigueColor}">-${fatigue} OVR</span></div>`;
    h += `</div>`;
    
    h += `<div style="color:#aaa; font-size:10px;">${p.pos} | AGE: ${p.age}</div>`;
    h += `<div style="color:var(--neon-cyan); font-size:14px; margin-top:5px;">LIVE OVR: ${ovr}</div>`;
    h += `</div></div>`;

    // --- REMAINDER OF THE CARD TABLES (ATTRIBUTES & CAREER) ---
    h += `<div class="grid-2"><div><div class="unit-header">ATTRIBUTES</div><table style="width:100%; font-size:8px; text-align:left;">`;
    if(p.pos === 'G') {
        h += `<tr><td style="color:#aaa;">GOALIE DEF:</td><td>${p.attr.gDef}</td></tr>`;
        h += `<tr><td style="color:#aaa;">AGILITY:</td><td>${p.attr.agil}</td></tr>`;
        h += `<tr><td style="color:#aaa;">SPEED:</td><td>${p.attr.speed}</td></tr>`;
    } else {
        h += `<tr><td style="color:#aaa;">OFFENSE:</td><td>${p.attr.off}</td><td style="color:#aaa;">DEFENSE:</td><td>${p.attr.def}</td></tr>`;
        h += `<tr><td style="color:#aaa;">SHOT PWR:</td><td>${p.attr.shotPwr}</td><td style="color:#aaa;">SHOT ACC:</td><td>${p.attr.shotAcc}</td></tr>`;
        h += `<tr><td style="color:#aaa;">PASSING:</td><td>${p.attr.pass}</td><td style="color:#aaa;">STICK:</td><td>${p.attr.stkHnd}</td></tr>`;
        h += `<tr><td style="color:#aaa;">SPEED:</td><td>${p.attr.speed}</td><td style="color:#aaa;">AGILITY:</td><td>${p.attr.agil}</td></tr>`;
        h += `<tr><td style="color:#aaa;">CHECKING:</td><td>${p.attr.check}</td><td style="color:#aaa;">ROUGH:</td><td>${p.attr.rough}</td></tr>`;
    }
    h += `</table></div><div><div class="unit-header">CAREER STATS</div><table style="width:100%; font-size:8px; text-align:center;">`;
    if(p.pos === 'G') {
        h += `<tr><th>GP</th><th>W</th><th>L</th><th>SO</th><th>SV%</th><th>GAA</th></tr>`;
        let cGP = c.gp+p.season.gp; let cW = c.w+p.season.w; let cL = (c.l||0)+(p.season.l||0); let cSO = c.so+p.season.so; let cSA = c.sa+p.season.sa; let cSV = c.sv+p.season.sv; let cGA = Math.max(0, cSA-cSV);
        h += `<tr><td>${cGP}</td><td>${cW}</td><td>${cL}</td><td>${cSO}</td><td>${cSA>0?(cSV/cSA).toFixed(3):'.000'}</td><td>${cGP>0?(cGA/cGP).toFixed(2):'0.00'}</td></tr>`;
    } else {
        h += `<tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th></tr>`;
        let cGP = c.gp+p.season.gp; let cG = c.g+p.season.g; let cA = c.a+p.season.a; let cPM = (c.pm||0)+(p.season.pm||0); let cPIM = (c.pim||0)+(p.season.pim||0);
        h += `<tr><td>${cGP}</td><td>${cG}</td><td>${cA}</td><td class="pts-hl">${cG+cA}</td><td>${cPM>0?'+'+cPM:cPM}</td><td>${cPIM}</td></tr>`;
    }
    h += `</table></div></div>`;
    if(p.trophies && p.trophies.length > 0) {
        h += `<div class="unit-header" style="margin-top:15px; color:var(--ea-yellow);">TROPHY CABINET</div><div style="font-size:8px; color:#fff; display:flex; flex-wrap:wrap; gap:10px;">`;
        p.trophies.forEach(t => { h += `<div style="background:#000; padding:5px; border:1px solid var(--ea-yellow);">🏆 ${t.year} ${t.name}</div>`; });
        h += `</div>`;
    }
    if(p.asgAppearances > 0) h += `<div style="margin-top:10px; font-size:8px; color:var(--neon-cyan);">⭐ ${p.asgAppearances}x All-Star</div>`;
    h += `</div>`;
    
    document.getElementById('playerCardContent').innerHTML = h;
    document.getElementById('playerCardOverlay').style.display = 'flex';
}

function runDraftLottery() {
    alert("Draft Lottery simulated! Rookies have been distributed.");
    const btnL = document.getElementById('btnLottery'); if (btnL) btnL.remove();
    if(!document.getElementById('btnStartPlayoffs')) {
        const b = document.createElement('button'); b.id = 'btnStartPlayoffs'; b.innerText = "START PLAYOFFS"; b.onclick = initPlayoffs; document.getElementById('officeControls').appendChild(b);
    }
}
function closeLottery() { document.getElementById('lotteryOverlay').style.display = 'none'; }
// --- WINDOW EVENTS ---
window.onclick = function(event) {
    const modals = ['lotteryOverlay', 'allTimeOverlay', 'awardOverlay', 'leagueSettingsOverlay', 'arenaSettingsOverlay', 'tradeOverlay', 'subOverlay', 'historyOverlay', 'playerCardOverlay', 'boxScoreOverlay', 'advEditorOverlay', 'gpChecklistOverlay', 'watchGameOverlay', 'stOverlay', 'proposalOverlay'];
    modals.forEach(id => { const modal = document.getElementById(id); if (event.target === modal && modal) modal.style.display = "none"; });
};

window.addEventListener('load', initStartScreen);
window.addEventListener('resize', () => {
    const container = document.getElementById('appContainer'); if (!container) return;
    if (window.innerWidth < 1200) { const scale = window.innerWidth / 1200; container.style.transform = `scale(${scale})`; container.style.marginBottom = `-${(1 - scale) * 100}%`; } 
    else { container.style.transform = 'none'; container.style.marginBottom = '0'; }
}); 
window.dispatchEvent(new Event('resize'));

function initStartScreen() {
    loadSheetUrlPreferences(); const btn = document.getElementById('btnContinue'); if (!btn) return;
    const raw = localStorage.getItem(SAVE_STORAGE_KEY); if (!raw) { btn.style.display = 'none'; return; }
    try {
        const parsed = JSON.parse(raw); const normalized = normalizeSavePackage(parsed);
        const valid = normalized !== null && isValidSaveData(normalized.payload);
        btn.style.display = valid ? 'inline-block' : 'none';
        if (!valid) { displaySaveStateInfo('Unsupported or corrupt save detected. It has been cleared.', 'error'); localStorage.removeItem(SAVE_STORAGE_KEY); }
    } catch (err) { btn.style.display = 'none'; displaySaveStateInfo('Save file is unreadable or corrupted.', 'error'); localStorage.removeItem(SAVE_STORAGE_KEY); }
    renderSaveSlotHistory(); updateSaveMetadataDisplay(getSelectedSaveSlot());
}