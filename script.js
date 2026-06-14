// =========================================================
// NHL '94 PRO SIMULATOR - MASTER JAVASCRIPT ENGINE
// =========================================================
// =========================================================
// 1. CORE UTILITIES (Must be defined first)
// =========================================================

    // =========================================================
    // 🧠 ARCHETYPE BEHAVIOR MULTIPLIERS (Complete Master List)
    // =========================================================
    const archMods = {
    // --- FORWARDS (Balanced for higher goal/assist totals) ---
    "SUPERSTAR":      { shotRate: 1.40, penaltyRate: 0.70,  assistRate: 1.40 }, // Increased assistRate to reflect their well-rounded dominance
    "SNIPER":         { shotRate: 1.75, penaltyRate: 0.85,  assistRate: 0.83 }, // Higher shotRate, lower assistRate to specialize them
    "PLAYMAKER":      { shotRate: 0.88, penaltyRate: 0.80,  assistRate: 1.70 }, // Lower shotRate, significantly higher assistRate
    "SPEEDSTER":      { shotRate: 1.15, penaltyRate: 0.80,  assistRate: 1.15 },
    "DANGLER":        { shotRate: 1.10, penaltyRate: 0.80,  assistRate: 1.30 },
    "POWER FORWARD":  { shotRate: 1.20, penaltyRate: 1.20,  assistRate: 0.97 },
    "TWO-WAY STAR F": { shotRate: 1.09, penaltyRate: 0.95,  assistRate: 1.15 },
    "TWO-WAY FWD":    { shotRate: 0.95, penaltyRate: 0.95,  assistRate: 1.05 },
    "GRINDER":        { shotRate: 0.98, penaltyRate: 1.30,  assistRate: 0.90 },
    "ENFORCER F":     { shotRate: 0.50, penaltyRate: 1.60,  assistRate: 0.50 },
    "PRO OFFENSIVE FWD": { shotRate: 1.14, penaltyRate: 0.75,  assistRate: 1.14 },
    "PRO DEFENSIVE FWD": { shotRate: 0.89, penaltyRate: 0.75,  assistRate: 1.05 },
    "OFFENSIVE FWD":  { shotRate: 0.90, penaltyRate: 1.00,  assistRate: 1.00 },
    "DEFENSIVE FWD":  { shotRate: 0.75, penaltyRate: 1.00,  assistRate: 0.95 },

    // --- DEFENSEMEN ---
    "FRANCHISE D":    { shotRate: 1.23, penaltyRate: 0.80,  assistRate: 1.35 },
    "QUARTERBACK":    { shotRate: 0.99, penaltyRate: 0.85,  assistRate: 1.60 }, // Maximize playmaking from the blueline
    "BOOMER":         { shotRate: 1.45, penaltyRate: 1.00,  assistRate: 0.92 },
    "SHUTDOWN":       { shotRate: 0.80, penaltyRate: 1.00,  assistRate: 0.95 },
    "TWO-WAY STAR":   { shotRate: 1.00, penaltyRate: 0.90,  assistRate: 1.15 },
    "TWO-WAY D":      { shotRate: 0.97, penaltyRate: 1.00,  assistRate: 1.05 },
    "PRO OFFENSIVE D":{ shotRate: 1.05, penaltyRate: 0.70,  assistRate: 1.15 },
    "PRO DEFENSIVE D":{ shotRate: 0.80, penaltyRate: 0.70,  assistRate: 0.95 },
    "OFFENSIVE D":    { shotRate: 0.99, penaltyRate: 1.00,  assistRate: 1.05 },
    "DEFENSIVE D":    { shotRate: 0.75, penaltyRate: 1.10,  assistRate: 0.95 },
    "ENFORCER D":     { shotRate: 0.70, penaltyRate: 1.60,  assistRate: 0.60 }
};

    function getLeadershipScore(pName) {
    const p = playerStats[pName];
    if (!p) return 50;
    
    // We derive leadership from Experience (using Age if you have it, 
    // otherwise Aggressiveness/Stick Handling to represent veteran savvy)
    let age = parseInt(p.attr.age) || 25; 
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
    if (ps.injury && ps.injury.daysRemaining > 0) badges += '🚑';
    if (ps.suspended && ps.suspended.days > 0) badges += '⛔';
    let isHot = ps.macro_streak === 'HOT' || ps.micro_streak === 'HOT' || ps.streakType === 'hot';
    let isCold = ps.macro_streak === 'COLD' || ps.micro_streak === 'COLD' || ps.streakType === 'cold';
    if (isHot) badges += '🔥';
    else if (isCold) badges += '❄️';
    if (ps.asgMvp) badges += '⭐';
    if (ps.career && ps.career.awards > 0) badges += '🏆';
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
        out += badge('🚑', `INJURED ${ps.injury.daysRemaining}d`, '#FF5555', '#2a0000');
    if (ps.suspended && ps.suspended.days > 0)
        out += badge('⛔', `SUSPENDED ${ps.suspended.days}d`, '#FF8800', '#2a1400');
    if (isHot)
        out += badge('🔥', streakLen >= 5 ? `HOT ${streakLen}G` : 'HOT', '#FFAA00', '#1a1000');
    else if (isCold)
        out += badge('❄️', 'COLD', '#55FFFF', '#001a1a');
    if (!isHot && !isCold && ps.consPointless >= 3)
        out += badge('📉', `SLUMP ${ps.consPointless}G`, '#FF6666', '#1a0000');
    if (fatigue >= 6)
        out += badge('😴', `FATIGUED -${fatigue}`, '#FFAA44', '#1a1000');
    if (ps.asgMvp)
        out += badge('⭐', 'ASG MVP', '#FFD700', '#1a1400');
    if (ps.asgAppearances > 0)
        out += badge('🌟', `ALL-STAR ${ps.asgAppearances}x`, '#00FFFF', '#001a1a');
    if (ps.career && ps.career.awards > 0)
        out += badge('🏆', `${ps.career.awards} TROPHY`, '#FFD700', '#1a1400');
    if (ps.potential === 'Franchise')
        out += badge('💎', 'FRANCHISE', '#AA88FF', '#0e0022');
    if (ps.age <= 21)
        out += badge('🐣', 'ROOKIE', '#88FF88', '#001a00');
    else if (ps.age >= 35)
        out += badge('🦅', 'VETERAN', '#AAAAAA', '#111111');
    if (ps.milestones && ps.milestones.length > 0)
        out += badge('🏅', `${ps.milestones.length} MILESTONE`, '#00CCFF', '#001a22');

    if (!out) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 4px 0;">${out}</div>`;
}

function getWeightValue(grade) {
    const weightMap = {
        'A+': () => roll(185,194 ), 'A': () => roll(195,204 ), 'B': () => roll(205,214 ),
        'C': () => roll(215,224 ),  'D': () => roll(225,234 ), 'F': () => roll(235,244 ), 'F-': () => roll(245,254 )
    };
    return weightMap[grade] || 205; // Fallback to neutral 205lbs
}

function getWeightModifier(weightGrade, arch) {
    const w = getWeightValue(weightGrade);
    
    if (arch === 'POWER FORWARD') {
        // Power Forwards: Reward heavy (230-240), penalize light (185-195)
        return w >= 215 ? 1.15 : (w <= 195 ? 0.90 : 1.05);
    } 
    
    if (arch === 'SPEEDSTER' || arch === 'DANGLER') {
        // Speedsters/Danglers: Reward light (185-195), penalize heavy (230-240)
        return w <= 204 ? 1.15 : (w >= 230 ? 0.90 : 1.05);
    }
    
    return 1.0; // Other archetypes are unaffected
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
    
    const cleanVal = String(val).toUpperCase().trim();
    
    // If the letter exists, roll the dice. Otherwise, fallback safely to 70.
    return map[cleanVal] ? map[cleanVal]() : 70; 
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


// ==========================================
// 🏒 GLOBAL ATTRIBUTE & ARCHETYPE UTILITIES
// ==========================================

// Attribute Getters: Handle potential naming inconsistencies in spreadsheet headers
const getOff = (pName) => parseInt(playerStats[pName]?.attr.off || playerStats[pName]?.attr.OFF || 0);
const getDef = (pName) => parseInt(playerStats[pName]?.attr.def || playerStats[pName]?.attr.DEF || 0);
const getChk = (pName) => parseInt(playerStats[pName]?.attr.chk || playerStats[pName]?.attr.CHK || 0);
const getWgt = (pName) => getGradeMod(playerStats[pName]?.attr.weight || 'C'); // Column AC
const getPly = (pName) => playerStats[pName]?.attr.play || 'B'; // Column AD
const getArch = (pName) => playerStats[pName]?.archetype || 'Unknown'; // Column AE

/**
 * Generates a perfectly balanced 60-minute game schedule for a team
 * Handles strict limits, rating closeness, and the defense deployment matrix.
 */
function generateTeam60MinSchedule(struct) {
    if (!struct || !struct.f || !struct.d) {
        return { fSched: Array(60).fill(0), dSched: Array(60).fill(0) };
    }

    // Helper to extract line/pairing average overall ratings
    const getUnitAverageOvr = (players) => {
        if (!players || players.length === 0) return 75;
        let sum = players.reduce((acc, p) => acc + (typeof getLiveIceOvr === 'function' ? getLiveIceOvr(p.name) : (p.ovr || 75)), 0);
        return sum / players.length;
    };

    let f1Ovr = getUnitAverageOvr(struct.f[0]);
    let f2Ovr = getUnitAverageOvr(struct.f[1]);
    let f3Ovr = getUnitAverageOvr(struct.f[2]);
    let f4Ovr = getUnitAverageOvr(struct.f[3]);

    // Base target minutes (Middle ground of your requested limits, must total 60)
    let fMins = [20, 17, 14, 9]; 

    // RULE A: Line 1 heavily outweighs all other lines -> Play near max (22 minutes)
    let bottomLinesAvg = (f2Ovr + f3Ovr + f4Ovr) / 3;
    if (f1Ovr - bottomLinesAvg >= 8) {
        fMins[0] = 22;
    }

    // RULE B: Even if Line 3 has lower OVR than Line 4, still play Line 3 more
    if (f4Ovr > f3Ovr) {
        fMins[2] = Math.max(fMins[2], fMins[3] + 2);
    }

    // RULE C: If lines OVR are within 3 rating points, give similar ice time
    const threshold = 3;
    if (Math.abs(f1Ovr - f2Ovr) <= threshold) { let avg = (fMins[0] + fMins[1]) / 2; fMins[0] = avg; fMins[1] = avg; }
    if (Math.abs(f2Ovr - f3Ovr) <= threshold) { let avg = (fMins[1] + fMins[2]) / 2; fMins[1] = avg; fMins[2] = avg; }
    if (Math.abs(f3Ovr - f4Ovr) <= threshold) { let avg = (fMins[2] + fMins[3]) / 2; fMins[2] = avg; fMins[3] = avg; }

    // Enforce strict requested boundary clamps for forwards
    fMins[0] = Math.max(18, Math.min(22, fMins[0]));
    fMins[1] = Math.max(16, Math.min(18, fMins[1]));
    fMins[2] = Math.max(13, Math.min(15, fMins[2]));
    fMins[3] = Math.max(8, Math.min(12, fMins[3]));

    // Round and force alignment to exactly 60 total game minutes
    let finalFCounts = fMins.map(m => Math.round(m));
    while (finalFCounts.reduce((a, b) => a + b, 0) < 60) finalFCounts[0]++;
    while (finalFCounts.reduce((a, b) => a + b, 0) > 60) finalFCounts[3]--;

    // Build the Forward Schedule sequence and shuffle it so lines rotate realistically
    let fSched = [];
    finalFCounts.forEach((count, idx) => { for(let i=0; i<count; i++) fSched.push(idx); });
    fSched.sort(() => Math.random() - 0.5);

    // --- DEFENSE PERCENTAGE DISTRIBUTION MATRIX LOGIC ---
    let dSched = [];
    fSched.forEach(fLine => {
        let roll = Math.random();
        let chosenPair = 0;
        
        if (fLine === 0) { // Line 1 is on the ice
            if (roll < 0.65) chosenPair = 0;       // 65% chance for Pair 1
            else if (roll < 0.85) chosenPair = 1;  // 20% chance for Pair 2
            else chosenPair = 2;                   // 15% chance for Pair 3
        } else if (fLine === 1) { // Line 2 is on the ice
            if (roll < 0.20) chosenPair = 0;       // 20% chance for Pair 1
            else if (roll < 0.75) chosenPair = 1;  // 55% chance for Pair 2
            else chosenPair = 2;                   // 25% chance for Pair 3
        } else if (fLine === 2) { // Line 3 is on the ice
            if (roll < 0.10) chosenPair = 0;       // 10% chance for Pair 1
            else if (roll < 0.30) chosenPair = 1;  // 20% chance for Pair 2
            else chosenPair = 2;                   // 70% chance for Pair 3
        } else { // Line 4 is on the ice
            if (roll < 0.05) chosenPair = 0;       // 5% chance for Pair 1
            else if (roll < 0.15) chosenPair = 1;  // 10% chance for Pair 2
            else chosenPair = 2;                   // 85% chance for Pair 3
        }
        dSched.push(chosenPair);
    });

    return { fSched, dSched };
}

// ==========================================
// 📋 FRANCHISE MODE: CUSTOM LINE HELPERS
// ==========================================
// 1. Load any previously saved lines
let customLines = JSON.parse(localStorage.getItem('nhl94_customLines')) || {};

// 2. Save Lines to Memory
function saveTeamLines(tk, fLines, dLines, gPool) {
    customLines[tk] = {
        f: fLines.map(line => line.map(p => p.name)),
        d: dLines.map(line => line.map(p => p.name)),
        g: gPool.map(p => p.name)
    };
    localStorage.setItem('nhl94_customLines', JSON.stringify(customLines));
    alert(`Lines saved successfully for ${tk.toUpperCase()}!`);
}

// 3. Clear Lines (Return to AI Coach)
function clearTeamLines(tk) {
    delete customLines[tk];
    localStorage.setItem('nhl94_customLines', JSON.stringify(customLines));
    alert(`Custom lines cleared. The AI will now coach ${tk.toUpperCase()}.`);
}

// 4. The Swapper (PASTE IT HERE!)
function swapPlayersInStructure(struct, name1, name2) {
    let pos1 = null, pos2 = null;

    const findLocation = (arrays, groupName) => {
        for (let i = 0; i < arrays.length; i++) {
            for (let j = 0; j < arrays[i].length; j++) {
                if (arrays[i][j].name === name1) pos1 = { group: groupName, i, j, p: arrays[i][j] };
                if (arrays[i][j].name === name2) pos2 = { group: groupName, i, j, p: arrays[i][j] };
            }
        }
    };

    findLocation(struct.f, 'f');
    findLocation(struct.d, 'd');
    
    struct.g.forEach((p, j) => {
        if (p.name === name1) pos1 = { group: 'g', i: 0, j, p };
        if (p.name === name2) pos2 = { group: 'g', i: 0, j, p };
    });

    if (pos1 && pos2) {
        if (pos1.group === 'g') struct[pos1.group][pos1.j] = pos2.p;
        else struct[pos1.group][pos1.i][pos1.j] = pos2.p;
        if (pos2.group === 'g') struct[pos2.group][pos2.j] = pos1.p;
        else struct[pos2.group][pos2.i][pos2.j] = pos1.p;
        
        return true; 
    }
    return false; 
}

// 2. The Integrated Line Builder
function buildSpecialTeams(fullRosterArray, type) {
    // 1. FORCE FRESH POOLS: Filter from the full roster to ignore 5v5 line assignments
    const allForwards = fullRosterArray.filter(p => ['C', 'LW', 'RW'].includes(p.pos));
    const allDefenders = fullRosterArray.filter(p => ['LD', 'RD', 'D'].includes(p.pos));

    let teams = { 1: [], 2: [] };

    if (type === 'PP') {
        // --- POWER PLAY LOGIC ---
        // Sort by Offensive Awareness ('offawr')
        const sortByOffense = (a, b) => {
            const offA = playerStats[a.name]?.attr?.offawr || 0;
            const offB = playerStats[b.name]?.attr?.offawr || 0;
            return offB - offA; // Descending
        };

        const sortedF = [...allForwards].sort(sortByOffense);
        const sortedD = [...allDefenders].sort(sortByOffense);

        // PP1: Top 4 Forwards (indices 0-3), Best Defender (index 0)
        teams[1] = [
            ...sortedF.slice(0, 4), 
            sortedD[0] 
        ].filter(Boolean);

        // PP2: Next 4 Forwards (indices 4-7), 2nd Best Defender (index 1)
        teams[2] = [
            ...sortedF.slice(4, 8), 
            sortedD[1] 
        ].filter(Boolean);
        
    } else if (type === 'PK') {
        // --- PENALTY KILL LOGIC ---
        // Sort by Combined Defensive Utility (Defense + Checking)
        const sortByDefense = (a, b) => {
            const defA = (playerStats[a.name]?.attr?.def || 0) + (playerStats[a.name]?.attr?.chk || 0);
            const defB = (playerStats[b.name]?.attr?.def || 0) + (playerStats[b.name]?.attr?.chk || 0);
            return defB - defA; // Descending
        };

        const sortedF = [...allForwards].sort(sortByDefense);
        const sortedD = [...allDefenders].sort(sortByDefense);

        // PK1: Top 2 Forwards (indices 0-1), Top 2 Defenders (indices 0-1)
        teams[1] = [
            ...sortedF.slice(0, 2), 
            ...sortedD.slice(0, 2)
        ].filter(Boolean);

        // PK2: Next 2 Forwards (indices 2-3), Next 2 Defenders (indices 2-3)
        teams[2] = [
            ...sortedF.slice(2, 4), 
            ...sortedD.slice(2, 4)
        ].filter(Boolean);
    }

    return teams;
}

// 3. Logic to find SN + PL pairings
function findDuo(wings) {
    for (let i = 0; i < wings.length; i++) {
        let p1 = wings[i];
        let arch1 = getArch(p1.name);
        
        if (arch1 === 'SN' || arch1 === 'PL') {
            let targetArch = (arch1 === 'SN') ? 'PL' : 'SN';
            // Find best available partner
            let partnerIdx = wings.findIndex((w, idx) => idx !== i && getArch(w.name) === targetArch);
            
            if (partnerIdx !== -1) {
                return { p1: p1, p2: wings[partnerIdx] };
            }
        }
    }
    return null;
}

function buildSpecialTeams(fullRosterArray, type) {
    // 1. Force fresh pools from the full roster array
    const allForwards = fullRosterArray.filter(p => ['C', 'LW', 'RW'].includes(p.pos));
    const allDefenders = fullRosterArray.filter(p => ['LD', 'RD', 'D'].includes(p.pos));

    let teams = { 1: [], 2: [] };

    if (type === 'PP') {
        // Sort by Offensive Awareness
        const sortByOff = (a, b) => {
            const offA = playerStats[a.name]?.attr?.offawr || 0;
            const offB = playerStats[b.name]?.attr?.offawr || 0;
            return offB - offA;
        };

        const sortedF = [...allForwards].sort(sortByOff);
        const sortedD = [...allDefenders].sort(sortByOff);

        // PP1: Top 4 Forwards, Best Defender
        teams[1] = [...sortedF.slice(0, 4), sortedD[0]].filter(Boolean);
        // PP2: Next 4 Forwards, 2nd Best Defender
        teams[2] = [...sortedF.slice(4, 8), sortedD[1]].filter(Boolean);

    } else if (type === 'PK') {
        // Sort by combined Defensive utility (Defense + Checking)
        const sortDef = (a, b) => {
            const defA = (playerStats[a.name]?.attr?.def || 0) + (playerStats[a.name]?.attr?.chk || 0);
            const defB = (playerStats[b.name]?.attr?.def || 0) + (playerStats[b.name]?.attr?.chk || 0);
            return defB - defA;
        };

        const sortedF = [...allForwards].sort(sortDef).slice(0, 8); //  Fixed variable name
        const sortedD = [...allDefenders].sort(sortDef).slice(0, 4); //  Fixed variable name

        // PK1: Top 2 Forwards, Top 2 Defenders
        teams[1] = [...sortedF.slice(0, 2), ...sortedD.slice(0, 2)].filter(Boolean);
        // PK2: Next 2 Forwards, Next 2 Defenders
        teams[2] = [...sortedF.slice(2, 4), ...sortedD.slice(2, 4)].filter(Boolean);
    }

    return teams;
}

// =========================================================
// 🧠 ARCHETYPE BEHAVIOR MULTIPLIERS
// =========================================================
/**
 * 🛡️ THE ARCHETYPE FIREWALL
 * Prevents stacking 2 Snipers or 2 Playmakers on the same unit
 */
function canAddForward(currentLine, newPlayer, isPowerPlay) {
    // 1. If it's a Power Play, bypass the firewall immediately.
    if (isPowerPlay === true) {
        return true; 
    }

    // 2. Safely get the new player's archetype and convert to uppercase to avoid typos.
    const newArch = (newPlayer.archetype || 'UNKNOWN').toUpperCase();

    // 3. We only care about restricting Snipers and Playmakers.
    if (newArch !== 'SNIPER' && newArch !== 'PLAYMAKER') {
        return true; 
    }

    // 4. Check the current line for a match.
    for (let i = 0; i < currentLine.length; i++) {
        const existingPlayer = currentLine[i];
        if (!existingPlayer) continue; 

        const existingArch = (existingPlayer.archetype || 'UNKNOWN').toUpperCase();
        
        if (existingArch === newArch) {
            return false; 
        }
    }

    return true;
}

function getSortedByAttr(players, category, attr) {
    return [...players].sort((a, b) => {
        const valA = playerStats[a.name].attr[attr] || 0;
        const valB = playerStats[b.name].attr[attr] || 0;
        return valB - valA; // Descending
    });
}

let awardConfig = { streaks: true, chemistry: true, rivalries: true, aging: false, draft: false, retirements: false, headlines: true, milestones: true, injuries: true, legacy_schedule: true, trades: false };
let league = []; let rosters = {}; let playerStats = {}; let tradeLog = []; let hallOfFame = []; let leagueHistory = []; let retiredPlayers = []; let calendar = []; let realDatesMap = []; let gameMilestones = []; let monthSnapshot = {}; let pendingTrades = []; let playoffBracket = { round: 1, series: [] }; let teams = {}; let gameData = {}; let selectedTeam = null; let currentMonth = 1;
let currentDay = 0; let currentSeason = 1; let isPlayoffs = false; let isASG = false; let activeIdx = null; let statMode = 'season'; let isSimulating = false; let isSimSeason = false; let isTurboMode = false; let currentCupChamp = ""; let activeSubInfo = null; let customRosterData = null; let customRosterSource = 'google'; let customTeamData = null; let customPlayerData = null; let customScheduleData = null; let customEventLogData = null; let eventLogData = null;
let watchBroadcastDay = null; let watchBroadcastIdx = null;

const SAVE_STORAGE_KEY = 'nhl94dynasty'; const HISTORY_STORAGE_KEY = 'nhl94history'; const HOF_STORAGE_KEY = 'nhl94hof'; const RETIRED_STORAGE_KEY = 'nhl94retired';
const SAVE_SLOT_KEYS = { AUTO: SAVE_STORAGE_KEY, SLOT_1: `${SAVE_STORAGE_KEY}_slot1`, SLOT_2: `${SAVE_STORAGE_KEY}_slot2`, SLOT_3: `${SAVE_STORAGE_KEY}_slot3` };
const LEGACY_SAVE_VERSION = 1; const CURRENT_SAVE_SCHEMA_VERSION = 2; const SUPPORTED_SAVE_VERSIONS = [LEGACY_SAVE_VERSION, CURRENT_SAVE_SCHEMA_VERSION];
let saveGameTimer = null;

// =========================================================
// ⚙️ GAME CONFIGURATION (Centralized Magic Numbers)
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
        // Compress the JSON string before saving
        let compressedData = LZString.compressToUTF16(JSON.stringify(data));
        localStorage.setItem('nhl94dynasty', compressedData);
        console.log("Dynasty saved successfully!");
    } catch (e) {
        console.error("[SAVE ERROR] Storage is full or inaccessible:", e);
    }
}

function loadSavePayload() {
    let rawData = localStorage.getItem('nhl94dynasty');
    if (rawData) {
        // Decompress when loading
        let decompressedData = LZString.decompressFromUTF16(rawData);
        return JSON.parse(decompressedData);
    }
    return null;
}
function saveGame({slot = 'AUTO', force = false} = {}) { const storageKey = getSaveSlotKey(slot); if (saveGameTimer) clearTimeout(saveGameTimer); if (force) { writeSavePayload(buildSavePayload()); return; } saveGameTimer = setTimeout(() => writeSavePayload(buildSavePayload()), 220); }
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

function getGamesForDay(day = currentDay) {
    return Array.isArray(calendar[day]) ? calendar[day] : [];
}

