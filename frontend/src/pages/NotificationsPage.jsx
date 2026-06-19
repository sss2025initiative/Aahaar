import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../store/slices/notificationSlice';
import { showToast } from '../components/Toast';

// Event codes helper
const CATEGORY_MAP = {
  all: [],
  donations: [
    'DONATION_CREATED', 'DONATION_APPROVED', 'DONATION_REJECTED', 'DONATION_COMPLETED',
    'NEW_DONATION_SUBMITTED', 'NEW_DONATION_ASSIGNED',
  ],
  requests: [
    'FOOD_REQUEST_CREATED', 'FOOD_REQUEST_ACCEPTED', 'FOOD_REQUEST_APPROVED',
    'FOOD_REQUEST_REJECTED', 'FOOD_REQUEST_FULFILLED', 'NEW_FOOD_REQUEST',
  ],
  verification: [
    'USER_REGISTERED', 'NGO_REGISTERED', 'USER_VERIFIED', 'USER_REJECTED',
    'NGO_VERIFIED', 'NGO_REJECTED', 'PENDING_VERIFICATION',
  ],
  tax: ['TAX_CERTIFICATE_GENERATED'],
};

// Icons map based on event type
const getNotificationIcon = (type) => {
  if (type?.startsWith('DONATION_') || type === 'NEW_DONATION_SUBMITTED') return '🎁';
  if (type?.startsWith('FOOD_REQUEST_') || type === 'NEW_FOOD_REQUEST') return '🥣';
  if (type?.includes('VERIFIED') || type?.includes('VERIFICATION') || type?.includes('REGISTERED')) return '🛡️';
  if (type?.startsWith('TAX_')) return '📄';
  return '🔔';
};

// Color scheme mapper
const getNotificationColorClass = (type) => {
  if (type?.includes('REJECTED')) return 'notify-border-red';
  if (type?.includes('APPROVED') || type?.includes('VERIFIED') || type?.includes('COMPLETED') || type?.includes('FULFILLED')) return 'notify-border-green';
  if (type?.includes('EXEMPTION') || type?.includes('TAX')) return 'notify-border-purple';
  if (type?.includes('SUBMITTED') || type?.includes('REGISTERED') || type?.includes('CREATED')) return 'notify-border-teal';
  return 'notify-border-orange';
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.notifications);
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    const codes = CATEGORY_MAP[activeFilter] || [];
    return items.filter((item) => codes.includes(item.type));
  }, [items, activeFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);

    filteredItems.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      if (itemDate.toDateString() === todayDate.toDateString()) {
        today.push(item);
      } else if (itemDate.toDateString() === yesterdayDate.toDateString()) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  }, [filteredItems]);

  const handleMarkRead = (id, isRead) => {
    if (isRead) return;
    dispatch(markNotificationRead(id))
      .unwrap()
      .then(() => showToast('Notification marked as read', 'success'))
      .catch((err) => showToast(err || 'Failed to update', 'error'));
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead())
      .unwrap()
      .then(() => showToast('All notifications marked as read', 'success'))
      .catch((err) => showToast(err || 'Failed to update', 'error'));
  };

  const handleDelete = (e, id) => {
    e.stopPropagation(); // Avoid triggering markRead on click
    dispatch(deleteNotification(id))
      .unwrap()
      .then(() => showToast('Notification deleted', 'info'))
      .catch((err) => showToast(err || 'Failed to delete', 'error'));
  };

  const renderNotificationCard = (item) => {
    const isUnread = !item.isRead;
    const borderClass = getNotificationColorClass(item.type);

    return (
      <div
        key={item._id}
        className={`notify-card ${isUnread ? 'notify-unread' : ''} ${borderClass}`}
        onClick={() => handleMarkRead(item._id, item.isRead)}
        style={{ cursor: isUnread ? 'pointer' : 'default' }}
      >
        <div className="notify-icon-container">
          <span className="notify-emoji-icon">{getNotificationIcon(item.type)}</span>
        </div>
        <div className="notify-content-container">
          <div className="notify-header">
            <h4 className="notify-title">{item.title}</h4>
            <span className="notify-time">
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="notify-message">{item.message}</p>
          <div className="notify-meta">
            <span className="notify-tag">{item.type?.replace(/_/g, ' ')}</span>
            {isUnread && <span className="notify-badge-new">New</span>}
          </div>
        </div>
        <div className="notify-actions">
          <button
            className="notify-btn-delete"
            onClick={(e) => handleDelete(e, item._id)}
            title="Delete notification"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  const hasAnyNotifications = filteredItems.length > 0;

  return (
    <div className="notifications-page-container">
      <div className="notifications-header-box">
        <div>
          <h1 className="page-main-title">Notification Center</h1>
          <p className="page-subtitle">Stay updated with live events and platform alerts.</p>
        </div>
        {hasAnyNotifications && (
          <button className="btn-mark-all-read" onClick={handleMarkAllRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="notify-filters-bar">
        {Object.keys(CATEGORY_MAP).map((filterKey) => (
          <button
            key={filterKey}
            className={`notify-filter-tab ${activeFilter === filterKey ? 'active' : ''}`}
            onClick={() => setActiveFilter(filterKey)}
          >
            {filterKey.charAt(0).toUpperCase() + filterKey.slice(1).replace('ngo', 'NGO')}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="notify-loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : !hasAnyNotifications ? (
        <div className="notify-empty-state">
          <div className="empty-bell">🔔</div>
          <h3>All caught up!</h3>
          <p>No notifications found in this category.</p>
        </div>
      ) : (
        <div className="notify-lists-container">
          {/* Today Group */}
          {groupedNotifications.today.length > 0 && (
            <div className="notify-group">
              <h3 className="notify-group-title">Today</h3>
              <div className="notify-group-cards">
                {groupedNotifications.today.map(renderNotificationCard)}
              </div>
            </div>
          )}

          {/* Yesterday Group */}
          {groupedNotifications.yesterday.length > 0 && (
            <div className="notify-group">
              <h3 className="notify-group-title">Yesterday</h3>
              <div className="notify-group-cards">
                {groupedNotifications.yesterday.map(renderNotificationCard)}
              </div>
            </div>
          )}

          {/* Earlier Group */}
          {groupedNotifications.earlier.length > 0 && (
            <div className="notify-group">
              <h3 className="notify-group-title">Earlier</h3>
              <div className="notify-group-cards">
                {groupedNotifications.earlier.map(renderNotificationCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
