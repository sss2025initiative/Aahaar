import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '../store/slices/notificationSlice';
import { showToast } from './Toast';

// Icon mapping helper
const getMiniIcon = (type) => {
  if (type?.startsWith('DONATION_') || type === 'NEW_DONATION_SUBMITTED') return '🎁';
  if (type?.startsWith('FOOD_REQUEST_') || type === 'NEW_FOOD_REQUEST') return '🥣';
  if (type?.includes('VERIFIED') || type?.includes('VERIFICATION') || type?.includes('REGISTERED')) return '🛡️';
  if (type?.startsWith('TAX_')) return '📄';
  return '🔔';
};

export default function NotificationBell({ activeRequests = [], onSelectRequest, isAdmin }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unreadCount } = useSelector((state) => state.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'platform'
  const containerRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleMarkRead = (e, id, isRead) => {
    e.stopPropagation();
    if (isRead) return;
    dispatch(markNotificationRead(id))
      .unwrap()
      .catch((err) => showToast(err || 'Failed to update', 'error'));
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    dispatch(markAllNotificationsRead())
      .unwrap()
      .then(() => showToast('All notifications marked as read', 'success'))
      .catch((err) => showToast(err || 'Failed to update', 'error'));
  };

  const handlePlatformItemClick = (item) => {
    setIsOpen(false);
    if (item.type === 'donation') {
      navigate('/admin', { state: { tab: 'donations', filter: 'pending' } });
    } else {
      if (onSelectRequest) {
        onSelectRequest(item);
      }
    }
  };

  const totalUnreadBadge = unreadCount + activeRequests.length;
  const recentNotifications = items.slice(0, 5);

  return (
    <div className="notify-bell-container" ref={containerRef}>
      <button
        className="notify-bell-btn"
        onClick={handleToggle}
        title="Notifications"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: 38,
          height: 38,
          marginRight: 12,
        }}
      >
        🔔
        {totalUnreadBadge > 0 && (
          <span className="notify-badge-count">{totalUnreadBadge}</span>
        )}
      </button>

      {isOpen && (
        <div className="notify-dropdown">
          {/* Unified Tabs Header */}
          <div className="notify-bell-tabs">
            <button
              className={`notify-bell-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              Inbox
              {unreadCount > 0 && (
                <span className="notify-tab-badge">{unreadCount}</span>
              )}
            </button>
            <button
              className={`notify-bell-tab-btn ${activeTab === 'platform' ? 'active' : ''}`}
              onClick={() => setActiveTab('platform')}
            >
              {isAdmin ? 'Approvals' : 'Active Needs'}
              {activeRequests.length > 0 && (
                <span className="notify-tab-badge badge-gray">{activeRequests.length}</span>
              )}
            </button>
          </div>

          {activeTab === 'personal' ? (
            /* Personal Inbox Notifications View */
            <>
              <div className="notify-dropdown-header">
                <h3>Inbox</h3>
                {unreadCount > 0 && (
                  <button className="btn-dismiss-all" onClick={handleMarkAllRead}>
                    Dismiss all
                  </button>
                )}
              </div>

              <div className="notify-dropdown-list">
                {recentNotifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Inbox empty! 🎉
                  </div>
                ) : (
                  recentNotifications.map((item) => {
                    const isUnread = !item.isRead;
                    return (
                      <div
                        key={item._id}
                        className={`notify-dropdown-item ${isUnread ? 'is-unread' : ''}`}
                        onClick={(e) => handleMarkRead(e, item._id, item.isRead)}
                      >
                        <span className="notify-dd-icon">{getMiniIcon(item.type)}</span>
                        <div className="notify-dd-content">
                          <div className="notify-dd-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span>{item.title}</span>
                            {isUnread && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-orange)', display: 'inline-block' }} />
                            )}
                          </div>
                          <div className="notify-dd-desc">{item.message}</div>
                          <span className="notify-dd-time">
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="notify-dropdown-footer">
                <Link to="/notifications" className="btn-view-all" onClick={() => setIsOpen(false)}>
                  View all notifications
                </Link>
              </div>
            </>
          ) : (
            /* Platform Alerts (Approvals / Active Needs) View */
            <>
              <div className="notify-dropdown-header">
                <h3>{isAdmin ? 'Pending Approvals' : 'Active Food Needs'}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeRequests.length} listing{activeRequests.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="notify-dropdown-list">
                {activeRequests.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {isAdmin ? 'No pending approvals! ✓' : 'No active food needs nearby! 🌟'}
                  </div>
                ) : (
                  activeRequests.map((item) => {
                    const isNgoRequest = item.type === 'ngo-request';
                    const isDonation = item.type === 'donation';
                    
                    return (
                      <div
                        key={item._id}
                        className="notify-dropdown-item"
                        onClick={() => handlePlatformItemClick(item)}
                      >
                        <span className="notify-dd-icon">{isNgoRequest ? '🥣' : isDonation ? '🎁' : '📢'}</span>
                        <div className="notify-dd-content">
                          <div className="notify-dd-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 600 }}>
                              {isNgoRequest 
                                ? (item.ngoId?.ngoName || 'NGO Request') 
                                : isDonation 
                                  ? `Donation: ${item.contactDetails?.contactPersonName || item.contactPersonName || 'Donor'}` 
                                  : (item.ngoId?.ngoName || 'NGO Request')
                              }
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: isNgoRequest
                                ? (item.urgencyLevel === 'critical' ? 'rgba(239,68,68,0.1)' : item.urgencyLevel === 'high' ? 'rgba(249,115,22,0.1)' : 'rgba(234,179,8,0.1)')
                                : isDonation 
                                  ? 'rgba(6,182,212,0.1)' 
                                  : 'rgba(234,179,8,0.1)',
                              color: isNgoRequest
                                ? (item.urgencyLevel === 'critical' ? '#f87171' : item.urgencyLevel === 'high' ? '#fb923c' : '#fbbf24')
                                : isDonation 
                                  ? 'var(--color-teal)' 
                                  : '#fbbf24',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              {isNgoRequest ? item.urgencyLevel : isDonation ? 'Review' : 'Active'}
                            </span>
                          </div>
                          <div className="notify-dd-desc" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            📍 {isNgoRequest 
                              ? (item.ngoId?.ngoCity || item.contactDetails?.city || 'City') 
                              : isDonation 
                                ? (item.contactDetails?.city || item.city || 'City')
                                : (item.ngoId?.ngoCity || item.contactDetails?.city || 'City')
                            } · {isNgoRequest 
                              ? (item.purpose || 'Requesting food support') 
                              : isDonation 
                                ? (item.foodItemDetails?.map(f => f.foodName).join(', ') || 'Food items') 
                                : (item.purpose || 'Active request')
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
