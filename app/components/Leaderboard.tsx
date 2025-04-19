'use client';

import { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaMedal } from 'react-icons/fa';

// Updated to use string IDs
interface Player {
  id: string;
  name: string;
  email: string;
  elo: number;
  matches: number;
  wins: number;
}

interface LeaderboardProps {
  players: Player[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  players, 
  currentPage, 
  onPageChange 
}) => {
  const playersPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    setTotalPages(Math.ceil(players.length / playersPerPage));
  }, [players]);
  
  const currentPlayers = players.slice(
    (currentPage - 1) * playersPerPage,
    currentPage * playersPerPage
  );
  
  // Function to render medal for top 3 positions
  const renderMedal = (position: number) => {
    const globalPosition = (currentPage - 1) * playersPerPage + position + 1;
    
    if (globalPosition === 1) {
      return <FaMedal className="text-yellow-500 mr-1" title="Gold Medal" />; // Gold
    } else if (globalPosition === 2) {
      return <FaMedal className="text-gray-400 mr-1" title="Silver Medal" />; // Silver
    } else if (globalPosition === 3) {
      return <FaMedal className="text-amber-700 mr-1" title="Bronze Medal" />; // Bronze
    }
    return null;
  };
  
  return (
    <div>
      <div className="overflow-x-auto rounded-md">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Player</th>
              <th className="px-4 py-2 text-right">ELO</th>
              <th className="px-4 py-2 text-right"><span className="text-green-500">W</span>/L</th>
            </tr>
          </thead>
          <tbody>
            {currentPlayers.map((player, index) => (
              <tr 
                key={player.id}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center">
                    {(currentPage - 1) * playersPerPage + index + 1}
                    <span className="ml-1">{renderMedal(index)}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{player.name}</td>
                <td className="px-4 py-2 text-right">{player.elo}</td>
                <td className="px-4 py-2 text-right">
                  <span className="text-green-500">{player.wins}</span>/{player.matches - player.wins}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default Leaderboard;