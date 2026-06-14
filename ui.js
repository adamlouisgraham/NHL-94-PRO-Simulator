// ui.js - User interface and display functions

// --- UI UPDATE FUNCTIONS ---
function updateUI() {
    // Update all UI elements with current game state
    syncTeamsFromLeague();  // Sync teams data from league
    if (!gameData || !teams) return;
    
    updateStandings();
    updateScheduleView();
    updatePlayerStats();
    updateTeamInfo();
}

function renderTeamStats() {
    // Render team statistics in the stats panel
    if (!selectedTeam || !teams || !teams[selectedTeam]) return;
    
    const team = teams[selectedTeam];
    const statsBox = document.getElementById('teamStatsPanel');
    if (!statsBox) return;
    
    let wins = team.wins || 0;
    let losses = team.losses || 0;
    let ties = team.ties || 0;
    let gf = team.gf || 0;
    let ga = team.ga || 0;
    
    let html = `<div class="team-stats">
        <h3>${team.name}</h3>
        <div class="stat-row">Record: ${wins}-${losses}-${ties}</div>
        <div class="stat-row">Goals For: ${gf}</div>
        <div class="stat-row">Goals Against: ${ga}</div>
        <div class="stat-row">Differential: ${gf - ga}</div>
        <div class="stat-row">Points: ${wins * 2 + ties}</div>
    </div>`;
    
    statsBox.innerHTML = html;
}

function openBoxScore() {
    // Open the box score display for a selected game
    const gameId = document.getElementById('gameSelector')?.value;
    if (!gameId || !gameData || !gameData.games[gameId]) {
        console.warn('No game selected or game not found');
        return;
    }
    
    const game = gameData.games[gameId];
    const boxScorePanel = document.getElementById('boxScorePanel');
    if (!boxScorePanel) return;
    
    let html = `<div class="box-score">
        <div class="box-score-header">${game.homeTeam} vs ${game.awayTeam}</div>
        <div class="box-score-score">${game.homeScore || 0} - ${game.awayScore || 0}</div>
        <div class="box-score-details">Period: ${game.period || 'Final'}</div>
    </div>`;
    
    boxScorePanel.innerHTML = html;
}

function populateTeamSelect() {
    // Populate team dropdown selectors with available teams
    if (!teams) return;
    
    const selectors = document.querySelectorAll('select.team-select, #teamSelector, #tradeTeamSelect');
    selectors.forEach(select => {
        select.innerHTML = '<option value="">Select a team...</option>';
        Object.keys(teams).forEach(teamCode => {
            const team = teams[teamCode];
            const option = document.createElement('option');
            option.value = teamCode;
            option.textContent = team.name || teamCode;
            select.appendChild(option);
        });
    });
}

function updateTradeDropdowns() {
    // Update trade interface dropdowns with available players
    if (!selectedTeam || !playerStats) return;
    
    const rosterPlayers = Object.values(playerStats).filter(p => p.team === selectedTeam);
    const playerSelect = document.getElementById('tradePlayerSelect');
    
    if (playerSelect) {
        playerSelect.innerHTML = '<option value="">Select a player...</option>';
        rosterPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = `${player.name} (${player.pos})`;
            playerSelect.appendChild(option);
        });
    }
}

function takeMonthSnapshot() {
    // Take a snapshot of current season standings/stats for month end
    if (!teams || !playerStats) {
        console.warn('Game data not available for snapshot');
        return;
    }
    
    const snapshot = {
        month: currentMonth || 1,
        season: currentSeason || 1,
        timestamp: new Date().toISOString(),
        standings: JSON.parse(JSON.stringify(teams)),
        leaders: {
            goals: getTopPlayers('goals', 5),
            assists: getTopPlayers('assists', 5),
            points: getTopPlayers('points', 5)
        }
    };
    
    // Store snapshot
    if (!window.monthSnapshots) window.monthSnapshots = [];
    window.monthSnapshots.push(snapshot);
    
    console.log('Month snapshot saved:', snapshot);
    return snapshot;
}

