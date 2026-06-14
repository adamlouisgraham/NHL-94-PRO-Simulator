// =========================================================
// NHL '94 PRO SIMULATOR - DATA MODULE
// Global state, dictionaries, save/load, and data loading
// =========================================================

// --- 1. GLOBAL STATE VARIABLES ---
let awardConfig = { 
    streaks: true, chemistry: true, rivalries: true, 
    aging: false, draft: false, retirements: false, 
    headlines: true, milestones: true, injuries: true,
    legacy_schedule: true, trades: false
};

let league = []; 
let rosters = {}; 
let playerStats = {}; 
let tradeLog = []; 
let hallOfFame = []; 
let leagueHistory = []; 
let retiredPlayers = []; 
let calendar = []; 
let realDatesMap = [];
let gameMilestones = [];
let monthSnapshot = {}; 
let pendingTrades = [];
let playoffBracket = { round: 1, series: [] };

let currentDay = 0; 
let currentSeason = 1; 
let isPlayoffs = false; 
let isASG = false; 
let activeIdx = null; 
let statMode = 'season'; 
let isSimulating = false; 
let isSimSeason = false; 
let isTurboMode = false;
let currentCupChamp = "";
let activeSubInfo = null;
let customRosterData = null;
let customRosterSource = 'google';
let customTeamData = null;
let customPlayerData = null;
let customScheduleData = null;
let customEventLogData = null;
let eventLogData = null;

const SAVE_STORAGE_KEY = 'nhl94dynasty';
const HISTORY_STORAGE_KEY = 'nhl94history';
const HOF_STORAGE_KEY = 'nhl94hof';
const RETIRED_STORAGE_KEY = 'nhl94retired';
const SAVE_SLOT_KEYS = {
    AUTO: SAVE_STORAGE_KEY,
    SLOT_1: `${SAVE_STORAGE_KEY}_slot1`,
    SLOT_2: `${SAVE_STORAGE_KEY}_slot2`,
    SLOT_3: `${SAVE_STORAGE_KEY}_slot3`
};
const LEGACY_SAVE_VERSION = 1;
const CURRENT_SAVE_SCHEMA_VERSION = 2;
const SUPPORTED_SAVE_VERSIONS = [LEGACY_SAVE_VERSION, CURRENT_SAVE_SCHEMA_VERSION];
let saveGameTimer = null;

function getSaveSlotKey(slot = 'AUTO') {
    return SAVE_SLOT_KEYS[slot] || SAVE_STORAGE_KEY;
}

function getSelectedSaveSlot() {
    const select = document.getElementById('saveSlotSelect');
    return select ? select.value : 'AUTO';
}

function setSelectedSaveSlot(slot) {
    const select = document.getElementById('saveSlotSelect');
    if (!select) return;
    select.value = slot;
    renderSaveSlotHistory();
    updateSaveMetadataDisplay(slot);
    renderScheduleDashboard();
}

function getSelectedSaveSlotLabel() {
    const slot = getSelectedSaveSlot();
    return slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ');
}

function writeSavePayload(storageKey, slot = 'AUTO') {
    localStorage.setItem(storageKey, JSON.stringify(buildSavePayload()));
    updateSaveMetadataDisplay(slot);
    renderSaveSlotHistory();
}

function saveGame({slot = 'AUTO', force = false} = {}) {
    const storageKey = getSaveSlotKey(slot);
    if (saveGameTimer) {
        clearTimeout(saveGameTimer);
    }
    if (force) {
        writeSavePayload(storageKey, slot);
        return;
    }
    saveGameTimer = setTimeout(() => writeSavePayload(storageKey, slot), 220);
}

function saveSlot() {
    const slot = getSelectedSaveSlot();
    saveGame({slot, force: true});
    displaySaveStateInfo(`Saved to ${getSelectedSaveSlotLabel()}.`, 'success');
}

function loadSlot() {
    const slot = getSelectedSaveSlot();
    const raw = localStorage.getItem(getSaveSlotKey(slot));
    if (!raw) {
        return displaySaveStateInfo(`No save stored in ${getSelectedSaveSlotLabel()}.`, 'error');
    }

    try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSavePackage(parsed);
        if (!normalized || !isSupportedSaveVersion(normalized.meta.version)) {
            return displaySaveStateInfo(`Unsupported save version in ${getSelectedSaveSlotLabel()}.`, 'error');
        }
        if (!isValidSaveData(normalized.payload)) {
            return displaySaveStateInfo(`Invalid save data in ${getSelectedSaveSlotLabel()}.`, 'error');
        }
        applyLoadedSave(normalized.payload);
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('seasonYearDisplay').innerText = currentSeason;
        displaySaveStateInfo(`Loaded ${getSelectedSaveSlotLabel()}.`, 'success');
        updateUI();
        saveGame({force: true});
        renderSaveSlotHistory();
        updateSaveMetadataDisplay(slot);
    } catch (err) {
        displaySaveStateInfo(`Error loading ${getSelectedSaveSlotLabel()}: ${err.message}`, 'error');
    }
}

function clearSaveSlot() {
    const slot = getSelectedSaveSlot();
    localStorage.removeItem(getSaveSlotKey(slot));
    displaySaveStateInfo(`${getSelectedSaveSlotLabel()} cleared.`, 'success');
    renderSaveSlotHistory();
    updateSaveMetadataDisplay(slot);
}

function displaySaveStateInfo(message, type = 'info') {
    const el = document.getElementById('saveStateInfo');
    if (!el) return;
    el.innerText = message;
    el.className = `save-state-info ${type}`;
}

function buildSavePayload() {
    return {
        meta: {
            version: CURRENT_SAVE_SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            label: 'EASN Dynasty Save'
        },
        data: {
            league, rosters, playerStats, tradeLog, hallOfFame, leagueHistory,
            retiredPlayers, calendar, currentDay, currentSeason, isPlayoffs,
            isASG, currentCupChamp, playoffBracket, awardConfig, monthSnapshot,
            pendingTrades
        }
    };
}

function normalizeSavePackage(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.meta && raw.data) {
        if (!isSupportedSaveVersion(raw.meta.version)) return null;
        return { payload: raw.data, meta: raw.meta };
    }
    return {
        payload: raw,
        meta: {
            version: LEGACY_SAVE_VERSION,
            savedAt: null,
            label: 'Legacy EASN Save',
            migratedFromLegacy: true
        }
    };
}