function getGameAt(day = currentDay, idx = activeIdx) {
    const dayGames = getGamesForDay(day);
    if (!Number.isInteger(idx) || idx < 0 || idx >= dayGames.length) return null;
    const g = dayGames[idx];
    return (g && g.h && g.a) ? g : null;
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
        aScore.innerText = g.result ? String(g.result.aG) : '0';
        hScore.innerText = g.result ? String(g.result.hG) : '0';
        jumbo.innerText = g.result ? 'GAME FINAL.' : (isAsgMatchup ? 'ALL-STAR GAME — PUCK DROP PENDING...' : 'PUCK DROP PENDING...');
        return;
    }

    if (activeIdx !== null) activeIdx = null;
    btn.innerText = 'ARENA';
    aName.innerText = 'AWAY';
    hName.innerText = 'HOME';
    if (jLogoA) jLogoA.src = '';
    if (jLogoH) jLogoH.src = '';
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
function calculateGoalieOverall(attr) {
    // Total weight = 5.0 + 1.0 + 5.0 + 4.5 + 1.0 + 1.0 + 1.0 + 1.0 = 19.5
    const totalWeight = 19.5; 

    let weightedSum = 
        (attr.agil * 5.0) +
        (attr.speed * 1.0) +
        (attr.def * 5.0) +             // Def Aware
        (attr.puckControl * 4.5) +
        (attr.stickRight * 1.0) +
        (attr.stickLeft * 1.0) +
        (attr.gloveRight * 1.0) +
        (attr.gloveLeft * 1.0);

    // Returns a properly scaled 30-99 overall rating
    return Math.round(weightedSum / totalWeight); 
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
            
            // Replace your loaded block with this:
            const loaded = rows.slice(1).map((row, rowIdx) => { 
                const obj = {}; 
                headers.forEach((h, i) => { 
                    let val = row[i] !== undefined ? String(row[i]).trim() : '';
                    obj[h] = val; 
                    
                    // 🛡️ AUTO-DETECT: Look for the column named "Position" or "Pos" regardless of where it is
                    let upperHeader = String(h).toUpperCase().trim();
                    if (upperHeader === 'POSITION' || upperHeader === 'POS' || upperHeader === 'ROLE') { 
                        obj.pos = val.toUpperCase().replace(/\u00A0/g, ' ').trim();
                    }
                }); 
                
                // If the column was totally empty, default to F
                if (!obj.pos) obj.pos = 'F';

                // Print just the first 5 players to prove it found the right column
                if (rowIdx < 5) {
                    console.log(`✅ DEBUG DATA PULL: ${obj.Name || 'Unknown'} | Mapped Pos: "${obj.pos}"`);
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

function importRosterFromCSV(csvText) {
    const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const roster = [];

    if (rows.length < 2) return roster;

    const headerRow = rows[0].map(cell => String(cell || '').trim().toUpperCase());
    const getIdx = (aliases, fallback) => {
        for (const alias of aliases) {
            const key = String(alias || '').trim().toUpperCase();
            const idx = headerRow.indexOf(key);
            if (idx !== -1) return idx;
        }
        return fallback;
    };

    const teamCodeIdx = getIdx(['TEAM CODE', 'TEAM', 'TEAMCODE'], 2);
    const firstNameIdx = getIdx(['FIRST NAME', 'FNAME', 'FIRST'], 8);
    const lastNameIdx = getIdx(['LAST NAME', 'LNAME', 'LAST'], 4);
    const posIdx = getIdx(['POS', 'POSITION'], 7);
    const overallIdx = getIdx(['OVERALL', 'OVR'], 19);
    const weightIdx = getIdx(['WEIGHT', 'WGT'], 20);
    const agilityIdx = getIdx(['AGILITY', 'AGIL'], 17);
    const speedIdx = getIdx(['SPEED'], 18);
    const shotPowerIdx = getIdx(['SHOT POWER', 'SHOTPOWER', 'SHOT_POW', 'SHOT PWR'], 9);
    const passingIdx = getIdx(['PASSING', 'PASS'], 10);
    const aggressionIdx = getIdx(['AGGRESSION', 'AGGR'], 11);
    const roughnessIdx = getIdx(['ROUGHNESS', 'ROUGH'], 12);
    const enduranceIdx = getIdx(['ENDURANCE', 'ENDUR'], 13);
    const checkingIdx = getIdx(['CHECKING', 'CHK'], 14);
    const shotAccuracyIdx = getIdx(['SHOT ACCURACY', 'SHOT_ACCURACY', 'ACCURACY'], 15);
    const stickHandlingIdx = getIdx(['STICK HANDLING', 'STICKHANDLING', 'STKHND', 'STICKHND'], 16);
    const goalieDefIdx = getIdx(['G DEF', 'GDEF', 'GOALIE DEFENSE', 'GOALIE DEF', 'G DEFENSE'], 6);
    const careerGpIdx = getIdx(['GP', 'GAMES PLAYED', 'GAMES'], 22);
    const careerGIdx = getIdx(['G', 'GOALS'], 23);
    const careerAIdx = getIdx(['A', 'ASSISTS'], 24);
    const careerPtsIdx = getIdx(['PTS', 'POINTS'], 25);
    const careerPpgIdx = getIdx(['PPG'], 26);
    const careerPlusMinusIdx = getIdx(['PLUSMINUS', 'PLUS/MINUS', 'PLUS_MINUS'], 27);

    const getCell = (row, idx) => String(row[idx] || '').trim();
    const parseGradeStat = (row, idx, fallback = 60) => {
        const raw = getCell(row, idx);
        return raw === '' ? fallback : gradeToNumber(raw);
    };
    const parseIntCell = (row, idx, fallback = 0) => {
        const value = parseInt(getCell(row, idx), 10);
        return Number.isFinite(value) ? value : fallback;
    };
    const parseFloatCell = (row, idx, fallback = 0) => {
        const value = parseFloat(getCell(row, idx));
        return Number.isFinite(value) ? value : fallback;
    };

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.length) continue;

        const lastName = getCell(row, lastNameIdx);
        if (!lastName) continue;

        const firstName = getCell(row, firstNameIdx);
        const fullName = `${firstName} ${lastName}`.trim();
        const playerPosition = getCell(row, posIdx).toUpperCase();

        let playerAttributes;
        if (playerPosition === 'G') {
            playerAttributes = {
                goalieDefense: parseIntCell(row, goalieDefIdx, 30),
                agil: parseGradeStat(row, agilityIdx, 60),
                speed: parseGradeStat(row, speedIdx, 60)
            };
        } else {
            playerAttributes = {
                shotPower: parseGradeStat(row, shotPowerIdx, 60),
                passing: parseGradeStat(row, passingIdx, 60),
                aggression: parseGradeStat(row, aggressionIdx, 60),
                roughness: parseGradeStat(row, roughnessIdx, 60),
                endurance: parseGradeStat(row, enduranceIdx, 60),
                checking: parseGradeStat(row, checkingIdx, 60),
                shotAccuracy: parseGradeStat(row, shotAccuracyIdx, 60),
                stickHandling: parseGradeStat(row, stickHandlingIdx, 60),
                agil: parseGradeStat(row, agilityIdx, 60),
                speed: parseGradeStat(row, speedIdx, 60)
            };
        }

        const player = {
            teamCode: getCell(row, teamCodeIdx),
            name: fullName,
            pos: playerPosition,
            overall: parseIntCell(row, overallIdx, 30),
            weight: parseIntCell(row, weightIdx, 180),
            attr: playerAttributes,
            career: {
                gp: parseIntCell(row, careerGpIdx, 0),
                g: parseIntCell(row, careerGIdx, 0),
                a: parseIntCell(row, careerAIdx, 0),
                pts: parseIntCell(row, careerPtsIdx, 0),
                ppg: parseFloatCell(row, careerPpgIdx, 0),
                plusMinus: parseIntCell(row, careerPlusMinusIdx, 0)
            }
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


let specialTeams = {
    active: false,
    teamAdvantage: null, // 'HOME' or 'AWAY'
    timeRemaining: 0,    // Penalty clock in seconds
    strength: '5v5'      // '5v5', '5v4', '5v3', '4v4', etc.
};

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
    let roughness = 50;
    if (attacker.stats && attacker.stats.RGH) roughness = attacker.stats.RGH;
    else if (attacker.attr && attacker.attr.rough) {
        roughness = typeof attacker.attr.rough === 'string' ? 75 : attacker.attr.rough;
    }

    // Safely extract weight
    let aWeight = attacker.weight || (attacker.stats ? attacker.stats.WGT : 180) || 180;
    
    let penaltyChance = 0;

    // Scale chance based on the severity of the hit
    if (severity === 3) penaltyChance = 1.0; // Hard Violation (Guaranteed)
    else if (severity === 2) penaltyChance = (roughness / 100) * 0.60 * REF_STRICTNESS;
    else if (severity === 1) penaltyChance = (roughness / 100) * 0.25 * REF_STRICTNESS;

    // 🚨 THE BIG GUY BIAS: Referees penalize big hits from heavy players more frequently
    if (aWeight >= 215 && severity >= 2) {
        penaltyChance *= 1.30; // 30% higher chance of being called for a penalty
    }

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

// Example of how to trigger it:
function startPowerplay(advantageTeam, minutes) {
    specialTeams.active = true;
    specialTeams.teamAdvantage = advantageTeam;
    specialTeams.timeRemaining += (minutes * 60); // Convert minutes to seconds
    specialTeams.strength = '5v4';
    console.log(`POWERPLAY STARTED! ${advantageTeam} goes on the man advantage.`);
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
    if (!ps || !ps.attr) return 50;

    const getVal = (grade) => {
        const m = {
            'A+': 98, 'A': 94, 'A-': 88,
            'B+': 83, 'B': 78, 'B-': 72,
            'C+': 66, 'C': 60, 'C-': 55,
            'D': 45, 'F': 30
        };
        return m[String(grade || '').trim().toUpperCase()] || 60;
    };

    const rawStat = ps.attr[statName];
    const baseStat = (typeof rawStat === 'string')
        ? getVal(rawStat)
        : (Number.isFinite(rawStat) ? rawStat : 50);

    const fatigueMod = 1 - ((player.currentFatigue || 0) * 0.4);
    const decayedStat = (statName === 'END' || statName === 'endur')
        ? baseStat
        : baseStat * fatigueMod;

    // Apply morale modifier: morale 100 = neutral (1.0), 75 = -5% (0.95), 125 = +5% (1.05)
    const moraleMod = 1.0 + ((ps.morale - 100) * 0.0005);

    const composure = ((ps.attr.def || 50) * 0.5)
        + (getVal(ps.attr.endur || 'C') * 0.3)
        + ((ps.attr.ovr || 50) * 0.2);

    let pressure = 1.0;
    const tRemain = typeof finalTime !== 'undefined' ? finalTime : 999;
    const sDiff = typeof scoreDiff !== 'undefined' ? scoreDiff : 0;
    const isEN = typeof isEmptyNet !== 'undefined' ? isEmptyNet : false;

    if (tRemain <= 300) pressure = 1.15;
    if (tRemain <= 120 && Math.abs(sDiff) <= 1) pressure = 1.30;
    if (tRemain <= 60 && isEN) pressure = 1.50;

    const clutchPenalty = Math.max(0, (pressure * 100) - composure) * 0.005;
    const chaos = gameStatus.globalChaos || 0.15;
    const roll = (Math.random() * (1 - chaos)) + (0.5 * chaos);

    let teamMod = 0;
    if (gameStatus.momentum) {
        teamMod = (player.team === 'HOME') ? gameStatus.momentum.rel : -gameStatus.momentum.rel;
    }

    const finalValue = decayedStat * (roll + teamMod - clutchPenalty) * moraleMod;
    return Math.max(1, finalValue);
}
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
    // 1. Safely extract weights (Fallback to 180 lbs if missing)
    let aWeight = attacker.weight || (attacker.stats ? attacker.stats.WGT : 180) || 180;
    let vWeight = victim.weight || (victim.stats ? victim.stats.WGT : 180) || 180;

    // 2. Calculate Weight Differential Multiplier
    // If the attacker is 40 lbs heavier, they get a 1.4x (40%) power boost
    let weightDiff = aWeight - vWeight;
    let weightMod = Math.max(0.6, Math.min(1.5, 1.0 + (weightDiff / 100)));

    // 3. Calculate Strength Delta (NOW WITH WEIGHT MODIFIER!)
    let basePower = (attacker.stats.CHK * 0.7) + (attacker.stats.AGR * 0.3) + (gameStatus.globalChaos * 10);
    let power = basePower * weightMod; // Apply the physics
    let resistance = (victim.stats.BAL * (1 - victim.currentFatigue * 0.4)) + (vWeight * 0.2);

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
        
        console.log(`Hit Severity: ${severity} | Power: ${power.toFixed(2)} | Resistance: ${resistance.toFixed(2)} | Delta: ${delta.toFixed(2)}`);
    }   
    
    return severity;
}

function updateEngine(delta) {
   // --- SPECIAL TEAMS CLOCK ---
    if (specialTeams.active) {
        specialTeams.timeRemaining -= delta;
        
        if (specialTeams.timeRemaining <= 0) {
            specialTeams.active = false;
            specialTeams.teamAdvantage = null;
            specialTeams.timeRemaining = 0;
            specialTeams.strength = '5v5';
            console.log("Penalty killed. Back to 5-on-5 hockey.");
        }
    }
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

   // 3. Fatigue Accumulation (Shock Multiplier + Weight Tax)
    players.forEach(p => {
        let shockMult = p.isShocked ? (100 / 20) : 1.0; // 5x Drain during shock
        
        // 🚨 WEIGHT TAX: Heavy players carry more mass and drain energy slightly faster
        let pWeight = p.weight || (p.stats ? p.stats.WGT : 180) || 180;
        let weightTax = 1.0;
        if (pWeight > 220) weightTax = 1.15; // 15% faster drain for heavyweights
        else if (pWeight < 185) weightTax = 0.90; // 10% slower drain for smaller, lighter players

        // Apply all modifiers to the fatigue calculation
        let baseDrain = (0.001 * (1 + gameStatus.globalChaos) * shockMult * weightTax);
        p.currentFatigue += baseDrain / (p.stats.END / 100);
    });
}

// =========================================================
// 🏭 FACTORY FUNCTIONS FOR PLAYER STATS CREATION
// =========================================================
/**
 * Creates a standardized skater stats object
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} teamCode
 * @param {object} attributes - pre-parsed attr object
 * @returns {object} Complete skater stats object
 */
function createSkaterStats(firstName, lastName, teamCode, attributes) {
    const fullName = `${firstName} ${lastName}`;
    return {
        name: fullName,
        team: teamCode,
        teamCode: teamCode,
        pos: 'S',
        attr: attributes,
        potential: 'Star',
        streakType: 'stable',
        streakDur: 0,
        hasScored: false,
        consPointless: 0,
        recentPts: [],
        milestones: [],
        asgMvp: false,
        injury: { severity: 0, daysRemaining: 0 },
        cumulativeFatigue: 0,
        morale: 100,
        suspended: { days: 0, reason: "" },
        asgAppearances: 0,
        career: { gp: 0, g: 0, a: 0, pts: 0, pm: 0, pim: 0, ppg: 0, shg: 0, gwg: 0, asg: 0, s: 0, awards: 0 },
        careerPlayoff: { gp: 0, g: 0, a: 0, pts: 0, pm: 0, pim: 0, ppg: 0, shg: 0, gwg: 0, s: 0, toi: 0, svg: 0 },
        season: { gp: 0, g: 0, a: 0, pm: 0, pim: 0, ppg: 0, shg: 0, gwg: 0, s: 0, toi: 0, svg: 0 },
        playoff: { gp: 0, g: 0, a: 0, pm: 0, pim: 0, ppg: 0, shg: 0, gwg: 0, s: 0, toi: 0, svg: 0 }
    };
}

/**
 * Creates a standardized goalie stats object
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} teamCode
 * @param {object} attributes - pre-parsed attr object
 * @returns {object} Complete goalie stats object
 */
function createGoalieStats(firstName, lastName, teamCode, attributes) {
    const fullName = `${firstName} ${lastName}`;
    return {
        name: fullName,
        team: teamCode,
        teamCode: teamCode,
        pos: 'G',
        attr: attributes,
        potential: 'Depth',
        streakType: 'stable',
        streakDur: 0,
        hasScored: false,
        consPointless: 0,
        recentPts: [],
        milestones: [],
        asgMvp: false,
        asgAppearances: 0,
        injury: { severity: 0, daysRemaining: 0 },
        cumulativeFatigue: 0,
        morale: 100,
        suspended: { days: 0, reason: "" },
        goalieDays: 0,
        lastStart: -1,
        career: { gp: 0, g: 0, a: 0, pts: 0, pm: 0, pim: 0, ppg: 0, w: 0, l: 0, t: 0, so: 0, sv: 0, sa: 0 },
        careerPlayoff: { gp: 0, w: 0, l: 0, t: 0, so: 0, sv: 0, sa: 0, toi: 0, svg: 0 },
        season: { gp: 0, g: 0, a: 0, pm: 0, so: 0, sv: 0, sa: 0, w: 0, l: 0, t: 0, pim: 0, ppg: 0, lastGAA: 0, lastSV: 0, consStarts: 0, toi: 0, svg: 0 },
        playoff: { gp: 0, g: 0, a: 0, pm: 0, so: 0, sv: 0, sa: 0, w: 0, l: 0, pim: 0, ppg: 0, lastGAA: 0, lastSV: 0, consStarts: 0, toi: 0, svg: 0 }
    };
}

// =========================================================
// 🛡️ DEFENSIVE NULL CHECKS & SAFE ACCESSORS
// =========================================================
/**
 * Safely retrieve a nested stat value with default fallback
 * @param {string} playerName
 * @param {string} statPath - dot-notation path (e.g., 'attr.off', 'career.g')
 * @param {*} defaultValue - fallback if path not found
 * @returns {*} The stat value or default
 */
function safeGetStat(playerName, statPath, defaultValue = 0) {
    const ps = playerStats[playerName];
    if (!ps) return defaultValue;
    
    const keys = statPath.split('.');
    let value = ps;
    
    for (const key of keys) {
        if (value == null) return defaultValue;
        value = value[key];
    }
    
    return (value ?? defaultValue);
}

/**
 * Safely increment a player stat (handles missing objects gracefully)
 * @param {string} playerName
 * @param {string} statPath - dot-notation path
 * @param {number} amount - amount to increment (default 1)
 */
function safeIncrementStat(playerName, statPath, amount = 1) {
    const ps = playerStats[playerName];
    if (!ps) return;
    
    const keys = statPath.split('.');
    let obj = ps;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!obj[key]) obj[key] = {};
        obj = obj[key];
    }
    
    const lastKey = keys[keys.length - 1];
    obj[lastKey] = (obj[lastKey] ?? 0) + amount;
}

// --- INITIALIZATION ---
async function startNewGame(useCustomRoster = false) {  
    const btn = document.querySelector('button[onclick="startNewGame()"]'); 
    const origText = btn ? btn.innerText : "LOADING..."; 
    if (btn) { btn.innerText = "VALIDATING SATELLITE FEED..."; btn.disabled = true; }
    // 🛡️ FIX: Only check the roster length if we are actually using a custom roster!
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
            
            // 🛡️ THE FIX: Trust the CSV! Don't force them to 'F'!
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
    wgt: parseInt(getCol(r, ["WEIGHT", "WGT"], 21)) || 180,

    // --- OVERALL (Safe Fallback) ---
    ovr: parseInt(getCol(r, ["GOALIE NEW OVERALL", "OVERALL RATING", "OVERALL", "OVR"], 19)) || 70 
                        },
                        potential: Math.random() < 0.05 ? 'Franchise' : (Math.random() < 0.25 ? 'Top 6' : (Math.random() < 0.60 ? 'Depth' : 'Bust')),
                        career: { 
                            gp: parseInt(getCol(r, ["CAREER GP", "C_GP", "CAR GP"], -1)) || 0, 
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
                asgAppearances: 0,
                
                // 🚨 INJECT THE CALCULATED STATS DIRECTLY 🚨
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
                    gp: parseInt(getCol(r, ["CAREER GP", "C_GP", "CAR GP"], -1)) || 0,
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

        await loadScheduleFromCSV(customScheduleData); populateTeamSelect(); updateTradeDropdowns(); takeMonthSnapshot(); updateUI(); saveGame(); 
        document.getElementById('startScreen').style.display = 'none'; document.getElementById('appContainer').style.display = 'block'; 
        if (btn) { btn.innerText = origText; btn.disabled = false; }
    } catch (error) { console.error(error); alert("ERROR: Could not load data."); if (btn) { btn.innerText = origText; btn.disabled = false; } }
    initializeFranchiseVariables();
}

