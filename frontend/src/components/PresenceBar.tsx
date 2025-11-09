import { useEffect, useState } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { UserInfo } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface PresenceBarProps {
  awareness: Awareness | null;
  currentUserId: string;
  currentUsername: string;
  currentColor: string;
}

/**
 * Displays list of connected users with colored indicators
 */
export function PresenceBar({
  awareness,
  currentUserId,
  currentUsername,
  currentColor,
}: PresenceBarProps) {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState<Map<number, UserInfo>>(new Map());

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const userMap = new Map<number, UserInfo>();
      const currentClientId = awareness.clientID;
      
      for (const [clientId, state] of states) {
        if (state.user) {
          userMap.set(clientId, state.user as UserInfo);
        }
      }
      
      setUsers(userMap);
    };

    awareness.on('update', updateUsers);
    updateUsers();

    return () => {
      awareness.off('update', updateUsers);
    };
  }, [awareness]);

  const userList = Array.from(users.values());

  const bgColor = isDarkMode ? '#2d2d2d' : '#fff';
  const borderColor = isDarkMode ? '#404040' : '#dadce0';
  const textColor = isDarkMode ? '#b0b0b0' : '#5f6368';
  const textPrimary = isDarkMode ? '#e0e0e0' : '#202124';

  return (
    <div style={{
      padding: '8px 24px',
      backgroundColor: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      fontSize: '13px',
      color: textColor,
    }}>
      <div style={{ fontWeight: 500, marginRight: '8px', color: textPrimary }}>Collaborators:</div>
      {userList.map((user, index) => (
        <div
          key={user.userId || index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            backgroundColor: user.userId === currentUserId ? '#e8f0fe' : '#f1f3f4',
            borderRadius: '16px',
            border: user.userId === currentUserId ? `1px solid ${user.color}` : '1px solid transparent',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: user.color,
              border: '2px solid #fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          />
          <span style={{ fontSize: '13px', color: textPrimary }}>{user.username}</span>
          {user.userId === currentUserId && (
            <span style={{ fontSize: '11px', color: textColor }}>(you)</span>
          )}
        </div>
      ))}
    </div>
  );
}