function isSupportedSaveVersion(version) {
    return SUPPORTED_SAVE_VERSIONS.includes(Number(version));
}

function getSaveMeta(slot = 'AUTO') {
    try {
        const raw = localStorage.getItem(getSaveSlotKey(slot));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const normalized = normalizeSavePackage(parsed);
        return normalized ? normalized.meta : null;
    } catch {
        return null;
    }
}

function getAllSaveSlotHistory() {
    return Object.keys(SAVE_SLOT_KEYS).map(slot => {
        const meta = getSaveMeta(slot);
        return {
            slot,
            label: slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '),
            savedAt: meta ? meta.savedAt : null,
            version: meta ? meta.version : null,
            valid: Boolean(meta)
        };
    });
}

function selectHistorySaveSlot(slot) {
    setSelectedSaveSlot(slot);
    const meta = getSaveMeta(slot);
    if (!meta) {
        displaySaveStateInfo(`${slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ')} is empty.`, 'info');
        return;
    }
    const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ');
    const savedAt = formatSaveTimestamp(meta.savedAt);
    if (!confirm(`Load ${label} saved at ${savedAt}? This will replace current progress with saved slot data.`)) {
        return;
    }
    loadSlot();
}

function renderSaveSlotHistory() {
    const container = document.getElementById('saveSlotHistory');
    if (!container) return;
    const history = getAllSaveSlotHistory();
    container.innerHTML = history.map(item => {
        const timestamp = item.savedAt ? formatSaveTimestamp(item.savedAt) : 'empty';
        const version = item.version ? `v${item.version}` : '--';
        const activeClass = item.slot === getSelectedSaveSlot() ? ' save-slot-history-active' : '';
        return `<div class="save-slot-history-item${activeClass}" onclick="selectHistorySaveSlot('${item.slot}')"><span>${item.label}</span><span>${timestamp} • ${version}</span></div>`;
    }).join('');
}

function formatSaveTimestamp(value) {
    if (!value) return 'unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateSaveMetadataDisplay(slot = 'AUTO') {
    const el = document.getElementById('saveMetadata');
    if (!el) return;
    const meta = getSaveMeta(slot);
    const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ');
    if (!meta) {
        el.innerText = `SAVE: no backup yet (${label})`;
        return;
    }
    el.innerText = `SAVE ${label} v${meta.version} • ${formatSaveTimestamp(meta.savedAt)}`;
}