// --- RATING ENGINE (WITH LIVE OVR + FATIGUE MATH) ---
function getPlayerWeightedStats(pName) {
    const p = playerStats[pName]; 
    
    // 🚨 FALLBACK UPDATE: If player doesn't exist, return a 57
    if (!p) return { ovr: 57, tag: 'NONE' };

    let baseOvr = 57;
    let tag = "NONE";

    // --- GOALIES ---
    if (p.pos === 'G') {
        // 🚨 FALLBACK UPDATE: Default goalie rating is now 53
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
        let wgt = parseInt(p.attr.wgt || p.weight) || 180;

        // =========================================================
        // 🚨 CUSTOM OVR FORMULAS
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
            // FORWARD WEIGHTS: Values Offense, Speed, and Scoring (Now with Shot Power!)
            calcOvr = (
                (off * 0.30) +      // 30% Offense
                (def * 0.18) +      // 18% Defense
                (spd * 0.05) +      // 5% Speed
                (agl * 0.05) +      // 5% Agility
                (shotAcc * 0.10) +  // 10% Shot Accuracy
                (pwr * 0.08) +      // 8% Shot Power
                (pass * 0.10) +     // 10% Passing
                (stkHnd * 0.10) +   // 10% Stick Handling
                (check * 0.02) +      // 2% Checking
                (endur * 0.02)        // 2% Endurance

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
            else if (def >= 75 && def > off) tag = "SHUTDOWN"; 
            else if (rough >= 75 && aggr >= 75) tag = "ENFORCER D"; 
            else if (def >= 70 && off >= 70) tag = "TWO-WAY STAR D";
                
            // ==========================================
            // 🚨 THE NEW PRO TIERS (DEFENSE)
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
            else if (off >= 75 && def >= 80 && check >= 75 && pass >= 75 && pwr >= 75) tag = "TWO-WAY STAR F";
            else if (off >= 75 && agl >= 75 && spd >= 80) tag = "SPEEDSTER"; 
            else if (off >= 75 && agl >= 80 && stkHnd >= 80) tag = "DANGLER";
            else if (off >= 70 && check >= 70 && pwr >= 70 && aggr >= 65 && rough >= 65 && wgt >= 215) tag = "POWER FORWARD"; 
            else if (def >= 70 && off >= 70 && check >= 70 && aggr >= 70 && rough >= 60) tag = "GRINDER";
            else if (rough >= 80 && aggr >= 80) tag = "ENFORCER F";
            else if (off >= 70) tag = "PRO OFFENSIVE FWD";
            else if (def >= 70) tag = "PRO DEFENSIVE FWD";
            
            // ==========================================
            // 🚨 THE NEW PRO TIERS (FORWARDS)
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
    // 🚨 WEIGHT MODIFIER INJECTION ZONE 🚨
    // =========================================================
    let baseMod = (typeof archMods !== 'undefined' && archMods[tag]) ? archMods[tag].shotRate : 1.0;
    // =========================================================
    // 🚨 WEIGHT MODIFIER INJECTION ZONE (FIXED) 🚨
    // =========================================================
    let wGrade = p.attr.weight || 'B';
    
    // Get the synergy modifier (1.15 = great, 0.90 = bad, 1.05/1.0 = normal)
    let weightMod = (typeof getWeightModifier === 'function') ? getWeightModifier(wGrade, tag) : 1.0;
    
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
    // 🚨 LIVE OVR MATH (FATIGUE, ENDURANCE & MORALE) 🚨
    // =========================================================
    let finalOvr = baseOvr;
    
    if (p.status) {
        let fatigue = p.status.fatigue || 0;
        let morale = p.status.morale || 0;
        
        let endurance = parseInt(p.attr.endurance || p.attr.END || p.attr.end) || 70;
        
        let maxPenaltyPercent = 0.10; // Reducing this to 10% will stop star players from "bottoming out"
        let endResistance = 1.2 - (endurance / 100); 
        let penaltyPct = (fatigue / 100) * maxPenaltyPercent * endResistance;
        
        finalOvr = Math.round(baseOvr * (1 - penaltyPct));
        finalOvr += morale;
    }

    return { ovr: finalOvr, tag: tag, baseOvr: baseOvr };
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
function assignMicroStreaks(rosterArray) {
    // Clear old micro streaks for this team
    rosterArray.forEach(p => { if (playerStats[p.name]) playerStats[p.name].micro_streak = null; });

    // Filter eligible players (those not injured and with at least 1 point in the last 3 games)
    // 1. Filter out injured, streaking, and BENCHED players
    let eligible = rosterArray.filter(p => {
        let ps = playerStats[p.name];
        let isHealthyAndAvailable = ps && ps.injury.daysRemaining === 0 && !ps.macro_streak;
        let isActive = p.line !== 'BENCH'; // Ensure they are on the ice
        return isHealthyAndAvailable && isActive;
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
        'SUPERSTAR': 'SS',
        'TwO-WAY STAR F': 'TSF',
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
        'DEFENSIVE D': 'DD',
        'OFFENSIVE D': 'OD',
        'TWO-WAY D': 'TD',
        'PRO OFFENSIVE D': 'POD',
        'PRO DEFENSIVE D': 'PDD',
        'OFFENSIVE FWD': 'OF',
        'DEFENSIVE FWD': 'DF',
        'PRO OFFENSIVE FWD': 'POF',
        'PRO DEFENSIVE FWD': 'PDF',
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
    let skaters = rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0).slice(0, 18);
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

    // 1. Grab the PURE weighted calculation (ignores the CSV overall entirely)
    let live = getPlayerWeightedStats(pName).baseOvr;
    
    // 2. Apply Macro/Micro Streaks
    if (p.streakType === 'hot') live += 10; 
    if (p.streakType === 'cold') live -= 10;
    
    // 3. Apply Fatigue Penalty
    live -= getPlayerFatigueAmount(pName);
    
    // 4. Apply Morale Boost/Penalty
    if (p.status && p.status.morale) {
        live += ((p.status.morale - 100) * 0.05); // Adjust multiplier scaling to your liking
    }
    
    // 5. Apply Line Chemistry
    const tObj = league.find(t => t.code === p.teamCode);
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
        if (chemVal === 10 && isTelepathic) live += 5; 
        else if (chemVal === 10) live += 3; 
        else if (chemVal >= 5) live += 1;                    
    }
    
    return Math.round(live);
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
    let endur = p.attr.endur || 70; // Fallback is now a number

    // 📅 Back-to-Back Schedule Penalty
    if (playedYesterday(p.teamCode || p.team)) {
        if (endur >= 88) pen += 1;          // 'A' tier endurance
        else if (endur >= 75) pen += 4;     // 'B' tier endurance
        else pen += 8;                      // Low endurance crashes on back-to-backs
    }

    // 🥵 In-Game Exhaustion (Covering for injured teammates)
    if (p.extra_shifts && p.extra_shifts > 0) {
        if (endur >= 88) pen += 2;
        else if (endur >= 75) pen += 5;
        else pen += 10; // Hitting the "3rd Period Wall"
    }
    return pen;
}

// --- LINES & SPECIAL TEAMS ---
// 🏒 5v5 TACTICAL AUTO-COACH ENGINE
// 🤝 DYNAMIC DUO REGISTRY
// Forces the auto-coach to draft these players onto the same line if both are healthy
const dynamicDuos = [
    ['Adam Oates', 'Cam Neely', 'Glen Murray'],
    ['Andrew Cassels', 'Pat Verbeek', 'Geoff Sanderson'],
    ['Mario Lemieux', 'Jaromir Jagr', 'Rick Tocchet'],
    ['Paul Kariya', 'Teemu Selanne'],
    ['Wayne Gretzky', 'Jari Kurri', 'Luc Robitaille'],
    ['Mark Messier', 'Glenn Anderson', 'Adam Graves'],
    ['Derek King', 'Pierre Turgeon'],
    ['Eric Lindros', 'Mark Recchi', 'John LeClair', 'Brent Fedyk'],
    ['Andrei Kovalenko', 'Mats Sundin', 'Valeri Kamensky'],
    ['Joe Sakic', 'Owen Nolan', 'Mike Ricci'],
    ['Gary Roberts','Joe Nieuwendyk', 'German Titov'],
    ['Alexander Mogilny', 'Dale Hawerchuk', 'Jason Dawe'],
    ['Jeremy Roenick', 'Tony Amonte', 'Dirk Graham'],
    ['Vincent Damphousse', 'Brian Bellows', 'Benoit Brunet'],
    ['Brett Hull', 'Craig Janney', 'Vitali Prokhorov'],
    ['Doug Gilmour', 'Wendel Clark', 'Mike Gartner'],
    ['Ray Sheppard', 'Steve Yzerman', 'Dino Ciccarelli'],
    ['Niklas Lidstrom', 'Vladimir Konstantinov'],
    ['Pavel Bure', 'Trevor Linden', 'Greg Adams'],
    ['Mike Keane', 'Guy Carbonneau'],
    ['Denis Savard', 'Rob Zamuner'],
    ['Ron Francis', 'Kevin Stevens', 'Tomas Sandstrom'],
];

function getDuoPartner(playerName) {
    for (let pair of dynamicDuos) {
        if (pair[0] === playerName) return pair[1];
        if (pair[1] === playerName) return pair[0];
        if (pair.length === 3) {
            if (pair[0] === playerName) return [pair[1], pair[2]];
            if (pair[1] === playerName) return [pair[0], pair[2]];
            if (pair[2] === playerName) return [pair[0], pair[1]];
        }
    }
    return null;
}

function getLineMates(playerName) {
    for (let pair of dynamicDuos) {
        if (pair.includes(playerName)) {
            // Return all other members of the duo/trio
            return pair.filter(name => name !== playerName);
        }
    }
    return null;
}

// Example helper to ensure every player has a tag
function getTag(name) {
    if (playerStats[name] && playerStats[name].tag) return playerStats[name].tag;
    return 'UNKNOWN'; // Or a default fallback
}

// =========================================================
// 🏒 POSITION-AWARE LINE BUILDER HELPERS
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
    
    // 2. Debug: If you see F, check the console
    if (p !== 'C' && p !== 'LW' && p !== 'RW' && p !== 'D' && p !== 'G') {
        console.log(`⚠️ POSITION WARNING: Player "${player.name}" has unmapped pos: "${p}"`);
    }

    // 3. Strict Map
    if (p === 'C') return 'C';
    if (p === 'LW') return 'LW';
    if (p === 'RW') return 'RW';
    if (p === 'D') return 'D';
    if (p === 'G') return 'G';
    
    return 'F'; // Only returns F if no match is found
}

/**
 * Sort forwards by position preference
 * @param {array} players - Array of player objects
 * @param {string} preferPosition - Preferred position (C, LW, RW)
 * @returns {array} Sorted array by position preference
 */
function sortByPositionPreference(players, preferPosition) {
    return [...players].sort((a, b) => {
        const posA = getPlayerPosition(a);
        const posB = getPlayerPosition(b);
        
        // Exact position match gets priority
        if (posA === preferPosition && posB !== preferPosition) return -1;
        if (posB === preferPosition && posA !== preferPosition) return 1;
        
        // Both same or both different: sort by OVR
        return getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr;
    });
}

/**
 * Check if a winger can fill a center position (OVR-based override)
 * @param {object} winger - Winger player object
 * @param {number} centersNeeded - How many centers still needed
 * @returns {boolean} True if winger can be promoted to center
 */
function canWingerFillCenter(winger, centersNeeded) {
    // Wingers can only fill centers if not enough Cs exist on entire roster
    if (centersNeeded > 0) {
        const wingOvr = getPlayerWeightedStats(winger.name).ovr;
        // Allow promotion only if it's a very high-rated winger
        return wingOvr >= 85;  // Elite-level winger can play center in emergency
    }
    return false;
}

/**
 * Check if a center can fill a winger position (OVR-based override)
 * @param {object} center - Center player object
 * @param {object} existingWinger - Winger currently in that position
 * @returns {boolean} True if center outranks winger by 3+ OVR
 */
function canCenterFillWing(center, existingWinger) {
    const cOvr = getPlayerWeightedStats(center.name).ovr;
    const wOvr = existingWinger ? getPlayerWeightedStats(existingWinger.name).ovr : 0;
    // Centers can fill wings only if they're 3+ OVR higher
    return (cOvr - wOvr) >= 3;
}

function getLineMates(playerName) {
    for (let pair of dynamicDuos) {
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
    h += `<div style="color:var(--ea-yellow); font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;">⚔️ FORWARD LINES</div>`;
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
    h += `<div style="color:var(--line-red); font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;">🛡️ DEFENSE PAIRS</div>`;
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
    h += `<div style="color:#FFD700; font-weight:bold; margin-bottom:12px; text-transform:uppercase; font-size:11px; letter-spacing:2px;">🥅 GOALIES</div>`;
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
    
    h += `</div>`;
    container.innerHTML = h;
}

const getRosterStructure = (tk) => {
    let r = rosters[tk] || [];
    
    // 1. DATA PREP
    const getPos = (p) => getPlayerPosition(p); 
    const getTag = (p) => getPlayerWeightedStats(p.name).tag || '';
    const getOff = (p) => parseInt(playerStats[p.name]?.attr?.off) || 0;
    const getDef = (p) => parseInt(playerStats[p.name]?.attr?.def) || 0;
    const getOvr = (p) => getPlayerWeightedStats(p.name).ovr || 0;

    let healthySkaters = r.filter(p => {
        let ps = playerStats[p.name];
        return getPos(p) !== 'G' && ps && (!ps.injury || ps.injury.daysRemaining === 0);
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
        if (!player || line.length >= 3) return;
        
        // Dynamic Duos / Trios (Check this FIRST to prioritize icons over generic archetypes)
        let mates = getLineMates(player.name); 
        if (mates) {
            let mateList = Array.isArray(mates) ? mates : [mates];
            mateList.forEach(mateName => {
                let mate = fPool.find(x => x.name === mateName && !usedNames.has(x.name));
                if (mate && canAddPlayer(mate, line, true)) {
                    line.push(mate);
                    usedNames.add(mate.name);
                }
            });
        }

        // Archetype Match (Sniper + Playmaker)
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
        let nonCenters = fPool.filter(p => getPos(p) !== 'C').sort((a,b) => getOvr(a) - getOvr(b));
        while(allCenters.length < 4 && nonCenters.length > 0) allCenters.push(nonCenters.shift());
    }

    // 🛡️ PLATOON LOGIC: Position-Shifting for Center Depth
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
        let maxAttempts = 10;
        while (fLines[lineIdx].length < 3 && usedNames.size < maxForwards && maxAttempts > 0) {
            let previousSize = fLines[lineIdx].length;
            
            let available = fPool.filter(p => !usedNames.has(p.name)).sort(sortFn);
            for (let p of available) {
                if (canAddPlayer(p, fLines[lineIdx], false)) {
                    fLines[lineIdx].push(p); 
                    usedNames.add(p.name);
                    triggerSynergies(p, lineIdx); 
                    break; 
                }
            }
            if (fLines[lineIdx].length === previousSize) break;
            maxAttempts--;
        }
    };

    // ==========================================
    // 🌊 5. WINGER DRAFT (TOP 6 SNAKE SEQUENCE)
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

    // 🐍 The Snake Draft: Line 1, Line 2, Line 2, Line 1
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
    // 🛡️ BOTTOM 6 WINGER DRAFT
    // ==========================================
    // Line 3 prioritizes Defense/Two-Way. Line 4 takes the best remaining.
    safeDraft(2, sortDef); 
    safeDraft(3, sortOvrDesc);

    // ==========================================
    // ⚖️ 5b. POST-DRAFT SYNERGY REBALANCER
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
                    let isCenter = getPos(p) === 'C'; // 🛡️ Remember their position!
                    
                    // 1. If target line is full, bounce the lowest-rated non-center back to free agency
                    if (targetLine.length >= 3) {
                        let bounceCandidates = targetLine.filter(x => getPos(x) !== 'C').sort((a,b) => getOvr(a) - getOvr(b));
                        if (bounceCandidates.length > 0) {
                            let bounceVictim = bounceCandidates[0];
                            targetLine.splice(targetLine.indexOf(bounceVictim), 1);
                            usedNames.delete(bounceVictim.name); // 🛡️ Releases them to be drafted by the top line!
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

                    for (let cand of available) {
                        if (canAddPlayer(cand, line, false)) {
                            // Put centers back at the front of the line so your UI looks correct
                            if (isCenter) line.unshift(cand); 
                            else line.push(cand);
                            
                            usedNames.add(cand.name);
                            break;
                        }
                    }
                }
            }
        }
    }

    // Line 1 & 2 Rank Enforcement (Swap if L2 ended up stronger than L1)
    if (getLineOvr(fLines[1]) > getLineOvr(fLines[0])) {
        let temp = fLines[0]; fLines[0] = fLines[1]; fLines[1] = temp;
    }

    // ===========================================================
    // 🛡️ 6. DEFENSE PAIRS - DYNAMIC DRAFTING & SYNERGY SEQUENCE
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
    };

    // Helper to grab the highest OVR defenseman still available
    const getNextAvailable = () => dPool.find(p => !dUsed.has(p.name));

    // 1. Draft Pair 1 Anchor (Highest OVR)
    let p1Anchor = getNextAvailable();
    draftD(p1Anchor, 0); // 🛡️ FIX: Actually draft them!

    // 2. If Pair 1 did NOT find a synergy partner, pause Pair 1 and build Pair 2
    if (dPairs[0].length === 1) {
        
        // Draft Pair 2 Anchor (Next Highest OVR)
        let p2Anchor = getNextAvailable();
        draftD(p2Anchor, 1); // 🛡️ FIX
        
        // If Pair 2 ALSO didn't find a synergy partner, finish Pair 2 with the next highest OVR
        if (dPairs[1].length === 1) {
            let p2Filler = getNextAvailable();
            draftD(p2Filler, 1); // 🛡️ FIX
        }
        
        // Now return to Pair 1 and finish it with the highest remaining OVR (usually the 4th best)
        if (dPairs[0].length === 1) {
            let p1Filler = getNextAvailable();
            draftD(p1Filler, 0); // 🛡️ FIX
        }
    } else {
        // If Pair 1 DID find a synergy and filled up, just build Pair 2 normally
        let p2Anchor = getNextAvailable();
        draftD(p2Anchor, 1); // 🛡️ FIX
        
        if (dPairs[1].length === 1) {
            let p2Filler = getNextAvailable();
            draftD(p2Filler, 1); // 🛡️ FIX
        }
    }

    // 3. Fill Pair 3 with the remaining defensemen (Usually the 5th and 6th best)
    while (dPairs[2].length < 2) {
        let p3Filler = getNextAvailable();
        if (!p3Filler) break; // Failsafe if the team has less than 6 healthy defensemen
        
        draftD(p3Filler, 2); // 🛡️ FIX: This updates the pair length and breaks the infinite loop!
    }

    // ==========================================
    // 🛡️ POST-DRAFT SYNERGY SWAP CHECK
    // ==========================================
    
    // Helper to check if two specific players have chemistry
    const hasSynergy = (p1, p2) => {
        if (!p1 || !p2) return false;
        
        // A. Explicit Duos
        if (typeof getLineMates === 'function') {
            let m1 = getLineMates(p1.name);
            if (m1 && (Array.isArray(m1) ? m1.includes(p2.name) : m1 === p2.name)) return true;
            let m2 = getLineMates(p2.name);
            if (m2 && (Array.isArray(m2) ? m2.includes(p1.name) : m2 === p1.name)) return true;
        }
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

    // ==========================================
    // 🥅 7. GOALIES
    // ==========================================
    let gPool = r.filter(p => {
        let ps = playerStats[p.name];
        return getPos(p) === 'G' && ps && (!ps.injury || ps.injury.daysRemaining === 0);
    }).sort((a,b) => getOvr(b) - getOvr(a));
    
    return { f: fLines, d: dPairs, g: gPool };
}

// 🛡️ SPECIAL TEAMS AUTO-COACH ENGINE
function getSpecialTeamsUnit(tk, type, unitNum, isEN = false) {
    const struct = getRosterStructure(tk);
    
    // Defensive fallback if roster structure fails
    if (!struct || !struct.f || !struct.d) {
        let sks = rosters[tk] ? rosters[tk].filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0) : [];
        return sks.slice(0, 5);
    }

    let unit = [];

    if (type === 'PP') {
        // Pool ALL available forwards and defensemen for evaluation
        let allForwards = [...struct.f.flat()].filter(Boolean);
        let allDefense = [...struct.d.flat()].filter(Boolean);

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
        let pkForwards = [...(struct.f[2] || []), ...(struct.f[3] || [])].filter(Boolean);
        let allDefense = [...struct.d.flat()].filter(Boolean);

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
    let score = players.reduce((sum, p) => { const stats = playerStats[p.name]; if (!stats) return sum; const ovr = getLiveIceOvr(p.name); if (isPP) { return sum + ovr + getGradeMod(stats.attr.pass || 'C') * 2.5 + getGradeMod(stats.attr.shotPwr || 'C') + getGradeMod(stats.attr.offAwr || 'C') * 2.0; } else { return sum + ovr * 0.9 + getGradeMod(stats.attr.gDefAware || 'C') * 2 + getGradeMod(stats.attr.check || 'C') * 1.5; } }, 0);
    return Math.max(0, score / Math.max(players.length, 1));
}

// Helper function to build the Special Teams HTML dynamically
function buildSpecialTeamsHTML(type, unitNum, unitPlayers) {
    const gridClass = (type === 'PK') ? 'pk-grid-layout' : 'pp-grid-layout';
    
    let htmlContent = `
        <div style="color:var(--ea-yellow); font-weight:bold; margin-top:10px; margin-bottom:5px;">
            ${type} UNIT ${unitNum}
        </div>
        <div class="${gridClass}">
    `;
    
    unitPlayers.forEach((player, index) => {
        if (!player) {
            htmlContent += `<div class="player-slot" style="color:#555;">-- EMPTY --</div>`;
            return; 
        }

        let label = '';
        if (type === 'PK') {
            label = index < 2 ? '[F]' : '[D]'; 
        } else {
            label = index < 4 ? '[F]' : '[D]'; 
        }
        
        htmlContent += `
            <div class="player-slot" onclick="showPlayerCard('${player.name}')">
                <span class="pos-badge">${label}</span>
                <span style="color:#fff;">${player.name}</span>
                <div style="font-size:7px; color:#aaa; margin-top:3px;">
                    OVR: ${getPlayerWeightedStats(player.name).ovr || 0}
                </div>
            </div>
        `;
    });
    
    htmlContent += `</div>`;
    return htmlContent;
}
function getSpecialTeamsChance(attackingTk, defendingTk) { const diff = getSpecialTeamsRating(attackingTk, 'PP') - getSpecialTeamsRating(defendingTk, 'PK'); const pace = Math.max(0.90, Math.min(1.12, getSpecialTeamsRating(attackingTk, 'PP') / 85)); return Math.max(0.10, Math.min(0.46, 0.215 + diff * 0.0028 * pace)); }

// Find this function in script.js and update the return:
function getDefenseAndGoalieModifiers(defRating, goalie) {
    // 🚨 SHIFTED BASELINE
    const shot = Math.max(0.75, Math.min(1.25, 1 - (defRating - 70) * 0.004));

    if (!goalie || !playerStats[goalie.name]) return { shot, goal: 1.0 };
    
    const gStats = playerStats[goalie.name];
    const streakModifier = gStats.streakType === 'hot' ? 1.05 : (gStats.streakType === 'cold' ? 0.95 : 1.0);
    const baseOvr = gStats.attr.ovr || gStats.attr.gDef || 60;
    const quality = Math.max(0.75, Math.min(1.25, (baseOvr / 60) * streakModifier));
    
    // ADDED 'shot' TO THE RETURN OBJECT BELOW
    return { shot, goal: Math.max(0.80, Math.min(1.25, 1 - (quality - 1) * 0.30)) }; 
}

function getActiveSkaters(tk) { const s = getRosterStructure(tk); return [...s.f.flat(), ...s.d.flat(), ...(s.g.slice(0, 2))]; }

// --- GAME MATH & STATS ---
function pois(l) { if(isNaN(l) || l <= 0 || l === Infinity) return 0; let L = Math.exp(-l), kv = 0, pr = 1; do { kv++; pr *= Math.random(); } while(pr > L); return kv - 1; }
function checkMilestones(pName) {
    if (!awardConfig || !awardConfig.milestones) return;
    const p = playerStats[pName];
    if (!p) return;

    // Calculate current total stats (historical career + live season)
    const c = p.career || { gp:0, g:0, a:0, pts:0, w:0, so:0 };
    const s = p.season || { gp:0, g:0, a:0, so:0, w:0 };

    const totalGP = c.gp + s.gp;
    const totalG = c.g + (s.g || 0);
    const totalA = c.a + (s.a || 0);
    const totalPts = c.pts + (s.g || 0) + (s.a || 0);
    const totalW = c.w + (s.w || 0);
    const totalSO = c.so + (s.so || 0);

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
function calculateStars(hSc, aSc, hGn, aGn, hW, aW, hGA, aGA) { 
    let c = []; const add = (n, pts) => { if(!n) return; let ex = c.find(x => x.n === n); if(ex) ex.s += pts; else c.push({n, s:pts}); }; 
    hSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); aSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); 
    if(hGn) add(hGn, (25-hGA) + (hGA === 0 ? 50 : 0) + (hW ? 20 : 0)); if(aGn) add(aGn, (25-aGA) + (aGA === 0 ? 50 : 0) + (aW ? 20 : 0)); 
    return c.sort((a,b) => b.s - a.s).slice(0,3).map(x => x.n); 
}

function creditStats(tk, oppTk, goals, k, baseOff, hPPG, teamSHG, teamEXA, activeSkaters) {
    let ev = []; 
    const blendStat = (base, comp) => base * (1 + ((comp - 1) * 0.75));

    for(let i = 0; i < goals; i++) {
        let pG = false, sH = false, isEN = false;
        if (hPPG > 0 && Math.random() < (hPPG / goals)) { pG = true; hPPG--; }
        else if (teamSHG > 0 && Math.random() < (teamSHG / Math.max(1, goals - hPPG))) { sH = true; teamSHG--; }
        if (!pG && teamEXA > 0 && Math.random() < 0.22) { isEN = true; teamEXA--; }

        let u; let dUnit = [];
        let struct = getRosterStructure(tk);
        
        if (pG) {
            u = getSpecialTeamsUnit(tk, 'PP', (Math.random() < 0.55 ? 1 : 2), isEN);
        } else if (sH) {
            u = getSpecialTeamsUnit(tk, 'PK', (Math.random() < 0.60 ? 1 : 2), isEN);
        } else {
            // --- DYNAMIC SHIFTS ---
            const pickLine = (linesArray) => {
                let ovrs = linesArray.map(l => l.length > 0 ? l.reduce((s, p) => s + getPlayerWeightedStats(p.name).ovr, 0) / l.length : 10);
                let weights = ovrs.map(o => Math.pow(o, 2)); 
                let total = weights.reduce((a, b) => a + b, 0);

                // 🛡️ MODIFIED: ICE TIME CAP FOR TOP LINE
                // Regular Season: ~23 mins (38.3%), Playoffs: ~26 mins (43.3%)
                let maxPercent = (k === 'playoff') ? 0.433 : 0.383;
                
                // If Line 1 exceeds the minute cap, throttle them and redistribute
                if (weights.length > 0 && (weights[0] / total) > maxPercent) {
                    let remainingWeight = total - weights[0];
                    let allowedL1Weight = remainingWeight * (maxPercent / (1 - maxPercent));
                    weights[0] = allowedL1Weight;
                    
                    // Recalculate the total weight pool with the new capped value
                    total = weights.reduce((a, b) => a + b, 0); 
                }

                let roll = Math.random() * total;
                for (let i = 0, cum = 0; i < weights.length; i++) {
                    cum += weights[i];
                    if (roll <= cum) return i;
                }
                return 0;
            };

            const fIndex = pickLine(struct.f);
            const activeForwards = struct.f[fIndex] || struct.f[0];
            const dIndex = pickLine(struct.d);
            const activeDefense = struct.d[dIndex] || struct.d[0];
            u = [...activeForwards, ...activeDefense];
        }

        // --- SAFETY: Ensure u is valid ---
        u = (u || []).filter(p => p && p.name);
        if (u.length === 0) u = (activeSkaters || []).filter(p => p && p.name);

        let oppStruct = getRosterStructure(oppTk); 
        dUnit = [...(oppStruct.f[0] || []), ...(oppStruct.d[0] || [])];

        // Filter players
        let eligible = u.filter(p => {
            let ps = playerStats[p.name];
            let isHealthyAndAvailable = ps && ps.injury.daysRemaining === 0; 
            let isActive = p.line !== 'BENCH';
            return isHealthyAndAvailable && isActive;
        });

        if (eligible.length === 0) eligible = u;

       // 1. Goal Weights — equal base for all forwards; D-men penalized; driven by attributes + archetype
const gWeights = eligible.map(p => {
    let pA = playerStats[p.name].attr;
    let tag = getPlayerWeightedStats(p.name).tag || 'GENERIC';
    let arch = archMods[tag] || { shotRate: 1.0 };

    // Attributes: Off, ShotPwr, ShotAcc
    let off = pA.off || 70;
    let pwr = pA.shotPwr || 70;
    let acc = pA.shotAcc || 70;
    let baseChance = (off * 0.20) + (pwr * 0.40) + (acc * 0.40);

    // Apply Archetype Multiplier
    let archMod = arch.shotRate;

    let shotRoll = Math.random();
    let goalDist = (shotRoll < 0.35) ? 'Close' : (shotRoll > 0.87 ? 'Far' : 'Medium');

    let modifier = 1.0;
    if (isEN) modifier *= 3.20;
    if (playerStats[p.name].isHot) modifier *= 1.20;
    if (playerStats[p.name].isCold) modifier *= 0.80;

    // Position modifier: ALL forwards equal base (1.0), D-men penalized (~31% less)
    // No center bonus — C/LW/RW are identical base; difference comes only from attrs/archetype
    const isD = (p.pos === 'D' || p.pos === 'LD' || p.pos === 'RD');
    let compMod = isD ? 0.80 : 1.0;
    // Extra accuracy penalty for D on non-Far shots
    if (isD && goalDist !== 'Far') compMod *= (acc >= 90) ? 1.0 : 0.65;
    if (isD && goalDist === 'Far') compMod *= (acc >= 80) ? 1.0 : 0.75;

    let ppMod = 1.0;
    if (typeof specialTeams !== 'undefined' && specialTeams.active) {
        ppMod = (p.team === specialTeams.teamAdvantage) ? 1.40 : 0.35;
    }

    return Math.max(1, baseChance * archMod * modifier * compMod * ppMod);
});

        // 3. Roll scorer
        let tGW = gWeights.reduce((a,b)=>a+b,0), rG = Math.random()*tGW, cG = 0, scr = eligible[0];
        for(let j=0; j<eligible.length; j++){ cG+=gWeights[j]; if(rG<=cG){ scr=eligible[j]; break; }}
        
        // Powerplay Termination
        if (typeof specialTeams !== 'undefined' && specialTeams.active) {
            if (scr.team === specialTeams.teamAdvantage) {
                specialTeams.active = false;
                specialTeams.teamAdvantage = null;
                specialTeams.timeRemaining = 0;
                specialTeams.strength = '5v5';
                console.log(`🚨 POWERPLAY GOAL by ${scr.name}! Penalty expires, back to 5-on-5.`);
            } else {
                console.log(`🚨 SHORTHANDED GOAL by ${scr.name}! The Powerplay continues.`);
            }
        }

        playerStats[scr.name][k].g++; 
        playerStats[scr.name][k].pts = (playerStats[scr.name][k].pts || 0) + 1; 
        if(pG) playerStats[scr.name][k].ppg = (playerStats[scr.name][k].ppg || 0) + 1;
        if(sH) playerStats[scr.name][k].shg = (playerStats[scr.name][k].shg || 0) + 1;

        if (getPlayerWeightedStats(scr.name).tag === 'GRINDER') {
            rosters[tk].forEach(p => { if(playerStats[p.name]) playerStats[p.name].fatigue = Math.max(0, (playerStats[p.name].fatigue || 0) - 2); });
        }

        let a1N = null, a2N = null;
        let pPassers = u.filter(p => p.name !== scr.name);
        
       // 2. Assist Weights
const getAWeight = (p, isSec) => {
    let pA = playerStats[p.name].attr;
    let tag = getPlayerWeightedStats(p.name).tag || 'GENERIC';
    let arch = archMods[tag] || { assistRate: 1.0 };

    // Attributes: Off, Pass, StickHandling
    let off = pA.off || 70;
    let pass = pA.pass || 70;
    let stick = pA.stkHnd || 70;
    
    let baseWeight = (off * 0.3) + (pass * 0.5) + (stick * 0.2);
    
    // Apply Archetype Multiplier
    let archMod = arch.assistRate;
    
    let mod = isSec ? 1.1 : 0.9; // Secondary assists get a slight boost, primary assists get a slight reduction to create more variance
    const isD = (p.pos === 'D' || p.pos === 'LD' || p.pos === 'RD');
    if (isD) mod *= 0.90; // Defensemen assist penalty, applies to both primary and secondary assists
    
    return baseWeight * archMod * mod;
};

       let assistRoll = Math.random();
        let numAssists = 0;
        let chance2A = 0.755; let chance1A = 0.195; 
        
        if (u.some(p => getPlayerWeightedStats(p.name).tag === 'PLAYMAKER')) {
            chance2A = 0.855; chance1A = 0.115;
        }

        if (assistRoll < chance2A) numAssists = 2;
        else if (assistRoll < (chance2A + chance1A)) numAssists = 1;

        if (numAssists > 0 && pPassers.length > 0) {
            
          // 🛡️ MODIFIED: Harsher penalty for defensemen assists
            const getModAWeight = (p, isSecondary) => {
                let weight = getAWeight(p, isSecondary);
                const isD = p.pos === 'D' || p.pos === 'LD' || p.pos === 'RD';
                
                // Change 0.75 here to match whatever penalty you want to apply
                return isD ? weight * 0.95 : weight;
            };

            // 🛡️ MODIFIED: Replaced 'getAWeight' with 'getModAWeight' below
            let tA1 = pPassers.reduce((s, p) => s + getModAWeight(p, false), 0);
            let rA1 = Math.random()*tA1, cA1 = 0, a1 = pPassers[0];
            for(let p of pPassers){ cA1 += getModAWeight(p, false); if(rA1 <= cA1){ a1 = p; break; }}
            
            playerStats[a1.name][k].a++; playerStats[a1.name][k].pts++; a1N = a1.name;
            if (pG) playerStats[a1.name][k].ppa = (playerStats[a1.name][k].ppa || 0) + 1; 

            if (numAssists === 2) {
                let sPassers = pPassers.filter(p => p.name !== a1N);
                if (sPassers.length > 0) {
                    // 🛡️ MODIFIED: Replaced 'getAWeight' with 'getModAWeight' below
                    let tA2 = sPassers.reduce((s, p) => s + getModAWeight(p, true), 0);
                    let rA2 = Math.random()*tA2, cA2 = 0, a2 = sPassers[0];
                    for(let p of sPassers){ cA2 += getModAWeight(p, true); if(rA2 <= cA2){ a2 = p; break; }}
                    
                    playerStats[a2.name][k].a++; playerStats[a2.name][k].pts++; a2N = a2.name;
                    if (pG) playerStats[a2.name][k].ppa = (playerStats[a2.name][k].ppa || 0) + 1; 
                }
            }
        }
        // ==========================================
        // 🛡️ PLUS/MINUS (+/-) TRACKER
        // ==========================================
        // Only apply +/- if it is NOT a power play goal (pG).
        // Even strength and shorthanded goals count!
        if (!pG) {
            
            // Give +1 to the scoring team on the ice (u)
            u.forEach(p => {
                if (playerStats[p.name] && playerStats[p.name][k]) {
                    // Uses your engine's specific '.pm' key
                    playerStats[p.name][k].pm = (playerStats[p.name][k].pm || 0) + 1;
                }
            });

            // Give -1 to the defending team on the ice (dUnit)
            dUnit.forEach(p => {
                if (playerStats[p.name] && playerStats[p.name][k]) {
                    playerStats[p.name][k].pm = (playerStats[p.name][k].pm || 0) - 1;
                }
            });
            
            // To apply the simulated minutes directly to a player's season logs post-game:
const iceTimeData = g.preCalculatedIceTime.home; // or away

// Example setting Forward Player Ice Time
struct.f.forEach((line, lineIdx) => {
    line.forEach(player => {
        let mins = iceTimeData.forwardLineAverages[lineIdx];
        if (playerStats[player.name]) {
            playerStats[player.name].season.toi = (playerStats[player.name].season.toi || 0) + mins;
        }
    });
});

// Example setting Defense Player Ice Time
struct.d.forEach((pair, pairIdx) => {
    pair.forEach(player => {
        let mins = iceTimeData.defensePairAverages[pairIdx];
        if (playerStats[player.name]) {
            playerStats[player.name].season.toi = (playerStats[player.name].season.toi || 0) + mins;
        }
    });
});

        }

        // 🛡️ MODIFIED: Added `isSH: sH` so the engine knows it was a shorthanded goal
        ev.push({scorer: scr.name, a1: a1N, a2: a2N, onIce: u.map(p=>p.name), oppOnIce: dUnit.map(p=>p.name), isPP: pG, isSH: sH, isEN: isEN});        
    }
    return ev;
}

