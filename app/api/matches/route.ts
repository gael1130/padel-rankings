import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-side Supabase client (environment variables are protected here)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client with the admin key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // Fetch matches with player data
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(`
        id,
        date,
        winner,
        team1_player1(id, name, email, elo, matches, wins),
        team1_player2(id, name, email, elo, matches, wins),
        team2_player1(id, name, email, elo, matches, wins),
        team2_player2(id, name, email, elo, matches, wins)
      `)
      .order("date", { ascending: false });

    if (matchesError) {
      // Log detailed error information server-side only
      console.error("Database error while fetching matches:", 
        matchesError.message, 
        matchesError.details, 
        matchesError.hint
      );
      
      // Return a generic error message to the client
      return NextResponse.json(
        { error: "Unable to retrieve match data" }, 
        { status: 500 }
      );
    }

    // Handle case where there are no matches
    if (!matchesData || matchesData.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch elo changes for matches
    const matchIds = matchesData.map((match) => match.id);
    const { data: eloChangesData, error: eloChangesError } = await supabase
      .from("elo_changes")
      .select("*")
      .in("match_id", matchIds);

    if (eloChangesError) {
      // Log detailed error information server-side only
      console.error("Database error while fetching ELO changes:", 
        eloChangesError.message, 
        eloChangesError.details, 
        eloChangesError.hint
      );
      
      // Return a generic error message to the client
      return NextResponse.json(
        { error: "Unable to retrieve complete match data" }, 
        { status: 500 }
      );
    }

    // Format matches for the response
    const formattedMatches = matchesData.map((match) => {
      const matchEloChanges = eloChangesData
        .filter((change) => change.match_id === match.id)
        .reduce((acc, change) => {
          acc[change.player_id] = change.elo_change;
          return acc;
        }, {} as Record<string, number>);

      // Extract player objects
      const team1Player1 = match.team1_player1 as unknown as any;
      const team1Player2 = match.team1_player2 as unknown as any;
      const team2Player1 = match.team2_player1 as unknown as any;
      const team2Player2 = match.team2_player2 as unknown as any;

      return {
        id: match.id,
        date: match.date,
        team1: [team1Player1, team1Player2],
        team2: [team2Player1, team2Player2],
        winner: match.winner,
        eloChanges: matchEloChanges,
      };
    });

    return NextResponse.json(formattedMatches);
  } catch (error) {
    // Log the full error details server-side
    console.error("Unexpected error in GET /api/matches:", error);
    
    // Return a generic error message to the client
    return NextResponse.json(
      { error: "Unable to retrieve match data at this time" }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.team1 || !body.team2 || !body.winner) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const team1PlayerIds = body.team1;
    const team2PlayerIds = body.team2;
    const winner = body.winner;
    
    // Validate team structure
    if (!Array.isArray(team1PlayerIds) || team1PlayerIds.length !== 2 ||
        !Array.isArray(team2PlayerIds) || team2PlayerIds.length !== 2) {
      return NextResponse.json(
        { error: "Each team must have exactly 2 players" },
        { status: 400 }
      );
    }
    
    // Validate winner value
    if (winner !== "team1" && winner !== "team2") {
      return NextResponse.json(
        { error: "Invalid winner value" },
        { status: 400 }
      );
    }
    
    // Fetch all players involved in the match
    const allPlayerIds = [...team1PlayerIds, ...team2PlayerIds];
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .in("id", allPlayerIds);
      
    if (playersError) {
      // Log detailed error information server-side only
      console.error("Database error while fetching players for match:", 
        playersError.message, 
        playersError.details, 
        playersError.hint
      );
      
      // Return a generic error message to the client
      return NextResponse.json(
        { error: "Unable to verify player information" },
        { status: 500 }
      );
    }
    
    // Ensure all players exist
    if (!players || players.length !== 4) {
      return NextResponse.json(
        { error: "One or more players not found" },
        { status: 400 }
      );
    }
    
    // Find players by ID for each team
    const team1Players = team1PlayerIds.map(id => 
      players.find(p => p.id === id)
    );
    
    const team2Players = team2PlayerIds.map(id => 
      players.find(p => p.id === id)
    );
    
    // Calculate ELO changes
    const team1Avg = (team1Players[0].elo + team1Players[1].elo) / 2;
    const team2Avg = (team2Players[0].elo + team2Players[1].elo) / 2;
    
    const eloChange = calculateEloChange(
      winner === "team1" ? team1Avg : team2Avg,
      winner === "team1" ? team2Avg : team1Avg
    );
    
    const eloChanges: Record<string, number> = {};
    const winningTeam = winner === "team1" ? team1Players : team2Players;
    const losingTeam = winner === "team1" ? team2Players : team1Players;
    
    winningTeam.forEach((player) => {
      eloChanges[player.id] = eloChange;
    });
    
    losingTeam.forEach((player) => {
      eloChanges[player.id] = -eloChange;
    });
    
    // Insert the match
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert([
        {
          date: new Date().toISOString(),
          winner: winner,
          team1_player1: team1Players[0].id,
          team1_player2: team1Players[1].id,
          team2_player1: team2Players[0].id,
          team2_player2: team2Players[1].id,
        },
      ])
      .select();
      
    if (matchError) {
      // Log detailed error information server-side only
      console.error("Database error while inserting match:", 
        matchError.message, 
        matchError.details, 
        matchError.hint, 
        matchError.code
      );
      
      // Return a generic error message to the client
      return NextResponse.json(
        { error: "Unable to record match" },
        { status: 500 }
      );
    }
    
    if (!matchData || matchData.length === 0) {
      return NextResponse.json(
        { error: "Failed to retrieve match ID" },
        { status: 500 }
      );
    }
    
    const matchId = matchData[0].id;
    
    // Insert elo changes
    const eloChangeRecords = Object.entries(eloChanges).map(
      ([playerId, change]) => ({
        match_id: matchId,
        player_id: playerId,
        elo_change: change,
      })
    );
    
    const { error: eloChangeError } = await supabase
      .from("elo_changes")
      .insert(eloChangeRecords);
      
    if (eloChangeError) {
      // Log detailed error information server-side only
      console.error("Database error while inserting ELO changes:", 
        eloChangeError.message, 
        eloChangeError.details, 
        eloChangeError.hint, 
        eloChangeError.code
      );
      
      // Return a more specific error message
      return NextResponse.json(
        { 
          error: "Match recorded, but ELO rankings couldn't be updated",
          matchId: matchId 
        },
        { status: 207 } // 207 Multi-Status - partial success
      );
    }
    
    // Update players
    const playerUpdatePromises = [];
    
    for (const player of [...team1Players, ...team2Players]) {
      const isWinner = winningTeam.some((p) => p.id === player.id);
      const newElo = player.elo + (eloChanges[player.id] || 0);
      
      const updatePromise = supabase
        .from("players")
        .update({
          elo: newElo,
          matches: player.matches + 1,
          wins: player.wins + (isWinner ? 1 : 0),
        })
        .eq("id", player.id)
        .select();
        
      playerUpdatePromises.push(updatePromise);
    }
    
    // Wait for all player updates
    const playerUpdateResults = await Promise.all(playerUpdatePromises);
    
    // Check for update errors
    let hasUpdateError = false;
    const failedUpdates: string[] = [];
    
    playerUpdateResults.forEach((result) => {
      if (result.error) {
        hasUpdateError = true;
        // Log detailed error information server-side only
        console.error(`Player update failed:`, 
          result.error.message, 
          result.error.details, 
          result.error.hint, 
          result.error.code
        );
        
        // Track which updates failed for debugging
        failedUpdates.push(result.error.message);
      }
    });
    
    if (hasUpdateError) {
      // Log the specific failures server-side
      console.error(`Failed player updates (${failedUpdates.length}):`, failedUpdates);
      
      // Return a user-friendly message with partial success status
      return NextResponse.json(
        { 
          warning: "Match recorded, but player statistics may not be fully updated",
          matchId: matchId 
        },
        { status: 207 } // 207 Multi-Status - partial success
      );
    }
    
    // Return the match data with players and elo changes
    return NextResponse.json({
      id: matchId,
      team1: team1Players,
      team2: team2Players,
      winner,
      eloChanges
    });
  } catch (error: any) {
    // Log detailed server-side error
    console.error("Unexpected error in POST /api/matches:", error);
    
    // Check if it's a client error (like invalid JSON)
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    // Return a generic message for all other errors
    return NextResponse.json(
      { error: "Unable to process your match request at this time" },
      { status: 500 }
    );
  }
}

// Helper function to calculate ELO change
function calculateEloChange(
  winningTeamAvgElo: number,
  losingTeamAvgElo: number
): number {
  const K = 32;
  const expectedScore =
    1 / (1 + Math.pow(10, (losingTeamAvgElo - winningTeamAvgElo) / 400));
  return Math.round(K * (1 - expectedScore));
}