function refreshScheduleDashboardUI() {
    const dayEl = document.getElementById('dayDisplay');
    if (dayEl) {
        if (calendar.length === 0) {
            dayEl.innerText = 'DAY 0/0';
        } else {
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
    const statusText = totalDays === 0
        ? 'Schedule not loaded'
        : currentDay >= totalDays
            ? 'Season complete'
            : `${isAsgDay ? 'ALL-STAR DAY' : `Day ${currentDay + 1} / ${totalDays}`}`;

    summaryEl.innerHTML = `
        <span>${statusText}</span>
        <span>Completed: ${completedDays}</span>
        <span>Remaining: ${remainingDays}</span>
        <span>${currentDate}</span>
        <span>${versionLabel}</span>
    `;

    if (totalDays === 0 || currentDay >= totalDays) {
        upcomingEl.innerHTML = `<div class="schedule-game-line">No upcoming matchups.</div>`;
        return;
    }

    const upcomingLines = (calendar[currentDay] || []).slice(0, 3).map(g => {
        const home = g.h ? (g.h.code || g.h.name || 'HOME') : 'HOME';
        const away = g.a ? (g.a.code || g.a.name || 'AWAY') : 'AWAY';
        const when = realDatesMap && realDatesMap[currentDay] ? realDatesMap[currentDay] : `Day ${currentDay + 1}`;
        return `<div class="schedule-game-line"><span>${home} vs ${away}</span><span>${when}</span></div>`;
    }).join('');

    upcomingEl.innerHTML = `
        <div style="font-size:8px; color:var(--silver-mid); margin-bottom:6px;">Upcoming</div>
        ${upcomingLines || '<div class="schedule-game-line">No games scheduled.</div>'}
    `;
}

// --- 2. INDIVIDUAL LOGO FILE ENGINE ---
// Maps the team key to the exact file inside your "Team Logos" folder
const teamLogos = {
    'anaheim': 'Team Logos/Anaheim_Ducks_logo_2024.png',
    'boston': 'Team Logos/Bruins.png',
    'buffalo': 'Team Logos/sabres.png',
    'calgary': 'Team Logos/Calgary_Flames_logo.png',
    'chicago': 'Team Logos/blackhawks.png',
    'dallas': 'Team Logos/North_Stars.png',
    'minnesota': 'Team Logos/North_Stars.png',
    'detroit': 'Team Logos/Red_Wings.png',
    'edmonton': 'Team Logos/Oilers.png',
    'florida': 'Team Logos/Panthers.png',
    'hartford': 'Team Logos/whalers.png',
    'los angeles': 'Team Logos/kings.png',
    'montreal': 'Team Logos/Montreal_Canadiens.png',
    'new jersey': 'Team Logos/New_Jersey_Devils.png',
    'new york islanders': 'Team Logos/New_York_Islanders.png',
    'new york rangers': 'Team Logos/Rangers.png',
    'ottawa': 'Team Logos/Senators.png',
    'philadelphia': 'Team Logos/Flyers.png',
    'pittsburgh': 'Team Logos/Penguins.png',
    'quebec': 'Team Logos/Nordiques.png',
    'san jose': 'Team Logos/SanJoseSharksLogo.png',
    'st. louis': 'Team Logos/St._Louis_Blues_logo.png',
    'tampa bay': 'Team Logos/tampa_bay_lightning.png',
    'toronto': 'Team Logos/Toronto_Maple_Leafs_2016_logo.png',
    'vancouver': 'Team Logos/canucks.png',
    'washington': 'Team Logos/capitals.png',
    'winnipeg': 'Team Logos/jets.png',
    'wales': 'wales.jpg',
    'campbell': 'campbell.jpg'
};

// Helper function to generate the complete HTML for a team logo
// --- HELPER 1: Finds the exact file path from your dictionary ---
function getTeamLogoPath(teamName) {
    if (!teamName) return '';
    let key = teamName.toLowerCase();
    
    const shortNames = {
        'anaheim': 'anaheim', 'mighty ducks of anaheim': 'anaheim', 'mighty ducks': 'anaheim','anaheim ducks': 'anaheim',
        'boston': 'boston', 'boston bruins': 'boston',
        'buffalo sabres': 'buffalo', 'calgary flames': 'calgary',
        'chicago blackhawks': 'chicago', 'minnesota north stars': 'minnesota', 'minnesota': 'minnesota','minnesota stars': 'minnesota',
        'detroit red wings': 'detroit', 'edmonton oilers': 'edmonton',
        'florida panthers': 'florida', 'hartford whalers': 'hartford',
        'los angeles kings': 'los angeles', 'montreal canadiens': 'montreal',
        'new jersey devils': 'new jersey', 'new york islanders': 'new york islanders',
        'new york rangers': 'new york rangers', 'ottawa senators': 'ottawa',
        'philadelphia flyers': 'philadelphia', 'pittsburgh penguins': 'pittsburgh',
        'quebec nordiques': 'quebec', 'san jose sharks': 'san jose', 
        'st. louis blues': 'st. louis', 'tampa bay lightning': 'tampa bay', 
        'toronto maple leafs': 'toronto', 'vancouver canucks': 'vancouver',
        'washington capitals': 'washington', 'winnipeg jets': 'winnipeg',
        'wales conference': 'wales', 'campbell conference': 'campbell',
        'wal': 'wales', 'cam': 'campbell'
    };

    let mappedKey = shortNames[key] || key;
    return teamLogos[mappedKey] || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
}

// --- HELPER 2: Builds the HTML for the Standings & Menus ---
function getTeamLogoHtml(teamName) {
    if(!teamName) return '<div style="display:inline-block; width:32px; height:32px; margin:0 5px; flex-shrink:0;"></div>';
    
    const filename = getTeamLogoPath(teamName);
// UPDATES: Width changed to 36px to give wide logos more room.
// transform: scale(1.15) zooms in slightly to cut out native transparent padding in the PNG files.
    return `<img src="${filename}" style="width:36px; height:32px; object-fit:contain; border:none; box-shadow:none; padding:0; margin: 0 5px; vertical-align:middle; flex-shrink:0; transform: scale(1.15);">`;
}

// --- 2. DICTIONARIES & CONSTANTS ---
const teamMap = {
    "Mighty Ducks of Anaheim": "ANA", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF", 
    "Calgary Flames": "CGY", "Chicago Blackhawks": "CHI", "Minnesota North Stars": "MIN",
    "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", "Florida Panthers": "FLA", 
    "Hartford Whalers": "HFD", "Hartford Whalers": "HAR","Los Angeles Kings": "LAK", "Montreal Canadiens": "MTL", 
    "New Jersey Devils": "NJD", "New York Islanders": "NYI", "New York Rangers": "NYR", 
    "Ottawa Senators": "OTT", "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", 
    "Quebec Nordiques": "QUE", "San Jose Sharks": "SJS", "St. Louis Blues": "STL", 
    "Tampa Bay Lightning": "TBL", "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", 
    "Washington Capitals": "WSH", "Winnipeg Jets": "WPG"
};

const teamColors = { 
    'har': ['#00B140', '#00539B', '#A2AAAD'], // Green, Blue, Silver
    'hfd': ['#00B140', '#00539B', '#A2AAAD'], 
    'ana': ['#532a44', '#00685E', '#c4ced4'], // Plum, Jade, Deep Eggplant        
    'win': ['#00468B', '#CE1126', '#E0E8EE'], // Blue, Red, Ice White
    'wpg': ['#00468B', '#CE1126', '#E0E8EE'],                                                    
    'bos': ['#FFB81C', '#000000', '#8A630B'], // Gold, Black, Dark Gold
    'buf': ['#002654', '#FCB514', '#A2AAAD'], // Navy, Gold, Silver
    'cgy': ['#C8102E', '#F1BE48', '#590613'], // Red, Yellow, Deep Red
    'car': ['#CC0000', '#000000', '#A2AAAD'], 
    'chi': ['#CF0A2C', '#000000', '#D0CACA'], // Red, Black, Warm Gray
    'col': ['#6F263D', '#236192', '#A2AAAD'], // Burgundy, Blue, Silver
    'min': ['#009639', '#FFD100', '#00331D'], // Green, Gold, Forest Green
    'det': ['#CE1126', '#FFFFFF', '#A2AAAD'], // Red, White, Silver
    'edm': ['#FF4C00', '#041E42', '#C65C10'], // Orange, Navy, Copper
    'fla': ['#C8102E', '#041E42', '#B9975B'], // Red, Navy, Gold
    'la':  ['#111111', '#A2AAAD', '#555555'], // Black, Silver, Dark Silver
    'lak': ['#111111', '#A2AAAD', '#555555'], 
    'mon': ['#AF1E2D', '#192168', '#E0E8EE'], // Red, Blue, Ice White
    'mtl': ['#AF1E2D', '#192168', '#E0E8EE'], 
    'nj':  ['#CE1126', '#000000', '#889398'], // Red, Black, Cool Gray
    'njd': ['#CE1126', '#000000', '#889398'], 
    'nyi': ['#00539B', '#F47D30', '#002040'], // Blue, Orange, Deep Navy
    'nyr': ['#0038A8', '#CE1126', '#7FA9D6'], // Blue, Red, Light Blue
    'ott': ['#E31837', '#000000', '#B9975B'], // Red, Black, Gold
    'phi': ['#F74902', '#000000', '#F3E9D2'], // Orange, Black, Cream
    'pit': ['#000000', '#FCBA03', '#B08D00'], // Black, Gold, Dark Gold
    'que': ['#003E7E', '#FFFFFF', '#CE1126'], // Blue, White, Red
    'sa':  ['#006D75', '#000000', '#A2AAAD'], // Teal, Black, Silver
    'sjs': ['#006D75', '#000000', '#A2AAAD'], 
    'stl': ['#002F87', '#FCB514', '#041E42'], // Blue, Yellow, Navy
    'tb':  ['#002868', '#FFFFFF', '#A2AAAD'], // Blue, White, Silver
    'tbl': ['#002868', '#FFFFFF', '#A2AAAD'], 
    'tor': ['#00205B', '#FFFFFF', '#B0C4DE'], // Blue, White, Ice Blue (Perfect for Toronto)
    'van': ['#000000', '#F2A900', '#C8102E'], // Black, Gold, Red
    'was': ['#041E42', '#C8102E', '#0033A0'], // Navy, Red, Royal Blue
    'wsh': ['#041E42', '#C8102E', '#0033A0'], 
    'cbj': ['#002654', '#CE1126', '#A2AAAD'],
    'wales': ['#000000', '#FF6600', '#FFFFFF'], // All-Star Wales banner: black top, orange bottom
    'campbell': ['#FF6600', '#000000', '#FFFFFF']  // All-Star Campbell banner: orange top, black bottom
};

const rivals = { 
    'chi': ['det','stl','tor'], 'det': ['chi','tor','nyr'], 'mtl': ['tor','bos','que'], 
    'tor': ['mtl','det','chi'], 'nyr': ['nyi','njd','phi'], 'edm': ['cgy','van','win'], 
    'bos': ['mtl','nyr','har'], 'phi': ['njd','nyr','pit'], 'pit': ['phi','wsh','njd'], 
    'cgy': ['edm','van','win'], 'njd': ['nyr','phi','pit'] 
};

const DEFAULT_TEAM_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=732700653&single=true&output=csv";
const DEFAULT_PLAYER_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=1253001256&single=true&output=csv";
const DEFAULT_SCHEDULE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=184342160&single=true&output=csv";
const DEFAULT_EVENT_LOG_URL = "";
const SHEET_URL_STORAGE_KEY = "nhl94CustomSheetUrls";

let teamUrl = DEFAULT_TEAM_URL;
let playerUrl = DEFAULT_PLAYER_URL;
let scheduleUrl = DEFAULT_SCHEDULE_URL;
let eventLogUrl = DEFAULT_EVENT_LOG_URL;
let sheetSources = {
    TEAM: 'default sheet',
    PLAYER: 'default sheet',
    SCHEDULE: 'default sheet',
    EVENT_LOG: 'default sheet'
};

// Sample data for fallback when default sheets are unavailable
const SAMPLE_TEAM_DATA = [
    ["TEAM NAME", "TEAM CODE", "CONFERENCE", "DIVISION"],
    ["Boston Bruins", "BOS", "Eastern", "Adams"],
    ["New York Rangers", "NYR", "Eastern", "Patrick"],
    ["Montreal Canadiens", "MTL", "Eastern", "Adams"],
    ["Toronto Maple Leafs", "TOR", "Eastern", "Norris"],
    ["Detroit Red Wings", "DET", "Western", "Norris"],
    ["Chicago Blackhawks", "CHI", "Western", "Norris"],
    ["Vancouver Canucks", "VAN", "Western", "Smythe"],
    ["Calgary Flames", "CGY", "Western", "Smythe"],
    ["Edmonton Oilers", "EDM", "Western", "Smythe"],
    ["Los Angeles Kings", "LAK", "Western", "Smythe"],
    ["San Jose Sharks", "SJS", "Western", "Norris"]
];

const SAMPLE_PLAYER_DATA = [
    ["FIRST NAME", "LAST NAME", "TEAM CODE", "POS", "OFFENSE", "DEFENSE", "G DEF", "SHOT POWER", "PASS", "AGGRESSION", "ROUGHNESS", "ENDURANCE", "CHECKING", "SHOT ACC", "STICK", "AGILITY", "SPEED", "OVERALL", "ASG"],
    ["Ray", "Bourque", "BOS", "D", 85, 95, 50, "A", "A", "B", "B", "A", "A", "A", "A", "B", "B", 90, 12],
    ["Mark", "Messier", "NYR", "F", 90, 85, 50, "A", "A", "A", "A", "A", "A", "A", "A", "A", "A", 92, 15],
    ["Mario", "Lemieux", "MTL", "F", 95, 80, 50, "A+", "A+", "B", "B", "B", "B", "A+", "A", "A", "A", 95, 10],
    ["Wayne", "Gretzky", "TOR", "F", 98, 75, 50, "A+", "A+", "C", "C", "B", "C", "A+", "A+", "A+", "A+", 98, 18],
    ["Steve", "Yzerman", "DET", "F", 88, 82, 50, "A", "A", "B", "B", "A", "B", "A", "A", "A", "A", 88, 10],
    ["Sergei", "Fedorov", "DET", "F", 87, 80, 50, "A", "A", "B", "B", "A", "B", "A", "A", "A", "A", 87, 8],
    ["Paul", "Coffey", "DET", "D", 82, 92, 50, "A", "A", "B", "B", "A", "A", "A", "A", "A", "A", 88, 4],
    ["Chris", "Chelios", "CHI", "D", 78, 90, 50, "B+", "A", "A", "A", "A", "A", "B+", "A", "B+", "B+", 85, 11],
    ["Jeremy", "Roenick", "CHI", "F", 85, 75, 50, "A", "A", "C", "C", "B", "C", "A", "A", "A", "A", 82, 0],
    ["Pavel", "Bure", "VAN", "F", 90, 70, 50, "A+", "B+", "C", "C", "B", "C", "A+", "B+", "A+", "A+", 88, 5],
    ["Alexander", "Mogilny", "VAN", "F", 88, 72, 50, "A", "A", "C", "C", "B", "C", "A", "A", "A", "A", 85, 0],
    ["Theo", "Fleury", "CGY", "F", 82, 75, 50, "A", "A", "B", "B", "A", "B", "A", "A", "A", "A", 82, 0],
    ["Jaromir", "Jagr", "EDM", "F", 85, 78, 50, "A", "A", "C", "C", "B", "C", "A", "A", "A", "A", 84, 0],
    ["Luc", "Robitaille", "LAK", "F", 83, 76, 50, "A", "A", "C", "C", "B", "C", "A", "A", "A", "A", 81, 0],
    ["Pat", "Falloon", "SJS", "F", 75, 75, 50, "B+", "B+", "C", "C", "B", "C", "B+", "B+", "B+", "B+", 75, 0]
];

const SAMPLE_SCHEDULE_DATA = [
    ["DATE / GAME DATE / MATCH DATE", "HOME / HOST", "AWAY / VISITOR / GUEST"],
    ["1993-10-05", "BOS", "NYR"],
    ["1993-10-06", "MTL", "TOR"],
    ["1993-10-07", "DET", "CHI"],
    ["1993-10-08", "VAN", "CGY"],
    ["1993-10-09", "EDM", "LAK"],
    ["1993-10-10", "SJS", "BOS"],
    ["1993-10-11", "NYR", "MTL"],
    ["1993-10-12", "TOR", "DET"],
    ["1993-10-13", "CHI", "VAN"],
    ["1993-10-14", "CGY", "EDM"],
    ["1993-10-15", "LAK", "SJS"]
];

const SAMPLE_EVENT_LOG_DATA = [
    ["GAME_ID", "TYPE", "PERIOD", "TIME", "TEAM", "PLAYER", "ASSIST_1", "ASSIST_2", "DETAIL"]
];

function saveSheetUrlPreferences(teamValue, playerValue, scheduleValue, eventLogValue) {
    const prefs = {
        teamSheetUrl: teamValue || "",
        playerSheetUrl: playerValue || "",
        scheduleSheetUrl: scheduleValue || "",
        eventLogSheetUrl: eventLogValue || ""
    };
    try {
        localStorage.setItem(SHEET_URL_STORAGE_KEY, JSON.stringify(prefs));
    } catch (err) {
        console.error('Failed to save sheet URL preferences:', err);
    }
}

function hasSavedSheetUrlPreferences() {
    const raw = localStorage.getItem(SHEET_URL_STORAGE_KEY);
    if (!raw) return false;

    try {
        const prefs = JSON.parse(raw);
        return Boolean(prefs.teamSheetUrl || prefs.playerSheetUrl || prefs.scheduleSheetUrl || prefs.eventLogSheetUrl);
    } catch {
        return false;
    }
}

function setSheetSourceBadge(visible, text = 'Saved sheet settings loaded') {
    const badge = document.getElementById('sheetUrlBadge');
    if (!badge) return;
    badge.innerText = text;
    badge.style.display = visible ? 'inline-block' : 'none';
}

function resetSheetSourcesToDefault() {
    sheetSources = {
        TEAM: 'default sheet',
        PLAYER: 'default sheet',
        SCHEDULE: 'default sheet',
        EVENT_LOG: 'default sheet'
    };
}

function getSheetSourceLabel(sheetName) {
    return sheetSources[sheetName] || 'default sheet';
}

function loadSheetUrlPreferences() {
    const raw = localStorage.getItem(SHEET_URL_STORAGE_KEY);
    if (!raw) return;

    try {
        const prefs = JSON.parse(raw);
        const teamInput = document.getElementById('teamSheetUrl');
        const playerInput = document.getElementById('playerSheetUrl');
        const scheduleInput = document.getElementById('scheduleSheetUrl');
        const eventLogInput = document.getElementById('eventLogSheetUrl');
        if (teamInput) teamInput.value = prefs.teamSheetUrl || '';
        if (playerInput) playerInput.value = prefs.playerSheetUrl || '';
        if (scheduleInput) scheduleInput.value = prefs.scheduleSheetUrl || '';
        if (eventLogInput) eventLogInput.value = prefs.eventLogSheetUrl || '';

        if (hasSavedSheetUrlPreferences()) {
            applyCustomSheetUrls(false);
            const sheetMessage = document.getElementById('sheetUrlMessage');
            if (sheetMessage) sheetMessage.innerText = 'Loaded saved sheet URLs.';
            setSheetSourceBadge(true, 'Saved sheet settings loaded');
        }
    } catch (err) {
        console.error('Failed to load saved sheet URLs:', err);
    }
}

function setSheetStatusLine(sheetName, text, status, source) {
    const mapping = {
        TEAM: 'teamSheetStatus',
        PLAYER: 'playerSheetStatus',
        SCHEDULE: 'scheduleSheetStatus',
        EVENT_LOG: 'eventLogSheetStatus'
    };
    const el = document.getElementById(mapping[sheetName]);
    if (!el) return;
    const sourceText = source ? ` (${source})` : '';
    el.innerText = `${sheetName}: ${text}${sourceText}`;
    el.classList.toggle('ok', status === 'ok');
    el.classList.toggle('error', status === 'error');
}

function clearLocalSheetFileState() {
    customTeamData = null;
    customPlayerData = null;
    customScheduleData = null;
    customEventLogData = null;
    const ids = ['teamSheetFile', 'playerSheetFile', 'scheduleSheetFile', 'eventLogSheetFile'];
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    setSheetFileLabel('team', 'No TEAM file selected');
    setSheetFileLabel('player', 'No PLAYER file selected');
    setSheetFileLabel('schedule', 'No SCHEDULE file selected');
    setSheetFileLabel('eventLog', 'No EVENT LOG file selected');
}

function formatSheetStatus(statuses) {
    return statuses.map(s => `${s.name}: ${s.ok ? 'OK' : `ERROR${s.error ? ` - ${s.error}` : ''}`}`).join(' | ');
}

function rowHasAnyHeader(headerRow, candidates) {
    return candidates.some(candidate => headerRow.some(column => column.includes(candidate)));
}

function validateSheetHeaders(sheetName, headerRow) {
    const headers = headerRow.map(h => String(h || '').trim().toUpperCase());
    if (!headers.length) return 'Header row is missing or invalid.';

    const expectations = {
        TEAM: [
            ['TEAM NAME', 'FRANCHISE', 'TEAM'],
            ['TEAM CODE', 'CODE', 'ABBR']
        ],
        PLAYER: [
            ['FIRST NAME', 'FIRST', 'GIVEN NAME'],
            ['LAST NAME', 'LAST', 'SURNAME'],
            ['TEAM CODE', 'TEAM', 'CODE']
        ],
        SCHEDULE: [
            ['DATE', 'GAME DATE', 'MATCH DATE'],
            ['HOME', 'HOST'],
            ['AWAY', 'VISITOR', 'GUEST']
        ],
        EVENT_LOG: [
            ['GAME_ID', 'GAME ID', 'ID'],
            ['TYPE', 'EVENT TYPE'],
            ['PERIOD', 'PER'],
            ['TIME', 'TIME STAMP', 'TIMESTAMP'],
            ['TEAM', 'TEAM CODE', 'TEAM NAME'],
            ['PLAYER', 'PLAYER NAME'],
            ['DETAIL', 'DETAILS', 'EVENT DETAIL']
        ]
    };

    const requiredSets = expectations[sheetName];
    if (!requiredSets) return null;

    for (const set of requiredSets) {
        if (!rowHasAnyHeader(headers, set)) {
            return `Missing one of: ${set.join(' / ')}.`;  
        }
    }
    return null;
}

function getHeaderIndex(headerRow, keywords, fallbackIdx = -1) {
    const normalized = headerRow.map(h => String(h || '').trim().toUpperCase());
    const idx = normalized.findIndex(h => keywords.some(k => h.includes(k)));
    if (idx !== -1) return idx;
    return (fallbackIdx >= 0 && fallbackIdx < normalized.length) ? fallbackIdx : -1;
}

function validateScheduleData(rows) {
    if (!Array.isArray(rows) || rows.length < 2) {
        return { ok: false, error: 'Schedule must contain a header row and at least one game row.' };
    }

    const headerRow = rows[0] || [];
    const dateIdx = getHeaderIndex(headerRow, ['DATE', 'GAME DATE', 'MATCH DATE'], 0);
    const homeIdx = getHeaderIndex(headerRow, ['HOME', 'HOST'], 3);
    const awayIdx = getHeaderIndex(headerRow, ['AWAY', 'VISITOR', 'GUEST'], 2);

    if (dateIdx === -1 || homeIdx === -1 || awayIdx === -1) {
        return { ok: false, error: 'Schedule sheet needs DATE, HOME, and AWAY columns.' };
    }

    let valid = 0;
    const invalidRows = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;
        const gameDate = String(row[dateIdx] || '').trim();
        const homeName = String(row[homeIdx] || '').trim();
        const awayName = String(row[awayIdx] || '').trim();
        if (!gameDate || !homeName || !awayName) {
            invalidRows.push(i + 1);
            continue;
        }
        valid++;
    }

    if (valid === 0) {
        return { ok: false, error: `Schedule loaded but no valid game rows found. Check rows ${invalidRows.slice(0, 5).join(', ')}.` };
    }

    return { ok: true, warning: invalidRows.length ? `Some rows were skipped: ${invalidRows.slice(0, 5).join(', ')}.` : '' };
}

// --- 3. UTILITY HELPERS ---
const $ = (id) => document.getElementById(id);
const getGradeMod = (grade) => {
    const map = { 'A+': 1.65, 'A': 1.40, 'A-': 1.25, 'B+': 1.15, 'B': 1.00, 'B-': 0.95, 'C+': 0.90, 'C': 0.80, 'C-': 0.70, 'D': 0.50, 'F': 0.15 };
    return map[grade] || 0.80;
};

// --- 4. DATA FETCHING (GOOGLE SHEETS) ---
async function fetchCSV(url) {
    const response = await fetch(url + "&t=" + new Date().getTime());
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Google sheet returned empty CSV. Check the sheet URL and publishing settings.");
    if (trimmed.toLowerCase().startsWith("<!doctype html") || trimmed.includes("<html")) {
        throw new Error("Google returned HTML instead of CSV. Check sheet publishing settings.");
    }
    return text;
}

function parseCSV(text) {
    return new Promise((resolve, reject) => {
        Papa.parse(text, { header: false, skipEmptyLines: true, complete: (results) => resolve(results.data), error: (err) => reject(err) });
    });
}

const DIRECT_FIELD_MAP = {
    'PLAYER NAME': 'NAME', 'FULL NAME': 'NAME', 'PLAYER': 'NAME', 'P_NAME': 'NAME',
    'FIRST NAME': 'FIRST NAME', 'FIRST': 'FIRST NAME', 'GIVEN NAME': 'FIRST NAME', 'GIVEN': 'FIRST NAME',
    'LAST NAME': 'LAST NAME', 'LAST': 'LAST NAME', 'SURNAME': 'LAST NAME', 'FAMILY': 'LAST NAME',
    'TEAM CODE': 'TEAM CODE', 'CODE': 'TEAM CODE', 'TEAM': 'TEAM CODE', 'TEAM_ID': 'TEAM CODE', 'CLUB': 'TEAM CODE',
    'POS': 'POS', 'POSITION': 'POS', 'ROLE': 'POS',
    'OFFENSE': 'OFFENSE', 'OFF': 'OFFENSE', 'O': 'OFFENSE', 'SKATEROFF': 'OFFENSE', 'OFFVAL': 'OFFENSE', 'ATTACK': 'OFFENSE',
    'DEFENSE': 'DEFENSE', 'DEF': 'DEFENSE', 'D': 'DEFENSE', 'SKATERDEF': 'DEFENSE', 'DEFVAL': 'DEFENSE', 'DEFEND': 'DEFENSE',
    'G DEF': 'G DEF', 'GOALIE DEF': 'G DEF', 'GOALIEDEF': 'G DEF', 'GKDEF': 'G DEF', 'GDEF': 'G DEF', 'GOALIED': 'G DEF',
    'OVERALL': 'OVERALL', 'OVR': 'OVERALL', 'RATING': 'OVERALL',
    'SHOT POWER': 'SHOT POWER', 'PWR': 'SHOT POWER', 'SHOTPOWER': 'SHOT POWER',
    'PASS': 'PASS', 'PASSES': 'PASS',
    'AGGRESSION': 'AGGRESSION', 'AGR': 'AGGRESSION', 'AGG': 'AGGRESSION',
    'ROUGHNESS': 'ROUGHNESS', 'RGH': 'ROUGHNESS', 'ROUGH': 'ROUGHNESS',
    'ENDURANCE': 'ENDURANCE', 'END': 'ENDURANCE',
    'CHECKING': 'CHECKING', 'CHK': 'CHECKING', 'CHECK': 'CHECKING',
    'SHOT ACC': 'SHOT ACC', 'ACC': 'SHOT ACC', 'ACCURACY': 'SHOT ACC',
    'STICK': 'STICK', 'STK': 'STICK', 'STICKHANDLING': 'STICK', 'STICK HND': 'STICK', 'STKHND': 'STICK',
    'AGILITY': 'AGILITY', 'AGL': 'AGILITY', 'AGIL': 'AGILITY',
    'SPEED': 'SPEED', 'SPD': 'SPEED',
    'AGE': 'AGE',
    'ASG': 'ASG', 'ALL STAR': 'ASG', 'APPEARANCES': 'ASG', 'APP': 'ASG'
};

function normalizeRecordKeys(record) {
    if (!record || typeof record !== 'object') return {};
    const normalized = {};
    Object.entries(record).forEach(([key, value]) => {
        if (key == null) return;
        const cleaned = String(key).trim().toUpperCase();
        const canonical = DIRECT_FIELD_MAP[cleaned] || cleaned;
        normalized[canonical] = value;
    });
    return normalized;
}

function findFieldValue(record, aliases) {
    if (!record || typeof record !== 'object') return '';
    const upperAliases = aliases.map(a => String(a).trim().toUpperCase());
    for (const key of Object.keys(record)) {
        const normalizedKey = String(key).trim().toUpperCase();
        if (upperAliases.some(alias => normalizedKey.includes(alias))) {
            return record[key] != null ? String(record[key]).trim() : '';
        }
    }
    return '';
}

function mapCustomRosterRecord(record) {
    const normalized = normalizeRecordKeys(record);

    const firstName = findFieldValue(normalized, ['FIRST NAME', 'FIRST', 'GIVEN NAME', 'GIVEN']);
    let lastName = findFieldValue(normalized, ['LAST NAME', 'LAST', 'SURNAME', 'FAMILY']);
    const fullName = findFieldValue(normalized, ['NAME', 'PLAYER NAME', 'PLAYER', 'FULL NAME']);
    if (!firstName && !lastName && fullName) {
        lastName = fullName;
    }
    const playerName = fullName || (firstName && lastName ? `${firstName} ${lastName}` : (lastName || firstName || 'Unknown'));

    const teamCode = findFieldValue(normalized, ['TEAM CODE', 'CODE', 'TEAM', 'TEAM_ID', 'CLUB']);
    const posValue = findFieldValue(normalized, ['POS', 'POSITION', 'ROLE']).toUpperCase();
    const pos = (posValue === 'D' || posValue === 'LD' || posValue === 'RD' || posValue.startsWith('DEF')) ? 'D' : (posValue === 'G' || posValue.includes('GOAL')) ? 'G' : 'F';

    const off = findFieldValue(normalized, ['OFFENSE', 'OFF', 'O', 'SKATEROFF', 'OFFVAL', 'ATTACK']);
    const def = findFieldValue(normalized, ['DEFENSE', 'DEF', 'D', 'SKATERDEF', 'DEFVAL', 'DEFENSE', 'DEFEND']);
    const gDef = findFieldValue(normalized, ['G DEF', 'GOALIE DEF', 'GOALIEDEF', 'GKDEF', 'GDEF', 'GOALIED']);
    const overall = findFieldValue(normalized, ['OVERALL', 'OVR', 'RATING']);

    return {
        'TEAM CODE': teamCode,
        'LAST NAME': lastName,
        'FIRST NAME': firstName,
        'NAME': playerName,
        'POS': pos,
        'OFFENSE': off || overall || '',
        'DEFENSE': def || overall || '',
        'G DEF': gDef || overall || '',
        'SHOT POWER': findFieldValue(normalized, ['SHOT POWER', 'PWR', 'SHOTPOWER']),
        'PASS': findFieldValue(normalized, ['PASS', 'PASSES']),
        'AGGRESSION': findFieldValue(normalized, ['AGGRESSION', 'AGR', 'AGG']),
        'ROUGHNESS': findFieldValue(normalized, ['ROUGHNESS', 'RGH', 'ROUGH']),
        'ENDURANCE': findFieldValue(normalized, ['ENDURANCE', 'END']),
        'CHECKING': findFieldValue(normalized, ['CHECKING', 'CHK', 'CHECK']),
        'SHOT ACC': findFieldValue(normalized, ['SHOT ACC', 'ACC', 'ACCURACY']),
        'STICK': findFieldValue(normalized, ['STICK', 'STK', 'STICKHANDLING', 'STICK HND', 'STKHND']),
        'AGILITY': findFieldValue(normalized, ['AGILITY', 'AGL', 'AGIL']),
        'SPEED': findFieldValue(normalized, ['SPEED', 'SPD']),
        'OVERALL': overall,
        'AGE': findFieldValue(normalized, ['AGE']),
        'ASG': findFieldValue(normalized, ['ASG', 'ALL STAR', 'APPEARANCES', 'APP'])
    };
}

function normalizeCustomRosterData(data) {
    return data.map(record => mapCustomRosterRecord(record));
}

function loadCustomRoster(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            if (!text) throw new Error('File is empty.');

            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.json')) {
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) throw new Error('JSON roster must be an array of objects.');
                customRosterData = normalizeCustomRosterData(parsed);
            } else if (fileName.endsWith('.csv')) {
                const rows = await parseCSV(text);
                if (!rows || rows.length < 2) throw new Error('CSV roster must include a header row and at least one data row.');
                const headers = rows[0].map(h => String(h || '').trim());
                const loaded = rows.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, idx) => {
                        obj[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
                    });
                    return obj;
                });
                customRosterData = normalizeCustomRosterData(loaded);
            } else {
                throw new Error('Unsupported file type. Please upload CSV or JSON.');
            }

            if (!customRosterData || !customRosterData.length) throw new Error('No roster entries were loaded.');
            customRosterSource = 'custom';
            alert(`Loaded ${customRosterData.length} roster entries. Starting a custom roster game.`);
            await startNewGame(true);
        } catch (err) {
            console.error('Custom roster load failed:', err);
            alert('Failed to load custom roster: ' + err.message);
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsText(file);
}