/**
 * Dynamic Ice Time Allocator with Strict Base Limits & Rating Weight Modifiers
 * @param {Object} struct - The return from getRosterStructure(teamCode) containing .f and .d
 * @returns {Object} - An object with arrays of calculated minutes per player for forwards and defenders
 */
function calculateDynamicIceTime(struct) {
    if (!struct || !struct.f || !struct.d) {
        return { forwardTimes: [15, 15, 15, 15], defenseTimes: [20, 20, 20] };
    }

    // --- Helper: Get Line/Pair Average Overall Rating ---
    const getUnitAverageOvr = (players) => {
        if (!players || players.length === 0) return 0;
        let sum = players.reduce((acc, p) => acc + (typeof getLiveIceOvr === 'function' ? getLiveIceOvr(p.name) : 75), 0);
        return sum / players.length;
    };

    // Calculate line overals
    const f1Ovr = getUnitAverageOvr(struct.f[0]);
    const f2Ovr = getUnitAverageOvr(struct.f[1]);
    const f3Ovr = getUnitAverageOvr(struct.f[2]);
    const f4Ovr = getUnitAverageOvr(struct.f[3]);

    const d1Ovr = getUnitAverageOvr(struct.d[0]);
    const d2Ovr = getUnitAverageOvr(struct.d[1]);
    const d3Ovr = getUnitAverageOvr(struct.d[2]);

    // Total regulation game minutes to fill per position group (3 skaters on ice for F * 60 = 180, 2 for D * 60 = 120)
    const totalForwardMinutes = 180;
    const totalDefenseMinutes = 120;

    // ==========================================
    // 🏒 1. FORWARDS DYNAMIC LOGIC
    // ==========================================
    
    // Base Baseline Targets (Per Player Average)
    let fShares = [20, 17, 14, 9]; // Baseline points corresponding to midpoints of your request

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

    // Scale Forward Shares to exactly fit 180 total skater minutes
    // (Each line has 3 players, so total share sum = (fShares[0]*3) + (fShares[1]*3) + ...)
    let sumFShares = (fShares[0] * 3) + (fShares[1] * 3) + (fShares[2] * 3) + (fShares[3] * 3);
    let scaleF = totalForwardMinutes / sumFShares;

    let finalForwardLineMins = fShares.map(share => share * scaleF);

    // Apply strict clamping boundaries to safeguard requested ranges
    finalForwardLineMins[0] = Math.max(18, Math.min(22, finalForwardLineMins[0]));
    finalForwardLineMins[1] = Math.max(16, Math.min(18, finalForwardLineMins[1]));
    finalForwardLineMins[2] = Math.max(13, Math.min(15, finalForwardLineMins[2]));
    finalForwardLineMins[3] = Math.max(8, Math.min(12, finalForwardLineMins[3]));

    // Normalize again if clamping caused a slight mathematical offset from 180
    let clampedSumF = (finalForwardLineMins[0]*3) + (finalForwardLineMins[1]*3) + (finalForwardLineMins[2]*3) + (finalForwardLineMins[3]*3);
    let microAdjustF = totalForwardMinutes / clampedSumF;
    finalForwardLineMins = finalForwardLineMins.map(m => m * microAdjustF);


    // ==========================================
    // 🛡️ 2. DEFENSIVE PAIRINGS DYNAMIC LOGIC
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
    finalDefensePairMins[0] = Math.max(22, Math.min(26, finalDefensePairMins[0]));
    finalDefensePairMins[1] = Math.max(18, Math.min(21, finalDefensePairMins[1]));
    finalDefensePairMins[2] = Math.max(14, Math.min(17, finalDefensePairMins[2]));

    // Normalize again if clamping caused a offset from 120
    let clampedSumD = (finalDefensePairMins[0]*2) + (finalDefensePairMins[1]*2) + (finalDefensePairMins[2]*2);
    let microAdjustD = totalDefenseMinutes / clampedSumD;
    finalDefensePairMins = finalDefensePairMins.map(m => m * microAdjustD);


    // ==========================================
    // 📊 3. DEFENSE MATRIX PERCENTAGE DISTRIBUTION
    // ==========================================
    // Breakdown of how each Pairing's total ice time is divided alongside Forward Lines
    // Matrix distribution setup: [Pair 1, Pair 2, Pair 3] mapping to [Line 1, Line 2, Line 3, Line 4]
    const dDistributionMatrix = [
        [0.65, 0.20, 0.10, 0.05], // Pair 1: 65% on L1, 20% on L2, 10% on L3, 5% on L4
        [0.20, 0.50, 0.20, 0.10], // Pair 2: Balanced deployment favoring Line 2
        [0.10, 0.15, 0.55, 0.20]  // Pair 3: Sheltered deployment favoring Line 3/4
    ];

    return {
        forwardLineAverages: finalForwardLineMins, // [L1_mins, L2_mins, L3_mins, L4_mins]
        defensePairAverages: finalDefensePairMins, // [P1_mins, P2_mins, P3_mins]
        distributionMatrix: dDistributionMatrix
    };
}

function executeShotSequence(attackingTeamId, line, opposingGoalie) {
    // 1. Pick a logical shooter from the active unit (Bias towards Wings and Center)
    const roll = Math.random();
    let shooterName = line.c;
    if (roll < 0.35) shooterName = line.rw;
    else if (roll < 0.70) shooterName = line.lw;
    else if (roll < 0.85) shooterName = line.ld;
    else if (roll < 1.00) shooterName = line.rd;

    if (!shooterName) return;

    // 2. Extract shooter attributes & Archetype multipliers
    const shooter = playerStats[shooterName];
    const shotAcc = shooter?.attr?.wsh || 60; // Accuracy attribute
    const shotPwr = shooter?.attr?.wsp || 60; // Power attribute
    const offAwr  = shooter?.attr?.offawr || 60;
    const arch    = shooter?.archetype || "BALANCED";
    
    // Safety check for your master archetype multipliers list
    const shooterMods = archMods[arch] || { shotRate: 1.0, assistRate: 1.0 };

    // 3. Extract goalie attributes
    const goalie = playerStats[opposingGoalie];
    const goalieValue = goalie?.attr?.def || 70; // Using defensive capability as base save rating
    const goalieAwr   = goalie?.attr?.offawr || 70; // Position/Awareness logic

    // Track the raw shot metric immediately
    recordShot(attackingTeamId, shooterName);

    // 4. THE CALCULATOR: Balance shooter skill against goalie skill
    // Convert attributes to small percentage impacts so they don't break the scale
    let shooterAdvantage = ((shotAcc * 0.4) + (shotPwr * 0.3) + (offAwr * 0.3)) / 100; // Scales up to ~1.0
    let goalieAdvantage  = ((goalieValue * 0.6) + (goalieAwr * 0.4)) / 100;          // Scales up to ~1.0

    // Combine into final conversion rate
    let conversionChance = BASE_GOAL_CHANCE + (shooterAdvantage * 0.05) - (goalieAdvantage * 0.05);
    
    // Apply archetype shooting adjustments directly to execution success
    conversionChance *= shooterMods.shotRate;

    // Hard clamps: Ensure no shot ever has less than a 2% or more than a 30% chance of scoring
    conversionChance = Math.max(0.02, Math.min(0.30, conversionChance));

    // 5. Roll for Goal
    if (Math.random() < conversionChance) {
        processGoal(attackingTeamId, shooterName, line);
    } else {
        recordSave(opposingGoalie);
    }
}

