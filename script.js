// =========================================================
// NHL '94 PRO SIMULATOR - MASTER JAVASCRIPT ENGINE
// =========================================================
// =========================================================
// 1. CORE UTILITIES (Must be defined first)
// =========================================================

    // =========================================================
    //  ARCHETYPE BEHAVIOR MULTIPLIERS (Complete Master List)
    // =========================================================
    const archMods = {
    // --- FORWARDS (Balanced for higher goal/assist totals) ---
    "SUPERSTAR":      { shotRate: 1.38, penaltyRate: 0.70,  assistRate: 1.38 }, // Elite well-rounded dominance — should push top players toward 100+ point seasons
    "SNIPER":         { shotRate: 1.40, penaltyRate: 0.85,  assistRate: 0.95 }, // Higher shotRate, lower assistRate to specialize them
    "PLAYMAKER":      { shotRate: 0.89, penaltyRate: 0.80,  assistRate: 1.55 }, // Lower shotRate, significantly higher assistRate
    "SPEEDSTER":      { shotRate: 1.19, penaltyRate: 0.80,  assistRate: 1.15 },
    "DANGLER":        { shotRate: 1.14, penaltyRate: 0.80,  assistRate: 1.30 },
    "POWER FORWARD":  { shotRate: 1.20, penaltyRate: 1.20,  assistRate: 0.97 },
    "TWO-WAY STAR F": { shotRate: 1.12, penaltyRate: 0.95,  assistRate: 1.15 },
    "TWO-WAY FWD":    { shotRate: 0.99, penaltyRate: 0.95,  assistRate: 1.05 },
    "GRINDER":        { shotRate: 0.98, penaltyRate: 1.30,  assistRate: 0.90 },
    "ENFORCER F":     { shotRate: 0.50, penaltyRate: 1.60,  assistRate: 0.50 },
    "PRO OFFENSIVE FWD": { shotRate: 1.14, penaltyRate: 0.75,  assistRate: 1.14 },
    "PRO DEFENSIVE FWD": { shotRate: 0.89, penaltyRate: 0.75,  assistRate: 1.05 },
    "DEFENSIVE SPECIALIST": { shotRate: 0.82, penaltyRate: 0.80,  assistRate: 0.98 },
    "OFFENSIVE FWD":  { shotRate: 0.90, penaltyRate: 1.00,  assistRate: 1.00 },
    "DEFENSIVE FWD":  { shotRate: 0.75, penaltyRate: 1.00,  assistRate: 0.95 },

    // --- DEFENSEMEN ---
    "FRANCHISE D":    { shotRate: 1.15, penaltyRate: 0.80,  assistRate: 1.25 }, // High assistRate to reflect their role in starting plays and quarterbacking from the blueline
    "QUARTERBACK":    { shotRate: 0.99, penaltyRate: 0.85,  assistRate: 1.35 }, // Maximize playmaking from the blueline
    "BOOMER":         { shotRate: 1.20, penaltyRate: 1.00,  assistRate: 1.11 }, // Higher shotRate, slightly lower assistRate to reflect their focus on powerful shots
    "BIG HITTER":     { shotRate: 1.00, penaltyRate: 1.40,  assistRate: 1.00 }, // Lower shotRate, higher penaltyRate to reflect their physical style
    "SHUTDOWN":       { shotRate: 0.80, penaltyRate: 1.00,  assistRate: 1.00 }, // Lower shotRate, balanced assistRate to reflect their defensive focus
    "TWO-WAY STAR D": { shotRate: 1.09, penaltyRate: 0.90,  assistRate: 1.25 },
    "TWO-WAY D":      { shotRate: 0.97, penaltyRate: 1.00,  assistRate: 1.05 },
    "PRO OFFENSIVE D":{ shotRate: 1.05, penaltyRate: 0.70,  assistRate: 1.15 },
    "PRO DEFENSIVE D":{ shotRate: 0.80, penaltyRate: 0.70,  assistRate: 0.95 },
    "OFFENSIVE D":    { shotRate: 0.99, penaltyRate: 1.00,  assistRate: 1.05 },
    "DEFENSIVE D":    { shotRate: 0.75, penaltyRate: 1.10,  assistRate: 0.95 },
    "ENFORCER D":     { shotRate: 0.70, penaltyRate: 1.60,  assistRate: 0.60 }
};

// Goal-conversion bonus by archetype, applied on top of archMods shot/assist attempt-rate
// weighting. archMods governs how OFTEN a player gets the puck/shoots/sets up a goal; this
// governs how often that specific shot actually goes in — the two stack multiplicatively.
// Broadened beyond SUPERSTAR/SNIPER so playmakers and other offensive archetypes also see a
// real point-total lift, not just pure snipers.
function getEliteShooterMod(tag) {
    switch (tag) {
        case 'SNIPER': return 1.30;
        case 'SUPERSTAR': return 1.26;
        case 'PLAYMAKER': return 1.14;
        case 'DANGLER': return 1.12;
        case 'POWER FORWARD': return 1.10;
        case 'SPEEDSTER': return 1.08;
        case 'TWO-WAY STAR F': return 1.08;
        default: return 1.0;
    }
}

    function getLeadershipScore(pName) {
    const p = playerStats[pName];
    if (!p) return 50;
    
    // We derive leadership from Experience (using Age if you have it, 
    // otherwise Aggressiveness/Stick Handling to represent veteran savvy)
    let age = parseInt(p.age) || 25;
    let aggr = gradeToNum(p.attr.aggr) || 50;
    let stk = gradeToNum(p.attr.stkHnd) || 50;
    let asgAppearances = p.asgAppearances || 0;
    // Experience bonus for older players, high skill bonus for leaders
    let score = (Math.min(age, 35) * 1.5) + (aggr * 0.3) + (stk * 0.2) + (asgAppearances * 2);
    return Math.min(score, 100);
}

/**
 * Generates status icons for a player
 * @param {string} pName - The player name
 * @returns {string} - A string of emojis/icons wrapped in a span
 */
function getPlayerBadges(pName) {
    const ps = playerStats[pName];
    if (!ps) return '';
    let badges = '';
    if (isTeamCaptain(pName)) badges += '[C]';
    if (ps.onIR) badges += '[IR]';
    else if (ps.injury && ps.injury.daysRemaining > 0) badges += '[INJ]';
    if (ps.suspended && ps.suspended.days > 0) badges += '[SUS]';
    let isHot = ps.macro_streak === 'HOT' || ps.micro_streak === 'HOT' || ps.streakType === 'hot';
    let isCold = ps.macro_streak === 'COLD' || ps.micro_streak === 'COLD' || ps.streakType === 'cold';
    if (isHot) badges += 'HOT';
    else if (isCold) badges += 'COLD';
    if (ps.asgMvp) badges += '[MVP]';
    if (ps.career && ps.career.awards > 0) badges += '[AWD]';
    return badges ? `<span class="player-badge" style="font-size:10px; margin-left:4px;">${badges}</span>` : '';
}

function buildStatusBadges(pName) {
    const ps = playerStats[pName];
    if (!ps) return '';
    const fatigue = typeof getPlayerFatigueAmount === 'function' ? getPlayerFatigueAmount(pName) : 0;
    const isHot = ps.macro_streak === 'HOT' || ps.micro_streak === 'HOT' || ps.streakType === 'hot';
    const isCold = ps.macro_streak === 'COLD' || ps.micro_streak === 'COLD' || ps.streakType === 'cold';
    const streakLen = ps.streakDur || 0;

    const badge = (emoji, label, color, bg) =>
        `<div style="display:inline-flex;align-items:center;gap:4px;background:${bg};border:1px solid ${color};padding:3px 7px;border-radius:2px;font-size:7px;color:${color};font-family:'Press Start 2P',cursive;white-space:nowrap;">${emoji} ${label}</div>`;

    let out = '';

    if (ps.injury && ps.injury.daysRemaining > 0)
        out += badge('[INJ]', `INJURED ${ps.injury.daysRemaining}d`, '#FF5555', '#2a0000');
    if (ps.suspended && ps.suspended.days > 0)
        out += badge('[SUS]', `SUSPENDED ${ps.suspended.days}d`, '#FF8800', '#2a1400');
    if (isHot)
        out += badge('HOT', streakLen >= 5 ? `HOT ${streakLen}G` : 'HOT', '#FFAA00', '#1a1000');
    else if (isCold)
        out += badge('COLD', 'COLD', '#55FFFF', '#001a1a');
    if (!isHot && !isCold && ps.consPointless >= 2)
        out += badge('', `SLUMP ${ps.consPointless}G`, '#FF6666', '#1a0000');
    if (fatigue >= 6)
        out += badge('', `FATIGUED -${fatigue}`, '#FFAA44', '#1a1000');
    if (ps.asgMvp)
        out += badge('[MVP]', 'ASG MVP', '#FFD700', '#1a1400');
    if (ps.asgAppearances > 0)
        out += badge('', `ALL-STAR ${ps.asgAppearances}x`, '#00FFFF', '#001a1a');
    if (ps.career && ps.career.awards > 0)
        out += badge('[AWD]', `${ps.career.awards} TROPHY`, '#FFD700', '#1a1400');
    if (ps.potential === 'Franchise')
        out += badge('', 'FRANCHISE', '#AA88FF', '#0e0022');
    if (ps.age <= 21)
        out += badge('', 'ROOKIE', '#88FF88', '#001a00');
    else if (ps.age >= 35)
        out += badge('', 'VETERAN', '#AAAAAA', '#111111');
    if (ps.milestones && ps.milestones.length > 0)
        out += badge('', `${ps.milestones.length} MILESTONE`, '#00CCFF', '#001a22');

    if (!out) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 4px 0;">${out}</div>`;
}

// Deterministic midpoint lbs for display (card, tooltip, etc.)
function getWeightLbs(grade) {
    const lbs = {'A+':182,'A':190,'B':200,'C':210,'D':220,'F':230,'F+':242,'F-':242};
    return lbs[grade] || 210;
}
// Reverse-map a stored numeric attr value back to a display grade string
function numToGrade(n) {
    const v = parseInt(n);
    if (isNaN(v)) return n || '--';
    if (v >= 95) return 'A+';
    if (v >= 90) return 'A';
    if (v >= 85) return 'A-';
    if (v >= 80) return 'B+';
    if (v >= 75) return 'B';
    if (v >= 70) return 'B-';
    if (v >= 63) return 'C+';
    if (v >= 56) return 'C';
    if (v >= 50) return 'C-';
    if (v >= 40) return 'D';
    if (v >= 30) return 'F+';
    return 'F';
}

// Shared helper  -  parse a raw weight cell (grade string OR numeric string) into
// { grade, lbs } so both CSV init paths stay in sync.
function parseWeightCell(raw) {
    const g = String(raw || '').trim();
    if (/^[ABCDFabcdf][+-]?$/.test(g)) return { grade: g.toUpperCase(), lbs: getWeightLbs(g.toUpperCase()) };
    const n = parseInt(g, 10);
    if (!isNaN(n) && n > 100) return { grade: lbsToWeightGrade(n), lbs: n };
    return { grade: 'C', lbs: 210 };
}
// Reverse-map numeric lbs  weight grade
function lbsToWeightGrade(lbs) {
    if (!lbs || lbs <= 0) return 'C';
    if (lbs <= 185) return 'A+';
    if (lbs <= 194) return 'A';
    if (lbs <= 204) return 'B';
    if (lbs <= 214) return 'C';
    if (lbs <= 224) return 'D';
    if (lbs <= 234) return 'F';
    return 'F+';
}

// Accepts numeric lbs (p.weight)  -  no random re-roll needed
function getWeightModifier(lbs, arch) {
    const w = (typeof lbs === 'number' && lbs > 100) ? lbs : getWeightLbs(lbs); // back-compat if grade string passed
    switch (arch) {
        case 'POWER FORWARD':   return w >= 215 ? 1.15 : (w <= 195 ? 0.90 : 1.05);
        case 'ENFORCER F':      return w >= 220 ? 1.15 : (w <= 200 ? 0.85 : 1.05);
        case 'GRINDER':         return w >= 210 ? 1.10 : (w <= 190 ? 0.92 : 1.0);
        case 'SPEEDSTER':
        case 'DANGLER':         return w <= 194 ? 1.15 : (w >= 225 ? 0.88 : 1.05);
        case 'SNIPER':          return w <= 204 ? 1.08 : (w >= 230 ? 0.95 : 1.0);
        case 'FRANCHISE D':
        case 'TWO-WAY D':       return w >= 205 && w <= 225 ? 1.05 : 1.0;
        default:                return 1.0;
    }
}

const $ = (id) => document.getElementById(id);
const getGradeMod = (grade) => { 
    const m = { 
        'A+': 1.35,  // Reduced from 1.65. Stars are still dominant, but not game-breaking.
        'A':  1.25,  
        'A-': 1.15,  
        'B+': 1.08,  
        'B':  1.00,  // Baseline remains standard.
        'B-': 0.92,  
        'C+': 0.85,  
        'C':  0.75,  // Buffed from 0.80 to create a smoother drop-off.
        'C-': 0.65,  
        'D':  0.55,  // Buffed from 0.50. They struggle, but can still play the game.
        'F':  0.40   // Buffed from 0.15. Prevents the math from completely zeroing out bad players.
    }; 
    return m[grade] || 0.85; // Default fallback slightly lower than average.
};

function gradeToNum(val) {
    // If it's somehow already a number in the spreadsheet, just keep it!
    if (!isNaN(val) && val !== '') return parseInt(val);
    
    // Helper function to pick a random number between a min and max (inclusive)
    const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Dynamic ranges for each letter grade
    const map = {
        'A+': () => roll(95, 99), 
        'A':  () => roll(90, 94), 
        'A-': () => roll(85, 89),
        'B+': () => roll(80, 84), 
        'B':  () => roll(75, 79), 
        'B-': () => roll(70, 74),
        'C+': () => roll(63, 69), 
        'C':  () => roll(56, 62), 
        'C-': () => roll(50, 55),
        
        // All 'D' grades map to the same wide 40-49 range
        'D+': () => roll(40, 49), 
        'D':  () => roll(40, 49), 
        'D-': () => roll(40, 49),
        
        'F+':  () => roll(30, 39),  // F's are bad, but not completely useless
        'F':   () => roll(30, 39),
        'F-':  () => roll(30, 39)
    };
    
    // Strip stray characters (seen in the source sheet as e.g. "B=", "C=" - likely a leftover
    // formula/copy-paste artifact) so a real intended letter grade doesn't silently fall back to
    // a flat default of 70 just because of one extra symbol.
    const cleanVal = String(val).toUpperCase().trim().replace(/[^A-Z+-]/g, '');

    // If the letter exists, roll the dice. Otherwise, fallback safely to 70.
    return map[cleanVal] ? map[cleanVal]() : 70;
}



// ==========================================
//  GLOBAL ATTRIBUTE & ARCHETYPE UTILITIES
// ==========================================

// Attribute Getters: Handle potential naming inconsistencies in spreadsheet headers
const getOff  = (pName) => parseInt(playerStats[pName]?.attr.off   || playerStats[pName]?.attr.OFF  || 0);
const getDef  = (pName) => parseInt(playerStats[pName]?.attr.def   || playerStats[pName]?.attr.DEF  || 0);
const getChk  = (pName) => { const p = playerStats[pName]; return p ? (gradeToNum(p.attr.check) || 50) : 50; };
const getAggr = (pName) => { const p = playerStats[pName]; return (p && p.attr) ? (gradeToNum(p.attr.aggr) || 50) : 50; };
const getWgt  = (pName) => { const p = playerStats[pName]; return p ? (p.weight || getWeightLbs(p.attr.weight || 'C')) : 180; };
const getArch = (pName) => getPlayerWeightedStats(pName).tag || 'Unknown';


// ==========================================
// ðŸ“‹ FRANCHISE MODE: CUSTOM LINE HELPERS
// ==========================================
// 1. Load any previously saved lines
let customLines = JSON.parse(localStorage.getItem('nhl94_customLines')) || {};


let awardConfig = { streaks: true, chemistry: true, rivalries: true, aging: false, draft: false, retirements: false, headlines: true, milestones: true, injuries: true, legacy_schedule: true, trades: false, tradeBlock: false };
let coachAdj = { forecheck: 0, pp: 0, lineMatch: false };
let coachTrust = 50; // 0-100; updated after each user-team game
let _awardsPending = false; // true between playoff-round-4 end and awards being revealed; blocks beginNewYear
let deadlineCountermove = {}; // { teamNrm: expiryDay } — contenders flagged after a rival deadline deal
let chemScores = {}; // { "P1|P2": 0-100 } — per-custom-duo chemistry score, decays without shared goals
let preseasonOvrSnapshot = {}; // { teamNrm: avgOvr } captured at season start
let teamCaptains = {}; // { teamNrm: playerName }

function isTeamCaptain(pName) {
    return Object.values(teamCaptains).includes(pName);
}

// Trade Value Index: OVR weighted by prime-age factor and position scarcity
function getTradeValue(pName) {
    const ps = playerStats[pName];
    if (!ps) return 50;
    const ovr = getPlayerWeightedStats(pName).ovr;
    const age = ps.age || 25;
    const primeMod = Math.max(0, 14 - Math.abs(age - 28));
    const posMult = ps.pos === 'G' ? 1.15 : ps.pos === 'C' ? 1.10 : ps.pos === 'D' ? 1.05 : 1.0;
    return Math.round((ovr * 0.65 + primeMod * 2.5) * posMult);
}

// Picks the highest-leadership skater on each roster as team captain for the season
function assignTeamCaptains() {
    teamCaptains = {};
    league.forEach(t => {
        const roster = (rosters[t.nrm] || []).filter(p => p.pos !== 'G');
        if (!roster.length) return;
        let best = null, bestScore = -1;
        roster.forEach(p => {
            const score = getLeadershipScore(p.name);
            if (score > bestScore) { bestScore = score; best = p.name; }
        });
        if (best) teamCaptains[t.nrm] = best;
    });
}

// Captains amplify team chemistry when healthy/hot, and hurt it more than a regular player when injured/cold
function placeOnIR(pName, tk) {
    const ps = playerStats[pName];
    if (!ps) return;
    if (!ps.injury || ps.injury.daysRemaining === 0) return alert(`${pName} must be injured to be placed on IR.`);
    ps.onIR = true;
    ps.irDay = currentDay;
    ps.irTotalDays = ps.injury.daysRemaining;
    tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `IR MOVE: ${pName} (${tk.toUpperCase()}) placed on Injured Reserve — ${ps.injury.daysRemaining} days remaining.` });
    clearWpCache(); updateUI(); renderTeamDirectory(tk); saveGame();
}

function activateFromIR(pName, tk) {
    const ps = playerStats[pName];
    if (!ps) return;
    if (ps.injury && ps.injury.daysRemaining > 0) return alert(`${pName} is still injured (${ps.injury.daysRemaining}d). Cannot activate yet.`);
    ps.onIR = false;
    tradeLog.unshift({ day: currentDay, details: `IR ACTIVATE: ${pName} (${tk.toUpperCase()}) activated from Injured Reserve and returns to lineup.` });
    clearWpCache(); updateUI(); renderTeamDirectory(tk); saveGame();
}

function duoKey(pair) { return [...pair].sort().join('|'); }
function getChemScore(pair) { return chemScores[duoKey(pair)] ?? 100; }

function getCaptainChemModifier(teamNrm) {
    const capName = teamCaptains[teamNrm];
    if (!capName) return 0;
    const ps = playerStats[capName];
    if (!ps) return 0;
    if (ps.injury && ps.injury.daysRemaining > 0) return -3;
    const isCold = ps.macro_streak === 'COLD' || ps.micro_streak === 'COLD' || ps.streakType === 'cold';
    if (isCold) return -2;
    const isHot = ps.macro_streak === 'HOT' || ps.micro_streak === 'HOT' || ps.streakType === 'hot';
    if (isHot) return 2;
    return 1; // healthy, active captain provides a small baseline boost
}
let league = []; let rosters = {}; let playerStats = {}; let tradeLog = []; let hallOfFame = []; let leagueHistory = []; let retiredPlayers = []; let calendar = []; let realDatesMap = []; let gameMilestones = []; let monthSnapshot = {}; let pendingTrades = []; let playoffBracket = { round: 1, series: [] }; let teams = {}; let selectedTeam = null;
let customDuos = []; // user-defined chemistry pairs, supplements the hardcoded dynamicDuos
// Checks that swapping outA(from teamA)<->outB(from teamB) leaves both post-trade rosters with a goalie and a center
function tradeKeepsRostersViable(teamAKey, outA, teamBKey, outB) {
    const postA = rosters[teamAKey].map(p=>p.name).filter(n=>n!==outA.name).concat([outB.name]);
    const postB = rosters[teamBKey].map(p=>p.name).filter(n=>n!==outB.name).concat([outA.name]);
    const hasGoalie = names => names.some(n => playerStats[n]?.pos === 'G');
    const hasCenter = names => names.some(n => playerStats[n]?.pos === 'C');
    return hasGoalie(postA) && hasGoalie(postB) && hasCenter(postA) && hasCenter(postB);
}
// Drop any duo where a member retired or the pair is no longer on the same team roster
function pruneCustomDuos() {
    customDuos = customDuos.filter(duo => {
        if (!duo.every(n => playerStats[n])) return false;
        const teamCodes = new Set(duo.map(n => playerStats[n].teamCode));
        return teamCodes.size === 1;
    });
}
let currentDay = 0; let currentSeason = 1; let isPlayoffs = false; let isASG = false; let asgDoneThisSeason = false; let activeIdx = null; let statMode = 'season'; let isSimulating = false; let isSimSeason = false; let isTurboMode = false; let currentCupChamp = ""; let activeSubInfo = null; let customRosterData = null; let customRosterSource = 'google'; let customTeamData = null; let customPlayerData = null; let customScheduleData = null; let customEventLogData = null; let eventLogData = null;
let watchBroadcastDay = null; let watchBroadcastIdx = null;

const SAVE_STORAGE_KEY = 'nhl94dynasty'; const HISTORY_STORAGE_KEY = 'nhl94history'; const HOF_STORAGE_KEY = 'nhl94hof'; const RETIRED_STORAGE_KEY = 'nhl94retired';
const SAVE_SLOT_KEYS = { AUTO: SAVE_STORAGE_KEY, SLOT_1: `${SAVE_STORAGE_KEY}_slot1`, SLOT_2: `${SAVE_STORAGE_KEY}_slot2`, SLOT_3: `${SAVE_STORAGE_KEY}_slot3` };
const LEGACY_SAVE_VERSION = 1; const CURRENT_SAVE_SCHEMA_VERSION = 2; const SUPPORTED_SAVE_VERSIONS = [LEGACY_SAVE_VERSION, CURRENT_SAVE_SCHEMA_VERSION];
let saveGameTimer = null;

// =========================================================
//  GAME CONFIGURATION (Centralized Magic Numbers)
// =========================================================
const GAME_CONFIG = {
    ice_time: {
        skater_min: 15,
        skater_max: 25,
        goalie_full: 60,
        off_scaling: 70  // baseline for offensive rating multiplier
    },
    fatigue: {
        penalty_per_point: 0.4,
        base_decay: 0.015
    },
    stats: {
        superstar_boost: 1.05,
        superstar_clutch: 20,
        def_ice_time_multiplier: 1.35
    },
    penalties: {
        base_chance: 0.05,
        major_chance: 0.10,
        major_escalation: 0.25
    },
    morale: {
        win_home: 12,
        win_away: 8,
        loss_home: 12,
        loss_away: 6,
        scorer_bonus: 5,
        min: 50,
        max: 150
    }
};

const PENALTY_REGISTRY = {
    stick: ["Tripping", "Hooking", "Slashing", "Interference"],
    physical: ["Roughing", "Charging", "Boarding"]
};

// --- SAVE & LOAD ENGINE ---
function getSaveSlotKey(slot = 'AUTO') { return SAVE_SLOT_KEYS[slot] || SAVE_STORAGE_KEY; }
function getSelectedSaveSlot() { const select = document.getElementById('saveSlotSelect'); return select ? select.value : 'AUTO'; }
function setSelectedSaveSlot(slot) { const select = document.getElementById('saveSlotSelect'); if (!select) return; select.value = slot; renderSaveSlotHistory(); updateSaveMetadataDisplay(slot); renderScheduleDashboard(); }
function getSelectedSaveSlotLabel() { const slot = getSelectedSaveSlot(); return slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); }
function writeSavePayload(data) {
    try {
        const json = JSON.stringify(data);
        // Yield between stringify and compress so the browser can breathe
        setTimeout(() => {
            try {
                localStorage.setItem('nhl94dynasty', LZString.compressToUTF16(json));
            } catch (e) {
                console.error("[SAVE ERROR] Storage full or inaccessible:", e);
            }
        }, 0);
    } catch (e) {
        console.error("[SAVE ERROR] JSON serialization failed:", e);
    }
}

function saveGame({slot = 'AUTO', force = false} = {}) {
    // Cancel any pending save
    if (saveGameTimer !== null) {
        if (window.cancelIdleCallback) cancelIdleCallback(saveGameTimer);
        else clearTimeout(saveGameTimer);
        saveGameTimer = null;
    }
    // Force-save (e.g. manual save slot): build + write synchronously this tick,
    // but still split stringify/compress across two ticks via writeSavePayload.
    if (force) { writeSavePayload(buildSavePayload()); return; }
    // Debounced auto-save: defer until the browser reports idle time,
    // so the heavy JSON.stringify + LZString work never blocks interaction.
    const doSave = () => { writeSavePayload(buildSavePayload()); saveGameTimer = null; };
    if (window.requestIdleCallback) {
        saveGameTimer = requestIdleCallback(doSave, { timeout: 4000 });
    } else {
        saveGameTimer = setTimeout(doSave, 500);
    }
}
function saveSlot() { const slot = getSelectedSaveSlot(); saveGame({slot, force: true}); displaySaveStateInfo(`Saved to ${getSelectedSaveSlotLabel()}.`, 'success'); }
function displaySaveStateInfo(message, type = 'info') { const el = document.getElementById('saveStateInfo'); if (!el) return; el.innerText = message; el.className = `save-state-info ${type}`; }
function buildSavePayload() {
    //  STORAGE FIX: Create a lightweight copy of the calendar to save space
    // This deletes the massive HTML play-by-play strings from old games so you don't hit the 5MB limit!
    // Also strips the circular series↔games back-reference to allow JSON serialization.
    const lightweightCalendar = (Array.isArray(calendar) ? calendar : []).map((day, dIdx) => {
        const safeDay = Array.isArray(day) ? day : [];
        return safeDay.map(g => {
            if (!g || typeof g !== 'object') return g;
            // Always strip circular series ref; strip heavy boxLog from played games
            const { series: _s, ...rest } = g;
            if (dIdx < currentDay && rest.result && rest.result.boxLog) {
                return { ...rest, result: { ...rest.result, boxLog: [] } };
            }
            return rest;
        });
    });
    // Lightweight playoff bracket — strip series.games to break circular ref; re-built on load
    const stripSeries = (arr) => (arr || []).map(s => { const { games: _g, ...rest } = s; return rest; });
    const lightweightBracket = playoffBracket ? {
        ...playoffBracket,
        series: stripSeries(playoffBracket.series),
        east: stripSeries(playoffBracket.east),
        west: stripSeries(playoffBracket.west),
        history: playoffBracket.history || []
    } : playoffBracket;

    //  STORAGE FIX: Keep trade logs and history trimmed so they don't grow infinitely
    if (tradeLog.length > 200) tradeLog = tradeLog.slice(0, 200);
    if (leagueHistory.length > 25) leagueHistory = leagueHistory.slice(0, 25);

    return {
        meta: { version: CURRENT_SAVE_SCHEMA_VERSION, savedAt: new Date().toISOString(), label: 'EASN Dynasty Save' },
        data: { 
            league, rosters, playerStats, tradeLog, hallOfFame, leagueHistory, 
            retiredPlayers, calendar: lightweightCalendar, currentDay, currentSeason, 
            isPlayoffs, isASG, currentCupChamp, playoffBracket: lightweightBracket, awardConfig, 
            monthSnapshot, pendingTrades, realDatesMap, customDuos, coachAdj, coachTrust, deadlineCountermove, chemScores, preseasonOvrSnapshot, teamCaptains, _awardsPending, asgDoneThisSeason
        }
    };
}
function normalizeSavePackage(raw) { if (!raw || typeof raw !== 'object') return null; if (raw.meta && raw.data) { if (!isSupportedSaveVersion(raw.meta.version)) return null; return { payload: raw.data, meta: raw.meta }; } return { payload: raw, meta: { version: LEGACY_SAVE_VERSION, savedAt: null, label: 'Legacy EASN Save', migratedFromLegacy: true } }; }
function isSupportedSaveVersion(version) { return SUPPORTED_SAVE_VERSIONS.includes(Number(version)); }
function getSaveMeta(slot = 'AUTO') { try { const raw = localStorage.getItem(getSaveSlotKey(slot)); if (!raw) return null; const parsed = JSON.parse(raw); const normalized = normalizeSavePackage(parsed); return normalized ? normalized.meta : null; } catch { return null; } }
function getAllSaveSlotHistory() { return Object.keys(SAVE_SLOT_KEYS).map(slot => { const meta = getSaveMeta(slot); return { slot, label: slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '), savedAt: meta ? meta.savedAt : null, version: meta ? meta.version : null, valid: Boolean(meta) }; }); }
function selectHistorySaveSlot(slot) { setSelectedSaveSlot(slot); const meta = getSaveMeta(slot); if (!meta) { displaySaveStateInfo(`${slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' ')} is empty.`, 'info'); return; } const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); const savedAt = formatSaveTimestamp(meta.savedAt); if (!confirm(`Load ${label} saved at ${savedAt}? This will replace current progress.`)) return; loadSlot(); }
function renderSaveSlotHistory() { const container = document.getElementById('saveSlotHistory'); if (!container) return; const history = getAllSaveSlotHistory(); container.innerHTML = history.map(item => { const timestamp = item.savedAt ? formatSaveTimestamp(item.savedAt) : 'empty'; const version = item.version ? `v${item.version}` : '--'; const activeClass = item.slot === getSelectedSaveSlot() ? ' save-slot-history-active' : ''; return `<div class="save-slot-history-item${activeClass}" onclick="selectHistorySaveSlot('${item.slot}')"><span>${item.label}</span><span>${timestamp}  |  ${version}</span></div>`; }).join(''); }
function formatSaveTimestamp(value) { if (!value) return 'unknown'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function updateSaveMetadataDisplay(slot = 'AUTO') { const el = document.getElementById('saveMetadata'); if (!el) return; const meta = getSaveMeta(slot); const label = slot === 'AUTO' ? 'Auto Save' : slot.replace('_', ' '); if (!meta) { el.innerText = `SAVE: no backup yet (${label})`; return; } el.innerText = `SAVE ${label} v${meta.version}  |  ${formatSaveTimestamp(meta.savedAt)}`; }
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
    customDuos = Array.isArray(data.customDuos) ? data.customDuos : [];
    if (typeof data.coachAdj === 'object' && data.coachAdj) coachAdj = { ...coachAdj, ...data.coachAdj };
    if (typeof data.coachTrust === 'number') coachTrust = data.coachTrust;
    if (typeof data.deadlineCountermove === 'object' && data.deadlineCountermove) deadlineCountermove = data.deadlineCountermove;
    if (typeof data.chemScores === 'object' && data.chemScores) chemScores = data.chemScores;
    if (typeof data.preseasonOvrSnapshot === 'object' && data.preseasonOvrSnapshot) preseasonOvrSnapshot = data.preseasonOvrSnapshot;
    // Fix 2: seed snapshot for old saves that predate this feature (neutral baseline)
    if (!Object.keys(preseasonOvrSnapshot).length && league.length) {
        league.forEach(t => { preseasonOvrSnapshot[t.nrm] = 75; });
    }
    teamCaptains = (typeof data.teamCaptains === 'object' && data.teamCaptains) ? data.teamCaptains : {};
    if (!Object.keys(teamCaptains).length) assignTeamCaptains();
    realDatesMap = Array.isArray(data.realDatesMap) ? data.realDatesMap : [];
    _awardsPending = Boolean(data._awardsPending);
    asgDoneThisSeason = Boolean(data.asgDoneThisSeason);

    if (currentDay < 0) currentDay = 0;
    if (currentDay >= calendar.length) currentDay = calendar.length - 1;

    //  STANDINGS FIX: Re-link the schedule calendar back to the master league array
    calendar.forEach(day => {
        day.forEach(g => {
            if (g.h && g.h.nrm) g.h = league.find(t => t.nrm === g.h.nrm) || g.h;
            if (g.a && g.a.nrm) g.a = league.find(t => t.nrm === g.a.nrm) || g.a;
        });
    });
    
    // Re-link the playoff bracket just in case!
    if (playoffBracket && playoffBracket.series) {
        const relinkSeries = arr => { if (!arr) return; arr.forEach(s => { if (s.h && s.h.nrm) s.h = league.find(t => t.nrm === s.h.nrm) || s.h; if (s.a && s.a.nrm) s.a = league.find(t => t.nrm === s.a.nrm) || s.a; if (!s.games) s.games = []; }); };
        relinkSeries(playoffBracket.series);
        relinkSeries(playoffBracket.east);
        relinkSeries(playoffBracket.west);
        // Rebuild game.series and series.games from calendar (stripped on save to break circular ref)
        calendar.forEach(day => {
            day.forEach(g => {
                if (!g || !g.h || !g.a) return;
                const match = playoffBracket.series.find(s =>
                    s.h && s.a && s.h.nrm === g.h.nrm && s.a.nrm === g.a.nrm
                );
                if (match) {
                    g.series = match;
                    if (g.result && !match.games.includes(g)) match.games.push(g);
                }
            });
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

function getGamesForDay(day = currentDay) {
    return Array.isArray(calendar[day]) ? calendar[day] : [];
}

function getGameAt(day = currentDay, idx = activeIdx) {
    const dayGames = getGamesForDay(day);
    if (!Number.isInteger(idx) || idx < 0 || idx >= dayGames.length) return null;
    const g = dayGames[idx];
    return (g && g.h && g.a) ? g : null;
}

function getProjectedGoalie(nrm) {
    const gs = (rosters[nrm] || [])
        .filter(p => p.pos === 'G' && playerStats[p.name]
            && (!playerStats[p.name].injury || playerStats[p.name].injury.daysRemaining === 0)
            && (!playerStats[p.name].suspended || playerStats[p.name].suspended.days === 0))
        .sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr);
    if (!gs.length) return null;
    // On a back-to-back with a close backup, likely sit the starter
    if (playedYesterday(nrm) && gs.length > 1) {
        const diff = getPlayerWeightedStats(gs[0].name).ovr - getPlayerWeightedStats(gs[1].name).ovr;
        const consStarts = (playerStats[gs[0].name]?.season?.consStarts || 0);
        if (diff <= 10 || consStarts >= 7) return gs[1];
    }
    return gs[0];
}

function syncArenaScoreboardUI() {
    const btn = document.getElementById('btnGameSelect');
    const aName = document.getElementById('aName');
    const hName = document.getElementById('hName');
    const jLogoA = document.getElementById('jLogoA');
    const jLogoH = document.getElementById('jLogoH');
    const aScore = document.getElementById('aScoreLabel');
    const hScore = document.getElementById('hScoreLabel');
    const jumbo = document.getElementById('jumboMessage');
    if (!btn || !aName || !hName || !aScore || !hScore || !jumbo) return;

    let g = getGameAt(currentDay, activeIdx);
    const dayGames = getGamesForDay(currentDay);
    if (!g && activeIdx === null && dayGames.length === 1) {
        const lone = dayGames[0];
        if (lone && lone.h && lone.a) g = lone;
    }

    if (g && g.h && g.a) {
        const isAsgMatchup = Boolean(g.isASG_game);
        btn.innerText = isAsgMatchup ? 'ASG BREAK' : `${g.a.code} @ ${g.h.code}`;
        aName.innerText = g.a.code || 'AWAY';
        hName.innerText = g.h.code || 'HOME';
        if (jLogoA) jLogoA.src = g.a.logo || '';
        if (jLogoH) jLogoH.src = g.h.logo || '';

        // Dynamic two-tone banners using team colors (or ASG conference colors)
        const awayBanner = document.getElementById('awayBanner');
        const homeBanner = document.getElementById('homeBanner');
        if (awayBanner && homeBanner) {
            let aC1, aC2, hC1, hC2;
            if (isAsgMatchup) {
                aC1 = '#FF6600'; aC2 = '#000'; // Campbell orange
                hC1 = '#003399'; hC2 = '#000'; // Wales blue
            } else {
                const aCols = teamColors[g.a.code?.toLowerCase()] || teamColors[g.a.nrm] || ['#333', '#000'];
                const hCols = teamColors[g.h.code?.toLowerCase()] || teamColors[g.h.nrm] || ['#333', '#000'];
                aC1 = aCols[0]; aC2 = aCols[1] || '#000';
                hC1 = hCols[0]; hC2 = hCols[1] || '#000';
            }
            awayBanner.style.background = `linear-gradient(to bottom, ${aC1} 50%, ${aC2} 50%)`;
            homeBanner.style.background = `linear-gradient(to bottom, ${hC2} 50%, ${hC1} 50%)`;
            awayBanner.style.borderColor = aC1;
            homeBanner.style.borderColor = hC1;
        }
        aScore.innerText = g.result ? String(g.result.aG) : '0';
        hScore.innerText = g.result ? String(g.result.hG) : '0';
        if (g.result) {
            const ot = g.result.ot > 0 ? ` (OT)` : '';
            const winTeam = g.result.aG > g.result.hG ? g.a.code : g.h.code;
            let bsDay = currentDay, bsIdx = activeIdx;
            if (bsIdx === null) {
                const dl = getGamesForDay(currentDay);
                bsIdx = dl.indexOf(g);
                if (bsIdx < 0) bsIdx = 0;
            }
            // Build goal scorer ticker  -  one line per goal
            const goalEvents = (g.result.boxLog || []).filter(ev => !ev.isPenalty && ev.scorer);
            const aCode = g.a.code, hCode = g.h.code;
            const aCl = teamColors[g.a.nrm] ? teamColors[g.a.nrm][0] : '#fff';
            const hCl = teamColors[g.h.nrm] ? teamColors[g.h.nrm][0] : '#fff';
            let scorerLines = goalEvents.map(ev => {
                const cl = (ev.tm === aCode) ? aCl : hCl;
                const tag = ev.isPP ? ' <span style="color:#FFD700;font-size:6px;">PP</span>' : ev.isSH ? ' <span style="color:#00FFFF;font-size:6px;">SH</span>' : '';
                return `<div style="font-size:7px;color:${cl};line-height:1.8;">[${ev.tm}]${tag} ${ev.scorer}${ev.pAssist ? ` (${ev.pAssist})` : ''} <span style="color:#666">${ev.time||''}</span></div>`;
            }).join('');
            jumbo.innerHTML = `<span style="color:var(--ea-yellow);font-size:9px;">FINAL${ot}  -  ${winTeam} WIN</span>`
                + (scorerLines ? `<div style="max-height:80px;overflow-y:auto;margin:6px 0;text-align:left;">${scorerLines}</div>` : '<br>')
                + `<button onclick="openBoxScore(${bsDay},${bsIdx})" style="font-family:'Press Start 2P',cursive;font-size:7px;padding:6px 10px;background:#000;border:2px solid var(--neon-cyan);color:var(--neon-cyan);cursor:pointer;">&#x1F4CB; VIEW BOX SCORE</button>`;
        } else {
            if (isAsgMatchup) {
                jumbo.innerText = 'ALL-STAR GAME  -  PUCK DROP PENDING...';
            } else {
                const aGproj = getProjectedGoalie(g.a.nrm);
                const hGproj = getProjectedGoalie(g.h.nrm);
                const goalieTag = (p) => {
                    if (!p) return '---';
                    const ps = playerStats[p.name];
                    const streak = ps ? (ps.macro_streak || ps.micro_streak) : null;
                    const badge = streak === 'HOT' ? ' <span style="color:#FF6600;font-size:6px;">[HOT]</span>'
                                : streak === 'COLD' ? ' <span style="color:#55FFFF;font-size:6px;">[COLD]</span>' : '';
                    const b2b = playedYesterday(p.teamCode || p.team) ? ' <span style="color:#FFAA44;font-size:6px;">[B2B]</span>' : '';
                    return `<span style="color:#ccc;">${p.name}</span>${badge}${b2b}`;
                };
                jumbo.innerHTML = `<span style="color:var(--silver-mid);font-size:7px;">PROJECTED STARTERS</span><br>`
                    + `<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:7px;">`
                    + `<div>${g.a.code}: ${goalieTag(aGproj)}</div>`
                    + `<div>${g.h.code}: ${goalieTag(hGproj)}</div>`
                    + `</div><div style="margin-top:8px;color:var(--silver-mid);font-size:6px;">PUCK DROP PENDING...</div>`;
            }
        }
        return;
    }

    if (activeIdx !== null) activeIdx = null;
    btn.innerText = 'ARENA';
    aName.innerText = 'AWAY';
    hName.innerText = 'HOME';
    if (jLogoA) jLogoA.src = '';
    if (jLogoH) jLogoH.src = '';
    const awayBannerReset = document.getElementById('awayBanner');
    const homeBannerReset = document.getElementById('homeBanner');
    if (awayBannerReset) { awayBannerReset.style.background = ''; awayBannerReset.style.borderColor = ''; }
    if (homeBannerReset) { homeBannerReset.style.background = ''; homeBannerReset.style.borderColor = ''; }
    aScore.innerText = '0';
    hScore.innerText = '0';
    if (!calendar.length) jumbo.innerText = 'SCHEDULE NOT LOADED.';
    else if (currentDay >= calendar.length) jumbo.innerText = 'SEASON COMPLETE.';
    else jumbo.innerText = 'SELECT A GAME FROM ARENA.';
}

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
    const versionLabel = meta.version ? `Save ${slotLabel}  |  v${meta.version}` : `Save ${slotLabel}  |  n/a`; 
    const isAsgDay = isASG && calendar[currentDay] && calendar[currentDay].some(g => g.isASG_game);
    const statusText = totalDays === 0 ? 'Schedule not loaded' : currentDay >= totalDays ? 'Season complete' : `${isAsgDay ? 'ALL-STAR DAY' : `Day ${currentDay + 1} / ${totalDays}`}`;

    summaryEl.innerHTML = `<span>${statusText}</span><span>Completed: ${completedDays}</span><span>Remaining: ${remainingDays}</span><span>${currentDate}</span><span>${versionLabel}</span>`;
    if (totalDays === 0 || currentDay >= totalDays) { upcomingEl.innerHTML = `<div class="schedule-game-line">No upcoming matchups.</div>`; return; }

    const upcomingLines = (calendar[currentDay] || []).slice(0, 3).map((g, gIdx) => {
        const home = g.h ? (g.h.code || g.h.name || 'HOME') : 'HOME';
        const away = g.a ? (g.a.code || g.a.name || 'AWAY') : 'AWAY';
        const when = realDatesMap && realDatesMap[currentDay] ? realDatesMap[currentDay] : `Day ${currentDay + 1}`;
        const goalieBadge = (tk) => {
            if (!tk) return '';
            const gp = getProjectedGoalie(tk);
            if (!gp) return '';
            const ps = playerStats[gp.name];
            const streak = ps ? (ps.macro_streak || ps.micro_streak) : null;
            const tag = streak === 'HOT' ? ' <span style="color:#FF6600;font-size:5px;">[HOT]</span>'
                      : streak === 'COLD' ? ' <span style="color:#55FFFF;font-size:5px;">[COLD]</span>' : '';
            const b2b = playedYesterday(tk) ? ' <span style="color:#FFAA44;font-size:5px;">[B2B]</span>' : '';
            return `<span style="color:#666;font-size:5px;"> ${gp.name}${tag}${b2b}</span>`;
        };
        const hMeet = g.h?.season?.meetings?.[g.a?.nrm] || 0;
        const isHistRival = awardConfig.rivalries && !!(rivals[g.h?.nrm]?.includes(g.a?.nrm) || rivals[g.a?.nrm]?.includes(g.h?.nrm));
        const rivalTag = awardConfig.rivalries && (hMeet >= 3 || isHistRival) ? ' <span style="color:var(--line-red);font-size:5px;">[RIVALRY]</span>' : '';
        const recFmt = t => `${t.season.w||0}-${t.season.l||0}-${t.season.t||0}`;
        const hRec = g.h ? recFmt(g.h) : '';
        const aRec = g.a ? recFmt(g.a) : '';
        const hPts = g.h?.season?.h2h?.[g.a?.nrm] || 0;
        const aPts = g.a?.season?.h2h?.[g.h?.nrm] || 0;
        const h2hLine = hMeet > 0
            ? (() => {
                const leader = hPts > aPts ? `${home} leads` : aPts > hPts ? `${away} leads` : 'Tied';
                return `<div style="color:#555;font-size:5px;margin-top:2px;">H2H this season: ${leader} ${hPts}-${aPts}pts (${hMeet}GP)</div>`;
              })()
            : '';
        // All-time H2H from leagueHistory
        let allTimeH = 0, allTimeA = 0;
        leagueHistory.forEach(season => {
            (season.standings || []).forEach(t => {
                const h2h = (t.season && t.season.h2h) || t.h2h || {};
                if (t.nrm === g.h?.nrm) allTimeH += Math.floor((h2h[g.a?.nrm] || 0) / 2);
                if (t.nrm === g.a?.nrm) allTimeA += Math.floor((h2h[g.h?.nrm] || 0) / 2);
            });
        });
        const allTimeLine = (allTimeH + allTimeA) > 0
            ? `<div style="color:#444;font-size:5px;margin-top:1px;">All-time: ${home} ${allTimeH} – ${allTimeA} ${away}</div>`
            : '';
        return `<div class="schedule-game-line" style="flex-direction:column;align-items:flex-start;gap:1px;">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                <span>${away}${goalieBadge(g.a?.nrm)} <span style="color:#444">@</span> ${home}${goalieBadge(g.h?.nrm)}${rivalTag}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:5px;color:#444;">${when}</span>
                    <button onclick="openScoutingReport(${currentDay},${gIdx})" style="font-size:5px;padding:2px 6px;border-color:var(--neon-cyan);color:var(--neon-cyan);">SCOUT</button>
                    <button onclick="openCoachingPanel()" style="font-size:5px;padding:2px 6px;border-color:#FFA500;color:#FFA500;">COACH</button>
                </div>
            </div>
            <div style="color:#aaa;font-size:7px;margin-top:2px;">${away} <span style="color:var(--neon-cyan);font-weight:bold;">${aRec}</span> &nbsp;|&nbsp; ${home} <span style="color:var(--neon-cyan);font-weight:bold;">${hRec}</span></div>
            ${h2hLine}
            ${allTimeLine}
        </div>`;
    }).join('');
    upcomingEl.innerHTML = `<div style="font-size:8px; color:var(--silver-mid); margin-bottom:6px;">Upcoming</div>${upcomingLines || '<div class="schedule-game-line">No games scheduled.</div>'}`;

    const leadersEl = document.getElementById('scoringLeaders');
    if (leadersEl && Object.keys(playerStats).length > 0) {
        const skaters = Object.values(playerStats).filter(ps => ps.season && ps.season.gp > 0 && ps.pos !== 'G');
        const top5 = skaters.sort((a, b) => ((b.season.g||0)+(b.season.a||0)) - ((a.season.g||0)+(a.season.a||0))).slice(0, 5);
        if (top5.length > 0) {
            let lh = `<div style="margin-top:10px; border-top:1px solid #222; padding-top:8px;">`;
            lh += `<div style="color:#888; font-size:6px; text-transform:uppercase; letter-spacing:.12em; margin-bottom:4px;">Scoring Leaders</div>`;
            top5.forEach((ps, i) => {
                const pts = (ps.season.g||0) + (ps.season.a||0);
                const rank = ['①','②','③','④','⑤'][i];
                lh += `<div style="display:flex; justify-content:space-between; font-size:7px; padding:2px 0; border-bottom:1px solid #111;">
                    <span style="color:#666;">${rank}</span>
                    <span style="color:#ccc; flex:1; margin:0 6px; cursor:pointer;" onclick="showPlayerCard('${ps.name}')">${ps.name}</span>
                    <span style="color:#555; font-size:6px; margin-right:6px;">${ps.season.g||0}G ${ps.season.a||0}A</span>
                    <span style="color:var(--ea-yellow); font-weight:bold;">${pts}PTS</span>
                </div>`;
            });
            lh += `</div>`;
            leadersEl.innerHTML = lh;
        } else { leadersEl.innerHTML = ''; }
    }

    const irEl = document.getElementById('irReport');
    if (irEl && Object.keys(playerStats).length > 0) {
        const injured = [], suspended = [];
        Object.values(playerStats).forEach(ps => {
            if (ps.injury && ps.injury.daysRemaining > 0) {
                const d = ps.injury.daysRemaining;
                const sev = d <= 3 ? 'DAY-TO-DAY' : d <= 10 ? 'WEEK-TO-WEEK' : 'LONG-TERM';
                const sevColor = d <= 3 ? '#FFAA44' : d <= 10 ? '#FF6600' : '#FF3333';
                injured.push(`<span style="color:#FF5555;">${ps.name}</span> <span style="color:#555;font-size:5px;">(${ps.teamCode||''} · ${d}d)</span> <span style="color:${sevColor};font-size:5px;">[${sev}]</span>`);
            }
            if (ps.suspended && ps.suspended.days > 0)
                suspended.push(`<span style="color:#FF8800;">${ps.name}</span> <span style="color:#555;font-size:5px;">(${ps.teamCode||''} · ${ps.suspended.days}g · ${ps.suspended.reason||'SUS'})</span>`);
        });
        if (injured.length === 0 && suspended.length === 0) { irEl.innerHTML = ''; return; }
        let h = `<div style="margin-top:10px;border-top:1px solid #222;padding-top:8px;">`;
        if (injured.length > 0)
            h += `<div style="color:#888;font-size:6px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px;">Injured Reserve (${injured.length})</div>` +
                 `<div style="font-size:7px;line-height:1.8;">${injured.join('<br>')}</div>`;
        if (suspended.length > 0)
            h += `<div style="color:#888;font-size:6px;text-transform:uppercase;letter-spacing:.12em;margin:6px 0 4px;">Suspended (${suspended.length})</div>` +
                 `<div style="font-size:7px;line-height:1.8;">${suspended.join('<br>')}</div>`;
        h += `</div>`;
        irEl.innerHTML = h;
    }
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
    const fromName = teamLogos[shortNames[key] || key];
    if (fromName) return fromName;
    // Fallback: try 3-letter code lookup (e.g. 'CHI', 'DET')
    const codeKey = teamName.toUpperCase().trim();
    return PC_LOGOS[codeKey] || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
}
function getTeamLogoHtml(teamName) { if(!teamName) return '<div style="display:inline-block; width:32px; height:32px; margin:0 5px; flex-shrink:0;"></div>'; return `<img src="${getTeamLogoPath(teamName)}" style="width:36px; height:32px; object-fit:contain; border:none; box-shadow:none; padding:0; margin: 0 5px; vertical-align:middle; flex-shrink:0; transform: scale(1.15);">`; }
const teamMap = { "Mighty Ducks of Anaheim": "ANA", "Boston Bruins": "BOS", "Buffalo Sabres": "BUF", "Calgary Flames": "CGY", "Chicago Blackhawks": "CHI", "Minnesota North Stars": "MIN", "Detroit Red Wings": "DET", "Edmonton Oilers": "EDM", "Florida Panthers": "FLA", "Hartford Whalers": "HAR", "Los Angeles Kings": "LAK", "Montreal Canadiens": "MTL", "New Jersey Devils": "NJD", "New York Islanders": "NYI", "New York Rangers": "NYR", "Ottawa Senators": "OTT", "Philadelphia Flyers": "PHI", "Pittsburgh Penguins": "PIT", "Quebec Nordiques": "QUE", "San Jose Sharks": "SJS", "St. Louis Blues": "STL", "Tampa Bay Lightning": "TBL", "Toronto Maple Leafs": "TOR", "Vancouver Canucks": "VAN", "Washington Capitals": "WSH", "Winnipeg Jets": "WPG" };
const teamColors = { 'har': ['#00B140', '#00539B', '#A2AAAD'], 'hfd': ['#00B140', '#00539B', '#A2AAAD'], 'ana': ['#532a44', '#00685E', '#c4ced4'], 'win': ['#00468B', '#CE1126', '#E0E8EE'], 'wpg': ['#00468B', '#CE1126', '#E0E8EE'], 'bos': ['#FFB81C', '#000000', '#8A630B'], 'buf': ['#002654', '#FCB514', '#A2AAAD'], 'cgy': ['#C8102E', '#F1BE48', '#590613'], 'car': ['#CC0000', '#000000', '#A2AAAD'], 'chi': ['#CF0A2C', '#000000', '#D0CACA'], 'col': ['#6F263D', '#236192', '#A2AAAD'], 'min': ['#009639', '#FFD100', '#00331D'], 'det': ['#CE1126', '#FFFFFF', '#A2AAAD'], 'edm': ['#FF4C00', '#041E42', '#C65C10'], 'fla': ['#C8102E', '#041E42', '#B9975B'], 'la': ['#111111', '#A2AAAD', '#555555'], 'lak': ['#111111', '#A2AAAD', '#555555'], 'mon': ['#AF1E2D', '#192168', '#E0E8EE'], 'mtl': ['#AF1E2D', '#192168', '#E0E8EE'], 'nj': ['#CE1126', '#00533B', '#889398'], 'njd': ['#CE1126', '#00533B', '#889398'], 'nyi': ['#00539B', '#F47D30', '#002040'], 'nyr': ['#0038A8', '#CE1126', '#7FA9D6'], 'ott': ['#E31837', '#000000', '#B9975B'], 'phi': ['#F74902', '#000000', '#F3E9D2'], 'pit': ['#000000', '#FCBA03', '#B08D00'], 'que': ['#003E7E', '#FFFFFF', '#CE1126'], 'sa': ['#006D75', '#000000', '#A2AAAD'], 'sjs': ['#006D75', '#000000', '#A2AAAD'], 'stl': ['#002F87', '#FCB514', '#041E42'], 'tb': ['#002868', '#FFFFFF', '#A2AAAD'], 'tbl': ['#002868', '#FFFFFF', '#A2AAAD'], 'tor': ['#00205B', '#FFFFFF', '#B0C4DE'], 'van': ['#000000', '#F2A900', '#C8102E'], 'was': ['#041E42', '#C8102E', '#0033A0'], 'wsh': ['#041E42', '#C8102E', '#0033A0'], 'cbj': ['#002654', '#CE1126', '#A2AAAD'], 'wales': ['#000000', '#FF6600', '#FFFFFF'], 'campbell': ['#FF6600', '#000000', '#FFFFFF'] };

const PC_LOGOS = {
    ANA:'Team Logos/Ducks.png',     BOS:'Team Logos/Bruins.png',    BUF:'Team Logos/sabres.png',
    CGY:'Team Logos/Flames.png',    CHI:'Team Logos/blackhawks.png',DAL:'Team Logos/North_Stars.png',
    DET:'Team Logos/Red_Wings.png', EDM:'Team Logos/Oilers.png',    FLA:'Team Logos/Panthers.png',
    HFD:'Team Logos/whalers.png',   HAR:'Team Logos/whalers.png',   LAK:'Team Logos/kings.png',
    MIN:'Team Logos/North_Stars.png',MTL:'Team Logos/Canadiens.png', NJD:'Team Logos/Devils.png',
    NYI:'Team Logos/islanders.png', NYR:'Team Logos/Rangers.png',   OTT:'Team Logos/Senators.png',
    PHI:'Team Logos/Flyers.png',    PIT:'Team Logos/Penguins.png',  QUE:'Team Logos/Nordiques.png',
    SJS:'Team Logos/sharks.png',    STL:'Team Logos/blues.png',     TBL:'Team Logos/tampa.png',
    TOR:'Team Logos/maple_leafs.png',VAN:'Team Logos/canucks.png',  WSH:'Team Logos/capitals.png',
    WIN:'Team Logos/jets.png',      WPG:'Team Logos/jets.png',
};

// Historical rivalries — bonus activates from game 1 (organic meetings-based rivalry still stacks at 3+)
const rivals = {
    'chi':['det','stl','tor'], 'det':['chi','tor','nyr'], 'mtl':['tor','bos','que'],
    'tor':['mtl','det','chi'], 'nyr':['nyi','njd','phi'], 'edm':['cgy','van','win'],
    'bos':['mtl','nyr','har'], 'phi':['njd','nyr','pit'], 'pit':['phi','wsh','njd'],
    'cgy':['edm','van','win'], 'njd':['nyr','phi','pit'],
};

const DEFAULT_TEAM_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=732700653&single=true&output=csv";
const DEFAULT_PLAYER_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=1253001256&single=true&output=csv";
const DEFAULT_SCHEDULE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7TQG09fJijxS0CFdwQF3ht_Q1ggw99rfmHzRC2RF4Ht5ZlmyJP2qTMOtOvxuiijczcO_UXm_zwIig/pub?gid=184342160&single=true&output=csv";
const DEFAULT_EVENT_LOG_URL = "";
const SHEET_URL_STORAGE_KEY = "nhl94CustomSheetUrls";
let teamUrl = DEFAULT_TEAM_URL; let playerUrl = DEFAULT_PLAYER_URL; let scheduleUrl = DEFAULT_SCHEDULE_URL; let eventLogUrl = DEFAULT_EVENT_LOG_URL;
let sheetSources = { TEAM: 'default sheet', PLAYER: 'default sheet', SCHEDULE: 'default sheet', EVENT_LOG: 'default sheet' };

// --- SHEET VALIDATION & LOADING ---

function hasSavedSheetUrlPreferences() { try { const r = localStorage.getItem(SHEET_URL_STORAGE_KEY); if(!r)return false; const p = JSON.parse(r); return Boolean(p.teamSheetUrl || p.playerSheetUrl || p.scheduleSheetUrl || p.eventLogSheetUrl); } catch{return false;} }
function setSheetSourceBadge(v, txt='Saved sheet settings loaded') { const b = document.getElementById('sheetUrlBadge'); if(b) { b.innerText = txt; b.style.display = v ? 'inline-block' : 'none'; } }
function resetSheetSourcesToDefault() { sheetSources = { TEAM: 'default sheet', PLAYER: 'default sheet', SCHEDULE: 'default sheet', EVENT_LOG: 'default sheet' }; }

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
            
            // Replace your loaded block with this:
            const loaded = rows.slice(1).map((row, rowIdx) => { 
                const obj = {}; 
                headers.forEach((h, i) => { 
                    let val = row[i] !== undefined ? String(row[i]).trim() : '';
                    obj[h] = val; 
                    
                    //  AUTO-DETECT: Look for the column named "Position" or "Pos" regardless of where it is
                    let upperHeader = String(h).toUpperCase().trim();
                    if (upperHeader === 'POSITION' || upperHeader === 'POS' || upperHeader === 'ROLE') { 
                        obj.pos = val.toUpperCase().replace(/\u00A0/g, ' ').trim();
                    }
                }); 
                
                // If the column was totally empty, default to F
                if (!obj.pos) obj.pos = 'F';

                // Print just the first 5 players to prove it found the right column
                if (rowIdx < 5) {
                    console.log(`âœ… DEBUG DATA PULL: ${obj.Name || 'Unknown'} | Mapped Pos: "${obj.pos}"`);
                }
                
                return obj;
            });
customRosterData = loaded; 
            customRosterSource = 'custom';
            
            alert(`Loaded ${customRosterData.length} entries. Starting custom roster game.`);
            await startNewGame(true);
        } catch (err) { 
            alert('Failed to load custom roster: ' + err.message); 
        } finally { 
            event.target.value = ''; 
        }
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



let gameStatus = {
    globalChaos: 0.28, // Base volatility — scales random shot-probability variance each tick
};

let momentum = {
    abs: 0.0,
    rel: 0.0,
    carryoverTimer: 0,
    bufferedFloor: 0
};
// =========================================================
//  UNIFIED MOMENTUM & CHAOS SYSTEM
// =========================================================

// Make sure your global object looks like this



let specialTeams = {
    active: false,
    teamAdvantage: null, // 'HOME' or 'AWAY'
    timeRemaining: 0,    // Penalty clock in seconds
    strength: '5v5'      // '5v5', '5v4', '5v3', '4v4', etc.
};

// =========================================================
//  UNIFIED PENALTY SYSTEM
// =========================================================

// Global Referee Strictness (Bell Curve 0.5 - 1.5)
const REF_STRICTNESS = (() => {
    const roll = (Math.random() + Math.random() + Math.random()) / 3; 
    return parseFloat((0.5 + (roll * 1.0)).toFixed(2)); 
})();

// ðŸ¥Š 1. THE HIT PENALTY ENGINE (Call this immediately after a hit is calculated)


// =========================================================
// ðŸ­ FACTORY FUNCTIONS FOR PLAYER STATS CREATION
// =========================================================
/**
 * Creates a standardized skater stats object
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} teamCode
 * @param {object} attributes - pre-parsed attr object
 * @returns {object} Complete skater stats object
 */

/**
 * Creates a standardized goalie stats object
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} teamCode
 * @param {object} attributes - pre-parsed attr object
 * @returns {object} Complete goalie stats object
 */
/**
 * Safely retrieve a nested stat value with default fallback
 * @param {string} playerName
 * @param {string} statPath - dot-notation path (e.g., 'attr.off', 'career.g')
 * @param {*} defaultValue - fallback if path not found
 * @returns {*} The stat value or default
 */

// --- INITIALIZATION ---
async function startNewGame(useCustomRoster = false) {  
    const btn = document.querySelector('button[onclick="startNewGame()"]'); 
    const origText = btn ? btn.innerText : "LOADING..."; 
    if (btn) { btn.innerText = "VALIDATING SATELLITE FEED..."; btn.disabled = true; }
    //  FIX: Only check the roster length if we are actually using a custom roster!
    if (useCustomRoster && customRosterData && customRosterData.length < 50) {
        alert("Warning: Custom roster appears too small. Check your CSV format.");
        if (btn) { btn.innerText = origText; btn.disabled = false; }
        return;
    }
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
        //  THE ULTIMATE COLUMN FINDER (Blocks "G DEF" from hijacking "DEF")
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
            
            //  THE FIX: Trust the CSV! Don't force them to 'F'!
            let pos = rawPos === 'LD' || rawPos === 'RD' || rawPos.startsWith('DEF') ? 'D' : rawPos;
            
            // Emergency fallback ONLY if the cell is completely empty or weird
            if (pos !== 'C' && pos !== 'LW' && pos !== 'RW' && pos !== 'D' && pos !== 'G') {
                pos = 'F'; 
            }

            if (pN && pN !== '') {
                if(!playerStats[pN]) {
                    rosters[tk].push({ name: pN, pos: pos });
                    playerStats[pN] = {
                        name: pN, team: teamObj.name, teamCode: teamObj.code, pos: pos, age: parseInt(getCol(r, ["AGE"], -1)) || (Math.floor(Math.random()*15)+18),
                        weight: parseWeightCell(getCol(r, ["WEIGHT", "WGT"], 21)).lbs,
                        streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, 
                        injury: { severity: 0, daysRemaining: 0 },
                        cumulativeFatigue: 0,
                        morale: 100,
                        suspended: { days: 0, reason: "" },
                        goalieDays: 0,
                        lastStart: -1, 
                        asgAppearances: parseInt(getCol(r, ["ASG", "ALL STAR", "APP"], 20)) || 0,
                        attr: { 
    // --- SKATER CORE STATS ---
    off: gradeToNum(getCol(r, ["OFFENSE RATING", "OFFENSE AWARENESS", "OFFENSIVE", "OFFENSE", "OFF"], 3)), 
    def: gradeToNum(getCol(r, ["DEFENSE RATING", "DEFENSE AWARENESS", "DEFENSIVE", "DEFENSE", "DEF"], 4)),

    // --- GOALIE CORE STATS ---
    // Looks for your specific goalie columns first!
    gDef: gradeToNum(getCol(r, ["GOALIE NEW OVERALL", "GOALIE DEFENSE RATING", "G DEF"], 7)),
    gOff: gradeToNum(getCol(r, ["GOALIE OFFENSE AWARENESS"], 10)),
    handed: getCol(r, ["HANDED"], -1) || 'L',

    // --- SHARED PHYSICALS (Checks for Goalie headers first, then Skater headers) ---
    speed: gradeToNum(getCol(r, ["GOALIE SPEED", "SPEED", "SPD"], 18)), 
    agil: gradeToNum(getCol(r, ["GOALIE AGILITY", "AGILITY", "AGL"], 17)), 

    // --- OTHER STATS ---
    shotPwr: gradeToNum(getCol(r, ["SHOT POWER", "PWR"], 9)),
    pass: gradeToNum(getCol(r, ["PASSING", "PASS", "PAS"], 10)),
    aggr: gradeToNum(getCol(r, ["AGGRESSION", "AGR"], 11)),
    rough: gradeToNum(getCol(r, ["ROUGHNESS", "RGH"], 12)),
    endur: gradeToNum(getCol(r, ["ENDURANCE", "END"], 13)),
    check: gradeToNum(getCol(r, ["CHECKING", "CHK"], 14)),
    shotAcc: gradeToNum(getCol(r, ["SHOT ACCURACY", "SHOT ACC", "ACC"], 15)),
    stkHnd: gradeToNum(getCol(r, ["PUCK CONTROL", "STICK HANDLING", "STICK", "STK"], 16)),
    weight: parseWeightCell(getCol(r, ["WEIGHT", "WGT"], 21)).grade,

    // --- OVERALL (Safe Fallback) ---
    ovr: parseInt(getCol(r, ["GOALIE NEW OVERALL", "OVERALL RATING", "OVERALL", "OVR"], 19)) || 70,

    // --- ORIGINAL GRADE STRINGS for exact card display ---
    grades: {
        speed:  getCol(r, ["GOALIE SPEED", "SPEED", "SPD"], 18)                              || 'C',
        agil:   getCol(r, ["GOALIE AGILITY", "AGILITY", "AGL"], 17)                          || 'C',
        shotPwr:getCol(r, ["SHOT POWER", "PWR"], 9)                                          || 'C',
        pass:   getCol(r, ["PASSING", "PASS", "PAS"], 10)                                    || 'C',
        aggr:   getCol(r, ["AGGRESSION", "AGR"], 11)                                         || 'C',
        rough:  getCol(r, ["ROUGHNESS", "RGH"], 12)                                          || 'C',
        endur:  getCol(r, ["ENDURANCE", "END"], 13)                                          || 'C',
        check:  getCol(r, ["CHECKING", "CHK"], 14)                                           || 'C',
        shotAcc:getCol(r, ["SHOT ACCURACY", "SHOT ACC", "ACC"], 15)                          || 'C',
        stkHnd: getCol(r, ["PUCK CONTROL", "STICK HANDLING", "STICK", "STK"], 16)            || 'C',
    }
                        },
                        potential: Math.random() < 0.05 ? 'Franchise' : (Math.random() < 0.25 ? 'Top 6' : (Math.random() < 0.60 ? 'Depth' : 'Bust')),
                        career: {
                            gp: parseInt(getCol(r, ["CAREER GP", "C_GP", "CAR GP", "CGP"], -1)) || 0,
                            g: parseInt(getCol(r, ["CAREER G", "C_G", "CAR G"], -1)) || 0, 
                            a: parseInt(getCol(r, ["CAREER A", "C_A", "CAR A"], -1)) || 0, 
                            pts: parseInt(getCol(r, ["CAREER PTS", "C_PTS", "CAR PTS"], -1)) || 0, 
                            pm: parseInt(getCol(r, ["CAREER PM", "C_PM", "CAR PM", "CAREER +/-"], -1)) || 0, 
                            pim: 0, ppg: 0, shg: 0, 
                            gwg: parseInt(getCol(r, ["CAREER GWG"], -1)) || 0, 
                            asg: parseInt(getCol(r, ["CAREER ASG", "ALL STAR"], -1)) || 0,
                            s: 0, awards: 0 
                        },
                        careerPlayoff: {
                            gp: parseInt(getCol(r, ["CAREER PLAYOFF GP"], -1)) || 0,
                            g: parseInt(getCol(r, ["CAREER PLAYOFF G"], -1)) || 0,
                            a: parseInt(getCol(r, ["CAREER PLAYOFF A"], -1)) || 0,
                            pts: parseInt(getCol(r, ["CAREER PLAYOFF PTS"], -1)) || 0,
                            pm: 0, pim: 0, ppg: 0, shg: 0, gwg: 0, s: 0, toi: 0, svg: 0
                        },
                        season: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0}, playoff: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0}
                    };
                }
            }
            // --- GOALIE CREATION ---
    // 1. Extract both First and Last Name columns from the spreadsheet
    const gLastName = getCol(r, ["GOALIE LAST NAME", "GOALIE NAME", "G NAME", "G_NAME"], 6);
    const gFirstName = getCol(r, ["GOALIE FIRST NAME", "G FIRST NAME"], -1);
    
    // 2. Combine them safely. (If a first name is missing, just use the last name)
    const gN = gFirstName ? `${gFirstName} ${gLastName}` : gLastName;

    // 3. Ensure the row is valid before building the player profile
    if (gLastName && gLastName.toUpperCase() !== 'TRUE' && gLastName.toUpperCase() !== 'G' && gLastName.toUpperCase() !== 'FALSE') {
        if(!playerStats[gN]) {
            rosters[tk].push({ name: gN, pos: 'G' });
            
            // 4. PULL ALL RAW GRADES AND CONVERT THEM TO NUMBERS
            let gAgil = gradeToNum(getCol(r, ["GOALIE AGILITY", "AGILITY", "AGL"], 17));
            let gDefAware = gradeToNum(getCol(r, ["GOALIE DEFENSE RATING", "DEFENSE AWARENESS", "DEFENSE"], 7));
            let gPuckCtrl = gradeToNum(getCol(r, ["PUCK CONTROL", "STICK HANDLING", "STICK", "STK"], 16));
            let gSpeed = gradeToNum(getCol(r, ["GOALIE SPEED", "SPEED", "SPD"], 18));
            
            // Pull the specific goalie pad stats
            let gStickR = gradeToNum(getCol(r, ["STICK RIGHT"], -1));
            let gStickL = gradeToNum(getCol(r, ["STICK LEFT"], -1));
            let gGloveR = gradeToNum(getCol(r, ["GLOVE RIGHT"], -1));
            let gGloveL = gradeToNum(getCol(r, ["GLOVE LEFT", "GLOVE LIEFT"], -1));

            // 5. APPLY YOUR CUSTOM WEIGHT MATRIX (Total Weight: 19.5)
            let calcOvr = (
                (gAgil * 5.0) + 
                (gDefAware * 5.0) + 
                (gPuckCtrl * 4.5) + 
                (gSpeed * 1.0) + 
                (gStickR * 1.0) + 
                (gStickL * 1.0) + 
                (gGloveR * 1.0) + 
                (gGloveL * 1.0)
            ) / 19.5;

            playerStats[gN] = {
                name: gN, team: teamObj.name, teamCode: teamObj.code, pos: 'G', age: parseInt(getCol(r, ["AGE"], -1)) || (Math.floor(Math.random()*15)+18), 
                streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false, 
                injury: { severity: 0, daysRemaining: 0 },
                cumulativeFatigue: 0,
                morale: 100,
                suspended: { days: 0, reason: "" },
                goalieDays: 0,
                lastStart: -1,
                asgAppearances: parseInt(getCol(r, ["GOALIE CAREER ALLSTAR GAMES", "GOALIE CAREER ALLSTAR"], -1)) || 0,

                // !! INJECT THE CALCULATED STATS DIRECTLY !!
                attr: { 
                    off: gradeToNum(getCol(r, ["GOALIE OFFENSE AWARENESS", "OFFENSE"], 10)) || 20, 
                    def: gDefAware || 20, 
                    gDef: gDefAware, 
                    agil: gAgil, 
                    speed: gSpeed,
                    stkHnd: gPuckCtrl,
                    stickR: gStickR, stickL: gStickL, gloveR: gGloveR, gloveL: gGloveL,
                    ovr: Math.round(calcOvr) // Bypass CSV overall and use custom calc!
                },
                
                potential: 'Depth',
                career: {
                    gp: parseInt(getCol(r, ["GOALIE CAREER GP", "GOALIE CAREER GAMES PLAYED", "G CAREER GP", "CAREER GP", "C_GP", "CAR GP", "CGP"], -1)) || 0,
                    g: 0, a: 0, pts: 0, pm: 0, pim: 0, ppg: 0,
                    w: parseInt(getCol(r, ["CAREER W", "C_W", "CAR W"], -1)) || 0,
                    l: parseInt(getCol(r, ["CAREER L", "C_L", "CAR L"], -1)) || 0,
                    t: parseInt(getCol(r, ["CAREER T", "C_T", "CAR T"], -1)) || 0,
                    so: parseInt(getCol(r, ["CAREER SO", "C_SO", "CAR SO"], -1)) || 0,
                    sv: parseInt(getCol(r, ["CAREER SV", "C_SV", "CAR SV"], -1)) || 0,
                    sa: parseInt(getCol(r, ["CAREER SA", "C_SA", "CAR SA"], -1)) || 0
                },
                careerPlayoff: {
                    gp: parseInt(getCol(r, ["CAREER PLAYOFF GP"], -1)) || 0,
                    w: parseInt(getCol(r, ["CAREER PLAYOFF W"], -1)) || 0,
                    l: parseInt(getCol(r, ["CAREER PLAYOFF L"], -1)) || 0,
                    t: 0,
                    so: parseInt(getCol(r, ["CAREER PLAYOFF SO"], -1)) || 0,
                    sv: parseInt(getCol(r, ["CAREER PLAYOFF SV"], -1)) || 0,
                    sa: parseInt(getCol(r, ["CAREER PLAYOFF SA"], -1)) || 0,
                    toi: 0, svg: 0
                },
                season: {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0,lastGAA: 0, lastSV: 0, consStarts: 0, toi:0, svg:0}, 
                playoff: {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, pim:0, ppg:0,lastGAA: 0, lastSV: 0, consStarts: 0, toi:0, svg:0}                    
            };
        }
    }     
        });

        await loadScheduleFromCSV(customScheduleData); populateTeamSelect(); updateTradeDropdowns(); takeMonthSnapshot(); assignTeamCaptains(); updateUI(); saveGame();
        document.getElementById('startScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; 
        if (btn) { btn.innerText = origText; btn.disabled = false; }
    } catch (error) { console.error(error); alert("ERROR: Could not load data."); if (btn) { btn.innerText = origText; btn.disabled = false; } }
    initializeFranchiseVariables();
}

// --- RATING ENGINE (WITH LIVE OVR + FATIGUE MATH) ---
// Per-game cache  -  cleared at the top of simGame() each game tick
let _wpCache = {};
let _structCache = {};
function clearWpCache() { _wpCache = {}; _structCache = {}; }

function getPlayerWeightedStats(pName) {
    if (_wpCache[pName]) return _wpCache[pName];
    const p = playerStats[pName];

    // !! FALLBACK UPDATE: If player doesn't exist, return a 57
    if (!p) return { ovr: 57, tag: 'NONE' };

    let baseOvr = 57;
    let tag = "NONE";

    // --- GOALIES ---
    if (p.pos === 'G') {
        // !! FALLBACK UPDATE: Default goalie rating is now 53
        let gDef = parseInt(p.attr.gDef || p.attr.def) || 53;
        baseOvr = gDef; 
        if (gDef > 84) tag = 'WALL';
        else tag = 'GOALTENDER';
    } 

    // --- SKATERS ---
    else {
        // 1. EXTRACT ALL RAW STATS FIRST
        let off = parseInt(p.attr.off) || 57;
        let def = parseInt(p.attr.def) || 57;
        let spd = gradeToNum(p.attr.speed);
        let agl = gradeToNum(p.attr.agil);
        let pwr = gradeToNum(p.attr.shotPwr);
        let pass = gradeToNum(p.attr.pass);
        let shotAcc = gradeToNum(p.attr.shotAcc);
        let stkHnd = gradeToNum(p.attr.stkHnd);
        let check = gradeToNum(p.attr.check);
        let rough = gradeToNum(p.attr.rough);
        let aggr = gradeToNum(p.attr.aggr);
        let endur = gradeToNum(p.attr.endur);
        let weight = getWgt(pName);
        let wgt = parseInt(p.attr.wgt || p.weight) || 180;

        // =========================================================
        // !! CUSTOM OVR FORMULAS
        // =========================================================
        let calcOvr = 0;
        if (p.pos === 'D') {
            // DEFENSEMAN WEIGHTS: Values Defense, Physicality, and Breakout Passing
            calcOvr = (
                (def * 0.37) +      // 37% Defense
                (off * 0.20) +      // 20% Offense
                (check * 0.10) +    // 10% Checking
                (pass * 0.10) +     // 10% Passing
                (spd * 0.06) +      // 6% Speed
                (agl * 0.06) +      // 6% Agility
                (pwr * 0.05) +      // 5% Shot Power
                (aggr * 0.04) +       // 4% Aggressiveness
                (endur * 0.02)        // 2% Endurance
            );
            baseOvr = Math.round(calcOvr);
        } else {
            // FORWARD WEIGHTS: Rewards pure scoring; DEF reduced so goal scorers aren't penalized
            calcOvr = (
                (off * 0.33) +      // 33% Offense
                (def * 0.10) +      // 10% Defense
                (shotAcc * 0.16) +  // 16% Shot Accuracy
                (pass * 0.12) +     // 12% Passing
                (stkHnd * 0.10) +   // 10% Stick Handling
                (pwr * 0.07) +      // 7% Shot Power
                (spd * 0.05) +      // 5% Speed
                (agl * 0.05) +      // 5% Agility
                (check * 0.01) +    // 1% Checking
                (endur * 0.01)      // 1% Endurance
            );
            baseOvr = Math.round(calcOvr);
        }

        // 2. ASSIGN TAGS BASED ON OVR
        // Calculate the difference between off and def for EVERYONE first!
        let diff = Math.abs(off - def);
        
        if (p.pos === 'D') {
            if (off >= 80 && def >= 80) tag = "FRANCHISE D";
            else if (off >= 75 && pass >= 80) tag = "QUARTERBACK";
            else if (pwr >= 85 && off >= 75) tag = "BOOMER"; 
            else if (def >= 75 && def > off && check >= 65 && aggr >= 65) tag = "SHUTDOWN"; 
            else if (rough >= 75 && aggr >= 75) tag = "ENFORCER D"; 
            else if (def >= 70 && off >= 70) tag = "TWO-WAY STAR D";
            else if (check >= 75) tag = "BIG HITTER";    
            // ==========================================
            // !! THE NEW PRO TIERS (DEFENSE)
            // ==========================================
            else if (off > def) {
                tag = (off >= 70) ? "PRO OFFENSIVE D" : tag;
                tag = (off <= 70) ? "OFFENSIVE D" : tag;
            }
            else if (diff <= 8) {
                tag = "TWO-WAY D"; 
            }
            else {
                tag = (def >= 70) ? "PRO DEFENSIVE D" : tag;
                tag = (def <= 70) ? "DEFENSIVE D" : tag;
            }
            
        }
        
        // --- FORWARDS ---
        else {
            if (baseOvr >= 85) tag = "SUPERSTAR";
            else if (shotAcc >= 80 && pwr >= 75 && off >= 80) tag = "SNIPER"; 
            else if (pass >= 80 && off >= 80) tag = "PLAYMAKER";
            // ENFORCER = both aggression AND roughness at B or above. Sits high in the
            // waterfall (above TWO-WAY STAR F / TWO-WAY FWD / OFFENSIVE FWD / DEFENSIVE FWD)
            // so a true goon profile is never re-labeled as a generic two-way/off/def forward.
            else if (rough >= 75 && aggr >= 75) tag = "ENFORCER F";
            else if (off >= 75 && def >= 75 && check >= 75 || aggr >= 75 && pass >= 75 && pwr >= 75 || shotAcc >= 75 ) tag = "TWO-WAY STAR F";
            else if (off >= 75 && agl >= 75 && spd >= 80) tag = "SPEEDSTER"; 
            else if (off >= 75 && agl >= 80 && stkHnd >= 80) tag = "DANGLER";
            else if (off >= 70 && check >= 65 && pwr >= 70 && aggr >= 65 && rough >= 65 && weight >= 215) tag = "POWER FORWARD";
            else if (def >= 65 && off >= 65 && check >= 60 && aggr >= 65 && rough >= 65 && weight <= 215) tag = "GRINDER";
            // Shutdown-style forward: strong defensive awareness without meeting any other archetype's
            // criteria above. Distinct from PRO DEFENSIVE FWD (which only requires def>=70 with no
            // offense floor) so a true 75+ defensive specialist reads as a distinct, named archetype.
            else if (def >= 75) tag = "DEFENSIVE SPECIALIST";
            else if (off >= 70) tag = "PRO OFFENSIVE FWD";
            else if (def >= 70) tag = "PRO DEFENSIVE FWD";
            
            // ==========================================
            // !! THE NEW PRO TIERS (FORWARDS)
            // ==========================================
            else if (off > def) {
                tag = (off <= 70) ? "OFFENSIVE FWD" : tag;
            }
            else if (diff <= 8) {
                tag = "TWO-WAY FWD";
            }
            else {
                tag = (def <= 70) ? "DEFENSIVE FWD" : tag;
            }
             
        }
    }
        
    // =========================================================
    // !! WEIGHT MODIFIER INJECTION ZONE !!
    // =========================================================
    let baseMod = (typeof archMods !== 'undefined' && archMods[tag]) ? archMods[tag].shotRate : 1.0;
    // =========================================================
    // !! WEIGHT MODIFIER INJECTION ZONE (FIXED) !!
    // =========================================================
    // Use stored numeric lbs  -  no random re-roll
    let weightMod = getWeightModifier(getWgt(pName), tag);
    
    // Instead of massively multiplying the rating, we apply a balanced flat adjustment
    if (weightMod >= 1.15) {
        baseOvr += 2; // +2 OVR boost for perfect archetype/weight synergy
    } else if (weightMod < 1.0) {
        baseOvr -= 2; // -2 OVR penalty for poor archetype/weight synergy
    } else if (weightMod > 1.0 && weightMod < 1.15) {
        baseOvr += 1; // +1 OVR minor boost
    }

    // Notice we completely removed the archMods.shotRate calculation from here!

    // =========================================================
    // !! LIVE OVR MATH (FATIGUE, ENDURANCE & MORALE) !!
    // =========================================================
    let finalOvr = baseOvr;
    
    // fatigue lives on playerStats as seasonTicks; morale is a top-level field — neither is on p.status
    const fatiguePenalty = typeof getPlayerFatigueAmount === 'function' ? getPlayerFatigueAmount(pName) : 0;
    const morale = p.morale !== undefined ? p.morale : 100;
    const endurance = parseInt(p.attr?.endurance || p.attr?.END || p.attr?.end) || 70;
    const endResistance = 1.2 - (endurance / 100);
    const penaltyPct = Math.min(fatiguePenalty / 100, 1) * 0.05 * endResistance;
    finalOvr = Math.round(baseOvr * (1 - penaltyPct));
    finalOvr += Math.round((morale - 100) * 0.18); // morale 50–150; 100 = neutral; softened further to a believable +-9 max

    // HOT/COLD streaks modify the player's own OVR — macro > micro; both can stack with dailySwing
    const ps = playerStats[pName];
    if (ps) {
        if (ps.macro_streak === 'HOT')       finalOvr = Math.round(finalOvr * 1.025);
        else if (ps.micro_streak === 'HOT')  finalOvr += 5;
        if (ps.macro_streak === 'COLD')      finalOvr = Math.round(finalOvr * 0.975);
        else if (ps.micro_streak === 'COLD') finalOvr -= 5;
        // dailySwing: pre-game per-player variance (±8% of ovr, set by applyDailyRandomSwing)
        if (ps.dailySwing) finalOvr = Math.round(finalOvr * (1 + ps.dailySwing));
    }
    // Always clamp to a believable range — previously this only happened inside the dailySwing
    // branch, so on any day without a swing roll, morale+streak stacking could push OVR to 150+ or below 0.
    finalOvr = Math.max(40, Math.min(99, finalOvr));

    const result = { ovr: finalOvr, tag: tag, baseOvr: baseOvr };
    _wpCache[pName] = result;
    return result;
}

// ==========================================
// --- EXPECTATION ENGINE & STREAKS ---
// ==========================================

// 1. The Auto-Coach Evaluation (Used for building lines)
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
        if (goalsAllowed >= 5 && scoreDeficit >= 4 && period <= 2) {
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

// 2. The Daily "Any Given Night" Micro Streaks (Run Pre-Game)
// Picks 1 HOT and 1 COLD at random from all dressed healthy players including the starting goalie.
function assignMicroStreaks(rosterArray, startingGoalie) {
    rosterArray.forEach(p => { if (playerStats[p.name]) playerStats[p.name].micro_streak = null; });

    const eligible = rosterArray.filter(p => {
        const ps = playerStats[p.name];
        return ps && (ps.injury?.daysRemaining ?? 0) === 0 && (!ps.suspended || ps.suspended.days === 0) && !ps.macro_streak && p.line !== 'BENCH';
    });
    // Include starting goalie if provided and healthy
    if (startingGoalie) {
        const gps = playerStats[startingGoalie.name];
        if (gps && (gps.injury?.daysRemaining ?? 0) === 0 && !gps.macro_streak && !eligible.find(p => p.name === startingGoalie.name)) {
            eligible.push(startingGoalie);
        }
    }
    if (eligible.length < 2) return;

    // Pure random pick — any dressed player equally likely
    const pickRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

    const hot = pickRandom(eligible);
    const remaining = eligible.filter(p => p.name !== hot.name);
    const cold = pickRandom(remaining);

    eligible.forEach(p => { const ps = playerStats[p.name]; if (ps) { ps.micro_streak = null; ps._prevMicro = null; } });
    if (playerStats[hot.name])  { playerStats[hot.name].micro_streak  = 'HOT';  playerStats[hot.name]._prevMicro  = 'HOT';  }
    if (playerStats[cold.name]) { playerStats[cold.name].micro_streak = 'COLD'; playerStats[cold.name]._prevMicro = 'COLD'; }
}

// 3. The 5-Game Rolling "Macro" Streaks (Run Post-Game)
function processPostGameStreaks(skaters, goalies, matchStats) {
    // --- SKATERS ---
    skaters.forEach(p => {
        let ps = playerStats[p.name];
        if (!ps) return;
        
        if (!ps.recentGames) ps.recentGames = [];
        
        // Push this game's stats (Points and Plus/Minus)
        const ms = (matchStats && matchStats[p.name]) || {};
        ps.recentGames.push({
            pts: (ms.g || 0) + (ms.a || 0),
            pm: ms.pm || 0
        });

        // Track consecutive pointless games
        const thisGamePts = (ms.g || 0) + (ms.a || 0);
        if (thisGamePts === 0) {
            ps.consPointless = (ps.consPointless || 0) + 1;
        } else {
            ps.consPointless = 0;
        }

        // Rolling window: 3-game sample
        if (ps.recentGames.length > 3) ps.recentGames.shift();

        // Evaluate ONLY if they have a full 3-game sample size
        if (ps.recentGames.length === 3) {
            let pts3 = ps.recentGames.reduce((sum, g) => sum + g.pts, 0);
            let pm3  = ps.recentGames.reduce((sum, g) => sum + g.pm,  0);
            let ovr  = getPlayerWeightedStats(p.name).ovr;

            if (!ps.coldCounter) ps.coldCounter = 0;
            if (!ps.hotCounter)  ps.hotCounter  = 0;

            // Determine whether this 3-game window meets HOT or COLD criteria
            let meetsHot = false, meetsCold = false;
            if (ovr >= 85) {
                meetsHot  = pts3 >= 5 && pm3 >= 0;
                meetsCold = pts3 === 0 && pm3 <= -2;
            } else if (ovr >= 70) {
                meetsHot  = pts3 >= 3 && pm3 >= 0;
                meetsCold = pts3 === 0 && pm3 <= -2;
            } else if (ovr >= 60) {
                meetsHot  = pts3 >= 3 && pm3 >= 1;
                meetsCold = ps.consPointless >= 5 && pm3 <= -3;
            } else {
                meetsHot  = pts3 >= 2 && pm3 >= 2;
                meetsCold = pm3 <= -5;
            }

            // HOT counter — builds on sustained good play, bleeds off when below threshold
            if (meetsHot) {
                ps.hotCounter  = Math.min(3, ps.hotCounter  + 1);
                ps.coldCounter = Math.max(0, ps.coldCounter - 1);
            } else {
                // Any window that fails the HOT threshold chips away at the counter
                ps.hotCounter = Math.max(0, ps.hotCounter - 1);
            }

            // COLD counter — builds on sustained slump, bleeds off when scoring
            if (meetsCold) {
                ps.coldCounter = Math.min(3, ps.coldCounter + 1);
                ps.hotCounter  = Math.max(0, ps.hotCounter  - 1);
            } else if (pts3 >= 1) {
                ps.coldCounter = Math.max(0, ps.coldCounter - 1);
            }

            // Tags require counter = 3 (sustained run in either direction)
            ps.macro_streak = null;
            if (ps.hotCounter  >= 3) ps.macro_streak = 'HOT';
            else if (ps.coldCounter >= 3) ps.macro_streak = 'COLD';
        }
    });

    // --- GOALIES ---
    goalies.forEach(g => {
        let ps = playerStats[g.name];
        if (!ps) return;
        
        if (!ps.recentStarts) ps.recentStarts = [];
        
        // Push this game's shots and saves
        const gms = (matchStats && matchStats[g.name]) || {};
        ps.recentStarts.push({
            sv: gms.sv || 0,
            sa: gms.sa || 0
        });
        
        // Rolling window: Keep only the last 3 starts
        if (ps.recentStarts.length > 3) ps.recentStarts.shift();

        if (ps.recentStarts.length === 3) {
            let totalSv = ps.recentStarts.reduce((sum, start) => sum + start.sv, 0);
            let totalSa = ps.recentStarts.reduce((sum, start) => sum + start.sa, 0);
            let svPct = totalSa > 0 ? (totalSv / totalSa) : 0;
            let ovr = getPlayerWeightedStats(g.name).ovr;

            if (!ps.hotCounter)  ps.hotCounter  = 0;
            if (!ps.coldCounter) ps.coldCounter = 0;

            let meetsHot = false, meetsCold = false;
            if (ovr >= 85) {
                meetsHot  = svPct >= 0.940;
                meetsCold = svPct <= 0.885;
            } else if (ovr >= 70) {
                meetsHot  = svPct >= 0.925;
                meetsCold = svPct <= 0.875;
            } else {
                meetsHot  = svPct >= 0.910;
                meetsCold = svPct <= 0.860;
            }

            if (meetsHot) {
                ps.hotCounter  = Math.min(3, ps.hotCounter  + 1);
                ps.coldCounter = Math.max(0, ps.coldCounter - 1);
            } else {
                ps.hotCounter = Math.max(0, ps.hotCounter - 1);
            }

            if (meetsCold) {
                ps.coldCounter = Math.min(3, ps.coldCounter + 1);
                ps.hotCounter  = Math.max(0, ps.hotCounter  - 1);
            } else if (svPct >= (ovr >= 85 ? 0.900 : ovr >= 70 ? 0.890 : 0.875)) {
                // Only bleed cold counter when play is meaningfully above the cold threshold
                ps.coldCounter = Math.max(0, ps.coldCounter - 1);
            }

            ps.macro_streak = null;
            if (ps.hotCounter  >= 3) ps.macro_streak = 'HOT';
            else if (ps.coldCounter >= 3) ps.macro_streak = 'COLD';
        }
    });
}


// ðŸ·ï¸ UI BADGE GENERATOR (2-Letter Abbreviation Version)
function getArchetypeBadge(pName) {
    const tag = getArch(pName);
    if (!tag || tag === 'NONE' || tag === 'GOALTENDER') return ''; 
    
    const abbrevMap = {
        'PLAYMAKER': 'PL',
        'SUPERSTAR': 'SS',
        'TWO-WAY STAR F': 'TSF',
        'SNIPER': 'SN',
        'DANGLER': 'DA',
        'SPEEDSTER': 'SP',
        'BOOMER': 'TNT',
        'POWER FORWARD': 'PF',
        'TWO-WAY STAR D': 'TSD',
        'TWO-WAY FWD': 'TWF',
        'GRINDER': 'GR',
        'ENFORCER F': 'EF',
        'FRANCHISE D': 'FD',
        'QUARTERBACK': 'QB',
        'SHUTDOWN': 'SD',
        'BIG HITTER': 'KO',
        'DEFENSIVE D': 'DD',
        'OFFENSIVE D': 'OD',
        'TWO-WAY D': 'TD',
        'PRO OFFENSIVE D': 'POD',
        'PRO DEFENSIVE D': 'PDD',
        'OFFENSIVE FWD': 'OF',
        'DEFENSIVE FWD': 'DF',
        'PRO OFFENSIVE FWD': 'POF',
        'PRO DEFENSIVE FWD': 'PDF',
        'DEFENSIVE SPECIALIST': 'DS',
        'ENFORCER D': 'ED',
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
    let skaters = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0 && !(playerStats[p.name].suspended?.days > 0)).slice(0, 18);
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
    const p = playerStats[pName]; 
    if (!p) return 0;

    // Start from the fully-computed OVR (morale, fatigue, streaks, dailySwing already baked in)
    let live = getPlayerWeightedStats(pName).ovr;
    // Return-from-injury penalty: eases off over several games (not in getPlayerWeightedStats)
    if (p.returnFromInjury && p.returnFromInjury > 0) live = Math.round(live * 0.93);
    
    // 4b. Captain Effect - a healthy/hot captain lifts team-wide morale; an injured/cold captain hurts it harder than a regular player would
    const tObj = league.find(t => t.code === p.teamCode);
    if (tObj) live += getCaptainChemModifier(tObj.nrm);

    // 5. Apply Line Chemistry
    if (tObj && tObj.chem && tObj.chem.lastUnit) {
        let chemVal = 0, isTelepathic = false;
        const lineIdx = tObj.chem.lastUnit.f.findIndex(l => l.some(x => x.name === pName));
        if (lineIdx !== -1) { 
            chemVal = tObj.chem.f[lineIdx] || 0; 
            if (tObj.chem.fYears && tObj.chem.fYears[lineIdx] >= 2) isTelepathic = true; 
        } 
        else { 
            const pairIdx = tObj.chem.lastUnit.d.findIndex(l => l.some(x => x.name === pName)); 
            if (pairIdx !== -1) { 
                chemVal = tObj.chem.d[pairIdx] || 0; 
                if (tObj.chem.dYears && tObj.chem.dYears[pairIdx] >= 2) isTelepathic = true; 
            } 
        }
        if (chemVal >= 10 && isTelepathic) live += 3;
        else if (chemVal >= 10) live += 2;
        else if (chemVal >= 5) live += 1;
    }

    return Math.max(40, Math.min(99, Math.round(live)));
}

function getDynamicTeamOvr(tk) {
    if (!rosters[tk] || rosters[tk].length === 0) return 0;
    
    // We get the structure here (which safely handles the custom overrides!)
    const struct = getRosterStructure(tk);
    
    // Defensive checks for struct properties
    if (!struct || !struct.f || !struct.d) return 0;
    
    const topSkaters = [...(struct.f[0] || []), ...(struct.f[1] || []), ...(struct.d[0] || []), ...(struct.d[1] || [])];
    const bottomSkaters = [...(struct.f[2] || []), ...(struct.f[3] || []), ...(struct.d[2] || [])];
    const calcAvg = (list) => list.length ? list.reduce((sum, p) => sum + getLiveIceOvr(p.name), 0) / list.length : 0;
    
    // Check if struct.g exists and has goalies
    const goalie = struct.g && struct.g.length > 0 ? struct.g[0] : null;
    const goalieOvr = goalie ? getLiveIceOvr(goalie.name) : 60;
    
    let finalOvr = Math.round((calcAvg(topSkaters) * 0.40) + (calcAvg(bottomSkaters) * 0.30) + (goalieOvr * 0.30));
    const allSkaters = [...topSkaters, ...bottomSkaters];
    if (allSkaters.length > 0) { 
        const bestOvr = getLiveIceOvr(allSkaters.reduce((b, c) => getLiveIceOvr(c.name) > getLiveIceOvr(b.name) ? c : b).name); 
        if (bestOvr >= 90) finalOvr += 1; 
        else if (bestOvr >= 85) finalOvr += 0.5; 
    }    
    return Math.max(0, finalOvr);
}

function playedYesterday(tk) { if (currentDay === 0 || !calendar[currentDay - 1]) return false; return calendar[currentDay - 1].some(g => (g.h && g.h.nrm === tk) || (g.a && g.a.nrm === tk)); }

function getPlayerFatigueAmount(pName) { 
    const p = playerStats[pName]; if (!p) return 0;
    let pen = 0; 
    let endur = gradeToNum(p.attr.endur) || 70;

    // ðŸ“… Back-to-Back Schedule Penalty
    if (playedYesterday(p.teamCode || p.team)) {
        if (endur >= 88) pen += 1;          // 'A' tier endurance
        else if (endur >= 75) pen += 4;     // 'B' tier endurance
        else pen += 8;                      // Low endurance crashes on back-to-backs
    }

    // In-Game Exhaustion (Covering for injured teammates)
    if (p.extra_shifts && p.extra_shifts > 0) {
        if (endur >= 88) pen += 2;
        else if (endur >= 75) pen += 5;
        else pen += 10; // Hitting the "3rd Period Wall"
    }

    // Season workload — stars with massive cumulative TOI wear down over 82 games
    // Threshold: A-endurance=900 ticks (~45 heavy games), B=700, C=500
    const seasonTicks = p.seasonTicks || 0;
    const endurThreshold = endur >= 88 ? 900 : endur >= 75 ? 700 : 500;
    if (seasonTicks > endurThreshold) {
        pen += Math.min(8, Math.floor((seasonTicks - endurThreshold) / 80));
    }

    return pen;
}

// --- LINES & SPECIAL TEAMS ---
//  5v5 TACTICAL AUTO-COACH ENGINE
//  DYNAMIC DUO REGISTRY
// Forces the auto-coach to draft these players onto the same line if both are healthy
const dynamicDuos = [
    // ANA
    ['Terry Yake', 'Anatoli Semenov', 'Stephan Lebeau'],
    ['Bob Corkum', 'Garry Valk', 'Tim Sweeney'],
    ['Bobby Dollas', 'Sean Hill'],
    ['Bill Houlder', 'Randy Ladouceur'],
    // BOS
    ['Adam Oates', 'Cam Neely', 'Glen Murray'],
    ['Bryan Smolinski', 'Dmitri Kvartalnov'],
    ['Ray Bourque', 'Al Iafrate'],
    ['Glen Wesley', 'Don Sweeney'],
    // BUF
    ['Pat LaFontaine', 'Yuri Khmylev', 'Donald Audette'],
    ['Alexander Mogilny', 'Dale Hawerchuk', 'Derek Plante'],
    ['Brad May', 'Rob Ray', 'Dave Hannan'],
    ['Doug Bodger', 'Richard Smehlik'],
    ['Petr Svoboda', 'Philippe Boucher'],
    // CGY
    ['Gary Roberts', 'Joe Nieuwendyk', 'German Titov'],
    ['Theoren Fleury', 'Robert Reichel'],
    ['Michael Nylander', 'Kelly Kisio', 'Joel Otto'],
    ['Zarley Zalapski', 'James Patrick'],
    // CHI
    ['Jeremy Roenick', 'Tony Amonte', 'Dirk Graham'],
    ['Brent Sutter', 'Rich Sutter', 'Christian Ruuttu'],
    ['Chris Chelios', 'Eric Weinrich'],
    ['Gary Suter', 'Steve Smith'],
    // DET
    ['Sergei Fedorov', 'Vachslav Kozlov'],
    ['Ray Sheppard', 'Steve Yzerman', 'Dino Ciccarelli'],
    ['Bob Probert', 'Shawn Burr'],
    ['Kris Draper', 'Darren McCarty'],
    ['Nicklas Lidstrom', 'Vladimir Konstantinov'],
    // EDM
    ['Jason Arnott', 'Zdeno Ciger'],
    ['Doug Weight', 'Shayne Corson'],
    ['Kelly Buchberger', 'Kirk Maltby'],
    ['Igor Kravchuk', 'Boris Mironov'],
    ['Bob Beers', 'Fredrik Olausson'],
    // FLA
    ['Andrei Lomakin', 'Jesse Belanger', 'Scott Mellanby'],
    ['Stu Barnes', 'Bob Kudelski', 'Rob Niedermayer'],
    ['Tom Fitzgerald', 'Dave Lowry'],
    ['Gord Murphy', 'Peter Andersson'],
    ['Geoff Smith', 'Brian Benning'],
    // HFD
    ['Andrew Cassels', 'Brendan Shanahan', 'Pat Verbeek', 'Geoff Sanderson'],
    ['Darren Turcotte', 'Robert Kron'],
    ['Mark Janssens', 'Jim Storm'],
    ['Chris Pronger', 'Adam Burt'],
    ['Frantisek Kucera', 'Alexander Godynyuk'],
    // LAK
    ['Wayne Gretzky', 'Jari Kurri', 'Luc Robitaille'],
    ['Rob Blake', 'Alexei Zhitnik'],
    ['Darryl Sydor', 'Marty McSorley'],
    // MIN
    ['Mike Modano', 'Russ Courtnall', 'Trent Klatt'],
    ['Dave Gagner', 'Pelle Eklund', 'Brent Gilchrist'],
    ['Mark Tinordi', 'Paul Cavallini'],
    ['Derian Hatcher', 'Doug Zmolek'],
    // MTL
    ['Vincent Damphousse', 'Brian Bellows', 'Benoit Brunet'],
    ['Kirk Muller', 'John LeClair'],
    ['Guy Carbonneau', 'Mike Keane', 'Ron Wilson'],
    ['Matt Schneider', 'J.J. Daigneault'],
    ['Patrice Brisebois', 'Eric Desjardins'],
    ['Lyle Odelein', 'Kevin Haller'],
    // NJD
    ['Stephane Richer', 'Bernie Nicholls', 'Claude Lemieux'],
    ['Alexnder Semak', 'John MacLean', 'Valeri Zelepukin'],
    ['Bobby Holik', 'Randy McKay', 'Bill Guerin'],
    ['Scott Stevens', 'Bruce Driver'],
    ['Scott Niedermayer', 'Vachslav Fetisov'],
    // NYI
    ['Derek King', 'Pierre Turgeon'],
    ['Ray Ferraro', 'Steve Thomas', 'Marty McInnis'],
    ['Patrick Flatley', 'Dave Volek'],
    ['Claude Loiselle', 'Mick Vukota'],
    ['Vladimir Malakhov', 'Uwe Krupp'],
    ['Darius Kasparaitis', 'Scott Lachance'],
    // NYR
    ['Mark Messier', 'Glenn Anderson', 'Adam Graves'],
    ['Steve Larmer', 'Alexei Kovalev', 'Sergei Nemchinov'],
    ['Craig MacTavish', 'Esa Tikkanen', 'Ed Olczyk'],
    ['Brian Leetch', 'Alex Karpotsev'],
    ['Sergei Zubov', 'Jeff Beukeboom'],
    // OTW
    ['Alexei Yashin', 'Sylvain Turgeon'],
    ['Alexandre Daigle', 'Evgeny Davydov'],
    ['Norm Maciver', 'Kerry Huffman'],
    ['Brad Shaw', 'Steve Konroyd'],
    // PHI
    ['Eric Lindros', 'Mark Recchi', 'John LeClair', 'Brent Fedyk'],
    ['Rod BrindAmour', 'Mikael Renberg', 'Josef Beranek'],
    ['Dave Tippett', 'Dave Brown'],
    ['Dimitri Yushkevich', 'Yves Racine'],
    ['Garry Galley', 'Rob Ramage'],
    // PIT
    ['Ron Francis', 'Jaromir Jagr', 'Rick Tocchet'],
    ['Mario Lemieux', 'Kevin Stevens', 'Tomas Sandstrom'],
    ['Joe Mullen', 'Martin Straka', 'Markus Naslund'],
    ['Larry Murphy', 'Kjell Samuelsson'],
    ['Greg Hawgood', 'Ulf Samuelsson'],
    // QUE
    ['Andrei Kovalenko', 'Mats Sundin', 'Valeri Kamensky'],
    ['Joe Sakic', 'Owen Nolan', 'Mike Ricci'],
    ['Ron Sutter', 'Claude Lapointe'],
    ['Bob Bassen', 'Chris Simon'],
    ['Curtis Leschyshyn', 'Alexei Gusarov'],
    ['Tommy Sjodin', 'Garth Butcher'],
    // SJS
    ['Igor Larionov', 'Sergei Makarov', 'Ray Whitney'],
    ['Ulf Dahlen', 'Pat Falloon'],
    ['Jeff Odgers', 'Gaetan Duchesne'],
    ['Sandis Ozolinsh', 'Mike Rathje'],
    ['Jeff Norton', 'Jay More'],
    // STL
    ['Brett Hull', 'Craig Janney', 'Vitali Prokhorov'],
    ['Brendan Shanahan', 'Petr Nedved'],
    ['Peter Stastny', 'Kevin Miller'],
    ['Phil Housley', 'Alexei Kasatonov'],
    ['Steve Duchesne', 'Doug Crossman'],
    ['Rick Zombo', 'Murray Baron'],
    // TBL
    ['Denis Savard', 'Rob Zamuner'],
    ['Brian Bradley', 'Petr Klima'],
    ['Chris Joseph', 'Shawn Chambers'],
    ['Roman Hamrlik', 'Marc Bergevin'],
    // TOR
    ['Doug Gilmour', 'Dave Andreychuk'],
    ['Wendel Clark', 'Mike Gartner'],
    ['Rob Pearson', 'Bill Berg'],
    ['Dave Ellett', 'Todd Gill'],
    ['Jamie Macoun', 'Dmitri Mironov'],
    // VAN
    ['Pavel Bure', 'Trevor Linden', 'Greg Adams'],
    ['Cliff Ronning', 'Geoff Courtnall'],
    ['Sergio Momesso', 'Martin Gelinas'],
    ['Gino Odjick', 'Shawn Antoski'],
    ['Jeff Brown', 'Gerald Diduck'],
    ['Jyrki Lumme', 'Jiri Slegr'],
    // WAS
    ['Joe Juneau', 'Peter Bondra', 'Dimitri Khristich'],
    ['Mike Ridley', 'Michal Pivonka'],
    ['Dale Hunter', 'Kelly Miller'],
    ['Craig Berube', 'Todd Krygier'],
    ['Kevin Hatcher', 'John Slaney'],
    ['Calle Johansson', 'Joe Reekie'],
    ['Sylvain Cote', 'Shawn Anderson'],
    // WPG
    ['Teemu Selanne', 'Alexei Zhamnov'],
    ['Thomas Steen', 'Keith Tkachuk'],
    ['Kris King', 'Tie Domi'],
    ['Igor Ulanov', 'Dave Manson'],
    ['Teppo Numminen', 'Stephane Quintal'],
];

function getAllDuos() { return [...dynamicDuos, ...customDuos]; }


// Example helper to ensure every player has a tag
function getTag(name) {
    return (typeof getPlayerWeightedStats === 'function' ? getPlayerWeightedStats(name)?.tag : null) || 'UNKNOWN';
}

// =========================================================
//  POSITION-AWARE LINE BUILDER HELPERS
// =========================================================
/**
 * Normalize and extract player position (C, LW, RW, D, G)
 * @param {object} player - Player object with pos property
 * @returns {string} Normalized position code
 */
function getPlayerPosition(player) {
    if (!player) return 'F';
    
    // 1. Get raw value
    let p = String(player.pos || '').toUpperCase().trim();
    
    // 2. Debug: warn only on truly unknown values (F is a valid roster CSV position)
    if (p !== 'C' && p !== 'LW' && p !== 'RW' && p !== 'D' && p !== 'G' && p !== 'F') {
        console.log(`âš ï¸ POSITION WARNING: Player "${player.name}" has unmapped pos: "${p}"`);
    }

    // 3. Strict Map
    if (p === 'C') return 'C';
    if (p === 'LW') return 'LW';
    if (p === 'RW') return 'RW';
    if (p === 'D') return 'D';
    if (p === 'G') return 'G';
    
    return 'F'; // Only returns F if no match is found
}


function getLineMates(playerName) {
    for (let pair of getAllDuos()) {
        if (pair.includes(playerName)) return pair.filter(name => name !== playerName);
    }
    return null;
}

function renderTeamDirectory(tk) {
    const struct = getRosterStructure(tk); 
    const container = document.getElementById('teamRosterContainer'); 
    
    if (!container) {
        console.error("Error: teamRosterContainer not found!");
        return;
    }

    if (!struct || !struct.f) {
        console.error("Error: getRosterStructure returned empty data for:", tk);
        container.innerHTML = `<div style="color:red">No roster data available for ${tk}</div>`;
        return;
    }
    
    let h = `<div class="roster-grid">`;
    
    // Render Forward Lines (1-4) with position labels
    h += `<div style="margin-bottom:24px;">`;
    h += `<div style="color:var(--ea-yellow); font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;"> FORWARD LINES</div>`;
    struct.f.forEach((line, idx) => {
        h += `<div style="background:#1a1a1a; padding:12px; margin-bottom:8px; border-left:4px solid var(--neon-cyan); border-radius:4px;">`;
        h += `<strong style="color:var(--neon-cyan); display:block; margin-bottom:8px;">LINE ${idx + 1}</strong>`;
        
        let positions = ['C', 'LW', 'RW'];
        for (let i = 0; i < 3; i++) {
            let p = line[i];
            let posLabel = positions[i];
            h += `<div style="display:flex; gap:8px; margin-bottom:6px; align-items:center;">`;
            h += `<span style="color:var(--ea-yellow); font-weight:bold; min-width:30px;">${posLabel}</span>`;
            h += `<span style="color:#fff;">${p ? p.name : '---'} ${getPlayerBadges(p.name)}</span>`;
            h += `</div>`;
        }
        h += `</div>`;
    });
    h += `</div>`;

    // Render Defense Pairs (1-3) 
    h += `<div style="margin-bottom:24px;">`;
    h += `<div style="color:var(--line-red); font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;"> DEFENSE PAIRS</div>`;
    struct.d.forEach((pair, idx) => {
        h += `<div style="background:#1a1a1a; padding:12px; margin-bottom:8px; border-left:4px solid var(--line-red); border-radius:4px;">`;
        h += `<strong style="color:var(--line-red); display:block; margin-bottom:8px;">PAIR ${idx + 1}</strong>`;
        
        for (let i = 0; i < 2; i++) {
            let p = pair[i];
            h += `<div style="display:flex; gap:8px; margin-bottom:6px; align-items:center;">`;
            h += `<span style="color:var(--line-red); font-weight:bold; min-width:30px;">D</span>`;
            h += `<span style="color:#fff;">${p ? p.name : '---'} ${getPlayerBadges(p.name)}</span>`;
            h += `</div>`;
        }
        h += `</div>`;
    });
    h += `</div>`;

    // Render Goalies
    h += `<div>`;
    h += `<div style="color:#FFD700; font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;"> GOALIES</div>`;
    let goalies = struct.g || [];
    h += `<div style="background:#1a1a1a; padding:12px; margin-bottom:8px; border-left:4px solid #FFD700; border-radius:4px;">`;
    h += `<strong style="color:#FFD700; display:block; margin-bottom:8px;">STARTER</strong>`;
    h += `<div style="display:flex; gap:8px; align-items:center;">`;
    h += `<span style="color:#FFD700; font-weight:bold; min-width:30px;">G</span>`;
    h += `<span style="color:#fff;">${goalies[0] ? goalies[0].name : '---'}</span>`;
    h += `</div></div>`;
    
    if (goalies[1]) {
        h += `<div style="background:#1a1a1a; padding:12px; border-left:4px solid #FFD700; border-radius:4px;">`;
        h += `<strong style="color:#FFD700; display:block; margin-bottom:8px;">BACKUP</strong>`;
        h += `<div style="display:flex; gap:8px; align-items:center;">`;
        h += `<span style="color:#FFD700; font-weight:bold; min-width:30px;">G</span>`;
        h += `<span style="color:#fff;">${goalies[1].name}</span>`;
        h += `</div></div>`;
    }
    h += `</div>`;

    // Injured Reserve section
    const irPlayers = (rosters[tk] || []).filter(p => playerStats[p.name]?.onIR);
    const injuredNotIR = (rosters[tk] || []).filter(p => {
        const ps = playerStats[p.name];
        return ps && !ps.onIR && ps.injury && ps.injury.daysRemaining > 0;
    });
    if (irPlayers.length || injuredNotIR.length) {
        h += `<div style="margin-top:20px; border-top:1px solid #2a0000; padding-top:12px;">`;
        h += `<div style="color:#FF5555; font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;">INJURED RESERVE</div>`;
        irPlayers.forEach(p => {
            const ps = playerStats[p.name];
            const daysLeft = ps?.injury?.daysRemaining || 0;
            const totalDays = ps?.irTotalDays || daysLeft || 1;
            const dayOnIR = ps?.irDay != null ? currentDay - ps.irDay : null;
            const pctHealed = Math.min(1, totalDays > 0 ? 1 - (daysLeft / totalDays) : 1);
            const timelineHtml = dayOnIR != null ? `
                <div style="background:#2a0000;border-radius:2px;height:4px;margin-top:4px;overflow:hidden;">
                    <div style="height:100%;width:${Math.round(pctHealed*100)}%;background:${daysLeft===0?'#00FF88':'#FF5555'};border-radius:2px;"></div>
                </div>
                <div style="color:#555;font-size:6px;margin-top:2px;">Day ${dayOnIR} of ~${totalDays}</div>` : '';
            h += `<div style="background:#1a0000; padding:8px 12px; margin-bottom:6px; border-left:4px solid #FF5555;">`;
            h += `<div style="display:flex; align-items:center; justify-content:space-between;">`;
            h += `<span style="color:#FF8888; font-size:9px;">[IR] ${p.name} <span style="color:#555; font-size:8px;">${daysLeft > 0 ? `(${daysLeft}d remaining)` : '(READY TO ACTIVATE)'}</span></span>`;
            h += `<button onclick="activateFromIR('${p.name}','${tk}')" style="font-size:6px; padding:3px 8px; border-color:${daysLeft === 0 ? '#00FF88' : '#555'}; color:${daysLeft === 0 ? '#00FF88' : '#555'}; cursor:pointer;">${daysLeft === 0 ? 'ACTIVATE' : 'NOT YET'}</button>`;
            h += `</div>${timelineHtml}</div>`;
        });
        injuredNotIR.forEach(p => {
            const ps = playerStats[p.name];
            const daysLeft = ps?.injury?.daysRemaining || 0;
            h += `<div style="background:#0d0d0d; padding:8px 12px; margin-bottom:6px; border-left:4px solid #884444; display:flex; align-items:center; justify-content:space-between;">`;
            h += `<span style="color:#aa6666; font-size:9px;">${p.name} [INJ ${daysLeft}d]</span>`;
            h += `<button onclick="placeOnIR('${p.name}','${tk}')" style="font-size:6px; padding:3px 8px; border-color:#FF5555; color:#FF5555; cursor:pointer;">PLACE ON IR</button>`;
            h += `</div>`;
        });
        h += `</div>`;
    }

    h += `</div>`;
    container.innerHTML = h;
}

const getRosterStructure = (tk) => {
    if (_structCache[tk]) return _structCache[tk];
    let r = rosters[tk] || [];

    // Local helper — avoids dependency on getLineOvr defined 2700 lines later
    const localLineOvr = (line) => line.length === 0 ? 0 : line.reduce((s,p) => s + (getPlayerWeightedStats(p.name).ovr||70), 0) / line.length;

    // -- Honor custom lines if the coach saved them ------------------------
    if (customLines[tk]) {
        const cl = customLines[tk];
        const isHealthy = n => { const ps = playerStats[n]; return ps && !ps.onIR && (!ps.injury || ps.injury.daysRemaining === 0) && (!ps.suspended || ps.suspended.days === 0); };
        const byName = n => { const p = r.find(pl => pl.name === n); return (p && isHealthy(n)) ? p : null; };
        // Dedupe across the whole group — a player may only occupy ONE slot
        const resolveGroup = (nameArrays, fallback) => {
            const seen = new Set();
            return nameArrays.map(slots => slots
                .filter(n => { if (seen.has(n)) return false; seen.add(n); return true; })
                .map(n => byName(n)).filter(Boolean));
        };
        const customF = cl.f ? resolveGroup(cl.f) : null;
        const customD = cl.d ? resolveGroup(cl.d) : null;
        const customG = cl.g ? cl.g.map(n => byName(n)).filter(Boolean) : null;
        if (customF && customF.flat().length > 0) {
            // Pad missing lines with empty arrays
            while (customF.length < 4) customF.push([]);
            while ((customD||[]).length < 3) (customD||[]).push([]);
            return {
                f: customF,
                d: customD || [[], [], []],
                g: customG || r.filter(p => p.pos === 'G')
            };
        }
    }

    // 1. DATA PREP
    const getPos = (p) => getPlayerPosition(p);
    const getTag = (p) => getPlayerWeightedStats(p.name).tag || '';
    const getOff = (p) => parseInt(playerStats[p.name]?.attr?.off) || 0;
    const getDef = (p) => parseInt(playerStats[p.name]?.attr?.def) || 0;
    const getOvr = (p) => getPlayerWeightedStats(p.name).ovr || 0;

    let healthySkaters = r.filter(p => {
        let ps = playerStats[p.name];
        return getPos(p) !== 'G' && ps && !ps.onIR
            && (!ps.injury || ps.injury.daysRemaining === 0)
            && (!ps.suspended || ps.suspended.days === 0);
    });

    let fPool = healthySkaters.filter(p => getPos(p) !== 'D')
        .sort((a,b) => getOvr(b) - getOvr(a));
    let dPool = healthySkaters.filter(p => getPos(p) === 'D')
        .sort((a,b) => getOvr(b) - getOvr(a)); 

    let fLines = [[], [], [], []];
    let usedNames = new Set();
    const maxForwards = 12; 

    // 2. INTERNAL SYNERGY TOOLS
    const canAddPlayer = (p, line, isSynergyMate = false) => {
        if (line.length >= 3) return false;
        if (isSynergyMate) return true; // Synergy mates ignore archetype rules
        let tag = getTag(p);
        if (tag === 'SUPERSTAR' && line.some(x => getTag(x) === 'SUPERSTAR')) return false;
        if (tag === 'SNIPER' && line.some(x => getTag(x) === 'SNIPER')) return false;
        if (tag === 'PLAYMAKER' && line.some(x => getTag(x) === 'PLAYMAKER')) return false;
        return true;
    };

    const triggerSynergies = (player, lineIdx) => {
        let line = fLines[lineIdx];
        if (!player) return;

        // Dynamic Duos / Trios — hardcoded linemates take ABSOLUTE PRECEDENCE.
        // If the line is full, bump the lowest-OVR non-center non-duo player to make room.
        let mates = getLineMates(player.name);
        if (mates) {
            let mateList = Array.isArray(mates) ? mates : [mates];
            const duoSet = new Set([player.name, ...mateList]);
            mateList.forEach(mateName => {
                let mate = fPool.find(x => x.name === mateName && !usedNames.has(x.name));
                if (!mate) return;
                if (line.length < 3) {
                    line.push(mate);
                    usedNames.add(mate.name);
                } else {
                    // Line full — bump lowest-OVR non-center player not in this duo
                    const bumpable = line
                        .filter(x => getPos(x) !== 'C' && !duoSet.has(x.name))
                        .sort((a, b) => getOvr(a) - getOvr(b));
                    if (bumpable.length > 0) {
                        const victim = bumpable[0];
                        line.splice(line.indexOf(victim), 1);
                        usedNames.delete(victim.name);
                        line.push(mate);
                        usedNames.add(mate.name);
                    }
                }
            });
        }

        // Archetype Match (Sniper + Playmaker) — only if room remains
        if (line.length >= 3) return;
        let tag = getTag(player);
        let synTarget = tag === 'SNIPER' ? 'PLAYMAKER' : (tag === 'PLAYMAKER' ? 'SNIPER' : null);
        if (synTarget && line.length < 3) {
            let partner = fPool.find(x => !usedNames.has(x.name) && getTag(x) === synTarget && canAddPlayer(x, line, false));
            if (partner) {
                line.push(partner);
                usedNames.add(partner.name);
            }
        }
    };

    // 3. BUILD LINES & CENTER PLATOON
    let allCenters = fPool.filter(p => getPos(p) === 'C').sort((a,b) => getOvr(b) - getOvr(a));
    
    // Emergency C fix
    if (allCenters.length < 4) {
        let nonCenters = fPool.filter(p => getPos(p) !== 'C').sort((a,b) => getOvr(b) - getOvr(a));
        while(allCenters.length < 4 && nonCenters.length > 0) allCenters.push(nonCenters.shift());
    }

    //  PLATOON LOGIC: Position-Shifting for Center Depth
    let startingCenters = [null, null, null, null];
    
    if (allCenters.length > 4) {
        // SURPLUS PROTOCOL: We have more than 4 centers!
        
        // 1. Lock the elite centers to the top 2 lines based strictly on OVR
        startingCenters[0] = allCenters[0];
        startingCenters[1] = allCenters[1];
        
        // 2. Force the absolute worst center to the 4th line (so better centers can play wing)
        startingCenters[3] = allCenters[allCenters.length - 1];
        
        // 3. Find the best defensive center from the remaining middle pack for Line 3
        let middlePack = allCenters.slice(2, allCenters.length - 1);
        middlePack.sort((a, b) => getDef(b) - getDef(a)); // Sort highest DEF to lowest
        startingCenters[2] = middlePack[0]; 
        
        // NOTE: Any center left in the 'middlePack' array is ignored here. 
        // Because they aren't added to 'usedNames' yet, your Winger Draft will 
        // naturally scoop them up for L1/L2/L3 if their OFF/DEF beats the natural wingers!
        
    } else {
        // STANDARD PROTOCOL: 4 or fewer centers
        startingCenters[0] = allCenters[0];
        startingCenters[1] = allCenters[1];
        
        let c3 = allCenters[2];
        let c4 = allCenters[3];

        if (c3 && c4) {
            // Compare their Defense ratings to build a true checking line
            if (getDef(c4) > getDef(c3)) {
                startingCenters[2] = c4;
                startingCenters[3] = c3;
            } else {
                startingCenters[2] = c3;
                startingCenters[3] = c4;
            }
        } else {
            startingCenters[2] = c3;
            startingCenters[3] = c4;
        }
    }

    // Assign Forced Centers
    [0, 1, 2, 3].forEach((idx) => {
        let c = startingCenters[idx];
        if (c) { 
            fLines[idx].push(c); 
            usedNames.add(c.name); 
            triggerSynergies(c, idx); 
        }
    });

    const safeDraft = (lineIdx, sortFn) => {
        while (fLines[lineIdx].length < 3 && usedNames.size < maxForwards) {
            let available = fPool.filter(p => !usedNames.has(p.name)).sort(sortFn);
            let picked = false;
            for (let p of available) {
                if (canAddPlayer(p, fLines[lineIdx], false)) {
                    fLines[lineIdx].push(p);
                    usedNames.add(p.name);
                    triggerSynergies(p, lineIdx);
                    picked = true;
                    break;
                }
            }
            // No valid candidate exists — stop rather than loop forever
            if (!picked) break;
        }
    };

    // ==========================================
    //  5. WINGER DRAFT (TOP 6 SNAKE SEQUENCE)
    // ==========================================
    let sortOff = (a, b) => (getOvr(b) - getOvr(a)) || (getOff(b) - getOff(a));
    let sortDef = (a, b) => (getDef(b) - getDef(a)) || (getOvr(b) - getOvr(a));
    let sortOvrDesc = (a, b) => getOvr(b) - getOvr(a);

    // Custom function to draft exactly ONE winger at a time
    const draftSingleWinger = (lineIdx, sortFn) => {
        if (fLines[lineIdx].length >= 3) return false; // Skip if the line is already full
        
        let available = fPool.filter(p => !usedNames.has(p.name)).sort(sortFn);
        for (let p of available) {
            if (canAddPlayer(p, fLines[lineIdx], false)) {
                fLines[lineIdx].push(p); 
                usedNames.add(p.name);
                triggerSynergies(p, lineIdx); // Instantly check if this pick triggered a duo!
                return true; 
            }
        }
        return false;
    };

    // ðŸ The Snake Draft: Line 1, Line 2, Line 2, Line 1
    // We add a few extra turns at the end (0, 1) just in case a chemistry lockout 
    // forces a skip and we need to make sure the top 6 gets completely filled.
    const snakeTurns = [0, 1, 1, 0, 0, 1]; 
    
    for (let turn of snakeTurns) {
        draftSingleWinger(turn, sortOff);
    }

    // Failsafe: If bizarre chemistry completely broke the snake, force them full
    safeDraft(0, sortOff); 
    safeDraft(1, sortOff); 

    // ==========================================
    //  BOTTOM 6 WINGER DRAFT
    // ==========================================
    // Line 3 prioritizes Defense/Two-Way. Line 4 takes the best remaining.
    safeDraft(2, sortDef);
    safeDraft(3, sortOvrDesc);

    // Failsafe: anti-stacking may have rejected every remaining candidate for L3/L4
    // (e.g. leftover forwards all sharing a tag already seated on that line) — force-fill
    // any still-short line from the remaining pool so no forward is left off the roster.
    [2, 3].forEach(lineIdx => {
        while (fLines[lineIdx].length < 3 && usedNames.size < maxForwards) {
            let available = fPool.filter(p => !usedNames.has(p.name)).sort(sortOvrDesc);
            if (!available.length) break;
            const p = available[0];
            fLines[lineIdx].push(p);
            usedNames.add(p.name);
            triggerSynergies(p, lineIdx);
        }
    });

    // ==========================================
    //  5b. POST-DRAFT SYNERGY REBALANCER
    // ==========================================
    const hasAnySynergy = (p, line) => {
        let mates = getLineMates(p.name);
        if (mates && line.some(x => mates.includes(x.name))) return true;
        let tag = getTag(p);
        if (tag === 'SNIPER' && line.some(x => getTag(x) === 'PLAYMAKER')) return true;
        if (tag === 'PLAYMAKER' && line.some(x => getTag(x) === 'SNIPER')) return true;
        return false;
    };

    const getLineIdx = (pName) => [0,1,2,3].findIndex(i => fLines[i].some(x => x.name === pName));

    for (let i = 0; i < 2; i++) { // Check L1 and L2
        let line = fLines[i];
        for (let j = line.length - 1; j >= 0; j--) {
            let p = line[j];
            
            // If they are isolated on the top line (no synergies)
            if (!hasAnySynergy(p, line)) {
                let mates = getLineMates(p.name);
                let mateLineIdx = -1;
                
                // Look for their mate
                if (mates) {
                    for (let mateName of mates) {
                        let idx = getLineIdx(mateName);
                        if (idx === 2 || idx === 3) { mateLineIdx = idx; break; }
                    }
                }

                // If mate is found on L3 or L4, move them down!
                if (mateLineIdx !== -1) {
                    let targetLine = fLines[mateLineIdx];
                    let isCenter = getPos(p) === 'C'; //  Remember their position!
                    
                    // 1. If target line is full, bounce the lowest-rated non-center back to free agency
                    if (targetLine.length >= 3) {
                        let bounceCandidates = targetLine.filter(x => getPos(x) !== 'C').sort((a,b) => getOvr(a) - getOvr(b));
                        if (bounceCandidates.length > 0) {
                            let bounceVictim = bounceCandidates[0];
                            targetLine.splice(targetLine.indexOf(bounceVictim), 1);
                            usedNames.delete(bounceVictim.name); //  Releases them to be drafted by the top line!
                        }
                    }

                    // 2. Move player down
                    targetLine.push(p);
                    line.splice(j, 1);

                    // 3. Redraft L1/L2 empty spot with STRICT position matching
                    // If replacing a C, look for a C. If replacing a Wing, look for Wingers (which now includes the bounceVictim)
                    let available = fPool.filter(x => !usedNames.has(x.name) && (isCenter ? getPos(x) === 'C' : getPos(x) !== 'C')).sort(sortOff);
                    
                    // Fallback just in case we ran completely out of that position
                    if (available.length === 0) {
                        available = fPool.filter(x => !usedNames.has(x.name)).sort(sortOff);
                    }

                    let redrafted = false;
                    for (let cand of available) {
                        if (canAddPlayer(cand, line, false)) {
                            // Put centers back at the front of the line so your UI looks correct
                            if (isCenter) line.unshift(cand);
                            else line.push(cand);

                            usedNames.add(cand.name);
                            redrafted = true;
                            break;
                        }
                    }
                    // Anti-stacking rejected every candidate (e.g. the bounced player is a
                    // SUPERSTAR and this line already has one) — force-add the best remaining
                    // one anyway. A minor archetype stack beats silently vanishing a healthy
                    // player off every line for the rest of the game.
                    if (!redrafted && available.length > 0) {
                        const cand = available[0];
                        if (isCenter) line.unshift(cand); else line.push(cand);
                        usedNames.add(cand.name);
                    }
                }
            }
        }
    }

    // Line 1 & 2 Rank Enforcement (Swap if L2 ended up stronger than L1)
    if (localLineOvr(fLines[1]) > localLineOvr(fLines[0])) {
        let temp = fLines[0]; fLines[0] = fLines[1]; fLines[1] = temp;
    }

    // BIDIRECTIONAL SYNERGY PASS — promote players on L3/L4 who have a duo mate on L1/L2
    for (let lowerIdx = 2; lowerIdx <= 3; lowerIdx++) {
        let line = fLines[lowerIdx];
        for (let j = line.length - 1; j >= 0; j--) {
            let p = line[j];
            let mates = getLineMates(p.name);
            if (!mates) continue;
            let mateList = Array.isArray(mates) ? mates : [mates];
            for (let mateName of mateList) {
                let upperIdx = [0,1].findIndex(i => fLines[i].some(x => x.name === mateName));
                if (upperIdx === -1) continue;
                let targetLine = fLines[upperIdx];
                if (targetLine.length >= 3) {
                    // Bounce lowest-OVR non-center from upper line to make room
                    let bounce = targetLine.filter(x => getPos(x) !== 'C').sort((a,b) => getOvr(a)-getOvr(b))[0];
                    if (!bounce) continue;
                    targetLine.splice(targetLine.indexOf(bounce), 1);
                    line.push(bounce);
                }
                targetLine.push(p);
                line.splice(j, 1);
                break;
            }
        }
    }
    // Re-enforce rank after bidirectional pass
    if (localLineOvr(fLines[1]) > localLineOvr(fLines[0])) {
        let temp = fLines[0]; fLines[0] = fLines[1]; fLines[1] = temp;
    }

    // FINAL DUO REUNION SWEEP (single pass, pre-filtered to this team's duos only)
    const fNameSet = new Set(fLines.flat().map(p => p.name));
    const teamFDuos = getAllDuos().filter(g => g.filter(n => fNameSet.has(n)).length >= 2);
    for (const group of teamFDuos) {
        const placed = group
            .map(name => ({ name, lineIdx: [0,1,2,3].findIndex(i => fLines[i].some(p => p.name === name)) }))
            .filter(x => x.lineIdx !== -1);
        if (placed.length < 2) continue;
        if (new Set(placed.map(x => x.lineIdx)).size === 1) continue;
        const anchorEntry = placed.reduce((best, cur) => {
            const pCur = fLines[cur.lineIdx].find(x => x.name === cur.name);
            const pBest = fLines[best.lineIdx].find(x => x.name === best.name);
            return getOvr(pCur) >= getOvr(pBest) ? cur : best;
        });
        const anchorIdx = anchorEntry.lineIdx;
        const targetLine = fLines[anchorIdx];
        const groupSet = new Set(group);
        for (const { name, lineIdx } of placed) {
            if (lineIdx === anchorIdx) continue;
            const sourceLine = fLines[lineIdx];
            const mover = sourceLine.find(x => x.name === name);
            if (!mover) continue;
            if (targetLine.length >= 3) {
                const bumpable = targetLine
                    .filter(x => getPos(x) !== 'C' && !groupSet.has(x.name))
                    .sort((a, b) => getOvr(a) - getOvr(b));
                if (!bumpable.length) continue;
                const victim = bumpable[0];
                targetLine.splice(targetLine.indexOf(victim), 1);
                sourceLine.push(victim);
            }
            sourceLine.splice(sourceLine.indexOf(mover), 1);
            targetLine.push(mover);
        }
    }
    // Re-enforce rank one final time after reunion
    if (localLineOvr(fLines[1]) > localLineOvr(fLines[0])) {
        let temp = fLines[0]; fLines[0] = fLines[1]; fLines[1] = temp;
    }

    // ===========================================================
    //  6. DEFENSE PAIRS - DYNAMIC DRAFTING & SYNERGY SEQUENCE
    // ===========================================================
    let dPairs = [[], [], []];
    let dUsed = new Set(); // <--- This tracks who has been drafted so they don't get cloned!

    // The Chemistry Veto checker
    const canAddDefenseman = (p, pair) => {
        if (pair.length >= 2) return false;
        return true;
    };

    // The central drafting function that powers the whole engine
    const draftD = (p, pairIdx) => {
        if (!p || dPairs[pairIdx].length >= 2 || dUsed.has(p.name)) return;
        dPairs[pairIdx].push(p);
        dUsed.add(p.name);
        triggerDSynergies(p, pairIdx);
    };

    // Duo-aware synergy trigger for D-pairs — mirrors forward triggerSynergies.
    // Hardcoded pair mates take precedence; bumps lowest-OVR non-duo player if pair is full.
    const triggerDSynergies = (player, pairIdx) => {
        if (!player) return;
        const pair = dPairs[pairIdx];
        const mates = getLineMates(player.name);
        if (!mates) return;
        const mateList = Array.isArray(mates) ? mates : [mates];
        const duoSet = new Set([player.name, ...mateList]);
        mateList.forEach(mateName => {
            const mate = dPool.find(x => x.name === mateName && !dUsed.has(x.name));
            if (!mate) return;
            if (pair.length < 2) {
                pair.push(mate);
                dUsed.add(mate.name);
            } else {
                const bumpable = pair
                    .filter(x => !duoSet.has(x.name))
                    .sort((a, b) => getOvr(a) - getOvr(b));
                if (bumpable.length > 0) {
                    const victim = bumpable[0];
                    pair.splice(pair.indexOf(victim), 1);
                    dUsed.delete(victim.name);
                    pair.push(mate);
                    dUsed.add(mate.name);
                }
            }
        });
    };

    // Helper to grab the highest OVR defenseman still available
    const getNextAvailable = () => dPool.find(p => !dUsed.has(p.name));

    // 1. Draft Pair 1 Anchor (Highest OVR)
    let p1Anchor = getNextAvailable();
    draftD(p1Anchor, 0); //  FIX: Actually draft them!

    // 2. If Pair 1 did NOT find a synergy partner, pause Pair 1 and build Pair 2
    if (dPairs[0].length === 1) {
        
        // Draft Pair 2 Anchor (Next Highest OVR)
        let p2Anchor = getNextAvailable();
        draftD(p2Anchor, 1); //  FIX
        
        // If Pair 2 ALSO didn't find a synergy partner, finish Pair 2 with the next highest OVR
        if (dPairs[1].length === 1) {
            let p2Filler = getNextAvailable();
            draftD(p2Filler, 1); //  FIX
        }
        
        // Now return to Pair 1 and finish it with the highest remaining OVR (usually the 4th best)
        if (dPairs[0].length === 1) {
            let p1Filler = getNextAvailable();
            draftD(p1Filler, 0); //  FIX
        }
    } else {
        // If Pair 1 DID find a synergy and filled up, just build Pair 2 normally
        let p2Anchor = getNextAvailable();
        draftD(p2Anchor, 1); //  FIX
        
        if (dPairs[1].length === 1) {
            let p2Filler = getNextAvailable();
            draftD(p2Filler, 1); //  FIX
        }
    }

    // 3. Fill Pair 3 with the remaining defensemen (Usually the 5th and 6th best)
    while (dPairs[2].length < 2) {
        let p3Filler = getNextAvailable();
        if (!p3Filler) break; // Failsafe if the team has less than 6 healthy defensemen
        
        draftD(p3Filler, 2); //  FIX: This updates the pair length and breaks the infinite loop!
    }

    // ==========================================
    //  POST-DRAFT SYNERGY SWAP CHECK
    // ==========================================
    
    // Helper to check if two specific players have chemistry
    const hasSynergy = (p1, p2) => {
        if (!p1 || !p2) return false;
        
        // A. Explicit Duos
        let m1 = getLineMates(p1.name);
        if (m1 && (Array.isArray(m1) ? m1.includes(p2.name) : m1 === p2.name)) return true;
        let m2 = getLineMates(p2.name);
        if (m2 && (Array.isArray(m2) ? m2.includes(p1.name) : m2 === p1.name)) return true;
            return false;
    };

    // Final Optimization: Check if Pair 1 or Pair 2 failed to get synergy.
    // If they failed, see if swapping their filler player with someone on Pair 3 fixes it!
    for (let i = 0; i < 2; i++) { // Loop through Pair 1 and Pair 2
        if (dPairs[i].length === 2 && !hasSynergy(dPairs[i][0], dPairs[i][1])) {
            
            // They don't have synergy. Does the Anchor (Index 0) have chemistry with anyone on Pair 3?
            if (dPairs[2].length === 2) {
                if (hasSynergy(dPairs[i][0], dPairs[2][0])) {
                    // Swap the P1/P2 filler with the first guy on P3
                    let temp = dPairs[i][1];
                    dPairs[i][1] = dPairs[2][0];
                    dPairs[2][0] = temp;
                } else if (hasSynergy(dPairs[i][0], dPairs[2][1])) {
                    // Swap the P1/P2 filler with the second guy on P3
                    let temp = dPairs[i][1];
                    dPairs[i][1] = dPairs[2][1];
                    dPairs[2][1] = temp;
                }
            }
        }
    }

    // D-PAIR OFF/DEF BALANCE — within the drafted defensemen only
    // Each pair ideally has one offensive D (higher OFF) and one stay-at-home (higher DEF).
    // Only swap between drafted players (dPairs[0..2]), never pull from dPool extras.
    const allDrafted = dPairs.flat();
    for (let i = 0; i < 2; i++) {
        let pair = dPairs[i];
        if (pair.length < 2) continue;
        let bothOff = getDef(pair[0]) < getOff(pair[0]) && getDef(pair[1]) < getOff(pair[1]);
        let bothDef = getDef(pair[0]) > getOff(pair[0]) && getDef(pair[1]) > getOff(pair[1]);
        if (!bothOff && !bothDef) continue; // already balanced
        // Find a swap candidate from other pairs that has the opposite profile
        for (let j = i + 1; j < 3 && (bothOff || bothDef); j++) {
            let otherPair = dPairs[j];
            for (let k = 0; k < otherPair.length; k++) {
                let cand = otherPair[k];
                let candOff = getOff(cand) > getDef(cand);
                if (bothOff && !candOff) { // pair has two offensive, cand is defensive
                    let victim = [pair[0], pair[1]].sort((a,b) => getDef(b)-getDef(a))[0]; // least defensive of pair
                    let vi = pair.indexOf(victim);
                    pair[vi] = cand;
                    otherPair[k] = victim;
                    break;
                }
                if (bothDef && candOff) { // pair has two defensive, cand is offensive
                    let victim = [pair[0], pair[1]].sort((a,b) => getOff(b)-getOff(a))[0]; // least offensive of pair
                    let vi = pair.indexOf(victim);
                    pair[vi] = cand;
                    otherPair[k] = victim;
                    break;
                }
            }
            // Recompute after any swap — stale flags would otherwise let a second swap re-corrupt an already-fixed pair
            bothOff = getDef(pair[0]) < getOff(pair[0]) && getDef(pair[1]) < getOff(pair[1]);
            bothDef = getDef(pair[0]) > getOff(pair[0]) && getDef(pair[1]) > getOff(pair[1]);
        }
    }

    // FINAL D-PAIR REUNION SWEEP (single pass, pre-filtered to this team's duos only)
    const dNameSet = new Set(dPairs.flat().map(p => p.name));
    const teamDDuos = getAllDuos().filter(g => g.filter(n => dNameSet.has(n)).length >= 2);
    for (const group of teamDDuos) {
        const placed = group
            .map(name => ({ name, pairIdx: [0,1,2].findIndex(i => dPairs[i].some(p => p.name === name)) }))
            .filter(x => x.pairIdx !== -1);
        if (placed.length < 2) continue;
        if (new Set(placed.map(x => x.pairIdx)).size === 1) continue;
        const anchorEntry = placed.reduce((best, cur) => {
            const pCur = dPairs[cur.pairIdx].find(x => x.name === cur.name);
            const pBest = dPairs[best.pairIdx].find(x => x.name === best.name);
            return getOvr(pCur) >= getOvr(pBest) ? cur : best;
        });
        const anchorPairIdx = anchorEntry.pairIdx;
        const targetPair = dPairs[anchorPairIdx];
        const groupSet = new Set(group);
        for (const { name, pairIdx } of placed) {
            if (pairIdx === anchorPairIdx) continue;
            const sourcePair = dPairs[pairIdx];
            const mover = sourcePair.find(x => x.name === name);
            if (!mover) continue;
            if (targetPair.length >= 2) {
                const bumpable = targetPair
                    .filter(x => !groupSet.has(x.name))
                    .sort((a, b) => getOvr(a) - getOvr(b));
                if (!bumpable.length) continue;
                const victim = bumpable[0];
                targetPair.splice(targetPair.indexOf(victim), 1);
                sourcePair.push(victim);
            }
            sourcePair.splice(sourcePair.indexOf(mover), 1);
            targetPair.push(mover);
        }
    }

    // Re-sort D-pairs: rank by best individual defenseman OVR, not pair average.
    // A 90+60 pair beats a 78+78 pair because the elite D deserves top minutes.
    const pairBest = (pair) => Math.max(...pair.map(p => getOvr(p)));
    dPairs.sort((a, b) => pairBest(b) - pairBest(a));

    // ==========================================
    //  7. GOALIES
    // ==========================================
    let gPool = r.filter(p => {
        let ps = playerStats[p.name];
        return getPos(p) === 'G' && ps && (!ps.injury || ps.injury.daysRemaining === 0) && (!ps.suspended || ps.suspended.days === 0);
    }).sort((a,b) => getOvr(b) - getOvr(a));
    
    // FINAL DEDUPE PASS — a skater may only appear on ONE forward line and
    // ONE defense pair. Keeps the first (highest) slot, drops any clones that
    // slipped through synergy rebalancing or duplicate roster entries.
    const seenSkaters = new Set();
    const dedupeGroup = (group) => group.map(line =>
        line.filter(p => {
            if (!p || !p.name) return false;
            if (seenSkaters.has(p.name)) return false;
            seenSkaters.add(p.name);
            return true;
        })
    );
    const cleanF = dedupeGroup(fLines);
    const cleanD = dedupeGroup(dPairs);
    // Backfill any holes the dedupe opened with best unused healthy skaters
    const spareF = fPool.filter(p => !seenSkaters.has(p.name)).sort((a,b) => getOvr(b) - getOvr(a));
    cleanF.forEach(line => { while (line.length < 3 && spareF.length) { const p = spareF.shift(); line.push(p); seenSkaters.add(p.name); } });
    const spareD = dPool.filter(p => !seenSkaters.has(p.name)).sort((a,b) => getOvr(b) - getOvr(a));
    cleanD.forEach(pair => { while (pair.length < 2 && spareD.length) { const p = spareD.shift(); pair.push(p); seenSkaters.add(p.name); } });

    // FINAL ORDERING PASS — duo/pair chemistry is honored first during the draft above; once
    // everything is seated, re-rank the intact trios so the strongest line holds the L1 slot
    // (and its TOI share). Fixes e.g. Hartford, whose highest-rated trio was landing on L3 and
    // getting checking-line minutes. D-pairs are already re-ranked by best individual D above.
    cleanF.sort((a, b) => localLineOvr(b) - localLineOvr(a));

    // GUARANTEED ENFORCER — if the roster has a healthy ENFORCER-tagged forward, dress one on
    // the 4th line (in place of its weakest non-center) so every lineup ices its goon.
    if (!cleanF.flat().some(p => getTag(p) === 'ENFORCER F')) {
        const enforcer = fPool.filter(p => !seenSkaters.has(p.name) && getTag(p) === 'ENFORCER F')
            .sort((a, b) => getOvr(b) - getOvr(a))[0];
        if (enforcer) {
            const l4 = cleanF[3];
            const victims = l4.filter(p => getPos(p) !== 'C').sort((a, b) => getOvr(a) - getOvr(b));
            if (victims.length) {
                const v = victims[0];
                l4[l4.indexOf(v)] = enforcer;
                seenSkaters.delete(v.name);
                seenSkaters.add(enforcer.name);
            } else if (l4.length < 3) {
                l4.push(enforcer);
                seenSkaters.add(enforcer.name);
            }
        }
    }
    const struct = { f: cleanF, d: cleanD, g: gPool };
    _structCache[tk] = struct;
    return struct;
}

//  SPECIAL TEAMS AUTO-COACH ENGINE
function getSpecialTeamsUnit(tk, type, unitNum, isEN = false) {
    const struct = getRosterStructure(tk);
    
    // Defensive fallback if roster structure fails
    if (!struct || !struct.f || !struct.d) {
        let sks = rosters[tk] ? rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0 && !(playerStats[p.name].suspended?.days > 0)) : [];
        return sks.slice(0, 5);
    }

    let unit = [];

    // Dedupe pools by name so a player can only land on ONE PP and ONE PK unit
    const uniqByName = (arr) => { const s = new Set(); return arr.filter(p => { if (!p || !p.name || s.has(p.name)) return false; s.add(p.name); return true; }); };

    if (type === 'PP') {
        // Pool ALL available forwards and defensemen for evaluation
        let allForwards = uniqByName(struct.f.flat());
        let allDefense = uniqByName(struct.d.flat());

        // Sort pools by offensive capability (highest off first)
        allForwards.sort((a, b) => getOffAttr(b) - getOffAttr(a));
        allDefense.sort((a, b) => getOffAttr(b) - getOffAttr(a));

        if (unitNum === 1) {
            // PP1: Top 4 Forwards, #1 Offensive Defenseman
            let fPool = allForwards.slice(0, 4); 
            let dPool = allDefense.slice(0, 1);  // Grabs Index 0 (The absolute best)
            unit = [...fPool, ...dPool];
        } 
        else {
            // PP2: Next 4 Forwards, #2 Offensive Defenseman
            let fPool = allForwards.slice(4, 8); 
            let dPool = allDefense.slice(1, 2);  // Grabs Index 1 (The second best)
            unit = [...fPool, ...dPool];
        }

        // Extra attacker logic (Empty Net PP - adds a 5th high-offense forward)
        if (isEN && unit.length < 6) {
            const usedNames = new Set(unit.map(p => p.name));
            const benchForwards = allForwards.filter(p => !usedNames.has(p.name));
            if (benchForwards.length > 0) unit.push(benchForwards[0]);
        }
    }

    else if (type === 'PK') {
        let pkForwards = uniqByName([...(struct.f[2] || []), ...(struct.f[3] || [])]);
        let allDefense = uniqByName(struct.d.flat());

        pkForwards.sort((a, b) => (playerStats[b.name]?.attr?.def || 0) - (playerStats[a.name]?.attr?.def || 0));
        allDefense.sort((a, b) => (playerStats[b.name]?.attr?.def || 0) - (playerStats[a.name]?.attr?.def || 0));

        if (unitNum === 1) {
            let fPool = pkForwards.slice(0, 2);
            let dPool = allDefense.slice(0, 2);
            unit = [...fPool, ...dPool];
        } 
        else {
            let fPool = pkForwards.slice(2, 4);
            let dPool = allDefense.slice(2, 4);
            
            if (fPool.length < 2) {
                let top6 = [...(struct.f[0] || []), ...(struct.f[1] || [])].sort((a, b) => (playerStats[b.name]?.attr?.def || 0) - (playerStats[a.name]?.attr?.def || 0));
                while(fPool.length < 2 && top6.length > 0) fPool.push(top6.shift());
            }

            unit = [...fPool, ...dPool];
        }

        // Extra attacker on empty net PK (defensive)
        if (isEN && unit.length < 5) {
            const usedNames = new Set(unit.map(p => p.name));
            const availableForwards = [...struct.f.flat()]
                .filter(p => p && !usedNames.has(p.name))
                .sort((a, b) => (playerStats[b.name]?.attr?.def || 0) - (playerStats[a.name]?.attr?.def || 0));
            
            if (availableForwards.length > 0) unit.push(availableForwards[0]);
        }
    }

    return unit.filter(Boolean);
}

// Helper to calculate Offensive Awareness for PP logic
function getOffAttr(player) {
    // 1. Safety net: If player or stats are missing, return 0
    if (!player || !playerStats[player.name] || !playerStats[player.name].attr) {
        return 0; 
    }
    
    // 2. Return the numeric 'off' attribute directly!
    // Your CSV loader saves Offensive Awareness as 'off', and it is already a number.
    return playerStats[player.name].attr.off || 0;
}

function getSpecialTeamsRating(tk, mode = 'PP', unitNum = 1, isEN = false) {
    const isPP = mode === 'PP'; const players = getSpecialTeamsUnit(tk, mode, unitNum, isEN);
    let score = players.reduce((sum, p) => { const stats = playerStats[p.name]; if (!stats) return sum; const ovr = getLiveIceOvr(p.name); const grades = stats.attr.grades || {}; if (isPP) { return sum + ovr + getGradeMod(grades.pass || 'C') * 2.5 + getGradeMod(grades.shotPwr || 'C') * 2.0 + getGradeMod(grades.shotAcc || 'C') * 1.5; } else { return sum + ovr * 0.9 + getGradeMod(grades.check || 'C') * 2.0 + getGradeMod(grades.stkHnd || 'C') * 1.0 + getGradeMod(grades.agil || 'C') * 1.0; } }, 0);
    return Math.max(0, score / Math.max(players.length, 1));
}

// Helper function to build the Special Teams HTML dynamically
function getSpecialTeamsChance(attackingTk, defendingTk) { const diff = getSpecialTeamsRating(attackingTk, 'PP') - getSpecialTeamsRating(defendingTk, 'PK'); const pace = Math.max(0.90, Math.min(1.12, getSpecialTeamsRating(attackingTk, 'PP') / 85)); return Math.max(0.08, Math.min(0.24, 0.145 + diff * 0.0028 * pace)); }

// --- GAME MATH & STATS ---
function checkMilestones(pName) {
    if (!awardConfig || !awardConfig.milestones) return;
    const p = playerStats[pName];
    if (!p) return;

    // Calculate current total stats (historical career + live season + playoffs)
    const c = p.career || { gp:0, g:0, a:0, pts:0, w:0, so:0 };
    const s = p.season || { gp:0, g:0, a:0, so:0, w:0 };
    const po = p.playoff || {};
    const cpo = p.careerPlayoff || {};

    const totalGP = c.gp + s.gp + (po.gp || 0) + (cpo.gp || 0);
    const totalG = c.g + (s.g || 0) + (po.g || 0) + (cpo.g || 0);
    const totalA = c.a + (s.a || 0) + (po.a || 0) + (cpo.a || 0);
    const totalPts = c.pts + (s.g || 0) + (s.a || 0) + (po.g || 0) + (po.a || 0) + (cpo.g || 0) + (cpo.a || 0);
    const totalW = c.w + (s.w || 0) + (po.w || 0) + (cpo.w || 0);
    const totalSO = c.so + (s.so || 0) + (po.so || 0) + (cpo.so || 0);

    // Define milestone thresholds
    const gpMilestones = [100, 500, 1000, 1500];
    const gMilestones = [50, 100, 250, 500, 750, 800];
    const aMilestones = [100, 250, 500, 750, 1000];
    const ptsMilestones = [100, 250, 500, 1000, 1500];
    const wMilestones = [50, 100, 250, 500]; // for goalies
    const soMilestones = [10, 25, 50, 100]; // for goalies

    if (!p.milestones) p.milestones = [];

    const addMilestone = (text) => {
        if (!p.milestones.includes(text)) {
            p.milestones.push(text);
            // Optionally add to your global gameMilestones array for news/headlines
            if (typeof gameMilestones !== 'undefined') {
                gameMilestones.push(`${p.name} reached a milestone: ${text}!`);
            }
        }
    };

    if (p.pos !== 'G') {
        gpMilestones.forEach(m => { if (totalGP >= m) addMilestone(`${m} Career Games`); });
        gMilestones.forEach(m => { if (totalG >= m) addMilestone(`${m} Career Goals`); });
        aMilestones.forEach(m => { if (totalA >= m) addMilestone(`${m} Career Assists`); });
        ptsMilestones.forEach(m => { if (totalPts >= m) addMilestone(`${m} Career Points`); });
    } else {
        gpMilestones.forEach(m => { if (totalGP >= m) addMilestone(`${m} Career Games`); });
        wMilestones.forEach(m => { if (totalW >= m) addMilestone(`${m} Career Wins`); });
        soMilestones.forEach(m => { if (totalSO >= m) addMilestone(`${m} Career Shutouts`); });
    }
}

/**
 * Dynamic Ice Time Allocator with Strict Base Limits & Rating Weight Modifiers
 * @param {Object} struct - The return from getRosterStructure(teamCode) containing .f and .d
 * @returns {Object} - An object with arrays of calculated minutes per player for forwards and defenders
 */
function getPairOvr(pair) {
    if (!pair || pair.length === 0) return 0;
    const total = pair.reduce((sum, p) => sum + (getLiveIceOvr(p.name) || 75), 0);
    return Math.round(total / pair.length);
}

function calculateDynamicIceTime(struct) {
    if (!struct || !struct.f || !struct.d) {
        return { forwardTimes: [15, 15, 15, 15], defenseTimes: [20, 20, 20] };
    }

    // Calculate line overals
    const f1Ovr = getPairOvr(struct.f[0]);
    const f2Ovr = getPairOvr(struct.f[1]);
    const f3Ovr = getPairOvr(struct.f[2]);
    const f4Ovr = getPairOvr(struct.f[3]);

    const d1Ovr = getPairOvr(struct.d[0]);
    const d2Ovr = getPairOvr(struct.d[1]);
    const d3Ovr = getPairOvr(struct.d[2]);

    // Total regulation game minutes to fill per position group (3 skaters on ice for F * 60 = 180, 2 for D * 60 = 120)
    const totalForwardMinutes = 180;
    const totalDefenseMinutes = 120;

    // ==========================================
    //  1. FORWARDS DYNAMIC LOGIC
    // ==========================================
    
    // Base Baseline Targets (Per Player Average)
    let fShares = [20, 17, 14, 6]; // Baseline points corresponding to midpoints of your request

    // RULE A: Line 1 heavily outweighs all other lines -> Play near max (22 mins per player)
    const line1DominantThreshold = 8; // If Line 1 is 8+ points better than average of lines 2, 3, 4
    const bottomLinesAvg = (f2Ovr + f3Ovr + f4Ovr) / 3;
    if (f1Ovr - bottomLinesAvg >= line1DominantThreshold) {
        fShares[0] = 22; // Maximized
    }

    // RULE B: Even if Line 3 has lower OVR than Line 4, still play Line 3 more
    // (Handled by keeping base shares ordered, but we can safely scale them up/down)
    if (f4Ovr > f3Ovr) {
        // Enforce gap: Line 3 must always stay higher than Line 4 baseline
        fShares[2] = Math.max(fShares[2], fShares[3] + 2);
    }

    // RULE C: If lines OVR are within 3 rating points, give similar ice time to lines
    const ratingClosenessThreshold = 3;
    if (Math.abs(f1Ovr - f2Ovr) <= ratingClosenessThreshold) {
        let avg = (fShares[0] + fShares[1]) / 2;
        fShares[0] = avg; fShares[1] = avg;
    }
    if (Math.abs(f2Ovr - f3Ovr) <= ratingClosenessThreshold) {
        let avg = (fShares[1] + fShares[2]) / 2;
        fShares[1] = avg; fShares[2] = avg;
    }
    if (Math.abs(f3Ovr - f4Ovr) <= ratingClosenessThreshold) {
        let avg = (fShares[2] + fShares[3]) / 2;
        fShares[2] = avg; fShares[3] = avg;
    }

    // RULE D: BALANCED BOTTOM-NINE — if lines 2, 3, and 4 are ALL within 5 OVR points of each
    // other (e.g. Florida's flat depth chart), they split the non-L1 minutes evenly instead of
    // following the usual L2 > L3 > L4 ladder. L1 keeps its top share.
    const bottomSpread = Math.max(f2Ovr, f3Ovr, f4Ovr) - Math.min(f2Ovr, f3Ovr, f4Ovr);
    const bottomThreeSplit = bottomSpread <= 5;
    if (bottomThreeSplit) {
        const avg234 = (fShares[1] + fShares[2] + fShares[3]) / 3;
        fShares[1] = avg234; fShares[2] = avg234; fShares[3] = avg234;
    }

    // Scale Forward Shares to exactly fit 180 total skater minutes
    // (Each line has 3 players, so total share sum = (fShares[0]*3) + (fShares[1]*3) + ...)
    let sumFShares = (fShares[0] * 3) + (fShares[1] * 3) + (fShares[2] * 3) + (fShares[3] * 3);
    let scaleF = totalForwardMinutes / sumFShares;

    let finalForwardLineMins = fShares.map(share => share * scaleF);

    // Apply strict clamping boundaries to safeguard requested ranges
    finalForwardLineMins[0] = Math.max(18, Math.min(22, finalForwardLineMins[0]));
    if (bottomThreeSplit) {
        // Per-line ladder clamps would immediately un-equalize the even split (L2 forced back
        // to 16+, L4 capped at 9) — use one shared range for all three bottom lines instead.
        for (let i = 1; i <= 3; i++) finalForwardLineMins[i] = Math.max(10, Math.min(16, finalForwardLineMins[i]));
    } else {
        finalForwardLineMins[1] = Math.max(16, Math.min(18, finalForwardLineMins[1]));
        finalForwardLineMins[2] = Math.max(13, Math.min(15, finalForwardLineMins[2]));
        finalForwardLineMins[3] = Math.max(4, Math.min(9, finalForwardLineMins[3]));
    }

    // Normalize again if clamping caused a slight mathematical offset from 180
    let clampedSumF = (finalForwardLineMins[0]*3) + (finalForwardLineMins[1]*3) + (finalForwardLineMins[2]*3) + (finalForwardLineMins[3]*3);
    let microAdjustF = totalForwardMinutes / clampedSumF;
    finalForwardLineMins = finalForwardLineMins.map(m => m * microAdjustF);


    // ==========================================
    //  2. DEFENSIVE PAIRINGS DYNAMIC LOGIC
    // ==========================================
    
    // Baseline Targets (Per Player Average)
    let dShares = [24, 19.5, 16.5];

    // Closeness adjustments for defense lines within 3 rating points
    if (Math.abs(d1Ovr - d2Ovr) <= ratingClosenessThreshold) {
        let avg = (dShares[0] + dShares[1]) / 2;
        dShares[0] = avg; dShares[1] = avg;
    }
    if (Math.abs(d2Ovr - d3Ovr) <= ratingClosenessThreshold) {
        let avg = (dShares[1] + dShares[2]) / 2;
        dShares[1] = avg; dShares[2] = avg;
    }

    // Scale Defense Shares to exactly fit 120 total blueline minutes (2 players per pairing)
    let sumDShares = (dShares[0] * 2) + (dShares[1] * 2) + (dShares[2] * 2);
    let scaleD = totalDefenseMinutes / sumDShares;

    let finalDefensePairMins = dShares.map(share => share * scaleD);

    // Apply strict clamping boundaries to safeguard requested ranges
    // P1 can reach 30 min for a truly elite top pair (e.g. MacInnis/Bourque level);
    // P2/P3 adjust downward to compensate within the 120-min budget.
    // OVR-driven spread: elite top pairs (OVR gap ≥ 8 vs P3) can reach 32 min;
    // weak depth pairs bottom out at 12 min for teams with large quality gaps.
    const d1Ovr2 = struct.d[0]?.length ? struct.d[0].reduce((s,p)=>s+(getPlayerWeightedStats(p.name)?.ovr||70),0)/struct.d[0].length : 70;
    const d3Ovr2 = struct.d[2]?.length ? struct.d[2].reduce((s,p)=>s+(getPlayerWeightedStats(p.name)?.ovr||60),0)/struct.d[2].length : 60;
    const ovrGap = Math.max(0, d1Ovr2 - d3Ovr2);
    const spreadBonus = Math.min(ovrGap / 8, 1); // 0→1 as gap goes 0→8
    finalDefensePairMins[0] = Math.max(22, Math.min(30 + spreadBonus * 2, finalDefensePairMins[0]));
    finalDefensePairMins[1] = Math.max(16, Math.min(23, finalDefensePairMins[1]));
    finalDefensePairMins[2] = Math.max(12 - spreadBonus, Math.min(16, finalDefensePairMins[2]));

    // Normalize again if clamping caused a offset from 120
    let clampedSumD = (finalDefensePairMins[0]*2) + (finalDefensePairMins[1]*2) + (finalDefensePairMins[2]*2);
    let microAdjustD = totalDefenseMinutes / clampedSumD;
    finalDefensePairMins = finalDefensePairMins.map(m => m * microAdjustD);


    // ==========================================
    //  3. DEFENSE MATRIX PERCENTAGE DISTRIBUTION
    // ==========================================
    // Breakdown of how each Pairing's total ice time is divided alongside Forward Lines
    // Matrix distribution setup: [Pair 1, Pair 2, Pair 3] mapping to [Line 1, Line 2, Line 3, Line 4]
    const baseDDistributionMatrix = [
        [0.65, 0.20, 0.10, 0.05], // Pair 1: 65% on L1, 20% on L2, 10% on L3, 5% on L4
        [0.20, 0.50, 0.20, 0.10], // Pair 2: Balanced deployment favoring Line 2
        [0.10, 0.15, 0.55, 0.20]  // Pair 3: Sheltered deployment favoring Line 3/4
    ];

    // This base matrix alone is identical for every team regardless of actual pairing quality,
    // so a dominant pair 1 and a weak pair 3 end up with the same hierarchy shape as a team
    // whose three pairs are nearly equal. Scale each pair's row by how far its computed target
    // (finalDefensePairMins, which already reflects real OVR gaps and the 22-26/18-21/14-17
    // clamps above) sits from the unadjusted baseline midpoint, so the actual per-game selection
    // odds widen or narrow along with the team's real pairing strength gaps.
    const dPairBaseline = [24, 19.5, 16.5];
    const dPairScale = finalDefensePairMins.map((m, i) => m / dPairBaseline[i]);
    const dDistributionMatrix = baseDDistributionMatrix.map((row, i) => row.map(w => w * dPairScale[i]));

    return {
        forwardLineAverages: finalForwardLineMins,   // [L1_mins, L2_mins, L3_mins, L4_mins]
        defensePairAverages: finalDefensePairMins,   // [P1_mins, P2_mins, P3_mins]
        defensePairingMatrix: dDistributionMatrix    // key the sim actually reads
    };
}


function simGame(idx) {
    clearWpCache(); // invalidate per-game OVR/tag cache at start of each game
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[idx];
    gameMilestones = [];
    const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
    
    //  Centralized Match Stats object to handle all metrics precisely
    let matchStats = {}; 
    const trk = (pN, st, v=1) => { 
        if(pN){ 
            if(!matchStats[pN]) matchStats[pN] = {g:0,a:0,s:0,pm:0,pim:0,sa:0,sv:0,ga:0,toi:0}; 
            matchStats[pN][st] += v; 
        } 
    };
    
    // [INJ] 1. HEALING & PRE-GAME SETUP
    const heal = tk => {
        if(rosters[tk]) rosters[tk].forEach(p => {
            const ps = playerStats[p.name];
            if (!ps) return;
            if (ps.injury && ps.injury.daysRemaining > 0) {
                ps.injury.daysRemaining--;
                if (ps.injury.daysRemaining === 0) {
                    const sev = ps.injury.severity || 0;
                    if (!ps.injuryHistory) ps.injuryHistory = [];
                    ps.injuryHistory.push({
                        date: currentDay,
                        daysMissed: sev,
                        gamesOut: sev,
                        season: currentSeason,
                        grade: sev >= 8 ? 'serious' : sev >= 3 ? 'moderate' : 'minor'
                    });
                    if (sev >= 3) ps.returnFromInjury = Math.ceil(sev / 2);
                    ps.injury = { severity: 0, daysRemaining: 0 };
                }
            } else if (ps.returnFromInjury > 0) {
                // Decays once the player is actually back on the ice, independent of the injury guard above
                ps.returnFromInjury--;
            }
        });
    };

    heal(g.h.nrm);
    heal(g.a.nrm);

    // Rest-day recovery: teams that didn't play yesterday shed 20 season ticks per rested day
    [g.h.nrm, g.a.nrm].forEach(tk => {
        if (!playedYesterday(tk)) {
            (rosters[tk] || []).forEach(p => {
                if (playerStats[p.name] && playerStats[p.name].seasonTicks > 0)
                    playerStats[p.name].seasonTicks = Math.max(0, playerStats[p.name].seasonTicks - 20);
            });
        }
    });

    //  2. GOALIE SELECTION
    const selG = (tk) => {
        const gs = rosters[tk] ? rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0 && (!playerStats[p.name].suspended || playerStats[p.name].suspended.days === 0)).sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr) : [];
        if (!gs.length) { const allG = (rosters[tk] || []).filter(p => p.pos === 'G'); return allG.length ? allG[0] : null; }
        if (gs.length === 1 || isPlayoffs || isASG) return gs[0];

        const starter = gs[0]; const backup = gs[1]; const sStats = playerStats[starter.name][k];
        let diff = getPlayerWeightedStats(starter.name).ovr - getPlayerWeightedStats(backup.name).ovr;
        let restChance = 0.12;
        if (diff <= 10) restChance = 0.45; else if (diff <= 15) restChance = 0.30;
        // B2B rest only applies if THIS goalie (the current OVR-ranked starter) is the one who
        // actually played yesterday — playedYesterday(tk) is team-wide and would otherwise bench
        // the true starter (who didn't play) just because the backup had a game the day before,
        // snowballing into the backup getting most of the season's starts.
        if (playerStats[starter.name]?.lastPlayedDay === currentDay - 1) restChance += 0.60;

        const bStats = playerStats[backup.name]?.[k];
        if (sStats.consStarts >= 7 || Math.random() < restChance) {
            sStats.consStarts = 0;
            if (bStats) bStats.consStarts = (bStats.consStarts || 0) + 1;
            return backup;
        } else {
            sStats.consStarts = (sStats.consStarts || 0) + 1;
            if (bStats) bStats.consStarts = 0;
            return starter;
        }
    };

    const hG_obj = selG(g.h.nrm), aG_obj = selG(g.a.nrm);
    let hG_name = hG_obj ? hG_obj.name : null;
    let aG_name = aG_obj ? aG_obj.name : null;
    // Record original starters before any blowout-pull reassignment
    const origHG_name = hG_name;

    if (rosters[g.h.nrm]) assignMicroStreaks(rosters[g.h.nrm], hG_obj);
    if (rosters[g.a.nrm]) assignMicroStreaks(rosters[g.a.nrm], aG_obj);
    // Per-game dailySwing — must run after micro streaks so cache is built correctly
    applyDailyRandomSwing(g.h.nrm);
    applyDailyRandomSwing(g.a.nrm);
    clearWpCache(); // flush after swing assignment so OVR picks up dailySwing values
    const origAG_name = aG_name;

    // ðŸ§± 3. MACRO AURAS & MODIFIER MATH
    let hAuraMod = (getTeamSystemAura(g.h.nrm) === 'OFFENSIVE TEAM' ? 1.08 : (getTeamSystemAura(g.h.nrm) === 'DEFENSIVE TEAM' ? 0.92 : 1.0));
    let aAuraMod = (getTeamSystemAura(g.a.nrm) === 'OFFENSIVE TEAM' ? 1.08 : (getTeamSystemAura(g.a.nrm) === 'DEFENSIVE TEAM' ? 0.92 : 1.0));
    // Sliding goalie save modifier  -  centered at OVR 75: bad goalie=1.12, avg=1.0, elite=0.88
    const hGOvr = hG_obj ? (getPlayerWeightedStats(hG_obj.name).ovr || 75) : 75;
    const aGOvr = aG_obj ? (getPlayerWeightedStats(aG_obj.name).ovr || 75) : 75;
    // B2B goalie fatigue: starting goalie on back-to-back takes a wall modifier hit
    // B2B penalty only applies to the goalie who actually played yesterday, not the fresh backup
    const hB2BPen = (!isPlayoffs && hG_obj && playerStats[hG_obj.name]?.lastPlayedDay === currentDay - 1) ? 0.06 : 0;
    const aB2BPen = (!isPlayoffs && aG_obj && playerStats[aG_obj.name]?.lastPlayedDay === currentDay - 1) ? 0.06 : 0;
    const hHurtPen = (hG_name && playerStats[hG_name]?.playingHurt) ? 0.15 : 0;
    const aHurtPen = (aG_name && playerStats[aG_name]?.playingHurt) ? 0.15 : 0;
    let hWallMod = Math.max(0.75, Math.min(1.25, 1.0 + (75 - hGOvr) * 0.014 + hB2BPen - hHurtPen));
    let aWallMod = Math.max(0.75, Math.min(1.25, 1.0 + (75 - aGOvr) * 0.014 + aB2BPen - aHurtPen));
    // Coaching adjustments: forecheck 1=aggressive(open game), -1=defensive(tight); pp 1=shoot, -1=cycle
    if (!isPlayoffs && !isASG && selectedTeam && (g.h.nrm === selectedTeam || g.a.nrm === selectedTeam)) {
        const fMod = coachAdj.forecheck * 0.025; // aggressive opens scoring both ways — only affects the user's own games
        hWallMod += fMod; aWallMod += fMod;
        // Coach trust: high trust slightly boosts user team's goalie, low trust slightly hurts
        const trustMod = (coachTrust - 50) * 0.003; // ±0.15 at extremes
        if (g.h.nrm === selectedTeam) hWallMod -= trustMod;
        if (g.a.nrm === selectedTeam) aWallMod -= trustMod;
    }
    // Goalie streak wall modifier — HOT goalie = harder to score on, COLD goalie = easier
    // macro carries more weight than micro; these stack (macro HOT goalie on a micro HOT night = -0.085)
    if (hG_obj) {
        const hGps = playerStats[hG_obj.name];
        if (hGps) {
            if (hGps.macro_streak === 'HOT')       hWallMod -= 0.060;
            else if (hGps.micro_streak === 'HOT')  hWallMod -= 0.030;
            if (hGps.macro_streak === 'COLD')      hWallMod += 0.060;
            else if (hGps.micro_streak === 'COLD') hWallMod += 0.030;
        }
    }
    if (aG_obj) {
        const aGps = playerStats[aG_obj.name];
        if (aGps) {
            if (aGps.macro_streak === 'HOT')       aWallMod -= 0.060;
            else if (aGps.micro_streak === 'HOT')  aWallMod -= 0.030;
            if (aGps.macro_streak === 'COLD')      aWallMod += 0.060;
            else if (aGps.micro_streak === 'COLD') aWallMod += 0.030;
        }
    }
    let asgBoost = isASG ? 1.8 : 1.0;

    // HOME LAST-CHANGE ADVANTAGE — home team always has last line change in real hockey,
    // letting them match up favorable lines. Gives a structural flat OVR bonus each tick.
    const homeLastChangeMod = isASG ? 0 : 1.5;

    // PARITY BOOST — home underdogs get extra crowd/desperation lift.
    // The further behind in team OVR, the bigger the boost (caps at +4).
    const hAvgOvr = getDynamicTeamOvr(g.h.nrm) || 75;
    const aAvgOvr = getDynamicTeamOvr(g.a.nrm) || 75;
    const ovrGap  = aAvgOvr - hAvgOvr; // positive = home team is underdog
    const parityBoost = isASG ? 0 : Math.min(6, Math.max(0, ovrGap * 0.45));

    let homeCrowdEnergy = 1.03;

    // RIVALRY — historical rivals play with extra intensity from game 1; organic (3+ meetings) adds more
    const hMeetings = !isPlayoffs ? ((g.h.season.meetings || {})[g.a.nrm] || 0) : 0;
    const isHistoricRival = awardConfig.rivalries && !!(rivals[g.h.nrm]?.includes(g.a.nrm) || rivals[g.a.nrm]?.includes(g.h.nrm));
    const rivalBonus = !awardConfig.rivalries ? 0 : isHistoricRival ? (hMeetings >= 3 ? 3 : 1) : (hMeetings >= 3 ? 2 : 0);

    // CHAOS — globalChaos drives all random variance; scaled by context
    // Rivalry games and playoffs get extra chaos; wall mod randomness uses same scale
    const chaosScale = gameStatus.globalChaos * (isHistoricRival ? 1.4 : 1.0) * (isPlayoffs ? 1.2 : 1.0);
    const nightMag = 14 * chaosScale;    // pre-game night factor magnitude
    const wallJitter = 0.18 * chaosScale; // goalie wall mod random jitter
    const hNight = Math.random() < 0.22 ? (Math.random() - 0.5) * nightMag : 0;
    const aNight = Math.random() < 0.22 ? (Math.random() - 0.5) * nightMag : 0;
    const chaosOffset = hNight - aNight;
    hWallMod = Math.max(0.65, Math.min(1.35, hWallMod + (Math.random() - 0.5) * wallJitter));
    aWallMod = Math.max(0.65, Math.min(1.35, aWallMod + (Math.random() - 0.5) * wallJitter));

    // PLAYOFF PRESSURE — elimination game modifier
    // Facing elimination: veterans (+OVR) dig deep; less experienced players feel it (-OVR)
    // Leading the series: slight complacency risk
    let hPressureMod = 0, aPressureMod = 0;
    if (isPlayoffs && g.series) {
        const hElim = g.series.aW === 3;  // home team facing elimination (opponents lead 3)
        const aElim = g.series.hW === 3;  // away team facing elimination
        const getExpFactor = (nrm) => {
            const roster = (playerStats ? Object.values(playerStats) : []).filter(p => p.teamCode === (league.find(t=>t.nrm===nrm)||{}).code);
            const avgGP = roster.length ? roster.reduce((s,p) => s + (p.season?.gp||0), 0) / roster.length : 40;
            return (avgGP - 40) / 40; // -1 to +1 scale; 40 GP = neutral
        };
        if (hElim) hPressureMod = getExpFactor(g.h.nrm) * 4; // up to ±4 OVR based on experience
        if (aElim) aPressureMod = getExpFactor(g.a.nrm) * 4;
        // Leading 3-0 or 3-1: small complacency dip
        if (g.series.hW === 3) hPressureMod -= 1.5;
        if (g.series.aW === 3) aPressureMod -= 1.5;
    }

    // TEAM STREAK MORALE — hot/cold streaks shift line OVR up to ±3
    let hStreakMod = g.h.winStreak >= 5 ? 3 : g.h.winStreak >= 3 ? 1.5 : g.h.loseStreak >= 5 ? -3 : g.h.loseStreak >= 3 ? -1.5 : 0;
    let aStreakMod = g.a.winStreak >= 5 ? 3 : g.a.winStreak >= 3 ? 1.5 : g.a.loseStreak >= 5 ? -3 : g.a.loseStreak >= 3 ? -1.5 : 0;
    // COMEBACK ARC — user team on 3+ losing streak gets a +2 resolve boost offsetting the streak penalty
    if (selectedTeam && !isASG) {
        if (g.h.nrm === selectedTeam && g.h.loseStreak >= 3) hStreakMod += 2;
        if (g.a.nrm === selectedTeam && g.a.loseStreak >= 3) aStreakMod += 2;
    }

    // IN-GAME FATIGUE — track cumulative shift ticks per player this game
    // After 20 ticks (10 min ice time), each additional tick costs 0.25 OVR
    const gameIceTicks = {};

    // MOMENTUM — decays each step; goal gives scoring team a 4-minute surge
    let hMomentum = 0, aMomentum = 0;

    //  4. THE TIME-TICK ENGINE SETUP
    let hG = 0, aG = 0;
    let hShots = 0, aShots = 0;
    let allGoals = [];
    let penaltyEvents = [];
    let hStruct = getRosterStructure(g.h.nrm);
    let aStruct = getRosterStructure(g.a.nrm);

    // Snapshot current unit so per-line chemistry can track which line scored
    const hTeamObj = league.find(t => t.nrm === g.h.nrm);
    const aTeamObj = league.find(t => t.nrm === g.a.nrm);
    if (hTeamObj && hTeamObj.chem) hTeamObj.chem.lastUnit = { f: hStruct.f, d: hStruct.d };
    if (aTeamObj && aTeamObj.chem) aTeamObj.chem.lastUnit = { f: aStruct.f, d: aStruct.d };

    function buildLineSchedule(minsArray) {
        // Weighted random draw: each step picks a line proportional to its minute share.
        // Guarantees L1 plays more than L2, L2 more than L3, etc. — never shuffled flat.
        const weights = minsArray.map(m => Math.max(0, m));
        const total = weights.reduce((s, w) => s + w, 0) || 1;
        const sched = [];
        for (let i = 0; i < 240; i++) {
            let roll = Math.random() * total;
            let cum = 0;
            let chosen = 0;
            for (let j = 0; j < weights.length; j++) {
                cum += weights[j];
                if (roll < cum) { chosen = j; break; }
            }
            sched.push(chosen);
        }
        return sched;
    }

    const homeIceData = calculateDynamicIceTime(getRosterStructure(g.h.nrm));
    const awayIceData = calculateDynamicIceTime(getRosterStructure(g.a.nrm));

    const homeFSchedule = buildLineSchedule(homeIceData.forwardLineAverages);
    const awayFSchedule = buildLineSchedule(awayIceData.forwardLineAverages);
    const homeDSchedule = buildLineSchedule(homeIceData.defensePairAverages);
    const awayDSchedule = buildLineSchedule(awayIceData.defensePairAverages);

    function getPairingForLine(fLine, matrix) {
        let p1Weight = matrix[0][fLine]; 
        let p2Weight = matrix[1][fLine]; 
        let p3Weight = matrix[2][fLine]; 
        let total = p1Weight + p2Weight + p3Weight;
        
        let roll = Math.random() * total;
        if (roll < p1Weight) return 0; 
        if (roll < p1Weight + p2Weight) return 1; 
        return 2; 
    }

    // ==========================================
    //  EVENT-DRIVEN SIMULATION ENGINE (Option C + A)
    //  Replaces the 240-tick per-step loop with a pre-generated event stream.
    //  ~60-70 events processed per game vs 240 full ticks — ~70% fewer iterations.
    //  Option A: assist attribution uses a 90-second rolling shift pool so
    //  playmakers (Gretzky, Larionov) accumulate assists across recent shifts,
    //  not only from the 5 skaters on ice at the exact goal tick.
    // ==========================================

    // Poisson random variate
    const poissonRand = (lambda) => {
        if (lambda <= 0) return 0;
        const L = Math.exp(-Math.min(lambda, 500));
        let k = 0, p = 1;
        do { k++; p *= Math.random(); } while (p > L);
        return k - 1;
    };

    // Pre-game OVR gap drives shot distribution (static proxy for per-tick diff)
    const preGameDiff = Math.max(-12, Math.min(12, (hAvgOvr + homeLastChangeMod + parityBoost - aAvgOvr)));
    const hShotCount  = poissonRand(28 * (1 + preGameDiff * 0.008));
    const aShotCount  = poissonRand(28 * (1 - preGameDiff * 0.008));
    // Penalty counts derived from per-tick rates × 240 steps
    const penCount    = poissonRand(5.5);   // 0.038×240×0.60 ≈ 5.47 non-coincidental
    const coinCount   = poissonRand(3.6);   // 0.038×240×0.40 ≈ 3.65 coincidentals
    const goonCount   = poissonRand(1.9);   // 0.008×240 ≈ 1.92
    const fightCount  = Math.random() < 0.144 ? 1 : 0; // 0.0006×240 ≈ 0.144/game

    // Assign each event a random tick (0–239), then sort chronologically
    const randTicks = (n) => Array.from({length:n}, () => Math.floor(Math.random()*240)).sort((a,b)=>a-b);
    const evStream  = [];
    randTicks(hShotCount).forEach(t => evStream.push({t, type:'shot', side:'h'}));
    randTicks(aShotCount).forEach(t => evStream.push({t, type:'shot', side:'a'}));
    randTicks(penCount).forEach(t   => evStream.push({t, type:'pen'}));
    randTicks(coinCount).forEach(t  => evStream.push({t, type:'coin'}));
    randTicks(goonCount).forEach(t  => evStream.push({t, type:'goon'}));
    if (fightCount)      evStream.push({t: Math.floor(Math.random()*240), type:'fight'});
    if (!isASG && Math.random() < 0.48) evStream.push({t: Math.floor(Math.random()*240), type:'pshot'});
    evStream.sort((a,b) => a.t - b.t);

    // Option A: 90-second rolling shift pool for expanded assist attribution
    const hShiftLog = [], aShiftLog = []; // [{tick, players:[name,...]}]
    const SHIFT_WIN  = 6; // ticks = 90 seconds
    const pushShift  = (log, onIce, t) => {
        log.push({tick:t, players:onIce.filter(p=>p.pos!=='G').map(p=>p.name)});
        if (log.length > 4) log.splice(0, log.length-4);
    };
    const expandPool = (log, onIce, t) => {
        const s = new Set(onIce.filter(p=>p.pos!=='G').map(p=>p.name));
        log.forEach(e => { if (t - e.tick <= SHIFT_WIN) e.players.forEach(n=>s.add(n)); });
        return [...s].map(n => ({name:n}));
    };

    // Penalty offender picker (hoisted out of per-event scope)
    const penWeight = (name) => {
        const ps = playerStats[name];
        if (!ps) return 1;
        const aggr = gradeToNum(ps.attr?.aggr) || 50;
        const rough = gradeToNum(ps.attr?.rough) || 50;
        const tagMult = (getPlayerWeightedStats(name)?.tag||'').includes('ENFORCER') ? 2.0 : 1;
        const base = Math.pow((aggr+rough)/2, 1.3) * tagMult;
        const overCap = Math.max(0, (ps.season?.pim||0) - 150);
        return base * Math.pow(0.85, overCap/10);
    };
    const pickOffender = (skaters) => {
        const w = skaters.map(p => penWeight(p.name));
        const total = w.reduce((a,b)=>a+b, 0);
        if (total === 0) return skaters[Math.floor(Math.random()*skaters.length)].name;
        let r = Math.random() * total;
        for (let i=0; i<skaters.length; i++) { r -= w[i]; if (r<=0) return skaters[i].name; }
        return skaters[skaters.length-1].name;
    };

    // Constants computed once for the event loop (mirrors tick-loop setup)
    const lineMatchActive  = !isPlayoffs && !isASG && coachAdj.lineMatch && selectedTeam;
    const hLineMatchBonus  = (lineMatchActive && g.h.nrm === selectedTeam) ? 1.0 : 0;
    const aLineMatchBonus  = (lineMatchActive && g.a.nrm === selectedTeam) ? 1.0 : 0;

    // TOI: distribute proportionally from ice-time averages (replaces per-tick 0.25 min grants)
    const grantTOI = (struct, iceData) => {
        const fTot = iceData.forwardLineAverages.reduce((s,v)=>s+Math.max(0,v),0) || 1;
        const dTot = iceData.defensePairAverages.reduce((s,v)=>s+Math.max(0,v),0) || 1;
        struct.f.forEach((line,i) => { const toi=(Math.max(0,iceData.forwardLineAverages[i]||0)/fTot)*60; line.forEach(p=>trk(p.name,'toi',toi)); });
        struct.d.forEach((pair,i) => { const toi=(Math.max(0,iceData.defensePairAverages[i]||0)/dTot)*60; pair.forEach(p=>trk(p.name,'toi',toi)); });
    };
    grantTOI(hStruct, homeIceData);
    grantTOI(aStruct, awayIceData);

    let period = 1; // hoisted so PATRICK ROY PROTOCOL can read it after the loop
    let prevEvTick = 0;

    for (const ev of evStream) {
        const t = ev.t;
        period = t < 80 ? 1 : t < 160 ? 2 : 3;
        const minute  = Math.floor(t / 4) + 1;
        const sec     = (t % 4) * 15;
        const timeStr = `P${period} ${minute%20||20}:${sec<10?'0'+sec:sec}`;

        // Lines on ice at this tick from pre-built schedule
        const hFLine  = homeFSchedule[t] || 0;
        const hDPair  = homeDSchedule[t] || 0;
        const aFLine  = awayFSchedule[t] || 0;
        const aDPair  = awayDSchedule[t] || 0;
        const hOnIce  = [...(hStruct.f[hFLine]||[]), ...(hStruct.d[hDPair]||[])];
        const aOnIce  = [...(aStruct.f[aFLine]||[]), ...(aStruct.d[aDPair]||[])];

        // Update rolling shift pools (Option A)
        pushShift(hShiftLog, hOnIce, t);
        pushShift(aShiftLog, aOnIce, t);

        // Momentum decay proportional to elapsed ticks since last event
        const elapsed = t - prevEvTick;
        hMomentum = Math.max(0, hMomentum - elapsed * 0.5);
        aMomentum = Math.max(0, aMomentum - elapsed * 0.5);
        prevEvTick = t;

        // Per-event live OVR and diff
        const absDiff     = Math.abs(hG - aG);
        const periodMult  = period===3?1.5:period===2?1.1:1.0;
        const closeMult   = absDiff===0?1.4:absDiff===1?1.15:absDiff>=3?0.6:1.0;
        const activeChaos = chaosScale * periodMult * closeMult;
        const hLiveOvr = (getLiveLineOvr(hOnIce) + hLineMatchBonus + homeLastChangeMod + parityBoost + hPressureMod + hStreakMod + rivalBonus + hMomentum*0.375)*hAuraMod*homeCrowdEnergy;
        const aLiveOvr = (getLiveLineOvr(aOnIce) + aLineMatchBonus + aPressureMod + aStreakMod + rivalBonus + aMomentum*0.375)*aAuraMod;
        const diff = Math.max(-18, Math.min(18, hLiveOvr - aLiveOvr + chaosOffset));

        // EVEN-STRENGTH SHOT
        if (ev.type === 'shot') {
            const isHome  = ev.side === 'h';
            const onIce   = isHome ? hOnIce : aOnIce;
            const defGNm  = isHome ? aG_name : hG_name;
            const teamObj = isHome ? g.h : g.a;
            const sLog    = isHome ? hShiftLog : aShiftLog;
            const oppOnIce= isHome ? aOnIce : hOnIce;

            if (!onIce.length || !defGNm) continue;
            const skaters = onIce.filter(p => p.pos !== 'G');
            if (!skaters.length) continue;

            const shooter   = selectShooter(skaters);
            if (!shooter) continue;

            trk(shooter.name, 's', 1);
            trk(defGNm, 'sa', 1);
            if (isHome) hShots++; else aShots++;

            const tag       = getPlayerWeightedStats(shooter.name)?.tag;
            const sniperMod = getEliteShooterMod(tag);
            const chaosMod  = 1.0 + (Math.random()-0.5)*activeChaos*0.08;
            const wallMod   = isHome ? aWallMod : hWallMod;
            const dSign     = isHome ? 1 : -1;
            const prob      = (0.079 + dSign*diff*0.0002)*wallMod*sniperMod*chaosMod*(isASG?1.6:1.0);

            if (Math.random() < Math.max(0.015, Math.min(0.26, prob))) {
                if (isHome) { hG++; trk(aG_name,'ga',1); } else { aG++; trk(hG_name,'ga',1); }

                // Option A: draw assisters from expanded shift pool (last 90 sec of shifts)
                const pool    = expandPool(sLog, onIce, t);
                const assistP = pool.filter(p => p.name !== shooter.name);

                const goalEv = processSingleGoal(teamObj.nrm, teamObj.code, shooter, assistP, timeStr, period, minute%20||20, sec);
                if (goalEv) {
                    goalEv.tm  = teamObj.code;
                    goalEv.cl  = teamColors[teamObj.nrm]?.[0] || '#fff';
                    goalEv.txt = buildGoalText(goalEv.scorer, goalEv.pAssist, goalEv.sAssist, tag, false, false, false, isHome?hG:aG, isHome?aG:hG, period);
                    goalEv.hMom = hMomentum; goalEv.aMom = aMomentum;
                    allGoals.push(goalEv);
                    trk(goalEv.scorer, 'g', 1);
                    if (goalEv.pAssist) trk(goalEv.pAssist, 'a', 1);
                    if (goalEv.sAssist) trk(goalEv.sAssist, 'a', 1);
                    onIce.forEach(p   => trk(p.name, 'pm',  1));
                    oppOnIce.forEach(p => trk(p.name, 'pm', -1));
                    if (isHome) hMomentum=8; else aMomentum=8;
                }
            } else {
                trk(defGNm, 'sv', 1);
            }

        // NON-COINCIDENTAL PENALTY (PP / SH resolution)
        } else if (ev.type === 'pen') {
            let penTeam  = Math.random()>0.5 ? g.h : g.a;
            let advTeam  = penTeam.nrm===g.h.nrm ? g.a : g.h;
            let activeSk = (penTeam.nrm===g.h.nrm ? hOnIce : aOnIce).filter(p=>p.pos!=='G');
            if (!activeSk.length) continue;

            const offender   = pickOffender(activeSk);
            const isMajor    = Math.random() < 0.06;
            const pimAmt     = isMajor ? 5 : 2;
            const overCap2   = Math.max(0, (playerStats[offender]?.season?.pim||0) - 150);
            const skipChance = 1 - Math.pow(0.85, overCap2/10);
            if (skipChance > 0 && Math.random() < skipChance) continue;

            trk(offender, 'pim', pimAmt);
            penaltyEvents.push({p:period, m:minute%20||20, s:sec, str:timeStr, tm:penTeam.code,
                cl:teamColors[penTeam.nrm]?.[0]||'#fff',
                txt:`PENALTY: ${offender} (${isMajor?'5 min major':'2 min minor'})`, isPenalty:true});

            if (isMajor && Math.random()<0.01 && playerStats[offender] && !(playerStats[offender].suspended?.days>0)) {
                const days = Math.ceil(Math.random()*3);
                if (!playerStats[offender].suspended) playerStats[offender].suspended={days:0,reason:''};
                playerStats[offender].suspended.days += days;
                playerStats[offender].suspended.reason = 'Match penalty';
                penaltyEvents.push({p:period, m:minute%20||20, s:sec, str:timeStr, tm:penTeam.code,
                    cl:'#FF8800', txt:`SUSPENSION: ${offender} — ${days} game(s) (match penalty)`, isNote:true});
            }

            const advTeamObj = league.find(t2=>t2.nrm===advTeam.nrm);
            const penTeamObj = league.find(t2=>t2.nrm===penTeam.nrm);
            if (!isASG && !isPlayoffs) {
                if (advTeamObj) advTeamObj.season.ppo=(advTeamObj.season.ppo||0)+1;
                if (penTeamObj) penTeamObj.season.pka=(penTeamObj.season.pka||0)+1;
            }

            const ppStratMod = (!isPlayoffs&&!isASG&&advTeam.nrm===selectedTeam)
                ? (coachAdj.pp===-1?1.10:coachAdj.pp===1?0.90:1.0) : 1.0;
            const ppConvRate = getSpecialTeamsChance(advTeam.nrm, penTeam.nrm)*ppStratMod;
            const ppRoll     = Math.random();
            const advTeamObj2 = advTeam.nrm===g.h.nrm ? hTeamObj : aTeamObj;
            const pp1Names   = advTeamObj2?.specialTeams?.pp1 || [];
            const advRoster  = rosters[advTeam.nrm] || [];
            const pp1Roster  = pp1Names
                .map(n=>(n&&typeof n==='object')?n:advRoster.find(p=>p.name===n))
                .filter(p=>p&&!(playerStats[p.name]?.injury?.daysRemaining>0)&&!(playerStats[p.name]?.suspended?.days>0));
            const ppUnit = pp1Roster.length>=3 ? pp1Roster : (advTeam.nrm===g.h.nrm?hOnIce:aOnIce);
            const pkUnit = advTeam.nrm===g.h.nrm ? aOnIce : hOnIce;

            if (ppRoll < ppConvRate && ppUnit.length > 0) {
                const ppShooter = selectShooter(ppUnit);
                const ppEv = processSingleGoal(advTeam.nrm, advTeam.code, ppShooter, ppUnit, timeStr, period, minute%20||20, sec);
                if (ppEv) {
                    ppEv.isPP=true; ppEv.tm=advTeam.code; ppEv.cl=teamColors[advTeam.nrm]?.[0]||'#FFD700';
                    ppEv.txt=buildGoalText(ppEv.scorer, ppEv.pAssist, ppEv.sAssist, null, true, false, false, 0, 0, 0);
                    allGoals.push(ppEv);
                    if (advTeam.nrm===g.h.nrm){hG++;hShots++;}else{aG++;aShots++;}
                    const pkGoalie = penTeam.nrm===g.h.nrm ? hG_name : aG_name;
                    trk(pkGoalie,'sa',1); trk(pkGoalie,'ga',1);
                    trk(ppEv.scorer,'g',1); trk(ppEv.scorer,'s',1);
                    if (ppEv.pAssist) trk(ppEv.pAssist,'a',1);
                    if (ppEv.sAssist) trk(ppEv.sAssist,'a',1);
                    if (!isASG) {
                        const kk=isPlayoffs?'playoff':'season';
                        if (playerStats[ppEv.scorer]) playerStats[ppEv.scorer][kk].ppg=(playerStats[ppEv.scorer][kk].ppg||0)+1;
                        if (ppEv.pAssist&&playerStats[ppEv.pAssist]) playerStats[ppEv.pAssist][kk].ppa=(playerStats[ppEv.pAssist][kk].ppa||0)+1;
                        if (ppEv.sAssist&&playerStats[ppEv.sAssist]) playerStats[ppEv.sAssist][kk].ppa=(playerStats[ppEv.sAssist][kk].ppa||0)+1;
                        if (advTeamObj) advTeamObj.season.ppg=(advTeamObj.season.ppg||0)+1;
                        if (penTeamObj) penTeamObj.season.pkg=(penTeamObj.season.pkg||0)+1;
                    }
                    if (advTeam.nrm===g.h.nrm) hMomentum=8; else aMomentum=8;
                }
            } else if (ppRoll>=ppConvRate && Math.random()<0.02 && pkUnit.length>0) {
                const shShooter = selectShooter(pkUnit);
                const shEv = processSingleGoal(penTeam.nrm, penTeam.code, shShooter, pkUnit, timeStr, period, minute%20||20, sec);
                if (shEv) {
                    shEv.isSH=true; shEv.tm=penTeam.code; shEv.cl=teamColors[penTeam.nrm]?.[0]||'#00FFFF';
                    shEv.txt=buildGoalText(shEv.scorer, shEv.pAssist, shEv.sAssist, null, false, true, false, 0, 0, 0);
                    allGoals.push(shEv);
                    if (penTeam.nrm===g.h.nrm){hG++;hShots++;}else{aG++;aShots++;}
                    const ppGoalie = advTeam.nrm===g.h.nrm ? hG_name : aG_name;
                    trk(ppGoalie,'sa',1); trk(ppGoalie,'ga',1);
                    trk(shEv.scorer,'g',1); trk(shEv.scorer,'s',1);
                    if (shEv.pAssist) trk(shEv.pAssist,'a',1);
                    if (shEv.sAssist) trk(shEv.sAssist,'a',1);
                    if (!isASG&&playerStats[shEv.scorer]) {
                        const kk2=isPlayoffs?'playoff':'season';
                        playerStats[shEv.scorer][kk2].shg=(playerStats[shEv.scorer][kk2].shg||0)+1;
                    }
                    if (penTeam.nrm===g.h.nrm) hMomentum=8; else aMomentum=8;
                }
            }

        // COINCIDENTAL MINORS (4-on-4, no PP)
        } else if (ev.type === 'coin') {
            if (isASG) continue;
            const hSk = hOnIce.filter(p=>p.pos!=='G');
            const aSk = aOnIce.filter(p=>p.pos!=='G');
            if (!hSk.length || !aSk.length) continue;
            const hOff = pickOffender(hSk);
            const aOff = pickOffender(aSk);
            if (hOff && aOff) {
                const capSkip = (name) => { const ov=Math.max(0,(playerStats[name]?.season?.pim||0)-150); return ov>0&&Math.random()<1-Math.pow(0.85,ov/10); };
                if (!capSkip(hOff)) trk(hOff,'pim',2);
                if (!capSkip(aOff)) trk(aOff,'pim',2);
                penaltyEvents.push({p:period, m:minute%20||20, s:sec, str:timeStr, tm:g.h.code,
                    cl:'#FFAA66', txt:`COINCIDENTAL MINORS: ${hOff} & ${aOff} — roughing (2 min each)`, isPenalty:true});
            }

        // GOON ROLL
        } else if (ev.type === 'goon') {
            if (isASG) continue;
            const goonTeam = Math.random()<0.5 ? g.h : g.a;
            const tStruct  = goonTeam.nrm===g.h.nrm ? hStruct : aStruct;
            const roster   = [...tStruct.f.flat(), ...tStruct.d.flat()];
            const gPool    = roster.filter(p => {
                const ps=playerStats[p.name];
                if (!ps||ps.pos==='G'||ps.injury?.daysRemaining>0||ps.suspended?.days>0) return false;
                return (gradeToNum(ps.attr?.rough)||0) >= 56;
            });
            if (!gPool.length) continue;
            const gWt    = gPool.map(p => { const ps=playerStats[p.name]; const a2=gradeToNum(ps.attr?.aggr)||50; const r2=gradeToNum(ps.attr?.rough)||50; const tm=(getPlayerWeightedStats(p.name)?.tag||'').includes('ENFORCER')?3:1; const ov=Math.max(0,(ps.season?.pim||0)-150); return Math.pow((a2+r2)/2,1.8)*tm*Math.pow(0.85,ov/10); });
            const gTotal = gWt.reduce((a2,b)=>a2+b,0);
            if (gTotal<=0) continue;
            let gr=Math.random()*gTotal, gPicked=gPool[gPool.length-1];
            for (let i=0;i<gPool.length;i++){gr-=gWt[i];if(gr<=0){gPicked=gPool[i];break;}}
            trk(gPicked.name,'pim',2);

        // FIGHT
        } else if (ev.type === 'fight') {
            if (isASG) continue;
            const canFight    = (p) => { const ps=playerStats[p.name]; if(!ps) return false; return (gradeToNum(ps.attr?.aggr)||50)>=56 && (gradeToNum(ps.attr?.rough)||50)>=56; };
            const fightWt     = (name) => { const ps=playerStats[name]; if(!ps) return 0; const a2=gradeToNum(ps.attr?.aggr)||50; const r2=gradeToNum(ps.attr?.rough)||50; const tm=(getPlayerWeightedStats(name)?.tag||'').includes('ENFORCER')?4:1; return Math.pow((a2+r2)/2,2)*tm; };
            const pickFighter = (pool) => { if(!pool.length) return null; const w=pool.map(p=>fightWt(p.name)); const tot=w.reduce((a2,b)=>a2+b,0); if(!tot) return pool[0]; let r2=Math.random()*tot; for(let i=0;i<pool.length;i++){r2-=w[i];if(r2<=0)return pool[i];} return pool[0]; };
            const hF = pickFighter(hOnIce.filter(p=>p.pos!=='G'&&canFight(p)));
            const aF = pickFighter(aOnIce.filter(p=>p.pos!=='G'&&canFight(p)));
            if (hF && aF) {
                trk(hF.name,'pim',5); trk(aF.name,'pim',5);
                penaltyEvents.push({p:period, m:minute%20||20, s:sec, str:timeStr, tm:g.h.code,
                    cl:'#FF4444', txt:`FIGHT: ${hF.name} vs ${aF.name} — coincidental majors (5 min each)`, isPenalty:false, isFight:true});
                [hF,aF].forEach(fighter => {
                    if (Math.random()<0.004 && playerStats[fighter.name] && !(playerStats[fighter.name].suspended?.days>0)) {
                        const days=Math.ceil(Math.random()*3);
                        if (!playerStats[fighter.name].suspended) playerStats[fighter.name].suspended={days:0,reason:''};
                        playerStats[fighter.name].suspended.days+=days;
                        playerStats[fighter.name].suspended.reason='Match penalty';
                        penaltyEvents.push({p:period, m:minute%20||20, s:sec, str:timeStr, tm:g.h.code,
                            cl:'#FF8800', txt:`SUSPENSION: ${fighter.name} — ${days} game(s) (match penalty)`, isNote:true});
                    }
                });
            }

        // PENALTY SHOT
        } else if (ev.type === 'pshot') {
            const psHome   = Math.random()<0.5;
            const psTeam   = psHome?g.h:g.a;
            const psGoalie = psHome?aG_obj:hG_obj;
            const psOnIce  = (psHome?hOnIce:aOnIce).filter(p=>p.pos!=='G');
            const psShooter = psOnIce.length ? selectShooter(psOnIce) : null;
            if (psShooter && psGoalie) {
                const sOvr = getPlayerWeightedStats(psShooter.name).ovr||75;
                const gOvr = getPlayerWeightedStats(psGoalie.name).ovr||75;
                const psPr = 0.30+(sOvr-gOvr)*0.005;
                const psSc = Math.random()<Math.max(0.15,Math.min(0.65,psPr));
                trk(psShooter.name,'s',1);
                if (psSc) {
                    if (psHome){hG++;trk(psShooter.name,'g',1);trk(aG_name,'ga',1);trk(aG_name,'sa',1);}
                    else{aG++;trk(psShooter.name,'g',1);trk(hG_name,'ga',1);trk(hG_name,'sa',1);}
                } else {
                    if (psHome){trk(aG_name,'sv',1);trk(aG_name,'sa',1);}
                    else{trk(hG_name,'sv',1);trk(hG_name,'sa',1);}
                }
                const psTxt=`${psShooter.name} on a PENALTY SHOT — ${psSc?'GOAL':'STOPPED'}! (${psTeam.code} vs ${psGoalie.name})`;
                allGoals.push({p:period, m:minute%20||20, s:sec, tm:psTeam.code,
                    cl:psSc?(teamColors[psTeam.nrm]?.[0]||'#fff'):'#888',
                    txt:psTxt, isPenaltyShot:true, isGoal:psSc,
                    scorer:psSc?psShooter.name:null, code:psTeam.code});
                if (awardConfig.headlines) tradeLog.unshift({day:`DAY ${currentDay+1}`, details:`PENALTY SHOT: ${psTxt}`});
            }
        }
    } // end event stream

    // EMPTY NETTER — trailing team pulls goalie in final 2 min (steps 116-119)
    // ~50% chance they actually pull; leading team has ~65% chance to score EN goal
    if (hG !== aG && !isASG) {
        const trailerIsHome = hG < aG;
        const goalDiff = Math.abs(hG - aG);
        if (goalDiff === 1) {
            const pullChance = 0.50;
            if (Math.random() < pullChance) {
                const trailingTeam = trailerIsHome ? g.h : g.a;
                allGoals.push({ p:3, m:59, s:1, str:`P3 59:01`, tm: trailingTeam.code,
                    cl:'#888', txt:`${trailingTeam.code} pulls the goalie for the extra attacker — 6-on-5 with time running out!`, isNote:true });
                const enScorerTeam = trailerIsHome ? g.a : g.h;
                const enGoalie    = trailerIsHome ? hG_name : aG_name;
                const enShooters  = trailerIsHome ? [...aStruct.f[0], ...aStruct.d[0]] : [...hStruct.f[0], ...hStruct.d[0]];
                if (Math.random() < 0.65 && enShooters.length > 0) {
                    const enShooter = selectShooter(enShooters);
                    const sec = Math.floor(Math.random() * 60);
                    const enEv = processSingleGoal(enScorerTeam.nrm, enScorerTeam.code, enShooter, enShooters, `P3 59:${sec<10?'0'+sec:sec}`, 3, 59, sec);
                    if (enEv) {
                        enEv.isEN = true;
                        enEv.tm = enScorerTeam.code;
                        enEv.cl = teamColors[enScorerTeam.nrm]?.[0] || '#fff';
                        enEv.txt = buildGoalText(enEv.scorer, enEv.pAssist, enEv.sAssist, null, false, false, true, 0, 0, 3);
                        allGoals.push(enEv);
                        if (trailerIsHome) { aG++; aShots++; } else { hG++; hShots++; }
                        trk(enEv.scorer, 'g', 1); trk(enEv.scorer, 's', 1);
                        if (enEv.pAssist) trk(enEv.pAssist, 'a', 1);
                        if (enEv.sAssist) trk(enEv.sAssist, 'a', 1);
                        // NHL rules: empty-net goals do NOT count against the pulled goalie
                    }
                } else {
                    // Trailing team gets a shot on empty net (rare tying goal)
                    const tieShooters = trailerIsHome ? [...hStruct.f[0], ...hStruct.d[0]] : [...aStruct.f[0], ...aStruct.d[0]];
                    const tieScorerTeam = trailerIsHome ? g.h : g.a;
                    if (Math.random() < 0.15 && tieShooters.length > 0) {
                        const tieShooter = selectShooter(tieShooters);
                        const sec = Math.floor(Math.random() * 60);
                        const tieEv = processSingleGoal(tieScorerTeam.nrm, tieScorerTeam.code, tieShooter, tieShooters, `P3 59:${sec<10?'0'+sec:sec}`, 3, 59, sec);
                        if (tieEv) {
                            tieEv.tm = tieScorerTeam.code;
                            tieEv.cl = teamColors[tieScorerTeam.nrm]?.[0] || '#fff';
                            tieEv.txt = buildGoalText(tieEv.scorer, tieEv.pAssist, tieEv.sAssist, null, false, false, false, 0, 0, 3);
                            allGoals.push(tieEv);
                            if (trailerIsHome) { hG++; hShots++; } else { aG++; aShots++; }
                            trk(tieEv.scorer, 'g', 1); trk(tieEv.scorer, 's', 1);
                            if (tieEv.pAssist) trk(tieEv.pAssist, 'a', 1);
                            if (tieEv.sAssist) trk(tieEv.sAssist, 'a', 1);
                            const oppGoalie = trailerIsHome ? aG_name : hG_name;
                            if (oppGoalie) { trk(oppGoalie, 'sa', 1); trk(oppGoalie, 'ga', 1); }
                        }
                    }
                }
            }
        }
    }

    // PATRICK ROY PROTOCOL — blowout goalie pull
    // If down 4+ goals through 2 periods with 5+ GA, swap to backup
    const checkBlowoutPull = (losingTeam, losingGoalie, goalsDown, goalsAllowed, struct) => {
        if (goalsAllowed >= 5 && goalsDown >= 4) {
            const goalies = struct.g || [];
            const backup = goalies.find(p => p.name !== losingGoalie);
            if (backup) {
                const sec2 = Math.floor(Math.random()*60);
                allGoals.push({ p:2, m:20, s:sec2, str:`P2 20:${sec2<10?'0'+sec2:sec2}`, tm:losingTeam.code,
                    cl:'#888', txt:`GOALIE CHANGE: ${losingGoalie} pulled — ${backup.name} in net`, isNote:true });
                return backup.name;
            }
        }
        return losingGoalie;
    };
    if (period >= 2) {
        if (aG - hG >= 4) hG_name = checkBlowoutPull(g.h, hG_name, aG-hG, aG, hStruct);
        if (hG - aG >= 4) aG_name = checkBlowoutPull(g.a, aG_name, hG-aG, hG, aStruct);
        // Recalculate wall mods for any backup that stepped in
        const newHGOvr = hG_name ? (getPlayerWeightedStats(hG_name).ovr || 75) : 75;
        const newAGOvr = aG_name ? (getPlayerWeightedStats(aG_name).ovr || 75) : 75;
        hWallMod = Math.max(0.65, Math.min(1.35, 1.0 + (75 - newHGOvr) * 0.013 + (Math.random() - 0.5) * 0.16));
        aWallMod = Math.max(0.65, Math.min(1.35, 1.0 + (75 - newAGOvr) * 0.013 + (Math.random() - 0.5) * 0.16));
    }

    //  5. OVERTIME RESOLUTION
    let otPeriods = 0;
    // REGULAR SEASON OT — 5-minute sudden death (93-94 rules): all tied games go to OT,
    // ~15% resolve, ~85% remain tied — targets ~13-14% tie rate
    if (!isPlayoffs && !isASG && hG === aG) {
        otPeriods = 1;
        if (Math.random() < 0.15) {
            const otLine = (struct) => [...(struct.f[0]||[]), ...(struct.d[0]||[])];
            const otBest = (struct) => {
                const line = otLine(struct);
                if (!line.length) return { ovr: 75, name: null };
                const best = line.reduce((a,b) => (getPlayerWeightedStats(b.name).ovr||70) > (getPlayerWeightedStats(a.name).ovr||70) ? b : a);
                const tag = getPlayerWeightedStats(best.name)?.tag;
                return { ovr: (getPlayerWeightedStats(best.name).ovr||70) + (tag === 'SNIPER' ? 3 : tag === 'SUPERSTAR' ? 5 : 0), name: best.name };
            };
            const otAssist = (struct, starName) => {
                const line = otLine(struct).filter(p => p.name !== starName);
                if (!line.length || Math.random() < 0.15) return null; // ~15% unassisted
                return line[Math.floor(Math.random()*line.length)].name;
            };
            const hStar = otBest(hStruct), aStar = otBest(aStruct);
            const hWinProb = Math.max(0.25, Math.min(0.75, 0.52 + (hStar.ovr - aStar.ovr) * 0.005));
            const otSec = Math.floor(Math.random()*300);
            const otM = Math.floor(otSec/60)+1, otS = otSec%60;
            if (Math.random() < hWinProb) {
                hG++; hShots++;
                trk(aG_name,'sa',1); trk(aG_name,'ga',1);
                if (hStar.name) { trk(hStar.name,'g',1); trk(hStar.name,'s',1); }
                const hAssist = hStar.name ? otAssist(hStruct, hStar.name) : null;
                if (hAssist) trk(hAssist,'a',1);
                allGoals.push({ p:4, m:otM, s:otS, str:`OT ${otM}:${otS<10?'0'+otS:otS}`, tm:g.h.code,
                    cl:teamColors[g.h.nrm]?.[0]||'#fff',
                    txt:buildGoalText(hStar.name, hAssist, null, 'SNIPER', false, false, false, 0, 0, 4), scorer:hStar.name, pAssist:hAssist, code:g.h.code });
            } else {
                aG++; aShots++;
                trk(hG_name,'sa',1); trk(hG_name,'ga',1);
                if (aStar.name) { trk(aStar.name,'g',1); trk(aStar.name,'s',1); }
                const aAssist = aStar.name ? otAssist(aStruct, aStar.name) : null;
                if (aAssist) trk(aAssist,'a',1);
                allGoals.push({ p:4, m:otM, s:otS, str:`OT ${otM}:${otS<10?'0'+otS:otS}`, tm:g.a.code,
                    cl:teamColors[g.a.nrm]?.[0]||'#fff',
                    txt:buildGoalText(aStar.name, aAssist, null, 'SNIPER', false, false, false, 0, 0, 4), scorer:aStar.name, pAssist:aAssist, code:g.a.code });
            }
        }
        // else: OT not resolved — game remains a tie
        // Either way, the 5-min period was actually played — credit the on-ice OT unit (top
        // line + top pair, the same personnel used for the scoring roll above) with the TOI.
        // Goalie TOI already includes this via totalGameMinutes; skaters previously got none.
        const hOtUnit = [...(hStruct.f[0]||[]), ...(hStruct.d[0]||[])];
        const aOtUnit = [...(aStruct.f[0]||[]), ...(aStruct.d[0]||[])];
        hOtUnit.forEach(p => trk(p.name, 'toi', 5));
        aOtUnit.forEach(p => trk(p.name, 'toi', 5));
    }
    if(isPlayoffs && hG === aG) {
        // OT uses top lines + star player modifier — not a coin flip
        const otShooterOvr = (struct) => {
            const line = [...(struct.f[0]||[]), ...(struct.d[0]||[])];
            if (!line.length) return { ovr: 75, name: null };
            const best = line.reduce((a,b) => (getPlayerWeightedStats(b.name).ovr||70) > (getPlayerWeightedStats(a.name).ovr||70) ? b : a);
            const tag = getPlayerWeightedStats(best.name)?.tag;
            const sniperBonus = tag === 'SNIPER' ? 3 : tag === 'SUPERSTAR' ? 5 : 0;
            return { ovr: (getPlayerWeightedStats(best.name).ovr||70) + sniperBonus, name: best.name };
        };
        const otShooterAssist = (struct, starName) => {
            const line = [...(struct.f[0]||[]), ...(struct.d[0]||[])].filter(p => p.name !== starName);
            if (!line.length || Math.random() < 0.15) return null; // ~15% unassisted
            return line[Math.floor(Math.random()*line.length)].name;
        };
        while (hG === aG && otPeriods < 7) {
            otPeriods++;
            const hStar = otShooterOvr(hStruct);
            const aStar = otShooterOvr(aStruct);
            // Home ice + star OVR comparison determines winner probability
            const hWinProb = 0.52 + (hStar.ovr - aStar.ovr) * 0.005;
            const otSec = Math.floor(Math.random()*1200); // random time in 20-min OT period
            if (Math.random() < Math.max(0.25, Math.min(0.75, hWinProb))) {
                hG++; hShots++;
                trk(aG_name,'sa',1); trk(aG_name,'ga',1);
                if (hStar.name) { trk(hStar.name,'g',1); trk(hStar.name,'s',1); }
                const hAssist = hStar.name ? otShooterAssist(hStruct, hStar.name) : null;
                if (hAssist) trk(hAssist,'a',1);
                const otM = Math.floor(otSec/60)+1, otS = otSec%60;
                allGoals.push({ p:3+otPeriods, m:otM, s:otS, str:`OT${otPeriods} ${otM}:${otS<10?'0'+otS:otS}`,
                    tm:g.h.code, cl:teamColors[g.h.nrm]?.[0]||'#fff',
                    txt:buildGoalText(hStar.name, hAssist, null, 'SNIPER', false, false, false, 0, 0, 4), scorer:hStar.name, pAssist:hAssist, code:g.h.code });
            } else {
                aG++; aShots++;
                trk(hG_name,'sa',1); trk(hG_name,'ga',1);
                if (aStar.name) { trk(aStar.name,'g',1); trk(aStar.name,'s',1); }
                const aAssist = aStar.name ? otShooterAssist(aStruct, aStar.name) : null;
                if (aAssist) trk(aAssist,'a',1);
                const otM = Math.floor(otSec/60)+1, otS = otSec%60;
                allGoals.push({ p:3+otPeriods, m:otM, s:otS, str:`OT${otPeriods} ${otM}:${otS<10?'0'+otS:otS}`,
                    tm:g.a.code, cl:teamColors[g.a.nrm]?.[0]||'#fff',
                    txt:buildGoalText(aStar.name, aAssist, null, 'SNIPER', false, false, false, 0, 0, 4), scorer:aStar.name, pAssist:aAssist, code:g.a.code });
            }
        }
        // Same fixed OT unit (top line + top pair) played every period this game — credit all
        // of them with the full otPeriods*20 minutes, matching goalie TOI which already includes it.
        if (otPeriods > 0) {
            const hOtUnit = [...(hStruct.f[0]||[]), ...(hStruct.d[0]||[])];
            const aOtUnit = [...(aStruct.f[0]||[]), ...(aStruct.d[0]||[])];
            hOtUnit.forEach(p => trk(p.name, 'toi', otPeriods * 20));
            aOtUnit.forEach(p => trk(p.name, 'toi', otPeriods * 20));
        }
    }

    //  6. COMPILE BOX SCORE
    allGoals.push(...penaltyEvents); 
    allGoals.sort((a,b) => a.p !== b.p ? a.p - b.p : (a.m !== b.m ? a.m - b.m : a.s - b.s));

    // [AWD] GAME WINNING GOAL  -  credit the scorer of the winning team's lead-clinching goal
    if (hG !== aG) {
        const winnerCode = hG > aG ? g.h.code : g.a.code;
        const loserFinalScore = hG > aG ? aG : hG;
        // GWG = first goal that put winner ahead by more than the loser's final total
        // i.e. the goal that made it (loserFinalScore + 1) for the winner
        const gwgTarget = loserFinalScore + 1;
        let winnerGoalCount = 0;
        const scoredGoals = allGoals.filter(ev => ev.scorer && ev.code === winnerCode);
        for (const ev of scoredGoals) {
            winnerGoalCount++;
            if (winnerGoalCount === gwgTarget) {
                if (playerStats[ev.scorer]) {
                    playerStats[ev.scorer][k].gwg = (playerStats[ev.scorer][k].gwg || 0) + 1;
                }
                break;
            }
        }
    }

    // ðŸ¤• 7. INJURIES
    rollInGameInjuries(g.h.nrm, g.a.nrm);
    
    //  8. GOALIE POSITION RECORDING
    let hStatus = hG > aG ? 'win' : (hG < aG ? 'loss' : 'tie'); 
    let aStatus = aG > hG ? 'win' : (aG < hG ? 'loss' : 'tie');
    let totalGameMinutes = 60 + (isPlayoffs ? otPeriods * 20 : otPeriods * 5);
    
    const hPulled = hG_name !== origHG_name;
    const aPulled = aG_name !== origAG_name;
    if (hG_obj) {
        const decisionGoalie = hPulled ? origHG_name : hG_name;
        if (playerStats[decisionGoalie]?.[k]) {
            playerStats[decisionGoalie][k].gp++;
            if (hStatus === 'win') playerStats[decisionGoalie][k].w++; else if (hStatus === 'loss') playerStats[decisionGoalie][k].l++; else playerStats[decisionGoalie][k].t++;
        }
        // No GP credit for a pulled-in backup here — the blowout-pull check runs after the
        // entire tick loop finishes, so it's a retroactive relabeling, not a real mid-game
        // swap. Every shot/save in this game was actually simulated under the original
        // starter's ratings the whole way through; the backup has zero real TOI/SA/SV to
        // back up an appearance, so crediting them a bare GP was a phantom stat line.
        if (!hPulled && aG === 0) playerStats[hG_name][k].so++;
        trk(origHG_name, 'toi', totalGameMinutes);
    }
    if (aG_obj) {
        const decisionGoalie = aPulled ? origAG_name : aG_name;
        if (playerStats[decisionGoalie]?.[k]) {
            playerStats[decisionGoalie][k].gp++;
            if (aStatus === 'win') playerStats[decisionGoalie][k].w++; else if (aStatus === 'loss') playerStats[decisionGoalie][k].l++; else playerStats[decisionGoalie][k].t++;
        }
        if (!aPulled && hG === 0) playerStats[aG_name][k].so++;
        trk(origAG_name, 'toi', totalGameMinutes);
    }

    // Compute 3 Stars (skaters by pts+pm, goalies eligible by sv%)
    const allPlayers = [
        ...hStruct.f.flat(), ...hStruct.d.flat(),
        ...aStruct.f.flat(), ...aStruct.d.flat()
    ];
    const starScores = allPlayers.map(p => {
        const ms = matchStats[p.name] || {};
        return { name: p.name, score: (ms.g||0)*3 + (ms.a||0)*2 + (ms.pm||0)*0.5 };
    });
    const goalieStars = [];
    [[hG_name, aShots, aG], [aG_name, hShots, hG]].forEach(([gName, sa, ga]) => {
        if (gName && sa > 0) {
            const svPct = (sa - ga) / sa;
            if (svPct >= 0.900) goalieStars.push({ name: gName, score: svPct * 6 + (svPct >= 0.940 ? 3 : svPct >= 0.920 ? 1.5 : 0) });
        }
    });
    const allStarCandidates = [...starScores, ...goalieStars].sort((a,b) => b.score - a.score);
    const seen = new Set(); const threeStars = [];
    for (const c of allStarCandidates) { if (!seen.has(c.name) && c.score > 0) { seen.add(c.name); threeStars.push(c.name); } if (threeStars.length === 3) break; }
    if (!isASG && awardConfig.headlines && threeStars.length > 0) {
        const starLine = threeStars.map((n,i) => `${['1st','2nd','3rd'][i]}: ${n}`).join(' | ');
        tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `THREE STARS — ${g.a.code} ${aG}-${hG} ${g.h.code}: ${starLine}` });
    }

    // Goalie duel detection
    const hSvPct = aShots > 0 ? (aShots - aG) / aShots : 0;
    const aSvPct = hShots > 0 ? (hShots - hG) / hShots : 0;
    const isGoalieDuel = hSvPct >= 0.930 && aSvPct >= 0.930;
    if (isGoalieDuel && !isASG && awardConfig.headlines) {
        tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `GOALIE DUEL: ${hG_name||'?'} (${Math.round(hSvPct*1000)/10}%) vs ${aG_name||'?'} (${Math.round(aSvPct*1000)/10}%) — what a battle between the pipes!` });
    }

    g.result = {
        hG, aG, ot: otPeriods, boxLog: allGoals, matchStats,
        awayRoster: [...aStruct.f.flat(), ...aStruct.d.flat(), ...(aStruct.g||[])].map(p=>p.name),
        homeRoster: [...hStruct.f.flat(), ...hStruct.d.flat(), ...(hStruct.g||[])].map(p=>p.name),
        hGoalie: hG_name, aGoalie: aG_name, hShots, aShots,
        stars: threeStars, isGoalieDuel
    }; 

    //  9. CENTRALIZED SINGLE-WRITE STAT APPLICATION
    if (!isASG) {
        // Skater game participation tracking
        [...hStruct.f.flat(), ...hStruct.d.flat(), ...aStruct.f.flat(), ...aStruct.d.flat()].forEach(p => {
            if (playerStats[p.name]) playerStats[p.name][k].gp = (playerStats[p.name][k].gp || 0) + 1;
        });

        // Loop over the game's match statistics and map cleanly to the database profiles exactly once
        for (let pName in matchStats) {
            if (playerStats[pName] && playerStats[pName][k]) {
                const pStat = playerStats[pName][k];
                const m = matchStats[pName];
                
                pStat.toi = (pStat.toi || 0) + m.toi;
                pStat.g = (pStat.g || 0) + m.g;
                pStat.a = (pStat.a || 0) + m.a;
                pStat.s = (pStat.s || 0) + m.s;
                pStat.pim = (pStat.pim || 0) + m.pim;
                pStat.pm = (pStat.pm || 0) + (m.pm || 0);  // Add plus/minus transfer
                
                // Keep goalie custom variables isolated safely
                if (m.sa > 0) pStat.sa = (pStat.sa || 0) + m.sa;
                if (m.sv > 0) pStat.sv = (pStat.sv || 0) + m.sv;
                if (m.ga > 0) pStat.ga = (pStat.ga || 0) + m.ga;

                if (typeof checkMilestones === 'function') checkMilestones(pName);
            }
        }

        // Accumulate season ice-time ticks for cross-game fatigue
        Object.entries(gameIceTicks).forEach(([name, ticks]) => {
            if (playerStats[name]) playerStats[name].seasonTicks = (playerStats[name].seasonTicks || 0) + ticks;
        });

        if(!isPlayoffs) {
            if(hG > aG) { g.h.season.w++; g.h.season.pts += 2; g.a.season.l++; g.h.winStreak++; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless = 0; g.a.loseStreak++; g.a.winless++; g.a.winStreak = 0; g.a.undefeated = 0; }
            else if(aG > hG) { g.a.season.w++; g.a.season.pts += 2; g.h.season.l++; g.a.winStreak++; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless = 0; g.h.loseStreak++; g.h.winless++; g.h.winStreak = 0; g.h.undefeated = 0; }
            else { g.h.season.t++; g.a.season.t++; g.h.season.pts++; g.a.season.pts++; g.h.winStreak = 0; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless++; g.a.winStreak = 0; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless++; }
            g.h.season.gp++; g.a.season.gp++;
            g.h.season.gf += hG; g.h.season.ga += aG; g.h.season.sf = (g.h.season.sf||0) + hShots; g.h.season.sa = (g.h.season.sa||0) + aShots;
            g.a.season.gf += aG; g.a.season.ga += hG; g.a.season.sf = (g.a.season.sf||0) + aShots; g.a.season.sa = (g.a.season.sa||0) + hShots;
            // Track meetings for rivalry detection
            if (!g.h.season.meetings) g.h.season.meetings = {};
            if (!g.a.season.meetings) g.a.season.meetings = {};
            g.h.season.meetings[g.a.nrm] = (g.h.season.meetings[g.a.nrm] || 0) + 1;
            g.a.season.meetings[g.h.nrm] = (g.a.season.meetings[g.h.nrm] || 0) + 1;
            // Track H2H pts for tiebreaker (each team stores pts earned vs each opponent)
            if (!g.h.season.h2h) g.h.season.h2h = {};
            if (!g.a.season.h2h) g.a.season.h2h = {};
            const hPts = hG > aG ? 2 : hG === aG ? 1 : 0;
            const aPts = aG > hG ? 2 : aG === hG ? 1 : 0;
            g.h.season.h2h[g.a.nrm] = (g.h.season.h2h[g.a.nrm] || 0) + hPts;
            g.a.season.h2h[g.h.nrm] = (g.a.season.h2h[g.h.nrm] || 0) + aPts;
        } else if(g.series) {
            if(hG > aG) g.series.hW++; else g.series.aW++;
            if (!g.series.games) g.series.games = [];
            g.series.games.push(g);
        }
    }

    // 10. MORALE & POST-GAME CLEANUP
    let isHomeWin = (hG > aG);
    const isTie = (hG === aG);
    const winningTeamRoster = isHomeWin ? [...hStruct.f.flat(), ...hStruct.d.flat()] : [...aStruct.f.flat(), ...aStruct.d.flat()];
    const losingTeamRoster = isHomeWin ? [...aStruct.f.flat(), ...aStruct.d.flat()] : [...hStruct.f.flat(), ...hStruct.d.flat()];

    // Underdog morale scaling: a win means more to a rated-below-60 club (upset energy), and a
    // loss stings less since it's the expected outcome. Scales linearly below 60 OVR, capped so
    // it can't invert the effect for very weak teams.
    const winningTk = isHomeWin ? g.h.nrm : g.a.nrm;
    const losingTk = isHomeWin ? g.a.nrm : g.h.nrm;
    const winTeamOvr = getDynamicTeamOvr(winningTk) || 70;
    const loseTeamOvr = getDynamicTeamOvr(losingTk) || 70;
    const underdogWinMod = winTeamOvr < 60 ? Math.min(1.6, 1 + (60 - winTeamOvr) * 0.03) : 1.0;
    const underdogLossMod = loseTeamOvr < 60 ? Math.max(0.4, 1 - (60 - loseTeamOvr) * 0.03) : 1.0;

    if (!isTie && winningTeamRoster) {
        let winBoost = (isHomeWin ? 12 : 8) * underdogWinMod;
        winningTeamRoster.forEach(p => {
            if (playerStats[p.name]) playerStats[p.name].morale = Math.min(150, (playerStats[p.name].morale ?? 100) + winBoost);
        });
    }

    if (!isTie && losingTeamRoster && !isPlayoffs) {
        let lossPenalty = ((!isHomeWin) ? 12 : 6) * underdogLossMod;
        losingTeamRoster.forEach(p => {
            if (playerStats[p.name]) playerStats[p.name].morale = Math.max(50, (playerStats[p.name].morale ?? 100) - lossPenalty);
        });
    }

    // Stamp which day each goalie last played so B2B penalty can target only the tired starter
    if (hG_name && playerStats[hG_name]) playerStats[hG_name].lastPlayedDay = currentDay;
    if (aG_name && playerStats[aG_name]) playerStats[aG_name].lastPlayedDay = currentDay;
    let activeGoalies = [hG_obj, aG_obj].filter(g => g !== null);
    if (typeof processPostGameStreaks === 'function') processPostGameStreaks(winningTeamRoster.concat(losingTeamRoster), activeGoalies, matchStats);
    if (!isASG && typeof applyPostGameFatigue === 'function' && origHG_name && origAG_name) applyPostGameFatigue(g.a.nrm, g.h.nrm, origAG_name, origHG_name);
    if (!isASG && typeof reviewGameForSuspensions === 'function') { reviewGameForSuspensions(matchStats, g.h.nrm, g.a.nrm); clearWpCache(); }
    if (!isASG && typeof triggerGameInjuries === 'function') { triggerGameInjuries(matchStats, g.h.nrm, g.a.nrm); clearWpCache(); }

    // Chemistry score decay/rebuild for custom duos
    if (!isASG && customDuos.length > 0) {
        const goalParticipants = allGoals
            .filter(ev => !ev.isNote && !ev.isFiller && !ev.isPenalty && ev.scorer)
            .map(ev => new Set([ev.scorer, ev.pAssist, ev.sAssist].filter(Boolean)));
        for (const duo of customDuos) {
            const key = duoKey(duo);
            const current = chemScores[key] ?? 100;
            const connected = goalParticipants.some(participants =>
                duo.filter(n => participants.has(n)).length >= 2
            );
            chemScores[key] = Math.max(40, Math.min(100, current + (connected ? 5 : -1)));
        }
    }

    // Per-line chemistry build/decay — credit only when 2+ members of the SAME line/pair contributed to a goal for THEIR team
    if (!isASG) {
        const teamGoals = {};
        teamGoals[g.h.nrm] = allGoals.filter(ev => ev.scorer && !ev.isPenalty && ev.tm === g.h.code);
        teamGoals[g.a.nrm] = allGoals.filter(ev => ev.scorer && !ev.isPenalty && ev.tm === g.a.code);
        [g.h.nrm, g.a.nrm].forEach(tk => {
            const tObj = league.find(t=>t.nrm===tk);
            if (!tObj || !tObj.chem || !tObj.chem.lastUnit) return;
            const tkGoalParticipants = (teamGoals[tk] || []).map(ev => new Set([ev.scorer, ev.pAssist, ev.sAssist].filter(Boolean)));
            tObj.chem.lastUnit.f.forEach((line, i) => {
                const lineNames = line.filter(p=>p).map(p=>p.name);
                const lineScored = tkGoalParticipants.some(goalSet => lineNames.filter(n => goalSet.has(n)).length >= 2);
                tObj.chem.f[i] = Math.max(0, Math.min(15, (tObj.chem.f[i]||0) + (lineScored ? 1 : -0.75)));
            });
            tObj.chem.lastUnit.d.forEach((pair, i) => {
                const pairNames = pair.filter(p=>p).map(p=>p.name);
                // Only 2 members per pair (vs. 3 on a forward line), and D already take a 20%
                // assist-weight penalty in processSingleGoal — requiring BOTH partners on the
                // SAME goal is almost never satisfied, leaving pair chemistry permanently near 0
                // league-wide. The increment is already scaled down (0.5/-0.35 vs 1/-0.75) to
                // compensate for an easier trigger, so 1+ member on the goal is enough here.
                const pairScored = tkGoalParticipants.some(goalSet => pairNames.some(n => goalSet.has(n)));
                tObj.chem.d[i] = Math.max(0, Math.min(15, (tObj.chem.d[i]||0) + (pairScored ? 0.5 : -0.35)));
            });
        });
    }

    // Update coach trust after user-team games
    if (selectedTeam && (g.h.nrm === selectedTeam || g.a.nrm === selectedTeam) && !isASG) {
        const userIsHome = g.h.nrm === selectedTeam;
        const userWon = userIsHome ? hG > aG : aG > hG;
        const userLost = userIsHome ? aG > hG : hG > aG;
        coachTrust = Math.max(0, Math.min(100, coachTrust + (userWon ? 4 : userLost ? -3 : 1)));
    }

    // Surface milestone banners in trade log / news ticker
    if (gameMilestones.length > 0 && awardConfig.milestones && awardConfig.headlines) {
        gameMilestones.forEach(msg => {
            tradeLog.unshift({ day: `DAY ${currentDay + 1}`, details: `MILESTONE: ${msg}` });
        });
    }
}

// --- Weighted Shooter Selection Helper ---
// We don't want a 50/50 shot between a Defender and a Center.
// We assign weight probabilities based on Position.
function selectShooter(unit) {
    if (!unit || unit.length === 0) return null;

    const weights = unit.map(player => {
        // Normalize: unit may contain objects or name strings
        const name = (player && typeof player === 'object') ? player.name : player;
        if (!name) return 0;

        const ps = playerStats[name];
        if (!ps) return 1;

        const pA = ps.attr || {};
        const tag = (typeof getPlayerWeightedStats === 'function') ? (getPlayerWeightedStats(name)?.tag || 'GENERIC') : 'GENERIC';
        const arch = (typeof archMods !== 'undefined' && archMods[tag]) ? archMods[tag] : { shotRate: 1.0 };

        // Attributes: Off, ShotPwr, ShotAcc
        const off = pA.off     || 70;
        const pwr = pA.shotPwr || 70;
        const acc = pA.shotAcc || 70;

        // Base weight from attributes  -  same formula for all positions
        let weight = (off * 0.40) + (pwr * 0.30) + (acc * 0.30);

        // Archetype multiplier
        weight *= (arch.shotRate || 1.0);

        // Position modifier  -  wingers shoot a bit more, centers distribute, D ~20% less
        const pos = ps.pos || 'D';
        const isD = (pos === 'D' || pos === 'LD' || pos === 'RD');
        weight *= isD ? 0.80 : (pos === 'LW' || pos === 'RW') ? 1.08 : (pos === 'C') ? 0.95 : 1.0;

        // Hot/cold modifier
        if (ps.macro_streak === 'HOT' || ps.micro_streak === 'HOT')  weight *= 1.20;
        if (ps.macro_streak === 'COLD' || ps.micro_streak === 'COLD') weight *= 0.80;

        return Math.max(1, weight);
    });

    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return unit[0];

    let rand = Math.random() * total;
    for (let i = 0; i < unit.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return unit[i];
    }
    return unit[unit.length - 1];
}

function processSingleGoal(teamName, teamCode, scorerName, onIcePlayers, timeStr, period, minute, sec) {
    // --- Normalize inputs ---
    // scorerName and onIcePlayers may be objects {name,pos,...} or strings  -  normalize all to name strings
    const scorerStr = (scorerName && typeof scorerName === 'object') ? scorerName.name : scorerName;
    const onIceNames = onIcePlayers
        .map(p => (p && typeof p === 'object') ? p.name : p)
        .filter(Boolean);

    // STRICT: only the 5-man unit on ice can be credited  -  scorer already chosen, assisters from same unit only
    const eligiblePool = onIceNames.filter(name => name && name !== scorerStr);

    // --- Attribute + Archetype + Position weight for assists ---
    const getAssistWeight = (name) => {
        const ps = playerStats[name];
        if (!ps) return 1;

        const pA = ps.attr || {};
        const tag = (typeof getPlayerWeightedStats === 'function') ? (getPlayerWeightedStats(name)?.tag || 'GENERIC') : 'GENERIC';
        const arch = (typeof archMods !== 'undefined' && archMods[tag]) ? archMods[tag] : { assistRate: 1.0 };

        // Attributes driving assist likelihood
        const pass  = pA.pass    || 70;
        const off   = pA.off     || 70;
        const stick = pA.stkHnd  || 70;

        // Base weight from attributes
        let weight = (pass * 0.45) + (off * 0.30) + (stick * 0.25);

        // Archetype modifier
        weight *= (arch.assistRate || 1.0);

        // Position modifier  -  centers are primary distributors, D penalized ~20%
        const pos = ps.pos || 'D';
        const isD = (pos === 'D' || pos === 'LD' || pos === 'RD');
        weight *= isD ? 0.80 : (pos === 'C') ? 1.15 : 1.0;

        // Hot/cold streak modifier
        if (ps.isHot)  weight *= 1.15;
        if (ps.isCold) weight *= 0.85;

        return Math.max(1, weight);
    };

    // Weighted random picker
    const weightedPick = (pool) => {
        const weights = pool.map(name => getAssistWeight(name));
        const total = weights.reduce((a, b) => a + b, 0);
        if (total <= 0) return pool[Math.floor(Math.random() * pool.length)];
        let rand = Math.random() * total;
        for (let i = 0; i < pool.length; i++) {
            rand -= weights[i];
            if (rand <= 0) return pool[i];
        }
        return pool[pool.length - 1];
    };

    let primaryAssist = null;
    let secondaryAssist = null;
    let remaining = [...eligiblePool];

    // Primary Assist (~93.1% chance) — combined with the secondary rate below, this targets
    // ~71.5% of all goals getting two assists, ~21.6% one assist, ~6.9% unassisted (the increase
    // to two-assist goals is taken entirely from the unassisted bucket, one-assist unchanged).
    if (remaining.length > 0 && Math.random() < 0.931) {
        primaryAssist = weightedPick(remaining);
        remaining = remaining.filter(n => n !== primaryAssist);
    }

    // Secondary Assist (~76.8% chance if primary exists and players remain)
    if (primaryAssist && remaining.length > 0 && Math.random() < 0.768) {
        secondaryAssist = weightedPick(remaining);
    }

    return {
        time:     timeStr,
        period:   period,
        team:     teamName,
        code:     teamCode,
        scorer:   scorerStr,
        pAssist:  primaryAssist,
        sAssist:  secondaryAssist,
        display:  `${timeStr} - ${teamCode} - GOAL! ${scorerStr} (${primaryAssist || 'None'}, ${secondaryAssist || 'None'})`
    };
}

function applyDailyRandomSwing(tk) {
    const struct = getRosterStructure(tk);
    if (!struct || !struct.f || !struct.d) return;

    const starters = [...struct.f.flat(), ...struct.d.flat()]
        .filter(p => p && playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0);

    // Reset daily swing for whole roster
    rosters[tk].forEach(p => { if (playerStats[p.name]) playerStats[p.name].dailySwing = 0; });

    if (starters.length < 2) return;

    // Weighted selection — mirrors assignMicroStreaks logic so swing and micro reinforce each other
    const hotW  = p => { const ps = playerStats[p.name]; const lastPts = ps.recentGames?.slice(-1)[0]?.pts || 0; return Math.max(0.1, 1 + lastPts * 2); };
    const coldW = p => { const ps = playerStats[p.name]; const lastPts = ps.recentGames?.slice(-1)[0]?.pts || 0; const pointless = ps.consPointless || 0; return Math.max(0.1, (1 + pointless * 0.5) * (lastPts === 0 ? 2 : 0.5)); };
    const pick  = (pool, wFn) => { const w = pool.map(wFn); const t = w.reduce((a,b)=>a+b,0); let r = Math.random()*t; for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i];} return pool[0]; };

    const hotPlayer  = pick(starters, hotW);
    const coldPlayer = pick(starters.filter(p => p !== hotPlayer), coldW);

    // dailySwing feeds into getPlayerWeightedStats OVR (±8% of baseOvr — percentage so stars don't crater)
    playerStats[hotPlayer.name].dailySwing  =  0.08;
    playerStats[coldPlayer.name].dailySwing = -0.08;
}

// =========================================================
//  POST-GAME STAT TRACKING (Unified Ice Time & SVG)
// =========================================================
/**
 * Track ice time and SVG (Shots vs Goals) for entire roster post-game
 * @param {array} roster - Team roster with name/pos properties
 * @param {string} teamCode - Normalized team code
 * @param {array} scoringPlayers - Goals array from this game [{scorer, a1, a2, ...}]
 * @param {boolean} isGoalieStart - Whether goalie started this game
 */

// =========================================================
// ðŸ’ª POST-GAME MORALE SYSTEM (Refactored)
// =========================================================
/**
 * Apply post-game morale swings based on game result and scoring
 * @param {array} winnerRoster - Winning team's roster
 * @param {array} loserRoster - Losing team's roster
 * @param {array} scoringPlayers - All goal records from game
 * @param {boolean} isHomeWin - Whether home team won
 * @param {boolean} isRegularSeason - Whether regular season (affects loss penalty)
 */

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

function buildGoalText(scorer, a1, a2, tag, isPP, isSH, isEN, scorerScore, opponentScore, period) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const assists = a1 ? ` (${a1}${a2 ? ', ' + a2 : ''})` : '';
    const name = scorer || 'Unknown';

    if (isEN)  return `${name} fires into the empty net — that seals it!${assists}`;
    if (isSH)  return pick([
        `SHORTHANDED! ${name} breaks away and beats the goalie!${assists}`,
        `Against the run of play — ${name} goes shortie on the breakaway!${assists}`,
        `${name} steals the puck and goes all alone — shorthanded goal!${assists}`,
    ]);
    if (isPP)  return pick([
        `Power play goal — ${name} one-times it past the netminder!${assists}`,
        `${name} with the man advantage — buried!${assists}`,
        `The PP clicks: ${name} finds the opening and scores!${assists}`,
    ]);
    if (period >= 4) return pick([
        `OVERTIME WINNER! ${name} ends it in sudden death!${assists}`,
        `${name} with the OT dagger — this one is OVER!${assists}`,
        `In overtime, ${name} beats the goalie and sends the crowd home happy!${assists}`,
    ]);

    const tense = period === 3;
    const trailing = scorerScore < opponentScore;

    if (tag === 'SNIPER' || tag === 'SUPERSTAR') return pick([
        `${name} winds up from the circle and RIFLES it top shelf!${assists}`,
        `Textbook snipe — ${name} picks the corner and the goalie had no chance!${assists}`,
        `${name} with the laser — perfectly placed!${assists}`,
        `World-class finish from ${name}. The goalie didn't move.${assists}`,
    ]);
    if (tense && trailing) return pick([
        `CLUTCH! ${name} cuts the lead — the bench erupts!${assists}`,
        `${name} answers back! This game isn't over!${assists}`,
        `Big response from ${name}. They're not done yet!${assists}`,
    ]);
    if (tense) return pick([
        `${name} pots one late in the third to extend the lead!${assists}`,
        `${name} with a big-time third-period goal!${assists}`,
        `That's an insurance marker from ${name}!${assists}`,
    ]);
    return pick([
        `${name} buries the rebound — goal!${assists}`,
        `${name} with a wrist shot — the goalie had no read on it!${assists}`,
        `Deflection off the stick of ${name} — it's in!${assists}`,
        `${name} accepts the feed and fires home!${assists}`,
        `Quick release from ${name} — scores!${assists}`,
        `${name} beats the goalie five-hole — goal!${assists}`,
    ]);
}

function showSeasonRecap() {
    const allP = Object.values(playerStats);
    const maxGP = Math.max(1, ...league.map(t => t.season.gp));
    const minSk = Math.max(1, Math.floor(maxGP * 0.35));
    const minG  = Math.max(1, Math.floor(maxGP * 0.25));
    const skaters = allP.filter(p => p.pos !== 'G' && p.season.gp >= minSk);
    const goalies  = allP.filter(p => p.pos === 'G'  && p.season.gp >= minG);

    const sorted = [...league].sort((a,b) => b.season.pts - a.season.pts);
    const presidents = sorted[0];

    const topPts   = [...skaters].sort((a,b) => (b.season.g+b.season.a)-(a.season.g+a.season.a)).slice(0,5);
    const topG     = [...skaters].sort((a,b) => b.season.g-a.season.g).slice(0,3);
    const topSV    = [...goalies].sort((a,b) => { const sa=(s)=>s.season.sa>0?s.season.sv/s.season.sa:0; return sa(b)-sa(a); }).slice(0,3);
    const topSO    = [...goalies].sort((a,b) => b.season.so-a.season.so)[0];
    const topPIM   = [...skaters].sort((a,b) => (b.season.pim||0)-(a.season.pim||0))[0];

    const eastSeeds = league.filter(t=>t.conf==='Eastern').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8);
    const westSeeds = league.filter(t=>t.conf==='Western').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8);

    const statRow = (label, val, color='var(--neon-cyan)') =>
        `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1a1a1a;font-size:7px;">
            <span style="color:#666;">${label}</span><span style="color:${color};">${val}</span>
         </div>`;

    const seedCol = (title, seeds) => {
        const rows = seeds.map((t,i) => {
            const dot = i < 8 ? (i===0?'<span style="color:var(--gold-leaf);">★</span>':'<span style="color:#0b0;">●</span>') : '';
            return `<div style="display:flex;justify-content:space-between;font-size:6px;padding:3px 0;border-bottom:1px solid #111;">
                <span>${dot} ${i+1}. ${t.code}</span><span style="color:#aaa;">${t.season.pts}pts</span></div>`;
        }).join('');
        return `<div style="flex:1;min-width:120px;"><div style="font-size:6px;color:#666;letter-spacing:.14em;margin-bottom:6px;">${title}</div>${rows}</div>`;
    };

    let h = `<div style="text-align:center;border-bottom:2px solid var(--neon-cyan);padding-bottom:12px;margin-bottom:16px;">
        <div style="color:var(--neon-cyan);font-size:12px;">SEASON ${currentSeason} — REGULAR SEASON FINAL</div>
        <div style="color:#555;font-size:7px;margin-top:6px;">${maxGP} GAMES PLAYED</div>
    </div>`;

    // Presidents' Trophy
    h += `<div style="background:linear-gradient(135deg,#0a1200,#111d00);border:1px solid var(--gold-leaf);padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <div><div style="color:#666;font-size:6px;letter-spacing:.14em;">PRESIDENTS' TROPHY</div>
        <div style="color:var(--ea-yellow);font-size:10px;margin-top:4px;">${presidents.name}</div></div>
        <div style="text-align:right;font-size:7px;color:#aaa;">${presidents.season.w}W ${presidents.season.l}L ${presidents.season.t}T<br>
        <span style="color:var(--gold-leaf);">${presidents.season.pts} PTS</span></div>
    </div>`;

    // Scoring leaders
    h += `<div style="color:#666;font-size:6px;letter-spacing:.14em;margin-bottom:6px;">SCORING LEADERS</div>`;
    topPts.forEach((p,i) => {
        const pts = p.season.g + p.season.a;
        h += statRow(`${i+1}. ${p.name} <span style="color:#444">${p.teamCode}</span>`,
            `${p.season.g}G  ${p.season.a}A  ${pts}PTS`);
    });

    // Goal leader + PIM
    h += `<div style="display:flex;gap:12px;margin-top:12px;margin-bottom:12px;">`;
    if (topG[0]) h += `<div style="flex:1;background:#0a0a0a;border:1px solid #222;padding:8px 10px;">
        <div style="color:#555;font-size:6px;letter-spacing:.12em;">GOAL LEADER</div>
        <div style="color:#fff;font-size:8px;margin-top:4px;">${topG[0].name}</div>
        <div style="color:var(--neon-cyan);font-size:7px;">${topG[0].season.g} G</div></div>`;
    if (topSO) h += `<div style="flex:1;background:#0a0a0a;border:1px solid #222;padding:8px 10px;">
        <div style="color:#555;font-size:6px;letter-spacing:.12em;">SHUTOUT LEADER</div>
        <div style="color:#fff;font-size:8px;margin-top:4px;">${topSO.name}</div>
        <div style="color:var(--neon-cyan);font-size:7px;">${topSO.season.so} SO</div></div>`;
    if (topPIM) h += `<div style="flex:1;background:#0a0a0a;border:1px solid #222;padding:8px 10px;">
        <div style="color:#555;font-size:6px;letter-spacing:.12em;">PIM LEADER</div>
        <div style="color:#fff;font-size:8px;margin-top:4px;">${topPIM.name}</div>
        <div style="color:var(--as-orange);font-size:7px;">${topPIM.season.pim} PIM</div></div>`;
    h += `</div>`;

    // Goalie leaders
    h += `<div style="color:#666;font-size:6px;letter-spacing:.14em;margin-bottom:6px;">GOALIE LEADERS</div>`;
    topSV.forEach((g,i) => {
        const svp = g.season.sa > 0 ? (g.season.sv/g.season.sa).toFixed(3) : '.000';
        h += statRow(`${i+1}. ${g.name} <span style="color:#444">${g.teamCode}</span>`,
            `${g.season.w}W  ${g.season.so}SO  ${svp}`);
    });

    // Playoff seeds
    h += `<div style="color:#666;font-size:6px;letter-spacing:.14em;margin:14px 0 8px;">PLAYOFF SEEDS</div>
    <div style="display:flex;gap:16px;">${seedCol('WALES CONF', eastSeeds)}${seedCol('CAMPBELL CONF', westSeeds)}</div>`;

    document.getElementById('recapContent').innerHTML = h;
    document.getElementById('recapOverlay').style.display = 'flex';
}

function initPlayoffs() {
    isPlayoffs = true; currentDay = 0; calendar = [];
    Object.values(playerStats).forEach(p => {
        [1, 2, 3, 4].forEach(r => {
            if (p.pos === 'G') p[`playoff_${r}`] = {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0, toi:0, svg:0};
            else p[`playoff_${r}`] = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0};
        });
        // Clear the aggregate just in case
        if (p.pos === 'G') p.playoff = {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0, toi:0, svg:0};
        else p.playoff = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0};
    });
    const sortTeams = (a, b) => {
        if (b.season.pts !== a.season.pts) return b.season.pts - a.season.pts;
        if (b.season.w   !== a.season.w)   return b.season.w   - a.season.w;
        // H2H tiebreaker: pts earned in games between just these two teams
        const aH2H = (a.season.h2h && a.season.h2h[b.nrm]) || 0;
        const bH2H = (b.season.h2h && b.season.h2h[a.nrm]) || 0;
        if (bH2H !== aH2H) return bH2H - aH2H;
        // Final tiebreaker: goal differential
        return (b.season.gf - b.season.ga) - (a.season.gf - a.season.ga);
    };
    // Real 93-94 format: top 4 per division, 1v4 and 2v3 within each division
    const divTop4 = (div) => league.filter(t => t.div === div).sort(sortTeams).slice(0, 4);
    const atl = divTop4('Atlantic');
    const ne  = divTop4('Northeast');
    const cen = divTop4('Central');
    const pac = divTop4('Pacific');

    // Stamp division seed so home ice in later rounds uses seed, not raw pts
    [atl, ne, cen, pac].forEach(div => div.forEach((t, i) => { t._playoffSeed = i + 1; }));
    const mkS = (t1, t2, conf, div, slot) => {
        const home = (t1._playoffSeed || 99) <= (t2._playoffSeed || 99) ? t1 : t2;
        const away = (t1._playoffSeed || 99) <= (t2._playoffSeed || 99) ? t2 : t1;
        return { h: home, a: away, hW: 0, aW: 0, conf, div, slot, games: [] };
    };

    playoffBracket = { round: 1,
        east: [
            mkS(atl[0], atl[3], 'WALES',    'Atlantic',  'A'),
            mkS(atl[1], atl[2], 'WALES',    'Atlantic',  'B'),
            mkS(ne[0],  ne[3],  'WALES',    'Northeast', 'A'),
            mkS(ne[1],  ne[2],  'WALES',    'Northeast', 'B'),
        ],
        west: [
            mkS(cen[0], cen[3], 'CAMPBELL', 'Central',   'A'),
            mkS(cen[1], cen[2], 'CAMPBELL', 'Central',   'B'),
            mkS(pac[0], pac[3], 'CAMPBELL', 'Pacific',   'A'),
            mkS(pac[1], pac[2], 'CAMPBELL', 'Pacific',   'B'),
        ],
        nextEast: [], nextWest: [], finals: null
    };
    buildPlayoffRound(); initPlayoffsUI(); updateUI(); saveGame(); showSeasonRecap();
}

function buildPlayoffRound() {
    playoffBracket.series = [];
    if (playoffBracket.east) { playoffBracket.east.forEach(m => { m.conf = 'WALES'; playoffBracket.series.push(m); }); }
    if (playoffBracket.west) { playoffBracket.west.forEach(m => { m.conf = 'CAMPBELL'; playoffBracket.series.push(m); }); }
    playoffBracket.series.forEach(s => { if (typeof s.h === 'string') s.h = league.find(t => t.nrm === s.h); if (typeof s.a === 'string') s.a = league.find(t => t.nrm === s.a); });
    genPlayoffSlate();
}
function genPlayoffSlate() { calendar = [[]]; playoffBracket.series.filter(s => s.hW < 4 && s.aW < 4).forEach(s => { calendar[0].push({h:s.h, a:s.a, result:null, series:s}); }); currentDay = 0; updateUI(); showBracket(); }

let _pendingRoundAdvance = null;

function showSeriesRecap(onAdvance) {
    const round = playoffBracket.round;
    const roundLabel = round === 1 ? 'DIVISION SEMIS' : round === 2 ? 'DIVISION FINALS' : round === 3 ? 'CONF FINALS' : 'STANLEY CUP FINALS';
    let h = `<div style="text-align:center; margin-bottom:16px;">
        <div style="color:#888; font-size:6px; letter-spacing:.18em;">${roundLabel}</div>
        <div style="color:var(--ea-yellow); font-size:11px; margin-top:4px;">ROUND COMPLETE</div>
    </div>`;

    playoffBracket.series.forEach(s => {
        const winner = s.hW === 4 ? s.h : s.a;
        const loser  = s.hW === 4 ? s.a : s.h;
        const wW = s.hW === 4 ? s.hW : s.aW;
        const lW = s.hW === 4 ? s.aW : s.hW;

        // Collect all player stats from series games
        const scorerTotals = {};
        const goalieStats  = {};
        (s.games || []).forEach(g => {
            if (!g || !g.result) return;
            Object.entries(g.result.matchStats || {}).forEach(([pName, ms]) => {
                if (!scorerTotals[pName]) scorerTotals[pName] = { g: 0, a: 0 };
                scorerTotals[pName].g += ms.g || 0;
                scorerTotals[pName].a += ms.a || 0;
            });
            [[g.result.hGoalie, g.result.aShots, g.result.aG],
             [g.result.aGoalie, g.result.hShots, g.result.hG]].forEach(([gn, sa, ga]) => {
                if (!gn) return;
                if (!goalieStats[gn]) goalieStats[gn] = { sa: 0, ga: 0 };
                goalieStats[gn].sa += sa || 0;
                goalieStats[gn].ga += ga || 0;
            });
        });

        const topScorer = Object.entries(scorerTotals).sort((a,b) => (b[1].g+b[1].a) - (a[1].g+a[1].a))[0];
        const seriesMVP = topScorer ? topScorer[0] : null;
        const topGoalie = Object.entries(goalieStats).sort((a,b) => {
            const svA = a[1].sa > 0 ? (a[1].sa - a[1].ga) / a[1].sa : 0;
            const svB = b[1].sa > 0 ? (b[1].sa - b[1].ga) / b[1].sa : 0;
            return svB - svA;
        })[0];

        h += `<div style="border:1px solid var(--gold-leaf); border-radius:8px; padding:14px 16px; margin-bottom:12px; background:#0d0d0d;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="color:var(--ea-yellow); font-size:9px;">${winner.code} WINS</span>
                <span style="color:#888; font-size:9px;">${wW} – ${lW}</span>
                <span style="color:#444; font-size:9px;">def. ${loser.code}</span>
            </div>`;
        if (seriesMVP) {
            const ms = scorerTotals[seriesMVP];
            h += `<div style="font-size:7px; color:#ccc; margin-bottom:4px;">
                <span style="color:#888;">SERIES MVP </span>${seriesMVP}
                <span style="color:#555; margin-left:6px;">${ms.g}G ${ms.a}A ${ms.g+ms.a}PTS</span>
            </div>`;
        }
        if (topGoalie) {
            const gs = goalieStats[topGoalie[0]];
            const svp = gs.sa > 0 ? ((gs.sa - gs.ga) / gs.sa * 100).toFixed(1) : '0.0';
            h += `<div style="font-size:7px; color:#ccc;">
                <span style="color:#888;">TOP GOALIE </span>${topGoalie[0]}
                <span style="color:#555; margin-left:6px;">.${svp.replace('.','').padStart(3,'0').slice(0,3)} SV%</span>
            </div>`;
        }
        h += `</div>`;
    });

    document.getElementById('seriesRecapContent').innerHTML = h;
    const advBtn = document.getElementById('seriesRecapAdvBtn');
    if (advBtn) advBtn.innerText = round === 4 ? 'VIEW AWARDS →' : 'ADVANCE TO NEXT ROUND →';
    _pendingRoundAdvance = onAdvance;
    document.getElementById('seriesRecapOverlay').style.display = 'flex';
}

function handleRoundEnd() {
    showSeriesRecap(() => _doRoundAdvance());
}

function _doRoundAdvance() {
    const w = playoffBracket.series.map(s => s.hW === 4 ? s.h : s.a);
    // Save completed round to history before clearing
    if (!playoffBracket.history) playoffBracket.history = [];
    playoffBracket.history.push({
        round: playoffBracket.round,
        label: playoffBracket.round === 1 ? 'DIVISION SEMIS' : playoffBracket.round === 2 ? 'DIVISION FINALS' : playoffBracket.round === 3 ? 'CONF FINALS' : 'STANLEY CUP FINALS',
        series: playoffBracket.series.map(s => ({ hCode: s.h.code, hName: s.h.name, aCode: s.a.code, aName: s.a.name, hW: s.hW, aW: s.aW, conf: s.conf }))
    });
    if(playoffBracket.round === 4) {
        if(w[0]) currentCupChamp = w[0].name;
        _awardsPending = true;
        openAwardsVoting();

        // !! Spawn the button to jump straight into the next year!
        if (!document.getElementById('btnStartNextSeason')) {
            const btnStartNextSeason = document.createElement('button'); 
            btnStartNextSeason.id = 'btnStartNextSeason'; 
            btnStartNextSeason.innerText = 'START NEXT SEASON'; 
            btnStartNextSeason.onclick = beginNewYear; 
            btnStartNextSeason.style = "color: #FFD700; border-color: #FFD700; font-weight: bold; margin-top: 10px;";
            document.getElementById('officeControls').appendChild(btnStartNextSeason);
        }
        return; 
    }
    const prevSeries = playoffBracket.series; // keep ref before reset
    playoffBracket.round++; playoffBracket.series = [];

    const getWinner = s => s.hW === 4 ? s.h : s.a;
    const mkNext = (t1, t2, conf, div) => {
        const home = (t1._playoffSeed || 99) <= (t2._playoffSeed || 99) ? t1 : t2;
        const away = (t1._playoffSeed || 99) <= (t2._playoffSeed || 99) ? t2 : t1;
        return { h: home, a: away, hW: 0, aW: 0, conf, div, games: [] };
    };

    if (playoffBracket.round === 2) {
        // Division Finals: A-slot winner vs B-slot winner within same division
        ['Atlantic', 'Northeast', 'Central', 'Pacific'].forEach(div => {
            const a = prevSeries.find(s => s.div === div && s.slot === 'A');
            const b = prevSeries.find(s => s.div === div && s.slot === 'B');
            if (a && b) {
                const conf = div === 'Atlantic' || div === 'Northeast' ? 'WALES' : 'CAMPBELL';
                playoffBracket.series.push(mkNext(getWinner(a), getWinner(b), conf, div));
            }
        });
    } else if (playoffBracket.round === 3) {
        // Conference Finals: Atlantic champ vs Northeast champ, Central champ vs Pacific champ
        const atlS = prevSeries.find(s => s.div === 'Atlantic');
        const neS  = prevSeries.find(s => s.div === 'Northeast');
        const cenS = prevSeries.find(s => s.div === 'Central');
        const pacS = prevSeries.find(s => s.div === 'Pacific');
        if (atlS && neS)  playoffBracket.series.push(mkNext(getWinner(atlS), getWinner(neS),  'WALES',    'WALES FINAL'));
        if (cenS && pacS) playoffBracket.series.push(mkNext(getWinner(cenS), getWinner(pacS), 'CAMPBELL', 'CAMPBELL FINAL'));
    } else {
        // Stanley Cup Finals: Wales champ vs Campbell champ
        const eS = prevSeries.find(s => s.conf === 'WALES');
        const wS = prevSeries.find(s => s.conf === 'CAMPBELL');
        if (eS && wS) playoffBracket.series.push(mkNext(getWinner(eS), getWinner(wS), 'FINALS', 'FINALS'));
    }
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
        if (p.pos === 'G') {
            p.attr.gDef = Math.max(20, Math.min(99, (parseInt(p.attr.gDef) || 70) + dChg));
            p.attr.pass = Math.max(20, Math.min(99, (parseInt(p.attr.pass) || 60) + pChg));
            p.attr.stkHnd = Math.max(20, Math.min(99, (parseInt(p.attr.stkHnd) || 60) + pChg));
        }
        else { p.attr.off = Math.max(20, Math.min(99, p.attr.off + oChg)); p.attr.def = Math.max(20, Math.min(99, p.attr.def + dChg)); p.attr.ovr = getPlayerWeightedStats(p.name).ovr; }
        if (awardConfig.headlines) {
            if (oChg >= 4 && p.age <= 22) logs.push(` BREAKOUT: ${p.name} (${p.teamCode}) gained +${oChg} OVR this summer!`);
            if (pChg <= -2 && p.age >= 34 && Math.random() < 0.3) logs.push(` FATHER TIME: ${p.name} (${p.teamCode}) lost a step over the summer.`);
        }
    });
    if (logs.length > 0 && awardConfig.headlines) { logs.sort(() => 0.5 - Math.random()).slice(0, 5).forEach(msg => { tradeLog.unshift({ day: 'OFFSEASON', details: msg }); }); }
}

async function beginNewYear() {
    if (_awardsPending) { alert('Reveal the award winners before starting the next season — history would snapshot as zeroed standings otherwise.'); return; }
    clearWpCache();
    currentSeason++; isPlayoffs = false; asgDoneThisSeason = false; currentCupChamp = "";
    // Stale day-indexed state from last season must not leak in — currentDay resets to 0 below,
    // so leftover expiry/day stamps from a 150+ day prior season would otherwise never expire.
    deadlineCountermove = {};
    pendingTrades = [];
    refreshTradeBadge();
    league.forEach(t => {
        t.season = {gp:0, w:0, l:0, t:0, pts:0, gf:0, ga:0, ppo:0, ppg:0, ts:0, ppga:0}; t.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        // Preserve user-set PP/PK lines but drop any players no longer on this roster
        const rosterNames = new Set((rosters[t.nrm] || []).map(p => p.name));
        const filterUnit = (unit) => (unit || []).filter(p => p && rosterNames.has((p && typeof p === 'object') ? p.name : p));
        const st = t.specialTeams || {};
        t.specialTeams = { pp1: filterUnit(st.pp1), pp2: filterUnit(st.pp2), pk1: filterUnit(st.pk1), pk2: filterUnit(st.pk2), exa: filterUnit(st.exa) };
        t.winStreak = 0; t.loseStreak = 0; t.teamMeeting = false; t.coachFired = false; t.undefeated=0; t.winless=0;
    });

    processOffseasonGrowth();
    assignTeamCaptains();

    // Capture preseason OVR baseline for GM Report Card grading.
    // Uses baseOvr (not .ovr) so leftover fatigue/morale from the prior season doesn't contaminate the baseline.
    preseasonOvrSnapshot = {};
    league.forEach(t => {
        const rpl = (rosters[t.nrm] || []).map(p => getPlayerWeightedStats(p.name).baseOvr).filter(v => v > 0);
        preseasonOvrSnapshot[t.nrm] = rpl.length ? Math.round(rpl.reduce((a, b) => a + b, 0) / rpl.length) : 75;
    });

    Object.values(playerStats).forEach(p => {
        // Absolute-day-stamped state must not carry across the currentDay reset, or it produces
        // garbage (negative "Day X on IR" displays, spurious B2B fatigue penalties matching a
        // stale day number from last season) — same bug class as currentCupChamp/pendingTrades.
        p.lastPlayedDay = undefined;
        if (p.onIR) p.irDay = 0;

        // Safety net: Give existing players the careerPlayoff tracker if they don't have it yet
        if (!p.careerPlayoff) {
            if (p.pos === 'G') p.careerPlayoff = {gp:0, w:0, l:0, t:0, so:0, sv:0, sa:0};
            else p.careerPlayoff = {gp:0, g:0, a:0, pts:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0};
        }

        if (p.pos === 'G') {
            // Archive Regular Season to Career Regular Season
            p.career.gp += p.season.gp; p.career.w += p.season.w; p.career.l += (p.season.l || 0); p.career.t += (p.season.t || 0); p.career.so += p.season.so; p.career.sv += p.season.sv; p.career.sa += p.season.sa; p.career.toi = (p.career.toi || 0) + (p.season.toi || 0);
            
            // Archive Playoff to Career Playoff
            p.careerPlayoff.gp += p.playoff.gp; p.careerPlayoff.w += p.playoff.w; p.careerPlayoff.l += (p.playoff.l || 0); p.careerPlayoff.so += p.playoff.so; p.careerPlayoff.sv += p.playoff.sv; p.careerPlayoff.sa += p.playoff.sa; p.careerPlayoff.toi = (p.careerPlayoff.toi || 0) + (p.playoff.toi || 0);

            // Wipe clean for the new year
            p.season = {gp:0, w:0, l:0, t:0, so:0, sv:0, sa:0, toi:0, consStarts:0};
            p.playoff = {gp:0, w:0, l:0, so:0, sv:0, sa:0, toi:0, consStarts:0};
        } else {
            // Archive Regular Season to Career Regular Season
            p.career.gp += p.season.gp; p.career.g += p.season.g; p.career.a += p.season.a; p.career.pts += (p.season.g + p.season.a); p.career.pm += (p.season.pm || 0); p.career.pim += (p.season.pim || 0); p.career.ppg += (p.season.ppg || 0); p.career.shg += (p.season.shg || 0); p.career.gwg += (p.season.gwg || 0); p.career.s += (p.season.s || 0); p.career.toi = (p.career.toi || 0) + (p.season.toi || 0);
            
            // Archive Playoff to Career Playoff
            p.careerPlayoff.gp += p.playoff.gp; p.careerPlayoff.g += p.playoff.g; p.careerPlayoff.a += p.playoff.a; p.careerPlayoff.pts += (p.playoff.g + p.playoff.a); p.careerPlayoff.pm += (p.playoff.pm || 0); p.careerPlayoff.pim += (p.playoff.pim || 0); p.careerPlayoff.ppg += (p.playoff.ppg || 0); p.careerPlayoff.shg += (p.playoff.shg || 0); p.careerPlayoff.gwg += (p.playoff.gwg || 0); p.careerPlayoff.s += (p.playoff.s || 0); p.careerPlayoff.toi = (p.careerPlayoff.toi || 0) + (p.playoff.toi || 0);
            
            // Wipe clean for the new year
            p.season = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, consStarts:0};
            p.playoff = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, consStarts:0};
        }
        p.streakType = 'stable'; p.hasScored = false; p.seasonTicks = 0;
        p.hotCounter = 0; p.coldCounter = 0;
        p.recentGames = []; p.recentStarts = [];
        p.macro_streak = null; p.micro_streak = null;
        p.playingHurt = false; p.consPointless = 0;
    });
    
    takeMonthSnapshot(); 
    document.getElementById('bracketContainer').style.display = 'none'; document.getElementById('playoffViewToggles').style.display = 'none'; document.getElementById('standingsGrids').style.display = 'grid'; 
    document.getElementById('tabStandings').className = 'mode-btn active'; document.getElementById('tabBracket').className = 'mode-btn'; document.getElementById('seasonYearDisplay').innerText = currentSeason; 
    
    const sBtn = document.getElementById('btnStartNextSeason'); if (sBtn) sBtn.remove();
    
    // !! Turn all simulation tools back ON (including your new simNextGame button)
    document.querySelectorAll('#officeControls button, #btnSimGame').forEach(b => { 
        const act = b.getAttribute('onclick') || ''; 
        if(['simDay()', 'simNextGame()', 'simWeek()', 'simMonth()', 'simSeason()', 'advanceCalendar()'].includes(act)) {
            b.style.display = 'inline-block'; 
        } 
    });

    calendar = []; await loadScheduleFromCSV(); 
    if (calendar.length === 0) buildCalendar();
    updateUI(); saveGame();
}

// --- SIMULATION CONTROLLERS ---
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function simDay(slowMode = true, bypassLock = false) {
    if (currentDay >= calendar.length) return;
    if (!bypassLock && isSimulating) return;
    if (!bypassLock) isSimulating = true; 
    try {
        const dayGames = getGamesForDay(currentDay);
        for (let i = 0; i < dayGames.length; i++) {
            const g = dayGames[i];
            if (!g || g.result) continue;
            clearWpCache(); // fresh OVR/tag values for each game's pre-game setup
            // --- 1. PRE-GAME DYNAMIC ICE TIME CALCULATION ---
            // Calculate minutes for both teams based on their current roster health/fatigue
            const hStruct = getRosterStructure(g.h.nrm);
            const aStruct = getRosterStructure(g.a.nrm);

            g.preCalculatedIceTime = {
            home: calculateDynamicIceTime(hStruct),
            away: calculateDynamicIceTime(aStruct)
};
            // ------------------------------------------------
            simGame(i);
            activeIdx = i;   // keep jumbotron pointed at the most recently finished game
            updateUI();
            if (slowMode) await sleep(200);
        }
        if (!bypassLock) { advanceCalendar(); }
    } finally { if (!bypassLock) isSimulating = false; updateUI(); }
}

//  GAME-BY-GAME SIMULATION ENGINE
function simNextGame() {
    const games = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    
    // Find the very first game today that hasn't been played yet
    const nextIdx = games.findIndex(g => !g.result);
    
    if (nextIdx !== -1) {
        // 1. Simulate just this one specific game
        simGame(nextIdx);
        
        // 2. !! MAGIC TRICK: Set it as the active game so the Jumbotron immediately displays its box score!
        activeIdx = nextIdx;
        
        // 3. Refresh the screens and save the game state
        updateUI();
        saveGame();
    } else {
        // 4. If all games for the day are finished, advance the calendar!
        let keepGoing = advanceCalendar();
        if (keepGoing) {
            updateUI();
            saveGame();
        }
    }
}

function advanceCalendar() {
    if (currentDay >= calendar.length) return false;
    currentDay++;

    if (currentDay === Math.floor(calendar.length / 2) && !isPlayoffs && !isASG && !asgDoneThisSeason && awardConfig.streaks) { asgDoneThisSeason = true; initAllStarGame(); return false; }
    if (isASG && calendar[currentDay] && !calendar[currentDay].some(g => g.isASG_game)) {
        isASG = false;
        // Remove the temporary All-Star rosters so trade/injury/roster logic
        // can never treat WALES/CAMPBELL as real teams (players would end up
        // on two rosters and double-accrue stats)
        delete rosters['wales'];
        delete rosters['campbell'];
    }

    if (!getGameAt(currentDay, activeIdx)) {
        activeIdx = null;
        const btn = document.getElementById('btnGameSelect');
        if (btn) btn.innerText = 'ARENA';
    }
    
    // [AWD] PLAYOFF FIX: Automatically spawn the next games OR end the round and show the Advance button!
    if (isPlayoffs && currentDay >= calendar.length) {
        if (playoffBracket.series.some(s => s.hW < 4 && s.aW < 4)) {
            genPlayoffSlate(); // Keep generating games until a team reaches 4 wins
        } else {
            showBracket(); // Round is 100% over! Draw the UI and activate the ADVANCE ROUND button.
        }
    }
    // Heal injuries and recover stamina for teams that had the day off!
    processDailyUpdates();
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
    for (let i = 0; i < 30; i++) {
        if (currentDay >= calendar.length) break;
        await simDay(false, true);
        updateUI();
        await sleep(800);
        let keepGoing = advanceCalendar();
        if (!keepGoing) break;
    }
    isSimulating = false;
    updateUI();
    saveGame();
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
        document.getElementById('tickerScroll').innerText = `${useTurbo ? ' TURBO SIMULATING' : ' CALCULATING SEASON ALGORITHMS'}: DAY ${currentDay} OF ${calendar.length} (${percent}% COMPLETE)...`;
        if (!useTurbo) { await sleep(50); } else if (currentDay % 15 === 0) { await sleep(0); }
        let keepGoing = advanceCalendar();
        if (!keepGoing) break;
    }

    isSimulating = false; isSimSeason = false; isTurboMode = false;
    if (btnSim) { btnSim.innerText = 'SIM SEASON'; btnSim.style.borderColor = '#00FFFF'; btnSim.style.color = '#00FFFF'; }
    if (btnTurbo) { btnTurbo.innerText = 'TURBO SIM SEASON'; btnTurbo.style.borderColor = '#FFAA00'; btnTurbo.style.color = '#FFAA00'; }
    
    updateUI(); saveGame();
    if (currentDay >= calendar.length) { initPlayoffs(); }
}

async function simRestOfSeason() {
    if (isSimulating) return;
    if (isPlayoffs) return;
    const remaining = calendar.slice(currentDay).filter(day => day && day.some(g => g && !g.result)).length;
    if (remaining === 0) { alert('No remaining regular season games.'); return; }
    // No confirm prompt and turbo mode forced on — this button is meant to blast through in a
    // flash with zero dialogs, including the long-injury confirm() that would otherwise fire
    // mid-loop (that check is gated on !isTurboMode).
    isSimulating = true;
    const wasTurboMode = isTurboMode;
    isTurboMode = true;
    const btn = document.getElementById('btnSimRest');
    if (btn) { btn.disabled = true; btn.textContent = 'SIMULATING...'; }
    try {
        while (isSimulating && currentDay < calendar.length) {
            await simDay(false, true);
            const pct = Math.floor((currentDay / calendar.length) * 100);
            const dayScores = (calendar[currentDay - 1] || []).filter(g => g && g.result).map(g => `${g.a.code} ${g.result.aG}-${g.result.hG} ${g.h.code}`).join('  ');
            const ticker = document.getElementById('tickerScroll');
            if (ticker) ticker.innerText = `⚡ SIMULATING... DAY ${currentDay}/${calendar.length} (${pct}%) | ${dayScores || '---'}`;
            refreshScheduleDashboardUI(); // keep progress bar + upcoming games live
            await sleep(0); // yield every day so scores flash in ticker
            const keepGoing = advanceCalendar();
            if (!keepGoing) break;
        }
    } finally {
        isSimulating = false;
        isTurboMode = wasTurboMode;
        if (btn) { btn.disabled = false; btn.textContent = 'SIM REST OF SEASON ⚡'; }
        updateUI(); saveGame();
    }
    if (currentDay >= calendar.length) initPlayoffs();
}

async function simRound() {
    if (isSimulating) return;
    isSimulating = true; 

    // Failsafe: If the round is ALREADY over before clicking, advance it instantly
    if (currentDay >= calendar.length && !playoffBracket.series.some(s => s.hW < 4 && s.aW < 4)) {
        handleRoundEnd();
        await sleep(500); // Give the UI a split second to catch up
    }
    
    // Lock in the target round
    const targetRound = playoffBracket.round;
    
    while (isSimulating && isPlayoffs && playoffBracket.round === targetRound && !currentCupChamp) { 
        if (currentDay < calendar.length) {
            await simDay(false, true); 
            updateUI(); 
            await sleep(400); 
            advanceCalendar(); 
        } else {
            // The round is 100% over! 
            showBracket(); // Show the final matchup results
            await sleep(1000); // Pause for 1 second so you can see who won
            handleRoundEnd(); // Automatically create the empty bracket for the next round!
            break; 
        }
    }
    
    isSimulating = false; 
    showBracket(); // Render the new matchups so the screen is ready for your next click
    updateUI(); 
    saveGame();
}

async function simPlayoffs() {
    const turbo = confirm("TURBO: simulate all playoff rounds instantly?\n\nCancel = normal speed (300ms/game).");
    if (isSimulating) return;
    isSimulating = true;
    try {
        while (isSimulating && isPlayoffs && !currentCupChamp) {
            // Sim all games remaining in this round's slate
            while (currentDay < calendar.length) {
                await simDay(false, true);
                if (!turbo) { updateUI(); await sleep(300); }
                advanceCalendar();
            }
            // All series in this round are done — advance without waiting for modal
            if (currentCupChamp) break;
            showBracket();
            if (!turbo) await sleep(1500);
            _doRoundAdvance();
            if (!turbo) await sleep(500);
        }
    } finally {
        isSimulating = false;
        updateUI();
        saveGame();
    }
}

// 2. Draw the buttons on the screen (Upgraded with Explicit Positional Slots)

let _teamStatsSortCol = 'pts';
let _teamStatsSortDir = -1; // -1 = desc, 1 = asc

window.sortLeagueTeamStats = function(col) {
    if (_teamStatsSortCol === col) _teamStatsSortDir *= -1;
    else { _teamStatsSortCol = col; _teamStatsSortDir = -1; }
    renderLeagueTeamStats();
};

function renderLeagueTeamStats() {
    const el = document.getElementById('leagueTeamStatsTable');
    if (!el) return;

    const getVal = (t) => {
        const gp = t.season.gp || 1;
        const gf = t.season.gf || 0; const ga = t.season.ga || 0;
        const sf = t.season.sf || 0; const sa = t.season.sa || 0;
        const ppg = t.season.ppg || 0; const ppo = t.season.ppo || 0;
        const pka = t.season.pka || 0; const pkg = t.season.pkg || 0;
        return {
            pts: t.season.pts, w: t.season.w, l: t.season.l, t_: t.season.t,
            gp, gf, ga, gd: gf - ga,
            gfgp: gf / gp, gagp: ga / gp,
            sfgp: sf / gp, sagp: sa / gp,
            shp: sf > 0 ? gf / sf * 100 : 0,
            svp: sa > 0 ? (sa - ga) / sa * 100 : 0,
            pdo: sf > 0 && sa > 0 ? (gf/sf*100) + ((sa-ga)/sa*100) : 0,
            pp: ppo > 0 ? ppg / ppo * 100 : 0,
            pk: pka > 0 ? (pka - pkg) / pka * 100 : 0,
            strk: t.winStreak > 0 ? t.winStreak : -(t.loseStreak || 0),
        };
    };

    const sorted = [...league].sort((a, b) => {
        const av = getVal(a)[_teamStatsSortCol === 't' ? 't_' : _teamStatsSortCol] ?? 0;
        const bv = getVal(b)[_teamStatsSortCol === 't' ? 't_' : _teamStatsSortCol] ?? 0;
        return (bv - av) * _teamStatsSortDir;
    });

    const arrow = (col) => _teamStatsSortCol === col ? (_teamStatsSortDir === -1 ? ' ▼' : ' ▲') : '';
    const th = (t, col, tip='') => `<th title="${tip}" onclick="sortLeagueTeamStats('${col}')" style="background:#111;color:${_teamStatsSortCol===col?'var(--neon-cyan)':'#aaa'};padding:5px 8px;border-bottom:2px solid #333;white-space:nowrap;cursor:pointer;user-select:none;">${t}${arrow(col)}</th>`;
    const thS = (t) => `<th style="background:#111;color:#aaa;padding:5px 8px;border-bottom:2px solid #333;white-space:nowrap;">${t}</th>`;
    const td = (v, hi, color='') => `<td style="padding:4px 8px;border-bottom:1px solid #222;${hi?`color:${color||'var(--neon-cyan)'};font-weight:bold;`:''}">${v}</td>`;
    let h = `<tr>${thS('#')}${thS('TEAM')}${th('GP','gp')}${th('W','w')}${th('L','l')}${th('T','t')}${th('PTS','pts')}${th('GF','gf')}${th('GA','ga')}${th('GD','gd','Goal differential')}${th('GF/GP','gfgp','Goals for per game')}${th('GA/GP','gagp','Goals against per game')}${th('SF/GP','sfgp','Shots for per game')}${th('SA/GP','sagp','Shots against per game')}${th('Sh%','shp','Team shooting percentage')}${th('SV%','svp','Team save percentage')}${th('PP%','pp','Power play percentage')}${th('PK%','pk','Penalty kill percentage')}${th('PDO','pdo','Sh% + SV% — values above 100% indicate hot streak')}${th('STRK','strk','Current win/loss streak')}</tr>`;
    sorted.forEach((t, i) => {
        const gp  = t.season.gp || 1;
        const gf  = t.season.gf || 0;
        const ga  = t.season.ga || 0;
        const sf  = t.season.sf || 0;
        const sa  = t.season.sa || 0;
        const ppg = t.season.ppg || 0;
        const ppo = t.season.ppo || 0;
        const pka = t.season.pka || 0;
        const pkg = t.season.pkg || 0;
        const gd  = gf - ga;

        const shPct = sf > 0 ? (gf / sf) * 100 : 0;
        const svPct = sa > 0 ? ((sa - ga) / sa) * 100 : 0;
        const pdo   = sf > 0 && sa > 0 ? (shPct + svPct).toFixed(1) : '-';
        const pp    = ppo > 0 ? (ppg / ppo * 100).toFixed(1) + '%' : '-';
        const pk    = pka > 0 ? ((pka - pkg) / pka * 100).toFixed(1) + '%' : '-';

        const streak = t.winStreak > 0 ? `W${t.winStreak}` : t.loseStreak > 0 ? `L${t.loseStreak}` : '-';
        const strkColor = t.winStreak > 0 ? '#00cc44' : t.loseStreak > 0 ? '#dd3333' : '';

        const rowBg = i < 8 ? 'rgba(0,180,80,0.08)' : i >= sorted.length - 3 ? 'rgba(220,40,40,0.08)' : '';
        h += `<tr style="background:${rowBg};">
            ${td(i+1)}
            ${td(`${getTeamLogoHtml(t.name)}<span style="vertical-align:middle;">${t.code}</span>`)}
            ${td(gp)} ${td(t.season.w)} ${td(t.season.l)} ${td(t.season.t)}
            ${td(t.season.pts, true)}
            ${td(gf)} ${td(ga)}
            ${td((gd >= 0 ? '+' : '') + gd, gd !== 0, gd > 0 ? '#00cc44' : '#dd3333')}
            ${td((gf/gp).toFixed(2))} ${td((ga/gp).toFixed(2))}
            ${td(sf > 0 ? (sf/gp).toFixed(1) : '-')}
            ${td(sa > 0 ? (sa/gp).toFixed(1) : '-')}
            ${td(sf > 0 ? shPct.toFixed(1)+'%' : '-')}
            ${td(sa > 0 ? svPct.toFixed(1)+'%' : '-')}
            ${td(pp)} ${td(pk)}
            ${td(pdo, pdo !== '-' && parseFloat(pdo) > 100, parseFloat(pdo) > 102 ? '#FFD700' : '')}
            ${td(`<span style="color:${strkColor};font-weight:bold;">${streak}</span>`)}
        </tr>`;
    });
    el.innerHTML = h;
}

function renderTeamStats() {
        const sel = document.getElementById('teamViewSelect');
        if (!sel || !sel.value) return;
        const tk = sel.value;
        const k = statMode || (typeof isPlayoffs !== 'undefined' && isPlayoffs ? 'playoff' : 'season'); 
        const struct = getRosterStructure(tk); 
    const tD = league.find(t => t.nrm === tk);
    const dynOvr = getDynamicTeamOvr(tk);
    const getEmoji = (pName) => { let st = playerStats[pName] ? playerStats[pName].streakType : ''; return st === 'hot' ? 'HOT' : (st === 'cold' ? 'COLD' : ''); };
    // Get morale and status badges
    const getMoraleEmoji = (pName) => {
        const morale = playerStats[pName]?.morale || 100;
        if (morale >= 125) return '<span style="color:#00FF88;font-size:6px;" title="Sky-high morale">▲▲</span>';
        if (morale >= 110) return '<span style="color:#88FF44;font-size:6px;" title="High morale">▲</span>';
        if (morale < 60)   return '<span style="color:#FF3333;font-size:6px;" title="Very low morale">▼▼</span>';
        if (morale < 80)   return '<span style="color:#FF8844;font-size:6px;" title="Low morale">▼</span>';
        return '';
    };
    const getStatusBadge = (pName) => {
        const ps = playerStats[pName];
        if (!ps) return '';
        let badges = '';
        if (ps.injury && ps.injury.daysRemaining > 0) badges += '[INJ]';
        if (ps.suspended && ps.suspended.days > 0) badges += '[SUS]';
        return badges;
    };
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
    struct.f.forEach((l, i) => {
        // SAFETY NET: If the line is empty, show a placeholder message instead of breaking the whole display
        if (l.length === 0) {
            h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; align-items:center;">LINE ${i+1} <span style="color:var(--neon-cyan); margin-left:8px; font-weight:bold; letter-spacing:1px;">OVR: 0</span></div><table style="width:100%;"><tr><td><span style="color:#555;">-- NO PLAYERS ASSIGNED --</span></td><td></td></tr></table>`;
            return;
        }

        let lineOvr = l.length > 0 ? Math.round(l.reduce((sum, p) => sum + getPlayerWeightedStats(p.name).ovr, 0) / l.length) : 0;
        
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; align-items:center;">LINE ${i+1} <span style="color:var(--neon-cyan); margin-left:8px; font-weight:bold; letter-spacing:1px;">OVR: ${lineOvr}</span> ${getChemDisplay(tD.chem.f[i], (tD.chem.fYears?tD.chem.fYears[i]:0))}</div><table style="width:100%;">`;
        let displayOrder = [1, 0, 2]; // LW, C, RW
        let positionLabels = ['C', 'LW', 'RW'];
        
        h += displayOrder.map((idx) => { 
            let p = l[idx]; 
            let posLabel = '[' + positionLabels[idx] + ']'; 
            
            //  SAFETY NET: If the slot is empty, print a placeholder instead of crashing
            if (!p) {
                return `<tr><td><span style="color:var(--neon-cyan); font-weight:bold; font-size:8px;">${posLabel}</span> <span style="color:#555;">-- EMPTY SLOT --</span></td><td></td></tr>`;
            }

            //  ATOI CALCULATION
            let psObj = playerStats[p.name];
            let toi = psObj && psObj[k] && psObj[k].gp > 0 ? Math.round(psObj[k].toi / psObj[k].gp) : 0;

            const fPim = psObj && psObj[k] ? (psObj[k].pim || 0) : 0;
            const fPts = psObj && psObj[k] ? ((psObj[k].g||0) + (psObj[k].a||0)) : 0;
            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td><span style="color:var(--neon-cyan); font-weight:bold; font-size:8px;">${posLabel}</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${p.name}', 'F'); event.stopPropagation();">EDIT</button>${getMoraleEmoji(p.name)} ${p.name} ${getArchetypeBadge(p.name)} ${getPlayerBadges(p.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">${fPts}PTS</span> <span style="color:#FF8800; font-size:8px; margin-left:4px;">${fPim}PIM</span> <span style="color:#ccc; font-size:8px; margin-left:4px; font-weight:bold;">ATOI: ${toi}</span> <span style="color:#aaa; font-size:8px; margin-left:4px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</span></td></tr>`;
        }).join('');

        h += `</table>`;
    });
    
    h += `</div><div><div class="unit-header">DEFENSIVE PAIRINGS</div>`;
    struct.d.forEach((l, i) => {
        // Calculate the average OVR of the defensemen on this pair
        let pairOvr = l.length > 0 ? Math.round(l.reduce((sum, p) => sum + getPlayerWeightedStats(p.name).ovr, 0) / l.length) : 0;
        
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; align-items:center;">PAIR ${i+1} <span style="color:var(--neon-cyan); margin-left:8px; font-weight:bold; letter-spacing:1px;">OVR: ${pairOvr}</span> ${getChemDisplay(tD.chem.d[i], (tD.chem.dYears?tD.chem.dYears[i]:0))}</div><table style="width:100%;">`;
        
        h += l.map((d, idx) => { 
            let posLabel = '[D]'; 
            
            //  SAFETY NET
            if (!d) {
                return `<tr><td><span style="color:var(--line-red); font-weight:bold; font-size:8px;">${posLabel}</span> <span style="color:#555;">-- EMPTY SLOT --</span></td><td></td></tr>`;
            }

            //  ATOI CALCULATION
            let psObj = playerStats[d.name];
            let toi = psObj && psObj[k] && psObj[k].gp > 0 ? Math.round(psObj[k].toi / psObj[k].gp) : 0;

            const dPim = psObj && psObj[k] ? (psObj[k].pim || 0) : 0;
            const dPts = psObj && psObj[k] ? ((psObj[k].g||0) + (psObj[k].a||0)) : 0;
            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${d.name}')"><td><span style="color:var(--line-red); font-weight:bold; font-size:8px;">${posLabel}</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${d.name}', 'D'); event.stopPropagation();">EDIT</button>${getStatusBadge(d.name)}${getMoraleEmoji(d.name)}${d.name} ${getArchetypeBadge(d.name)} ${getEmoji(d.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">${dPts}PTS</span> <span style="color:#FF8800; font-size:8px; margin-left:4px;">${dPim}PIM</span> <span style="color:#ccc; font-size:8px; margin-left:4px; font-weight:bold;">ATOI: ${toi}</span> <span style="color:#aaa; font-size:8px; margin-left:4px;">OVR: ${getPlayerWeightedStats(d.name).ovr}</span></td></tr>`; 
        }).join('');
        
        h += `</table>`;
    });
    
    if(struct.g && struct.g.length > 0) {
        h += `<div class="unit-header">GOALTENDERS</div><table style="width:100%;">`;
        h += struct.g.map((g,i) => {
            if (!g) return ''; //  SAFETY NET
            return `<tr><td style="cursor:pointer;" onclick="showPlayerCard('${g.name}')"><span style="color:#FFD700; font-weight:bold; font-size:8px;">[G]</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${g.name}', 'G'); event.stopPropagation();">EDIT</button>${getStatusBadge(g.name)}${getMoraleEmoji(g.name)}${g.name} ${getArchetypeBadge(g.name)} ${getEmoji(g.name)} (${i===0?'STARTER':'BACKUP'})</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(g.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(g.name)}</span></td></tr>`;
        }).join('');
        h += `</table>`;
    }
   
   //  SPECIAL TEAMS EDITOR INTEGRATION 
    h += `</div></div><div class="grid-2" style="margin-top:20px; border-top:2px solid #333; padding-top:15px;">`;
    
    // ==========================================
    //  POWER PLAY
    // ==========================================
    h += `<div><div class="unit-header" style="background:#550000; color:var(--ea-yellow);">POWER PLAY UNITS</div>`;
    ['PP1', 'PP2'].forEach((unitName, i) => {
        let ppU = getSpecialTeamsUnit(tk, 'PP', i + 1);
        
        // Keep your custom header and EDIT button
        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                <span>${unitName}</span> 
                <button onclick="openSpecialTeamsMenu('${tk}', 'PP', ${i+1})" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button>
              </div>`;
        
        // Open the new CSS Grid wrapper instead of a table
        h += `<div class="pp-grid-layout" style="margin-top: 5px;">`;
        
        // Map the players into the grid slots
        h += ppU.map((p, index) => {
            if (!p) return `<div class="player-slot" style="color:#555; text-align:center;">-- EMPTY --</div>`; //  SAFETY NET
            
            let label = index < 4 ? '[F]' : '[D]'; // First 4 slots are Forward, 5th is Point Defense
            
            return `
            <div class="player-slot" style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
                <div style="margin-bottom:2px;"><span class="pos-badge">${label}</span> ${getMoraleEmoji(p.name)} ${p.name} ${getPlayerBadges(p.name)}</div>
                <div style="font-size:7px; color:var(--ea-yellow); margin-top:3px;">
                    ${getArchetypeBadge(p.name)} OVR: ${getPlayerWeightedStats(p.name).ovr}
                </div>
            </div>`;
        }).join('');

        h += `</div>`; // Close grid wrapper
    });
    h += `</div>`;

    // ==========================================
    //  PENALTY KILL
    // ==========================================
    h += `<div><div class="unit-header" style="background:#003366; color:#00FFFF;">PENALTY KILL UNITS</div>`;
    ['PK1', 'PK2'].forEach((unitName, i) => {
        let pkU = getSpecialTeamsUnit(tk, 'PK', i + 1);

        h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;">
                <span>${unitName}</span>
                <button onclick="openSpecialTeamsMenu('${tk}', 'PK', ${i+1})" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button>
              </div>`;

        h += `<div class="pk-grid-layout" style="margin-top: 5px;">`;

        h += pkU.map((p, index) => {
            if (!p) return `<div class="player-slot" style="color:#555; text-align:center;">-- EMPTY --</div>`;

            let label = index < 2 ? '[F]' : '[D]';

            return `
            <div class="player-slot" style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
                <div style="margin-bottom:2px;"><span class="pos-badge" style="color:#00FFFF;">${label}</span> ${getMoraleEmoji(p.name)} ${p.name} ${getPlayerBadges(p.name)}</div>
                <div style="font-size:7px; color:#00FFFF; margin-top:3px;">
                    ${getArchetypeBadge(p.name)} OVR: ${getPlayerWeightedStats(p.name).ovr}
                </div>
            </div>`;
        }).join('');
        
        h += `</div>`; // Close grid wrapper
    });
        
    // EXTRA ATTACKER
    h += `</div></div><div style="margin-top:15px;"><div class="unit-header" style="background:#330033; color:#FF55FF;">EXTRA ATTACKER (6-ON-5)</div>`;
    let exaU = getSpecialTeamsUnit(tk, 'EXA', 1);
    h += `<div style="font-size:7px; color:#aaa; margin-top:5px; display:flex; justify-content:space-between; align-items:center;"><span>PULLED GOALIE UNIT</span> <button onclick="openSpecialTeamsMenu('${tk}', 'EXA', 1)" style="background:#222; color:#fff; border:1px solid #666; padding:2px 6px; cursor:pointer; font-size:7px;">EDIT</button></div>`;
    h += `<div style="display:flex; justify-content:space-around; flex-wrap:wrap; padding:10px 0;">`;
    h += exaU.map(p => `<div style="cursor:pointer; background:#111; padding:5px 10px; border:1px solid #333; border-radius:4px; text-align:center; min-width:80px; margin-bottom:5px;" onclick="showPlayerCard('${p.name}')">
        <div style="font-size:10px; color:#fff;">${playerStats[p.name].injury?.daysRemaining>0?'[INJ]':''}${p.name} ${getArchetypeBadge(p.name)}</div>
        <div style="font-size:8px; color:#FF55FF; margin-top:3px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</div>
        </div>`).join('');
    h += `</div></div><div class="grid-2" style="margin-top:20px;"><div>`; 

    const activeNames = [...struct.f.flat(), ...struct.d.flat(), ...(struct.g || []).slice(0,2)].map(x => x.name);
    const bench = (rosters[tk] || []).filter(p => !activeNames.includes(p.name));
    if (bench.length > 0) {
        h += `<div class="unit-header" style="color:var(--silver-mid);">BENCH / SCRATCHES</div><table style="width:100%;">`;
        h += bench.map(b => `<tr><td style="cursor:pointer;" onclick="showPlayerCard('${b.name}')"><button style="${yStyle}" onclick="openSubMenu('${tk}', '${b.name}', '${b.pos}'); event.stopPropagation();">EDIT</button>${playerStats[b.name].injury?.daysRemaining>0?'[INJ]':''}${b.name} ${getArchetypeBadge(b.name)} (${b.pos}) ${getEmoji(b.name)}</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(b.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(b.name)}</span></td></tr>`).join('');
        h += `</table>`;
    }

    h += `</div></div><div class="grid-2" style="margin-top:20px;">`;
    
    // --- GOALTENDER STATS ---
    h += `<div><div class="unit-header">GOALTENDER STATS</div><table style="width:100%; text-align:center;"><tr><th style="text-align:left;">PLAYER</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>SA</th><th>GA</th><th>SV%</th><th>GAA</th><th>SO</th></tr>`;
    if (rosters[tk]) {
        let goalies = rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name]?.[k]).sort((a, b) => (playerStats[b.name][k].w || 0) - (playerStats[a.name][k].w || 0));
        h += goalies.map(g => {
            const st = playerStats[g.name];
            const sa = st[k].sa || 0; const sv = st[k].sv || 0; const ga = Math.max(0, sa - sv);
            const svPct = sa > 0 ? (sv / sa).toFixed(3) : '.000'; const gaa = st[k].gp > 0 ? (ga / st[k].gp).toFixed(2) : '0.00';
            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${g.name}')"><td style="text-align:left;">${g.name} ${getArchetypeBadge(g.name)} ${getEmoji(g.name)}</td><td>${st[k].gp}</td><td>${st[k].w}</td><td>${st[k].l || 0}</td><td>${st[k].t || 0}</td><td style="color:#aaa;">${sa}</td><td style="color:#FF6666;">${ga}</td><td style="color:#aaa;">${svPct}</td><td style="color:#aaa;">${gaa}</td><td style="color:var(--ea-yellow); font-weight:bold;">${st[k].so}</td></tr>`;
        }).join('');
    }
    h += `</table></div>`;

    // --- SKATER STATS ---
    h += `<div><div class="unit-header">SKATER STATISTICS</div><table style="width:100%; text-align:center;">
          <tr>
            <th style="text-align:left;">PLAYER</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>S</th><th>S%</th><th>GWG</th><th>+/-</th>
            <th style="color:var(--ea-yellow);" title="Power Play Goals">PPG</th>
            <th style="color:var(--ea-yellow);" title="Power Play Assists">PPA</th>
            <th style="color:#00FFFF;" title="Short Handed Goals">SHG</th>
            <th style="color:#ccc;" title="Average Time On Ice">ATOI</th>
          </tr>`;

    if (rosters[tk]) {
        let sk = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name]?.[k]).sort((a, b) => ((playerStats[b.name][k].g || 0) + (playerStats[b.name][k].a || 0)) - ((playerStats[a.name][k].g || 0) + (playerStats[a.name][k].a || 0)));
        
        h += sk.map(p => { 
            const st = playerStats[p.name]; 
            //  DATA SAFETY: Ensure the current 'k' (season/playoff) object exists
            if (!st[k]) st[k] = { toi: 0, gp: 0, g: 0, a: 0, s: 0, pm: 0 }; 

            const sPct = st[k].s > 0 ? ((st[k].g / st[k].s) * 100).toFixed(1) + '%' : '0.0%'; 
            const pmVal = st[k].pm || 0;
            const pmColor = pmVal > 0 ? '#0F0' : (pmVal < 0 ? '#F55' : '#888');
            
            //  CALCULATE ATOI
            // We use st[k].toi because 'k' is your dynamic key (season or playoff)
            const totalToi = st[k].toi || 0;
            const gamesPlayed = st[k].gp || 0;
            const avgToi = gamesPlayed > 0 ? Math.round(totalToi / gamesPlayed) : 0;
            
            // DEBUG: Uncomment the next line to check if TOI is actually being captured in console
            // console.log(`ATOI Debug for ${p.name}: TotalTOI=${totalToi}, GP=${gamesPlayed}, Result=${avgToi}`);

            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
                <td style="text-align:left;">${p.name} ${getArchetypeBadge(p.name)} ${getEmoji(p.name)}</td>
                <td>${gamesPlayed}</td><td>${st[k].g}</td><td>${st[k].a}</td><td class="pts-hl">${st[k].g + st[k].a}</td>
                <td style="color:#aaa;">${st[k].s || 0}</td><td style="color:#aaa;">${sPct}</td><td style="color:var(--ea-yellow); font-weight:bold;">${st[k].gwg || 0}</td>
                <td style="color:${pmColor};">${pmVal > 0 ? '+' + pmVal : pmVal}</td>
                <td style="color:var(--ea-yellow);">${st[k].ppg || 0}</td>
                <td style="color:var(--ea-yellow);">${st[k].ppa || 0}</td>
                <td style="color:#00FFFF;">${st[k].shg || 0}</td>
                <td style="color:#ccc; font-weight:bold;">${avgToi}</td>
            </tr>`;
        }).join('');   
    }
    h += `</table></div></div>`;    
    document.getElementById('teamStatsContainer').innerHTML = h;
    }

    /**
 * Calculates the live overall of a specific line (e.g., F1, D1)
 * @param {Array} line - Array of player objects
 */
function getLiveLineOvr(line) {
    if (!line || line.length === 0) return 0;

    const totalOvr = line.reduce((sum, p) => {
        const stats = getPlayerWeightedStats(p.name);
        return sum + (stats.ovr || 0);
    }, 0);
    const base = Math.round(totalOvr / line.length);

    // Chemistry bonus: +2 OVR per dynamic duo pair on this line together
    if (awardConfig.chemistry) {
        const names = new Set(line.map(p => p.name));
        let chemBonus = 0;
        for (const duo of getAllDuos()) {
            const present = duo.filter(n => names.has(n));
            if (present.length >= 2) {
                const isCustom = customDuos.includes(duo);
                const score = isCustom ? getChemScore(duo) : 100;
                chemBonus += score >= 75 ? 2 : score >= 50 ? 1 : 0;
            }
        }
        return base + chemBonus;
    }
    return base;
}

/**
 * Distributes 60 minutes of ice time dynamically
 * @param {Array} linesArray - The structure containing all lines (e.g., struct.f)
 */

    /**
 * Calculates ice time distribution based on differences between lines.
 * @param {Array} ovrs - Array of overalls [L1, L2, L3, L4] or [D1, D2, D3]
 * @param {number} totalMins - Total available minutes for that unit (e.g., 60 for forwards)
 * @param {boolean} isPlayoff - Whether to use playoff caps
 */


/**
 * Calculates the overall rating for a defensive pair
 * @param {Array} pair - An array of two player objects
 * @returns {number} - The average overall rating of the pair
 */

function getLineOvr(line) {
    if (!line || line.length === 0) return 0;
    let totalOvr = line.reduce((sum, p) => sum + (getPlayerWeightedStats(p.name).ovr || 70), 0);
    return totalOvr / line.length;
}

// --- ADVANCED RECAP & BOX SCORES ---
function openBoxScore(day, idx) {
    const g = getGameAt(day, idx);
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

    h += `<div class="unit-header" style="margin-top:15px;">SCORING SUMMARY</div><div style="background:#000; padding:10px 15px; font-size:8px; line-height:1.9;">`;
    if (goalEvents.length > 0) {
        goalEvents.forEach(l => {
            const typeTag = l.isPP ? `<span style="color:#FFD700;font-size:6px;margin-left:4px;">PP</span>` : l.isSH ? `<span style="color:#00FFFF;font-size:6px;margin-left:4px;">SH</span>` : '';
            const timeTag = l.time ? `<span style="color:#555;font-size:6px;margin-left:8px;">${l.time}</span>` : '';
            h += `<div><span style="color:${l.cl||'#fff'}; font-weight:bold; margin-right:8px;">[${l.tm||''}]</span>${typeTag} <span style="color:#fff;">${l.txt||l.display||''}</span>${timeTag}</div>`;
        });
    } else {
        h += `<div style="color:#aaa; text-align:center;">No scoring data.</div>`;
    }
    h += `</div>`;

    if (penaltyEvents.length > 0) {
        h += `<div class="unit-header">PENALTY SUMMARY</div><div style="background:#000; padding:15px; font-size:8px; line-height:2;">`;
        penaltyEvents.forEach(l => { h += `<div><span style="color:${l.cl}; font-weight:bold; margin-right:10px;">[${l.tm}]</span> <span style="color:#fff;">${l.txt}</span></div>`; });
        h += `</div>`;
    }

    // Shutout check
    const hShutout = g.result.aG === 0 && g.result.hGoalie;
    const aShutout = g.result.hG === 0 && g.result.aGoalie;
    if (hShutout || aShutout) {
        const soGoalie = hShutout ? g.result.hGoalie : g.result.aGoalie;
        const soSaves  = hShutout ? g.result.aShots : g.result.hShots;
        h += `<div style="background:#1a1400; border:2px solid #FFD700; padding:8px 14px; text-align:center; font-size:7px; color:#FFD700; letter-spacing:.12em; margin-bottom:6px;">🥅 SHUTOUT — ${soGoalie} (${soSaves} saves)</div>`;
        if (awardConfig.headlines && !g._shutoutLogged) {
            tradeLog.unshift({ day: `DAY ${(day||currentDay)+1}`, details: `SHUTOUT: ${soGoalie} blanks the opposition with ${soSaves} saves!` });
            g._shutoutLogged = true;
        }
    }
    if (g.result.isGoalieDuel) {
        h += `<div style="background:#001a2e; border:2px solid var(--neon-cyan); padding:8px 14px; text-align:center; font-size:7px; color:var(--neon-cyan); letter-spacing:.12em; margin-bottom:6px;">★ GOALIE DUEL ★</div>`;
    }
    if (g.result.stars && g.result.stars.length > 0) {
        const starLabels = ['★★★ 1ST STAR', '★★ 2ND STAR', '★ 3RD STAR'];
        const starColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        h += `<div class="unit-header">THREE STARS</div><div style="background:#111; padding:15px; font-size:8px;">`;
        g.result.stars.forEach((s, i) => {
            h += `<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #1a1a1a; cursor:pointer;" onclick="showPlayerCard('${s}')">
                <span style="color:${starColors[i]}; font-size:7px; min-width:80px;">${starLabels[i]}</span>
                <span style="color:#fff;">${s}</span>
            </div>`;
        });
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
    const g = getGameAt(currentDay, activeIdx);
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
            let healthy = r.filter(p => playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0 && !(playerStats[p.name].suspended?.days > 0));
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
    const g = getGameAt(currentDay, activeIdx);
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
        ['G', 'A', 'PM', 'PIM', 'S'].forEach(id => document.getElementById(`adv${side === 'away'?'Away':'Home'}${id}`).value = 0);
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
        entry.s = parseInt(document.getElementById(`${pref}S`).value) || 0;
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
        else { let sStr = `G:${e.g} A:${e.a} +/-:${e.pm > 0 ? '+'+e.pm : e.pm} PIM:${e.pim} S:${e.s}`; if(e.ppg) sStr += ` PPG`; if(e.shg) sStr += ` SHG`; h += `<span style="color:#aaa;">${sStr}</span>`; }
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
    const g = getGameAt(currentDay, activeIdx);
    if (!g) return alert("No valid game found for the selected day/index.");
    const aScore = parseInt(document.getElementById('advAwayScore').value) || 0; const aEN = parseInt(document.getElementById('advAwayEN').value) || 0;
    const hScore = parseInt(document.getElementById('advHomeScore').value) || 0; const hEN = parseInt(document.getElementById('advHomeEN').value) || 0;
    
    const sumG = (side) => advBoxScoreTemp[side].entries.reduce((sum, e) => sum + (e.g || 0), 0);
    const aSum = sumG('away'); const hSum = sumG('home');
    if (aSum + aEN !== aScore) return alert(`ERROR: Away score (${aScore}) does not match entered Player Goals (${aSum}) + Empty Nets (${aEN}).`);
    if (hSum + hEN !== hScore) return alert(`ERROR: Home score (${hScore}) does not match entered Player Goals (${hSum}) + Empty Nets (${hEN}).`);
    
    // Write to the same combined 'playoff' bucket simGame uses — career archival,
    // HOF records, and the player-card playoff tab all read p.playoff, never playoff_N
    let k = 'season';
    if (isPlayoffs || isASG) k = 'playoff';
    let aG = aScore, hG = hScore;
    let hStatus = hG > aG ? 'win' : (hG < aG ? 'loss' : 'tie');
    let aStatus = aG > hG ? 'win' : (aG < hG ? 'loss' : 'tie');
    gameMilestones = [];

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
    ['away','home'].forEach(side => {
        const gEntry = advBoxScoreTemp[side].entries.find(e => e.isGoalie);
        if (gEntry && playerStats[gEntry.name]) {
            const ps = playerStats[gEntry.name];
            ps.lastPlayedDay = currentDay;
            if (ps[k]) ps[k].consStarts = (ps[k].consStarts || 0) + 1;
        }
    });
    
    const applySkaters = (side) => {
        advBoxScoreTemp[side].entries.filter(e => !e.isGoalie).forEach(e => {
            if(playerStats[e.name] && !isASG) {
                let s = playerStats[e.name][k];
                s.g += e.g; s.a += e.a; s.pm += e.pm; s.pim += e.pim; s.ppg += e.ppg; s.shg += e.shg; s.s = (s.s||0) + (e.s||0);
                checkMilestones(e.name);
            }
        });
    };
    applySkaters('away'); applySkaters('home');

    // Surface milestone banners for this manually-entered game before they can be overwritten by a later simGame() call
    if (gameMilestones.length > 0 && awardConfig.milestones && awardConfig.headlines) {
        gameMilestones.forEach(msg => {
            tradeLog.unshift({ day: `DAY ${currentDay + 1}`, details: `MILESTONE: ${msg}` });
        });
        gameMilestones = [];
    }

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
    updateUI(); saveGame();
    const jumboAdv = document.getElementById('jumboMessage');
    if (jumboAdv) {
        jumboAdv.innerHTML = `ADVANCED BOX SCORE SAVED.<br>${g.a.code} ${g.result.aG} - ${g.h.code} ${g.result.hG}<br><br><span style="color:var(--ea-yellow); font-size:8px;">*Stats processed via manual override*</span>`;
    }
}

// --- WATCH LIVE GAME BROADCAST ---
function startWatchLive() {
    if (activeIdx === null) return alert("Select a game from the ARENA menu first.");
    const g = getGameAt(currentDay, activeIdx);
    if (!g) return alert("No valid game found for the selected day/index.");
    if (g.result) return alert("This game has already been played!");

    simGame(activeIdx);
    watchGameObj = g; watchCurrentScore = { a: 0, h: 0 };
    watchBroadcastDay = currentDay;
    watchBroadcastIdx = activeIdx;

    document.getElementById('wgAwayLogo').src = g.a.logo; document.getElementById('wgHomeLogo').src = g.h.logo;
    document.getElementById('wgAwayCode').innerText = g.a.code; document.getElementById('wgHomeCode').innerText = g.h.code;
    document.getElementById('wgAwayScore').innerText = '0'; document.getElementById('wgHomeScore').innerText = '0';
    document.getElementById('wgBugAway').innerText = g.a.code; document.getElementById('wgBugHome').innerText = g.h.code;
    document.getElementById('wgBugAwayScore').innerText = '0'; document.getElementById('wgBugHomeScore').innerText = '0';
    document.getElementById('wgBugClock').innerText = 'P1 20:00';
    document.getElementById('wgMomAway').innerText = g.a.code; document.getElementById('wgMomHome').innerText = g.h.code;
    document.getElementById('wgMomFill').style.cssText = 'position:absolute;top:0;height:100%;width:50%;left:0;right:auto;background:#555;border-radius:2px;transition:width .4s,left .4s,right .4s,background .4s;';
    
    // Ticker initialization
    document.getElementById('wgTicker').innerHTML = '<div style="color:var(--ea-yellow); text-align:center; font-size:12px; margin-bottom:10px;">PUCK DROP! WELCOME TO THE BROADCAST...</div>';
    
    document.getElementById('wgClock').innerText = "P1 20:00";
    document.getElementById('btnWgSkip').style.display = 'block'; document.getElementById('btnWgClose').style.display = 'none';
    document.getElementById('watchGameOverlay').style.display = 'flex';

    let fillerEvents = [];
    const fillerPool = [
        "winds up for a slapshot — kick save and a beauty!",
        "lays a massive hit along the boards. The crowd feels that one.",
        "fires a quick wrist shot — gloved down by the goalie.",
        "intercepts a sloppy pass at centre ice.",
        "hammers one from the point — clanks off the iron!",
        "dumps the puck deep and chases it into the corner.",
        "wins the faceoff cleanly.",
        "blocks a heavy slapshot — he's slow to get up.",
        "dangles around the defenceman and cuts to the slot.",
        "takes a hit but manages to chip the puck out of the zone.",
        "wheels behind the net looking for an opening.",
        "rings one off the post — so close!",
        "puts a big open-ice hit on the forechecker.",
        "with a between-the-legs move — the crowd ooohs!",
        "fires wide from the faceoff dot — goalie not tested.",
        "wins a puck battle in the corner and feeds the point.",
        "sauces a backhand pass through two sticks.",
        "reads the play and breaks up the odd-man rush.",
        "gets tangled up in front — both players jawing at each other.",
        "snaps a shot on net — stopped, puck is loose!",
        "with a spinning move at the blue line — impressive.",
        "pressures the defenceman into a bad pinch.",
        "wins the board battle and dishes it up the wall.",
        "takes a slapshot from the point — tipped wide.",
        "draws a whistle with a sharp turn into traffic.",
    ];
    for (let i = 0; i < 18; i++) {
        const p = Math.floor(Math.random() * 3) + 1;
        const m = Math.floor(Math.random() * 20);
        const s = Math.floor(Math.random() * 60);
        const t = Math.random() > 0.5 ? g.h : g.a;
        let randPlayer = 'A player';
        if (rosters[t.nrm]) { const sk = rosters[t.nrm].filter(x => x.pos !== 'G'); if (sk.length > 0) randPlayer = sk[Math.floor(Math.random() * sk.length)].name; }
        fillerEvents.push({ p, m, s, tm: t.code, cl: '#555', isFiller: true, txt: `${randPlayer} ${fillerPool[Math.floor(Math.random() * fillerPool.length)]}` });
    }

    // ~15% chance of a line brawl (gated by headlines toggle)
    if (awardConfig.headlines && Math.random() < 0.005) {
        const brawlP = Math.floor(Math.random() * 3) + 1;
        const brawlM = 5 + Math.floor(Math.random() * 14);
        const brawlS = Math.floor(Math.random() * 60);
        const hFighter = rosters[g.h.nrm] ? rosters[g.h.nrm].filter(p => p.pos !== 'G')[Math.floor(Math.random() * rosters[g.h.nrm].filter(p => p.pos !== 'G').length)]?.name : g.h.code;
        const aFighter = rosters[g.a.nrm] ? rosters[g.a.nrm].filter(p => p.pos !== 'G')[Math.floor(Math.random() * rosters[g.a.nrm].filter(p => p.pos !== 'G').length)]?.name : g.a.code;
        fillerEvents.push({ p: brawlP, m: brawlM, s: brawlS, tm: g.h.code, cl: '#FF4444', isBrawl: true,
            txt: `${hFighter} and ${aFighter} drop the gloves — both benches empty! BENCH CLEARING BRAWL! Multiple majors handed out. Play suspended for several minutes.` });
        if (awardConfig.headlines) tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `BRAWL: ${g.a.code} @ ${g.h.code} — benches clear after ${hFighter} and ${aFighter} go at it. Multiple game misconducts.` });
    }

    watchQueue = [...g.result.boxLog, ...fillerEvents];
    watchQueue.sort((a,b) => a.p !== b.p ? a.p - b.p : (a.m !== b.m ? a.m - b.m : a.s - b.s));
    let currentPeriod = 1;
    const watchGoalsByPlayer = {};
    let watchMaxDeficit = { [g.h.code]: 0, [g.a.code]: 0 };
    let watchLastGoalTime = null; // { p, m } of last goal for momentum-swing detection
    
    watchInterval = setInterval(() => {
        if (watchQueue.length === 0) {
            clearInterval(watchInterval);
            const finalStr = `FINAL${g.result.ot > 0 ? ' (OT)' : ''}`;
            document.getElementById('wgClock').innerText = finalStr;
            document.getElementById('wgBugClock').innerText = finalStr;
            document.getElementById('wgBugAwayScore').innerText = watchCurrentScore.a;
            document.getElementById('wgBugHomeScore').innerText = watchCurrentScore.h;
            document.getElementById('wgTicker').innerHTML += `<div style="color:var(--ea-yellow); text-align:center; margin-top:20px; font-size:12px;">!! FINAL HORN !!</div>`;
            document.getElementById('btnWgSkip').style.display = 'none'; document.getElementById('btnWgClose').style.display = 'block';
            let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight; return;
        }
        const ev = watchQueue.shift();
        if (ev.p > currentPeriod) { document.getElementById('wgTicker').innerHTML += `<div style="color:var(--silver-mid); text-align:center; border-bottom:1px solid #333; margin:15px 0; padding-bottom:5px;">--- END OF PERIOD ${currentPeriod} ---</div>`; currentPeriod = ev.p; }
        const clockStr = `P${ev.p} ${ev.m}:${ev.s < 10 ? '0'+ev.s : ev.s}`;
        document.getElementById('wgClock').innerText = clockStr;
        document.getElementById('wgBugClock').innerText = clockStr;
        document.getElementById('wgBugAwayScore').innerText = watchCurrentScore.a;
        document.getElementById('wgBugHomeScore').innerText = watchCurrentScore.h;
        // Update momentum bar on every event — explicit goal momentum if available, score proxy otherwise
        {
            const fill = document.getElementById('wgMomFill');
            if (fill) {
                let hm, am;
                if (ev.hMom !== undefined) {
                    hm = ev.hMom; am = ev.aMom || 0;
                } else {
                    // Score differential proxy: leading team shows slight lean
                    const diff = watchCurrentScore.h - watchCurrentScore.a;
                    hm = 5 + Math.max(-4, Math.min(4, diff));
                    am = 10 - hm;
                }
                const total = hm + am || 1;
                const homePct = (hm / total) * 100;
                const awayPct = 100 - homePct;
                const dominant = homePct > awayPct ? 'home' : 'away';
                const dominantPct = Math.max(homePct, awayPct);
                fill.style.width = `${Math.round(dominantPct)}%`;
                fill.style.left = dominant === 'away' ? '0' : 'auto';
                fill.style.right = dominant === 'home' ? '0' : 'auto';
                fill.style.background = dominant === 'away' && dominantPct > 60 ? '#00CCFF'
                    : dominant === 'home' && dominantPct > 60 ? '#FF6600' : '#888';
            }
        }
        
        if (ev.isPenaltyShot) {
            const psColor = ev.isGoal ? '#FFD700' : '#888';
            document.getElementById('wgTicker').innerHTML += `<div style="background:#0d0d1a;border:2px solid ${psColor};padding:10px 12px;margin:8px 0;text-align:center;"><div style="color:${psColor};font-size:9px;">🚨 PENALTY SHOT — ${ev.isGoal ? 'GOAL!' : 'STOPPED!'}</div><div style="color:#aaa;font-size:7px;margin-top:3px;">${ev.txt}</div></div>`;
        } else if (ev.isBrawl) {
            document.getElementById('wgTicker').innerHTML += `<div style="background:#1a0000;border:2px solid #FF4444;padding:10px 12px;margin:8px 0;text-align:center;"><div style="color:#FF4444;font-size:10px;margin-bottom:4px;">🥊 BENCH CLEARING BRAWL 🥊</div><div style="color:#ff9999;font-size:7px;">${ev.txt}</div></div>`;
        } else if (ev.isFiller) {
            document.getElementById('wgTicker').innerHTML += `<div><span style="color:#555; margin-right:10px;">[${ev.tm}]</span> <span style="color:#ccc;">${ev.txt}</span></div>`;
        } else if (ev.isNote) {
            document.getElementById('wgTicker').innerHTML += `<div style="background:#0a0a14;border:2px solid #888;padding:8px 10px;margin:6px 0;text-align:center;"><div style="color:#ccc;font-size:8px;">🥅 ${ev.txt}</div></div>`;
        } else {
            if (!ev.isPenalty) {
                // Momentum swing: back-to-back goals within 2 minutes
                if (watchLastGoalTime) {
                    const periodDiff = (ev.p - watchLastGoalTime.p) * 20 * 60;
                    const timeDiffSec = periodDiff + (ev.m - watchLastGoalTime.m) * 60 + ((ev.s || 0) - (watchLastGoalTime.s || 0));
                    if (timeDiffSec <= 120 && timeDiffSec >= 0) {
                        const swingTeam = ev.tm;
                        document.getElementById('wgTicker').innerHTML += `<div style="background:#1a0014;border:2px solid #FF00FF;padding:8px 12px;margin:6px 0;text-align:center;animation:none;"><div style="color:#FF44FF;font-size:10px;">🔥 MOMENTUM SWING — ${swingTeam}!</div><div style="color:#884488;font-size:6px;margin-top:2px;">BACK-TO-BACK GOALS</div></div>`;
                        // Spike momentum bar
                        const fill = document.getElementById('wgMomFill');
                        if (fill) {
                            fill.style.width = '85%';
                            fill.style.left = swingTeam === g.a.code ? '0' : 'auto';
                            fill.style.right = swingTeam === g.h.code ? '0' : 'auto';
                            fill.style.background = '#FF00FF';
                        }
                    }
                }
                watchLastGoalTime = { p: ev.p, m: ev.m };
                if (ev.tm === g.a.code) {
                    const prevDeficit = watchCurrentScore.h - watchCurrentScore.a;
                    if (prevDeficit >= 2) watchMaxDeficit[g.a.code] = Math.max(watchMaxDeficit[g.a.code], prevDeficit);
                    watchCurrentScore.a++;
                    document.getElementById('wgAwayScore').innerText = watchCurrentScore.a;
                    const newDiff = watchCurrentScore.a - watchCurrentScore.h;
                    if (watchMaxDeficit[g.a.code] >= 2 && newDiff >= 0) {
                        document.getElementById('wgTicker').innerHTML += `<div style="background:#001a00;border:2px solid #00FF88;padding:8px 12px;margin:6px 0;text-align:center;"><div style="color:#00FF88;font-size:9px;">⚡ COMEBACK ALERT — ${g.a.code}${newDiff > 0 ? ' TAKES THE LEAD' : ' TIES IT UP'}!</div></div>`;
                        watchMaxDeficit[g.a.code] = 0;
                    }
                }
                if (ev.tm === g.h.code) {
                    const prevDeficit = watchCurrentScore.a - watchCurrentScore.h;
                    if (prevDeficit >= 2) watchMaxDeficit[g.h.code] = Math.max(watchMaxDeficit[g.h.code], prevDeficit);
                    watchCurrentScore.h++;
                    document.getElementById('wgHomeScore').innerText = watchCurrentScore.h;
                    const newDiff = watchCurrentScore.h - watchCurrentScore.a;
                    if (watchMaxDeficit[g.h.code] >= 2 && newDiff >= 0) {
                        document.getElementById('wgTicker').innerHTML += `<div style="background:#001a00;border:2px solid #00FF88;padding:8px 12px;margin:6px 0;text-align:center;"><div style="color:#00FF88;font-size:9px;">⚡ COMEBACK ALERT — ${g.h.code}${newDiff > 0 ? ' TAKES THE LEAD' : ' TIES IT UP'}!</div></div>`;
                        watchMaxDeficit[g.h.code] = 0;
                    }
                }
                if (ev.scorer) {
                    watchGoalsByPlayer[ev.scorer] = (watchGoalsByPlayer[ev.scorer] || 0) + 1;
                    if (watchGoalsByPlayer[ev.scorer] === 3) {
                        document.getElementById('wgTicker').innerHTML += `<div style="background:#1a1400;border:2px solid #FFD700;padding:10px 12px;margin:8px 0;text-align:center;"><div style="color:#FFD700;font-size:11px;">🎩 HAT TRICK — ${ev.scorer}!</div><div style="color:#aa8800;font-size:7px;margin-top:3px;">The hats are on the ice!</div></div>`;
                        if (awardConfig.headlines) tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `HAT TRICK: ${ev.scorer} (${ev.tm}) scores three in the broadcast!` });
                    }
                    // HOT streak callout on first goal of the watch
                    if (watchGoalsByPlayer[ev.scorer] === 1) {
                        const sPs = playerStats[ev.scorer];
                        if (sPs) {
                            if (sPs.macro_streak === 'HOT') document.getElementById('wgTicker').innerHTML += `<div style="background:#1a0800;border:1px solid #FF6600;padding:5px 8px;margin:3px 0;text-align:center;"><span style="color:#FF6600;font-size:6px;">🔥 ${ev.scorer} IS ON FIRE — MACRO HOT STREAK CONTINUES</span></div>`;
                            else if (sPs.micro_streak === 'HOT') document.getElementById('wgTicker').innerHTML += `<div style="background:#140800;border:1px solid #FF9900;padding:5px 8px;margin:3px 0;text-align:center;"><span style="color:#FF9900;font-size:6px;">🔥 ${ev.scorer} LOOKING HOT TONIGHT</span></div>`;
                        }
                    }
                }
            }
            if (ev.isPenalty) {
                document.getElementById('wgTicker').innerHTML += `<div style="background:#0d0800;border:1px solid #554400;padding:6px 8px;margin:4px 0;"><span style="color:#886600;margin-right:8px;">[${ev.tm||''}]</span><span style="color:#aaa;">${ev.txt||'Penalty called.'}</span></div>`;
            } else {
                const isPP = ev.isPP, isSH = ev.isSH, isEN = ev.isEN;
                const goalBg = isEN ? '#1a0a00' : isPP ? '#1a1400' : '#0a1500';
                const goalBorder = isEN ? '#FF8800' : isPP ? '#FFD700' : (ev.cl||'#0f0');
                const specialTag = isEN ? ' <span style="background:#FF8800;color:#000;font-size:6px;padding:1px 4px;margin-left:6px;">EN</span>'
                                 : isPP ? ' <span style="background:#FFD700;color:#000;font-size:6px;padding:1px 4px;margin-left:6px;">PP</span>'
                                 : isSH ? ' <span style="background:#00FFFF;color:#000;font-size:6px;padding:1px 4px;margin-left:6px;">SH</span>' : '';
                const goalLabel = isEN ? '🥅 EMPTY NET GOAL' : '⚡ GOAL';
                if (isPP) {
                    const bug = document.getElementById('wgScoreBug');
                    if (bug) { bug.style.background = '#332200'; setTimeout(() => { bug.style.background = '#000'; }, 1200); }
                }
                document.getElementById('wgTicker').innerHTML += `<div style="background:${goalBg};border:2px solid ${goalBorder};padding:8px 10px;margin:6px 0;"><div style="color:${ev.cl||'#fff'};font-size:9px;margin-bottom:3px;">${goalLabel} — ${ev.tm||''}${specialTag}</div><div style="color:#fff;font-size:7px;">${ev.txt || ev.scorer || ''}</div></div>`;
            }
        }
        let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight;
    }, 1200); 
}

function skipWatchGame() {
    clearInterval(watchInterval); watchQueue = [];
    document.getElementById('wgAwayScore').innerText = watchGameObj.result.aG; document.getElementById('wgHomeScore').innerText = watchGameObj.result.hG;
    const skipFinal = `FINAL${watchGameObj.result.ot > 0 ? ' (OT)' : ''}`;
    document.getElementById('wgClock').innerText = skipFinal;
    document.getElementById('wgBugClock').innerText = skipFinal;
    document.getElementById('wgBugAwayScore').innerText = watchGameObj.result.aG;
    document.getElementById('wgBugHomeScore').innerText = watchGameObj.result.hG;
    let h = '<div style="color:var(--ea-yellow); text-align:center; margin-bottom:15px;">--- FAST FORWARDED TO END ---</div>';
    watchGameObj.result.boxLog.forEach(ev => {
        if (ev.isPenalty) { h += `<div style="background:#111; border:1px solid ${ev.cl}; padding:4px; margin:4px 0;"><span style="color:${ev.cl}; font-weight:bold; margin-right:10px;">[${ev.tm}]</span> <span style="color:#fff;">[SUS] ${ev.txt}</span></div>`; }
        else if (ev.isNote) { h += `<div style="background:#111; border:1px solid #888; padding:4px; margin:4px 0;"><span style="color:#ccc;">🥅 ${ev.txt}</span></div>`; }
        else {
            h += `<div style="background:#111; border:1px solid ${ev.cl||'#555'}; padding:4px; margin:4px 0;"><span style="color:${ev.cl||'#fff'}; font-weight:bold; margin-right:10px;">[${ev.tm||''}]</span> <span style="color:#fff;">!! GOAL! ${ev.txt || ev.scorer || ''}</span></div>`; }
    });
    h += `<div style="color:var(--ea-yellow); text-align:center; margin-top:20px; font-size:12px;">!! FINAL HORN !!</div>`;
    document.getElementById('wgTicker').innerHTML = h; let t = document.getElementById('wgTicker'); t.scrollTop = t.scrollHeight;
    document.getElementById('btnWgSkip').style.display = 'none'; document.getElementById('btnWgClose').style.display = 'block';
}

function closeWatchGame() {
    document.getElementById('watchGameOverlay').style.display = 'none';
    const bd = watchBroadcastDay != null ? watchBroadcastDay : currentDay;
    const bi = watchBroadcastIdx != null ? watchBroadcastIdx : activeIdx;
    updateUI(); saveGame();
    const jumbo = document.getElementById('jumboMessage');
    if (jumbo) {
        jumbo.innerHTML = `BROADCAST CONCLUDED.<br><br><button onclick="openBoxScore(${bd}, ${bi})" style="border-color:var(--neon-cyan); color:var(--neon-cyan); font-size:7px;">VIEW BOX SCORE</button>`;
    }
}

// --- LINE EDITORS & SPECIAL TEAMS MENUS ---

// --- renderLineEditor --------------------------------------------------------
// Draws the interactive line/pairing editor inside #lineEditorContent.
// Click any player slot to open a dropdown swap. Preset pairs (Dynamic Duos)
// are highlighted in gold. Save writes to tObj.customLines which overrides AI.
// -----------------------------------------------------------------------------
function renderLineEditor(tk) {
    const container = document.getElementById('lineEditorContent');
    if (!container) return;

    const tObj = league.find(t => t.nrm === tk);
    const roster = rosters[tk];
    if (!tObj || !roster) { container.innerHTML = `<div style="color:red">No roster for ${tk}</div>`; return; }

    const struct = getRosterStructure(tk);
    const isCustom = !!(customLines[tk] && customLines[tk].f);

    // Helpers
    const ovr  = n => getPlayerWeightedStats(n).ovr || 0;
    const tag  = n => getArchetypeBadge(n);
    const mates = n => { const r = getLineMates(n); return r ? r.flat() : []; };
    const inj  = n => { const ps = playerStats[n]; return ps && ps.injury && ps.injury.daysRemaining > 0; };
    const lineAvg = arr => arr.length ? Math.round(arr.reduce((s,p)=>s+ovr(p.name),0)/arr.length) : 0;

    // -- Slot renderer (click opens swap dropdown) --------------------------
    const slotHTML = (p, slotId, posHint, accentColor) => {
        if (!p) return `<div class="le-slot empty" style="color:#444; border:1px dashed #333; padding:6px 4px; text-align:center; font-size:8px; border-radius:3px;">-- EMPTY --</div>`;
        const isDuo  = mates(p.name).length > 0;
        const isInj  = inj(p.name);
        const border = isDuo ? '2px solid var(--ea-yellow)' : `1px solid ${accentColor}33`;
        const duoTip = isDuo ? ` title="Dynamic Duo: ${mates(p.name).join(' & ')}"` : '';
        return `
        <div class="le-slot" id="slot_${slotId}" style="border:${border}; background:#111; border-radius:3px; padding:5px 4px; cursor:pointer; position:relative;"
             onclick="leOpenSwap('${tk}','${slotId}','${posHint}')"${duoTip}>
            <div style="font-size:8px; color:#888; margin-bottom:1px;">${posHint}${isDuo?'<span style="color:var(--ea-yellow);margin-left:3px;">*</span>':''}</div>
            <div style="font-size:9px; color:#fff; font-weight:bold;">${isInj?'[INJ] ':''}${p.name}</div>
            <div style="font-size:7px; color:${accentColor}; margin-top:1px;">${tag(p.name)} ${ovr(p.name)} OVR</div>
        </div>`;
    };

    // -- Forward lines (4 x LW-C-RW) ---------------------------------------
    let fHTML = `<div style="color:var(--ea-yellow); font-size:9px; font-weight:bold; margin-bottom:8px; letter-spacing:2px;"> FORWARD LINES</div>`;
    struct.f.forEach((line, li) => {
        const [lw, c, rw] = line; // getRosterStructure already arranges LW,C,RW
        const avg = lineAvg(line);
        const accent = li===0 ? 'var(--neon-cyan)' : li===1 ? '#88aaff' : li===2 ? '#aaa' : '#666';
        fHTML += `
        <div style="margin-bottom:8px; background:#0d0d0d; border-left:3px solid ${accent}; border-radius:2px;">
            <div style="padding:4px 8px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:${accent}; font-size:8px; font-weight:bold;">LINE ${li+1}</span>
                <span style="color:#666; font-size:7px;">AVG ${avg} OVR</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; padding:0 6px 6px;">
                ${slotHTML(lw || line[0], `f${li}0`, 'LW', accent)}
                ${slotHTML(c  || line[1], `f${li}1`, 'C',  accent)}
                ${slotHTML(rw || line[2], `f${li}2`, 'RW', accent)}
            </div>
        </div>`;
    });

    // -- Defense pairings (3 x LD-RD) --------------------------------------
    let dHTML = `<div style="color:#00FFFF; font-size:9px; font-weight:bold; margin-bottom:8px; letter-spacing:2px; margin-top:12px;"> DEFENSE PAIRINGS</div>`;
    struct.d.forEach((pair, pi) => {
        const [ld, rd] = pair;
        const avg = lineAvg(pair);
        const accent = pi===0 ? 'var(--neon-cyan)' : pi===1 ? '#88aaff' : '#aaa';
        dHTML += `
        <div style="margin-bottom:8px; background:#0d0d0d; border-left:3px solid ${accent}; border-radius:2px;">
            <div style="padding:4px 8px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:${accent}; font-size:8px; font-weight:bold;">PAIR ${pi+1}</span>
                <span style="color:#666; font-size:7px;">AVG ${avg} OVR</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:0 6px 6px;">
                ${slotHTML(ld, `d${pi}0`, 'LD', accent)}
                ${slotHTML(rd, `d${pi}1`, 'RD', accent)}
            </div>
        </div>`;
    });

    // -- Goalies ------------------------------------------------------------
    let gHTML = `<div style="color:#FF55FF; font-size:9px; font-weight:bold; margin-bottom:8px; letter-spacing:2px; margin-top:12px;"> GOALIES</div>`;
    gHTML += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">`;
    const goalies = roster.filter(p=>p.pos==='G').sort((a,b)=>ovr(b.name)-ovr(a.name)).slice(0,2);
    goalies.forEach((g, gi) => {
        const isInj = inj(g.name);
        gHTML += `<div style="background:#111; border:1px solid #333; border-radius:3px; padding:6px; cursor:pointer;" onclick="showPlayerCard('${g.name}')">
            <div style="font-size:7px; color:#FF55FF;">${gi===0?'STARTER':'BACKUP'}</div>
            <div style="font-size:9px; color:#fff; font-weight:bold;">${isInj?'[INJ] ':''}${g.name}</div>
            <div style="font-size:7px; color:#aaa;">${ovr(g.name)} OVR</div>
        </div>`;
    });
    gHTML += `</div>`;

    // -- Special teams (auto-coach, read-only) -------------------------------
    let stHTML = `<div style="color:#FFD700; font-size:9px; font-weight:bold; margin-bottom:8px; letter-spacing:2px; margin-top:12px;"> SPECIAL TEAMS (AUTO-COACH)</div>`;
    const stUnit = (label, players, color) => {
        const names = players.map(p => `${p.name} <span style="color:#666;">${ovr(p.name)}</span>`).join('<span style="color:#444;"> / </span>');
        return `<div style="background:#0d0d0d; border-left:3px solid ${color}; border-radius:2px; padding:5px 8px; margin-bottom:5px;">
            <span style="color:${color}; font-size:7px; font-weight:bold;">${label}</span>
            <div style="font-size:8px; color:#ccc; margin-top:2px;">${names || '<span style=\"color:#555\">--</span>'}</div>
        </div>`;
    };
    stHTML += stUnit('PP1', getSpecialTeamsUnit(tk, 'PP', 1), 'var(--ea-yellow)');
    stHTML += stUnit('PP2', getSpecialTeamsUnit(tk, 'PP', 2), '#b89a00');
    stHTML += stUnit('PK1', getSpecialTeamsUnit(tk, 'PK', 1), '#00FFFF');
    stHTML += stUnit('PK2', getSpecialTeamsUnit(tk, 'PK', 2), '#008899');

    // -- Legend & action buttons --------------------------------------------
    const legendHTML = `
    <div style="margin-top:10px; padding:6px 8px; background:#0a0a0a; border:1px solid #222; border-radius:3px; font-size:7px; color:#666;">
        <span style="color:var(--ea-yellow);">*</span> Dynamic Duo pairing &nbsp;|&nbsp; Click any slot to swap &nbsp;|&nbsp; OVR = live weighted rating
    </div>`;

    const modeLabel = isCustom
        ? `<span style="color:#0f0; font-size:7px;">OK CUSTOM LINES ACTIVE</span>`
        : `<span style="color:#aaa; font-size:7px;">AUTO-COACH (AI) ACTIVE</span>`;

    const btnRow = `
    <div style="display:flex; gap:8px; margin-top:10px;">
        <button onclick="leSaveLines('${tk}')" style="flex:1; border-color:#0f0; color:#0f0; font-size:8px;">SAVE LINES</button>
        <button onclick="leClearLines('${tk}')" style="flex:1; border-color:var(--line-red); color:var(--line-red); font-size:8px;">RESET TO AI</button>
        <button onclick="document.getElementById('lineEditorOverlay').style.display='none'" style="flex:1; font-size:8px;">CLOSE</button>
    </div>
    <div style="margin-top:6px; text-align:center;">${modeLabel}</div>`;

    container.innerHTML = fHTML + dHTML + gHTML + stHTML + legendHTML + btnRow;
}

// -- Swap dropdown -------------------------------------------------------------
function leOpenSwap(tk, slotId, posHint) {
    const existing = document.getElementById('le-swap-overlay');
    if (existing) existing.remove();

    const roster = rosters[tk] || [];
    const isF = posHint !== 'LD' && posHint !== 'RD';
    const pool = roster.filter(p => isF ? (p.pos !== 'G' && p.pos !== 'D') : p.pos === 'D')
                       .sort((a,b) => (getPlayerWeightedStats(b.name).ovr||0) - (getPlayerWeightedStats(a.name).ovr||0));

    let h = `<div style="background:#111; border:2px solid var(--ea-yellow); border-radius:4px; padding:12px; width:240px; max-height:320px; overflow-y:auto;">`;
    h += `<div style="color:var(--ea-yellow); font-size:9px; font-weight:bold; margin-bottom:8px;">SWAP ${posHint} SLOT</div>`;
    pool.forEach(p => {
        const inj = playerStats[p.name]?.injury?.daysRemaining > 0;
        const duo = getLineMates(p.name);
        const duoLabel = duo ? `<span style="color:var(--ea-yellow); font-size:7px;"> *</span>` : '';
        h += `<div style="padding:5px 6px; cursor:pointer; border-radius:2px; margin-bottom:2px; background:#1a1a1a;"
                   onmouseover="this.style.background='#222'" onmouseout="this.style.background='#1a1a1a'"
                   onclick="leSwapSlot('${tk}','${slotId}','${p.name}')">
            <span style="color:#fff; font-size:9px;">${inj?'[INJ] ':''}${p.name}${duoLabel}</span>
            <span style="color:#aaa; font-size:7px; float:right;">${getPlayerWeightedStats(p.name).ovr} OVR</span>
        </div>`;
    });
    h += `<button onclick="document.getElementById('le-swap-overlay').remove()" style="width:100%; margin-top:6px; border-color:#555; color:#aaa; font-size:7px;">CANCEL</button>`;
    h += `</div>`;

    const overlay = document.createElement('div');
    overlay.id = 'le-swap-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = h;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}

// -- Apply a swap and re-render ------------------------------------------------
function leSwapSlot(tk, slotId, newPlayerName) {
    // Parse slot id: f01 = forward line 0 slot 1, d10 = defense pair 1 slot 0
    const type     = slotId[0];         // 'f' or 'd'
    const lineIdx  = parseInt(slotId[1]);
    const spotIdx  = parseInt(slotId[2]);

    // Seed customLines[tk] from AI structure if first edit
    if (!customLines[tk]) {
        const struct = getRosterStructure(tk);
        customLines[tk] = {
            f: struct.f.map(line => line.map(p => p.name)),
            d: struct.d.map(pair => pair.map(p => p.name)),
            g: struct.g.map(p => p.name)
        };
    }

    const lines = customLines[tk][type];
    // Swap: find where newPlayer currently lives and exchange
    let oldLine = -1, oldSpot = -1;
    lines.forEach((ln, li) => ln.forEach((n, si) => { if (n === newPlayerName) { oldLine = li; oldSpot = si; } }));
    const displaced = lines[lineIdx][spotIdx];
    lines[lineIdx][spotIdx] = newPlayerName;
    if (oldLine !== -1) lines[oldLine][oldSpot] = displaced;

    // New personnel in a slot means old accumulated chemistry no longer applies
    const tObj = league.find(t => t.nrm === tk);
    if (tObj && tObj.chem) {
        if (type === 'f' && tObj.chem.f) tObj.chem.f[lineIdx] = 0;
        if (type === 'd' && tObj.chem.d) tObj.chem.d[lineIdx] = 0;
        if (oldLine !== -1) {
            if (type === 'f' && tObj.chem.f) tObj.chem.f[oldLine] = 0;
            if (type === 'd' && tObj.chem.d) tObj.chem.d[oldLine] = 0;
        }
    }

    document.getElementById('le-swap-overlay')?.remove();
    renderLineEditor(tk);
}

// -- Persist custom lines ------------------------------------------------------
function leSaveLines(tk) {
    if (!customLines[tk]) { alert('No changes to save. Swap players first.'); return; }
    localStorage.setItem('nhl94_customLines', JSON.stringify(customLines));
    saveGame();
    alert(`Lines saved for ${tk.toUpperCase()}! Custom lines are now active.`);
    renderLineEditor(tk);
}

// -- Clear custom lines (revert to AI) ----------------------------------------
function leClearLines(tk) {
    delete customLines[tk];
    localStorage.setItem('nhl94_customLines', JSON.stringify(customLines));
    saveGame();
    renderLineEditor(tk);
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
    
    let h = `<div style="background:#111; padding:20px; border:2px solid var(--ea-yellow); text-align:center; max-width:500px; margin:auto; box-shadow: 0 0 20px #000;">`;
    h += `<h3 style="color:var(--ea-yellow); margin-top:0;">EDIT ${mode} ${mode==='EXA'?'':unitNum}</h3>`;
    h += `<div style="display:flex; flex-direction:column; gap:12px; margin-bottom:15px;">`;
    
    for (let i = 0; i < maxSpots; i++) {
        let currentPlayer = unit[i] || '';
        let currentPlayerObj = roster.find(p => p.name === currentPlayer);
        let currentPos = currentPlayerObj ? getPlayerPosition(currentPlayerObj) : '?';
        let posLabel = currentPos === 'C' ? '[C]' : currentPos === 'LW' ? '[LW]' : currentPos === 'RW' ? '[RW]' : currentPos === 'D' ? '[D]' : '[G]';
        
        h += `<div style="background:#000; padding:10px; border:1px solid #333; border-radius:4px;">`;
        h += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">`;
        h += `<span style="color:var(--neon-cyan); font-weight:bold; font-size:10px;">${posLabel} SPOT ${i+1}</span>`;
        h += `<span style="color:#aaa; font-size:9px;">${currentPlayer ? getPlayerWeightedStats(currentPlayer).ovr + ' OVR' : 'Empty'}</span>`;
        h += `</div>`;
        h += `<select id="st_select_${i}" style="background:#222; color:var(--neon-cyan); border:1px solid #555; padding:8px; width:100%; border-radius:3px; font-size:10px;">`;
        h += `<option value="">-- SELECT PLAYER --</option>`;
        let healthySkaters = roster.filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0 && !(playerStats[p.name].suspended?.days > 0));
        healthySkaters.forEach(p => { 
            let selected = p.name === currentPlayer ? 'selected' : ''; 
            let pPos = getPlayerPosition(p);
            let pPosLabel = pPos === 'C' ? '[C]' : pPos === 'LW' ? '[LW]' : pPos === 'RW' ? '[RW]' : '[F]';
            h += `<option value="${p.name}" ${selected}>${pPosLabel} ${p.name} - OVR ${getPlayerWeightedStats(p.name).ovr}</option>`; 
        });
        h += `</select>`;
        h += `</div>`;
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

function toggleAwardConfig(setting) {
    awardConfig[setting] = !awardConfig[setting];
    const btnId = `btn${setting.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (awardConfig[setting]) {
        btn.textContent = btn.textContent.replace('OFF', 'ON');
        btn.style.opacity = '1';
    } else {
        btn.textContent = btn.textContent.replace('ON', 'OFF');
        btn.style.opacity = '0.5';
    }
}

function toggleSheetSamplePanel() {
    // Toggle the sheet format sample panel visibility
    const panel = document.getElementById('sheetSamplePanel');
    if (panel) {
        const isHidden = panel.style.display === 'none' || window.getComputedStyle(panel).display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
    }
}

function syncTeamsFromLeague() {
    // Sync the global teams object with data from the league array
    // This ensures the UI has access to current team data
    if (!league || league.length === 0) return;
    
    teams = {};
    league.forEach((team, index) => {
        teams[team.code || index] = {
            name: team.name || `Team ${index}`,
            code: team.code,
            wins: team.season?.w || 0,
            losses: team.season?.l || 0,
            ties: team.season?.t || 0,
            gf: team.season?.gf || 0,
            ga: team.season?.ga || 0,
            pts: team.season?.pts || 0,
            gp: team.season?.gp || 0,
            season: team.season || {},
            conference: team.conference,
            division: team.division
        };
    });
}

function toggleBox(el) {
    const header = el; let content = header.nextElementSibling;
    if (!content || !content.classList.contains('collapsible-content')) { content = Array.from(header.parentElement.children).find(child => child !== header && child.classList.contains('collapsible-content')); }
    if (!content) return;
    const isHidden = content.style.display === 'none' || window.getComputedStyle(content).display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const icon = header.querySelector('.toggle-icon'); if (icon) { icon.innerText = isHidden ? '[-]' : '[+]'; }
} 

function clearArchives() { 
    if(confirm("Delete past History & HOF?")) { 
        leagueHistory = []; hallOfFame = []; retiredPlayers = []; 
        localStorage.removeItem(HISTORY_STORAGE_KEY); localStorage.removeItem(HOF_STORAGE_KEY); localStorage.removeItem(RETIRED_STORAGE_KEY); 
        renderLeagueHistory(); renderHallOfFame(); renderRetiredPlayers(); 
    } 
}

// Reverse of gradeToNum's randomized bucket ranges — used only for re-exporting a numeric
// attribute back into a letter grade for the roster CSV. Not an exact inverse (gradeToNum
// itself is a random roll within a bucket), but round-trips within the same tier.
function numToGrade(n) {
    const v = parseInt(n);
    if (isNaN(v)) return 'C';
    if (v >= 95) return 'A+';
    if (v >= 90) return 'A';
    if (v >= 85) return 'A-';
    if (v >= 80) return 'B+';
    if (v >= 75) return 'B';
    if (v >= 70) return 'B-';
    if (v >= 63) return 'C+';
    if (v >= 56) return 'C';
    if (v >= 50) return 'C-';
    if (v >= 40) return 'D';
    return 'F';
}

// Exports the CURRENT state of the league (post-trades, post-retirements, updated career
// totals, current age/team) as a re-importable roster CSV in the same one-row-per-player
// shape the app's own CSV parser expects (header-name matched, not position-dependent — see
// getCol() calls in the CSV load path). Meant to be re-uploaded to the Google Sheet (or used
// as a custom Player Sheet URL/file) so a brand-new franchise starts from the updated pool
// instead of the original static roster data.
function exportUpdatedRosterCSV() {
    const headers = [
        "Team Code","Team Name","Last Name","First Name","Position","Offense Awareness","Defense Awareness",
        "Shot Power","Passing","Aggression","Roughness","Endurance","Checking","Shot Accuracy","Stick Handling",
        "Agility","Speed","Weight","Age","All Star App.",
        "Career GP","Career G","Career A","Career Pts","Career PPG","Career +/-","Career GWG",
        "Career Playoff GP","Career Playoff G","Career Playoff A","Career Playoff Pts",
        "Goalie Last Name","Goalie First Name","Handed","G Def",
        "Goalie CAREER GP","CAREER W","CAREER L","CAREER T","CAREER SO","CAREER SV","CAREER SA",
        "Goalie CAREER PLAYOFF GP","CAREER PLAYOFF W","CAREER PLAYOFF L","CAREER PLAYOFF SO","CAREER PLAYOFF SV","CAREER PLAYOFF SA",
        "Goalie Career Allstar Games"
    ];
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [headers.join(',')];

    Object.values(playerStats).forEach(p => {
        const parts = (p.name || '').split(' ');
        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
        const firstName = parts.length > 1 ? parts[0] : '';
        const c = p.career || {};
        const cp = p.careerPlayoff || {};
        const teamObj = league.find(t => t.code === p.teamCode) || {};

        if (p.pos === 'G') {
            const row = new Array(headers.length).fill('');
            row[0] = p.teamCode || ''; row[1] = teamObj.name || p.team || '';
            row[18] = p.age || ''; row[19] = p.asgAppearances || 0;
            row[31] = lastName; row[32] = firstName;
            row[33] = p.attr?.handed || 'L';
            row[34] = numToGrade(p.attr?.gDef);
            row[35] = c.gp || 0; row[36] = c.w || 0; row[37] = c.l || 0; row[38] = c.t || 0;
            row[39] = c.so || 0; row[40] = c.sv || 0; row[41] = c.sa || 0;
            row[42] = cp.gp || 0; row[43] = cp.w || 0; row[44] = cp.l || 0;
            row[45] = cp.so || 0; row[46] = cp.sv || 0; row[47] = cp.sa || 0;
            row[48] = p.asgAppearances || 0;
            rows.push(row.map(esc).join(','));
        } else {
            const g = p.attr?.grades || {};
            const row = new Array(headers.length).fill('');
            row[0] = p.teamCode || ''; row[1] = teamObj.name || p.team || '';
            row[2] = lastName; row[3] = firstName; row[4] = p.pos || '';
            row[5] = numToGrade(p.attr?.off); row[6] = numToGrade(p.attr?.def);
            row[7] = g.shotPwr || 'C'; row[8] = g.pass || 'C'; row[9] = g.aggr || 'C';
            row[10] = g.rough || 'C'; row[11] = g.endur || 'C'; row[12] = g.check || 'C';
            row[13] = g.shotAcc || 'C'; row[14] = g.stkHnd || 'C'; row[15] = g.agil || 'C'; row[16] = g.speed || 'C';
            row[17] = p.weight || '';
            row[18] = p.age || ''; row[19] = p.asgAppearances || 0;
            row[20] = c.gp || 0; row[21] = c.g || 0; row[22] = c.a || 0; row[23] = (c.g||0)+(c.a||0);
            row[24] = c.ppg || 0; row[25] = c.pm || 0; row[26] = c.gwg || 0;
            row[27] = cp.gp || 0; row[28] = cp.g || 0; row[29] = cp.a || 0; row[30] = (cp.g||0)+(cp.a||0);
            rows.push(row.map(esc).join(','));
        }
    });

    const csv = rows.join('\n');
    const b = new Blob([csv], {type: "text/csv"});
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `nhl94_roster_updated_season${currentSeason}.csv`;
    a.click();
    URL.revokeObjectURL(u);
}

function exportCSV() {
    let csv = "Player,Team,Pos,Age,GP,G,A,PTS,W,SO,SV%,GAA,OVR,ASG_APP\n"; 
    Object.values(playerStats).forEach(p => { 
        const s = p.season; const svp = s.sa > 0 ? (s.sv/s.sa).toFixed(3) : "0.000"; const gaa = s.gp > 0 ? ((s.sa-s.sv)/s.gp).toFixed(2) : "0.00"; 
        const ovr = getPlayerWeightedStats(p.name).baseOvr;
        csv += `${p.name},${p.team},${p.pos},${p.age},${s.gp},${s.g},${s.a},${s.g+s.a},${s.w},${s.so},${svp},${gaa},${ovr},${p.asgAppearances || 0}\n`; 
    }); 
    const b = new Blob([csv], {type: "text/csv"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); 
    a.href = u; a.download = "EASN_League_Stats.csv"; a.click(); 
}
// =========================================================
// --- THE MISSING ENGINE: TRADES, AWARDS & ARCHIVES ---
// =========================================================


function takeMonthSnapshot() {
    monthSnapshot = { _day: currentDay };
    Object.values(playerStats).forEach(p => { monthSnapshot[p.name] = { g: p.season.g, a: p.season.a, w: p.season.w, gp: p.season.gp, sv: p.season.sv, sa: p.season.sa }; });
    saveGame();
}

function renderMonthlyProgress() {
    const snap = monthSnapshot;
    const hasSnap = snap && Object.keys(snap).length > 0;
    const skaters = Object.values(playerStats).filter(p => p.season && p.season.gp > 0 && p.pos !== 'G');
    const goalies  = Object.values(playerStats).filter(p => p.season && p.season.gp > 0 && p.pos === 'G');
    const delta = (p, field) => (p.season[field]||0) - ((hasSnap && snap[p.name]) ? (snap[p.name][field]||0) : 0);
    const top = (arr, sortFn, n=8) => [...arr].sort(sortFn).slice(0, n);
    const row = (p, val, color='#fff') => `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
        <td style="color:#888;font-size:6px;padding:2px 5px;">${p.teamCode||''}</td>
        <td style="padding:2px 5px;font-size:7px;">${p.name}</td>
        <td style="text-align:right;color:${color};font-weight:bold;padding:2px 8px;font-size:7px;">${val}</td></tr>`;
    const tbl = (title, rows, color) => `<div style="margin-bottom:12px;">
        <div style="font-size:5px;color:#888;text-transform:uppercase;letter-spacing:.14em;border-bottom:1px solid #222;padding-bottom:3px;margin-bottom:5px;">${title}</div>
        <table style="width:100%;font-size:7px;border-collapse:collapse;">${rows}</table></div>`;
    const label = hasSnap ? `SINCE DAY ${(snap._day||'?')}` : 'SEASON TOTALS (NO CHECKPOINT SET)';
    const goalieSvpDelta = p => {
        const curSA = p.season.sa||0, curSV = p.season.sv||0;
        const snapSA = (hasSnap&&snap[p.name]) ? (snap[p.name].sa||0) : 0;
        const snapSV = (hasSnap&&snap[p.name]) ? (snap[p.name].sv||0) : 0;
        const dSA = curSA-snapSA, dSV = curSV-snapSV;
        return dSA >= 5 ? dSV/dSA : 0;
    };
    let h = `<div style="margin-top:10px;border-top:1px solid #222;padding-top:10px;">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
    h += `<div style="font-size:6px;color:var(--neon-cyan);letter-spacing:.1em;">MONTHLY PROGRESS — ${label}</div>`;
    h += `<button onclick="takeMonthSnapshot();openStatLeaders();" style="font-size:5px;padding:2px 6px;background:#0a1a2a;border:1px solid var(--neon-cyan);color:var(--neon-cyan);cursor:pointer;border-radius:2px;">SET CHECKPOINT (DAY ${currentDay})</button>`;
    h += `</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">`;
    h += `<div>`;
    h += tbl('Points Since Chk', top(skaters,(a,b)=>(delta(b,'g')+delta(b,'a'))-(delta(a,'g')+delta(a,'a'))).map(p=>row(p,(delta(p,'g')+delta(p,'a')),'var(--ea-yellow)')).join(''));
    h += tbl('Goals Since Chk',  top(skaters,(a,b)=>delta(b,'g')-delta(a,'g')).map(p=>row(p,delta(p,'g'),'#FF6666')).join(''));
    h += `</div><div>`;
    h += tbl('Assists Since Chk',top(skaters,(a,b)=>delta(b,'a')-delta(a,'a')).map(p=>row(p,delta(p,'a'),'var(--neon-cyan)')).join(''));
    h += tbl('SV% Since Chk', top(goalies,(a,b)=>goalieSvpDelta(b)-goalieSvpDelta(a)).filter(p=>((p.season.sa||0)-((hasSnap&&snap[p.name]&&snap[p.name].sa)||0))>=5).map(p=>row(p,goalieSvpDelta(p).toFixed(3),'var(--neon-cyan)')).join(''));
    h += `</div></div></div>`;
    return h;
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
            return t && isConfMatch(t.conf)
                && (!p.injury || p.injury.daysRemaining === 0)
                && (!p.suspended || p.suspended.days === 0);
        });

        let selectedPlayers = []; let repNames = new Set();
        // Season production + legacy weight: past All-Star appearances nudge repeat selections
        const getScore = (p) => (p.pos === 'G' ? (p.season.w * 2) + p.season.so : p.season.g + p.season.a) + (((p.career?.asg || 0) + (p.asgAppearances || 0)) * 1.5);

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
    if (Array.isArray(realDatesMap) && realDatesMap.length) realDatesMap.splice(currentDay, 0, 'ALL-STAR BREAK');


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
    
    let r = rosters[tk] || []; 
    let f = r.filter(p => p.pos !== 'D' && p.pos !== 'G'); 
    let d = r.filter(p => p.pos === 'D'); 
    let g = r.filter(p => p.pos === 'G');

    // Defines the player row layout once, using your updated dynamic overall logic
    const pLine = (p) => { 
        let st = playerStats[p.name]; 
        return `<div style="display:flex; justify-content:space-between; margin-bottom:4px; cursor:pointer;" onclick="showPlayerCard('${p.name}')"><span>${p.name} <span style="color:#666; font-size:6px;">(${st.teamCode})</span></span><span style="color:var(--neon-cyan);">${getLiveIceOvr(p.name)}</span></div>`; 
    };

    // Forwards Section
    html += `<div style="color:#ccc; font-weight:bold; margin-top:8px; margin-bottom:4px; border-bottom:1px solid #333;">FORWARDS</div>`; 
    f.forEach(p => html += pLine(p));

    // Defense Section
    html += `<div style="color:#ccc; font-weight:bold; margin-top:12px; margin-bottom:4px; border-bottom:1px solid #333;">DEFENSE</div>`; 
    d.forEach(p => html += pLine(p));

    // Goaltenders Section
    html += `<div style="color:#ccc; font-weight:bold; margin-top:12px; margin-bottom:4px; border-bottom:1px solid #333;">GOALTENDERS</div>`; 
    g.forEach(p => html += pLine(p));

    html += `</div>`; 
    return html;
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
    
    let res = '';
    // We will store the runners up strings and key stats here to use in the UI later
    let runnersUp = {};
    let winnerStats = {};

    // 1. ROCKET RICHARD
    const rocketSorted = [...skaters].sort((a, b) => b.season.g - a.season.g);
    if (rocketSorted.length > 0) {
        awardTrophy(rocketSorted[0].name, currentSeason, "Rocket Richard");
        runnersUp["Rocket Richard"] = rocketSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Rocket Richard"] = `${rocketSorted[0].season.g} G`;
    }

    // ==========================================
    // [AWD] ADVANCED HART TROPHY (MVP) LOGIC
    // ==========================================
    let teamTopScorers = {};
    skaters.forEach(p => {
        let pts = p.season.g + p.season.a;
        let tm = p.team || "FA"; 
        if (!teamTopScorers[tm]) teamTopScorers[tm] = [];
        teamTopScorers[tm].push(pts);
    });
    
    for (let tm in teamTopScorers) {
        teamTopScorers[tm].sort((a, b) => b - a); 
    }

    const _eastTeams = league.filter(t=>t.conf==='Eastern').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8);
    const _westTeams = league.filter(t=>t.conf==='Western').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8);
    if (_eastTeams.length === 0) console.warn('runEndOfSeasonAwards: no Eastern conf teams found — check CSV conf column');
    if (_westTeams.length === 0) console.warn('runEndOfSeasonAwards: no Western conf teams found — check CSV conf column');
    // If either conference's tagging is broken, fall back to a single league-wide top-16 so no team's players are wrongly excluded
    const playoffQualifiers = (_eastTeams.length === 0 || _westTeams.length === 0)
        ? new Set([...league].sort((a,b)=>b.season.pts-a.season.pts).slice(0,16).map(t=>t.name))
        : new Set([..._eastTeams.map(t=>t.name), ..._westTeams.map(t=>t.name)]);

    let mvpCandidates = [];
    skaters.forEach(p => {
        if (!playoffQualifiers.has(p.team)) return;
        let pts = p.season.g + p.season.a;
        let tm = p.team || "FA";
        let teamStats = teamTopScorers[tm];
        let carryBonus = (teamStats && teamStats[0] === pts && teamStats.length > 1) ? (pts - teamStats[1]) : 0;
        mvpCandidates.push({ name: p.name, score: pts + (carryBonus * 0.75) });
    });

    goalies.forEach(g => {
        if (!playoffQualifiers.has(g.team)) return;
        let w = g.season.w || 0;
        let so = g.season.so || 0;
        let svPct = g.season.gp > 0 && g.season.sa > 0 ? (g.season.sv / g.season.sa) : 0;
        let svBonus = svPct > 0.900 ? (svPct - 0.900) * 1000 : 0;
        mvpCandidates.push({ name: g.name, score: (w * 2.2) + (so * 3) + svBonus });
    });

    const hartSorted = mvpCandidates.sort((a, b) => b.score - a.score);
    if (hartSorted.length > 0) {
        awardTrophy(hartSorted[0].name, currentSeason, "Hart");
        runnersUp["Hart"] = hartSorted.slice(1, 4).map(p => p.name).join(', ');
        const hW = Object.values(playerStats).find(p => p.name === hartSorted[0].name);
        winnerStats["Hart"] = hW ? (hW.pos === 'G' ? `${hW.season.w}W  ${hW.season.so}SO` : `${hW.season.g}G  ${hW.season.a}A  ${hW.season.g+hW.season.a}PTS`) : '';
    }

    // 2. ART ROSS
    const artSorted = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a));
    if (artSorted.length > 0) {
        awardTrophy(artSorted[0].name, currentSeason, "Art Ross");
        runnersUp["Art Ross"] = artSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Art Ross"] = `${artSorted[0].season.g}G  ${artSorted[0].season.a}A  ${artSorted[0].season.g+artSorted[0].season.a}PTS`;
    }

    // 3. CALDER — eligible: career GP < 32 entering the season (all positions)
    // A player under the career-GP threshold IS a rookie by definition, full stop —
    // no age gate on top of it. (A fresh franchise's career.gp starts at 0 for every
    // imported player in year 1, so real veterans can look like rookies that one season;
    // that's accepted as a one-time bootstrap quirk rather than excluding genuine
    // late-arriving rookies with an artificial age cutoff in every later season.)
    const ROOKIE_GP_LIMIT = 31;
    const calderScore = p => p.pos === 'G' ? (p.season.w * 1.5) + (p.season.so * 3) : (p.season.g + p.season.a);
    const calderEligible = allPlayers.filter(p => { const cGP = p.career.gp || 0; return p.pos === 'G' ? (cGP <= ROOKIE_GP_LIMIT && p.season.gp >= minGoalieGP) : (cGP <= ROOKIE_GP_LIMIT && p.season.gp >= minSkaterGP); });
    const calderSorted = [...calderEligible].sort((a, b) => calderScore(b) - calderScore(a));
    if (calderSorted.length > 0) {
        awardTrophy(calderSorted[0].name, currentSeason, "Calder");
        runnersUp["Calder"] = calderSorted.slice(1, 4).map(p => p.name).join(', ');
        const cW = calderSorted[0]; winnerStats["Calder"] = cW.pos === 'G' ? `${cW.season.w}W  ${cW.season.so}SO` : `${cW.season.g}G  ${cW.season.a}A  ${cW.season.g+cW.season.a}PTS`;
    }

    // 4. LADY BYNG
    const byngSorted = [...skaters].filter(p => (p.season.g + p.season.a) >= 40).sort((a, b) => (a.season.pim || 0) - (b.season.pim || 0) || ((b.season.g + b.season.a) - (a.season.g + a.season.a)));
    if (byngSorted.length > 0) {
        awardTrophy(byngSorted[0].name, currentSeason, "Lady Byng");
        runnersUp["Lady Byng"] = byngSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Lady Byng"] = `${byngSorted[0].season.g+byngSorted[0].season.a}PTS  ${byngSorted[0].season.pim||0}PIM`;
    }

    // 5. BILL MASTERTON (Dedication to Hockey)
    // First, try to find players who returned from a significant injury (missed 5+ games)
    let mastSorted = skaters.filter(p => {
        let ps = playerStats[p.name];
        // Swapped to check for games out instead of days missed
        return ps.injuryHistory && ps.injuryHistory.some(h => h.gamesOut >= 10 && h.season === currentSeason);
        
    }).sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a));
    
    // THE FALLBACK: If no one had a major injury, award it to an older veteran (Age 34+)
    // who showed dedication by putting up the most points among older players.
    if (mastSorted.length === 0) {
        mastSorted = skaters.filter(p => p.age >= 34).sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a));
    }

    // Finally, if we have a winner (either from injury or veteran status), award it
    if (mastSorted.length > 0) {
        awardTrophy(mastSorted[0].name, currentSeason, "Bill Masterton");
        runnersUp["Bill Masterton"] = mastSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Bill Masterton"] = `${mastSorted[0].season.g+mastSorted[0].season.a}PTS  ${mastSorted[0].season.gp}GP`;
    }

    // 6. FRANK J. SELKE — all forwards are eligible, but the scoring formula and tie-break
    // both favor genuine defensive-minded archetypes so a pure sniper with good +/- can't
    // out-vote an actual shutdown/two-way forward.
    const selkeDefTagBonus = (tag) => {
        if (tag === 'DEFENSIVE SPECIALIST') return 8;
        if (tag === 'PRO DEFENSIVE FWD' || tag === 'DEFENSIVE FWD') return 6;
        if (tag === 'TWO-WAY STAR F' || tag === 'GRINDER') return 4;
        if (tag === 'TWO-WAY FWD') return 2;
        return 0;
    };
    const selkeSorted = skaters
        .filter(p => p.pos !== 'D' && p.season.gp >= 40)
        .sort((a, b) => {
            const tagA = getPlayerWeightedStats(a.name).tag, tagB = getPlayerWeightedStats(b.name).tag;
            let scoreA = (getDef(a.name) * 0.6) + ((a.season.pm || 0) * 0.4) + selkeDefTagBonus(tagA);
            let scoreB = (getDef(b.name) * 0.6) + ((b.season.pm || 0) * 0.4) + selkeDefTagBonus(tagB);
            if (scoreA === scoreB) {
                const aTwoWay = tagA.startsWith('TWO-WAY') ? 1 : 0;
                const bTwoWay = tagB.startsWith('TWO-WAY') ? 1 : 0;
                return bTwoWay - aTwoWay;
            }
            return scoreB - scoreA;
        });
        
    if (selkeSorted.length > 0) {
        awardTrophy(selkeSorted[0].name, currentSeason, "Selke");
        runnersUp["Selke"] = selkeSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Selke"] = `${selkeSorted[0].season.g+selkeSorted[0].season.a}PTS  ${selkeSorted[0].season.pm>=0?'+':''}${selkeSorted[0].season.pm||0}`;
    }

    // 7. TED LINDSAY
    const tedSorted = [...skaters]
        .filter(p => p.season.gp >= 20)
        .sort((a, b) => {
            let ptsA = (a.season.g || 0) + (a.season.a || 0);
            let ptsB = (b.season.g || 0) + (b.season.a || 0);
            let effA = (ptsA / a.season.gp) / (getPlayerWeightedStats(a.name).ovr / 100);
            let effB = (ptsB / b.season.gp) / (getPlayerWeightedStats(b.name).ovr / 100);
            let leadA = 1 + (getLeadershipScore(a.name) / 1000); 
            let leadB = 1 + (getLeadershipScore(b.name) / 1000);
            return (effB * leadB) - (effA * leadA);
        });
        
    if (tedSorted.length > 0) {
        awardTrophy(tedSorted[0].name, currentSeason, "Ted Lindsay");
        runnersUp["Ted Lindsay"] = tedSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Ted Lindsay"] = `${tedSorted[0].season.g+tedSorted[0].season.a}PTS  ${tedSorted[0].season.gp}GP`;
    }

    // 8. ALKA-SELTZER PLUS MINUS
    const plusMinusSorted = [...skaters].sort((a, b) => (b.season.pm || 0) - (a.season.pm || 0));
    if (plusMinusSorted.length > 0 && plusMinusSorted[0].season.pm > 0) {
        awardTrophy(plusMinusSorted[0].name, currentSeason, "Alka-Seltzer (+/-)");
        runnersUp["Alka-Seltzer (+/-)"] = plusMinusSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Alka-Seltzer (+/-)"] = `+${plusMinusSorted[0].season.pm||0}`;
    }

    // 9. NORRIS
    const defense = skaters.filter(p => p.pos === 'D' && playoffQualifiers.has(p.team));
    const norrisSorted = defense.sort((a, b) => ((b.season.g * 2 + b.season.a) + ((b.season.pm || 0) * 1.5)) - ((a.season.g * 2 + a.season.a) + ((a.season.pm || 0) * 1.5)));
    if (norrisSorted.length > 0) { 
        awardTrophy(norrisSorted[0].name, currentSeason, "Norris");
        runnersUp["Norris"] = norrisSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["Norris"] = `${norrisSorted[0].season.g}G  ${norrisSorted[0].season.a}A  ${norrisSorted[0].season.pm>=0?'+':''}${norrisSorted[0].season.pm||0}`;
    }
    
    // 10. VEZINA — SV% and GAA weighted heavily, wins as minor modifier
    const vezinaScore = g => {
        const svp = g.season.sa > 0 ? g.season.sv / g.season.sa : 0;
        const gaa = g.season.gp > 0 ? (g.season.sa - g.season.sv) / g.season.gp : 99;
        const svBonus = svp > 0.880 ? (svp - 0.880) * 2000 : 0; // heavily weighted
        const gaaBonus = gaa < 4.0 ? (4.0 - gaa) * 8 : 0;       // heavily weighted
        const wMod = (g.season.w || 0) * 0.4;                    // wins: minor modifier
        return svBonus + gaaBonus + wMod;
    };
    const vezinaSorted = goalies.sort((a, b) => vezinaScore(b) - vezinaScore(a));
    if (vezinaSorted.length > 0) {
        awardTrophy(vezinaSorted[0].name, currentSeason, "Vezina");
        runnersUp["Vezina"] = vezinaSorted.slice(1, 4).map(p => p.name).join(', ');
        const vzW = vezinaSorted[0]; const vzSvp = vzW.season.sa > 0 ? (vzW.season.sv/vzW.season.sa).toFixed(3) : '.000';
        winnerStats["Vezina"] = `${vzW.season.w}W  ${vzW.season.so}SO  SV% ${vzSvp}`;
    }
    
    // 13. THE DAGGER AWARD — most game-winning goals
    const daggerSorted = [...skaters].filter(p => p.season.gp >= 10).sort((a, b) => (b.season.gwg || 0) - (a.season.gwg || 0));
    if (daggerSorted.length > 0 && (daggerSorted[0].season.gwg || 0) > 0) {
        awardTrophy(daggerSorted[0].name, currentSeason, "The Espo");
        runnersUp["The Espo"] = daggerSorted.slice(1, 4).map(p => p.name).join(', ');
        winnerStats["The Espo"] = `${daggerSorted[0].season.gwg} GWG`;
    }

    // 11. JENNINGS (Skipping runners up here since it's a team-based goalie award)
    const bestDefTeam = [...league].sort((a, b) => a.season.ga - b.season.ga)[0];
    if (bestDefTeam) goalies.filter(g => g.teamCode === bestDefTeam.code && g.season.gp >= minGoalieGP).forEach(g => awardTrophy(g.name, currentSeason, "Jennings"));

    // 12. CONN SMYTHE
/**
 * Calculates a Conn Smythe value to compare Skaters and Goalies
 * Goals (2 pts), Assists (1 pt)
 * Goalies: Wins (5 pts), Shutouts (10 pts)
 */
function getConnSmytheScore(p) {
    const s = p.playoff || {}; // Ensure object exists
    
    // Check if goalie (Assuming p.pos or p.position is 'G')
    if (p.pos === 'G' || p.position === 'G') {
        const wins = s.w || 0;
        const shutouts = s.so || 0;
        return (wins * 5) + (shutouts * 10);
    }
    
    // Skater logic: Goals valued 1.2x, Assists 1x
    const goals = s.g || 0;
    const assists = s.a || 0;
    return (goals * 1.2) + (assists * 1);
}
   
    if (currentCupChamp) { 
    const cupTeam = league.find(t => t.name === currentCupChamp); 
    if (cupTeam) { 
        // Filter by team and sort using the new weighted scoring
        const smytheSorted = allPlayers
            .filter(p => p.teamCode === cupTeam.code)
            .sort((a, b) => getConnSmytheScore(b) - getConnSmytheScore(a)); 
        
        if (smytheSorted.length > 0) {
            const winner = smytheSorted[0];
            awardTrophy(winner.name, currentSeason, "Conn Smythe");
            runnersUp["Conn Smythe"] = smytheSorted.slice(1, 4).map(p => `${p.name} (${getConnSmytheScore(p)} pts)`).join(', ');
            const csW = winner; winnerStats["Conn Smythe"] = csW.pos === 'G'
                ? `${csW.playoff?.w||0}W  ${csW.playoff?.so||0}SO`
                : `${csW.playoff?.g||0}G  ${csW.playoff?.a||0}A  ${(csW.playoff?.g||0)+(csW.playoff?.a||0)}PTS`;
        }
    }
}
    
    // Trade log headlines for major awards
    if (awardConfig.headlines) {
        const logAward = (tName, label) => {
            const winner = allPlayers.find(p => p.trophies && p.trophies.some(t => t.year === currentSeason && t.name === tName));
            if (winner) tradeLog.unshift({ day: `SEASON ${currentSeason}`, details: `AWARD: ${winner.name} wins the ${label} — ${winnerStats[tName] || ''}` });
        };
        logAward('Hart', 'Hart Trophy (MVP)');
        logAward('Conn Smythe', 'Conn Smythe Trophy (Playoff MVP)');
        logAward('Vezina', 'Vezina Trophy (Best Goalie)');
        logAward('Norris', 'Norris Trophy (Best Defenceman)');
        logAward('Selke', 'Selke Trophy (Defensive Forward)');
        logAward('Art Ross', 'Art Ross Trophy (Scoring Leader)');
        logAward('Rocket Richard', 'Rocket Richard Trophy (Goal Leader)');
        if (currentCupChamp) tradeLog.unshift({ day: `SEASON ${currentSeason}`, details: `STANLEY CUP CHAMPION: ${currentCupChamp} hoists the Cup!` });
    }

    const getWinner = (tN) => { const wAll = allPlayers.filter(p => p.trophies && p.trophies.some(t => t.year === currentSeason && t.name === tN)); return wAll.length === 0 ? 'N/A' : wAll.map(w => w.name).join(', '); };

    const awardCard = (label, desc, awardKey, accent) => {
        const winner = getWinner(awardKey);
        const stat = winnerStats[awardKey] || '';
        const runners = runnersUp[awardKey] ? `<div style="color:#555;font-size:6px;margin-top:3px;">Runners-up: ${runnersUp[awardKey]}</div>` : '';
        const isNA = winner === 'N/A';
        return `<div style="display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start;background:#0a0a0a;border:1px solid ${accent}44;border-left:3px solid ${accent};padding:8px 10px;margin-bottom:6px;">
            <div style="font-size:16px;line-height:1;padding-top:2px;">🏆</div>
            <div>
                <div style="color:#666;font-size:6px;text-transform:uppercase;letter-spacing:.12em;">${label}</div>
                <div style="color:${isNA ? '#444' : accent};font-size:9px;margin:3px 0;text-shadow:${isNA?'none':'1px 1px 0 #000'};">${winner}</div>
                ${stat ? `<div style="color:var(--neon-cyan);font-size:7px;">${stat}</div>` : ''}
                <div style="color:#555;font-size:6px;margin-top:1px;">${desc}</div>
                ${runners}
            </div>
        </div>`;
    };

    const GOLD = 'var(--gold-leaf)';
    const CYAN = 'var(--neon-cyan)';
    const ORNG = 'var(--as-orange)';

    // Header
    res += `<div style="text-align:center;padding:12px 0 6px;border-bottom:2px solid var(--gold-leaf);margin-bottom:12px;">
        <div style="color:var(--gold-leaf);font-size:13px;text-shadow:2px 2px 0 #000;">SEASON ${currentSeason} AWARDS</div>
        ${currentCupChamp ? `<div style="color:var(--ea-yellow);font-size:8px;margin-top:8px;">STANLEY CUP CHAMPION</div>
        <div style="color:#fff;font-size:12px;margin-top:4px;text-shadow:1px 1px 0 #000;">${currentCupChamp}</div>` : ''}
    </div>`;

    // Major awards
    res += `<div style="color:#888;font-size:6px;text-transform:uppercase;letter-spacing:.16em;margin:10px 0 6px;">MAJOR AWARDS</div>`;
    res += awardCard('HART TROPHY — MVP', 'Most Valuable Player', 'Hart', GOLD);
    res += awardCard('CONN SMYTHE — PLAYOFF MVP', 'Most Valuable Player in the Playoffs', 'Conn Smythe', GOLD);
    res += awardCard('ART ROSS — POINTS', 'League Scoring Champion', 'Art Ross', GOLD);
    res += awardCard('ROCKET RICHARD — GOALS', 'League Goal-Scoring Leader', 'Rocket Richard', GOLD);

    // Positional awards
    res += `<div style="color:#888;font-size:6px;text-transform:uppercase;letter-spacing:.16em;margin:10px 0 6px;">POSITIONAL AWARDS</div>`;
    res += awardCard('NORRIS TROPHY — BEST DEFENCEMAN', 'Top Offensive + Defensive Blueliner', 'Norris', CYAN);
    res += awardCard('VEZINA TROPHY — BEST GOALIE', 'Top Save Percentage + Wins', 'Vezina', CYAN);
    res += awardCard('SELKE TROPHY — DEFENSIVE FORWARD', 'Best Two-Way Forward', 'Selke', CYAN);
    res += awardCard('CALDER TROPHY — BEST ROOKIE', 'Outstanding First-Year Player', 'Calder', CYAN);

    // Character awards
    res += `<div style="color:#888;font-size:6px;text-transform:uppercase;letter-spacing:.16em;margin:10px 0 6px;">CHARACTER AWARDS</div>`;
    res += awardCard('LADY BYNG — GENTLEMANLY PLAY', 'High Production, Low Penalty Minutes', 'Lady Byng', ORNG);
    res += awardCard('TED LINDSAY — OUTSTANDING PLAYER', 'Player-Voted Outstanding Player', 'Ted Lindsay', ORNG);
    res += awardCard('BILL MASTERTON — DEDICATION', 'Perseverance & Dedication to Hockey', 'Bill Masterton', ORNG);
    res += awardCard('ALKA-SELTZER AWARD — PLUS/MINUS', 'Best Plus/Minus in the League', 'Alka-Seltzer (+/-)', ORNG);
    res += awardCard('JENNINGS TROPHY — FEWEST GA', 'Team Allowing Fewest Goals Against', 'Jennings', ORNG);
    res += awardCard('THE ESPO — CLUTCH PERFORMER', 'Most Game-Winning Goals (Phil Esposito)', 'The Espo', ORNG);
    
    if(awardConfig.retirements) { 
        let ind = []; 
        Object.values(playerStats).forEach(p => { 
            let roll = Math.random(); 
            const carG = (p.career.g || 0) + (p.season.g || 0);
            const carA = (p.career.a || 0) + (p.season.a || 0);
            const carPts = carG + carA;
            const carGP = (p.career.gp || 0) + (p.season.gp || 0);
            const carW = (p.career.w || 0) + (p.season.w || 0);
            const isGoalie = p.pos === 'G';
            const meetsCareerBar = isGoalie ? (carGP >= 250 || carW >= 100) : (carPts >= 150 || carGP >= 350);
            const eliteOvr = isGoalie ? (parseInt(p.attr.gDef) || 70) : ((p.attr.off+p.attr.def)/2);
            if(meetsCareerBar && ((p.age > 36 && roll < 0.25) || (p.age >= 33 && eliteOvr >= 90 && roll < 0.05))) {
                ind.push(p.name);
                const cp = p.careerPlayoff || {};
                const pl = p.playoff || {};
                const hofCarGP = (p.career.gp||0)+(p.season.gp||0), hofCarW = (p.career.w||0)+(p.season.w||0), hofCarSO = (p.career.so||0)+(p.season.so||0);
                if (isGoalie) {
                    const hofCarL = (p.career.l||0)+(p.season.l||0), hofCarT = (p.career.t||0)+(p.season.t||0);
                    const hofCarSV = (p.career.sv||0)+(p.season.sv||0), hofCarSA = (p.career.sa||0)+(p.season.sa||0);
                    const hofPlGP = (cp.gp||0)+(pl.gp||0), hofPlW = (cp.w||0)+(pl.w||0), hofPlL = (cp.l||0)+(pl.l||0), hofPlSO = (cp.so||0)+(pl.so||0), hofPlSV = (cp.sv||0)+(pl.sv||0), hofPlSA = (cp.sa||0)+(pl.sa||0);
                    hallOfFame.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: hofCarGP, w: hofCarW, so: hofCarSO, mvp: p.asgMvp });
                    retiredPlayers.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, age: p.age, asgApp: p.asgAppearances || 0, gp: hofCarGP, w: hofCarW, l: hofCarL, t: hofCarT, so: hofCarSO, sv: hofCarSV, sa: hofCarSA, plGP: hofPlGP, plW: hofPlW, plL: hofPlL, plSO: hofPlSO, plSV: hofPlSV, plSA: hofPlSA });
                } else {
                    const hofCarG = (p.career.g||0)+(p.season.g||0), hofCarA = (p.career.a||0)+(p.season.a||0);
                    const hofPPG = (p.career.ppg||0)+(p.season.ppg||0), hofPM = (p.career.pm||0)+(p.season.pm||0), hofGWG = (p.career.gwg||0)+(p.season.gwg||0);
                    const hofPlGP = (cp.gp||0)+(pl.gp||0), hofPlG = (cp.g||0)+(pl.g||0), hofPlA = (cp.a||0)+(pl.a||0);
                    hallOfFame.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: hofCarGP, g: hofCarG, a: hofCarA, pts: hofCarG+hofCarA, w: hofCarW, so: hofCarSO, mvp: p.asgMvp });
                    retiredPlayers.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, age: p.age, asgApp: p.asgAppearances || 0, gp: hofCarGP, g: hofCarG, a: hofCarA, pts: hofCarG+hofCarA, ppg: hofPPG, pm: hofPM, gwg: hofGWG, plGP: hofPlGP, plG: hofPlG, plA: hofPlA, plPTS: hofPlG+hofPlA });
                }
                const tkObj = league.find(t=>t.name===p.team); const tk = tkObj ? tkObj.nrm : null; 
                if(tk && rosters[tk]) rosters[tk] = rosters[tk].filter(r => r.name !== p.name);
                delete playerStats[p.name];
                tradeLog.unshift({ day: 'POST', details: `RETIRED: Legend ${p.name} inducted.` });
            } 
        }); 
        res += "<h3 style='margin-top:15px; color:var(--silver-light);'>HALL OF FAME:</h3><p style='font-size:7px; color:#888;'>" + (ind.join(', ') || 'None') + "</p>";
        pruneCustomDuos();
    }
    
    if(awardConfig.draft) { 
        let sorting = [...league].sort((a,b) => a.season.pts - b.season.pts);
        sorting.forEach(t => { 
            let rN;
            do { rN = "ROOKIE-" + Math.floor(Math.random()*90000+10000); } while (playerStats[rN]);
            if (!rosters[t.nrm]) rosters[t.nrm] = [];
            // Real position so center/goalie roster-viability checks see this player correctly
            const rPos = ['C', 'LW', 'RW'][Math.floor(Math.random() * 3)];
            playerStats[rN] = {
                name: rN, team: t.name, teamCode: t.code, pos: rPos, age: 18, streakType: 'stable', streakDur: 0, hasScored: false, consPointless: 0, recentPts: [], milestones: [], asgMvp: false,
                morale: 100, suspended: { days: 0, reason: "" }, weight: 190 + Math.floor(Math.random()*30),
                injury: { severity: 0, daysRemaining: 0 }, attr: { off: 65 + Math.floor(Math.random()*15), def: 60 + Math.floor(Math.random()*15), gDef: 60 },
                career: {gp:0, g:0, a:0, pts:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, w:0, l:0, t:0, so:0, sv:0, sa:0},
                careerPlayoff: {gp:0, g:0, a:0, pts:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, w:0, l:0, so:0, sv:0, sa:0},
                season: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, w:0, l:0, t:0, so:0, sv:0, sa:0, consStarts:0},
                playoff: {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, w:0, l:0, so:0, sv:0, sa:0, consStarts:0}
            };
            rosters[t.nrm].push({name: rN, pos: rPos});
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
    document.querySelectorAll('#officeControls button, #btnSimGame').forEach(b => { const act = b.getAttribute('onclick') || ''; if(act === 'simDay()' || act === 'simNextGame()' || act === 'advanceCalendar()') b.style.display = 'none'; });    
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
    const getOptions = (tk) => rosters[tk] ? '<option value="">-- SELECT --</option>' + rosters[tk].map(p => `<option value="${p.name}">${p.name} (${p.pos}) TV:${getTradeValue(p.name)}</option>`).join('') : '<option value="">-- EMPTY --</option>';
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

    // Roster viability guard — simulate post-trade rosters and reject if critically short
    const postT1 = rosters[t1c].map(p=>p.name).filter(n=>!s1.includes(n)).concat(s2);
    const postT2 = rosters[t2c].map(p=>p.name).filter(n=>!s2.includes(n)).concat(s1);
    const hasGoalie = (names) => names.some(n => playerStats[n]?.pos === 'G');
    const hasCenter = (names) => names.some(n => playerStats[n]?.pos === 'C');
    if (!hasGoalie(postT1)) return alert(`TRADE BLOCKED: ${t1o?.code} would have no goalie.`);
    if (!hasGoalie(postT2)) return alert(`TRADE BLOCKED: ${t2o?.code} would have no goalie.`);
    if (!hasCenter(postT1)) return alert(`TRADE BLOCKED: ${t1o?.code} would have no centre.`);
    if (!hasCenter(postT2)) return alert(`TRADE BLOCKED: ${t2o?.code} would have no centre.`);

    const tv1 = s1.reduce((sum, n) => sum + getTradeValue(n), 0);
    const tv2 = s2.reduce((sum, n) => sum + getTradeValue(n), 0);
    if (s1.length && s2.length && Math.abs(tv1 - tv2) > 20) {
        const winner = tv1 > tv2 ? t2o?.code : t1o?.code;
        if (!confirm(`UNBALANCED TRADE WARNING\n${t1o?.code} value: ${tv1}  vs  ${t2o?.code} value: ${tv2}\n${winner?.toUpperCase()} wins this deal.\nExecute anyway?`)) return;
    }

    const resetGoalieTracking = (name) => {
        const ps = playerStats[name];
        if (ps && ps.pos === 'G') {
            ps.lastStart = -1; ps.goalieDays = 0;
            if (ps.season) ps.season.consStarts = 0;
            if (ps.playoff) ps.playoff.consStarts = 0;
        }
    };
    s1.forEach(n => { const i = rosters[t1c].findIndex(p => p.name === n); if(i !== -1) { rosters[t2c].push(rosters[t1c].splice(i, 1)[0]); if(playerStats[n] && t2o) { playerStats[n].team = t2o.name; playerStats[n].teamCode = t2o.code; resetGoalieTracking(n); } } });
    s2.forEach(n => { const i = rosters[t2c].findIndex(p => p.name === n); if(i !== -1) { rosters[t1c].push(rosters[t2c].splice(i, 1)[0]); if(playerStats[n] && t1o) { playerStats[n].team = t1o.name; playerStats[n].teamCode = t1o.code; resetGoalieTracking(n); } } });
    
    if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null}; if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
    
    tradeLog.unshift({ day: currentDay, details: `TRADE: ${t1o.code} <-> ${t2o.code}` });
    assignTeamCaptains(); // refresh captains — traded captain must not keep modifying old team
    pruneCustomDuos();
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
                        <div style="color:#fff; margin-top:5px;">${t.p1} (OVR: ${getPlayerWeightedStats(t.p1).baseOvr}, AGE: ${playerStats[t.p1].age})</div>
                    </div>
                    <div style="color:var(--neon-cyan); margin-top:10px;">< SWAP ></div>
                    <div style="text-align:right; width:45%;">
                        <div style="color:#aaa;">${t.t2Name.toUpperCase()} SENDS:</div>
                        <div style="color:#fff; margin-top:5px;">${t.p2} (OVR: ${getPlayerWeightedStats(t.p2).baseOvr}, AGE: ${playerStats[t.p2].age})</div>
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

    if (i1 !== -1 && i2 !== -1 && !tradeKeepsRostersViable(t.t1, rosters[t.t1][i1], t.t2, rosters[t.t2][i2])) {
        alert('This trade would leave a team without a goalie or center and cannot be approved. Reject it instead.');
        return;
    }

    if (i1 !== -1 && i2 !== -1) {
        rosters[t.t2].push(rosters[t.t1].splice(i1, 1)[0]); rosters[t.t1].push(rosters[t.t2].splice(i2, 1)[0]);
        const t2lg = league.find(l=>l.nrm===t.t2); const t1lg = league.find(l=>l.nrm===t.t1);
        if (playerStats[t.p1]) { playerStats[t.p1].team = t.t2Name; if (t2lg) playerStats[t.p1].teamCode = t2lg.code; if (playerStats[t.p1].pos === 'G') { playerStats[t.p1].lastStart = -1; playerStats[t.p1].goalieDays = 0; if (playerStats[t.p1].season) playerStats[t.p1].season.consStarts = 0; if (playerStats[t.p1].playoff) playerStats[t.p1].playoff.consStarts = 0; } }
        if (playerStats[t.p2]) { playerStats[t.p2].team = t.t1Name; if (t1lg) playerStats[t.p2].teamCode = t1lg.code; if (playerStats[t.p2].pos === 'G') { playerStats[t.p2].lastStart = -1; playerStats[t.p2].goalieDays = 0; if (playerStats[t.p2].season) playerStats[t.p2].season.consStarts = 0; if (playerStats[t.p2].playoff) playerStats[t.p2].playoff.consStarts = 0; } }
        
        let t1o = league.find(l=>l.nrm===t.t1); if(t1o) t1o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        let t2o = league.find(l=>l.nrm===t.t2); if(t2o) t2o.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
        assignTeamCaptains();
        clearWpCache();
        pruneCustomDuos();
        tradeLog.unshift({ day: currentDay, details: ` BLOCKBUSTER: ${t.p1} traded to ${t.t2Name} for ${t.p2}!` });
    }
    pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); refreshTradeBadge(); saveGame();
}

function rejectProposal(id) { pendingTrades = pendingTrades.filter(x => x.id !== id); openProposalsModal(); updateUI(); refreshTradeBadge(); saveGame(); }

function renderTradeLog() {
    let el = document.getElementById('tradeLogTable'); if (!el) return;
    let h = `<tr><th>DAY</th><th>DETAILS</th></tr>`;
    tradeLog.slice(0, 200).forEach(l => { h += `<tr><td>${l.day}</td><td>${l.details}</td></tr>`; });
    el.innerHTML = h;
}

function renderLeagueHistory() {
    let el = document.getElementById('historyTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PRESIDENTS' TROPHY</th><th>STANLEY CUP CHAMPION</th></tr>`;
    if (leagueHistory.length) h += `<tr><td colspan="3" style="color:#444;font-size:5px;text-align:center;padding:2px;letter-spacing:.06em;">CLICK ANY ROW — FULL STANDINGS SNAPSHOT</td></tr>`;
    leagueHistory.forEach(s => { h += `<tr style="cursor:pointer;" title="Click to view full ${s.year} standings" onclick="showHistoricalStandings(${s.year})"><td class="archive-hl">${s.year}</td><td>${s.presidents}</td><td style="color:var(--ea-yellow);">${s.cup}</td></tr>`; });
    el.innerHTML = h;
}

function renderHallOfFame() { 
    let el = document.getElementById('hofTable'); if (!el) return;
    let h = `<tr><th>YR</th><th>PLAYER</th><th>POS</th><th>TEAM</th><th>GP</th><th>G/W</th><th>A/SO</th><th>PTS</th><th>[AWD]</th></tr>`; 
    hallOfFame.forEach(p => { h += `<tr><td>${p.year}</td><td class="hof-hl">${p.name}</td><td>${p.pos}</td><td>${p.team}</td><td>${p.gp}</td><td>${p.pos==='G' ? p.w : p.g}</td><td>${p.pos==='G' ? p.so : p.a}</td><td>${p.pos==='G' ? '-' : p.pts}</td><td>${p.mvp?'[MVP]':''}</td></tr>`; }); 
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

function openScoutingReport(day, gIdx) {
    const g = (calendar[day] || [])[gIdx];
    if (!g) return;
    const hNrm = g.h?.nrm, aNrm = g.a?.nrm;
    const hCode = g.h?.code || g.h?.name || 'HOME';
    const aCode = g.a?.code || g.a?.name || 'AWAY';

    // Goalie intel
    const goalieCard = (tkNrm, tkCode) => {
        const gp = getProjectedGoalie(tkNrm);
        if (!gp) return `<div style="color:#333;font-size:6px;">No goalie data.</div>`;
        const ps = playerStats[gp.name];
        const svp = ps?.season?.sa > 0 ? ((ps.season.sv / ps.season.sa) * 100).toFixed(1) : '--';
        const streak = ps ? (ps.macro_streak || ps.micro_streak || 'STABLE') : 'STABLE';
        const streakColor = streak === 'HOT' ? '#FF6600' : streak === 'COLD' ? '#55FFFF' : '#555';
        const b2b = playedYesterday(tkNrm) ? '<span style="color:#FFAA44;font-size:5px;"> [B2B]</span>' : '';
        return `<div style="font-size:6px;">
            <span style="color:#ccc;">${gp.name}</span>${b2b}
            <span style="color:var(--neon-cyan);margin-left:8px;">SV% ${svp}</span>
            <span style="color:${streakColor};margin-left:8px;">${streak}</span>
            <span style="color:#555;margin-left:8px;">${ps?.season?.w||0}W-${ps?.season?.l||0}L</span>
        </div>`;
    };

    // Team captain
    const captainCard = (tkNrm) => {
        const capName = teamCaptains[tkNrm];
        if (!capName) return '';
        const score = Math.round(getLeadershipScore(capName));
        const capPs = playerStats[capName];
        const capInjured = capPs?.injury?.daysRemaining > 0;
        const borderStyle = capInjured ? 'border:1px dashed #FF4444;padding:4px 6px;border-radius:3px;' : '';
        const injTag = capInjured ? ` <span style="color:#FF4444;font-size:5px;">CAPTAIN OUT (${capPs.injury.daysRemaining}d)</span>` : '';
        return `<div style="font-size:5px;color:#555;margin-top:8px;margin-bottom:3px;">CAPTAIN</div>
            <div style="font-size:6px;color:${capInjured?'#884444':'#FFD700'};${borderStyle}">[C] ${capName}${injTag} <span style="color:#888;font-size:5px;">LEADERSHIP ${score}</span></div>`;
    };

    // Top line chemistry
    const lineCard = (tkNrm) => {
        if (!rosters || !rosters[tkNrm]) return '';
        const fwds = (rosters[tkNrm] || []).filter(p => p.pos !== 'G' && p.pos !== 'D').slice(0, 3);
        if (fwds.length === 0) return '';
        const chemBonus = fwds.filter((p, _, arr) => getAllDuos().some(d => d.includes(p.name) && arr.some(q => q.name !== p.name && d.includes(q.name)))).length;
        const line = fwds.map(p => {
            const ps = playerStats[p.name];
            const pts = ps ? (ps.season.g||0) + (ps.season.a||0) : 0;
            return `<span style="color:#ccc;">${p.name}${isTeamCaptain(p.name) ? ' [C]' : ''} <span style="color:var(--neon-cyan);font-size:5px;">${pts}pts</span></span>`;
        }).join(' · ');
        const chemTag = chemBonus > 0 ? `<span style="color:#FF69B4;font-size:5px;margin-left:6px;">+${chemBonus*2} CHEM</span>` : '';
        return `<div style="font-size:6px;margin-top:4px;">${line}${chemTag}</div>`;
    };

    // Active injuries
    const injuryLine = (tkNrm) => {
        if (!rosters?.[tkNrm]) return '';
        const inj = (rosters[tkNrm] || []).filter(p => playerStats[p.name]?.injury?.daysRemaining > 0)
            .map(p => `<span style="color:#FF4444;">${p.name} (${playerStats[p.name].injury.daysRemaining}d)</span>`).join(', ');
        return inj ? `<div style="font-size:5px;margin-top:4px;color:#555;">IR: ${inj}</div>` : '';
    };

    // Hot/cold players
    const hotColdLine = (tkNrm) => {
        if (!rosters?.[tkNrm]) return '';
        const hot = [], cold = [];
        (rosters[tkNrm] || []).forEach(p => {
            const ps = playerStats[p.name]; if (!ps) return;
            const s = ps.macro_streak || ps.micro_streak || ps.streakType;
            if (s === 'HOT' || s === 'hot') hot.push(p.name);
            else if (s === 'COLD' || s === 'cold') cold.push(p.name);
        });
        if (!hot.length && !cold.length) return '';
        let out = '<div style="margin-top:6px;">';
        if (hot.length) out += `<div style="font-size:5px;color:#FF6600;">🔥 HOT: ${hot.join(', ')}</div>`;
        if (cold.length) out += `<div style="font-size:5px;color:#55FFFF;">❄ COLD: ${cold.join(', ')}</div>`;
        return out + '</div>';
    };

    let html = `<div style="text-align:center;font-size:10px;color:#fff;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #222;">
        ${aCode} <span style="color:#444;font-size:8px;">@</span> ${hCode}
    </div>`;

    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;

    // Away team
    html += `<div style="background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:10px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:8px;">${aCode} — AWAY</div>
        <div style="font-size:5px;color:#555;margin-bottom:3px;">STARTING GOALIE</div>
        ${goalieCard(aNrm, aCode)}
        ${captainCard(aNrm)}
        <div style="font-size:5px;color:#555;margin-top:8px;margin-bottom:3px;">TOP LINE</div>
        ${lineCard(aNrm)}
        ${hotColdLine(aNrm)}
        ${injuryLine(aNrm)}
    </div>`;

    // Home team
    html += `<div style="background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:10px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:8px;">${hCode} — HOME</div>
        <div style="font-size:5px;color:#555;margin-bottom:3px;">STARTING GOALIE</div>
        ${goalieCard(hNrm, hCode)}
        ${captainCard(hNrm)}
        <div style="font-size:5px;color:#555;margin-top:8px;margin-bottom:3px;">TOP LINE</div>
        ${lineCard(hNrm)}
        ${hotColdLine(hNrm)}
        ${injuryLine(hNrm)}
    </div>`;

    html += `</div>`;

    // Comeback arc banner — user team on 3+ losing streak
    if (selectedTeam) {
        const userTeamObj = league.find(t => t.nrm === selectedTeam);
        if (userTeamObj && userTeamObj.loseStreak >= 3) {
            html += `<div style="margin-top:10px;background:#0a0014;border:2px solid #AA44FF;padding:8px 12px;text-align:center;">
                <div style="color:#AA44FF;font-size:8px;letter-spacing:.1em;">🔥 BACKS AGAINST THE WALL</div>
                <div style="color:#7733BB;font-size:6px;margin-top:3px;">${userTeamObj.loseStreak}-GAME SKID — resolve boost active this game</div>
            </div>`;
        }
    }

    // Coaching adjustments preview
    const fLabel = ['DEFENSIVE','NEUTRAL','AGGRESSIVE'][coachAdj.forecheck + 1];
    const ppLabel = ['CYCLE','BALANCED','SHOOT'][coachAdj.pp + 1];
    const fColor = coachAdj.forecheck === 1 ? '#FF6600' : coachAdj.forecheck === -1 ? '#55FFFF' : '#555';
    const ppColor = coachAdj.pp === 1 ? '#FF6600' : coachAdj.pp === -1 ? '#55FFFF' : '#555';
    html += `<div style="margin-top:12px;background:#080808;border:1px solid #1a1a1a;border-left:3px solid #FFA500;border-radius:6px;padding:10px;">
        <div style="font-size:6px;color:#FFA500;letter-spacing:.12em;margin-bottom:8px;">YOUR COACHING ADJUSTMENTS</div>
        <div style="display:flex;gap:16px;font-size:6px;">
            <span>FORECHECK: <span style="color:${fColor};">${fLabel}</span></span>
            <span>PP STYLE: <span style="color:${ppColor};">${ppLabel}</span></span>
            <span>LINE MATCH: <span style="color:${coachAdj.lineMatch?'#FFA500':'#555'};">${coachAdj.lineMatch?'ON':'OFF'}</span></span>
        </div>
        <button onclick="openCoachingPanel()" style="margin-top:8px;font-size:5px;padding:3px 10px;border-color:#FFA500;color:#FFA500;">ADJUST ▶</button>
    </div>`;

    document.getElementById('scoutingContent').innerHTML = html;
    document.getElementById('scoutingOverlay').style.display = 'flex';
}

function openCoachingPanel() {
    const fLabels = ['DEFENSIVE', 'NEUTRAL', 'AGGRESSIVE'];
    const ppLabels = ['CYCLE', 'BALANCED', 'SHOOT'];
    const fIdx = coachAdj.forecheck + 1; // -1→0, 0→1, 1→2
    const ppIdx = coachAdj.pp + 1;

    const btnRow = (key, labels, current, setter) => labels.map((lbl, i) => {
        const active = i === current;
        return `<button onclick="${setter}(${i-1})" style="flex:1;font-size:5px;padding:6px 4px;
            border-color:${active?'#FFA500':'#333'};color:${active?'#FFA500':'#555'};
            background:${active?'#0d0800':'#000'};">${lbl}</button>`;
    }).join('');

    const html = `
    <div style="margin-bottom:14px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:6px;">FORECHECK STYLE</div>
        <div style="font-size:5px;color:#444;margin-bottom:4px;">Aggressive opens the game (more shots both ways). Defensive tightens it.</div>
        <div style="display:flex;gap:6px;">${btnRow('forecheck', fLabels, fIdx, '_setForecheck')}</div>
    </div>
    <div style="margin-bottom:14px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:6px;">POWER PLAY STYLE</div>
        <div style="font-size:5px;color:#444;margin-bottom:4px;">Shoot boosts PP shot volume. Cycle boosts PP shot quality.</div>
        <div style="display:flex;gap:6px;">${btnRow('pp', ppLabels, ppIdx, '_setPP')}</div>
    </div>
    <div style="margin-bottom:14px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:6px;">LINE MATCHING</div>
        <div style="font-size:5px;color:#444;margin-bottom:4px;">Home team deploys top line vs opponent's best — slight OVR edge.</div>
        <div style="display:flex;gap:6px;">
            <button onclick="_setLineMatch(false)" style="flex:1;font-size:5px;padding:6px 4px;
                border-color:${!coachAdj.lineMatch?'#FFA500':'#333'};color:${!coachAdj.lineMatch?'#FFA500':'#555'};
                background:${!coachAdj.lineMatch?'#0d0800':'#000'};">OFF</button>
            <button onclick="_setLineMatch(true)" style="flex:1;font-size:5px;padding:6px 4px;
                border-color:${coachAdj.lineMatch?'#FFA500':'#333'};color:${coachAdj.lineMatch?'#FFA500':'#555'};
                background:${coachAdj.lineMatch?'#0d0800':'#000'};">ON</button>
        </div>
    </div>
    <div style="font-size:5px;color:#333;margin-top:8px;text-align:center;">Settings persist across games. Reset to NEUTRAL/OFF for balanced sim.</div>
    <div style="margin-top:14px;border-top:1px solid #1a1a1a;padding-top:10px;">
        <div style="font-size:6px;color:#888;letter-spacing:.12em;margin-bottom:6px;">COACH CONFIDENCE</div>
        <div style="background:#111;border-radius:3px;height:6px;overflow:hidden;margin-bottom:5px;">
            <div style="height:100%;width:${coachTrust}%;background:${coachTrust >= 70 ? '#00FF88' : coachTrust >= 40 ? '#FFA500' : '#FF4444'};transition:width .3s;border-radius:3px;"></div>
        </div>
        <div style="font-size:6px;color:${coachTrust >= 70 ? '#00FF88' : coachTrust >= 40 ? '#FFA500' : '#FF4444'};">${coachTrust >= 70 ? 'TRUSTED — players responding well' : coachTrust >= 40 ? 'NEUTRAL — steady but unproven' : 'QUESTIONED — locker room tension'}</div>
    </div>`;

    document.getElementById('coachingContent').innerHTML = html;
    document.getElementById('coachingOverlay').style.display = 'flex';
}

window._setForecheck = v => { coachAdj.forecheck = v; saveGame(); openCoachingPanel(); };
window._setPP = v => { coachAdj.pp = v; saveGame(); openCoachingPanel(); };
window._setLineMatch = v => { coachAdj.lineMatch = v; saveGame(); openCoachingPanel(); };

function showGMReportCard() {
    const totalGames = league[0]?.season?.gp || 0;
    if (totalGames < 10) return;

    const sorted = [...league].sort((a, b) => b.season.pts - a.season.pts);
    const topTeam = sorted[0];
    const avgPts = league.reduce((s, t) => s + t.season.pts, 0) / league.length;

    const grade = score => score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
    const color = g => g.startsWith('A') ? 'var(--gold-leaf)' : g === 'B' ? 'var(--neon-cyan)' : g === 'C' ? '#FFA500' : 'var(--line-red)';

    // Preseason projection: rank teams by preseason OVR snapshot, compare to actual pts rank
    const hasSnapshot = Object.keys(preseasonOvrSnapshot).length > 0;
    let projectionScore = 65; // neutral fallback
    let projectionNote = 'No preseason baseline (start a new season to track)';
    if (hasSnapshot) {
        const preRanked = [...league].sort((a, b) => (preseasonOvrSnapshot[b.nrm] || 75) - (preseasonOvrSnapshot[a.nrm] || 75));
        const actualRanked = sorted;
        // Score based on how well the projected top-6 ended up in the actual top-6
        const top6pre = new Set(preRanked.slice(0, 6).map(t => t.nrm));
        const top6act = actualRanked.slice(0, 6).map(t => t.nrm);
        const hits = top6act.filter(nrm => top6pre.has(nrm)).length;
        projectionScore = Math.round((hits / 6) * 100);
        const preLeader = preRanked[0]; const actLeader = actualRanked[0];
        projectionNote = `Pre-season favourite: ${preLeader?.code} (OVR ${preseasonOvrSnapshot[preLeader?.nrm]}). Actual leader: ${actLeader?.code} (${actLeader?.season.pts}pts). ${hits}/6 projected teams in top 6.`;
    }

    // Injury management
    const totalInjDays = Object.values(playerStats).reduce((s, p) => s + (p.injuryHistory || []).reduce((a, h) => a + (h.daysMissed || 0), 0), 0);
    const injScore = Math.max(0, 100 - totalInjDays * 0.5);

    // Chemistry usage
    const chemTeams = league.filter(t => {
        const fwds = (rosters[t.nrm] || []).filter(p => p.pos !== 'G' && p.pos !== 'D');
        return getAllDuos().some(d => fwds.filter(p => d.includes(p.name)).length >= 2);
    }).length;
    const chemScore = Math.round((chemTeams / Math.max(1, league.length)) * 100) + Math.min(20, customDuos.length * 5);

    const dims = [
        { label: 'PRESEASON PROJECTION ACCURACY', score: projectionScore, note: projectionNote },
        { label: 'INJURY MANAGEMENT', score: Math.round(injScore), note: `${totalInjDays} total injury days across the league` },
        { label: 'CHEMISTRY DEPLOYMENT', score: Math.min(100, chemScore), note: `${chemTeams}/${league.length} teams with active line duos` },
        { label: 'FEATURE ENGAGEMENT', score: Math.min(100, Object.values(awardConfig).filter(Boolean).length * 8), note: `${Object.values(awardConfig).filter(Boolean).length} features active` },
    ];

    const overall = Math.round(dims.reduce((s, d) => s + Math.min(100, d.score), 0) / dims.length);
    const overallGrade = grade(overall);

    let html = `<div style="text-align:center;padding:10px 0 16px;">
        <div style="font-size:8px;color:#888;letter-spacing:.16em;">SEASON ${currentSeason} GM REPORT CARD</div>
        <div style="font-size:32px;color:${color(overallGrade)};margin:10px 0;text-shadow:2px 2px 0 #000;">${overallGrade}</div>
        <div style="font-size:6px;color:#555;">Overall Score: ${overall}/100</div>
    </div>`;

    dims.forEach(d => {
        const g = grade(Math.min(100, d.score));
        html += `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #111;">
            <div style="font-size:22px;color:${color(g)};min-width:32px;text-align:center;">${g}</div>
            <div style="flex:1;">
                <div style="font-size:6px;color:#888;letter-spacing:.1em;">${d.label}</div>
                <div style="font-size:5px;color:#444;margin-top:2px;">${d.note}</div>
            </div>
            <div style="font-size:7px;color:#333;">${Math.min(100,d.score)}/100</div>
        </div>`;
    });

    html += `<button onclick="document.getElementById('gmReportCardOverlay').style.display='none'" style="width:100%;margin-top:14px;border-color:var(--line-red);color:var(--line-red);">CLOSE</button>`;

    document.getElementById('gmReportCardContent').innerHTML = html;
    document.getElementById('gmReportCardOverlay').style.display = 'flex';
}

// Awards voting — shown before final ceremony; voting is theatrical (doesn't affect outcome)
function openAwardsVoting() {
    const maxGP = Math.max(1, ...league.map(t => t.season.gp));
    const minSkaterGP = Math.max(1, Math.floor(maxGP * 0.40));
    const minGoalieGP = Math.max(1, Math.floor(maxGP * 0.30));
    const allPlayers = Object.values(playerStats);
    const skaters = allPlayers.filter(p => p.pos !== 'G' && p.season.gp >= minSkaterGP);
    const goalies = allPlayers.filter(p => p.pos === 'G' && p.season.gp >= minGoalieGP);

    // Build nominee lists (top 3 per award, read-only — actual winners computed in runEndOfSeasonAwards)
    const hartPlayoffQual = new Set([
        ...league.filter(t=>t.conf==='Eastern').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8).map(t=>t.name),
        ...league.filter(t=>t.conf==='Western').sort((a,b)=>b.season.pts-a.season.pts).slice(0,8).map(t=>t.name)
    ]);
    const hartCands = [...skaters].filter(p => hartPlayoffQual.has(p.team))
        .map(p => ({ name: p.name, stat: `${p.season.g}G  ${p.season.a}A  ${p.season.g+p.season.a}PTS`, score: p.season.g+p.season.a }))
        .concat(goalies.filter(p => hartPlayoffQual.has(p.team)).map(p => ({ name: p.name, stat: `${p.season.w||0}W  ${p.season.so||0}SO`, score: (p.season.w||0)*2.2+(p.season.so||0)*3 })))
        .sort((a,b) => b.score - a.score).slice(0, 3);
    const vezinaCands = [...goalies]
        .map(p => {
            const svp = p.season.sa > 0 ? p.season.sv / p.season.sa : 0;
            const gaa = p.season.gp > 0 ? (p.season.sa - p.season.sv) / p.season.gp : 99;
            const score = (svp > 0.880 ? (svp - 0.880) * 2000 : 0) + (gaa < 4.0 ? (4.0 - gaa) * 8 : 0) + (p.season.w||0) * 0.4;
            const svpStr = p.season.sa > 0 ? (svp).toFixed(3) : '--.---';
            const gaaStr = p.season.gp > 0 ? gaa.toFixed(2) : '--';
            return { name: p.name, stat: `${p.season.w||0}W  SV% ${svpStr}  GAA ${gaaStr}`, score };
        })
        .sort((a,b) => b.score - a.score).slice(0, 3);
    const norrisCands = [...skaters].filter(p => p.pos === 'D' && hartPlayoffQual.has(p.team))
        .map(p => ({ name: p.name, stat: `${p.season.g}G  ${p.season.a}A  ${p.season.pm>=0?'+':''}${p.season.pm||0}`, score: (p.season.g+p.season.a)+(p.season.pm||0) }))
        .sort((a,b) => b.score - a.score).slice(0, 3);
    const calderCands = [...allPlayers].filter(p => (p.career.gp||0) <= 31 && p.season.gp >= (p.pos==='G'?minGoalieGP:minSkaterGP))
        .map(p => ({ name: p.name, stat: p.pos==='G'?`${p.season.w||0}W  ${p.season.so||0}SO`:`${p.season.g}G  ${p.season.a}A`, score: p.pos==='G'?(p.season.w||0)*1.5+(p.season.so||0)*3:(p.season.g+p.season.a) }))
        .sort((a,b) => b.score - a.score).slice(0, 3);

    const votingState = { Hart: null, Vezina: null, Norris: null, Calder: null };

    const renderVoting = () => {
        const awards = [
            { key: 'Hart', label: 'HART TROPHY — MVP', color: 'var(--gold-leaf)', cands: hartCands },
            { key: 'Vezina', label: 'VEZINA TROPHY — BEST GOALIE', color: 'var(--neon-cyan)', cands: vezinaCands },
            { key: 'Norris', label: 'NORRIS TROPHY — BEST DEFENCEMAN', color: 'var(--neon-cyan)', cands: norrisCands },
            { key: 'Calder', label: 'CALDER TROPHY — BEST ROOKIE', color: 'var(--neon-cyan)', cands: calderCands },
        ];

        let html = `<div style="font-size:7px;color:#666;letter-spacing:.1em;margin-bottom:14px;text-align:center;">Cast your votes for each award, then reveal the winners.</div>`;

        awards.forEach(aw => {
            const voted = votingState[aw.key];
            html += `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid ${aw.color};border-radius:6px;padding:10px;margin-bottom:10px;">
                <div style="font-size:6px;color:${aw.color};letter-spacing:.12em;margin-bottom:8px;">${aw.label}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">`;
            aw.cands.forEach((c, i) => {
                const isVoted = voted === c.name;
                const rank = ['①','②','③'][i];
                html += `<button onclick="_castVote('${aw.key}','${c.name}')"
                    style="flex:1;min-width:120px;padding:8px 6px;font-size:5px;text-align:left;
                    border-color:${isVoted ? aw.color : '#333'};
                    color:${isVoted ? '#fff' : '#666'};
                    background:${isVoted ? '#0d0d20' : '#000'};
                    box-shadow:${isVoted ? `0 0 6px ${aw.color}44` : 'none'};">
                    <div style="color:${isVoted?aw.color:'#444'};margin-bottom:3px;">${rank} ${c.name}</div>
                    <div style="color:var(--neon-cyan);font-size:5px;">${c.stat}</div>
                </button>`;
            });
            html += `</div>${voted ? `<div style="font-size:5px;color:#555;margin-top:5px;">YOUR VOTE: <span style="color:${aw.color};">${voted}</span></div>` : ''}</div>`;
        });

        const allVoted = Object.values(votingState).every(v => v !== null);
        html += `<button onclick="_revealAwardWinners()" style="width:100%;margin-top:10px;font-size:8px;
            border-color:var(--gold-leaf);color:var(--gold-leaf);padding:12px;
            ${allVoted ? '' : 'opacity:0.45;pointer-events:none;'}">
            ${allVoted ? '🏆 REVEAL ALL WINNERS' : 'VOTE FOR ALL 4 AWARDS TO REVEAL'}
        </button>`;

        document.getElementById('awardsVotingContent').innerHTML = html;
        window._votingState = votingState;
    };

    window._castVote = (key, name) => {
        window._votingState[key] = name;
        Object.assign(votingState, window._votingState);
        renderVoting();
    };

    window._revealAwardWinners = () => {
        document.getElementById('awardsVotingOverlay').style.display = 'none';
        runEndOfSeasonAwards();
        _awardsPending = false;
    };

    document.getElementById('votingSeasonLabel').textContent = currentSeason || '';
    renderVoting();
    document.getElementById('awardsVotingOverlay').style.display = 'flex';
}

function openChemEditor() {
    renderChemEditor();
    document.getElementById('chemEditorOverlay').style.display = 'flex';
}

function renderChemEditor() {
    const allNames = Object.keys(playerStats).sort();
    const pairTag = (pair, isCustom, idx) => {
        const rmBtn = isCustom
            ? `<button onclick="removeCustomDuo(${idx})" style="font-size:6px;border-color:#FF4444;color:#FF4444;padding:2px 6px;margin-left:8px;">✕</button>`
            : `<span style="font-size:6px;color:#444;margin-left:8px;">[BUILT-IN]</span>`;
        return `<div style="display:flex;align-items:center;padding:5px 0;border-bottom:1px solid #111;font-size:8px;">
            <span style="color:#FF69B4;min-width:16px;">${isCustom ? '★' : '·'}</span>
            <span style="color:#ccc;flex:1;">${pair.join(' · ')}</span>
            ${rmBtn}
        </div>`;
    };

    let h = `<div style="color:#888;font-size:6px;letter-spacing:.12em;margin-bottom:8px;">
        Each pair/group on the same line grants +2 OVR chemistry bonus per sim step.
        Built-in pairs are permanent. Custom pairs are saved to your game file.
    </div>`;

    // Add new pair form
    const opts = allNames.map(n => `<option value="${n}">${n}</option>`).join('');
    h += `<div style="background:#0d0d0d;border:1px solid #222;border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:7px;color:#888;letter-spacing:.12em;margin-bottom:10px;">ADD CUSTOM PAIR / GROUP</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:6px;color:#666;">PLAYER 1</label>
                <select id="chemP1" style="font-family:'Press Start 2P',cursive;font-size:6px;background:#000;color:#fff;border:1px solid #333;padding:4px 6px;">${opts}</select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:6px;color:#666;">PLAYER 2</label>
                <select id="chemP2" style="font-family:'Press Start 2P',cursive;font-size:6px;background:#000;color:#fff;border:1px solid #333;padding:4px 6px;">${opts}</select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:6px;color:#555;">PLAYER 3 (opt)</label>
                <select id="chemP3" style="font-family:'Press Start 2P',cursive;font-size:6px;background:#000;color:#555;border:1px solid #222;padding:4px 6px;">
                    <option value="">-- none --</option>${opts}
                </select>
            </div>
            <button onclick="addCustomDuo()" style="font-size:7px;border-color:#FF69B4;color:#FF69B4;padding:6px 12px;height:fit-content;">ADD PAIR</button>
        </div>
    </div>`;

    // Custom duos
    if (customDuos.length > 0) {
        h += `<div style="font-size:6px;color:#FF69B4;letter-spacing:.12em;margin-bottom:6px;">CUSTOM PAIRS (${customDuos.length})</div>`;
        h += customDuos.map((pair, i) => {
            const score = getChemScore(pair);
            const barColor = score >= 75 ? '#FF69B4' : score >= 50 ? '#FFA500' : '#FF4444';
            const chemLabel = score >= 75 ? `+2 CHEM` : score >= 50 ? `+1 CHEM` : `FADING`;
            const decayBar = `<div style="margin-top:4px;background:#1a1a1a;border-radius:2px;height:3px;overflow:hidden;">
                <div style="height:100%;width:${score}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
            </div>
            <div style="font-size:5px;color:${barColor};margin-top:2px;">${chemLabel} — Chemistry ${score}%</div>`;
            return pairTag(pair, true, i) + decayBar;
        }).join('');
        h += `<div style="margin-bottom:16px;"></div>`;
    }

    // Built-in duos
    h += `<div style="font-size:6px;color:#555;letter-spacing:.12em;margin-bottom:6px;">BUILT-IN PAIRS (${dynamicDuos.length})</div>`;
    h += dynamicDuos.map(pair => pairTag(pair, false, -1)).join('');

    document.getElementById('chemEditorContent').innerHTML = h;
}

function addCustomDuo() {
    const p1 = document.getElementById('chemP1')?.value;
    const p2 = document.getElementById('chemP2')?.value;
    const p3 = document.getElementById('chemP3')?.value;
    if (!p1 || !p2 || p1 === p2) return alert('Select two different players.');
    const pair = p3 && p3 !== p1 && p3 !== p2 ? [p1, p2, p3] : [p1, p2];
    const already = getAllDuos().some(d => pair.every(n => d.includes(n)));
    if (already) return alert('This pair already exists.');
    customDuos.push(pair);
    saveGame();
    renderChemEditor();
}

function removeCustomDuo(idx) {
    customDuos.splice(idx, 1);
    saveGame();
    renderChemEditor();
}

function openStatLeaders() {
    const k = 'season';
    const skaters = Object.values(playerStats).filter(p => p[k] && p[k].gp > 0 && p.pos !== 'G');
    const goalies  = Object.values(playerStats).filter(p => p[k] && p[k].gp > 0 && p.pos === 'G');
    const top = (arr, sortFn, n=10) => [...arr].sort(sortFn).slice(0, n);
    const row = (p, val, color='#fff') => `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')">
        <td style="color:#888;font-size:6px;padding:3px 6px;">${p.teamCode||''}</td>
        <td style="padding:3px 6px;">${p.name}</td>
        <td style="text-align:right;color:${color};font-weight:bold;padding:3px 10px;">${val}</td></tr>`;
    const tbl = (title, rows, color) => `<div style="margin-bottom:14px;">
        <div style="font-size:6px;color:#888;text-transform:uppercase;letter-spacing:.14em;border-bottom:1px solid #222;padding-bottom:4px;margin-bottom:6px;">${title}</div>
        <table style="width:100%;font-size:8px;border-collapse:collapse;">${rows}</table></div>`;

    const goalieSvp = p => p[k].sa > 0 ? ((p[k].sv||0)/p[k].sa) : 0;

    let h = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">`;
    h += `<div>`;
    h += tbl('Points', top(skaters, (a,b)=>(b[k].g+b[k].a)-(a[k].g+a[k].a)).map(p=>row(p,(p[k].g+p[k].a),'var(--ea-yellow)')).join(''), 'var(--ea-yellow)');
    h += tbl('Goals',  top(skaters, (a,b)=>b[k].g-a[k].g).map(p=>row(p,p[k].g,'#FF6666')).join(''));
    h += tbl('Assists',top(skaters, (a,b)=>b[k].a-a[k].a).map(p=>row(p,p[k].a,'var(--neon-cyan)')).join(''));
    h += `</div><div>`;
    h += tbl('+/-',   top(skaters, (a,b)=>b[k].pm-a[k].pm).map(p=>row(p,(p[k].pm>=0?'+':'')+p[k].pm,'#88FF88')).join(''));
    h += tbl('PIM',   top(skaters, (a,b)=>b[k].pim-a[k].pim).map(p=>row(p,p[k].pim,'#FF8800')).join(''));
    h += tbl('GWG',   top(skaters, (a,b)=>(b[k].gwg||0)-(a[k].gwg||0)).map(p=>row(p,p[k].gwg||0,'#FFD700')).join(''));
    h += tbl('SV%',   top(goalies,  (a,b)=>goalieSvp(b)-goalieSvp(a)).filter(p=>p[k].sa>=10).map(p=>row(p,goalieSvp(p).toFixed(3),'var(--neon-cyan)')).join(''));
    const soGoalies = [...goalies].filter(p=>(p[k].so||0)>0).sort((a,b)=>(b[k].so||0)-(a[k].so||0)).slice(0,25);
    if (soGoalies.length > 0) h += tbl('Shutouts', soGoalies.map(p=>row(p,p[k].so,'#FFD700')).join(''));
    h += `</div></div>`;

    h += renderMonthlyProgress();
    document.getElementById('statLeadersContent').innerHTML = h;
    document.getElementById('statLeadersOverlay').style.display = 'flex';
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

// =========================================================
// --- MISSING UI HELPER FUNCTIONS ---
// =========================================================
// Add this helper to your update logic

// !! NEW HELPER: Syncs individual rounds back to the master Playoff bucket

function populateTeamSelect() {
    const sel = document.getElementById('teamViewSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- CHOOSE TEAM --</option>';
    if (typeof league !== 'undefined') {
        league.forEach(t => {
            sel.innerHTML += `<option value="${t.nrm}">${t.name} (${getDynamicTeamOvr(t.nrm)} OVR)</option>`;
        });
    }
}

function toggleStats() {
    // Cycle through all the stat views
    if (statMode === 'season') statMode = 'playoff';
    else if (statMode === 'playoff') statMode = 'playoff_1';
    else if (statMode === 'playoff_1') statMode = 'playoff_2';
    else if (statMode === 'playoff_2') statMode = 'playoff_3';
    else if (statMode === 'playoff_3') statMode = 'playoff_4';
    else if (statMode === 'playoff_4') statMode = 'season';
    
    // Format the UI Label nicely
    let label = "VIEW: " + statMode.toUpperCase().replace('_', ' RND ');
    if (statMode === 'playoff') label = "VIEW: PLAYOFFS (ALL)";
    
    document.getElementById('btnStatMode').innerText = label;
    updateUI(); 
    renderTeamStats();
}

function toggleGameMenu() {
    document.getElementById('gameMenuList').classList.toggle('show');
}

function selectGame(idx) {
    const g = getGameAt(currentDay, idx);
    if (!g || !g.a || !g.h) {
        activeIdx = null;
        syncArenaScoreboardUI();
        return;
    }
    activeIdx = idx;
    syncArenaScoreboardUI();
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
    document.querySelectorAll('#officeControls button, #btnSimGame').forEach(b => {
        const a = b.getAttribute('onclick')||'';
        if(['simWeek()','simMonth()','simSeason()','advanceCalendar()'].includes(a)) b.style.display = 'none';
        if(b.id === 'btnSimRest') b.style.display = 'none';
    });
    
    // Unhide the existing static buttons instead of creating new ones
    const simRndBtn = document.getElementById('simRoundBtn');
    if (simRndBtn) simRndBtn.style.display = 'inline-block';
    
    const simPlyBtn = document.getElementById('simPlayoffsBtn');
    if (simPlyBtn) simPlyBtn.style.display = 'inline-block';

    showBracket();
}

function showBracket() {
    const roundLabels = ['', 'DIVISION SEMIS', 'DIVISION FINALS', 'CONF FINALS', 'STANLEY CUP FINALS'];

    // Build full round list: history + current round
    const allRounds = [...(playoffBracket.history || [])];
    if (playoffBracket.series && playoffBracket.series.length > 0) {
        allRounds.push({
            round: playoffBracket.round,
            label: roundLabels[playoffBracket.round] || `ROUND ${playoffBracket.round}`,
            series: playoffBracket.series.map(s => ({
                hCode: s.h ? s.h.code : '?', hName: s.h ? s.h.name : '',
                aCode: s.a ? s.a.code : '?', aName: s.a ? s.a.name : '',
                hW: s.hW, aW: s.aW, conf: s.conf
            }))
        });
    }
    allRounds.sort((a, b) => a.round - b.round);
    const currentRound = playoffBracket.round;

    // Series card builder
    const seriesCard = (s, isPast) => {
        const winH = s.hW === 4, winA = s.aW === 4;
        const done = winH || winA;
        const dimStyle = isPast ? 'opacity:0.7;' : '';
        const borderColor = done ? 'var(--gold-leaf)' : isPast ? '#2a2a2a' : '#444';
        const hColor = winH ? 'var(--ea-yellow)' : winA ? '#555' : '#ddd';
        const aColor = winA ? 'var(--ea-yellow)' : winH ? '#555' : '#ddd';
        const hLogo = !isPast && s.hName ? getTeamLogoHtml(s.hName) : '';
        const aLogo = !isPast && s.aName ? getTeamLogoHtml(s.aName) : '';
        const winMark = (w) => w === 4 ? ' ✓' : '';
        return `<div style="${dimStyle}background:#0d0d0d;border:1px solid ${borderColor};padding:7px 9px;margin-bottom:6px;min-width:140px;">
            <div style="display:flex;justify-content:space-between;align-items:center;color:${hColor};font-size:7px;">
                <span style="display:flex;align-items:center;gap:4px;">${hLogo}<span>${s.hCode}${winMark(s.hW)}</span></span>
                <span style="font-size:11px;">${s.hW}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;color:${aColor};font-size:7px;margin-top:4px;">
                <span style="display:flex;align-items:center;gap:4px;">${aLogo}<span>${s.aCode}${winMark(s.aW)}</span></span>
                <span style="font-size:11px;">${s.aW}</span>
            </div>
        </div>`;
    };

    // Cup champion banner
    let cupBanner = '';
    if (currentCupChamp) {
        cupBanner = `<div style="text-align:center;padding:12px;background:linear-gradient(135deg,#1a1200,#2a1e00);border:2px solid var(--gold-leaf);margin-bottom:16px;">
            <div style="color:#888;font-size:6px;letter-spacing:.2em;">STANLEY CUP CHAMPION</div>
            <div style="color:var(--ea-yellow);font-size:12px;margin-top:6px;text-shadow:2px 2px 0 #000;">${currentCupChamp}</div>
            <div style="font-size:16px;margin-top:4px;">🏒🏆🏒</div>
        </div>`;
    }

    // Render columns
    let cols = '';
    allRounds.forEach(rnd => {
        const isPast = rnd.round < currentRound;
        const isCurrent = rnd.round === currentRound;
        const labelColor = isCurrent ? 'var(--as-orange)' : '#555';
        const cards = rnd.series.map(s => seriesCard(s, isPast)).join('');
        cols += `<div style="display:inline-flex;flex-direction:column;vertical-align:top;min-width:158px;margin-right:4px;">
            <div style="font-size:6px;color:${labelColor};letter-spacing:.14em;text-align:center;padding:4px 0 8px;border-bottom:1px solid #222;margin-bottom:8px;">${rnd.label}</div>
            ${cards}
        </div>`;
        // Arrow between columns
        if (rnd.round < Math.max(...allRounds.map(r => r.round))) {
            cols += `<div style="display:inline-flex;align-items:center;vertical-align:top;padding:0 4px;color:#333;font-size:18px;padding-top:28px;">›</div>`;
        }
    });

    const h = `${cupBanner}<div style="display:inline-flex;align-items:flex-start;white-space:nowrap;">${cols}</div>`;
    document.getElementById('bracketContent').innerHTML = h;

    if(playoffBracket.series.some(s => s.hW === 4 || s.aW === 4) && !playoffBracket.series.some(s => s.hW < 4 && s.aW < 4)) {
        if(!document.getElementById('btnNextRound')) {
            const b = document.createElement('button'); b.id='btnNextRound'; b.innerText='ADVANCE ROUND'; b.onclick=handleRoundEnd; b.style.borderColor='#00FF00'; b.style.color='#00FF00'; document.getElementById('officeControls').insertBefore(b, document.getElementById('officeControls').firstChild);
        }
    }
}

// --- PRO SET CARD SYSTEM ------------------------------------------------------

const PC_WALES = ['BOS','BUF','HFD','MTL','QUE','NJD','NYI','NYR','PIT','WSH','PHI','FLA','TBL','OTT'];

const PC_COLORS = {
    ANA:['#B09860','#EF3340'], BOS:['#000000','#FCB514'], BUF:['#003087','#FCB514'],
    CGY:['#CE1126','#F1BE48'], CHI:['#CF0A2C','#FF6720'], DAL:['#006847','#8F8F8C'],
    DET:['#CE1126','#FFFFFF'], EDM:['#FC4C02','#002D62'], FLA:['#041E42','#C8102E'],
    HFD:['#006F51','#7AC5D8'], LAK:['#111111','#A2AAAD'], MIN:['#004F30','#C6002B'],
    MTL:['#AF1E2D','#192168'], NJD:['#CE1126','#003DA5'], NYI:['#003087','#FC4C02'],
    NYR:['#0038A8','#CE1126'], OTT:['#B79257','#C52032'], PHI:['#F74902','#000000'],
    PIT:['#000000','#FCB514'], QUE:['#002D62','#5197D5'], SJS:['#006D75','#EA7200'],
    STL:['#002F87','#FCB514'], TBL:['#002868','#FFFFFF'], TOR:['#003E7E','#FFFFFF'],
    VAN:['#008852','#001F5B'], WSH:['#041E42','#C8102E'], WIN:['#003E7E','#7B3F6E'],
};


// Pose files: 3 skater poses (blue-jersey rows from reference sheet)
//             2 goalie poses (butterfly + standing V)
const PC_SKATER_POSES = ['skater0.png', 'skater2.png', 'skater3.png'];
const PC_GOALIE_POSES = ['goalie.png'];

// Deterministic hash of player name -> consistent pose index
function _pcPoseIdx(name, poseCount) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
    return Math.abs(h) % poseCount;
}

function pcDrawSkaterSprite(ctx, canvasW, canvasH, pri, sec, pName) {
    const toRGB = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    const [pR,pG,pB] = toRGB(pri);
    const [sR,sG,sB] = toRGB(sec);
    const src = PC_SKATER_POSES[_pcPoseIdx(pName || '', PC_SKATER_POSES.length)];
    const img = new Image();
    img.onload = () => {
        const off = document.createElement('canvas');
        off.width = img.width; off.height = img.height;
        const oc = off.getContext('2d');
        oc.drawImage(img, 0, 0);
        const id = oc.getImageData(0, 0, off.width, off.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
            if (a < 10) continue;
            // Teal background (170,238,238) -> transparent
            if (r > 130 && r < 210 && g > 200 && b > 200 && Math.abs(g - b) < 40) {
                d[i+3] = 0; continue;
            }
            // Skin tone (200,128,80) -> keep as-is
            if (r > 170 && r < 230 && g > 90 && g < 160 && b > 50 && b < 110 && r > g && g > b) continue;
            // Blue jersey -> team primary
            if (b > 60 && b > r * 1.2 && b > g * 0.85 && r < 160 && g < 180) {
                d[i]=pR; d[i+1]=pG; d[i+2]=pB; continue;
            }
            // Gold/warm accents -> team secondary
            if (r > 120 && g > 50 && b < 80 && r > b * 2) {
                d[i]=sR; d[i+1]=sG; d[i+2]=sB; continue;
            }
        }
        oc.putImageData(id, 0, 0);
        ctx.clearRect(0, 0, canvasW, canvasH);
        const scale = Math.min(canvasW / img.width, canvasH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(off, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
    };
    img.src = src;
}

function pcDrawGoalieSprite(ctx, canvasW, canvasH, pri, sec, pName) {
    const toRGB = hex => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    const [pR,pG,pB] = toRGB(pri);
    const [sR,sG,sB] = toRGB(sec);
    const src = PC_GOALIE_POSES[_pcPoseIdx(pName || '', PC_GOALIE_POSES.length)];
    const img = new Image();
    img.onload = () => {
        const off = document.createElement('canvas');
        off.width = img.width; off.height = img.height;
        const oc = off.getContext('2d');
        oc.drawImage(img, 0, 0);
        const id = oc.getImageData(0, 0, off.width, off.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
            if (a < 10) continue;
            // Teal background -> transparent (same palette as skaters)
            if (r > 130 && r < 210 && g > 200 && b > 200 && Math.abs(g - b) < 40) {
                d[i+3] = 0; continue;
            }
            // Skin tone (200,128,80) -> keep as-is
            if (r > 170 && r < 230 && g > 90 && g < 160 && b > 50 && b < 110 && r > g && g > b) continue;
            // Blue jersey -> team primary
            if (b > 60 && b > r * 1.2 && b > g * 0.85 && r < 160 && g < 180) {
                d[i]=pR; d[i+1]=pG; d[i+2]=pB; continue;
            }
            // Gold/warm accents -> team secondary
            if (r > 120 && g > 50 && b < 80 && r > b * 2) {
                d[i]=sR; d[i+1]=sG; d[i+2]=sB; continue;
            }
        }
        oc.putImageData(id, 0, 0);
        ctx.clearRect(0, 0, canvasW, canvasH);
        const scale = Math.min(canvasW / img.width, canvasH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(off, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
    };
    img.src = src;
}


function pcBuildStats(pName, tab) {
    const p = playerStats[pName];
    if (!p) return '';
    const isG = p.pos === 'G';
    const f = (v,d) => v==null ? (d?'0.'+('0'.repeat(d)):'0') : (d?Number(v).toFixed(d):v);
    const pm = v => (v>0?'+':'')+v;
    // Format total minutes  avg MM:SS per game
    const fTOI = (toi, gp) => {
        if (!gp) return '--';
        const avg = toi / gp;
        const m = Math.floor(avg), s = Math.round((avg - m) * 60);
        return `${m}:${String(s).padStart(2,'0')}`;
    };
    const cell = (l,v,hi) => `<td style="color:#555;padding:2px 3px 2px 0;font-size:6px;white-space:nowrap">${l}</td><td style="color:${hi?'#FFD060':'#ccc'};padding:2px 8px 2px 0;font-weight:700;font-size:8px">${v}</td>`;
    const tbl = (pairs, his=[]) => {
        let h='<table style="width:100%;border-collapse:collapse">';
        for(let i=0;i<pairs.length;i+=4){
            h+='<tr>'+pairs.slice(i,i+4).map(([l,v],j)=>cell(l,v,his.includes(i+j))).join('')+'</tr>';
        }
        return h+'</table>';
    };

    if (tab==='season') {
        const s=p.season||{};
        if (isG) {
            const sa=s.sa||0,sv=s.sv||0,ga=Math.max(0,sa-sv),gp=s.gp||0;
            return tbl([['GP',f(gp)],['W',f(s.w)],['L',f(s.l)],['SO',f(s.so)],
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00'],
                ['SVG',f(s.svg||sv)],['TOI',fTOI(s.toi,gp)]],[4,5]);
        }
        const g=s.g||0,a=s.a||0;
        return tbl([['GP',f(s.gp)],['G',f(g)],['A',f(a)],['PTS',g+a],
            ['+/-',pm(s.pm||0)],['PIM',f(s.pim)],['SOG',f(s.s)],['TOI',fTOI(s.toi,s.gp)]],[2,3]);
    }
    if (tab==='career') {
        const c=p.career||{};
        if (isG) {
            const sa=c.sa||0,sv=c.sv||0,ga=Math.max(0,sa-sv),gp=c.gp||0;
            return tbl([['GP',f(gp)],['W',f(c.w)],['L',f(c.l)],['SO',f(c.so)],
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00'],
                ['SVG',f(c.svg||0)],['TOI',fTOI(c.toi,gp)]],[4,5]);
        }
        return tbl([['GP',f(c.gp)],['G',f(c.g)],['A',f(c.a)],['PTS',c.pts||((c.g||0)+(c.a||0))],
            ['+/-',pm(c.pm||c.plusMinus||0)],['PIM',f(c.pim)],['SOG',f(c.s)],['TOI',fTOI(c.toi,c.gp)]],[2,3]);
    }
    if (tab==='playoff' || tab==='c-po') {
        const src = tab==='playoff' ? (p.playoff||{}) : (p.careerPlayoff||{});
        if (tab==='playoff' && !isPlayoffs && !(src.gp>0)) {
            return `<div style="text-align:center;color:#555;padding:18px 0;font-size:7px;letter-spacing:2px">DID NOT<br><br>QUALIFY</div>`;
        }
        if (isG) {
            const sa=src.sa||0,sv=src.sv||0,ga=Math.max(0,sa-sv),gp=src.gp||0;
            return tbl([['GP',f(gp)],['W',f(src.w)],['L',f(src.l)],['SO',f(src.so)],
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00'],
                ['SVG',f(src.svg||0)],['TOI',fTOI(src.toi,gp)]],[4,5]);
        }
        return tbl([['GP',f(src.gp)],['G',f(src.g)],['A',f(src.a)],['PTS',src.pts||((src.g||0)+(src.a||0))],
            ['+/-',pm(src.pm||0)],['PIM',f(src.pim)],['SOG',f(src.s)],['TOI',fTOI(src.toi,src.gp)]],[2,3]);
    }
    // ATTR tab
    const wGrade = p.attr.weight || lbsToWeightGrade(p.weight) || 'C';
    const wLbs = p.weight || getWeightLbs(wGrade);
    const wtRow = `<div style="text-align:center;color:#555;font-size:6px;margin-top:4px;letter-spacing:1px;">WEIGHT <span style="color:#aaa;font-size:8px;margin-left:4px;">${wLbs} LBS</span> <span style="color:#444;font-size:6px;">(${wGrade})</span></div>`;
    // Use stored grade strings for exact display; fall back to numToGrade for old saves
    const gr = p.attr.grades || {};
    const gd = (key, num) => gr[key] || numToGrade(num);
    if (isG) {
        const gOvr = p.attr.gDef || p.attr.goalieDefense || p.attr.ovr || '--';
        return tbl([['G.OVR', gOvr], ['G.OFF', p.attr.gOff || '--'],
            ['SPD', gd('speed', p.attr.speed)], ['AGIL', gd('agil', p.attr.agil)],
            ['STK', gd('stkHnd', p.attr.stkHnd)], ['ENDUR', gd('endur', p.attr.endur)],
            ['AGGR', gd('aggr', p.attr.aggr)], ['ROUGH', gd('rough', p.attr.rough)]],[]) + wtRow;
    }
    return tbl([['OFF',p.attr.off||'--'],['DEF',p.attr.def||'--'],
        ['SPD',gd('speed',p.attr.speed)],['AGIL',gd('agil',p.attr.agil)],
        ['S.PWR',gd('shotPwr',p.attr.shotPwr)],['S.ACC',gd('shotAcc',p.attr.shotAcc)],
        ['PASS',gd('pass',p.attr.pass)],['STK',gd('stkHnd',p.attr.stkHnd)],
        ['CHK',gd('check',p.attr.check)],['ROUGH',gd('rough',p.attr.rough)],
        ['ENDUR',gd('endur',p.attr.endur)],['AGGR',gd('aggr',p.attr.aggr)]],[]) + wtRow;
}

function pcBuildHonors(pName) {
    const p = playerStats[pName]; if (!p) return '';
    const miles = p.milestones && p.milestones.length > 0;
    const trophies = p.trophies && p.trophies.length > 0;
    const asg = p.asgAppearances > 0;
    if (!miles && !trophies && !asg) return '';
    let h = `<div style="padding:6px 10px 8px;background:#080808;border-top:1px solid #1a1a1a;">`;
    if (asg) h += `<div style="font-size:7px;color:#FFD060;margin-bottom:5px">[MVP] ${p.asgAppearances}x ALL-STAR</div>`;
    if (trophies) {
        h += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">`;
        p.trophies.forEach(t => { h += `<div style="font-size:6px;background:#1a1000;border:1px solid #664400;color:#FFD060;padding:2px 4px">[AWD] ${t.year} ${t.name}</div>`; });
        h += `</div>`;
    }
    if (miles) {
        h += `<div style="display:flex;flex-wrap:wrap;gap:4px">`;
        p.milestones.forEach(m => { h += `<div style="font-size:6px;background:#001a1a;border:1px solid #004444;color:#00CCFF;padding:2px 4px"> ${m}</div>`; });
        h += `</div>`;
    }
    return h + `</div>`;
}

function pcSwitchTab(pName, tab) {
    ['season','career','playoff','c-po','attr'].forEach(k => {
        const el = document.getElementById('pc-tab-'+k);
        if (el) { el.style.background = k===tab?'#333':'#1a1a1a'; el.style.color = k===tab?'#fff':'#555'; }
    });
    const st = document.getElementById('pc-stats');
    if (st) st.innerHTML = pcBuildStats(pName, tab);
}

function showPlayerCard(pName) {
    if(!playerStats[pName]) return;
    const p = playerStats[pName];
    const ovr = getLiveIceOvr(pName);
    const tag = getPlayerWeightedStats(pName).tag;
    const fatigue = getPlayerFatigueAmount(pName);

    const teamObj = league.find(t => t.code === p.teamCode || t.name === p.team);
    const fullName = teamObj ? teamObj.name.toUpperCase() : (p.team || p.teamCode || '---').toUpperCase();
    const confRaw = (teamObj && teamObj.conf) ? teamObj.conf.toLowerCase() : '';
    const confName = (confRaw.includes('east') || PC_WALES.includes(p.teamCode)) ? 'WALES CONFERENCE' : 'CAMPBELL CONFERENCE';
    const clr = PC_COLORS[p.teamCode] || ['#003366','#CCAA00'];
    const pri = clr[0], sec = clr[1];
    const cardNum = String(((p.season.gp||0)*7 + (p.age||25)*3 + (ovr||70)) % 900 + 100);
    const ovrCol = ovr>=86?'#FFD060':ovr>=78?'#00CCFF':'#88FF88';
    const st = p.macro_streak || p.micro_streak || '';
    const stBadge = st==='HOT' ? `<span style="color:#FF4400;font-size:7px"> ^HOT</span>` :
                    st==='COLD'? `<span style="color:#4488FF;font-size:7px"> vCOLD</span>` : '';
    const fatBadge = fatigue>0 ? `<span style="color:${fatigue>=8?'#FF5555':'#FFAA00'};font-size:7px"> -${fatigue}</span>` : '';

    const h = `
<div style="font-family:'Press Start 2P',cursive;background:#000;max-width:360px;margin:0 auto;user-select:none;">
  <div style="background:#0a0a0a;display:flex;align-items:center;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #1a1a1a;">
    <div style="display:flex;gap:3px;align-items:center;">
      <div style="background:#B22222;color:#fff;font-size:7px;padding:2px 5px;">PRO</div>
      <div style="background:#1020A0;color:#fff;font-size:7px;padding:2px 5px;">SET</div>
      <span style="font-size:6px;color:#444;margin-left:6px;letter-spacing:2px;">NHL '94</span>
    </div>
    <span style="font-size:7px;color:#333">#${cardNum}</span>
  </div>
  <div style="background:${pri};padding:6px 10px 5px;border-bottom:3px solid ${sec};">
    <div style="font-size:8px;color:#fff;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fullName}</div>
    <div style="font-size:6px;color:rgba(255,255,255,.5);margin-top:2px;letter-spacing:1px;">${confName}</div>
  </div>
  <div style="background:#AAEEEE;position:relative;display:flex;align-items:center;justify-content:center;height:160px;overflow:hidden;">
    <canvas id="pc-logo" width="120" height="120" style="image-rendering:pixelated;"></canvas>
    <div style="position:absolute;bottom:0;left:0;right:0;height:18px;background:linear-gradient(transparent,rgba(0,0,0,.75));"></div>
  </div>
  <div style="background:${sec};padding:5px 10px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:9px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;">${p.name.toUpperCase()}</div>
    <div style="font-size:7px;color:rgba(255,255,255,.8);background:rgba(0,0,0,.35);padding:2px 5px;">${p.pos}</div>
  </div>
  <div style="background:#111;padding:4px 10px;display:flex;justify-content:space-between;align-items:center;font-size:7px;gap:6px;">
    <span>AGE <b style="color:#ccc">${p.age}</b></span>
    <span>OVR <b style="color:${ovrCol}">${ovr}</b></span>
    <span style="color:#555;font-size:6px;flex:1;text-align:center;">${tag}</span>
    ${stBadge}${fatBadge}
  </div>
  <div style="background:#0a0a0a;padding:2px 8px 4px;">${buildStatusBadges(pName)}</div>
  <div style="display:flex;gap:2px;padding:5px 6px;background:#0e0e0e;">
    ${['season','career','playoff','c-po','attr'].map((k,i)=>`<button onclick="pcSwitchTab('${pName}','${k}')" id="pc-tab-${k}" style="flex:1;font-size:6px;font-family:'Press Start 2P',cursive;padding:5px 1px;background:${i===0?'#333':'#1a1a1a'};color:${i===0?'#fff':'#555'};border:none;cursor:pointer;border-radius:2px;">${['SEASON','CAREER','PLAYOFF','C.PLYFF','ATTR'][i]}</button>`).join('')}
  </div>
  <div id="pc-stats" style="background:#0e0e0e;padding:8px 10px;min-height:60px;">${pcBuildStats(pName,'season')}</div>
  ${pcBuildHonors(pName)}
</div>`;

    document.getElementById('playerCardContent').innerHTML = h;
    const lgCanvas = document.getElementById('pc-logo');
    if (lgCanvas) {
        const ctx2 = lgCanvas.getContext('2d');
        if (p.pos === 'G') {
            lgCanvas.width = 280; lgCanvas.height = 152;
            pcDrawGoalieSprite(ctx2, 280, 152, pri, sec, pName);
        } else {
            lgCanvas.width = 200; lgCanvas.height = 152;
            pcDrawSkaterSprite(ctx2, 200, 152, pri, sec, pName);
        }
    }
    document.getElementById('playerCardOverlay').style.display = 'flex';
}

function runDraftLottery() {
    // Weighted odds for top-3 picks: worst team 14%, 2nd worst 11%, 3rd worst 8%, others share rest
    const sorted = [...league].sort((a,b) => {
        if (a.season.pts !== b.season.pts) return a.season.pts - b.season.pts;
        return (a.season.gf - a.season.ga) - (b.season.gf - b.season.ga);
    });
    const n = sorted.length;
    // Build ticket pool: bottom 3 get 14/11/8 tickets, rest share 67 equally
    const tickets = sorted.map((t, i) => {
        if (i === 0) return { t, w: 14 };
        if (i === 1) return { t, w: 11 };
        if (i === 2) return { t, w: 8 };
        return { t, w: Math.floor(67 / Math.max(1, n - 3)) };
    });
    const draw = (pool) => {
        const total = pool.reduce((s, e) => s + e.w, 0);
        let roll = Math.random() * total;
        for (const e of pool) { roll -= e.w; if (roll <= 0) return e.t; }
        return pool[pool.length - 1].t;
    };
    const picks = [];
    let pool = [...tickets];
    for (let i = 1; i <= 3; i++) {
        const winner = draw(pool);
        picks.push({ pick: i, team: winner });
        pool = pool.filter(e => e.t !== winner);
    }
    // Remaining picks go in reverse standing order
    const pickTeams = picks.map(p => p.team);
    const rest = sorted.filter(t => !pickTeams.includes(t));
    rest.forEach((t, i) => picks.push({ pick: i + 4, team: t }));
    // Show results in the lottery overlay with a dramatic reveal
    const cage = document.getElementById('lotteryCage');
    const status = document.getElementById('lotteryStatus');
    const claimBtn = document.getElementById('btnClaimPick');
    const overlay = document.getElementById('lotteryOverlay');
    if (!cage || !overlay) {
        // Fallback if overlay missing
        alert(picks.slice(0,6).map(p=>`#${p.pick} — ${p.team.name}`).join('\n'));
    } else {
        cage.innerHTML = '';
        status.innerText = 'TUMBLING BALLS...';
        if (claimBtn) claimBtn.style.display = 'none';
        overlay.style.display = 'flex';
        let revealed = 0;
        const revealNext = () => {
            if (revealed >= Math.min(picks.length, 6)) {
                if (status) status.innerText = `PICKS 7–${picks.length} ASSIGNED BY REVERSE STANDINGS`;
                if (claimBtn) claimBtn.style.display = 'block';
                return;
            }
            const p = picks[revealed++];
            const isTop3 = p.pick <= 3;
            const card = document.createElement('div');
            card.style.cssText = `margin:6px auto;padding:8px 12px;background:#111;border:2px solid ${isTop3?'var(--gold-leaf)':'#333'};color:${isTop3?'var(--ea-yellow)':'#aaa'};font-size:${isTop3?'9px':'7px'};text-align:left;`;
            card.innerHTML = `<span style="color:#666;">#${p.pick}</span>  ${p.team.name}${isTop3?' 🏒':''}`;
            cage.appendChild(card);
            if (status) status.innerText = revealed < Math.min(picks.length, 6) ? `DRAWING PICK #${revealed + 1}...` : 'LOTTERY COMPLETE';
            setTimeout(revealNext, isTop3 ? 900 : 400);
        };
        setTimeout(revealNext, 600);
    }
    const btnL = document.getElementById('btnLottery'); if (btnL) btnL.remove();
    if (!document.getElementById('btnStartPlayoffs')) {
        const b = document.createElement('button'); b.id = 'btnStartPlayoffs'; b.innerText = 'START PLAYOFFS'; b.onclick = initPlayoffs; document.getElementById('officeControls').appendChild(b);
    }
}
function closeLottery() { document.getElementById('lotteryOverlay').style.display = 'none'; }
// --- WINDOW EVENTS ---
window.onclick = function(event) {
    const modals = ['lotteryOverlay', 'allTimeOverlay', 'awardOverlay', 'recapOverlay', 'seriesRecapOverlay', 'statLeadersOverlay', 'leagueSettingsOverlay', 'arenaSettingsOverlay', 'tradeOverlay', 'subOverlay', 'historyOverlay', 'playerCardOverlay', 'boxScoreOverlay', 'advEditorOverlay', 'gpChecklistOverlay', 'watchGameOverlay', 'stOverlay', 'proposalOverlay', 'scoutingOverlay', 'chemEditorOverlay', 'coachingOverlay', 'gmReportCardOverlay', 'awardsVotingOverlay'];
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

// =========================================================
// --- FRANCHISE MODE: EXPAND DATA & GOALIE BRAIN ---
// =========================================================

// 1. Gives every player a "status" backpack for fatigue and injuries
function initializeFranchiseVariables() {
    let playersUpdated = 0;
    for (let pName in playerStats) {
        let p = playerStats[pName];
        if (!p.status) {
            p.status = { fatigue: 0, morale: 0, injuryDays: 0, suspension: 0, consecutiveStarts: 0 };
            playersUpdated++;
        }
    }
    console.log(`[FRANCHISE] injected status variables into ${playersUpdated} players.`);
    // Trigger the leaders refresh now that the data exists
    // Add this line exactly here to force the UI to populate now that data exists
if (typeof updateLeadersUI === 'function') updateLeadersUI();
}

// =========================================================
// --- FRANCHISE MODE: FATIGUE & DAILY PROCESSING ---
// =========================================================

// 1. THE GAME TOLL (Runs immediately after a game finishes)
function applyPostGameFatigue(awayTeamCode, homeTeamCode, awayGoalieName, homeGoalieName) {
    let teams = [awayTeamCode, homeTeamCode];
    let startingGoalies = [awayGoalieName, homeGoalieName];

    teams.forEach((tk, index) => {
        if (!rosters[tk]) return;

        rosters[tk].forEach(p => {
            if (!p.status) p.status = { fatigue: 0, morale: 0, injuryDays: 0, suspension: 0, consecutiveStarts: 0 };

            // Skaters gain 8 fatigue per game (not if on IR)
            if (p.pos !== 'G' && p.status.injuryDays === 0 && !playerStats[p.name]?.onIR) {
                p.status.fatigue = Math.min(100, p.status.fatigue + 8);
                // Also accumulate real sim fatigue so getPlayerFatigueAmount / getPlayerWeightedStats sees it
                const ps1 = playerStats[p.name];
                if (ps1) ps1.seasonTicks = (ps1.seasonTicks || 0) + 20;
            }
            // Goalies
            else if (p.pos === 'G') {
                if (p.name === startingGoalies[index]) {
                    p.status.fatigue = Math.min(100, p.status.fatigue + 15); // Starter gets exhausted
                } else {
                    p.status.fatigue = Math.max(0, p.status.fatigue - 8); // Backup rests on the bench
                }
            }
        });
    });
}

// 2. THE MIDNIGHT LOOP (Runs at the end of the day)
function processDailyUpdates() {
    // Expire pending trades older than 7 days
    if (pendingTrades.length > 0) {
        const TRADE_EXPIRE_DAYS = 7;
        const expired = pendingTrades.filter(t => t.day == null || (currentDay - t.day) >= TRADE_EXPIRE_DAYS);
        if (expired.length > 0) {
            expired.forEach(t => {
                tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `TRADE EXPIRED: ${t.t1.toUpperCase()} ↔ ${t.t2.toUpperCase()} offer (${t.p1} / ${t.p2}) went unanswered and has been withdrawn.` });
            });
            pendingTrades = pendingTrades.filter(t => t.day != null && (currentDay - t.day) < TRADE_EXPIRE_DAYS);
            refreshTradeBadge();
        }
    }

    let teamsPlayedToday = new Set();
    let todaysGames = calendar[currentDay] || [];
    todaysGames.forEach(g => { teamsPlayedToday.add(g.a.nrm); teamsPlayedToday.add(g.h.nrm); });

    for (let tk in rosters) {
        let playedToday = teamsPlayedToday.has(tk);
        rosters[tk].forEach(p => {
            if (!p.status) return;
            if (p.status.injuryDays > 0) p.status.injuryDays--;
            // Heal playerStats injury on rest days (game days are covered by heal() inside simulateGame)
            const ps4 = playerStats[p.name];
            if (!playedToday && ps4 && ps4.injury && ps4.injury.daysRemaining > 0) {
                ps4.injury.daysRemaining--;
                if (ps4.injury.daysRemaining === 0) { ps4.onIR = false; }
            }
            // Morale decays 3% per day toward neutral (100) so extreme values don't persist all season
            if (ps4 && ps4.morale !== undefined && ps4.morale !== 100) {
                ps4.morale = Math.round(ps4.morale * 0.97 + 100 * 0.03);
            }
            if (!playedToday) {
                p.status.fatigue = Math.max(0, p.status.fatigue - 25);
                // Also recover real sim fatigue tracked via seasonTicks
                const ps6 = playerStats[p.name];
                if (ps6 && ps6.seasonTicks > 0) ps6.seasonTicks = Math.max(0, ps6.seasonTicks - 20);
            }
            // Decrement suspension based on the player's own current team schedule (safe after trades)
            const ps = playerStats[p.name];
            if (ps && ps.suspended && ps.suspended.days > 0) {
                const playerTk = ps.teamCode || tk;
                if (teamsPlayedToday.has(playerTk)) ps.suspended.days--;
            }
        });
    }

    //  MOVE THESE OUTSIDE THE LOOPS!
    checkTradeDeadlineAnnouncements();

    // Rivalry preview headlines — fire when two teams meet for the 3rd+ time this season
    if (awardConfig.rivalries && !isPlayoffs && calendar[currentDay]) {
        calendar[currentDay].forEach(g => {
            if (!g || !g.h || !g.a) return;
            const meetings = g.h.season?.meetings?.[g.a.nrm] || 0;
            if (meetings === 2) { // about to be their 3rd meeting
                const hPts = g.h.season?.pts || 0, aPts = g.a.season?.pts || 0;
                const leader = hPts >= aPts ? g.h.code : g.a.code;
                tradeLog.unshift({ day: currentDay, details: `RIVALRY: ${g.h.code} vs ${g.a.code} — THIRD MEETING this season. ${leader} leads the season series. Bad blood guaranteed.` });
            } else if (meetings === 3) {
                tradeLog.unshift({ day: currentDay, details: `RIVALRY: ${g.h.code} vs ${g.a.code} — Fourth meeting. This rivalry is personal now.` });
            }
        });
    }

    let tradeMult = getTradeProbabilityMultiplier();
    let daysUntilDeadline = Math.floor(calendar.length * 0.75) - currentDay;
    let isDeadlineWindow = tradeMult > 1.0 && daysUntilDeadline >= 0;

    if (awardConfig.trades && Math.random() < (0.05 * tradeMult)) {
        // Only real league teams — never the temporary WALES/CAMPBELL ASG rosters
        let activeTeams = Object.keys(rosters).filter(k => league.some(t => t.nrm === k));
        let teamA = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        let teamB = activeTeams[Math.floor(Math.random() * activeTeams.length)];

        if (teamA !== teamB && rosters[teamA].length > 15 && rosters[teamB].length > 15) {
            let playerA, playerB, dealTag = 'BLOCKBUSTER';

            if (isDeadlineWindow) {
                // Buyer/Seller logic: sellers ship veterans for futures, contenders ship prospects for proven players
                const aIsContender = isContenderTeam(teamA);
                const bIsContender = isContenderTeam(teamB);
                if (aIsContender !== bIsContender) {
                    const sellerKey = aIsContender ? teamB : teamA;
                    const buyerKey = aIsContender ? teamA : teamB;
                    const sellerSkaters = rosters[sellerKey].filter(p => p.pos !== 'G');
                    const buyerSkaters = rosters[buyerKey].filter(p => p.pos !== 'G');
                    if (sellerSkaters.length && buyerSkaters.length) {
                        // Seller moves its oldest, highest-OVR veteran for a future
                        const veteran = [...sellerSkaters].sort((p1, p2) => {
                            const age1 = playerStats[p1.name]?.age || 25, age2 = playerStats[p2.name]?.age || 25;
                            return (age2 * 2 + getPlayerWeightedStats(p2.name).ovr) - (age1 * 2 + getPlayerWeightedStats(p1.name).ovr);
                        })[0];
                        // Buyer gives up its youngest, lowest-OVR prospect in return
                        const prospect = [...buyerSkaters].sort((p1, p2) => {
                            const age1 = playerStats[p1.name]?.age || 25, age2 = playerStats[p2.name]?.age || 25;
                            return (age1 * 2 - getPlayerWeightedStats(p1.name).ovr) - (age2 * 2 - getPlayerWeightedStats(p2.name).ovr);
                        })[0];
                        if (veteran && prospect && veteran.name !== prospect.name) {
                            playerA = (sellerKey === teamA) ? veteran : prospect;
                            playerB = (sellerKey === teamA) ? prospect : veteran;
                            dealTag = `DEADLINE DEAL: Seller ${sellerKey.toUpperCase()} sends veteran ${veteran.name} to contender ${buyerKey.toUpperCase()} for prospect ${prospect.name}`;
                        }
                    }
                }
            }

            if (!playerA || !playerB) {
                playerA = rosters[teamA][Math.floor(Math.random() * rosters[teamA].length)];
                playerB = rosters[teamB][Math.floor(Math.random() * rosters[teamB].length)];
                dealTag = `BLOCKBUSTER: ${teamA.toUpperCase()} trades ${playerA.name} to ${teamB.toUpperCase()} for ${playerB.name}`;
            }

            if (!tradeKeepsRostersViable(teamA, playerA, teamB, playerB)) {
                // Would leave a team without a goalie or center — skip this tick's trade
            } else {

            const _teamAObj = league.find(t => t.nrm === teamA);
            const _teamBObj = league.find(t => t.nrm === teamB);

            if (awardConfig.tradeBlock) {
                // Queue for user approval — do NOT touch rosters or playerStats yet;
                // approveProposal() will execute the swap if accepted, rejectProposal() discards it cleanly
                pendingTrades.push({ id: Date.now() + Math.random(), t1: teamA, t2: teamB, t1Name: _teamAObj?.name || teamA, t2Name: _teamBObj?.name || teamB, p1: playerA.name, p2: playerB.name, day: currentDay });
                tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `TRADE OFFER: ${teamA.toUpperCase()} ↔ ${teamB.toUpperCase()} — pending approval.` });
                refreshTradeBadge();
            } else {
                playerA.team = teamB; playerB.team = teamA;
                if (playerStats[playerA.name] && _teamBObj) {
                    playerStats[playerA.name].team = _teamBObj.name; playerStats[playerA.name].teamCode = _teamBObj.code;
                    if (playerStats[playerA.name].pos === 'G') { playerStats[playerA.name].lastStart = -1; playerStats[playerA.name].goalieDays = 0; if (playerStats[playerA.name].season) playerStats[playerA.name].season.consStarts = 0; if (playerStats[playerA.name].playoff) playerStats[playerA.name].playoff.consStarts = 0; }
                }
                if (playerStats[playerB.name] && _teamAObj) {
                    playerStats[playerB.name].team = _teamAObj.name; playerStats[playerB.name].teamCode = _teamAObj.code;
                    if (playerStats[playerB.name].pos === 'G') { playerStats[playerB.name].lastStart = -1; playerStats[playerB.name].goalieDays = 0; if (playerStats[playerB.name].season) playerStats[playerB.name].season.consStarts = 0; if (playerStats[playerB.name].playoff) playerStats[playerB.name].playoff.consStarts = 0; }
                }

                rosters[teamA] = rosters[teamA].filter(p => p.name !== playerA.name);
                rosters[teamA].push(playerB);

                rosters[teamB] = rosters[teamB].filter(p => p.name !== playerB.name);
                rosters[teamB].push(playerA);

                if (_teamAObj) _teamAObj.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
                if (_teamBObj) _teamBObj.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
                assignTeamCaptains();
                clearWpCache();
                pruneCustomDuos();

                tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `${dealTag}.` });
            }

            // Flag rival contenders for a countermove window (deadline deals only)
            if (isDeadlineWindow && dealTag.startsWith('DEADLINE DEAL')) {
                const involvedNrms = new Set([teamA, teamB]);
                league.forEach(t => {
                    if (!involvedNrms.has(t.nrm) && isContenderTeam(t.nrm)) {
                        deadlineCountermove[t.nrm] = currentDay + 1;
                        tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `COUNTERMOVE WINDOW: ${t.name.toUpperCase()} has 24h to respond to the market shift.` });
                    }
                });
            }
            }
        }
    }

    // Countermove — flagged contenders get a boosted trade roll for 1 day
    const activeCountermove = Object.entries(deadlineCountermove).filter(([, expiry]) => currentDay <= expiry);
    activeCountermove.forEach(([nrm]) => {
        if (awardConfig.trades && !awardConfig.tradeBlock && Math.random() < 0.18) {
            const teamA = nrm;
            const others = Object.keys(rosters).filter(k => k !== teamA && league.some(t => t.nrm === k));
            const teamB = others[Math.floor(Math.random() * others.length)];
            if (rosters[teamA]?.length > 15 && rosters[teamB]?.length > 15) {
                const skA = rosters[teamA].filter(p => p.pos !== 'G');
                const skB = rosters[teamB].filter(p => p.pos !== 'G');
                if (skA.length && skB.length) {
                    const pA = skA[Math.floor(Math.random() * skA.length)];
                    const pB = skB[Math.floor(Math.random() * skB.length)];
                    if (pA.name !== pB.name && tradeKeepsRostersViable(teamA, pA, teamB, pB)) {
                        pA.team = teamB; pB.team = teamA;
                        const _cmA = league.find(t => t.nrm === teamA);
                        const _cmB = league.find(t => t.nrm === teamB);
                        if (playerStats[pA.name] && _cmB) { playerStats[pA.name].team = _cmB.name; playerStats[pA.name].teamCode = _cmB.code; }
                        if (playerStats[pB.name] && _cmA) { playerStats[pB.name].team = _cmA.name; playerStats[pB.name].teamCode = _cmA.code; }
                        rosters[teamA] = rosters[teamA].filter(p => p.name !== pA.name); rosters[teamA].push(pB);
                        rosters[teamB] = rosters[teamB].filter(p => p.name !== pB.name); rosters[teamB].push(pA);
                        if (_cmA) _cmA.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
                        if (_cmB) _cmB.chem = {f:[0,0,0,0], d:[0,0,0], lastUnit:null};
                        assignTeamCaptains();
                        clearWpCache();
                        pruneCustomDuos();
                        tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `COUNTERMOVE: ${teamA.toUpperCase()} responds — acquires ${pB.name} from ${teamB.toUpperCase()} for ${pA.name}.` });
                    }
                }
            }
        }
        // Clear expired flags
        if (currentDay > deadlineCountermove[nrm]) delete deadlineCountermove[nrm];
    });
}

// =========================================================
//  DEPARTMENT OF PLAYER SAFETY (DOPS) - SUSPENSION ENGINE
// =========================================================
function reviewGameForSuspensions(matchStats, homeCode, awayCode) {
    for (let pName in matchStats) {
        let stats = matchStats[pName];
        
        // Only review players who accumulated serious PIMs (15+ = brawl / multiple majors)
        if (stats.pim >= 15) {
            let player = playerStats[pName];

            // Failsafe to ensure they have the status backpack
            if (!player || !player.status) continue;

            // Flat 2% chance per game at this threshold — very rare
            let baseChance = 0.02;

            // "Repeat Offender" Tax: Enforcers get scrutinized more harshly by the league
            let isEnforcer = getPlayerWeightedStats(pName).tag.includes('ENFORCER');
            if (isEnforcer) baseChance += 0.01;
            
            // Roll the dice! Does the league suspend them?
            if (Math.random() < baseChance) {
                // Roll for the severity of the suspension
                let lengthRoll = Math.random();
                let gamesOut = 1;
                
                if (lengthRoll < 0.05) gamesOut = 5;      // 5% chance: 5 Games (Massive brawl/injury)
                else if (lengthRoll < 0.25) gamesOut = 3; // 20% chance: 3 Games
                else if (lengthRoll < 0.60) gamesOut = 2; // 35% chance: 2 Games
                
                // Apply the suspension — tracked on playerStats so lineup/UI both see it
                if (!player.suspended) player.suspended = { days: 0, reason: '' };
                player.suspended.days += gamesOut; // accumulate — serving suspension doesn't protect from new bans
                player.suspended.reason = 'DOPS';
                
                // Figure out which team they play for so we can write the headline
                let teamCode = rosters[homeCode].find(p => p.name === pName) ? homeCode : awayCode;
                
                // Broadcast it to the global news feed!
                tradeLog.unshift({ 
                    day: currentDay, 
                    details: `!! DOPS SUSPENSION: ${pName} (${teamCode.toUpperCase()}) has been suspended for ${gamesOut} games following a dangerous play.` 
                });
            }
        }
    }
}

// =========================================================
// [INJ] INJURY ENGINE
// =========================================================
// Mid-game injury system — fires during the sim tick loop (called per game, not per tick)
// Low base rate; goalie injuries trigger backup pull event and get logged prominently
// Returns count of healthy goalie scratches — used to check if a backup exists mid-game
function getBenchDepth(tk) {
    if (!rosters[tk]) return 0;
    return rosters[tk].filter(p => p.pos === 'G' && p.line === 'BENCH' && (playerStats[p.name]?.injury?.daysRemaining ?? 0) === 0 && !playerStats[p.name]?.onIR).length;
}

// A team with exactly (or fewer than) 12 forwards on its whole roster has zero bench depth beyond
// what's dressed each game — a multi-game injury there forces the roster builder to run every
// remaining line short for the injury's full duration with no possible replacement (no call-up
// system exists). Cap forward injuries to 1 game for these threadbare rosters instead.
function hasSpareForward(tk) {
    const roster = rosters[tk] || [];
    const forwardCount = roster.filter(p => p.pos !== 'D' && p.pos !== 'G').length;
    return forwardCount > 12;
}

// Same reasoning as hasSpareForward: 6 D fills exactly 3 pairs, 2 G fills starter+backup —
// either at exactly that minimum means zero reserve, so a multi-game injury there is capped.
function hasSpareDefenseman(tk) {
    const roster = rosters[tk] || [];
    return roster.filter(p => p.pos === 'D').length > 6;
}
function hasSpareGoalie(tk) {
    const roster = rosters[tk] || [];
    return roster.filter(p => p.pos === 'G').length > 2;
}

function rollInGameInjuries(homeCode, awayCode) {
    if (!awardConfig.injuries) return;
    const SKATER_CHANCE = 0.009;
    const GOALIE_CHANCE = 0.004;

    [homeCode, awayCode].forEach(tk => {
        if (!rosters[tk]) return;
        const skaters = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury?.daysRemaining === 0);
        const goalies = rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury?.daysRemaining === 0);

        // Skater injury
        skaters.forEach(p => {
            const ps = playerStats[p.name];
            if (!ps) return;
            const fatigueBonus = getPlayerFatigueAmount(p.name) > 5 ? 0.003 : 0;
            const aggrBonus = getAggr(p.name) > 70 ? 0.002 : 0;
            if (Math.random() < SKATER_CHANCE + fatigueBonus + aggrBonus) {
                const roll = Math.random();
                let days;
                if      (roll < 0.45) days = 0;
                else if (roll < 0.75) days = 1;
                else if (roll < 0.92) days = Math.floor(Math.random() * 4) + 2;
                else                  days = Math.floor(Math.random() * 5) + 6;
                days = Math.min(days, 12);
                if (days > 1) {
                    if (p.pos !== 'D' && !hasSpareForward(tk)) days = 1;
                    else if (p.pos === 'D' && !hasSpareDefenseman(tk)) days = 1;
                }
                if (days > 0) ps.injury = { severity: days, daysRemaining: days };
                else ps.shakenUpToday = true; // exempt from a second independent injury roll later this game
                const label = days === 0 ? 'shaken up — playing through' : `out ${days} game${days > 1 ? 's' : ''}`;
                tradeLog.unshift({ day: `DAY ${currentDay + 1}`, details: `[INJ] IN-GAME: ${p.name} (${tk.toUpperCase()}) — ${label}.` });
            }
        });

        // Goalie injury — triggers backup pull event; stop after first injury per team
        let goalieInjuredThisTeam = false;
        goalies.forEach(p => {
            if (goalieInjuredThisTeam) return;
            const ps = playerStats[p.name];
            if (!ps) return;
            if (Math.random() < GOALIE_CHANCE) {
                goalieInjuredThisTeam = true;
                const backupG = rosters[tk].find(b => b.pos === 'G' && b.name !== p.name && (playerStats[b.name]?.injury?.daysRemaining ?? 0) === 0 && !(playerStats[b.name]?.suspended?.days > 0));
                let days = backupG ? Math.floor(Math.random() * 4) + 1 : 1;
                if (days > 1 && !hasSpareGoalie(tk)) days = 1;
                ps.injury = { severity: days, daysRemaining: days };
                if (!backupG) ps.playingHurt = true; // stays in net but at reduced effectiveness
                const backupNote = backupG ? ` ${backupG.name} enters in relief.` : ' No healthy backup — playing through.';
                tradeLog.unshift({ day: `DAY ${currentDay + 1}`, details: `🚨 GOALIE PULLED (INJURY): ${p.name} (${tk.toUpperCase()}) — out ${days} game${days > 1 ? 's' : ''}.${backupNote}` });
            }
        });
    });
}

function triggerGameInjuries(matchStats, homeCode, awayCode) {
    if (!awardConfig.injuries) return;
    const BASE_CHANCE = 0.008;
    for (let pName in matchStats) {
        const ps = playerStats[pName];
        if (!ps || !ps.injury) continue;
        if (ps.injury.daysRemaining > 0) continue;
        if (ps.shakenUpToday) { ps.shakenUpToday = false; continue; } // already dinged by rollInGameInjuries this game
        const stats = matchStats[pName];
        if (!stats.toi || stats.toi <= 0) continue;

        const fatigueBonus = getPlayerFatigueAmount(pName) > 5 ? 0.003 : 0;
        // Scale by penalty severity, not just a flat "took any penalty" flag — a fight or major
        // (5 PIM) is a genuinely more injury-prone event than an ordinary 2-min minor and should
        // carry noticeably more risk, not the same fixed bump.
        const physicalBonus = stats.pim >= 5 ? 0.006 : stats.pim >= 2 ? 0.002 : 0;
        const chance = BASE_CHANCE + fatigueBonus + physicalBonus;

        if (Math.random() < chance) {
            const roll = Math.random();
            let days, label;
            if      (roll < 0.30) { days = 0;                                   label = 'out for a period'; }
            else if (roll < 0.58) { days = 1;                                   label = '1-game injury'; }
            else if (roll < 0.78) { days = Math.floor(Math.random() * 4) + 2;  label = `${days}-game injury`; }
            else if (roll < 0.93) { days = Math.floor(Math.random() * 6) + 6;  label = `${days}-game injury`; }
            else                  { days = Math.floor(Math.random() * 4) + 12; label = `${days}-game injury`; }

            days = Math.min(days, 15);

            const teamCode = (rosters[homeCode] || []).find(p => p.name === pName) ? homeCode : awayCode;
            if (days > 1) {
                if (ps.pos !== 'D' && ps.pos !== 'G' && !hasSpareForward(teamCode)) { days = 1; label = '1-game injury'; }
                else if (ps.pos === 'D' && !hasSpareDefenseman(teamCode)) { days = 1; label = '1-game injury'; }
                else if (ps.pos === 'G' && !hasSpareGoalie(teamCode)) { days = 1; label = '1-game injury'; }
            }
            const note = days === 0
                ? `[INJ] INJURY NOTE: ${pName} (${teamCode.toUpperCase()}) was shaken up  -  out for a period.`
                : `[INJ] INJURY: ${pName} (${teamCode.toUpperCase()})  -  ${label}, out ${days} game${days > 1 ? 's' : ''}.`;

            // Only confirm long injuries (12-15 games), and only when a human is watching a manual sim —
            // Turbo/auto-sim must never block on a synchronous dialog mid-loop.
            if (days >= 12 && !isTurboMode) {
                const accept = confirm(`INJURY  -  ${pName} (${teamCode.toUpperCase()})\n${label.toUpperCase()}\n\nApply this injury? (OK = yes, Cancel = skip)`);
                if (!accept) {
                    tradeLog.unshift({ day: currentDay, details: ` INJURY AVOIDED: ${pName} (${teamCode.toUpperCase()}) played through a ${label}.` });
                    continue;
                }
            }

            if (days > 0) ps.injury = { severity: days, daysRemaining: days };
            tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: note });
            if (days > 0 && isTeamCaptain(pName)) {
                tradeLog.unshift({ day: `DAY ${currentDay+1}`, details: `⚠ CAPTAIN DOWN: ${pName} (${teamCode.toUpperCase()}) — ${label}. Leadership void in the locker room.` });
            }
        }
    }
}

// =========================================================
//  TRADE DEADLINE SYSTEM & FRENZY MULTIPLIER
// =========================================================
function getTradeProbabilityMultiplier() {
    // Calculate the deadline (75% of the way through the season)
    let totalDays = calendar.length;
    if (!totalDays) return 1.0;
    
    let deadlineDay = Math.floor(totalDays * 0.75);

    // 1. POST-DEADLINE: Trade window is slammed shut (0% chance)
    if (currentDay > deadlineDay) return 0; 

    let daysUntil = deadlineDay - currentDay;

    // 2. DEADLINE DAY: Absolute chaos (500% increase in AI trades)
    if (daysUntil === 0) return 5.0; 

    // 3. THE DEADLINE FRENZY: The 5 days leading up to the deadline
    if (daysUntil <= 5) return 2.5; 

    // 4. REGULAR SEASON: Normal baseline trading
    return 1.0; 
}

// Top-8 in conference by points = "contender" (buyer); everyone else = "seller" as the deadline nears
// Below a minimum games-played floor, points-based ranking is too noisy to trust — default to non-contender
function isContenderTeam(nrm) {
    const t = league.find(l => l.nrm === nrm);
    if (!t) return true;
    const MIN_GP_FOR_RANKING = 15;
    if ((t.season.gp || 0) < MIN_GP_FOR_RANKING) return false;
    const confTeams = league.filter(l => l.conf === t.conf).sort((a, b) => b.season.pts - a.season.pts).slice(0, 8);
    return confTeams.some(l => l.nrm === nrm);
}

function checkTradeDeadlineAnnouncements() {
    let totalDays = calendar.length;
    if (!totalDays) return;
    
    let deadlineDay = Math.floor(totalDays * 0.75);
    
    // Broadcast news to the global trade log so you know it's coming!
    if (currentDay === deadlineDay - 5) {
        tradeLog.unshift({ day: currentDay, details: ` NEWS: The Trade Deadline is 5 days away. General Managers are working the phones.` });
    } else if (currentDay === deadlineDay) {
        tradeLog.unshift({ day: currentDay, details: `!! NEWS: IT IS TRADE DEADLINE DAY! The window closes at midnight.` });
    } else if (currentDay === deadlineDay + 1) {
        tradeLog.unshift({ day: currentDay, details: ` NEWS: The Trade Deadline has officially passed. Rosters are locked for the playoffs.` });
        // Lock the trades toggle
        if (awardConfig.trades) {
            awardConfig.trades = false;
            const btn = document.getElementById('btnTrades');
            if (btn) { btn.textContent = btn.textContent.replace('ON', 'OFF'); btn.style.opacity = '0.5'; }
        }
    }
}

// --- UI RENDERERS ---
function refreshTradeBadge() {
    const btn = document.getElementById('btnTrade');
    if (!btn) return;
    const existing = btn.querySelector('.trade-badge');
    if (existing) existing.remove();
    if (awardConfig.tradeBlock && pendingTrades.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'trade-badge';
        badge.textContent = pendingTrades.length;
        badge.style.cssText = 'display:inline-block;background:#FF4444;color:#fff;border-radius:50%;font-size:5px;min-width:12px;height:12px;line-height:12px;text-align:center;margin-left:4px;padding:0 2px;vertical-align:middle;';
        btn.appendChild(badge);
    }
}

function updateUI() {
    if (activeIdx !== null && !getGameAt(currentDay, activeIdx)) activeIdx = null;

    if(!isPlayoffs && !isASG && calendar.length > 0 && currentDay >= calendar.length) { 
        if(!document.getElementById('btnLottery') && awardConfig.draft) { const b = document.createElement('button'); b.id = 'btnLottery'; b.innerText = "RUN LOTTERY"; b.onclick = runDraftLottery; document.getElementById('officeControls').appendChild(b); } 
        else if(!awardConfig.draft && !document.getElementById('btnStartPlayoffs')) { const b = document.createElement('button'); b.id = 'btnStartPlayoffs'; b.innerText = "START PLAYOFFS"; b.onclick = initPlayoffs; document.getElementById('officeControls').appendChild(b); } 
    }

    let m = "EASN LIVE | STANDINGS | "; 
    [...league].sort((a,b) => b.season.pts - a.season.pts).slice(0,5).forEach(t => m += `${t.code}: ${t.season.pts} `);
    let ss = "WELCOME TO THE DYNASTY ENGINE"; 
    if(currentDay > 0 && Array.isArray(calendar[currentDay - 1])) { ss = calendar[currentDay - 1].map(g => { if (g && g.a && g.h) { let otStr = (g.result && g.result.ot > 0) ? (g.result.ot === 1 ? ' (OT)' : ` (${g.result.ot}OT)`) : ''; return `${g.a.code} ${g.result ? g.result.aG : ''} - ${g.result ? g.result.hG : ''} ${g.h.code}${otStr}`; } return ""; }).join(' * '); }	
    const dayGamesNow = getGamesForDay(currentDay);
    const isAsgDayNow = isASG && dayGamesNow.some(g => g && g.isASG_game);
    const tickerEl = document.getElementById('tickerScroll');
    if (tickerEl) tickerEl.innerText = (isAsgDayNow ? 'HOT ALL-STAR GAME DAY! HOT | ' : '') + m + " | LATEST SCORE: " + ss;
    refreshScheduleDashboardUI();
    refreshTradeBadge();

    const mn = document.getElementById('gameMenuList');
    if (mn) {
        mn.innerHTML = '';
        dayGamesNow.forEach((g, i) => {
            if (!g || !g.a || !g.h) return;
            const it = document.createElement('div');
            it.className = 'menu-game-item';
            it.onclick = () => { selectGame(i); toggleGameMenu(); };
            it.innerHTML = `${getTeamLogoHtml(g.h.name)} <span style="color:#444; font-size:6px;">VS</span> ${getTeamLogoHtml(g.a.name)}`;
            mn.appendChild(it);
        });
    }

    const renderStandings = (id, c) => {
        const ts = league.filter(x => x.conf.toLowerCase().includes(c)).sort((a,b) => {
            if (b.season.pts !== a.season.pts) return b.season.pts - a.season.pts;
            if (b.season.w   !== a.season.w)   return b.season.w   - a.season.w;
            const aH = (a.season.h2h && a.season.h2h[b.nrm]) || 0;
            const bH = (b.season.h2h && b.season.h2h[a.nrm]) || 0;
            if (bH !== aH) return bH - aH;
            return (b.season.gf - b.season.ga) - (a.season.gf - a.season.ga);
        });
        const total = ts.length;
        let h = `<tr><th>TEAM</th><th style="color:#aaa;">DIV</th><th>OVR</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>PTS</th></tr>`;
        h += ts.map((t, i) => {
            // Top 8 = playoff spots (green), bottom 3 = lottery (red), rest neutral
            const rowBg = i < 8 ? 'rgba(0,180,80,0.13)' : i >= total - 3 ? 'rgba(220,40,40,0.13)' : '';
            const indicator = i === 7 ? ' style="border-bottom:1px dashed #00b450;"' : '';
            const rankDot = i < 8 ? '<span style="color:#00b450;font-size:9px;">●</span> ' : i >= total - 3 ? '<span style="color:#dd2222;font-size:9px;">●</span> ' : '<span style="color:transparent;font-size:9px;">●</span> ';
            return `<tr style="background:${rowBg};"${indicator}><td style="display:flex;align-items:center;">${rankDot}${getTeamLogoHtml(t.name)} <span style="margin-top:2px;">${t.name}</span></td><td style="color:#888;font-size:6px;">${t.div ? t.div.slice(0,3).toUpperCase() : '-'}</td><td style="color:var(--neon-cyan);">${getDynamicTeamOvr(t.nrm)}</td><td>${t.season.gp}</td><td>${t.season.w}</td><td>${t.season.l}</td><td>${t.season.t}</td><td class="pts-hl">${t.season.pts}</td></tr>`;
        }).join('');
        document.getElementById(id).innerHTML = h;
    };   
    renderStandings('eastStand', 'east'); renderStandings('westStand', 'west');

    const k = statMode; 
    let maxGP = k === 'season' ? Math.max(1, ...league.map(t => t.season.gp)) : Math.max(1, ...Object.values(playerStats).map(p => (p[k] && p[k].gp) ? p[k].gp : 0));
    let mskp = Math.max(1, Math.floor(maxGP * 0.25)); let mglp = Math.max((maxGP >= 4 ? 2 : 1), Math.floor(maxGP * 0.45));
    
    //  Added safety checks to ensure p[k] exists before filtering
    const sks = Object.values(playerStats).filter(p => p.pos !== 'G' && p[k] && p[k].gp >= mskp); 
    const gls = Object.values(playerStats).filter(p => p.pos === 'G' && p[k] && p[k].gp >= mglp);

    const renderLeaderboard = (id, ti, d, sf, vf, lim) => {    
        let h = `<div style="background:#111; padding:10px; text-align:center; color:var(--ea-yellow); text-shadow:2px 2px 0px #000;">${ti}</div><table><tr style="background:#222;"><th>#</th><th>PLAYER</th><th>VAL</th></tr>`; 
        d.sort(sf).slice(0,lim).forEach((p,idx) => { h += `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td>${idx+1}</td><td>${p.injury?.daysRemaining > 0 ? '[INJ] ' : ''}${p.name} <span class="team-hl">${p.teamCode}</span></td><td class="pts-hl">${vf(p)}</td></tr>`; }); h += `</table>`; document.getElementById(id).innerHTML = h; 
    };
    
    renderLeaderboard('pointsContainer', 'POINTS', [...sks], (a,b) => ((b[k].g+b[k].a) - (a[k].g+a[k].a)), x => x[k].g+x[k].a, 25); 
    renderLeaderboard('goalsContainer', 'GOALS', [...sks], (a,b) => (b[k].g - a[k].g), x => x[k].g, 25); 
    renderLeaderboard('assistsContainer', 'ASSISTS', [...sks], (a,b) => (b[k].a - a[k].a), x => x[k].a, 25); 
    renderLeaderboard('gaaContainer', 'GAA', [...gls], (a,b) => { const ga = a[k].gp > 0 ? (a[k].sa - a[k].sv) / a[k].gp : 99; const gb = b[k].gp > 0 ? (b[k].sa - b[k].sv) / b[k].gp : 99; return ga - gb; }, x => x[k].gp > 0 ? ((x[k].sa - x[k].sv) / x[k].gp).toFixed(2) : "0.00", 25); 
    renderLeaderboard('svContainer', 'SV%', [...gls], (a,b) => { const sa = a[k].sa > 0 ? a[k].sv / a[k].sa : 0; const sb = b[k].sa > 0 ? b[k].sv / b[k].sa : 0; return sb - sa; }, x => x[k].sa > 0 ? (x[k].sv / x[k].sa).toFixed(3) : ".000", 25); 
    renderLeaderboard('soContainer', 'SO', [...gls], (a,b) => (b[k].so - a[k].so), x => x[k].so, 10);
    
    let isScheduleDone = false;
    if (currentDay < calendar.length) {
        const dg = getGamesForDay(currentDay);
        if (dg.length > 0 && dg.every(x => x && x.result)) isScheduleDone = true;
    } else { isScheduleDone = true; }
    const btnNext = document.getElementById('btnNextDay');
    if (btnNext) btnNext.disabled = !isScheduleDone;

    syncArenaScoreboardUI();
    
    // Update stat panels for UI
    if (typeof syncTeamsFromLeague === 'function') syncTeamsFromLeague();
    if (typeof updatePlayerStats === 'function') updatePlayerStats();
    if (typeof updateStandings === 'function') updateStandings();
    renderLeagueTeamStats();
    if (typeof updateScheduleView === 'function') updateScheduleView();
}


function triggerLoadBackup() {
    const fileInput = document.getElementById('saveFileInput');
    if (fileInput) {
        // Simulates a click on the hidden file input to open the file browser
        fileInput.click(); 
    } else {
        console.error("Error: saveFileInput element not found in the DOM.");
    }
}

function exportSaveData() {
    const payload = buildSavePayload();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    const ts = new Date().toISOString().slice(0, 10);
    a.setAttribute("download", `nhl94_dynasty_backup_${ts}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function importSaveData(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            const normalized = normalizeSavePackage(parsed);
            if (!normalized || !isSupportedSaveVersion(normalized.meta.version))
                return displaySaveStateInfo('Unsupported save version — cannot import.', 'error');
            if (!isValidSaveData(normalized.payload))
                return displaySaveStateInfo('Invalid save file — data missing or corrupted.', 'error');
            applyLoadedSave(normalized.payload);
            saveGame({ force: true });
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('seasonYearDisplay').innerText = currentSeason;
            updateUI();
            renderSaveSlotHistory();
            if (isPlayoffs) initPlayoffsUI();
            displaySaveStateInfo('Backup imported successfully.', 'success');
        } catch (err) {
            displaySaveStateInfo(`Import failed: ${err.message}`, 'error');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function clearSaveSlot() {
    const slotSelect = document.getElementById('saveSlotSelect');
    if (!slotSelect) return;
    
    const selectedSlot = slotSelect.value;
    
    // Prevent accidental deletions with a confirmation prompt
    if (confirm(`Are you sure you want to delete the data in ${selectedSlot}? This cannot be undone.`)) {
        
        // Remove the specific slot from local storage
        localStorage.removeItem(`nhl94_save_${selectedSlot}`);
        
        console.log(`${selectedSlot} data cleared.`);
        
        // Refresh the UI if these helper functions are defined
        if (typeof renderSaveSlotHistory === 'function') renderSaveSlotHistory();
        if (typeof updateSaveMetadataDisplay === 'function') updateSaveMetadataDisplay(selectedSlot);
    }
}

function loadDefaultGoogleSheets(event) {
    if (event) event.preventDefault();

    const sheetInputs = [
        'teamSheetUrl', 
        'playerSheetUrl', 
        'scheduleSheetUrl', 
        'eventLogSheetUrl'
    ];

    sheetInputs.forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.value = '';
        }
    });

    console.log("Sheet URLs reset. Engine will default to sample data.");

    if (typeof resetSheetUrlsToDefault === 'function') {
        resetSheetUrlsToDefault();
    }
}