async function loadScheduleFromCSV(customRows = null) {
    try {
        const rows = customRows ? customRows : await (async () => {
            try {
                const text = await fetchCSV(scheduleUrl);
                return await parseCSV(text);
            } catch (err) {
                if (scheduleUrl === DEFAULT_SCHEDULE_URL) {
                    console.log('Using sample schedule data as fallback.');
                    return SAMPLE_SCHEDULE_DATA;
                } else {
                    throw err;
                }
            }
        })();

        const headerRow = rows[0] || [];
        const dateIdx = getHeaderIndex(headerRow, ['DATE', 'GAME DATE', 'MATCH DATE'], 0);
        const homeIdx = getHeaderIndex(headerRow, ['HOME', 'HOST'], 3);
        const awayIdx = getHeaderIndex(headerRow, ['AWAY', 'VISITOR', 'GUEST'], 2);

        if (dateIdx === -1 || homeIdx === -1 || awayIdx === -1) {
            throw new Error('Schedule CSV must include DATE, HOME, and AWAY columns.');
        }

        const findTeam = (csvName) => {
            if (!csvName) return null;
            const cleanName = String(csvName).trim();
            const nrmName = cleanName.toLowerCase().replace(/\s+/g, '');

            let t = league.find(x => x.nrm === nrmName);
            if (t) return t;

            const historicalMap = {
                'quebec': 'QUE', 'nordiques': 'QUE', 'quebecnordiques': 'QUE',
                'minnesota': 'MIN', 'northstars': 'MIN', 'minnesotanorthstars': 'MIN',
                'winnipeg': 'WPG', 'jets': 'WPG', 'winnipegjets': 'WPG',
                'hartford': 'HAR', 'whalers': 'HAR', 'hartfordwhalers': 'HAR',
                'anaheim': 'ANA', 'mightyducksofanaheim': 'ANA', 'mightyducks': 'ANA', 'anaheimducks': 'ANA'
            };
            const historicalCode = historicalMap[nrmName];
            if (historicalCode) {
                t = league.find(x => x.code === historicalCode);
                if (t) return t;
            }

            const mappedCode = teamMap[cleanName];
            if (mappedCode) {
                t = league.find(x => x.code === mappedCode);
                if (t) return t;
            }

            t = league.find(x => x.code === cleanName.toUpperCase());
            if (t) return t;

            return league.find(x => x.name.toLowerCase().includes(cleanName.toLowerCase()));
        };

        let tempDayMap = {};
        const invalidRows = [];
        let validRows = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row.length) continue;

            const gameDate = String(row[dateIdx] || '').trim();
            const visitorName = String(row[awayIdx] || '').trim();
            const homeName = String(row[homeIdx] || '').trim();

            if (!gameDate || !visitorName || !homeName) {
                invalidRows.push(i + 1);
                continue;
            }

            const awayTeam = findTeam(visitorName);
            const homeTeam = findTeam(homeName);
            if (!awayTeam || !homeTeam) {
                invalidRows.push(i + 1);
                continue;
            }

            validRows++;
            if (!tempDayMap[gameDate]) tempDayMap[gameDate] = [];
            tempDayMap[gameDate].push({ h: homeTeam, a: awayTeam, result: null });
        }

        if (validRows === 0) {
            console.warn('Schedule loaded but no valid games were matched. Falling back to auto-generated schedule.');
            buildCalendar();
            return;
        }

        if (invalidRows.length) {
            console.warn(`Schedule loaded with ${invalidRows.length} invalid rows skipped: ${invalidRows.slice(0, 10).join(', ')}.`);        }

        const sortedDates = Object.keys(tempDayMap).sort((a, b) => {
            const aTime = Date.parse(a);
            const bTime = Date.parse(b);
            if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
            return a.localeCompare(b);
        });

        calendar = sortedDates.map(date => tempDayMap[date]);
        realDatesMap = sortedDates;

        if (calendar.length === 0) {
            console.warn('CSV loaded but no schedule days were created. Falling back to Auto-Generator.');
            buildCalendar();
        } else {
            console.log(`Schedule Loaded: ${calendar.length} days of hockey processed.`);
        }

        if (document.getElementById('scheduleDayDisplay')) {
            document.getElementById('scheduleDayDisplay').innerText = realDatesMap[0] || 'DAY 1';
        }

    } catch (error) {
        console.error('Failed to load historical schedule:', error);
        buildCalendar(); // Generator Fallback if Google Sheets fails
    }
}