function simGame(idx) {
    const dayGames = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    const g = dayGames[idx];
    let awayGoalie = getStartingGoalie(g.a.nrm);
    let homeGoalie = getStartingGoalie(g.h.nrm);
    gameMilestones = [];
    const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
    
    // 📊 Centralized Match Stats object to handle all metrics precisely
    let matchStats = {}; 
    const trk = (pN, st, v=1) => { 
        if(pN){ 
            if(!matchStats[pN]) matchStats[pN] = {g:0,a:0,s:0,pm:0,pim:0,sa:0,sv:0,ga:0,toi:0}; 
            matchStats[pN][st] += v; 
        } 
    };
    
    // 🩹 1. HEALING & PRE-GAME SETUP
    const heal = tk => { 
        if(rosters[tk]) rosters[tk].forEach(p => { 
            if(playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining > 0) {
                playerStats[p.name].injury.daysRemaining--;
                if(playerStats[p.name].injury.daysRemaining === 0) {
                    if (!playerStats[p.name].injuryHistory) playerStats[p.name].injuryHistory = [];
                    playerStats[p.name].injuryHistory.push({
                        date: currentDay,
                        daysMissed: playerStats[p.name].injury.severity || 0 
                    });
                    playerStats[p.name].injury = { severity: 0, daysRemaining: 0 };
                }
            }
        }); 
    };

    heal(g.h.nrm); 
    heal(g.a.nrm);
    
    if (rosters[g.h.nrm]) assignMicroStreaks(rosters[g.h.nrm]);
    if (rosters[g.a.nrm]) assignMicroStreaks(rosters[g.a.nrm]);

    // 🥅 2. GOALIE SELECTION
    const selG = (tk) => { 
        const gs = rosters[tk] ? rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0).sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr) : [];
        if (!gs.length) { const allG = (rosters[tk] || []).filter(p => p.pos === 'G'); return allG.length ? allG[0] : null; }
        if (gs.length === 1 || isPlayoffs || isASG) return gs[0];
        
        const starter = gs[0]; const backup = gs[1]; const sStats = playerStats[starter.name][k];
        let diff = getPlayerWeightedStats(starter.name).ovr - getPlayerWeightedStats(backup.name).ovr;
        let restChance = 0.12; 
        if (diff <= 10) restChance = 0.45; else if (diff <= 15) restChance = 0.30; 
        if (playedYesterday(tk)) restChance += 0.60;
        
        if (sStats.consStarts >= 7 || Math.random() < restChance) {
            sStats.consStarts = 0; 
            if(playerStats[backup.name][k]) playerStats[backup.name][k].consStarts = (playerStats[backup.name][k].consStarts || 0) + 1;
            return backup;
        } else {
            sStats.consStarts = (sStats.consStarts || 0) + 1; 
            if(playerStats[backup.name][k]) playerStats[backup.name][k].consStarts = 0;
            return starter;
        }
    };

    const hG_obj = selG(g.h.nrm), aG_obj = selG(g.a.nrm);
    const hG_name = hG_obj ? hG_obj.name : null;
    const aG_name = aG_obj ? aG_obj.name : null;

    // 🧱 3. MACRO AURAS & MODIFIER MATH
    let hAuraMod = (getTeamSystemAura(g.h.nrm) === 'OFFENSIVE TEAM' ? 1.15 : (getTeamSystemAura(g.h.nrm) === 'DEFENSIVE TEAM' ? 0.85 : 1.0));
    let aAuraMod = (getTeamSystemAura(g.a.nrm) === 'OFFENSIVE TEAM' ? 1.15 : (getTeamSystemAura(g.a.nrm) === 'DEFENSIVE TEAM' ? 0.85 : 1.0));
    let hWallMod = (hG_obj && getPlayerWeightedStats(hG_obj.name).tag === 'WALL') ? 0.85 : 1.0;
    let aWallMod = (aG_obj && getPlayerWeightedStats(aG_obj.name).tag === 'WALL') ? 0.85 : 1.0;
    let asgBoost = isASG ? 1.8 : 1.0;
    let homeCrowdEnergy = 1.03;

    // ⏱️ 4. THE TIME-TICK ENGINE SETUP
    let hG = 0, aG = 0;
    let hShots = 0, aShots = 0;
    let allGoals = [];
    let penaltyEvents = [];
    let hStruct = getRosterStructure(g.h.nrm);
    let aStruct = getRosterStructure(g.a.nrm);

    function buildLineSchedule(minsArray) {
        let sched = [];
        minsArray.forEach((mins, idx) => {
            let steps = Math.round(mins * 2); 
            for (let i = 0; i < steps; i++) {
                sched.push(idx);
            }
        });
        while (sched.length < 120) sched.push(0); 
        while (sched.length > 120) sched.pop();    
        return sched.sort(() => Math.random() - 0.5);
    }

    const homeIceData = calculateDynamicIceTime(getRosterStructure(g.h.nrm));
    const awayIceData = calculateDynamicIceTime(getRosterStructure(g.a.nrm));

    const homeFSchedule = buildLineSchedule(homeIceData.forwardLineAverages);
    const awayFSchedule = buildLineSchedule(awayIceData.forwardLineAverages);

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
    // ⏱️ THE 60-MINUTE SIMULATION LOOP (120 steps)
    // ==========================================
    for (let step = 0; step < 120; step++) {
        let minute = Math.floor(step / 2) + 1;

        let hFLine = homeFSchedule[step];
        let aFLine = awayFSchedule[step];

        let hDPair = getPairingForLine(hFLine, homeIceData.defensePairingMatrix || [[1,0,0],[0,1,0],[0,0,1]]);
        let aDPair = getPairingForLine(aFLine, awayIceData.defensePairingMatrix || [[1,0,0],[0,1,0],[0,0,1]]);

        let hOnIce = [...hStruct.f[hFLine], ...hStruct.d[hDPair]];
        let aOnIce = [...aStruct.f[aFLine], ...aStruct.d[aDPair]];

        // Track skater ATOI values securely (0.5 mins per step)
        hOnIce.forEach(p => trk(p.name, 'toi', 0.5));
        aOnIce.forEach(p => trk(p.name, 'toi', 0.5));

        // Live Dynamic Matchup Overalls
        let hLiveOvr = getLiveLineOvr(hOnIce) * hAuraMod * homeCrowdEnergy;
        let aLiveOvr = getLiveLineOvr(aOnIce) * aAuraMod;
        
        let diff = hLiveOvr - aLiveOvr;
        
        // 🏒 Realistic Shot Generation Rates per 30-seconds
        let hShotChance = 0.26 + (diff * 0.0025) * asgBoost;
        let aShotChance = 0.26 - (diff * 0.0025) * asgBoost;
        
        let period = minute <= 20 ? 1 : (minute <= 40 ? 2 : 3);
        let sec = Math.floor(Math.random() * 60);
        let timeStr = `P${period} ${minute % 20 || 20}:${sec < 10 ? '0'+sec : sec}`;

        // HOME TEAM ATTACK FLOW
        if (Math.random() < hShotChance) {
            hShots++;
            let shooter = selectShooter(hOnIce);
            trk(shooter.name, 's', 1); // Record Skater Shot
            trk(aG_name, 'sa', 1);     // Record Goalie Shot Against

            // Conversion Roll (Goal vs Save)
            let scoringProb = 0.108 + (diff * 0.004) * aWallMod;
            if (Math.random() < Math.max(0.02, Math.min(0.30, scoringProb))) {
                hG++;
                trk(aG_name, 'ga', 1); // Record Goalie Goal Against
                let ev = processSingleGoal(g.h.nrm, g.h.code, shooter, hOnIce, timeStr, period, (minute % 20 || 20), sec);
                if (ev) {
                    allGoals.push(ev);
                    if (ev.scorer) trk(ev.scorer, 'g', 1);       // ev.scorer is already a name string (fixed in processSingleGoal)
                    if (ev.pAssist) trk(ev.pAssist, 'a', 1);
                    if (ev.sAssist) trk(ev.sAssist, 'a', 1);
                    // Add plus/minus: home scores, so home players get +1, away get -1
                    hOnIce.forEach(p => { if(p && p.name) trk(p.name, 'pm', 1); });
                    aOnIce.forEach(p => { if(p && p.name) trk(p.name, 'pm', -1); });
                }
            } else {
                trk(aG_name, 'sv', 1); // Record Goalie Save
            }
        }

        // AWAY TEAM ATTACK FLOW
        if (Math.random() < aShotChance) {
            aShots++;
            let shooter = selectShooter(aOnIce);
            trk(shooter.name, 's', 1); // Record Skater Shot
            trk(hG_name, 'sa', 1);     // Record Goalie Shot Against

            // Conversion Roll (Goal vs Save)
            let scoringProb = 0.108 - (diff * 0.004) * hWallMod;
            if (Math.random() < Math.max(0.02, Math.min(0.30, scoringProb))) {
                aG++;
                trk(hG_name, 'ga', 1); // Record Goalie Goal Against
                let ev = processSingleGoal(g.a.nrm, g.a.code, shooter, aOnIce, timeStr, period, (minute % 20 || 20), sec);
                if (ev) {
                    allGoals.push(ev);
                    if (ev.scorer) trk(ev.scorer, 'g', 1);
                    if (ev.pAssist) trk(ev.pAssist, 'a', 1);
                    if (ev.sAssist) trk(ev.sAssist, 'a', 1);
                    // Add plus/minus: away scores, so away players get +1, home get -1
                    aOnIce.forEach(p => { if(p.name) trk(p.name, 'pm', 1); });
                    hOnIce.forEach(p => { if(p.name) trk(p.name, 'pm', -1); });
                }
            } else {
                trk(hG_name, 'sv', 1); // Record Goalie Save
            }
        }

        // Quick Penalty Roll — triggers a real powerplay opportunity
        if (Math.random() < 0.005) { 
            let penTeam = Math.random() > 0.5 ? g.h : g.a;
            let advTeam = penTeam.nrm === g.h.nrm ? g.a : g.h;
            let activeSkaters = penTeam.nrm === g.h.nrm ? hOnIce : aOnIce;
            if (activeSkaters.length > 0) {
                let offender = activeSkaters[Math.floor(Math.random() * activeSkaters.length)].name;
                trk(offender, 'pim', 2);
                penaltyEvents.push({ p: period, m: (minute % 20 || 20), s: sec, str: timeStr, tm: penTeam.code, cl: teamColors[penTeam.nrm] ? teamColors[penTeam.nrm][0] : '#fff', txt: `PENALTY: ${offender} (2 min minor)`, isPenalty: true });
                
                // Track power play opportunity on the team with the advantage
                const advTeamObj = league.find(t => t.nrm === advTeam.nrm);
                if (advTeamObj) advTeamObj.season.ppo = (advTeamObj.season.ppo || 0) + 1;

                // Resolve the powerplay: ~20% PP conversion rate
                const ppRoll = Math.random();
                const ppUnit = advTeam.nrm === g.h.nrm ? hOnIce : aOnIce;
                const pkUnit = advTeam.nrm === g.h.nrm ? aOnIce : hOnIce;

                if (ppRoll < 0.20 && ppUnit.length > 0) {
                    // POWERPLAY GOAL
                    const ppShooter = selectShooter(ppUnit);
                    const ppShooterName = (ppShooter && typeof ppShooter === 'object') ? ppShooter.name : ppShooter;
                    const ppEv = processSingleGoal(advTeam.nrm, advTeam.code, ppShooter, ppUnit, timeStr, period, (minute % 20 || 20), sec);
                    if (ppEv) {
                        allGoals.push(ppEv);
                        if (advTeam.nrm === g.h.nrm) hG++; else aG++;
                        trk(ppEv.scorer, 'g', 1);
                        if (ppEv.pAssist) trk(ppEv.pAssist, 'a', 1);
                        if (ppEv.sAssist) trk(ppEv.sAssist, 'a', 1);
                        // PPG on scorer and PPA on assisters
                        if (playerStats[ppEv.scorer]) { const kk = (isPlayoffs||isASG)?'playoff':'season'; playerStats[ppEv.scorer][kk].ppg = (playerStats[ppEv.scorer][kk].ppg||0)+1; }
                        if (ppEv.pAssist && playerStats[ppEv.pAssist]) { const kk = (isPlayoffs||isASG)?'playoff':'season'; playerStats[ppEv.pAssist][kk].ppa = (playerStats[ppEv.pAssist][kk].ppa||0)+1; }
                        if (ppEv.sAssist && playerStats[ppEv.sAssist]) { const kk = (isPlayoffs||isASG)?'playoff':'season'; playerStats[ppEv.sAssist][kk].ppa = (playerStats[ppEv.sAssist][kk].ppa||0)+1; }
                        if (advTeamObj) advTeamObj.season.ppg = (advTeamObj.season.ppg || 0) + 1;
                        penaltyEvents.push({ p: period, m: (minute % 20 || 20), s: sec+1, str: timeStr, tm: advTeam.code, txt: `PP GOAL: ${ppEv.scorer}`, isPenalty: false });
                    }
                } else if (ppRoll < 0.225 && pkUnit.length > 0) {
                    // SHORTHANDED GOAL (~2.5% of PP opp result in SHG)
                    const shShooter = selectShooter(pkUnit);
                    const shEv = processSingleGoal(penTeam.nrm, penTeam.code, shShooter, pkUnit, timeStr, period, (minute % 20 || 20), sec);
                    if (shEv) {
                        allGoals.push(shEv);
                        if (penTeam.nrm === g.h.nrm) hG++; else aG++;
                        trk(shEv.scorer, 'g', 1);
                        if (shEv.pAssist) trk(shEv.pAssist, 'a', 1);
                        if (shEv.sAssist) trk(shEv.sAssist, 'a', 1);
                        // SHG on scorer
                        if (playerStats[shEv.scorer]) { const kk = (isPlayoffs||isASG)?'playoff':'season'; playerStats[shEv.scorer][kk].shg = (playerStats[shEv.scorer][kk].shg||0)+1; }
                        penaltyEvents.push({ p: period, m: (minute % 20 || 20), s: sec+1, str: timeStr, tm: penTeam.code, txt: `SH GOAL: ${shEv.scorer}`, isPenalty: false });
                    }
                }
            }
        }
    }

    // 🥅 5. OVERTIME RESOLUTION
    let otPeriods = 0;
    if(isPlayoffs && hG === aG) { 
        while (hG === aG && otPeriods < 7) { 
            otPeriods++; 
            if (Math.random() < 0.52) { hG++; hShots++; trk(aG_name,'sa',1); trk(aG_name,'ga',1); } 
            else { aG++; aShots++; trk(hG_name,'sa',1); trk(hG_name,'ga',1); } 
        }
    }

    // 📊 6. COMPILE BOX SCORE
    allGoals.push(...penaltyEvents); 
    allGoals.sort((a,b) => a.p !== b.p ? a.p - b.p : (a.m !== b.m ? a.m - b.m : a.s - b.s));

    // 🏆 GAME WINNING GOAL — credit the scorer of the winning team's lead-clinching goal
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

    // 🤕 7. INJURIES
    if (typeof rollInGameInjuries === 'function') {
        rollInGameInjuries(g.h.nrm, g.a.nrm);
    }
    
    // 🥅 8. GOALIE POSITION RECORDING
    let hStatus = hG > aG ? 'win' : (hG < aG ? 'loss' : 'tie'); 
    let aStatus = aG > hG ? 'win' : (aG < hG ? 'loss' : 'tie');
    let totalGameMinutes = 60 + (otPeriods * 5);
    
    if (hG_obj) {
        playerStats[hG_name][k].gp++;
        if (aG === 0) playerStats[hG_name][k].so++;
        if (hStatus === 'win') playerStats[hG_name][k].w++; else if (hStatus === 'loss') playerStats[hG_name][k].l++; else playerStats[hG_name][k].t++;
        trk(hG_name, 'toi', totalGameMinutes);
    }
    if (aG_obj) {
        playerStats[aG_name][k].gp++;
        if (hG === 0) playerStats[aG_name][k].so++;
        if (aStatus === 'win') playerStats[aG_name][k].w++; else if (aStatus === 'loss') playerStats[aG_name][k].l++; else playerStats[aG_name][k].t++;
        trk(aG_name, 'toi', totalGameMinutes);
    }

    g.result = { 
        hG, aG, ot: otPeriods, boxLog: allGoals, matchStats, 
        awayRoster: [...aStruct.f.flat(), ...aStruct.d.flat()].map(p=>p.name), 
        homeRoster: [...hStruct.f.flat(), ...hStruct.d.flat()].map(p=>p.name),
        hGoalie: hG_name, aGoalie: aG_name, hShots, aShots 
    }; 

    // 📈 9. CENTRALIZED SINGLE-WRITE STAT APPLICATION
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
            }
        }

        if(!isPlayoffs) {
            if(hG > aG) { g.h.season.w++; g.h.season.pts += 2; g.a.season.l++; g.h.winStreak++; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless = 0; g.a.loseStreak++; g.a.winless++; g.a.winStreak = 0; g.a.undefeated = 0; } 
            else if(aG > hG) { g.a.season.w++; g.a.season.pts += 2; g.h.season.l++; g.a.winStreak++; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless = 0; g.h.loseStreak++; g.h.winless++; g.h.winStreak = 0; g.h.undefeated = 0; } 
            else { g.h.season.t++; g.a.season.t++; g.h.season.pts++; g.a.season.pts++; g.h.winStreak = 0; g.h.undefeated++; g.h.loseStreak = 0; g.h.winless++; g.a.winStreak = 0; g.a.undefeated++; g.a.loseStreak = 0; g.a.winless++; }
            g.h.season.gp++; g.a.season.gp++; g.h.season.gf += hG; g.h.season.ga += aG; g.a.season.gf += aG; g.a.season.ga += hG;
        } else if(g.series) { if(hG > aG) g.series.hW++; else g.series.aW++; }
    }

    // 🧹 10. MORALE & POST-GAME CLEANUP
    let isHomeWin = (hG > aG);
    const winningTeamRoster = isHomeWin ? [...hStruct.f.flat(), ...hStruct.d.flat()] : [...aStruct.f.flat(), ...aStruct.d.flat()];
    const losingTeamRoster = isHomeWin ? [...aStruct.f.flat(), ...aStruct.d.flat()] : [...hStruct.f.flat(), ...hStruct.d.flat()];

    if (winningTeamRoster) {
        let winBoost = isHomeWin ? 12 : 8; 
        winningTeamRoster.forEach(p => {
            if (playerStats[p.name]) playerStats[p.name].morale = Math.min(150, playerStats[p.name].morale + winBoost);
        });
    }

    if (losingTeamRoster && !isPlayoffs) { 
        let lossPenalty = (!isHomeWin) ? 12 : 6; 
        losingTeamRoster.forEach(p => {
            if (playerStats[p.name]) playerStats[p.name].morale = Math.max(50, playerStats[p.name].morale - lossPenalty);
        });
    }

    let activeGoalies = [hG_obj, aG_obj].filter(g => g !== null);
    if (typeof processPostGameStreaks === 'function') processPostGameStreaks(winningTeamRoster.concat(losingTeamRoster), activeGoalies);
    if (typeof applyPostGameFatigue === 'function' && awayGoalie && homeGoalie) applyPostGameFatigue(g.a.nrm, g.h.nrm, awayGoalie.name, homeGoalie.name);
    if (typeof reviewGameForSuspensions === 'function') reviewGameForSuspensions(matchStats, g.h.nrm, g.a.nrm);
    if (typeof triggerGameInjuries === 'function') triggerGameInjuries(matchStats, g.h.nrm, g.a.nrm);
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

        // Base weight from attributes — same formula for all positions
        let weight = (off * 0.40) + (pwr * 0.30) + (acc * 0.30);

        // Archetype multiplier
        weight *= (arch.shotRate || 1.0);

        // Position modifier — ALL forwards equal base (1.0), D penalized
        const pos = ps.pos || 'D';
        const isD = (pos === 'D' || pos === 'LD' || pos === 'RD');
        weight *= isD ? 0.69 : 1.0;  // D ~31% less likely to score than a forward

        // Hot/cold modifier
        if (ps.isHot)  weight *= 1.20;
        if (ps.isCold) weight *= 0.80;

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
    // scorerName and onIcePlayers may be objects {name,pos,...} or strings — normalize all to name strings
    const scorerStr = (scorerName && typeof scorerName === 'object') ? scorerName.name : scorerName;
    const onIceNames = onIcePlayers
        .map(p => (p && typeof p === 'object') ? p.name : p)
        .filter(Boolean);

    // STRICT: only the 5-man unit on ice can be credited — scorer already chosen, assisters from same unit only
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

        // Position modifier — all forwards equal base, D penalized ~30%
        const pos = ps.pos || 'D';
        const isD = (pos === 'D' || pos === 'LD' || pos === 'RD');
        weight *= isD ? 0.70 : 1.0;

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

    // Primary Assist (~90% chance)
    if (remaining.length > 0 && Math.random() < 0.90) {
        primaryAssist = weightedPick(remaining);
        remaining = remaining.filter(n => n !== primaryAssist);
    }

    // Secondary Assist (~76% chance if primary exists and players remain)
    if (primaryAssist && remaining.length > 0 && Math.random() < 0.76) {
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

function applyDailyRandomSwing(tk, gameObj) {
    // 1. Get the current roster structure (which only contains starters)
    const struct = getRosterStructure(tk);
    if (!struct || !struct.f || !struct.d || !struct.g) return;

    // 2. Combine only the starters into one flat array
    // This includes: All 4 Forward lines, all 3 D-pairs, and the starting Goalie
    let starters = [
        ...struct.f.flat(), 
        ...struct.d.flat(), 
        struct.g[0] // The starting goalie (the first one in the G array)
    ].filter(p => p && playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0);

    // 3. Reset all players on the full roster to 0 first (Cleanup)
    rosters[tk].forEach(p => {
        if (playerStats[p.name]) playerStats[p.name].dailySwing = 0;
    });

    // 4. Force selection from the 'starters' pool only
    if (starters.length >= 2) {
        let shuffled = starters.sort(() => 0.5 - Math.random());
        let hotPlayer = shuffled[0];
        let coldPlayer = shuffled[1];

        // 5. Assign the swings
        playerStats[hotPlayer.name].dailySwing = 10;
        playerStats[coldPlayer.name].dailySwing = -10;
        
        console.log(`[SWING] ${tk.toUpperCase()} | HOT: ${hotPlayer.name} (+10) | COLD: ${coldPlayer.name} (-10)`);
    }
}

// =========================================================
// 📊 POST-GAME STAT TRACKING (Unified Ice Time & SVG)
// =========================================================
/**
 * Track ice time and SVG (Shots vs Goals) for entire roster post-game
 * @param {array} roster - Team roster with name/pos properties
 * @param {string} teamCode - Normalized team code
 * @param {array} scoringPlayers - Goals array from this game [{scorer, a1, a2, ...}]
 * @param {boolean} isGoalieStart - Whether goalie started this game
 */
function trackPostGameStats(roster, teamCode, scoringPlayers, isGoalieStart = false) {
    if (!roster || !Array.isArray(roster)) return;
    
    roster.forEach(player => {
        if (!playerStats[player.name]) return;
        
        const ps = playerStats[player.name];
        const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
        
        if (player.pos === 'G') {
            // Goalie: +60 TOI per start, +1 SVG per game started
            if (isGoalieStart) {
                ps[k].toi += GAME_CONFIG.ice_time.goalie_full;
                ps[k].svg += 1;
            }
        } else {
            
            // SVG: Count goals scored this game by this player
            const goalsScored = scoringPlayers.filter(g => g.scorer === player.name).length;
            ps[k].svg += goalsScored;
        }
    });
}

// =========================================================
// 💪 POST-GAME MORALE SYSTEM (Refactored)
// =========================================================
/**
 * Apply post-game morale swings based on game result and scoring
 * @param {array} winnerRoster - Winning team's roster
 * @param {array} loserRoster - Losing team's roster
 * @param {array} scoringPlayers - All goal records from game
 * @param {boolean} isHomeWin - Whether home team won
 * @param {boolean} isRegularSeason - Whether regular season (affects loss penalty)
 */
function applyPostGameMorale(winnerRoster, loserRoster, scoringPlayers, isHomeWin, isRegularSeason) {
    if (winnerRoster) {
        const winBoost = isHomeWin ? GAME_CONFIG.morale.win_home : GAME_CONFIG.morale.win_away;
        
        winnerRoster.forEach(player => {
            if (!playerStats[player.name]) return;
            
            let boost = winBoost;
            
            // Extra boost for goal scorers
            if (scoringPlayers && scoringPlayers.some(g => g.scorer === player.name)) {
                boost += GAME_CONFIG.morale.scorer_bonus;
            }
            
            playerStats[player.name].morale = Math.min(
                GAME_CONFIG.morale.max, 
                playerStats[player.name].morale + boost
            );
        });
    }
    
    if (loserRoster && isRegularSeason) {
        const lossPenalty = !isHomeWin 
            ? GAME_CONFIG.morale.loss_home 
            : GAME_CONFIG.morale.loss_away;
        
        loserRoster.forEach(player => {
            if (!playerStats[player.name]) return;
            
            playerStats[player.name].morale = Math.max(
                GAME_CONFIG.morale.min, 
                playerStats[player.name].morale - lossPenalty
            );
        });
    }
}

// 🎲 2. THE BACKGROUND PENALTY ROLLER (Renamed and Upgraded)
// Call this randomly during standard play: let penResult = rollGeneralPenalty(attacker);
function rollGeneralPenalty(attacker) {
    // 1. Safely extract attributes (0-99 scale, defaulting to 50 if missing)
    let rgh = attacker.stats?.RGH || attacker.attr?.rough || 50;
    let agr = attacker.stats?.AGR || attacker.attr?.aggr || 50;
    let chk = attacker.stats?.CHK || attacker.attr?.check || 50;

    // Handle legacy letter grades just in case you load an old save file
    if (typeof rgh === 'string') rgh = 50;
    if (typeof agr === 'string') agr = 50;
    if (typeof chk === 'string') chk = 50;

    // 2. Base Probability (Overall chance to commit ANY penalty)
    // Aggression and Roughness drive the likelihood of breaking the rules
    let basePenaltyChance = 0.05; 
    let temperamentModifier = (rgh + agr) / 100; // 50+50 = 1.0x. 99+99 = ~2.0x
    
    // Calculate final probability including Ref Strictness (if you have it defined)
    let refMod = typeof REF_STRICTNESS !== 'undefined' ? REF_STRICTNESS : 1.0;
    let finalPenaltyChance = basePenaltyChance * temperamentModifier * refMod;

    // 3. Roll the dice for a penalty!
    if (Math.random() < finalPenaltyChance) {
        
        // 4. Determine Penalty Type based on Checking (CHK) rating
        // Low Checking = Stick Infractions (Clumsy defense)
        // High Checking = Physical Infractions (Overly aggressive hits)
        
        const stickWeight = Math.max(10, 100 - chk);
        const physicalWeight = Math.max(10, chk);
        const totalWeight = stickWeight + physicalWeight;
        const roll = Math.random() * totalWeight;
        
        // Use PENALTY_REGISTRY to pick infraction type
        const infractions = roll < stickWeight ? PENALTY_REGISTRY.stick : PENALTY_REGISTRY.physical;
        const infractionName = infractions[Math.floor(Math.random() * infractions.length)];
        
        // Base major chance, with escalation for physical infractions
        let isMajor = Math.random() < GAME_CONFIG.penalties.major_chance;
        if (roll >= stickWeight && Math.random() < GAME_CONFIG.penalties.major_escalation) {
            isMajor = true;  // Physical infractions escalate more easily
        }

        const pim = isMajor ? 5 : 2;

        return {
            penaltyCalled: true,
            minutes: pim,
            type: isMajor ? "Major" : "Minor",
            infraction: infractionName
        };
    } else {
        // No penalty occurred
        return { 
            penaltyCalled: false, 
            minutes: 0, 
            type: "None", 
            infraction: "" 
        };
    }
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
    Object.values(playerStats).forEach(p => {
        [1, 2, 3, 4].forEach(r => {
            if (p.pos === 'G') p[`playoff_${r}`] = {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0, toi:0, svg:0};
            else p[`playoff_${r}`] = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0};
        });
        // Clear the aggregate just in case
        if (p.pos === 'G') p.playoff = {gp:0, g:0, a:0, pm:0, so:0, sv:0, sa:0, w:0, l:0, t:0, pim:0, ppg:0, toi:0, svg:0};
        else p.playoff = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0, toi:0, svg:0};
    });
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
    if(playoffBracket.round === 4) { 
        if(w[0]) currentCupChamp = w[0].name; 
        runEndOfSeasonAwards(); 
        
        // 🚨 Spawn the button to jump straight into the next year!
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
        if (p.pos === 'G') { 
            p.attr.gDef = Math.max(20, Math.min(99, p.attr.gDef + dChg)); 
            p.attr.ovr = Math.max(20, Math.min(99, p.attr.ovr + dChg)); // Preserves your custom Matrix OVR!
        }
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
        // Safety net: Give existing players the careerPlayoff tracker if they don't have it yet
        if (!p.careerPlayoff) {
            if (p.pos === 'G') p.careerPlayoff = {gp:0, w:0, l:0, t:0, so:0, sv:0, sa:0};
            else p.careerPlayoff = {gp:0, g:0, a:0, pts:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0};
        }

        if (p.pos === 'G') {
            // Archive Regular Season to Career Regular Season
            p.career.gp += p.season.gp; p.career.w += p.season.w; p.career.l += (p.season.l || 0); p.career.t += (p.season.t || 0); p.career.so += p.season.so; p.career.sv += p.season.sv; p.career.sa += p.season.sa;
            
            // Archive Playoff to Career Playoff
            p.careerPlayoff.gp += p.playoff.gp; p.careerPlayoff.w += p.playoff.w; p.careerPlayoff.l += (p.playoff.l || 0); p.careerPlayoff.so += p.playoff.so; p.careerPlayoff.sv += p.playoff.sv; p.careerPlayoff.sa += p.playoff.sa;

            // Wipe clean for the new year
            p.season = {gp:0, w:0, l:0, t:0, so:0, sv:0, sa:0, consStarts:0}; 
            p.playoff = {gp:0, w:0, l:0, so:0, sv:0, sa:0, consStarts:0};
        } else {
            // Archive Regular Season to Career Regular Season
            p.career.gp += p.season.gp; p.career.g += p.season.g; p.career.a += p.season.a; p.career.pts += (p.season.g + p.season.a); p.career.pm += (p.season.pm || 0); p.career.pim += (p.season.pim || 0); p.career.ppg += (p.season.ppg || 0); p.career.shg += (p.season.shg || 0); p.career.gwg += (p.season.gwg || 0); p.career.s += (p.season.s || 0); 
            
            // Archive Playoff to Career Playoff
            p.careerPlayoff.gp += p.playoff.gp; p.careerPlayoff.g += p.playoff.g; p.careerPlayoff.a += p.playoff.a; p.careerPlayoff.pts += (p.playoff.g + p.playoff.a); p.careerPlayoff.pm += (p.playoff.pm || 0); p.careerPlayoff.pim += (p.playoff.pim || 0); p.careerPlayoff.ppg += (p.playoff.ppg || 0); p.careerPlayoff.shg += (p.playoff.shg || 0); p.careerPlayoff.gwg += (p.playoff.gwg || 0); p.careerPlayoff.s += (p.playoff.s || 0);
            
            // Wipe clean for the new year
            p.season = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0}; 
            p.playoff = {gp:0, g:0, a:0, pm:0, pim:0, ppg:0, shg:0, gwg:0, s:0};
        }
        p.streakType = 'stable'; p.hasScored = false; 
    });
    
    takeMonthSnapshot(); 
    document.getElementById('bracketContainer').style.display = 'none'; document.getElementById('playoffViewToggles').style.display = 'none'; document.getElementById('standingsGrids').style.display = 'grid'; 
    document.getElementById('tabStandings').className = 'mode-btn active'; document.getElementById('tabBracket').className = 'mode-btn'; document.getElementById('seasonYearDisplay').innerText = currentSeason; 
    
    const sBtn = document.getElementById('btnStartNextSeason'); if (sBtn) sBtn.remove();
    
    // 🚨 Turn all simulation tools back ON (including your new simNextGame button)
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
            updateUI();
            if (slowMode) await sleep(200);
        }
        if (!bypassLock) { advanceCalendar(); }
    } finally { if (!bypassLock) isSimulating = false; updateUI(); }
}

