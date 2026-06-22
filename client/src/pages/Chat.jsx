import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Chat() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Conversations List
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { contact, product }
  
  // Active Messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [loading, setLoading] = useState(true);

  // Parse URL query parameters if redirected from ProductDetails page
  const query = new URLSearchParams(location.search);
  const queryContactId = query.get('contactId');
  const queryProductId = query.get('productId');

  // 1. Fetch all active conversations
  const fetchConversations = async (selectContext = null) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data);
        
        // If we have a target product/seller from redirect
        if (selectContext) {
          const { contactId, productId } = selectContext;
          
          // Check if this conversation already exists in user list
          const existing = data.find(
            (c) => c.contact._id === contactId && c.product._id === productId
          );
          
          if (existing) {
            setActiveChat({ contact: existing.contact, product: existing.product });
          } else {
            // Fetch product and seller information to initiate temporary conversation context
            await initiateTempConversation(contactId, productId);
          }
        } else if (data.length > 0 && !activeChat) {
          // Default to the first conversation if no active chat is selected
          setActiveChat({ contact: data[0].contact, product: data[0].product });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initiateTempConversation = async (contactId, productId) => {
    try {
      // Fetch product details
      const response = await fetch(`${API_URL}/api/products/${productId}`);
      const product = await response.json();
      
      // Fetch contact details
      const userResponse = await fetch(`${API_URL}/api/auth/seller/${contactId}`);
      const { seller } = await userResponse.json();

      if (response.ok && userResponse.ok) {
        setActiveChat({ contact: seller, product });
      }
    } catch (err) {
      console.error('Failed to initiate conversation:', err);
    }
  };

  // 2. Fetch messages for active chat
  const fetchMessages = async () => {
    if (!token || !activeChat) return;
    try {
      const response = await fetch(
        `${API_URL}/api/messages/${activeChat.contact._id}/${activeChat.product._id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    
    if (queryContactId && queryProductId) {
      fetchConversations({ contactId: queryContactId, productId: queryProductId });
    } else {
      fetchConversations();
    }
  }, [token, queryContactId, queryProductId]);

  // Load and poll messages & conversations when active chat changes
  useEffect(() => {
    fetchMessages();
    fetchConversations();
    
    // Polling interval every 3 seconds for real-time messages & threads
    const pollInterval = setInterval(() => {
      fetchMessages();
      fetchConversations();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activeChat, token]);

  // Scroll to bottom when messages load/update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !token) return;

    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver: activeChat.contact._id,
          product: activeChat.product._id,
          content: newMessage
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages([...messages, data]);
        setNewMessage('');
        
        // Refresh conversations list to bring this thread to top
        fetchConversations();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSelectChat = (conv) => {
    setActiveChat({ contact: conv.contact, product: conv.product });
    // Clear URL queries so we don't trigger context reset on refresh
    navigate('/chat', { replace: true });
  };

  if (loading) {
    return (
      <div style={styles.center} className="container">
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="container animate-fade-in">
      <div className="chat-grid glass-panel">
        
        {/* Left Side: Active Threads List */}
        <div style={styles.sidebar} className="chat-sidebar">
          <div style={styles.sidebarHeader}>
            <h3 style={{ color: '#fff' }}>Conversations</h3>
          </div>
          
          <div style={styles.threadsList}>
            {conversations.length > 0 ? (
              conversations.map((c, index) => {
                const isSelected = activeChat && 
                  activeChat.contact._id === c.contact._id && 
                  activeChat.product._id === c.product._id;
                  
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectChat(c)}
                    style={{
                      ...styles.threadItem,
                      backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                      borderColor: isSelected ? 'var(--gold)' : 'var(--border-color)'
                    }}
                  >
                    <div style={styles.threadAvatar}>
                      {c.contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.threadDetails}>
                      <div style={styles.threadHeaderRow}>
                        <span style={styles.threadName}>{c.contact.name}</span>
                        {c.unread && <span style={styles.unreadDot} />}
                      </div>
                      <div style={styles.threadProduct}>
                        Item: {c.product.name}
                      </div>
                      <div style={styles.threadText}>
                        {c.lastMessage.content}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.emptySidebar}>
                <p>No active conversations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div style={styles.chatWindow}>
          {activeChat ? (
            <>
              {/* Product Header context */}
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderLeft}>
                  <div style={styles.headerAvatar}>
                    {activeChat.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.headerName}>{activeChat.contact.name}</span>
                      {activeChat.contact.isVerifiedStudent && (
                        <span style={styles.verifiedBadge}>Verified Student</span>
                      )}
                    </div>
                    <div style={styles.headerSub}>
                      Seller of: <Link to={`/product/${activeChat.product._id}`} style={styles.productLink}>{activeChat.product.name} (₦{activeChat.product.price.toLocaleString()})</Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Feed */}
              <div style={styles.messagesFeed}>
                {messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.sender._id === user._id || msg.sender === user._id;
                    return (
                      <div
                        key={index}
                        style={{
                          ...styles.msgRow,
                          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div
                          style={{
                            ...styles.msgBubble,
                            backgroundColor: isOwnMessage ? 'var(--gold)' : 'var(--bg-input)',
                            color: isOwnMessage ? '#000' : '#fff',
                            borderRadius: isOwnMessage ? '14px 14px 2px 14px' : '14px 14px 14px 2px'
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.content}</p>
                          <span style={{
                            ...styles.msgTime,
                            color: isOwnMessage ? 'rgba(0,0,0,0.5)' : 'var(--text-gray)'
                          }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyFeed}>
                    <p>Send a message to initiate the conversation regarding this listing.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} style={styles.chatForm}>
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="glass-input"
                  style={styles.chatInput}
                />
                <button type="submit" className="btn-primary" style={styles.sendBtn}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={styles.noChatSelected}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-gray)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3 style={{ marginTop: '16px', color: '#fff' }}>No Active Chat</h3>
              <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '6px' }}>
                Select a conversation from the sidebar or click "Chat with Seller" from any listing details.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '32px',
    paddingBottom: '60px',
  },
  center: {
    height: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 2.2fr',
    height: 'calc(100vh - 180px)',
    minHeight: '500px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    }
  },
  sidebar: {
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--border-color)',
  },
  threadsList: {
    flexGrow: 1,
    overflowY: 'auto',
  },
  threadItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    borderLeft: '4px solid transparent',
  },
  threadAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '1px solid var(--gold)',
    color: 'var(--gold)',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadDetails: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  threadHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadName: {
    fontWeight: '600',
    color: '#fff',
    fontSize: '0.9rem',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--gold)',
  },
  threadProduct: {
    fontSize: '0.75rem',
    color: 'var(--gold)',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  threadText: {
    fontSize: '0.75rem',
    color: 'var(--text-gray)',
    marginTop: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptySidebar: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--text-gray)',
  },
  chatWindow: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '2px solid var(--gold)',
    color: 'var(--gold)',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontWeight: '600',
    color: '#fff',
  },
  verifiedBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '4px',
    padding: '1px 6px',
    fontWeight: '600',
  },
  headerSub: {
    fontSize: '0.75rem',
    color: 'var(--text-gray)',
    marginTop: '2px',
  },
  productLink: {
    color: 'var(--gold)',
    fontWeight: '500',
  },
  messagesFeed: {
    flexGrow: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  msgBubble: {
    maxWidth: '70%',
    padding: '10px 14px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  msgTime: {
    fontSize: '0.65rem',
    alignSelf: 'flex-end',
  },
  emptyFeed: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-gray)',
    textAlign: 'center',
    padding: '40px',
  },
  chatForm: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  chatInput: {
    flexGrow: 1,
  },
  sendBtn: {
    padding: '0 24px',
  },
  noChatSelected: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-gray)',
    textAlign: 'center',
  }
};