async function loadEventLogFromCSV(customRows = null) {
    const rows = customRows ? customRows : await (async () => {
        if (customEventLogData) return customEventLogData;
        if (!eventLogUrl) throw new Error('No event log sheet URL or local CSV provided.');
        const text = await fetchCSV(eventLogUrl);
        return await parseCSV(text);
    })();

    if (!Array.isArray(rows) || rows.length < 2) {
        throw new Error('Event log sheet must contain a header row and at least one event row.');
    }

    const headerRow = rows[0] || [];
    const validationError = validateSheetHeaders('EVENT_LOG', headerRow);
    if (validationError) {
        throw new Error(validationError);
    }

    const idIdx = getHeaderIndex(headerRow, ['GAME_ID', 'GAME ID', 'ID'], 0);
    const typeIdx = getHeaderIndex(headerRow, ['TYPE', 'EVENT TYPE'], 1);
    const periodIdx = getHeaderIndex(headerRow, ['PERIOD', 'PER'], 2);
    const timeIdx = getHeaderIndex(headerRow, ['TIME', 'TIME STAMP', 'TIMESTAMP'], 3);
    const teamIdx = getHeaderIndex(headerRow, ['TEAM', 'TEAM CODE', 'TEAM NAME'], 4);
    const playerIdx = getHeaderIndex(headerRow, ['PLAYER', 'PLAYER NAME'], 5);
    const assist1Idx = getHeaderIndex(headerRow, ['ASSIST_1', 'ASSIST1', 'ASSIST 1'], 6, -1);
    const assist2Idx = getHeaderIndex(headerRow, ['ASSIST_2', 'ASSIST2', 'ASSIST 2'], 7, -1);
    const detailIdx = getHeaderIndex(headerRow, ['DETAIL', 'DETAILS', 'EVENT DETAIL'], 8, -1);

    const events = [];
    const invalidRows = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;

        const gameId = String(row[idIdx] || '').trim();
        const type = String(row[typeIdx] || '').trim();
        const period = String(row[periodIdx] || '').trim();
        const time = String(row[timeIdx] || '').trim();
        const team = String(row[teamIdx] || '').trim();
        const player = String(row[playerIdx] || '').trim();
        if (!gameId || !type || !period || !time || !team || !player) {
            invalidRows.push(i + 1);
            continue;
        }

        const assist1 = assist1Idx >= 0 ? String(row[assist1Idx] || '').trim() : '';
        const assist2 = assist2Idx >= 0 ? String(row[assist2Idx] || '').trim() : '';
        const detail = detailIdx >= 0 ? String(row[detailIdx] || '').trim() : '';

        events.push({ gameId, type, period, time, team, player, assist1, assist2, detail });
    }

    if (events.length === 0) {
        throw new Error(`Event log loaded but no valid rows found. Check rows ${invalidRows.slice(0, 5).join(', ')}.`);
    }

    eventLogData = events;
    return { ok: true, rowCount: events.length, skippedRows: invalidRows.length, invalidRows };
}