// 🏒 GAME-BY-GAME SIMULATION ENGINE
function simNextGame() {
    const games = Array.isArray(calendar[currentDay]) ? calendar[currentDay] : [];
    
    // Find the very first game today that hasn't been played yet
    const nextIdx = games.findIndex(g => !g.result);
    
    if (nextIdx !== -1) {
        // 1. Simulate just this one specific game
        simGame(nextIdx);
        
        // 2. 🚨 MAGIC TRICK: Set it as the active game so the Jumbotron immediately displays its box score!
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
    
    if (currentDay === Math.floor(calendar.length / 2) && !isPlayoffs && !isASG && awardConfig.streaks) { initAllStarGame(); return false; }
    if (isASG && calendar[currentDay] && !calendar[currentDay].some(g => g.isASG_game)) isASG = false;

    if (!getGameAt(currentDay, activeIdx)) {
        activeIdx = null;
        const btn = document.getElementById('btnGameSelect');
        if (btn) btn.innerText = 'ARENA';
    }
    
    // 🏆 PLAYOFF FIX: Automatically spawn the next games OR end the round and show the Advance button!
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

// 2. Draw the buttons on the screen (Upgraded with Explicit Positional Slots)
function updateUIDisplay() {
    const container = document.getElementById('lines-display');
    if (!container) return; 
    
    container.innerHTML = ''; // Wipe the slate clean

    // ==========================================
    // 🏒 DRAW FORWARDS (Enforces LW, C, RW layout)
    // ==========================================
    let fHtml = `<h3>Forwards</h3>`;
    currentEditableLines.f.forEach((line, index) => {
        fHtml += `<div class="hockey-line"><strong>L${index + 1}: </strong>`;
        
        // The AI Builder stores players as: [0] Center, [1] Left Wing, [2] Right Wing
        // We map them here to visually display in the classic EA order: LW -> C -> RW
        let displayLine = [
            { slot: 'LW', p: line[1] },
            { slot: 'C',  p: line[0] },
            { slot: 'RW', p: line[2] }
        ].filter(item => item.p); // Failsafe to remove empty slots if roster is short

        displayLine.forEach(item => {
            let isSelected = (currentlySelectedPlayer === item.p.name) ? 'selected-player' : '';
            fHtml += `<button class="player-btn ${isSelected}" onclick="handlePlayerClick('${item.p.name}')">
                        ${item.slot}: ${item.p.name}
                     </button>`;
        });
        fHtml += `</div>`;
    });
    container.innerHTML += fHtml;

    // ==========================================
    // 🛡️ DRAW DEFENSE (Enforces LD, RD layout)
    // ==========================================
    let dHtml = `<h3>Defense</h3>`;
    currentEditableLines.d.forEach((line, index) => {
        dHtml += `<div class="hockey-line"><strong>D${index + 1}: </strong>`;
        
        let displayD = [
            { slot: 'LD', p: line[0] },
            { slot: 'RD', p: line[1] }
        ].filter(item => item.p);

        displayD.forEach(item => {
            let isSelected = (currentlySelectedPlayer === item.p.name) ? 'selected-player' : '';
            dHtml += `<button class="player-btn ${isSelected}" onclick="handlePlayerClick('${item.p.name}')">
                        ${item.slot}: ${item.p.name}
                     </button>`;
        });
        dHtml += `</div>`;
    });
    container.innerHTML += dHtml;

    // ==========================================
    // 🥅 DRAW GOALIES (Enforces Starter, Backup)
    // ==========================================
    let gHtml = `<h3>Goalies</h3><div class="hockey-line"><strong>G: </strong>`;
    currentEditableLines.g.forEach((player, index) => {
         let isSelected = (currentlySelectedPlayer === player.name) ? 'selected-player' : '';
         let slotLabel = index === 0 ? 'START' : 'BACKUP';
         gHtml += `<button class="player-btn ${isSelected}" onclick="handlePlayerClick('${player.name}')">
                      ${slotLabel}: ${player.name}
                   </button>`;
    });
    gHtml += `</div>`;
    container.innerHTML += gHtml;
}

function renderTeamStats() {
        const sel = document.getElementById('teamViewSelect');
        if (!sel || !sel.value) return;
        const tk = sel.value;
        const k = statMode || (typeof isPlayoffs !== 'undefined' && isPlayoffs ? 'playoff' : 'season'); 
        const struct = getRosterStructure(tk); 
    const tD = league.find(t => t.nrm === tk);
    const dynOvr = getDynamicTeamOvr(tk);
    const getEmoji = (pName) => { let st = playerStats[pName] ? playerStats[pName].streakType : ''; return st === 'hot' ? '🔥' : (st === 'cold' ? '❄️' : ''); };
    // Get morale and status badges
    const getMoraleEmoji = (pName) => {
        const morale = playerStats[pName]?.morale || 100;
        if (morale >= 125) return '😊';
        if (morale < 75) return '😢';
        return '😐';
    };
    const getStatusBadge = (pName) => {
        const ps = playerStats[pName];
        if (!ps) return '';
        let badges = '';
        if (ps.injury && ps.injury.daysRemaining > 0) badges += '🚑';
        if (ps.suspended && ps.suspended.days > 0) badges += '⛔';
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
            
            // 🛡️ SAFETY NET: If the slot is empty, print a placeholder instead of crashing
            if (!p) {
                return `<tr><td><span style="color:var(--neon-cyan); font-weight:bold; font-size:8px;">${posLabel}</span> <span style="color:#555;">-- EMPTY SLOT --</span></td><td></td></tr>`;
            }

            // ⏱️ ATOI CALCULATION
            let psObj = playerStats[p.name];
            let toi = psObj && psObj[k] && psObj[k].gp > 0 ? Math.round(psObj[k].toi / psObj[k].gp) : 0;

            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${p.name}')"><td><span style="color:var(--neon-cyan); font-weight:bold; font-size:8px;">${posLabel}</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${p.name}', 'F'); event.stopPropagation();">🔁</button>${getMoraleEmoji(p.name)} ${p.name} ${getArchetypeBadge(p.name)} ${getPlayerBadges(p.name)}</td><td style="text-align:right;"><span style="color:#ccc; font-size:8px; margin-right:6px; font-weight:bold;">ATOI: ${toi}</span> <span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(p.name)}</span></td></tr>`; 
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
            
            // 🛡️ SAFETY NET
            if (!d) {
                return `<tr><td><span style="color:var(--line-red); font-weight:bold; font-size:8px;">${posLabel}</span> <span style="color:#555;">-- EMPTY SLOT --</span></td><td></td></tr>`;
            }

            // ⏱️ ATOI CALCULATION
            let psObj = playerStats[d.name];
            let toi = psObj && psObj[k] && psObj[k].gp > 0 ? Math.round(psObj[k].toi / psObj[k].gp) : 0;

            return `<tr style="cursor:pointer;" onclick="showPlayerCard('${d.name}')"><td><span style="color:var(--line-red); font-weight:bold; font-size:8px;">${posLabel}</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${d.name}', 'D'); event.stopPropagation();">🔁</button>${getStatusBadge(d.name)}${getMoraleEmoji(d.name)}${d.name} ${getArchetypeBadge(d.name)} ${getEmoji(d.name)}</td><td style="text-align:right;"><span style="color:#ccc; font-size:8px; margin-right:6px; font-weight:bold;">ATOI: ${toi}</span> <span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(d.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(d.name)}</span></td></tr>`; 
        }).join('');
        
        h += `</table>`;
    });
    
    if(struct.g && struct.g.length > 0) {
        h += `<div class="unit-header">GOALTENDERS</div><table style="width:100%;">`;
        h += struct.g.map((g,i) => {
            if (!g) return ''; // 🛡️ SAFETY NET
            return `<tr><td style="cursor:pointer;" onclick="showPlayerCard('${g.name}')"><span style="color:#FFD700; font-weight:bold; font-size:8px;">[G]</span> <button style="${yStyle}" onclick="openSubMenu('${tk}', '${g.name}', 'G'); event.stopPropagation();">🔁</button>${getStatusBadge(g.name)}${getMoraleEmoji(g.name)}${g.name} ${getArchetypeBadge(g.name)} ${getEmoji(g.name)} (${i===0?'STARTER':'BACKUP'})</td><td style="text-align:right;"><span style="color:#aaa; font-size:8px;">OVR: ${getPlayerWeightedStats(g.name).ovr}</span> <span style="color:var(--neon-cyan); font-size:8px; margin-left:4px;">LIVE: ${getLiveIceOvr(g.name)}</span></td></tr>`;
        }).join('');
        h += `</table>`;
    }
   
   // 🛡️ SPECIAL TEAMS EDITOR INTEGRATION 
    h += `</div></div><div class="grid-2" style="margin-top:20px; border-top:2px solid #333; padding-top:15px;">`;
    
    // ==========================================
    // 🏒 POWER PLAY
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
            if (!p) return `<div class="player-slot" style="color:#555; text-align:center;">-- EMPTY --</div>`; // 🛡️ SAFETY NET
            
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
    // 🛡️ PENALTY KILL
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
        <div style="font-size:10px; color:#fff;">${playerStats[p.name].injury>0?'🚑':''}${p.name} ${getArchetypeBadge(p.name)}</div>
        <div style="font-size:8px; color:#FF55FF; margin-top:3px;">OVR: ${getPlayerWeightedStats(p.name).ovr}</div>
        </div>`).join('');
    h += `</div></div><div class="grid-2" style="margin-top:20px;"><div>`; 

    const activeNames = [...struct.f.flat(), ...struct.d.flat(), ...(struct.g || []).slice(0,2)].map(x => x.name);
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
    h += `<div><div class="unit-header">SKATER STATISTICS</div><table style="width:100%; text-align:center;">
          <tr>
            <th style="text-align:left;">PLAYER</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>S</th><th>S%</th><th>GWG</th><th>+/-</th>
            <th style="color:var(--ea-yellow);" title="Power Play Goals">PPG</th>
            <th style="color:var(--ea-yellow);" title="Power Play Assists">PPA</th>
            <th style="color:#00FFFF;" title="Short Handed Goals">SHG</th>
            <th style="color:#ccc;" title="Average Time On Ice">ATOI</th>
          </tr>`;

    if (rosters[tk]) {
        let sk = rosters[tk].filter(p => p.pos !== 'G').sort((a, b) => (playerStats[b.name][k].g + playerStats[b.name][k].a) - (playerStats[a.name][k].g + playerStats[a.name][k].a));
        
        h += sk.map(p => { 
            const st = playerStats[p.name]; 
            // 🛡️ DATA SAFETY: Ensure the current 'k' (season/playoff) object exists
            if (!st[k]) st[k] = { toi: 0, gp: 0, g: 0, a: 0, s: 0, pm: 0 }; 

            const sPct = st[k].s > 0 ? ((st[k].g / st[k].s) * 100).toFixed(1) + '%' : '0.0%'; 
            const pmVal = st[k].pm || 0;
            const pmColor = pmVal > 0 ? '#0F0' : (pmVal < 0 ? '#F55' : '#888');
            
            // ⏱️ CALCULATE ATOI
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
    
    // Calculate average OVR of the line based on active fatigue/streaks
    const totalOvr = line.reduce((sum, p) => {
        const stats = getPlayerWeightedStats(p.name);
        return sum + (stats.ovr || 0);
    }, 0);
    
    return Math.round(totalOvr / line.length);
}

/**
 * Distributes 60 minutes of ice time dynamically
 * @param {Array} linesArray - The structure containing all lines (e.g., struct.f)
 */
function distributeIceTime(linesArray) {
    // 1. Get Live Strengths
    let strengths = linesArray.map(line => getLiveLineOvr(line));
    
    // 2. Exponential weight: Stronger lines pull away
    // Line 1 is index 0. If L1 is 85 and L2 is 80, L1 gets disproportionately more ice.
    let weights = strengths.map(ovr => Math.pow(ovr / 70, 3)); 
    let totalWeight = weights.reduce((a, b) => a + b, 0);
    
    // 3. Map to 60 minutes
    return weights.map(w => Math.round((w / totalWeight) * 60));
}

    /**
 * Calculates ice time distribution based on differences between lines.
 * @param {Array} ovrs - Array of overalls [L1, L2, L3, L4] or [D1, D2, D3]
 * @param {number} totalMins - Total available minutes for that unit (e.g., 60 for forwards)
 * @param {boolean} isPlayoff - Whether to use playoff caps
 */
function calculateLineIceTime(ovrs, totalMins, isPlayoff) {
    const numLines = ovrs.length;
    let weights = new Array(numLines).fill(1);

    // 1. Calculate differences between adjacent lines
    for (let i = 1; i < numLines; i++) {
        let diff = ovrs[i - 1] - ovrs[i];
        if (Math.abs(diff) <= 2) {
            weights[i] = weights[i - 1]; // Parity
        } else {
            // Apply exponential weight
            weights[i] = weights[i - 1] * Math.pow(0.85, diff); 
        }
    }

    let totalWeight = weights.reduce((a, b) => a + b, 0);

    // 2. 🛡️ THE MISSING CAP: Apply your throttle to the stat sheet!
    let maxPercent = isPlayoff ? 0.433 : 0.383;
    
    if (weights.length > 0 && (weights[0] / totalWeight) > maxPercent) {
        let remainingWeight = totalWeight - weights[0];
        let allowedL1Weight = remainingWeight * (maxPercent / (1 - maxPercent));
        weights[0] = allowedL1Weight;
        
        // Recalculate the total weight pool with the new capped value
        totalWeight = weights.reduce((a, b) => a + b, 0); 
    }

    // 3. Normalize to fit total minutes and set a safe floor of 5 mins for the 4th line
    return weights.map(w => {
        let rawMins = Math.round((w / totalWeight) * totalMins);
        return Math.max(5, rawMins); // Ensures no line gets less than 5 minutes
    });
}

function processGameIceTime(struct, k) {
    const isPlayoff = (k === 'playoff' || k.startsWith('playoff'));

    // 1. Get Overalls
    const fOvrs = [getLineOvr(struct.f[0]), getLineOvr(struct.f[1]), getLineOvr(struct.f[2]), getLineOvr(struct.f[3])];
    const dOvrs = [getPairOvr(struct.d[0]), getPairOvr(struct.d[1]), getPairOvr(struct.d[2])];

    // 2. Calculate Minutes (Pass the isPlayoff flag!)
    const fMins = calculateLineIceTime(fOvrs, 60, isPlayoff);
    const dMins = calculateLineIceTime(dOvrs, 60, isPlayoff);

    // 3. Apply to Forwards
    for (let i = 0; i < 4; i++) {
        struct.f[i].forEach(player => {
            if (playerStats[player.name]) {
                playerStats[player.name][k].toi = (playerStats[player.name][k].toi || 0) + fMins[i];
            }
        });
    }

    // 4. Apply to Defense
    for (let i = 0; i < 3; i++) {
        struct.d[i].forEach(player => {
            if (playerStats[player.name]) {
                playerStats[player.name][k].toi = (playerStats[player.name][k].toi || 0) + dMins[i];
            }
        });
    }
}

/**
 * Calculates the overall rating for a defensive pair
 * @param {Array} pair - An array of two player objects
 * @returns {number} - The average overall rating of the pair
 */
function getPairOvr(pair) {
    if (!pair || pair.length === 0) return 0;
    
    // Calculate total OVR of the pair
    let totalOvr = pair.reduce((sum, p) => {
        // Use your existing OVR getter for an individual player
        return sum + (typeof getLiveIceOvr === 'function' ? getLiveIceOvr(p.name) : 50);
    }, 0);
    
    // Return the average
    return Math.round(totalOvr / pair.length);
}

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
            let healthy = r.filter(p => playerStats[p.name] && playerStats[p.name].injury.daysRemaining === 0);
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
    const g = getGameAt(currentDay, activeIdx);
    if (!g) return alert("No valid game found for the selected day/index.");
    const aScore = parseInt(document.getElementById('advAwayScore').value) || 0; const aEN = parseInt(document.getElementById('advAwayEN').value) || 0;
    const hScore = parseInt(document.getElementById('advHomeScore').value) || 0; const hEN = parseInt(document.getElementById('advHomeEN').value) || 0;
    
    const sumG = (side) => advBoxScoreTemp[side].entries.reduce((sum, e) => sum + (e.g || 0), 0);
    const aSum = sumG('away'); const hSum = sumG('home');
    if (aSum + aEN !== aScore) return alert(`ERROR: Away score (${aScore}) does not match entered Player Goals (${aSum}) + Empty Nets (${aEN}).`);
    if (hSum + hEN !== hScore) return alert(`ERROR: Home score (${hScore}) does not match entered Player Goals (${hSum}) + Empty Nets (${hEN}).`);
    
    let k = 'season';
    if (isPlayoffs) k = `playoff_${playoffBracket.round}`;
    if (isASG) k = 'playoff';
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
    
    // Ticker initialization
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
        else {
            // To apply the simulated minutes directly to a player's season logs post-game:
const iceTimeData = g.preCalculatedIceTime.home; // or away

// Example setting Forward Player Ice Time
struct.f.forEach((line, lineIdx) => {
    line.forEach(player => {
        let mins = iceTimeData.forwardLineAverages[lineIdx];
        if (playerStats[player.name]) {
            playerStats[player.name].season.toi = (playerStats[player.name].season.toi || 0) + mins;
        }
    });
});

// Example setting Defense Player Ice Time
struct.d.forEach((pair, pairIdx) => {
    pair.forEach(player => {
        let mins = iceTimeData.defensePairAverages[pairIdx];
        if (playerStats[player.name]) {
            playerStats[player.name].season.toi = (playerStats[player.name].season.toi || 0) + mins;
        }
    });
});
             h += `<div style="background:#111; border:1px solid ${ev.cl}; padding:4px; margin:4px 0;"><span style="color:${ev.cl}; font-weight:bold; margin-right:10px;">[${ev.tm}]</span> <span style="color:#fff;">🚨 GOAL! ${ev.txt.split(' - ')[1]}</span></div>`; }
    });
    h += `<div style="color:var(--ea-yellow); text-align:center; margin-top:20px; font-size:12px;">🚨 FINAL HORN 🚨</div>`;
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
function openLineEditorFromRoster() {
    // Grab the team code directly from the dropdown menu
    let tk = document.getElementById('teamViewSelect').value;
    
    if (!tk) {
        alert("Please select a team from the dropdown first!");
        return;
    }

    // Open the overlay
    document.getElementById('lineEditorOverlay').style.display = 'flex';
    
    // Run the engine we built earlier to draw the interactive buttons
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
        let healthySkaters = roster.filter(p => p.pos !== 'G' && playerStats[p.name] && playerStats[p.name].injury && playerStats[p.name].injury.daysRemaining === 0);
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
    // Toggle various award/feature settings on/off
    const btnId = `btn${setting.charAt(0).toUpperCase() + setting.slice(1).replace(/_/g, '').toLowerCase()}`;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const isOn = btn.textContent.includes('ON');
    if (isOn) {
        btn.textContent = btn.textContent.replace('ON', 'OFF');
        btn.style.opacity = '0.5';
    } else {
        btn.textContent = btn.textContent.replace('OFF', 'ON');
        btn.style.opacity = '1';
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
    
    let res = `<div class="menu-header" style="color:var(--gold-leaf); justify-content:center;">SEASON ${currentSeason} AWARDS</div>`;
    res += `<div style="text-align:center; padding:15px; background:#111; color:var(--ea-yellow); margin-bottom:15px; border:2px solid #333;">STANLEY CUP CHAMPION: <br><span style="font-size:18px;">${currentCupChamp}</span></div><table style="width:100%; font-size:8px; text-align:left;">`;
    
    // We will store the runners up strings here to use in the UI later
    let runnersUp = {};

    // 1. ROCKET RICHARD
    const rocketSorted = [...skaters].sort((a, b) => b.season.g - a.season.g);
    if (rocketSorted.length > 0) {
        awardTrophy(rocketSorted[0].name, currentSeason, "Rocket Richard");
        runnersUp["Rocket Richard"] = rocketSorted.slice(1, 4).map(p => p.name).join(', ');
    }

    // ==========================================
    // 🏆 ADVANCED HART TROPHY (MVP) LOGIC
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

    let mvpCandidates = [];
    skaters.forEach(p => {
        let pts = p.season.g + p.season.a;
        let tm = p.team || "FA";
        let teamStats = teamTopScorers[tm];
        let carryBonus = (teamStats && teamStats[0] === pts && teamStats.length > 1) ? (pts - teamStats[1]) : 0;
        mvpCandidates.push({ name: p.name, score: pts + (carryBonus * 0.75) });
    });

    goalies.forEach(g => {
        let w = g.season.w || 0;
        let so = g.season.so || 0;
        let svPct = g.season.gp > 0 ? (g.season.sv / g.season.sa) : 0;
        let svBonus = svPct > 0.900 ? (svPct - 0.900) * 1000 : 0; 
        mvpCandidates.push({ name: g.name, score: (w * 2.2) + (so * 3) + svBonus });
    });

    const hartSorted = mvpCandidates.sort((a, b) => b.score - a.score);
    if (hartSorted.length > 0) {
        awardTrophy(hartSorted[0].name, currentSeason, "Hart");
        runnersUp["Hart"] = hartSorted.slice(1, 4).map(p => p.name).join(', ');
    }

    // 2. ART ROSS
    const artSorted = [...skaters].sort((a, b) => (b.season.g + b.season.a) - (a.season.g + a.season.a));
    if (artSorted.length > 0) {
        awardTrophy(artSorted[0].name, currentSeason, "Art Ross");
        runnersUp["Art Ross"] = artSorted.slice(1, 4).map(p => p.name).join(', ');
    }

    // 3. CALDER
    const SKATER_ROOKIE_LIMIT = 28; const GOALIE_ROOKIE_LIMIT = 38;
    const calderEligible = allPlayers.filter(p => { const cGP = p.career.gp || 0; return p.pos === 'G' ? (cGP <= GOALIE_ROOKIE_LIMIT && p.season.gp >= minGoalieGP) : (cGP <= SKATER_ROOKIE_LIMIT && p.season.gp >= minSkaterGP); });
    const calderSorted = [...calderEligible].sort((a, b) => { const gs = p => p.pos==='G' ? (p.season.w*4)+(p.season.so*10) : (p.season.g+p.season.a); return gs(b) - gs(a); });
    if (calderSorted.length > 0) {
        awardTrophy(calderSorted[0].name, currentSeason, "Calder");
        runnersUp["Calder"] = calderSorted.slice(1, 4).map(p => p.name).join(', ');
    }

    // 4. LADY BYNG
    const byngSorted = [...skaters].filter(p => (p.season.g + p.season.a) >= 40).sort((a, b) => (a.season.pim || 0) - (b.season.pim || 0) || ((b.season.g + b.season.a) - (a.season.g + a.season.a)));
    if (byngSorted.length > 0) {
        awardTrophy(byngSorted[0].name, currentSeason, "Lady Byng");
        runnersUp["Lady Byng"] = byngSorted.slice(1, 4).map(p => p.name).join(', ');
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
    }

    // 6. FRANK J. SELKE
    const selkeSorted = skaters
        .filter(p => p.season.gp >= 40 && [ 'PRO DEFENSIVE FWD', 'DEFENSIVE FWD', 'TWO-WAY FWD', 'GRINDER', 'POWER FORWARD'].includes(getPlayerWeightedStats(p.name).tag))
        .sort((a, b) => {
            let scoreA = (getDef(a.name) * 0.6) + ((a.season.pm || 0) * 0.4);
            let scoreB = (getDef(b.name) * 0.6) + ((b.season.pm || 0) * 0.4);
            return scoreB - scoreA;
        });
        
    if (selkeSorted.length > 0) {
        awardTrophy(selkeSorted[0].name, currentSeason, "Selke");
        runnersUp["Selke"] = selkeSorted.slice(1, 4).map(p => p.name).join(', ');
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
    }

    // 8. ALKA-SELTZER PLUS MINUS
    const plusMinusSorted = [...skaters].sort((a, b) => (b.season.pm || 0) - (a.season.pm || 0));
    if (plusMinusSorted.length > 0 && plusMinusSorted[0].season.pm > 0) {
        awardTrophy(plusMinusSorted[0].name, currentSeason, "Alka-Seltzer (+/-)");
        runnersUp["Alka-Seltzer (+/-)"] = plusMinusSorted.slice(1, 4).map(p => p.name).join(', ');
    }

    // 9. NORRIS
    const defense = skaters.filter(p => p.pos === 'D');
    const norrisSorted = defense.sort((a, b) => ((b.season.g * 2 + b.season.a) + ((b.season.pm || 0) * 1.5)) - ((a.season.g * 2 + a.season.a) + ((a.season.pm || 0) * 1.5)));
    if (norrisSorted.length > 0) { 
        awardTrophy(norrisSorted[0].name, currentSeason, "Norris"); 
        runnersUp["Norris"] = norrisSorted.slice(1, 4).map(p => p.name).join(', ');
    }
    
    // 10. VEZINA
    const vezinaSorted = goalies.sort((a, b) => { const svpA = a.season.sa > 0 ? a.season.sv / a.season.sa : 0; const svpB = b.season.sa > 0 ? b.season.sv / b.season.sa : 0; return (svpB - svpA) || (b.season.w - a.season.w); });
    if (vezinaSorted.length > 0) {
        awardTrophy(vezinaSorted[0].name, currentSeason, "Vezina");
        runnersUp["Vezina"] = vezinaSorted.slice(1, 4).map(p => p.name).join(', ');
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
    
    // Skater logic: Goals valued 2x, Assists 1x
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
            
            // Generate runners up using the same score logic
            runnersUp["Conn Smythe"] = smytheSorted.slice(1, 4)
                .map(p => `${p.name} (${getConnSmytheScore(p)} pts)`)
                .join(', ');
        }
    }
}
    
    const getWinner = (tN) => { const wAll = allPlayers.filter(p => p.trophies && p.trophies.some(t => t.year === currentSeason && t.name === tN)); return wAll.length === 0 ? "N/A" : wAll.map(w => w.name).join(', '); }; 
    const getRunners = (tN) => { return runnersUp[tN] ? `<br><span style="font-size:6px; color:#777;">Runners-up: ${runnersUp[tN]}</span>` : ''; };
    
    // ==========================================
    // UI RENDERER (Updated with Runners Up)
    // ==========================================
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">HART (MVP):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Hart")}${getRunners("Hart")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">ART ROSS (PTS):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Art Ross")}${getRunners("Art Ross")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">ROCKET RICHARD:</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Rocket Richard")}${getRunners("Rocket Richard")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">NORRIS (DEF):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Norris")}${getRunners("Norris")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">MASTERTON:</td><td style="color:var(--ea-yellow); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Bill Masterton")}${getRunners("Bill Masterton")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">SELKE (DEF FWD):</td><td style="color:var(--ea-yellow); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Selke")}${getRunners("Selke")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">TED LINDSAY:</td><td style="color:var(--ea-yellow); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Ted Lindsay")}${getRunners("Ted Lindsay")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">ALKA-SELTZER (+/-):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Alka-Seltzer (+/-)")}${getRunners("Alka-Seltzer (+/-)")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">CALDER (ROOKIE):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Calder")}${getRunners("Calder")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">LADY BYNG:</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Lady Byng")}${getRunners("Lady Byng")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">VEZINA (GOALIE):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Vezina")}${getRunners("Vezina")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0; border-bottom:1px solid #222;">JENNINGS (TEAM GA):</td><td style="color:var(--neon-cyan); padding:6px 0; border-bottom:1px solid #222;">${getWinner("Jennings")}</td></tr>`;
    res += `<tr><td style="color:#aaa; padding:6px 0;">CONN SMYTHE:</td><td style="color:var(--ea-yellow); text-shadow:1px 1px 0 #000; padding:6px 0;">${getWinner("Conn Smythe")}${getRunners("Conn Smythe")}</td></tr></table>`;
    
    if(awardConfig.retirements) { 
        let ind = []; 
        Object.values(playerStats).forEach(p => { 
            let roll = Math.random(); 
            if((p.age > 36 && roll < 0.25) || ((p.attr.off+p.attr.def)/2 >= 90 && roll < 0.05)) { 
                ind.push(p.name); 
                hallOfFame.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: p.season.gp, g: p.season.g, a: p.season.a, pts: p.season.g+p.season.a, w: p.season.w, so: p.season.so, mvp: p.asgMvp }); 
                retiredPlayers.unshift({ year: currentSeason, name: p.name, pos: p.pos, team: p.team, gp: (p.career.gp || 0) + (p.season.gp || 0), g: (p.career.g || 0) + (p.season.g || 0), a: (p.career.a || 0) + (p.season.a || 0), pts: (p.career.pts || 0) + (p.season.pts || 0), w: (p.career.w || 0) + (p.season.w || 0), pim: (p.career.pim || 0) + (p.season.pim || 0), ppg: (p.career.ppg || 0) + (p.season.ppg || 0) });
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
    
    s1.forEach(n => { const i = rosters[t1c].findIndex(p => p.name === n); if(i !== -1) { rosters[t2c].push(rosters[t1c].splice(i, 1)[0]); if(playerStats[n] && t2o) { playerStats[n].team = t2o.name; playerStats[n].teamCode = t2o.code; } } });
    s2.forEach(n => { const i = rosters[t2c].findIndex(p => p.name === n); if(i !== -1) { rosters[t1c].push(rosters[t2c].splice(i, 1)[0]); if(playerStats[n] && t1o) { playerStats[n].team = t1o.name; playerStats[n].teamCode = t1o.code; } } });
    
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
                        <div style="color:#fff; margin-top:5px;">${t.p1} (OVR: ${getPlayerWeightedStats(t.p1).baseOvr}, AGE: ${playerStats[t.p1].age})</div>
                    </div>
                    <div style="color:var(--neon-cyan); margin-top:10px;">◄ SWAP ►</div>
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
    
    if (i1 !== -1 && i2 !== -1) {
        rosters[t.t2].push(rosters[t.t1].splice(i1, 1)[0]); rosters[t.t1].push(rosters[t.t2].splice(i2, 1)[0]);
        const t2lg = league.find(l=>l.nrm===t.t2); const t1lg = league.find(l=>l.nrm===t.t1);
        if (playerStats[t.p1]) { playerStats[t.p1].team = t.t2Name; if (t2lg) playerStats[t.p1].teamCode = t2lg.code; }
        if (playerStats[t.p2]) { playerStats[t.p2].team = t.t1Name; if (t1lg) playerStats[t.p2].teamCode = t1lg.code; }
        
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

// =========================================================
// --- MISSING UI HELPER FUNCTIONS ---
// =========================================================
// Add this helper to your update logic
function trackIceTime(playersOnIce, minutes) {
    playersOnIce.forEach(p => {
        if (playerStats[p.name]) {
            playerStats[p.name].season.toi += minutes;
        }
    });
}

// 🚨 NEW HELPER: Syncs individual rounds back to the master Playoff bucket
function syncAggregatePlayoffs(pName) {
    let p = playerStats[pName];
    if (!p) return;
    
    let keys = p.pos === 'G' 
        ? ['gp','g','a','pm','so','sv','sa','w','l','t','pim','ppg','toi','svg'] 
        : ['gp','g','a','pm','pim','ppg','shg','gwg','s','toi','svg'];
        
    p.playoff = {};
    keys.forEach(key => p.playoff[key] = 0);
    
    [1,2,3,4].forEach(r => {
        let rnd = p[`playoff_${r}`];
        if (rnd) {
            keys.forEach(key => {
                p.playoff[key] += (rnd[key] || 0);
            });
        }
    });
}

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
    });
    
    // Unhide the existing static buttons instead of creating new ones
    const simRndBtn = document.getElementById('simRoundBtn');
    if (simRndBtn) simRndBtn.style.display = 'inline-block';
    
    const simPlyBtn = document.getElementById('simPlayoffsBtn');
    if (simPlyBtn) simPlyBtn.style.display = 'inline-block';

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

// ─── PRO SET CARD SYSTEM ──────────────────────────────────────────────────────

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

const PC_LOGOS = {
    ANA:'Team Logos/Ducks.png',     BOS:'Team Logos/Bruins.png',    BUF:'Team Logos/sabres.png',
    CGY:'Team Logos/Flames.png',    CHI:'Team Logos/blackhawks.png',DAL:'Team Logos/North_Stars.png',
    DET:'Team Logos/Red_Wings.png', EDM:'Team Logos/Oilers.png',    FLA:'Team Logos/Panthers.png',
    HFD:'Team Logos/whalers.png',   LAK:'Team Logos/kings.png',     MIN:'Team Logos/North_Stars.png',
    MTL:'Team Logos/Canadiens.png', NJD:'Team Logos/Devils.png',    NYI:'Team Logos/islanders.png',
    NYR:'Team Logos/Rangers.png',   OTT:'Team Logos/Senators.png',  PHI:'Team Logos/Flyers.png',
    PIT:'Team Logos/Penguins.png',  QUE:'Team Logos/Nordiques.png', SJS:'Team Logos/sharks.png',
    STL:'Team Logos/blues.png',     TBL:'Team Logos/tampa.png',     TOR:'Team Logos/maple_leafs.png',
    VAN:'Team Logos/canucks.png',   WSH:'Team Logos/capitals.png',  WIN:'Team Logos/jets.png',
};

function _pcShade(hex, amt) {
    let r=parseInt(hex.slice(1,3),16)||0, g=parseInt(hex.slice(3,5),16)||0, b=parseInt(hex.slice(5,7),16)||0;
    r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function _pcR(ctx, sc, x, y, w, h, col) { // plain fill
    ctx.fillStyle = col;
    ctx.fillRect(x*sc, y*sc, w*sc, h*sc);
}

function _pcB(ctx, sc, x, y, w, h, col) { // bordered fill (outline technique)
    ctx.fillStyle = '#000';
    ctx.fillRect(x*sc, y*sc, w*sc, h*sc);
    ctx.fillStyle = col;
    ctx.fillRect(x*sc+1, y*sc+1, w*sc-2, h*sc-2);
}

// ── Sprite pixel data (36 cols × 46 rows, scale=5 → 180×230 canvas displayed at 120×153)
// . transparent  # black
// H/h helmet dk/hi  V visor  s/S skin/shadow
// j/J/d jersey hi/base/shadow  c/C secondary hi/base
// g/G glove dk/hi  p pants  b/B boot/hi
// a/A blade silver/dk  k/K stick/hi  u puck  i ice  w crease
// m goalie mask  r blocker leather
// ── 36-wide × 46-tall sprites, scale=5 → 180×230 canvas, display 120×153 ──────
// Ref style: chunky skating-crouch, wide shin pads, prominent stick across body
// Forward v0: SKATING CROUCH — stick held low across body, puck on blade
const PC_SPR_FWD_0 = [
//  Skating crouch, stick low across body, puck on left blade (ref-card style)
//  0         1         2         3
//  012345678901234567890123456789012345
    '....................................',
    '....................................',
    '..............######................',
    '.............#HHhhhH##..............',
    '.............#HhVVVhH#..............',// visor
    '.............#Hh#ss#hH#.............',// face + cage
    '.............#Hh#SS#hH#.............',
    '..............#H#sS##...............',// chin
    '..........####JJJJJJJJ####..........',// shoulders
    '.........#jJJJJJJJJJJJJJJJ#........',
    '.......##JJjJJJJJJJJJJJJJJJJ#......',
    '......#GGjJJJccccccJJJJJJJJdJJ#....',// stripe + arm
    '.....#GGgjJJccccccccJJJJJJJJdJJJ#..',// glove
    '....#GGggkjJJJJJccJJJJJJJJJJdJJJ#.',
    '...#KkkkkkjJJJJJJJJJJJJJJJJJJdJJJ#',// stick through glove
    '..#KkkkkkjJdddddddddddddddddddJJJ##',
    '.#Kkkkkk##ddddddddddddddddddddd##..',
    '#Kkkkkk#ddddddddddddddddddddddd##..',
    '#KKkkkk#ddddddddddddddddddddddd#...',
    '.#KKkkk#pppppppppppppppppppppppp##.',// pants
    '..#KKkk#ppppppppppppppppppppppppp#.',
    '...#Kkk#pppppppppppppppppppppppp##.',
    '....#kk##HHHHHHHHHHHHHHHHHHHHHH##..',// shins
    '.....#kHHHHHHhhhhhhhhhhhHHHHHHH#..',
    '....#Kk#HHHHHHhhhhhhhhhHHHHHHHH#..',
    '...#KKk#HHHHHHhhhhhhhhhHHHHHHHHH#.',
    '..#KKKk#HHHHHHhhhhhhhhhHHHHHHHHH#.',
    '.#KKKKk#HHHHHHhhhhhhhhhHHHHHHHHH#.',// boot
    '#KKKKKk#bbbbbbbbbbbbbbbbbbbbbbbbb#.',
    '#KKKKKk##bBBBBBBBBBBBBBBBBBBBBBb##',
    '##KKKKK###aaaaaaaaaaaaaaaaaaaaaaaa#',// blade
    '.#KKKK#..#aaaaaaaaaaaaaaaaaaaaaaaaA',
    '.#uuu#...#aaaaaaaaaaaaaaaaaaaaaaaaA',// puck
    '#uuuu#...#aaaaaaaaaaaaaaaaaaaaaaaA#',
    '#uuu#....#aaaaaaaaaaaaaaaaaaaaaaaA#',
    '##u#.....#aaaaaaaaaaaaaaaaaaaaaaA##',
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',// ice
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Forward v1: WRIST SHOT — upright, releasing from the circle
const PC_SPR_FWD_1 = [
    '....................................',
    '..............######................',
    '.............#HHhhhH##..............',
    '.............#HhVVVhH#..............',
    '.............#Hh#ss#hH#.............',
    '.............#Hh#SS#hH#.............',
    '..............#H#sS##...............',
    '..........####JJJJJJJJ####..........',
    '.........#jJJJJJJJJJJJJJJJ#........',
    '.........#jJJJJJJJJJJJJJJJJ#.......',
    '.......##JJjJJJccccccJJJJJJdJJ##...',// arms forward
    '......#GGjJJJccccccccJJJJJJdJJJJ#..',
    '.....#GGgjJJJJJccccJJJJJJJJJdJJJJ#.',
    '....#GGggkjJJJJJJJJJJJJJJJJJJJJ#JJ',// right arm pulls through
    '...#KkkkkkJJJJJJJJJJJJJJJJJJJJ#...',
    '..#KkkkkkJJdddddddddddddddddddJ#...',
    '.#Kkkkkk##ppppppppppppppppppppp##..',// pants start
    '#Kkkkkk##pppppppppppppppppppppp##..',
    '#KKkkk##ppppppppppppppppppppppp#...',
    '.#KKkk##pppppppppppppppppppppppp#..',
    '..#Kkk#pppppppppppppppppppppppp#...',
    '...#kk##HHHHHHHHHHHHHHHHHHHHHHH##..',// shins
    '....#kHHHHHHhhhhhhhhhhhHHHHHHHH#..',
    '...#KkHHHHHHhhhhhhhhhhhHHHHHHHHH#.',
    '..#KKk#HHHHHhhhhhhhhhhhHHHHHHHHH#.',
    '.#KKKk#HHHHHhhhhhhhhhhhHHHHHHHHH#.',
    '#KKKKk#HHHHHhhhhhhhhhhhHHHHHHHHH#.',
    '#KKKKk#bbbbbbbbbbbbbbbbbbbbbbbbb##.',
    '##KKKK##bBBBBBBBBBBBBBBBBBBBBBb##.',
    '.#KKK###.#aaaaaaaaaaaaaaaaaaaaaaaa#',// blade
    '..#KK#...#aaaaaaaaaaaaaaaaaaaaaaA##',
    '..###....#aaaaaaaaaaaaaaaaaaaaaA#..',// puck bottom
    '..........#aaaaaaaaaaaaaaaaaaaaaA#.',
    '...........#aaaaaaaaaaaaaaaaaaaaA#.',
    '..#uuu.....#aaaaaaaaaaaaaaaaaaaaA#.',
    '.#uuuu......#aaaaaaaaaaaaaaaaaaaA##',
    '##uuu......iiiiiiiiiiiiiiiiiiiiiiii',// ice
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Forward v2: BACKHAND — reaching around stick, weight back
const PC_SPR_FWD_2 = [
    '....................................',
    '.............######.................',
    '............#HHhhhH##...............',
    '............#HhVVVhH#...............',
    '............#Hh#ss#hH#..............',
    '............#Hh#SS#hH#..............',
    '.............#H#sS##................',
    '.........####JJJJJJJJ####...........',
    '........#jJJJJJJJJJJJJJJJJ#........',
    '........#JJjJJJJJJJJJJJJJJJ#.......',
    '.......#JJJJJJcccccccJJJJJJdJJ#....',// stripe
    '......#JJJJJJccccccccJJJJJJJdJJ#...',
    '.....#JJJJJJJJccccJJJJJJJJJJdJJJ#..',
    '....#gGJJJJJJJJJJJJJJJJJJJJJdJJJJ#.',// right arm backhand
    '...#gGgJJJJJJJJJJJJJJJJJJJJddJJJJ#',
    '..#gGggkJdddddddddddddddddddJdJJJJ#',
    '.#KkkkkkdddddddddddddddddddddJJJJ##',
    '#KkkkkkJdddddddddddddddddddddJJ##..',
    '#KKkkkk#ppppppppppppppppppppppp##..',// pants
    '.#KKkkk#pppppppppppppppppppppppp#..',
    '..#KKkk#ppppppppppppppppppppppp#...',
    '...#Kkk##HHHHHHHHHHHHHHHHHHHHHH##..',// shins
    '....#kk#HHHHHHhhhhhhhhhhhHHHHHHH#.',
    '...#Kkk#HHHHHHhhhhhhhhhhhHHHHHHHH#',
    '..#KKkk#HHHHHHhhhhhhhhhhhHHHHHHHHH',
    '.#KKKkk#HHHHHHhhhhhhhhhhhHHHHHHHHH',
    '#KKKKkk#bbbbbbbbbbbbbbbbbbbbbbbbb##',// boot
    '#KKKKkk##bBBBBBBBBBBBBBBBBBBBBBb##',
    '##KKKK###aaaaaaaaaaaaaaaaaaaaaaaa##',// blade
    '.##KKK#..#aaaaaaaaaaaaaaaaaaaaaaaA#',
    '...#KK#..#aaaaaaaaaaaaaaaaaaaaaaaA#',
    '...#K#...#aaaaaaaaaaaaaaaaaaaaaaA##',// stick blade end
    '....##....#aaaaaaaaaaaaaaaaaaaaaA#.',
    '.....#uuu.#aaaaaaaaaaaaaaaaaaaaaA#.',// puck
    '.....#uuuu.#aaaaaaaaaaaaaaaaaaaaA#.',
    '......#uuu..#aaaaaaaaaaaaaaaaaaaA#.',
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Defense v0: POKE CHECK — wide lunge, stick reaching left
const PC_SPR_DEF_0 = [
    '....................................',
    '.............######.................',
    '............#HHhhhH##...............',
    '............#HhVVVhH#...............',
    '............#Hh#ss#hH#..............',
    '............#Hh#SS#hH#..............',
    '.............#H#sS##................',
    '.........####JJJJJJJJJJ####.........',// wide shoulders
    '........#jJJJJJJJJJJJJJJJJJJ#......',
    '......##JJJJJJJJJJJJJJJJJJJJJJJ#..',// arms both out
    '.....#GGjJJJcccccccJJJJJJJJJJdJJJ#.',
    '....#GGGjJJJcccccccJJJJJJJJJJdJJJJ',
    '...#GGGgjJJJJJcccJJJJJJJJJJJJdJJJJ',
    '..#GGGggkJJJJJJJJJJJJJJJJJJJJJJJ##',// stick exits left
    '.#KkkkkkJJdddddddddddddddddddddJ###',
    '#KkkkkkJJddddddddddddddddddddddd##.',
    '#Kkkkkk#ddddddddddddddddddddddd##..',
    '#KKkkkk#ppppppppppppppppppppppp##..',// pants wide
    '.#KKkkk#pppppppppppppppppppppppp#..',
    '..#KKkk#ppppppppppppppppppppppppp#.',
    '...#Kkk#ppppppppppppppppppppppppp#.',
    '....#kk##HHHHHHHHHHHHHHHHHHHHHHHH##',// shins
    '.....#kHHHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '....#KkHHHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '...#KKk#HHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '..#KKKk#HHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '.#KKKKk#HHHHHhhhhhhhhhhhHHHHHHHHH##',
    '#KKKKKk#bbbbbbbbbbbbbbbbbbbbbbbb###.',// boot
    '#KKKKKk##bBBBBBBBBBBBBBBBBBBBBBb##.',
    '##KKKKK###aaaaaaaaaaaaaaaaaaaaaaaaa#',// blade right
    '.#KKKKK#..#aaaaaaaaaaaaaaaaaaaaaaA##',
    '..#KKKK#...#aaaaaaaaaaaaaaaaaaaaaA#.',
    '...##KK#....#aaaaaaaaaaaaaaaaaaaaA#.',
    '....#K#.....#aaaaaaaaaaaaaaaaaaaaA#.',// stick tip
    '.....##......#aaaaaaaaaaaaaaaaaaaA#.',
    '..............#aaaaaaaaaaaaaaaaaaA#.',
    '...............#aaaaaaaaaaaaaaaaaA#.',
    '................#aaaaaaaaaaaaaaaaA##',
    '.................#aaaaaaaaaaaaaaA##.',
    '..................#aaaaaaaaaaaaa##..',
    '..................#uuu#aaaaaaaaa#...',// puck at blade
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Defense v1: DEFENSIVE CROUCH — backward skate, stick angled forward
const PC_SPR_DEF_1 = [
    '....................................',
    '..............######................',
    '.............#HHhhhH##..............',
    '.............#HhVVVhH#..............',
    '.............#Hh#ss#hH#.............',
    '.............#Hh#SS#hH#.............',
    '..............#H#sS##...............',
    '..........####JJJJJJJJ####..........',// wide stance (backward skate)
    '.........#jJJJJJJJJJJJJJJJJ#.......',
    '.......##JJJJJJJJJJJJJJJJJJJJJ#....',
    '......#GGjJJJccccccccJJJJJJJJdJJ#..',
    '.....#GGGjJJccccccccccJJJJJJJJdJJJ#',
    '....#GGGgjJJJJJcccccJJJJJJJJJJdJJJ#',
    '...#GGGggkjJJJJJJJJJJJJJJJJJJJJJ##.',
    '..#KkkkkkjJdddddddddddddddddddddJ##.',
    '.#Kkkkkk##ddddddddddddddddddddddd##.',
    '#Kkkkkk#pppppppppppppppppppppppppp##',// pants low/wide
    '#KKkkk##ppppppppppppppppppppppppppp#',
    '.#KKkk##pppppppppppppppppppppppppp##',
    '..#Kkk#pppppppppppppppppppppppppp##.',
    '...#kk#ppppppppppppppppppppppppp##..',
    '....#k##HHHHHHHHHHHHHHHHHHHHHHHH##..',// shins wide
    '....#kHHHHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '...#KkHHHHHHHhhhhhhhhhhhHHHHHHHHHHH',
    '..#KKk#HHHHHHhhhhhhhhhhhHHHHHHHHHHH',
    '.#KKKk#HHHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '#KKKKk#HHHHHHhhhhhhhhhhhHHHHHHHHHH#',
    '#KKKKk#bbbbbbbbbbbbbbbbbbbbbbbbbb##.',// boot wide
    '#KKKKk##bBBBBBBBBBBBBBBBBBBBBBBb##.',
    '##KKK###aaaaaaaaaaaaaaaaaaaaaaaaaaa#',// blade
    '.#KKK#..#aaaaaaaaaaaaaaaaaaaaaaaaaaA',
    '..#KK#...#aaaaaaaaaaaaaaaaaaaaaaaaA#',
    '..###....#aaaaaaaaaaaaaaaaaaaaaaaaA#',
    '..........#aaaaaaaaaaaaaaaaaaaaaaA##',
    '...........#aaaaaaaaaaaaaaaaaaaaaA#.',
    '#uuu........#aaaaaaaaaaaaaaaaaaaA##.',// puck to the side
    '##uu.........#aaaaaaaaaaaaaaaaaaA#..',
    '###...........#aaaaaaaaaaaaaaaaaA#..',
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Goalie v0: BUTTERFLY SAVE — pads fanned wide, trapper raised catching puck
const PC_SPR_GTL_0 = [
//  mask wide, pads super wide
    '....................................',
    '.............#########..............',// mask top
    '............#mmmmmmmmm#.............',
    '............#mVVmmmVVm#.............',// visor slits
    '............#m##mmm##m#.............',// cage bars horizontal
    '............#mmVmmmmVm#.............',// cage detail
    '............#mmssmmssm#.............',// eyes/skin
    '.............#mSSmmSSm#.............',
    '.............#mssmmssm#.............',// chin
    '..............#SSSSSSS#.............',// neck
    '.........####JJJJJJJJJJJJ####.......',// wide chest
    '........#JJJJJJJJJJJJJJJJJJJJd#...',
    '.......#JJJJJJJJJJJJJJJJJJJJJJJd#.',
    '......#JJJJJJJcccccccccJJJJJJJJJd#.',// chest stripe
    '.....#gGGGJJJJcccccccccJJJJJJJJJdJ#',// arms out
    '....#gGGGGJJJJJcccccJJJJJJJJJJJdJJ#',
    '...#gGGGGGJJJJJJJJJJJJJJJJJJJddJJJ#',
    '..#gGGGGGGJJJJJJJJJJJJJJJJJJddJJJJ#',// trapper + blocker sides
    '.#gGGGGGGGJJJJJJJJJJJJJJJJdddJJJJJ#',
    '#gGGGGGGGG#ppppppppppppppppp#JJJJJJ#',// into pads
    '#ppppppppp#ppppppppppppppppppJJJJJJJ',
    '#ppppppppp#pJJJJpppppppJJJJpppppppp#',// pad highlights
    '#ccccccccc#pJJJJpppppppJJJJpppppppp#',// pad stripes
    '#ppppppppp#pppppppppppppppppppppppp#',
    '#ppppppppp#pppppppppppppppppppppppp#',
    '#ppppppppp#pJJJJpppppppJJJJpppppppp#',
    '#ccccccccc#pppppppppppppppppppppppp#',// second stripe
    '#ppppppppp#pppppppppppppppppppppppp#',
    '#ppppppppp#pppppppppppppppppppppppp#',
    '#ppppppppp#pppppppppppppppppppppppp#',
    '#ppppppbbb##bbbbbbbbbbbbbbbbbbb##pp#',// boots visible
    '#ppppppbbbb#bBBBBBBBBBBBBBBBBBb#pp#',
    '#######.####aaaaaaaaaaaaaaaaaaaaaa##',// blades wide
    '.......#aaaaaaaaaaaaaaaaaaaaaaaaaaa#',
    '........#aaaaaaaaaaaaaaaaaaaaaaaaA##',
    '........wwwwwwwwwwwwwwwwwwwwwwwww..',// crease line
    '.........wwwwwwwwwwwwwwwwwwwwwwww..',
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',// ice
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];
// Goalie v1: READY STANCE — standing upright in crease, gloves up
const PC_SPR_GTL_1 = [
    '....................................',
    '.............#########..............',// mask
    '............#mmmmmmmmm#.............',
    '............#mVVmmmVVm#.............',
    '............#m##mmm##m#.............',
    '............#mmVmmmmVm#.............',
    '............#mmssmmssm#.............',
    '.............#mSSmmSSm#.............',
    '.............#mssmmssm#.............',
    '..............#SSSSSSS#.............',// neck
    '.........####JJJJJJJJJJJJ####.......',// wide chest
    '........#jJJJJJJJJJJJJJJJJJJJJd#..',
    '.......#jJJJJJJJJJJJJJJJJJJJJJJJd#.',
    '......#jJJJJJJcccccccccJJJJJJJJJJd#',// stripe
    '.....#gGJJJJJcccccccccccJJJJJJJJJdJ',// trapper high (left)
    '....#gGGJJJJJJJcccccJJJJJJJJJJJJdJJ',
    '...#gGGGJJJJJJJJJJJJJJJJJJJJJJJdJJJ',
    '..#gGGGGJJJJJJJJJJJJJJJJJJJJJddJJJJ',
    '.#gGGGGG#ppppppppppppppppppppJdJJJJ#',
    '#gGGGGGG#ppppppppppppppppppppppJJJJJ',// blocker on right
    '#pppppppp#pJJJJpppppppJJJJJppppppppp',// pad top
    '#pppppppp#pJJJJpppppppJJJJJppppppppp',
    '#cccccccc#pppppppppppppppppppppppppp',// pad stripe
    '#pppppppp#pppppppppppppppppppppppppp',
    '#pppppppp#pppppppppppppppppppppppppp',
    '#pppppppp#pJJJJpppppppJJJJJppppppppp',
    '#cccccccc#pppppppppppppppppppppppppp',
    '#pppppppp#pppppppppppppppppppppppppp',
    '#pppppppp#pppppppppppppppppppppppppp',
    '#pppppppp#pppppppppppppppppppppppppp',
    '#ppppppbb##bbbbbbbbbbbbbbbbbbbbbbb##',// boots
    '#ppppppbb#.#bBBBBBBBBBBBBBBBBBBBb#.',
    '##########..#aaaaaaaaaaaaaaaaaaaaaa#',// blades
    '...........#aaaaaaaaaaaaaaaaaaaaaaaA',
    '............#aaaaaaaaaaaaaaaaaaaaaaA',
    '............#aaaaaaaaaaaaaaaaaaaaaaA',
    '.............#aaaaaaaaaaaaaaaaaaaaaA',
    '.............wwwwwwwwwwwwwwwwwwwwww.',// crease
    'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',// ice
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
];

function pcRenderSprite(ctx, rows, cm, sc) {
    for(let y=0;y<rows.length;y++) {
        const row = rows[y];
        for(let x=0;x<row.length;x++) {
            const col = cm[row[x]];
            if(col) { ctx.fillStyle=col; ctx.fillRect(x*sc, y*sc, sc, sc); }
        }
    }
}

function pcDrawSprite(ctx, type, pri, sec, playerName) {
    const sc = 5;
    const cm = {
        '#': '#000000',
        'H': '#222233', 'h': '#556688',
        'V': '#AADDFF',
        'm': '#E0E0E0',
        's': '#F4C17A', 'S': '#C8905A',
        'j': _pcShade(pri,55), 'J': pri, 'd': _pcShade(pri,-50),
        'c': _pcShade(sec,30), 'C': sec,
        'g': '#111122', 'G': '#2a3a4a',
        'p': _pcShade(pri,-30),
        'b': '#111111', 'B': '#446677',
        'a': '#CCCCCC', 'A': '#888888',
        'k': '#7B5000', 'K': '#AA7830',
        'u': '#111111',
        'w': 'rgba(100,180,255,0.35)',
        'i': 'rgba(180,225,255,0.20)',
        '.': null,
    };
    // seed variant from player name hash
    let hash = 0;
    if (playerName) { for (let i = 0; i < playerName.length; i++) hash = (hash*31 + playerName.charCodeAt(i)) >>> 0; }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    let rows;
    if (type === 'forward') {
        rows = [PC_SPR_FWD_0, PC_SPR_FWD_1, PC_SPR_FWD_2][hash % 3];
    } else if (type === 'defense') {
        rows = [PC_SPR_DEF_0, PC_SPR_DEF_1][hash % 2];
    } else {
        rows = [PC_SPR_GTL_0, PC_SPR_GTL_1][hash % 2];
    }
    pcRenderSprite(ctx, rows, cm, sc);
}

function pcDrawLogo(ctx, size, code) {
    const colors = PC_COLORS[code] || ['#003366','#CCAA00'];
    ctx.fillStyle = colors[0];
    ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.fill();
    const logoPath = PC_LOGOS[code];
    if (logoPath) {
        const img = new Image();
        img.onload = () => {
            ctx.save();
            ctx.beginPath(); ctx.arc(size/2,size/2,size/2-1,0,Math.PI*2); ctx.clip();
            const pad = size * 0.12;
            ctx.drawImage(img, pad, pad, size-pad*2, size-pad*2);
            ctx.restore();
        };
        img.onerror = () => {
            ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(size*.3)}px monospace`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(code.slice(0,3), size/2, size/2);
        };
        img.src = logoPath;
    } else {
        ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(size*.3)}px monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(code.slice(0,3), size/2, size/2);
    }
}

function pcBuildStats(pName, tab) {
    const p = playerStats[pName];
    if (!p) return '';
    const isG = p.pos === 'G';
    const f = (v,d) => v==null ? (d?'0.'+('0'.repeat(d)):'0') : (d?Number(v).toFixed(d):v);
    const pm = v => (v>0?'+':'')+v;
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
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00'],['SVG',f(s.svg||sv)],['TOI',f(s.toi)]],[4,5]);
        }
        const g=s.g||0,a=s.a||0;
        return tbl([['GP',f(s.gp)],['G',f(g)],['A',f(a)],['PTS',g+a],
            ['+/-',pm(s.pm||0)],['PIM',f(s.pim)],['SOG',f(s.s)],['GWG',f(s.gwg)]],[2,3]);
    }
    if (tab==='career') {
        const c=p.career||{};
        if (isG) {
            const sa=c.sa||0,sv=c.sv||0,ga=Math.max(0,sa-sv),gp=c.gp||0;
            return tbl([['GP',f(gp)],['W',f(c.w)],['L',f(c.l)],['SO',f(c.so)],
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00']],[4,5]);
        }
        return tbl([['GP',f(c.gp)],['G',f(c.g)],['A',f(c.a)],['PTS',c.pts||((c.g||0)+(c.a||0))],
            ['+/-',pm(c.pm||c.plusMinus||0)],['PIM',f(c.pim)],['SOG',f(c.s)],['GWG',f(c.gwg)]],[2,3]);
    }
    if (tab==='playoff' || tab==='c-po') {
        const src = tab==='playoff' ? (p.playoff||{}) : (p.careerPlayoff||{});
        if (tab==='playoff' && !isPlayoffs && !(src.gp>0)) {
            return `<div style="text-align:center;color:#555;padding:18px 0;font-size:7px;letter-spacing:2px">DID NOT<br><br>QUALIFY</div>`;
        }
        if (isG) {
            const sa=src.sa||0,sv=src.sv||0,ga=Math.max(0,sa-sv),gp=src.gp||0;
            return tbl([['GP',f(gp)],['W',f(src.w)],['L',f(src.l)],['SO',f(src.so)],
                ['SV%',sa>0?(sv/sa).toFixed(3):'.000'],['GAA',gp>0?(ga/gp).toFixed(2):'0.00']],[4,5]);
        }
        return tbl([['GP',f(src.gp)],['G',f(src.g)],['A',f(src.a)],['PTS',src.pts||((src.g||0)+(src.a||0))],
            ['+/-',pm(src.pm||0)],['PIM',f(src.pim)],['SOG',f(src.s)],['GWG',f(src.gwg)]],[2,3]);
    }
    // ATTR tab
    if (isG) {
        return tbl([['GLV-L',p.attr.gloveL||'--'],['GLV-R',p.attr.gloveR||'--'],
            ['STK-L',p.attr.stickL||'--'],['STK-R',p.attr.stickR||'--'],
            ['AGIL',p.attr.agil||'--'],['SPD',p.attr.speed||'--'],
            ['DEF',p.attr.def||'--'],['CTRL',p.attr.stkHnd||'--']],[]);
    }
    return tbl([['OFF',p.attr.off||'--'],['DEF',p.attr.def||'--'],
        ['SPD',p.attr.speed||'--'],['AGIL',p.attr.agil||'--'],
        ['SHT PWR',p.attr.shotPwr||'--'],['SHT ACC',p.attr.shotAcc||'--'],
        ['PASS',p.attr.pass||'--'],['STK',p.attr.stkHnd||'--'],
        ['CHECK',p.attr.check||'--'],['ROUGH',p.attr.rough||'--']],[]);
}

function pcBuildHonors(pName) {
    const p = playerStats[pName]; if (!p) return '';
    const miles = p.milestones && p.milestones.length > 0;
    const trophies = p.trophies && p.trophies.length > 0;
    const asg = p.asgAppearances > 0;
    if (!miles && !trophies && !asg) return '';
    let h = `<div style="padding:6px 10px 8px;background:#080808;border-top:1px solid #1a1a1a;">`;
    if (asg) h += `<div style="font-size:7px;color:#FFD060;margin-bottom:5px">⭐ ${p.asgAppearances}× ALL-STAR</div>`;
    if (trophies) {
        h += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">`;
        p.trophies.forEach(t => { h += `<div style="font-size:6px;background:#1a1000;border:1px solid #664400;color:#FFD060;padding:2px 4px">🏆 ${t.year} ${t.name}</div>`; });
        h += `</div>`;
    }
    if (miles) {
        h += `<div style="display:flex;flex-wrap:wrap;gap:4px">`;
        p.milestones.forEach(m => { h += `<div style="font-size:6px;background:#001a1a;border:1px solid #004444;color:#00CCFF;padding:2px 4px">🏅 ${m}</div>`; });
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
    const sprType = p.pos==='G' ? 'goalie' : (p.pos==='D'||p.pos==='LD'||p.pos==='RD') ? 'defense' : 'forward';
    const cardNum = String(((p.season.gp||0)*7 + (p.age||25)*3 + (ovr||70)) % 900 + 100);
    const ovrCol = ovr>=86?'#FFD060':ovr>=78?'#00CCFF':'#88FF88';
    const st = p.macro_streak || p.micro_streak || '';
    const stBadge = st==='HOT' ? `<span style="color:#FF4400;font-size:7px"> ▲HOT</span>` :
                    st==='COLD'? `<span style="color:#4488FF;font-size:7px"> ▼COLD</span>` : '';
    const fatBadge = fatigue>0 ? `<span style="color:${fatigue>=8?'#FF5555':'#FFAA00'};font-size:7px"> ⚡-${fatigue}</span>` : '';

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
  <div style="background:#06060e;position:relative;display:flex;align-items:center;justify-content:center;height:160px;overflow:hidden;">
    <canvas id="pc-sprite" width="180" height="230" style="image-rendering:pixelated;image-rendering:crisp-edges;display:block;width:120px;height:153px;"></canvas>
    <canvas id="pc-logo" width="34" height="34" style="position:absolute;top:7px;right:7px;border-radius:50%;border:1px solid rgba(255,255,255,.15);image-rendering:pixelated;"></canvas>
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
    const spCanvas = document.getElementById('pc-sprite');
    if (spCanvas) pcDrawSprite(spCanvas.getContext('2d'), sprType, pri, sec, pName);
    const lgCanvas = document.getElementById('pc-logo');
    if (lgCanvas) pcDrawLogo(lgCanvas.getContext('2d'), 34, p.teamCode);
    document.getElementById('playerCardOverlay').style.display = 'flex';
}

// ─── dead old body below — replaced by Pro Set card above ─────────────────────
function _pcOldBodyPlaceholder() { // never called — keeps linter happy if needed
    let h=''; const p={},c={},ovr=0,tag='',badge='',fatigue=0;
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

    // STATUS BADGES
    h += buildStatusBadges(pName);
    
    h += `<div style="color:#aaa; font-size:10px;">${p.pos} | AGE: ${p.age}</div>`;
    h += `<div style="color:var(--neon-cyan); font-size:14px; margin-top:5px;">LIVE OVR: ${ovr}</div>`;
    h += `</div></div>`;

    // --- REMAINDER OF THE CARD TABLES (ATTRIBUTES, SEASON, CAREER, PLAYOFF) ---
    h += `<div><div class="unit-header">ATTRIBUTES</div><table style="width:100%; font-size:8px; text-align:left;">`;
    if(p.pos === 'G') {
        h += `<tr><td style="color:#aaa;">DEF AWARE:</td><td>${p.attr.def || '--'}</td><td style="color:#aaa;">PUCK CTRL:</td><td>${p.attr.stkHnd || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">AGILITY:</td><td>${p.attr.agil || '--'}</td><td style="color:#aaa;">SPEED:</td><td>${p.attr.speed || '--'}</td></tr>`;
        h += `<tr><td colspan="4" style="color:var(--neon-cyan); padding-top:4px; border-bottom:1px solid #333;">CUSTOM PAD MATRIX</td></tr>`;
        h += `<tr><td style="color:#aaa;">GLOVE (L):</td><td>${p.attr.gloveL || '--'}</td><td style="color:#aaa;">GLOVE (R):</td><td>${p.attr.gloveR || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">STICK (L):</td><td>${p.attr.stickL || '--'}</td><td style="color:#aaa;">STICK (R):</td><td>${p.attr.stickR || '--'}</td></tr>`;
    } else {
        h += `<tr><td style="color:#aaa;">OFFENSE:</td><td>${p.attr.off || '--'}</td><td style="color:#aaa;">DEFENSE:</td><td>${p.attr.def || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">SHOT PWR:</td><td>${p.attr.shotPwr || '--'}</td><td style="color:#aaa;">SHOT ACC:</td><td>${p.attr.shotAcc || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">PASSING:</td><td>${p.attr.pass || '--'}</td><td style="color:#aaa;">STICK:</td><td>${p.attr.stkHnd || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">SPEED:</td><td>${p.attr.speed || '--'}</td><td style="color:#aaa;">AGILITY:</td><td>${p.attr.agil || '--'}</td></tr>`;
        h += `<tr><td style="color:#aaa;">CHECKING:</td><td>${p.attr.check || '--'}</td><td style="color:#aaa;">ROUGH:</td><td>${p.attr.rough || '--'}</td></tr>`;
    }
    h += `</table></div>`;

    // --- SEASON STATS TABLE ---
    h += `<div class="unit-header" style="margin-top:10px;">SEASON STATS</div><table style="width:100%; font-size:8px; text-align:center;">`;
    if(p.pos === 'G') {
        h += `<tr><th>GP</th><th>W</th><th>L</th><th>SO</th><th>SV%</th><th>GAA</th><th>SVG</th><th>TOI</th></tr>`;
        let sGP = p.season.gp || 0;
        let sW = p.season.w || 0;
        let sL = p.season.l || 0;
        let sSO = p.season.so || 0;
        let sSA = p.season.sa || 0;
        let sSV = p.season.sv || 0;
        let sGA = Math.max(0, sSA - sSV);
        let sTOI = p.season.toi || 0;
        let sSVG = p.season.svg || 0;
        h += `<tr><td>${sGP}</td><td>${sW}</td><td>${sL}</td><td>${sSO}</td><td>${sSA>0?(sSV/sSA).toFixed(3):'.000'}</td><td>${sGP>0?(sGA/sGP).toFixed(2):'0.00'}</td><td>${sSVG}</td><td>${sTOI}</td></tr>`;
    } else {
        h += `<tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th><th>SOG</th><th>GWG</th><th>SVG</th><th>TOI</th></tr>`;
        let sGP = p.season.gp || 0;
        let sG = p.season.g || 0;
        let sA = p.season.a || 0;
        let sPts = sG + sA;
        let sPM = p.season.pm || 0;
        let sPIM = p.season.pim || 0;
        let sSOG = p.season.s || 0;
        let sGWG = p.season.gwg || 0;
        let sTOI = p.season.toi || 0;
        let sSVG = p.season.svg || 0;
        h += `<tr><td>${sGP}</td><td>${sG}</td><td>${sA}</td><td class="pts-hl">${sPts}</td><td>${sPM>0?'+'+sPM:sPM}</td><td>${sPIM}</td><td>${sSOG}</td><td>${sGWG}</td><td>${sSVG}</td><td>${sTOI}</td></tr>`;
    }
    h += `</table>`;

    // --- CAREER STATS TABLE (Historical Career, excluding current season) ---
    h += `<div class="unit-header" style="margin-top:10px;">CAREER STATS (PRE-SEASON)</div><table style="width:100%; font-size:8px; text-align:center;">`;
    if(p.pos === 'G') {
        h += `<tr><th>GP</th><th>W</th><th>L</th><th>SO</th><th>SV%</th><th>GAA</th></tr>`;
        let crGP = c.gp || 0;
        let crW = c.w || 0;
        let crL = c.l || 0;
        let crSO = c.so || 0;
        let crSA = c.sa || 0;
        let crSV = c.sv || 0;
        let crGA = Math.max(0, crSA - crSV);
        h += `<tr><td>${crGP}</td><td>${crW}</td><td>${crL}</td><td>${crSO}</td><td>${crSA>0?(crSV/crSA).toFixed(3):'.000'}</td><td>${crGP>0?(crGA/crGP).toFixed(2):'0.00'}</td></tr>`;
    } else {
        h += `<tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th><th>SOG</th><th>GWG</th></tr>`;
        let crGP = c.gp || 0;
        let crG = c.g || 0;
        let crA = c.a || 0;
        let crPts = c.pts || 0;
        let crPM = (c.pm !== undefined ? c.pm : (c.plusMinus || 0)) || 0;
        let crPIM = c.pim || 0;
        let crSOG = c.s || 0;
        let crGWG = c.gwg || 0;
        h += `<tr><td>${crGP}</td><td>${crG}</td><td>${crA}</td><td class="pts-hl">${crPts}</td><td>${crPM>0?'+'+crPM:crPM}</td><td>${crPIM}</td><td>${crSOG}</td><td>${crGWG}</td></tr>`;
    }
    h += `</table>`;

    // --- PLAYOFF STATS TABLE (Only shown if playoffs active) ---
    if(isPlayoffs || isASG) {
        h += `<div class="unit-header" style="margin-top:10px; color:var(--neon-cyan);">PLAYOFF STATS</div><table style="width:100%; font-size:8px; text-align:center;">`;
        let plStats = p.careerPlayoff || { gp:0, g:0, a:0, pts:0, pm:0, pim:0, s:0, gwg:0, w:0, l:0, so:0, sv:0, sa:0, toi:0, svg:0 };
        if(p.pos === 'G') {
            h += `<tr><th>GP</th><th>W</th><th>L</th><th>SO</th><th>SV%</th><th>GAA</th><th>SVG</th><th>TOI</th></tr>`;
            let plGP = plStats.gp || 0;
            let plW = plStats.w || 0;
            let plL = plStats.l || 0;
            let plSO = plStats.so || 0;
            let plSA = plStats.sa || 0;
            let plSV = plStats.sv || 0;
            let plGA = Math.max(0, plSA - plSV);
            let plTOI = plStats.toi || 0;
            let plSVG = plStats.svg || 0;
            h += `<tr><td>${plGP}</td><td>${plW}</td><td>${plL}</td><td>${plSO}</td><td>${plSA>0?(plSV/plSA).toFixed(3):'.000'}</td><td>${plGP>0?(plGA/plGP).toFixed(2):'0.00'}</td><td>${plSVG}</td><td>${plTOI}</td></tr>`;
        } else {
            h += `<tr><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th><th>SOG</th><th>GWG</th><th>SVG</th><th>TOI</th></tr>`;
            let plGP = plStats.gp || 0;
            let plG = plStats.g || 0;
            let plA = plStats.a || 0;
            let plPts = plStats.pts || 0;
            let plPM = plStats.pm || 0;
            let plPIM = plStats.pim || 0;
            let plSOG = plStats.s || 0;
            let plGWG = plStats.gwg || 0;
            let plTOI = plStats.toi || 0;
            let plSVG = plStats.svg || 0;
            h += `<tr><td>${plGP}</td><td>${plG}</td><td>${plA}</td><td class="pts-hl">${plPts}</td><td>${plPM>0?'+'+plPM:plPM}</td><td>${plPIM}</td><td>${plSOG}</td><td>${plGWG}</td><td>${plSVG}</td><td>${plTOI}</td></tr>`;
        }
        h += `</table>`;
    }
    h += `</div>`;
    
    // --- NEW: DISPLAY MILESTONES ---
    if(p.milestones && p.milestones.length > 0) {
        h += `<div class="unit-header" style="margin-top:15px; color:var(--neon-cyan);">CAREER MILESTONES</div><div style="font-size:8px; color:#fff; display:flex; flex-wrap:wrap; gap:10px;">`;
        p.milestones.forEach(m => { h += `<div style="background:#000; padding:5px; border:1px solid var(--neon-cyan);">🏅 ${m}</div>`; });
        h += `</div>`;
    }

    if(p.trophies && p.trophies.length > 0) {
        h += `<div class="unit-header" style="margin-top:15px; color:var(--ea-yellow);">TROPHY CABINET</div><div style="font-size:8px; color:#fff; display:flex; flex-wrap:wrap; gap:10px;">`;
        p.trophies.forEach(t => { h += `<div style="background:#000; padding:5px; border:1px solid var(--ea-yellow);">🏆 ${t.year} ${t.name}</div>`; });
        h += `</div>`;
    }
    if(p.asgAppearances > 0) h += `<div style="margin-top:10px; font-size:8px; color:var(--neon-cyan);">⭐ ${p.asgAppearances}x All-Star</div>`;
    h += `</div>`;
} // end _pcOldBodyPlaceholder

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

// 2. The brain that decides which goalie is starting tonight
function getStartingGoalie(teamCode) {
    let goalies = rosters[teamCode].filter(p => p.pos === 'G');
    goalies.sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr);

    let starter = goalies[0];
    let backup = goalies.length > 1 ? goalies[1] : goalies[0];

    if (!starter.status) starter.status = { consecutiveStarts: 0, fatigue: 0, injuryDays: 0 };
    if (!backup.status) backup.status = { consecutiveStarts: 0, fatigue: 0, injuryDays: 0 };

    let selectedGoalie = starter;

    // Start the backup if the starter is injured, exhausted, or has played 4+ games in a row
    if (starter.status.injuryDays > 0 || starter.status.fatigue > 75 || starter.status.consecutiveStarts >= 4) {
        selectedGoalie = backup;
    }

    if (selectedGoalie.name === starter.name) {
        starter.status.consecutiveStarts++; backup.status.consecutiveStarts = 0;
    } else {
        backup.status.consecutiveStarts++; starter.status.consecutiveStarts = 0;
    }

    return selectedGoalie;
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

            // Skaters gain 15 fatigue per game
            if (p.pos !== 'G' && p.status.injuryDays === 0) {
                p.status.fatigue = Math.min(100, p.status.fatigue + 15);
            } 
            // Goalies 
            else if (p.pos === 'G') {
                if (p.name === startingGoalies[index]) {
                    p.status.fatigue = Math.min(100, p.status.fatigue + 25); // Starter gets exhausted
                } else {
                    p.status.fatigue = Math.max(0, p.status.fatigue - 10); // Backup rests on the bench
                }
            }
        });
    });
}

// 2. THE MIDNIGHT LOOP (Runs at the end of the day)
function processDailyUpdates() {
    // A. Find out which teams played today
    let teamsPlayedToday = new Set();
    let todaysGames = calendar[currentDay] || [];
    
    todaysGames.forEach(g => {
        teamsPlayedToday.add(g.a.nrm);
        teamsPlayedToday.add(g.h.nrm);
    });

    // B. Loop through every team in the league
    for (let tk in rosters) {
        let playedToday = teamsPlayedToday.has(tk);

        rosters[tk].forEach(p => {
            if (!p.status) return;

            // 1. INJURY RECOVERY: Heal 1 day
            if (p.status.injuryDays > 0) p.status.injuryDays--;

            // 2. SUSPENSION: Drops by 1 *only* if the team played a game today
            if (playedToday && p.status.suspension > 0) p.status.suspension--;

            // 3. FATIGUE RECOVERY: If the team had an off-day, sleep it off!
            if (!playedToday) {
                p.status.fatigue = Math.max(0, p.status.fatigue - 25); // Recovers 25 fatigue
            // Check if the league needs to announce the Trade Deadline
            checkTradeDeadlineAnnouncements();
            // =========================================================
    // 🤝 AI TRADE GENERATOR
    // =========================================================
    // Grab the current multiplier (0 if deadline passed, 5 if deadline day, 1 if normal)
    let tradeMult = getTradeProbabilityMultiplier();
    
    // Multiply the base trade chance by the multiplier!
    if (awardConfig.trades && Math.random() < (0.05 * tradeMult)) {
        
        // 1. Pick two random teams
        let activeTeams = Object.keys(rosters);
        let teamA = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        let teamB = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        
        // 2. Make sure they aren't the same team, and both have enough players
        if (teamA !== teamB && rosters[teamA] && rosters[teamB] && rosters[teamA].length > 15 && rosters[teamB].length > 15) {

            // 3. Grab a random player from each team to swap
            let playerA = rosters[teamA][Math.floor(Math.random() * rosters[teamA].length)];
            let playerB = rosters[teamB][Math.floor(Math.random() * rosters[teamB].length)];
            if (!playerA || !playerB) return;
            
            // 4. Execute the Trade! (Swap their team tags)
            playerA.team = teamB;
            playerB.team = teamA;
            
            // 5. Swap them in the actual roster arrays
            rosters[teamA] = rosters[teamA].filter(p => p.name !== playerA.name);
            rosters[teamA].push(playerB);
            
            rosters[teamB] = rosters[teamB].filter(p => p.name !== playerB.name);
            rosters[teamB].push(playerA);
            
            // 6. Broadcast the blockbuster to the news feed!
            tradeLog.unshift({ 
                day: currentDay, 
                details: `🔁 BLOCKBUSTER: ${teamA.toUpperCase()} trades ${playerA.name} to ${teamB.toUpperCase()} in exchange for ${playerB.name}.` 
            });
        }
    }
        }
        });
    }
}

function processDailyUpdates() {
    let teamsPlayedToday = new Set();
    let todaysGames = calendar[currentDay] || [];
    todaysGames.forEach(g => { teamsPlayedToday.add(g.a.nrm); teamsPlayedToday.add(g.h.nrm); });

    for (let tk in rosters) {
        let playedToday = teamsPlayedToday.has(tk);
        rosters[tk].forEach(p => {
            if (!p.status) return;
            if (p.status.injuryDays > 0) p.status.injuryDays--;
            if (playedToday && p.status.suspension > 0) p.status.suspension--;
            if (!playedToday) p.status.fatigue = Math.max(0, p.status.fatigue - 25); 
        });
    }

    // 🛡️ MOVE THESE OUTSIDE THE LOOPS!
    checkTradeDeadlineAnnouncements();

    let tradeMult = getTradeProbabilityMultiplier();
    if (awardConfig.trades && Math.random() < (0.05 * tradeMult)) {
        let activeTeams = Object.keys(rosters);
        let teamA = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        let teamB = activeTeams[Math.floor(Math.random() * activeTeams.length)];
        
        if (teamA !== teamB && rosters[teamA].length > 15 && rosters[teamB].length > 15) {
            let playerA = rosters[teamA][Math.floor(Math.random() * rosters[teamA].length)];
            let playerB = rosters[teamB][Math.floor(Math.random() * rosters[teamB].length)];
            
            playerA.team = teamB; playerB.team = teamA;
            
            rosters[teamA] = rosters[teamA].filter(p => p.name !== playerA.name);
            rosters[teamA].push(playerB);
            
            rosters[teamB] = rosters[teamB].filter(p => p.name !== playerB.name);
            rosters[teamB].push(playerA);
            
            tradeLog.unshift({ day: currentDay, details: `🔁 BLOCKBUSTER: ${teamA.toUpperCase()} trades ${playerA.name} to ${teamB.toUpperCase()} in exchange for ${playerB.name}.` });
        }
    }
}

// =========================================================
// ⚖️ DEPARTMENT OF PLAYER SAFETY (DOPS) - SUSPENSION ENGINE
// =========================================================
function reviewGameForSuspensions(matchStats, homeCode, awayCode) {
    for (let pName in matchStats) {
        let stats = matchStats[pName];
        
        // Only review players who racked up heavy PIMs in a single game (5+ implies a major or multiple minors)
        if (stats.pim >= 5) {
            let player = playerStats[pName];
            
            // Failsafe to ensure they have the status backpack
            if (!player || !player.status) continue;
            
            // The more PIMs they got, the higher the base chance of a suspension hearing
            let baseChance = (stats.pim - 4) * 0.05; // 5 PIMs = 5% chance, 10 PIMs = 30% chance
            
            // "Repeat Offender" Tax: Enforcers get scrutinized more harshly by the league
            let isEnforcer = getPlayerWeightedStats(pName).tag.includes('ENFORCER');
            if (isEnforcer) baseChance += 0.10;
            
            // Roll the dice! Does the league suspend them?
            if (Math.random() < baseChance) {
                // Roll for the severity of the suspension
                let lengthRoll = Math.random();
                let gamesOut = 1;
                
                if (lengthRoll < 0.05) gamesOut = 5;      // 5% chance: 5 Games (Massive brawl/injury)
                else if (lengthRoll < 0.25) gamesOut = 3; // 20% chance: 3 Games
                else if (lengthRoll < 0.60) gamesOut = 2; // 35% chance: 2 Games
                
                // Apply the suspension to their status backpack
                player.status.suspension += gamesOut;
                
                // Figure out which team they play for so we can write the headline
                let teamCode = rosters[homeCode].find(p => p.name === pName) ? homeCode : awayCode;
                
                // Broadcast it to the global news feed!
                tradeLog.unshift({ 
                    day: currentDay, 
                    details: `🚨 DOPS SUSPENSION: ${pName} (${teamCode.toUpperCase()}) has been suspended for ${gamesOut} games following a dangerous play.` 
                });
            }
        }
    }
}

// =========================================================
// 🩹 INJURY ENGINE
// =========================================================
function triggerGameInjuries(matchStats, homeCode, awayCode) {
    if (!awardConfig.injuries) return;
    const BASE_CHANCE = 0.022; // ~2.2% per skater per game ≈ realistic NHL rate
    for (let pName in matchStats) {
        const ps = playerStats[pName];
        if (!ps || !ps.injury) continue;
        if (ps.injury.daysRemaining > 0) continue; // already hurt
        const stats = matchStats[pName];
        if (!stats.toi || stats.toi <= 0) continue; // didn't play

        // fatigue and high PIMs raise risk slightly
        const fatigueBonus = (ps.fatigue || 0) > 70 ? 0.008 : 0;
        const physicalBonus = stats.pim >= 2 ? 0.005 : 0;
        const chance = BASE_CHANCE + fatigueBonus + physicalBonus;

        if (Math.random() < chance) {
            const roll = Math.random();
            let days, label;
            if (roll < 0.55)      { days = 1;  label = 'day-to-day'; }
            else if (roll < 0.78) { days = 3;  label = '3-5 days'; }
            else if (roll < 0.92) { days = 7;  label = '1-2 weeks'; }
            else if (roll < 0.98) { days = 14; label = '2-4 weeks'; }
            else                  { days = 28; label = '4-6 weeks'; }

            ps.injury = { severity: days, daysRemaining: days };
            const teamCode = (rosters[homeCode] || []).find(p => p.name === pName) ? homeCode : awayCode;
            tradeLog.unshift({
                day: currentDay,
                details: `🩹 INJURY: ${pName} (${teamCode.toUpperCase()}) is ${label} — out ${days} day${days>1?'s':''}.`
            });
        }
    }
}

// =========================================================
// 🤝 TRADE DEADLINE SYSTEM & FRENZY MULTIPLIER
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

function checkTradeDeadlineAnnouncements() {
    let totalDays = calendar.length;
    if (!totalDays) return;
    
    let deadlineDay = Math.floor(totalDays * 0.75);
    
    // Broadcast news to the global trade log so you know it's coming!
    if (currentDay === deadlineDay - 5) {
        tradeLog.unshift({ day: currentDay, details: `🎙️ NEWS: The Trade Deadline is 5 days away. General Managers are working the phones.` });
    } else if (currentDay === deadlineDay) {
        tradeLog.unshift({ day: currentDay, details: `🚨 NEWS: IT IS TRADE DEADLINE DAY! The window closes at midnight.` });
    } else if (currentDay === deadlineDay + 1) {
        tradeLog.unshift({ day: currentDay, details: `🔒 NEWS: The Trade Deadline has officially passed. Rosters are locked for the playoffs.` });
    }
}

// --- UI RENDERERS ---
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
    if (tickerEl) tickerEl.innerText = (isAsgDayNow ? '🔥 ALL-STAR GAME DAY! 🔥 | ' : '') + m + " | LATEST SCORE: " + ss;
    refreshScheduleDashboardUI();
    
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
        const ts = league.filter(x => x.conf.toLowerCase().includes(c)).sort((a,b) => b.season.pts - a.season.pts || b.season.w - a.season.w);
        let h = `<tr><th>TEAM</th><th style="color:#aaa;">DIV</th><th>OVR</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>PTS</th></tr>`;
        h += ts.map(t => `<tr><td style="display:flex; align-items:center;">${getTeamLogoHtml(t.name)} <span style="margin-top:2px;">${t.name}</span></td><td style="color:#888; font-size:6px;">${t.div ? t.div.slice(0,3).toUpperCase() : '-'}</td><td style="color:var(--neon-cyan);">${getDynamicTeamOvr(t.nrm)}</td><td>${t.season.gp}</td><td>${t.season.w}</td><td>${t.season.l}</td><td>${t.season.t}</td><td class="pts-hl">${t.season.pts}</td></tr>`).join('');
        document.getElementById(id).innerHTML = h;
    };   
    renderStandings('eastStand', 'east'); renderStandings('westStand', 'west');

    const k = statMode; 
    let maxGP = k === 'season' ? Math.max(1, ...league.map(t => t.season.gp)) : Math.max(1, ...Object.values(playerStats).map(p => (p[k] && p[k].gp) ? p[k].gp : 0));
    let mskp = Math.max(1, Math.floor(maxGP * 0.25)); let mglp = Math.max((maxGP >= 4 ? 2 : 1), Math.floor(maxGP * 0.45));
    
    // 🛡️ Added safety checks to ensure p[k] exists before filtering
    const sks = Object.values(playerStats).filter(p => p.pos !== 'G' && p[k] && p[k].gp >= mskp); 
    const gls = Object.values(playerStats).filter(p => p.pos === 'G' && p[k] && p[k].gp >= mglp);

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
    if (typeof updateScheduleView === 'function') updateScheduleView();
}

function handlePlayerClick(playerName) {
    // Your logic for selecting/swapping players in the line editor
    console.log(`Player clicked: ${playerName}`);
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
    // NOTE: Replace 'leagueState' with the actual global object or localStorage key 
    // holding your simulator's current state.
    const saveData = {
        timestamp: new Date().toISOString(),
        // state: leagueState 
    };

    // Convert the data to a JSON string
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData));
    
    // Create a temporary anchor link to trigger the download
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "nhl94_dynasty_backup.json");
    
    // Append, click, and remove the anchor
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    console.log("Save data exported successfully.");
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
    // Prevent default form submission behavior if an event is passed
    if (event) event.preventDefault();
    
    // Array of the URL input IDs from your HTML
    const sheetInputs = [
        'teamSheetUrl', 
        'playerSheetUrl', 
        'scheduleSheetUrl', 
        'eventLogSheetUrl'
    ];
    
    // Clear out each input field
    sheetInputs.forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.value = '';
        }
    });
    
    console.log("Sheet URLs reset. Engine will default to sample data.");
    
    // If you have a status update function, call it here
    if (typeof resetSheetUrlsToDefault === 'function') {
        resetSheetUrlsToDefault();
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
    }}}