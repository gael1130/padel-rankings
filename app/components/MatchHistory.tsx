'use client';

import { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaTrophy } from 'react-icons/fa';
import { format } from 'date-fns';

// Updated interfaces to use string IDs
interface Player {
  id: string;
  name: string;
  email: string;
  elo: number;
  matches: number;
  wins: number;
}

interface Match {
  id: string;
  date: string;
  team1: [Player, Player];
  team2: [Player, Player];
  winner: "team1" | "team2";
  eloChanges: {
    [key: string]: number;  // Changed from number to string keys
  };
}

interface MatchHistoryProps {
  matches: Match[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({
  matches,
  currentPage,
  onPageChange
}) => {
  const matchesPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    setTotalPages(Math.ceil(matches.length / matchesPerPage));
  }, [matches]);
  
  const currentMatches = matches.slice(
    (currentPage - 1) * matchesPerPage,
    currentPage * matchesPerPage
  );
  
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Match History</h2>
      
      {matches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No matches recorded yet
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentMatches.map((match) => (
              <div
                key={match.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex flex-col md:flex-row mb-2 gap-2">
                  <div className="text-sm text-gray-500 mr-2">
                    {format(new Date(match.date), "dd/MM/yyyy HH 'h' mm")}
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <FaTrophy className="mr-1" />
                    <span>
                      {match.winner === "team1"
                        ? `${match.team1[0].name} & ${match.team1[1].name}`
                        : `${match.team2[0].name} & ${match.team2[1].name}`}
                    </span>
                  </div>
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3 rounded-md ${
                    match.winner === "team1"
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}>
                    <div className="font-medium mb-1">Team 1</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div>{match.team1[0].name}</div>
                        <div className="text-sm">
                          {match.eloChanges[match.team1[0].id] > 0 ? "+" : ""}
                          {match.eloChanges[match.team1[0].id]} ELO
                        </div>
                      </div>
                      <div>
                        <div>{match.team1[1].name}</div>
                        <div className="text-sm">
                          {match.eloChanges[match.team1[1].id] > 0 ? "+" : ""}
                          {match.eloChanges[match.team1[1].id]} ELO
                        </div>
                      </div>
                    </div>
                  </div>
  
                  <div className={`p-3 rounded-md ${
                    match.winner === "team2"
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}>
                    <div className="font-medium mb-1">Team 2</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div>{match.team2[0].name}</div>
                        <div className="text-sm">
                          {match.eloChanges[match.team2[0].id] > 0 ? "+" : ""}
                          {match.eloChanges[match.team2[0].id]} ELO
                        </div>
                      </div>
                      <div>
                        <div>{match.team2[1].name}</div>
                        <div className="text-sm">
                          {match.eloChanges[match.team2[1].id] > 0 ? "+" : ""}
                          {match.eloChanges[match.team2[1].id]} ELO
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
  
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              <button
                className="btn-secondary btn-sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <FaChevronLeft />
              </button>
              
              <span className="px-4 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                className="btn-secondary btn-sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MatchHistory;