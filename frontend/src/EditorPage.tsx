import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SocketProvider } from './services/socketProvider';
import { RichEditor } from './components/RichEditor';
import { PresenceBar } from './components/PresenceBar';
import { DocumentMetadata } from './types';
import { useTheme } from './contexts/ThemeContext';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function EditorPage() {
  console.log('EditorPage component rendering');
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  console.log('docId:', docId);
  const [socketProvider, setSocketProvider] = useState<SocketProvider | null>(null);
  const [username, setUsername] = useState<string>('');
  const [color, setColor] = useState<string>(getRandomColor());
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!docId || docId === 'new') {
      // Generate new doc ID and redirect
      const newDocId = crypto.randomUUID();
      navigate(`/doc/${newDocId}`, { replace: true });
      return;
    }

    // Get or prompt for username
    const savedUsername = localStorage.getItem('username') || '';
    let finalUsername = savedUsername;
    
    if (!savedUsername) {
      const promptUsername = prompt('Enter your username:');
      if (promptUsername) {
        finalUsername = promptUsername;
        localStorage.setItem('username', promptUsername);
      } else {
        finalUsername = 'Anonymous';
      }
    }
    
    // Set username immediately
    setUsername(finalUsername);

    // Check backend health first
    fetch('/api/health')
      .then(res => {
        if (res.ok) {
          console.log('Backend health check: OK');
        } else {
          console.error('Backend health check: Failed', res.status);
        }
      })
      .catch(err => {
        console.error('Backend health check: Error', err);
      });

    // Load document metadata
    fetch(`/api/doc/${docId}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setMetadata(data);
        } else {
          // Create new document
          fetch(`/api/doc/${docId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Untitled Document' }),
          })
            .then((res) => res.json())
            .then((data) => setMetadata(data))
            .catch((err) => {
              console.error('Error creating document:', err);
              // Set default metadata even if API fails
              setMetadata({ 
                docId, 
                title: 'Untitled Document', 
                lastModified: Date.now(),
                createdAt: Date.now()
              });
            });
        }
      })
      .catch((err) => {
        console.error('Error loading document:', err);
        // Set default metadata even if API fails
        setMetadata({ 
          docId, 
          title: 'Untitled Document', 
          lastModified: Date.now(),
          createdAt: Date.now()
        });
      });

    // Initialize socket provider with the final username
    const provider = new SocketProvider(docId, finalUsername, color);
    
    // Monitor connection status with better state tracking
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
    }
    
    // Set initial status
    setConnectionStatus(provider.isConnected() ? 'connected' : 'connecting');
    
    // Listen to socket events for real-time status updates
    const updateConnectionStatus = () => {
      if (provider.isConnected()) {
        setConnectionStatus('connected');
        setLastSaved(new Date());
      } else {
        setConnectionStatus('disconnected');
      }
    };
    
    // Listen to custom socket events for immediate updates
    const handleSocketConnected = () => {
      setConnectionStatus('connected');
      setLastSaved(new Date());
    };
    
    const handleSocketDisconnected = () => {
      setConnectionStatus('disconnected');
    };
    
    window.addEventListener('socket-connected', handleSocketConnected);
    window.addEventListener('socket-disconnected', handleSocketDisconnected);
    window.addEventListener('socket-error', handleSocketDisconnected);
    
    // Poll connection status as backup (every 2 seconds to reduce overhead)
    connectionCheckIntervalRef.current = setInterval(updateConnectionStatus, 2000);

    setSocketProvider(provider);

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
        connectionCheckIntervalRef.current = null;
      }
      window.removeEventListener('socket-connected', handleSocketConnected);
      window.removeEventListener('socket-disconnected', handleSocketDisconnected);
      window.removeEventListener('socket-error', handleSocketDisconnected);
      provider.disconnect();
    };
  }, [docId, navigate, color]);

  const handleTitleChange = async (newTitle: string) => {
    if (!docId) return;
    try {
      const response = await fetch(`/api/doc/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await response.json();
      setMetadata(data);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleUsernameChange = (newUsername: string) => {
    if (!newUsername || newUsername.trim() === '') return;
    const trimmedUsername = newUsername.trim();
    setUsername(trimmedUsername);
    localStorage.setItem('username', trimmedUsername);
    
    // Reconnect with new username if socket provider exists
    if (socketProvider && docId) {
      socketProvider.disconnect();
      
      // Clear old connection check interval
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      
      const newProvider = new SocketProvider(docId, trimmedUsername, color);
      setSocketProvider(newProvider);
      
      // Monitor connection status for new provider
      connectionCheckIntervalRef.current = setInterval(() => {
        if (newProvider.isConnected()) {
          setConnectionStatus('connected');
          setLastSaved(new Date());
        } else {
          setConnectionStatus('disconnected');
        }
      }, 1000);
    }
  };

  console.log('EditorPage render check - docId:', docId, 'username:', username);
  
  // Always show something visible
  if (!docId || !username) {
    console.log('EditorPage: Showing loading state');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '24px',
        color: '#000',
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>Loading...</div>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            docId: {docId || 'none'}<br />
            username: {username || 'none'}
          </div>
        </div>
      </div>
    );
  }
  
  console.log('EditorPage: Rendering main UI');

  const bgColor = isDarkMode ? '#1e1e1e' : '#f8f9fa';
  const headerBg = isDarkMode ? '#2d2d2d' : '#fff';
  const headerBorder = isDarkMode ? '#404040' : '#dadce0';
  const textColor = isDarkMode ? '#e0e0e0' : '#202124';
  const textSecondary = isDarkMode ? '#b0b0b0' : '#5f6368';
  const textTertiary = isDarkMode ? '#808080' : '#80868b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: bgColor }}>
      {/* Top Navigation - Enhanced with Dark Mode */}
      <div style={{
        padding: '0 24px',
        backgroundColor: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minHeight: '64px',
        boxShadow: isDarkMode 
          ? '0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)' 
          : '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <input
            ref={usernameInputRef}
            type="text"
            value={metadata?.title || 'Untitled Document'}
            onChange={(e) => handleTitleChange(e.target.value)}
            style={{
              fontSize: '18px',
              fontWeight: 400,
              border: 'none',
              outline: 'none',
              flex: 1,
              color: textColor,
              backgroundColor: 'transparent',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = isDarkMode ? '#3d3d3d' : '#f8f9fa';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          backgroundColor: isDarkMode ? '#3d3d3d' : '#f1f3f4',
          borderRadius: '20px',
          border: `1px solid ${isDarkMode ? '#555' : '#dadce0'}`,
        }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '2px solid #fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onBlur={(e) => {
              if (!e.target.value.trim()) {
                e.target.value = username; // Restore if empty
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="Enter username"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              outline: 'none',
              color: textColor,
              backgroundColor: 'transparent',
              padding: '2px 4px',
              minWidth: '100px',
              maxWidth: '150px',
            }}
            title="Click to change your username"
          />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: textSecondary,
        }}>
          {/* Word Count */}
          {wordCount > 0 && (
            <div style={{ fontSize: '12px', color: textTertiary }}>
              {wordCount} words
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? '#34a853' : '#ea4335',
            }} />
            <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
          </div>
          {lastSaved && (
            <div style={{ fontSize: '12px', color: textTertiary }}>
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            style={{
              padding: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textSecondary,
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Presence Bar */}
      {socketProvider && socketProvider.getSocketId() && (
        <PresenceBar
          awareness={socketProvider.getAwareness()}
          currentUserId={socketProvider.getSocketId() || ''}
          currentUsername={username}
          currentColor={color}
        />
      )}

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {socketProvider ? (
          <RichEditor 
            socketProvider={socketProvider} 
            docId={docId} 
            isDarkMode={isDarkMode}
            onWordCountChange={setWordCount}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: textColor
          }}>
            <div>Connecting...</div>
          </div>
        )}
      </div>

      {/* Status Bar - Enhanced with Dark Mode */}
      <div style={{
        padding: '8px 24px',
        backgroundColor: headerBg,
        borderTop: `1px solid ${headerBorder}`,
        fontSize: '11px',
        color: textSecondary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Document ID: {docId}</span>
          {wordCount > 0 && <span>{wordCount} words</span>}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={() => {
              const text = document.querySelector('.ProseMirror')?.textContent || '';
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${metadata?.title || 'document'}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '4px 8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: isDarkMode ? '#4a9eff' : '#1a73e8',
              fontSize: '11px',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Export TXT
          </button>
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: isDarkMode ? '#4a9eff' : '#1a73e8', 
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Share URL
          </a>
        </div>
      </div>
    </div>
  );
}