// Helper function to get top players by stat
function getTopPlayers(stat, limit = 5) {
    if (!playerStats) return [];
    
    return Object.values(playerStats)
        .map(p => {
            const seasonStats = p.season || {};
            let value = 0;
            if (stat === 'goals') value = seasonStats.g || 0;
            else if (stat === 'assists') value = seasonStats.a || 0;
            else if (stat === 'points') value = (seasonStats.g || 0) + (seasonStats.a || 0);
            else if (stat === 'plusMinus') value = seasonStats.pm || 0;
            else if (stat === 'shots') value = seasonStats.s || 0;
            
            return {
                name: p.name,
                value: value,
                goals: seasonStats.g || 0,
                assists: seasonStats.a || 0,
                plusMinus: seasonStats.pm || 0,
                shots: seasonStats.s || 0,
                pim: seasonStats.pim || 0,
                toi: seasonStats.toi || 0
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

function updateStandings() {
    // Update league standings display
    const standingsBox = document.getElementById('standingsPanel');
    if (!standingsBox || !teams) return;
    
    let html = '<div class="standings"><h3>League Standings</h3>';
    Object.values(teams)
        .sort((a, b) => (b.wins || 0) - (a.wins || 0))
        .forEach(team => {
            html += `<div class="standing-row">
                <span>${team.name}</span>
                <span>${team.wins || 0}-${team.losses || 0}-${team.ties || 0}</span>
                <span>${(team.wins || 0) * 2 + (team.ties || 0)}</span>
            </div>`;
        });
    html += '</div>';
    standingsBox.innerHTML = html;
}

function updateScheduleView() {
    // Update upcoming games schedule
    const scheduleBox = document.getElementById('schedulePanel');
    if (!scheduleBox || !gameData) return;
    
    let html = '<div class="schedule"><h3>Next Games</h3>';
    const upcoming = Object.values(gameData.games || {})
        .filter(g => !g.completed)
        .slice(0, 10);
    
    upcoming.forEach(game => {
        html += `<div class="schedule-row">
            <span>${game.awayTeam}</span> @ <span>${game.homeTeam}</span>
            <span>${game.date || 'TBD'}</span>
        </div>`;
    });
    html += '</div>';
    scheduleBox.innerHTML = html;
}

function updatePlayerStats() {
    // Update player statistics display
    const statsPanel = document.getElementById('playerStatsPanel');
    if (!statsPanel || !playerStats) return;
    
    // Show top scorers
    const topScorers = Object.values(playerStats)
        .map(p => ({
            name: p.name,
            goals: p.season?.g || 0,
            assists: p.season?.a || 0,
            plusMinus: p.season?.pm || 0,
            shots: p.season?.s || 0,
            pim: p.season?.pim || 0,
            toi: p.season?.toi || 0
        }))
        .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
        .slice(0, 5);
    
    let html = '<div class="player-stats"><h3>Top Scorers</h3>';
    topScorers.forEach(p => {
        const points = p.goals + p.assists;
        html += `<div class="player-row">
            <span>${p.name}</span>
            <span>${p.goals}G ${p.assists}A ${points}Pts | +/- ${p.plusMinus} | S: ${p.shots}</span>
        </div>`;
    });
    html += '</div>';
    statsPanel.innerHTML = html;
}

function updateTeamInfo() {
    // Update selected team info display
    if (!selectedTeam || !teams[selectedTeam]) return;
    
    const team = teams[selectedTeam];
    const infoBox = document.getElementById('teamInfoPanel');
    if (!infoBox) return;
    
    let html = `<div class="team-info">
        <h3>${team.name}</h3>
        <p>Conference: ${team.conference || 'N/A'}</p>
        <p>Division: ${team.division || 'N/A'}</p>
        <p>Record: ${team.wins || 0}-${team.losses || 0}-${team.ties || 0}</p>
    </div>`;
    infoBox.innerHTML = html;
}