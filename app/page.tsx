"use client";

import { useState, useEffect, useCallback } from "react";
import { FaTrophy, FaPlus } from "react-icons/fa";
import clsx from "clsx";
import Leaderboard from "./components/Leaderboard";
import MatchHistory from "./components/MatchHistory";
import SearchableSelect from "./components/SearchableSelect";
// No longer using direct Supabase client in the frontend

// Updated interfaces to use string IDs for UUIDs
interface Player {
  id: string; // Changed from number to string for UUID
  name: string;
  email: string;
  elo: number;
  matches: number;
  wins: number;
}

interface Match {
  id: string; // Changed from number to string for UUID
  date: string;
  team1: [Player, Player];
  team2: [Player, Player];
  winner: "team1" | "team2";
  eloChanges: {
    [key: string]: number; // Keys are UUID strings
  };
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [formErrors, setFormErrors] = useState({
    name: false,
    email: false,
    nameDuplicate: false,
    emailDuplicate: false,
  });
  
  // Updated to ensure we're tracking all 4 players properly
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: ["", ""],
    team2: ["", ""]
  });
  
  const [winner, setWinner] = useState<"team1" | "team2" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [matchHistoryPage, setMatchHistoryPage] = useState(1);

  // Fetch players from API with better error handling
  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players', {
        // Add cache control for fresh data
        cache: 'no-store'
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to fetch players";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error(`Error fetching players (${response.status}):`, errorMessage);
        
        // Only show error alert if it's not a network-related issue
        if (response.status !== 503 && response.status !== 504) {
          alert(`Unable to load players: ${errorMessage}`);
        }
        
        return [];
      }
      
      const data = await response.json();
      return data as Player[];
    } catch (error) {
      // This is likely a network error, not a server response error
      console.error("Network error while fetching players:", error);
      return [];
    }
  };

  // Fetch matches from API with better error handling
  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/matches', {
        // Add cache control for fresh data
        cache: 'no-store'
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to fetch matches";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error(`Error fetching matches (${response.status}):`, errorMessage);
        
        // Only show error alert if it's not a network-related issue
        if (response.status !== 503 && response.status !== 504) {
          alert(`Unable to load match history: ${errorMessage}`);
        }
        
        return [];
      }
      
      const data = await response.json();
      return data as Match[];
    } catch (error) {
      // This is likely a network error, not a server response error
      console.error("Network error while fetching matches:", error);
      return [];
    }
  };

  // Load initial data with error handling
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load players and matches in parallel for better performance
        const [playersData, matchesData] = await Promise.all([
          fetchPlayers(),
          fetchMatches()
        ]);
        
        setPlayers(playersData);
        setMatches(matchesData);
      } catch (error) {
        console.error("Error loading initial data:", error);
        // Already handled in fetch functions
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleMatchHistoryPageChange = useCallback((page: number) => {
    setMatchHistoryPage(page);
  }, []);

  // ELO calculation moved to server-side API

  const validateForm = () => {
    const errors = {
      name: !newPlayerName.trim(),
      email: !newPlayerEmail.trim(),
      nameDuplicate: false,
      emailDuplicate: false,
    };

    if (!errors.name && !errors.email) {
      // Check for duplicate name
      const duplicateName = players.find(
        (p) => p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      );
      if (duplicateName) {
        errors.nameDuplicate = true;
      }

      // Check for duplicate email
      const duplicateEmail = players.find(
        (p) => p.email.toLowerCase() === newPlayerEmail.trim().toLowerCase()
      );
      if (duplicateEmail) {
        errors.emailDuplicate = true;
      }
    }

    setFormErrors(errors);
    return (
      !errors.name &&
      !errors.email &&
      !errors.nameDuplicate &&
      !errors.emailDuplicate
    );
  };

  // Add a new player via API with improved error handling
  const addPlayer = async (
    playerData: Omit<Player, "id" | "matches" | "wins" | "elo">
  ) => {
    try {
      // First sanitize the input data
      const name = playerData.name.trim();
      const email = playerData.email.trim();
      
      // Make the API request
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = "Failed to add player";
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If error parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error(`Error adding player (${response.status}):`, errorMessage);
        
        // Handle specific status codes with user-friendly messages
        if (response.status === 400) {
          alert(`Invalid player data: ${errorMessage}`);
        } else if (response.status === 409) { 
          alert(`This player already exists: ${errorMessage}`);
        } else {
          alert(`Unable to add player: ${errorMessage}`);
        }
        
        return null;
      }

      // Process successful response
      const data = await response.json();
      
      // Refresh the players list
      const updatedPlayers = await fetchPlayers();
      setPlayers(updatedPlayers);

      return data;
    } catch (error) {
      // This is likely a network error
      console.error("Network error while adding player:", error);
      alert('Unable to add player due to a network error. Please check your connection and try again.');
      return null;
    }
  };

  // Handle the submission of the add player form
  const handleAddPlayer = async () => {
    if (!validateForm()) return;

    try {
      const result = await addPlayer({
        name: newPlayerName.trim(),
        email: newPlayerEmail.trim(),
      });

      if (result) {
        // Reset form and close modal
        setNewPlayerName("");
        setNewPlayerEmail("");
        setShowAddPlayer(false);
      } else {
        // If addPlayer returned null, there was an error
        alert("Failed to add player. Check console for details.");
      }
    } catch (error) {
      console.error("Error in handleAddPlayer:", error);
      alert("Failed to add player. Check console for details.");
    }
  };

  // Updated function to handle player selection
  const handlePlayerSelect = (team: 'team1' | 'team2', index: 0 | 1, playerId: string) => {
    setSelectedPlayers(prev => {
      const newTeam = [...prev[team]];
      newTeam[index] = playerId;
      return {
        ...prev,
        [team]: newTeam
      };
    });
  };

  const recordMatch = async () => {
    try {
      // Validate player selection
      const team1Ids = selectedPlayers.team1;
      const team2Ids = selectedPlayers.team2;
  
      if (team1Ids.includes("") || team2Ids.includes("") || !winner) {
        alert("Please select all players and a winner");
        return;
      }
      
      // Check for duplicates (same player on both teams)
      const allPlayerIds = [...team1Ids, ...team2Ids];
      const uniquePlayerIds = new Set(allPlayerIds);
      
      if (uniquePlayerIds.size !== 4) {
        alert("A player cannot be on both teams. Please select different players.");
        return;
      }
      
      setLoading(true);
      
      try {
        // Call the API to record the match
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            team1: team1Ids,
            team2: team2Ids,
            winner: winner,
          }),
        });
        
        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage = "Failed to record match";
          let warningMessage = null;
          let isPartialSuccess = false;
          
          try {
            const responseData = await response.json();
            
            // Check for partial success (207)
            if (response.status === 207 && responseData.warning) {
              warningMessage = responseData.warning;
              isPartialSuccess = true;
            } else if (responseData.error) {
              errorMessage = responseData.error;
            }
          } catch (e) {
            // If error parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
          
          // If it's a partial success (e.g., match recorded but ELO not updated),
          // show a warning but proceed with UI updates
          if (isPartialSuccess) {
            console.warn(`Partial success: ${warningMessage}`);
            alert(`Match recorded with warning: ${warningMessage}`);
          } else {
            console.error(`Error recording match (${response.status}):`, errorMessage);
            alert(`Unable to record match: ${errorMessage}`);
            setLoading(false);
            return;
          }
        } else {
          // Success!
          console.log("Match recorded successfully!");
        }
        
        // Refresh data
        const [updatedPlayers, updatedMatches] = await Promise.all([
          fetchPlayers(),
          fetchMatches()
        ]);
        
        setPlayers(updatedPlayers);
        setMatches(updatedMatches);
        
        // Reset form
        setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
        setWinner(null);
      } catch (apiError) {
        console.error("API error while recording match:", apiError);
        alert('Unable to record match. Please try again later.');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      // This would be a client-side error, unlikely to happen with our validation
      console.error("Unexpected error recording match:", error);
      alert('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Padel Rankings</h1>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Record Match - Shown first on mobile */}
        {/* Record Match Section with Fixed Structure and Unique IDs */}
        <div className="order-first lg:order-none card">
          <h2 className="text-2xl font-semibold mb-6">Record Match</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Team 1 */}
              <div>
                <label className="block text-sm font-medium mb-1">Team 1</label>
                <div className="mb-2">
                  <SearchableSelect
                    id="team1-player1"
                    options={players}
                    value={selectedPlayers.team1[0]}
                    onChange={(value) => handlePlayerSelect('team1', 0, value)}
                    placeholder="Select Player 1"
                  />
                </div>
                <div className="mb-2">
                  <SearchableSelect
                    id="team1-player2"
                    options={players}
                    value={selectedPlayers.team1[1]}
                    onChange={(value) => handlePlayerSelect('team1', 1, value)}
                    placeholder="Select Player 2"
                  />
                </div>
              </div>

              {/* Team 2 */}
              <div>
                <label className="block text-sm font-medium mb-1">Team 2</label>
                <div className="mb-2">
                  <SearchableSelect
                    id="team2-player1"
                    options={players}
                    value={selectedPlayers.team2[0]}
                    onChange={(value) => handlePlayerSelect('team2', 0, value)}
                    placeholder="Select Player 1"
                  />
                </div>
                <div className="mb-2">
                  <SearchableSelect
                    id="team2-player2"
                    options={players}
                    value={selectedPlayers.team2[1]}
                    onChange={(value) => handlePlayerSelect('team2', 1, value)}
                    placeholder="Select Player 2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                className={clsx(
                  "btn",
                  winner === "team1" ? "btn-win-selected" : "btn-win"
                )}
                onClick={() => setWinner("team1")}
                disabled={
                  selectedPlayers.team1.includes("") ||
                  selectedPlayers.team2.includes("")
                }
              >
                Team 1 Wins
              </button>
              <button
                className={clsx(
                  "btn",
                  winner === "team2" ? "btn-win-selected" : "btn-win"
                )}
                onClick={() => setWinner("team2")}
                disabled={
                  selectedPlayers.team1.includes("") ||
                  selectedPlayers.team2.includes("")
                }
              >
                Team 2 Wins
              </button>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={recordMatch}
              disabled={
                selectedPlayers.team1.includes("") ||
                selectedPlayers.team2.includes("") ||
                !winner
              }
            >
              Record Match
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FaTrophy className="text-yellow-500" />
              Leaderboard
            </h2>
            <button
              onClick={() => setShowAddPlayer(true)}
              className="btn-secondary btn flex items-center gap-2"
            >
              <FaPlus /> Add Player
            </button>
          </div>

          <Leaderboard
            players={players}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Match History */}
        <div className="lg:col-span-2 card">
          <MatchHistory
            matches={matches}
            currentPage={matchHistoryPage}
            onPageChange={handleMatchHistoryPageChange}
          />
        </div>
      </div>

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="card w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-4">Add New Player</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={clsx(
                  "input w-full",
                  (formErrors.name || formErrors.nameDuplicate) &&
                    "border-red-500"
                )}
                placeholder="Player Name"
                value={newPlayerName}
                onChange={(e) => {
                  setNewPlayerName(e.target.value);
                  setFormErrors((prev) => ({
                    ...prev,
                    name: false,
                    nameDuplicate: false,
                  }));
                }}
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">Name is required</p>
              )}
              {formErrors.nameDuplicate && (
                <p className="text-red-500 text-sm mt-1">
                  Name already taken, please change it
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={clsx(
                  "input w-full",
                  (formErrors.email || formErrors.emailDuplicate) &&
                    "border-red-500"
                )}
                placeholder="Email Address"
                value={newPlayerEmail}
                onChange={(e) => {
                  setNewPlayerEmail(e.target.value);
                  setFormErrors((prev) => ({
                    ...prev,
                    email: false,
                    emailDuplicate: false,
                  }));
                }}
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm mt-1">Email is required</p>
              )}
              {formErrors.emailDuplicate && (
                <p className="text-red-500 text-sm mt-1">
                  Email already taken, please change it
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn w-full" onClick={handleAddPlayer}>
                Add Player
              </button>
              <button
                className="btn-secondary btn w-full"
                onClick={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName("");
                  setNewPlayerEmail("");
                  setFormErrors({
                    name: false,
                    email: false,
                    nameDuplicate: false,
                    emailDuplicate: false,
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}