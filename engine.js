// engine.js - Simulation logic and game engine functions

// --- 1. PLAYER RATING & ARCHETYPE ENGINE ---
function getPlayerWeightedStats(pName) {
    const p = playerStats[pName];
    if (!p) return { ovr: 50, tag: 'NONE' };
    if (p.pos === 'G') return { ovr: p.attr.gDef, tag: 'GOALTENDER' };

    let off = p.attr.off;
    let def = p.attr.def;
    let finalOvr = 0;
    let tag = "";

    if (p.pos === 'D') {
        if (off > def) {
            finalOvr = Math.round((off * 0.7) + (def * 0.3));
            tag = "QUARTERBACK";
        } else {
            finalOvr = Math.round((off * 0.3) + (def * 0.7));
            tag = "SHUTDOWN";
        }
    } else { // Forwards
        if (off >= def) {
            finalOvr = Math.round((off * 0.7) + (def * 0.3));
            tag = "PLAYMAKER";
        } else {
            finalOvr = Math.round((off * 0.3) + (def * 0.7));
            tag = "GRINDER";
        }
    }
    return { ovr: finalOvr, tag: tag };
}

function getLiveIceOvr(pName) {
    const p = playerStats[pName];
    if (!p) return 0;
    const stats = getPlayerWeightedStats(pName);
    let live = stats.ovr;

    // Physicality Bonus (Speed/Agility)
    live += (getGradeMod(p.attr.speed || 'C') + getGradeMod(p.attr.agil || 'C') - 1.8) * 5;

    // Streaks
    if (p.streakType === 'hot') live += 10;
    if (p.streakType === 'cold') live -= 10;

    // Fatigue Check
    live -= getPlayerFatigueAmount(pName);

    // Chemistry Synergy Tiers
    const tObj = league.find(t => t.code === p.teamCode);
    if (tObj && tObj.chem && tObj.chem.lastUnit) {
        let chemVal = 0;
        let isTelepathic = false;

        const lineIdx = tObj.chem.lastUnit.f.findIndex(l => l.some(x => x.name === pName));
        if (lineIdx !== -1) {
            chemVal = tObj.chem.f[lineIdx] || 0;
            if (tObj.chem.fYears && tObj.chem.fYears[lineIdx] >= 2) isTelepathic = true;
        } else {
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

// --- 2. FATIGUE & TEAM RATINGS ---
function playedYesterday(tk) {
    if (currentDay === 0 || !calendar[currentDay - 1]) return false;
    return calendar[currentDay - 1].some(g => (g.h && g.h.nrm === tk) || (g.a && g.a.nrm === tk));
}

function getFatigueModifier(tk, day, teamOvr) {
    if (day === 0) return 0;
    let mod = 0; let history = [false, false, false, false];
    let daysOff = 0; let foundLastGame = false;

    for (let i = 1; i <= 10; i++) {
        let d = day - i; let played = false;
        if (d >= 0 && calendar[d]) {
            for (let g of calendar[d]) { if (g.h.nrm === tk || g.a.nrm === tk) played = true; }
        }
        if (i <= 3) history[i] = played;
        if (played && !foundLastGame) { daysOff = i - 1; foundLastGame = true; }
    }

    if (foundLastGame) {
        if (daysOff === 3 || daysOff === 4) mod += 1;
        else if (daysOff >= 5) mod -= 1;
    }

    if (history[1]) {
        let todayHome = false;
        if (calendar[day]) { for (let g of calendar[day]) { if (g.h.nrm === tk) todayHome = true; } }
        if (todayHome) mod -= 1;
        else mod -= Math.min(Math.round(teamOvr * 0.10), 4);
    }

    let gamesInLast3Days = (history[1] ? 1 : 0) + (history[2] ? 1 : 0) + (history[3] ? 1 : 0);
    if (gamesInLast3Days >= 2) mod -= 6;
    return mod;
}

function getPlayerFatigueAmount(pName) {
    const p = playerStats[pName];
    if (!p || !p.teamCode) return 0;
    if (currentDay === 0) return 0;

    const endurance = getGradeMod(p.attr.endur || 'C');
    if (p.pos === 'G') {
        const recentShots = Array.isArray(p.recentShotLoads) ? p.recentShotLoads.slice(-4) : [];
        if (recentShots.length === 0) return 0;

        const avgShots = recentShots.reduce((sum, value) => sum + value, 0) / recentShots.length;
        const maxShots = Math.max(...recentShots);
        const shotOver = Math.max(0, avgShots - 42);
        const maxOver = Math.max(0, maxShots - 52);
        const goalieFatigue = Math.max(0, (shotOver * 0.22) + (maxOver * 0.08) - (endurance * 0.12));
        return Math.round(Math.min(4, goalieFatigue));
    }

    let recentLoad = 0;
    for (let i = 1; i <= 4; i++) {
        const d = currentDay - i;
        if (d < 0 || !calendar[d]) continue;
        const played = calendar[d].some(g => g.h.nrm === p.teamCode.toLowerCase() || g.a.nrm === p.teamCode.toLowerCase());
        if (!played) continue;
        recentLoad += (i === 1 ? 1.4 : i === 2 ? 1.2 : i === 3 ? 1.0 : 0.8);
    }

    if (recentLoad <= 0) return 0;
    const fatigue = Math.max(0, recentLoad - (endurance * 0.75));
    return Math.round(Math.min(6, fatigue * 1.5));
}

function applyGoalieOvertimeWear(pName, otPeriods) {
    const p = playerStats[pName];
    if (!p || !p.attr || otPeriods <= 0) return;

    p.otWear = (p.otWear || 0) + (0.125 * otPeriods);
    const wearSteps = Math.floor(p.otWear);
    if (wearSteps <= 0) return;

    p.otWear -= wearSteps;
    p.attr.gDef = Math.max(20, p.attr.gDef - wearSteps);
}

function getDynamicTeamOvr(tk) {
    if (!rosters[tk] || rosters[tk].length === 0) return 0;
    const struct = getRosterStructure(tk);
    
    const topSkaters = [...struct.f[0], ...struct.f[1], ...struct.d[0], ...struct.d[1]];
    const bottomSkaters = [...struct.f[2], ...struct.f[3], ...struct.d[2]];
    const calcAvg = (list) => list.length ? list.reduce((sum, p) => sum + getLiveIceOvr(p.name), 0) / list.length : 0;
    
    let finalOvr = Math.round((calcAvg(topSkaters) * 0.45) + (calcAvg(bottomSkaters) * 0.20) + ((struct.g.length ? getLiveIceOvr(struct.g[0].name) : 60) * 0.35));
    
    const allSkaters = [...topSkaters, ...bottomSkaters];
    if (allSkaters.length > 0) {
        const bestSkater = allSkaters.reduce((best, current) => getLiveIceOvr(current.name) > getLiveIceOvr(best.name) ? current : best);
        const bestOvr = getLiveIceOvr(bestSkater.name);
        if (bestOvr >= 94) finalOvr += 1; 
        else if (bestOvr >= 90) finalOvr += 0.5; 
    }    
    finalOvr += getFatigueModifier(tk, currentDay, finalOvr);
    return Math.max(0, finalOvr);
}

function getRosterStructure(tk) {
    if (!rosters[tk]) return { f:[[],[],[],[]], d:[[],[],[]], g:[] };
    
    // Grab healthy players in the exact order they currently sit on the roster
    const healthy = rosters[tk].filter(p => playerStats[p.name] && playerStats[p.name].injury === 0);
    let poolF = healthy.filter(p => p.pos !== 'D' && p.pos !== 'G');
    let poolD = healthy.filter(p => p.pos === 'D');
    const allG = healthy.filter(p => p.pos === 'G');

    // Build Forward Lines top-to-bottom (3 players per line)
    const fLines = [[],[],[],[]];
    for (let i = 0; i < 3; i++) {
        fLines[i] = poolF.splice(0, 3);
    }
    fLines[3] = poolF; // L4 gets whatever forwards are left over

    // Build Defensive Pairs top-to-bottom (2 players per pair)
    const dPairs = [[],[],[]];
    for (let i = 0; i < 3; i++) {
        dPairs[i] = poolD.splice(0, 2);
    }

    return { f: fLines, d: dPairs, g: allG };
}

function getSpecialTeamsUnit(tk, mode = 'PP', unitNum = 1) {
    const tObj = league.find(t => t.nrm === tk);
    
    // 1. Check for manual lines
    if (tObj && tObj.specialTeams) {
        const manualKey = mode === 'EXA' ? 'exa' : `${mode.toLowerCase()}${unitNum}`;
        const manualLine = tObj.specialTeams[manualKey];
        const reqSize = mode === 'EXA' ? 6 : (mode === 'PP' ? 5 : 4);
        const healthyManual = (manualLine || []).map(name => rosters[tk].find(p => p.name === name && playerStats[name].injury === 0)).filter(Boolean);
        if (healthyManual.length >= reqSize) return healthyManual.slice(0, reqSize);
    }

    // 2. Auto-generate if empty
    const struct = getRosterStructure(tk);
    let unit = [];
    if (mode === 'EXA') {
        // EXA defaults to the Top 4 Forwards and Top 2 Offensive Defensemen
        let topF = [...struct.f[0], ...struct.f[1]].sort((a,b) => playerStats[b.name].attr.off - playerStats[a.name].attr.off).slice(0, 4);
        let topD = [...struct.d[0], ...struct.d[1]].sort((a,b) => playerStats[b.name].attr.off - playerStats[a.name].attr.off).slice(0, 2);
        unit = [...topF, ...topD];
    } else if (mode === 'PP') {
        if (unitNum === 1) unit = [...struct.f[0], ...struct.f[1], ...struct.d[0]];
        else if (unitNum === 2) unit = [...struct.f[1], ...struct.f[2], ...struct.d[1]];
    } else {
        if (unitNum === 1) unit = [...struct.f[0], ...struct.f[2], ...struct.d[1], ...struct.d[2]];
        else if (unitNum === 2) unit = [...struct.f[1], ...struct.f[3], ...struct.d[0], ...struct.d[2]];
    }
    
    const defaultSize = mode === 'EXA' ? 6 : (mode === 'PP' ? 5 : 4);
    return (unit.length > 0 ? unit.slice(0, defaultSize) : getActiveSkaters(tk).slice(0, defaultSize));
}

function getSpecialTeamsRating(tk, mode = 'PP', unitNum = 1) {
    const isPP = mode === 'PP';
    const players = getSpecialTeamsUnit(tk, mode, unitNum);
    let score = players.reduce((sum, p) => {
        const stats = playerStats[p.name];
        if (!stats) return sum;
        const ovr = getLiveIceOvr(p.name);
        if (isPP) {
            return sum +
                ovr +
                getGradeMod(stats.attr.pass || 'C') * 2 +
                getGradeMod(stats.attr.shotPwr || 'C') * 1.5;
        } else {
            return sum +
                ovr * 0.9 +
                getGradeMod(stats.attr.def || 'C') * 2 +
                getGradeMod(stats.attr.check || 'C') * 1.5;
        }
    }, 0);

    if (!isPP) {
        const goalieName = rosters[tk]?.find(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury === 0)?.name;
        if (goalieName) {
            const gstats = playerStats[goalieName];
            score += getGradeMod(gstats.attr.gDef || 'C') * 3;
        }
    }

    return Math.max(0, score / Math.max(players.length, 1));
}

function getSpecialTeamsChance(attackingTk, defendingTk) {
    const ppRating = getSpecialTeamsRating(attackingTk, 'PP');
    const pkRating = getSpecialTeamsRating(defendingTk, 'PK');
    const diff = ppRating - pkRating;
    const pace = Math.max(0.90, Math.min(1.12, ppRating / 85));
    const rate = 0.18 + diff * 0.0028 * pace;
    return Math.max(0.10, Math.min(0.46, rate));
}

function getPowerPlayUnit(tk, unitNum = 1) {
    return getSpecialTeamsUnit(tk, 'PP', unitNum);
}

function getGoalieSaveModifier(goalie) {
    if (!goalie || !playerStats[goalie.name]) return 1.0;
    const gStats = playerStats[goalie.name];
    const gDef = gStats.attr.gDef || 70;
    const agilMod = getGradeMod(gStats.attr.agil || 'C');
    const speedMod = getGradeMod(gStats.attr.speed || 'C');
    const streakModifier = gStats.streakType === 'hot' ? 0.92 : (gStats.streakType === 'cold' ? 1.08 : 1.0);
    const base = (gDef / 70) * ((agilMod + speedMod) / 2);
    const quality = Math.max(0.80, Math.min(1.18, base * streakModifier));
    return Math.max(0.80, Math.min(1.18, 1.98 - quality));
}

function getDefenseAndGoalieModifiers(defRating, goalie) {
    const shot = Math.max(0.75, Math.min(1.25, 1 - (defRating - 70) * 0.004));
    if (!goalie || !playerStats[goalie.name]) return { shot, goal: 1.0 };

    const gStats = playerStats[goalie.name];
    const agilMod = getGradeMod(gStats.attr.agil || 'C');
    const speedMod = getGradeMod(gStats.attr.speed || 'C');
    const streakModifier = gStats.streakType === 'hot' ? 1.10 : (gStats.streakType === 'cold' ? 0.90 : 1.0);
    const quality = Math.max(0.75, Math.min(1.25, (gStats.attr.gDef || 70) / 70 * ((agilMod + speedMod) / 2) * streakModifier));
    const goal = Math.max(0.80, Math.min(1.25, 1 - (quality - 1) * 0.30));
    return { shot, goal };
}

function getActiveSkaters(tk) {
    const s = getRosterStructure(tk);
    return [...s.f.flat(), ...s.d.flat(), ...(s.g.slice(0, 2))];
}

// --- 3. CHEMISTRY & STREAK PROCESSORS ---
function updateChemistryAfterGame(tk, isWin) {
    const tObj = league.find(t => t.nrm === tk);
    if (!tObj || !tObj.chem || !tObj.chem.lastUnit) return;
    if (!tObj.chem.fYears) tObj.chem.fYears = [0,0,0,0];
    if (!tObj.chem.dYears) tObj.chem.dYears = [0,0,0];

    tObj.chem.lastUnit.f.forEach((line, idx) => {
        let pTags = line.map(p => getPlayerWeightedStats(p.name).tag);
        let hasCold = line.some(p => playerStats[p.name] && playerStats[p.name].streakType === 'cold');
        let isClash = (pTags.filter(t => t === 'PLAYMAKER').length === 3) || (pTags.filter(t => t === 'GRINDER').length === 3);
        if (isClash || hasCold || (!isWin && Math.random() < 0.25)) tObj.chem.f[idx] = Math.max(0, (tObj.chem.f[idx] || 0) - 1); 
        else if (isWin && Math.random() < 0.60) tObj.chem.f[idx] = Math.min(10, (tObj.chem.f[idx] || 0) + 1); 
    });

    tObj.chem.lastUnit.d.forEach((pair, idx) => {
        let pTags = pair.map(p => getPlayerWeightedStats(p.name).tag);
        let hasCold = pair.some(p => playerStats[p.name] && playerStats[p.name].streakType === 'cold');
        let isClash = (pTags.filter(t => t === 'QUARTERBACK').length === 2);
        if (isClash || hasCold || (!isWin && Math.random() < 0.25)) tObj.chem.d[idx] = Math.max(0, (tObj.chem.d[idx] || 0) - 1); 
        else if (isWin && Math.random() < 0.60) tObj.chem.d[idx] = Math.min(10, (tObj.chem.d[idx] || 0) + 1); 
    });
}

function checkMilestones(pName) {
    if(!awardConfig.milestones) return; 
    const p = playerStats[pName]; if (!p) return; 
    const s = p[(isPlayoffs || isASG) ? 'playoff' : 'season'];
    
    if (p.pos === 'G') { 
        if (s.w === 30 && !p.milestones.includes("30W")) { p.milestones.push("30W"); gameMilestones.push(`${pName} REACHES 30 WINS!`); } 
        if (s.so === 5 && !p.milestones.includes("5SO")) { p.milestones.push("5SO"); gameMilestones.push(`${pName} RECORDS 5TH SHUTOUT!`); } 
    } else { 
        if (s.g === 50 && !p.milestones.includes("50G")) { p.milestones.push("50G"); gameMilestones.push(`${pName} SCORES 50TH GOAL!`); } 
        if (s.a === 50 && !p.milestones.includes("50A")) { p.milestones.push("50A"); gameMilestones.push(`${pName} REGISTERS 50TH ASSIST!`); } 
        if ((s.g + s.a) === 100 && !p.milestones.includes("100PTS")) { p.milestones.push("100PTS"); gameMilestones.push(`${pName} HITS 100 POINTS!`); } 
    }
}

function processStreaks(pName, nightPts) {
    if(!awardConfig.streaks || !isPlayoffs) return; 
    const p = playerStats[pName]; if (!p) return;
    
    if(nightPts > 0) { p.hasScored = true; p.consPointless = 0; if(p.streakType === 'cold') p.streakType = 'stable'; } 
    else if(p.hasScored) { p.consPointless++; }
    
    if(nightPts >= 3) { p.streakType = 'warming'; p.recentPts = []; }
    
    if(p.streakType === 'warming' && nightPts > 0) { 
        p.recentPts.push(nightPts); 
        if(p.recentPts.length >= 2) { 
            const avgPts = p.recentPts.reduce((a,b) => a+b, 0) / p.recentPts.length; 
            if(avgPts >= 1.5) { p.streakType = 'hot'; p.streakDur = 5; } 
            p.recentPts.shift(); 
        } 
    }
    
    if(p.consPointless >= 5) { p.streakType = 'cold'; p.streakDur = 99; }
    if(p.streakType === 'hot') { p.streakDur--; if(p.streakDur <= 0) p.streakType = 'stable'; }
}

function processGoalieStreaks(pName, ga, sa, win) {
    if(!awardConfig.streaks || !isPlayoffs) return; 
    const p = playerStats[pName]; if (!p) return;
    
    let svp = sa > 0 ? (sa - ga) / sa : 0; 
    let isGood = win || ga <= 1 || svp >= 0.920; 
    let isBad = (!win && svp < 0.880) || ga >= 5;
    
    if(isGood) { p.consBadStarts = 0; if(p.streakType === 'cold') p.streakType = 'stable'; } 
    else if(isBad) { p.consBadStarts = (p.consBadStarts || 0) + 1; }
    
    if(ga <= 1 || svp >= 0.940) { 
        p.streakType = 'warming'; p.recentGoodStarts = (p.recentGoodStarts || 0) + 1; 
        if(p.recentGoodStarts >= 2) { p.streakType = 'hot'; p.streakDur = 5; tradeLog.unshift({ day: currentDay, details: `🔥 PLAYOFF WALL: ${pName} catches fire!` }); } 
    } else { p.recentGoodStarts = 0; }
    
    if(p.consBadStarts >= 3) { p.streakType = 'cold'; p.streakDur = 99; tradeLog.unshift({ day: currentDay, details: `❄️ CRACKING: ${pName} goes cold!` }); }
    if(p.streakType === 'hot') { p.streakDur--; if(p.streakDur <= 0) p.streakType = 'stable'; }
}

// --- 4. GAME MATH & PLAY-BY-PLAY ---
const pois = l => { if(isNaN(l) || l <= 0 || l === Infinity) return 0; let L = Math.exp(-l), kv = 0, pr = 1; do { kv++; pr *= Math.random(); } while(pr > L); return kv - 1; };

function calculateStars(hSc, aSc, hGn, aGn, hW, aW, hGA, aGA) { 
    let c = []; const add = (n, pts) => { if(!n) return; let ex = c.find(x => x.n === n); if(ex) ex.s += pts; else c.push({n, s:pts}); }; 
    hSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); 
    aSc.forEach(g => { add(g.scorer, 30); add(g.a1, 15); add(g.a2, 10); }); 
    if(hGn) add(hGn, (25-hGA) + (hGA === 0 ? 50 : 0) + (hW ? 20 : 0)); 
    if(aGn) add(aGn, (25-aGA) + (aGA === 0 ? 50 : 0) + (aW ? 20 : 0)); 
    return c.sort((a,b) => b.s - a.s).slice(0,3).map(x => x.n); 
}

// Add teamEXA to the function signature
function creditStats(tk, goals, k, baseOff, hPPG, teamSHG, teamEXA, activeSkaters) {
    let ev = []; let nG = {}; let nA = {};
    const hasHeavyShot = (p) => {
        const pwr = p.attr.shotPwr; const acc = p.attr.shotAcc;
        if (pwr && acc && typeof pwr === 'string' && typeof acc === 'string') { return pwr.includes('A') || pwr.includes('B') || acc.includes('A') || acc.includes('B'); }
        return p.attr.off >= 82; 
    };

    for(let i = 0; i < goals; i++) {
        let pG = false; let sH = false; let eX = false;
        
        // 1. Roll to see what type of goal this was
        if (hPPG > 0 && Math.random() < (hPPG / goals)) { pG = true; hPPG--; }
        else if (teamSHG > 0 && Math.random() < (teamSHG / Math.max(1, goals - hPPG))) { sH = true; teamSHG--; }
        else if (teamEXA > 0 && Math.random() < (teamEXA / Math.max(1, goals - hPPG - teamSHG))) { eX = true; teamEXA--; }
        
        // 2. Put the correct unit on the ice
        let u;
        if (pG) {
            u = Math.random() < 0.65 ? getSpecialTeamsUnit(tk, 'PP', 1) : getSpecialTeamsUnit(tk, 'PP', 2);
        } else if (sH) {
            u = Math.random() < 0.60 ? getSpecialTeamsUnit(tk, 'PK', 1) : getSpecialTeamsUnit(tk, 'PK', 2);
        } else if (eX) {
            u = getSpecialTeamsUnit(tk, 'EXA', 1); // <--- Forces your 6-man unit!
        } else {
            u = activeSkaters || getActiveSkaters(tk);
        }
        
        if (!u || u.length === 0) continue;

        const goalWeights = u.map(p => {
            let r = getLiveIceOvr(p.name); let pm = 1.0; 
            const arch = getPlayerWeightedStats(p.name).tag;
            const ps = playerStats[p.name];
            
            // 🎯 SNIPER LOGIC: Heavy shooters are way more likely to be the goal scorer
            if (hasHeavyShot(ps)) {
                pm *= (arch === 'QUARTERBACK' && pG) ? 1.25 : 1.35; 
            }
            
            // 🏒 PLAYMAKER LOGIC: Great passers defer the shot to their teammates
            if (ps.attr.pass && (ps.attr.pass.includes('A') || ps.attr.pass.includes('B'))) {
                // If they don't also have a heavy shot, severely drop their goal chance
                if (!hasHeavyShot(ps)) pm *= 0.45; 
            }
            
            if (arch === 'SHUTDOWN') pm *= 0.85; 
            
            // Fatigue/Spam prevention (prevents one guy from scoring 5 goals a game)
            let pGs = nG[p.name] || 0; 
            if(pGs === 1) pm *= 0.65; else if(pGs === 2) pm *= 0.3; else if(pGs >= 3) pm *= 0.05;
            
            return Math.pow(r, (baseOff < 76 ? 2.1 : 3.6)) * pm;
        });

        let totalGW = goalWeights.reduce((a, b) => a + b, 0);
        let gRoll = Math.random() * totalGW; let gCum = 0; let scr = u[u.length-1];
        for(let j=0; j<u.length; j++) { gCum += goalWeights[j]; if(gRoll <= gCum) { scr = u[j]; break; } }
        
        nG[scr.name] = (nG[scr.name] || 0) + 1; playerStats[scr.name][k].g++; 
        if(pG) playerStats[scr.name][k].ppg = (playerStats[scr.name][k].ppg || 0) + 1;
        if(sH) playerStats[scr.name][k].shg = (playerStats[scr.name][k].shg || 0) + 1;

        let a1N = null; let a1U = u.filter(p => p.name !== scr.name);
        if(a1U.length > 0 && Math.random() < 0.88) {
            const a1W = a1U.map(p => {
                let r = getLiveIceOvr(p.name); let pm = 1.0; const ps = playerStats[p.name];
                if (ps.attr.pass && (ps.attr.pass.includes('A') || ps.attr.pass.includes('B'))) pm *= 1.15;
                if (getPlayerWeightedStats(p.name).tag === 'SHUTDOWN') pm *= 0.95; 
                return Math.pow(r, 1.5) * pm; 
            });
            let tA1W = a1W.reduce((a, b) => a + b, 0);
            let a1Roll = Math.random() * tA1W; let a1Cum = 0; let a1P = a1U[a1U.length-1];
            for(let j=0; j<a1U.length; j++) { a1Cum += a1W[j]; if(a1Roll <= a1Cum) { a1P = a1U[j]; break; } }
            a1N = a1P.name; playerStats[a1N][k].a++; nA[a1N] = (nA[a1N] || 0) + 1;

            let a2U = a1U.filter(p => p.name !== a1N);
            if(a2U.length > 0 && Math.random() < 0.71) {
                const a2W = a2U.map(p => {
                    let r = getLiveIceOvr(p.name); let pm = 1.0; const ps = playerStats[p.name];
                    if (ps.attr.pass && (ps.attr.pass.includes('A') || ps.attr.pass.includes('B'))) pm *= 1.15;
                    return Math.pow(r, 1.5) * pm;
                });
                let tA2W = a2W.reduce((a, b) => a + b, 0);
                let a2Roll = Math.random() * tA2W; let a2Cum = 0; let a2P = a2U[a2U.length-1];
                for(let j=0; j<a2U.length; j++) { a2Cum += a2W[j]; if(a2Roll <= a2Cum) { a2P = a2U[j]; break; } }
                playerStats[a2P.name][k].a++; nA[a2P.name] = (nA[a2P.name] || 0) + 1;
            }
        }
        ev.push({scorer: scr.name, a1: a1N, onIce: u.map(p=>p.name), isPP: pG, isSH: sH});
    }
    const fallbackStreakPlayers = getActiveSkaters(tk);
    const streakPlayers = activeSkaters || (fallbackStreakPlayers.length ? fallbackStreakPlayers : (rosters[tk] || []).filter(p => p.pos !== 'G'));
    streakPlayers.forEach(p => { if(p.pos !== 'G' && !isASG) processStreaks(p.name, (nG[p.name] || 0) + (nA[p.name] || 0)); }); 
    return ev;
}

// --- 5. MASTER SIMULATION FUNCTION ---
function simGame(idx) {
    const g = calendar[currentDay][idx]; 
    if(!g || g.result) return; 
    gameMilestones = []; 
    const k = (isPlayoffs || isASG) ? 'playoff' : 'season';
    
    const heal = tk => { 
        if(rosters[tk]) rosters[tk].forEach(p => { 
            if(playerStats[p.name] && playerStats[p.name].injury > 0) playerStats[p.name].injury--; 
        }); 
    }; 
    heal(g.h.nrm); heal(g.a.nrm);
    
    if (!isPlayoffs && !isASG && awardConfig.streaks) {
        const rollStk = tk => { 
            if(!rosters[tk]) return; 
            rosters[tk].forEach(p => { if(playerStats[p.name]) playerStats[p.name].streakType = 'stable'; }); 
            const el = rosters[tk].filter(p => { 
                const ps = playerStats[p.name]; 
                if(!ps || ps.injury > 0) return false; 
                return (ps.attr.ovr || (p.pos === 'G' ? ps.attr.gDef : Math.round((ps.attr.off + ps.attr.def) / 2))) < 85; 
            }); 
            if(el.length >= 2) { 
                el.sort(() => Math.random() - 0.5); 
                playerStats[el[0].name].streakType = 'hot'; 
                playerStats[el[1].name].streakType = 'cold'; 
            }
        };
        rollStk(g.h.nrm); rollStk(g.a.nrm);
    }

    const selG = (tk) => {
        if (!rosters[tk]) return null;
        const gs = rosters[tk].filter(p => p.pos === 'G' && playerStats[p.name] && playerStats[p.name].injury === 0).sort((a, b) => getPlayerWeightedStats(b.name).ovr - getPlayerWeightedStats(a.name).ovr);
        if (!gs.length) return null;
        if (gs.length === 1) return gs[0]; 

        const getScore = (gn, isStarter) => {
            const ps = playerStats[gn]; const stats = ps[k]; let score = getPlayerWeightedStats(gn).ovr;
            if (stats.consStarts >= 5) score -= (stats.consStarts - 4) * 15;
            if (playedYesterday(tk) && stats.consStarts > 0) { score -= (ps.streakType === 'hot') ? 5 : 35; }
            if (!isStarter && stats.lastGAA < 2.00 && stats.lastSV > 0.920 && stats.gp > 0) { score += 15; }
            if (isPlayoffs) { score += 50; if (stats.lastGAA > 5.00 || (stats.lastSV < 0.820 && stats.lastSV > 0)) { score -= 60; } }
            return score;
        };
        return (getScore(gs[0].name, true) >= getScore(gs[1].name, false)) ? gs[0] : gs[1];
    };  
    const hG_obj = selG(g.h.nrm), aG_obj = selG(g.a.nrm);
    
    // ... rest of simGame function would go here, but for now just close it
}
    
    const getRat = (tk, aG_o) => {
        if(!rosters[tk] || rosters[tk].length === 0) return {final:1, off:1, sks:[]};
        
        // FIX: Strictly separate Forwards and Defensemen so positions are never mixed!
        const struct = getRosterStructure(tk);
        const sks = [...struct.f.flat(), ...struct.d.flat()];
        if (sks.length === 0) return {final:1, off:1, sks: []};

        let off = sks.length ? sks.reduce((s,p) => { 
            const ps = playerStats[p.name]; let r = ps.attr.off; 
            r += (getGradeMod(ps.attr.speed || 'C') + getGradeMod(ps.attr.agil || 'C') - 1.6) * 4; 
            r += (getGradeMod(ps.attr.pass || 'C') + getGradeMod(ps.attr.stkHnd || 'C') - 1.6) * 4; 
            if(ps.streakType === 'hot') r += 10; if(ps.streakType === 'cold') r -= 10; 
            return s + r; 
        }, 0) / sks.length : 70;        
        
        let gDB = aG_o ? playerStats[aG_o.name].attr.gDef : 60; 
        if(aG_o) { 
            gDB += (getGradeMod(playerStats[aG_o.name].attr.agil || 'C') + getGradeMod(playerStats[aG_o.name].attr.speed || 'C') - 1.8) * 6; 
            if(playerStats[aG_o.name].streakType === 'hot') gDB += 10; if(playerStats[aG_o.name].streakType === 'cold') gDB -= 10; 
        }
        
        const def = sks.length ? (sks.reduce((s,p) => s + playerStats[p.name].attr.def + (getGradeMod(playerStats[p.name].attr.check || 'C') + getGradeMod(playerStats[p.name].attr.aggr || 'C') - 1.6) * 5, 0) / sks.length * 0.3) + (gDB * 0.7) : 70;
        let finalRat = Math.max((off + def) / 2, 1); 
        if (playedYesterday(tk)) { finalRat -= (Math.random() * 2 + 3); off *= 0.92; }
        let tObj = league.find(t => t.nrm === tk);
        if(tObj) { 
            if(tObj.undefeated >= 3 && finalRat < 60) finalRat *= 1.05; 
            if((tObj.loseStreak >= 3 || tObj.winless >= 5) && !tObj.playersMeeting && !tObj.teamMeeting && !tObj.coachFired) finalRat *= 0.95;
            if(tObj.coachFired) finalRat *= 1.25; else if(tObj.teamMeeting) finalRat *= 1.10; else if(tObj.playersMeeting) finalRat *= 1.04;
        }
        const depthPenalty = Math.max(0, 18 - sks.length) * 0.25;
        finalRat = Math.max(1, finalRat - depthPenalty);
        return {final: finalRat, off: Math.max(off,1), def: def, sks: sks};
    }; 
    
    const hT = getRat(g.h.nrm, hG_obj); 
    const aT = getRat(g.a.nrm, aG_obj); 
    const hTO = league.find(t => t.nrm === g.h.nrm); 
    const noise = (((hTO ? hTO.db : 80) - 80) / 52) * 0.12 * (awardConfig.rivalries && rivals[g.h.nrm] && rivals[g.h.nrm].includes(g.a.nrm) ? 1.2 : 1);
    
    [g.h, g.a].forEach(t => { if(t.undefeated === undefined) t.undefeated = 0; if(t.winless === undefined) t.winless = 0; });
    
    let ratio = hT.final / aT.final; 
    let power = (hT.final > 85 && aT.final > 85) ? 0.35 : 0.42;
    let fR = Math.max(hT.final, aT.final); let dR = Math.min(hT.final, aT.final); 
    let rGap = fR - dR; let fUS = (hT.final > aT.final) ? g.h.undefeated : g.a.undefeated;
    if(fR >= 65 && dR < 60 && fUS >= 5) power = 0.15; else if(fUS >= 35) power = 0.02; else if(fUS >= 10 && rGap >= 20) power = 0.15; else if(fUS >= 5 && rGap >= 40) power = 0.22;

    let hAggr = hT.sks.reduce((s,p) => s + getGradeMod(playerStats[p.name].attr.aggr), 0) / Math.max(hT.sks.length, 1); 
    let aAggr = aT.sks.reduce((s,p) => s + getGradeMod(playerStats[p.name].attr.aggr), 0) / Math.max(aT.sks.length, 1);
    let hPR = Math.floor((Math.random() * 3 + 2) * hAggr); 
    let aPR = Math.floor((Math.random() * 3 + 2) * aAggr);
    
    const hPPRate = getSpecialTeamsChance(g.h.nrm, g.a.nrm);
    const aPPRate = getSpecialTeamsChance(g.a.nrm, g.h.nrm);
    let hPPG = 0, aPPG = 0, hSHG = 0, aSHG = 0;
    let penaltyEvents = [];

    if(!isASG) {