import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';

export default function Chatbot() {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "👋 Hi! I'm your Aahaar Assistant. How can I help you today? Ask me about donations, NGO partnerships, or our platform stats!",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Determine user role
  const donorId = user?._id || user?.id;
  const [ngo, setNgo] = useState(null);

  useEffect(() => {
    if (user && !isAdmin) {
      let active = true;
      api.get('/aahar/ngo-food-requests/ngo-status')
        .then(res => {
          if (active && res.data?.ngo) {
            setNgo(res.data.ngo);
          } else if (active) {
            setNgo(null);
          }
        })
        .catch(() => {
          if (active) setNgo(null);
        });
      return () => { active = false; };
    } else {
      const timer = setTimeout(() => {
        setNgo(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin]);

  // Preset questions depending on authentication and role
  const getPresetQuestions = () => {
    const common = ["What is Aahaar?", "How does Aahaar work?", "Show public statistics"];
    if (!user) {
      return [...common, "How do I donate food?", "How can an NGO register?", "Is the food safe & verified?"];
    }
    if (isAdmin) {
      return [...common, "Show admin dashboard info"];
    }
    if (ngo) {
      return [
        "How does Aahaar work?",
        "Check my NGO status",
        "How many requests have I made?",
        "Show my recent food requests",
        "What is my NGO profile info?",
        "Show public statistics",
      ];
    }
    return [
      "How does Aahaar work?",
      "How much food have I donated?",
      "Show my donation history",
      "What is my donation success rate?",
      "What is my registered profile info?",
      "Show public statistics",
    ];
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
  };

  const handleSend = async (textToSend) => {
    const text = textToSend?.trim() || inputText.trim();
    if (!text) return;

    if (!textToSend) setInputText('');

    // Add user message
    addMessage('user', text);
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(async () => {
      let reply = "";
      const lower = text.toLowerCase();

      try {
        if (lower.includes('what is aahaar') || lower.includes('about aahaar') || lower === 'about') {
          reply = "🌾 **Aahaar** is a MERN-stack surplus food rescue and donation platform. We connect verified donors (restaurants, wedding halls, individuals) with verified local NGO partners to prevent food waste and feed those in need in real-time. Together, we match food supply with community demand!";
        } 
        else if (lower.includes('how does aahaar work') || lower.includes('how aahar work') || lower.includes('how does it work') || lower.includes('workflow') || lower.includes('process')) {
          reply = "🔄 **How Aahaar Works:**\n\n1. **Verification**: Donors sign up and verify their Aadhaar card. NGOs sign up and upload registration certificate/PAN card.\n2. **Donation Creation**: A verified donor lists surplus food details (e.g. Cooked Meals, Veg/Non-Veg, Expiry time) and submits.\n3. **Real-time Alert**: Nearby verified NGOs receive instant dashboard alerts about the donation.\n4. **Acceptance**: An NGO reviews and accepts the donation.\n5. **Fulfillment**: The NGO picks up the food and delivers it to people in need, marking it as Fulfilled!";
        }
        else if (lower.includes('how do i donate') || lower.includes('how to donate') || lower.includes('donate food')) {
          reply = "🍱 **How to Donate Food:**\n1. Ensure you have registered an account and your Aadhaar verification is approved on your dashboard.\n2. Click the **'Donate Food'** link or button.\n3. List the food items, quantity, category, and expiration time.\n4. Submit the donation. Verified NGOs in your city will be notified in real-time to review and pick it up!";
        } 
        else if (lower.includes('ngo register') || lower.includes('register ngo') || lower.includes('how can an ngo register')) {
          reply = "🏢 **NGO Registration:**\n1. Go to the **'NGO Register'** page.\n2. Fill in the NGO details, operating city, and contact info.\n3. Upload your Registration Certificate and Director/Owner PAN Card.\n4. Input the Certificate and PAN card numbers for verification.\n5. Click Submit. Our Admin team will review and approve the request within 2-3 business days.";
        } 
        else if (lower.includes('public stats') || lower.includes('public statistics') || lower.includes('system stats') || lower.includes('statistics') || lower === 'stats') {
          // Fetch live statistics
          const res = await api.get('/aahar/stats/getStats');
          const stats = res.data?.data || res.data;
          if (stats) {
            reply = `📊 **Aahaar Real-time Statistics:**\n\n• 📦 **Total Donations:** ${stats.totalDonations || 0}\n• 🍱 **Meals Served:** ${stats.mealsServed || 0}\n• 🏢 **NGO Partners:** ${stats.totalNgos || 0}\n• 👥 **Active Users:** ${stats.totalUsers || 0}\n\nThank you to our generous donors and NGO partners for making this impact possible! ❤️`;
          } else {
            reply = "Sorry, I couldn't load the real-time statistics right now. Please try again in a moment.";
          }
        } 
        else if (lower.includes('success rate') || lower.includes('rate') || lower.includes('how successful')) {
          if (!user) {
            reply = "🔒 Please log in as a Donor to check your donation success rate.";
          } else if (isAdmin) {
            reply = "⚡ Admins do not make donations, so they do not have a success rate.";
          } else {
            const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
            const data = res.data?.data || res.data;
            const donations = data?.recentDonations || data?.donations || [];
            const total = donations.length;
            const approved = donations.filter(d => d.status === 'approved' || d.status === 'done').length;
            const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
            reply = `📈 **Your Donation Success Rate:**\n\n• **Total Donations:** ${total}\n• **Accepted / Completed:** ${approved}\n• **Success Rate:** **${rate}%**\n\n${rate >= 80 ? "Excellent work! You are a superstar donor! 🌟" : "Your contributions are helping feed the hungry. Thank you! ❤️"}`;
          }
        }
        else if (lower.includes('requests have i made') || lower.includes('how many requests') || lower.includes('my request count') || lower.includes('request count')) {
          if (!user) {
            reply = "🔒 Please log in as an NGO Representative to see your request count.";
          } else {
            const res = await api.get('/aahar/ngo-food-requests/my-requests');
            const reqs = res.data?.requests || [];
            const total = reqs.length;
            const pending = reqs.filter(r => r.status === 'pending').length;
            const approved = reqs.filter(r => r.status === 'approved').length;
            const fulfilled = reqs.filter(r => r.status === 'fulfilled').length;
            const rejected = reqs.filter(r => r.status === 'rejected').length;

            reply = `📋 **Your NGO Request Summary:**\n\n• **Total Requests Made:** ${total}\n• **Pending Review:** ${pending} ⏳\n• **Approved (Awaiting pickup):** ${approved} ✅\n• **Completed (Delivered):** ${fulfilled} 🚚\n• **Rejected:** ${rejected} ❌\n\nKeep coordinating food drives to help the community! 🌾`;
          }
        }
        else if (lower.includes('my recent food requests') || lower.includes('recent food requests') || lower.includes('show my requests') || lower.includes('my food requests')) {
          if (!user) {
            reply = "🔒 Please log in as an NGO Representative to check your food requests.";
          } else {
            const res = await api.get('/aahar/ngo-food-requests/my-requests');
            const reqs = res.data?.requests || [];
            if (reqs.length === 0) {
              reply = "You haven't made any food requests yet. You can submit one in the NGO Portal dashboard!";
            } else {
              const list = reqs.slice(0, 3).map((r, index) => {
                const items = (r.foodItemsNeeded || []).map(f => `${f.foodName} (${f.quantity}${f.quantityType})`).join(', ');
                return `${index + 1}. Request for: **${items || 'Food items'}**\n   Status: **${r.status.toUpperCase()}**\n   Created: ${new Date(r.createdAt).toLocaleDateString('en-IN')}`;
              }).join('\n\n');
              reply = `📋 **Your 3 Most Recent Food Requests:**\n\n${list}\n\nTo view all requests, please navigate to the NGO Portal.`;
            }
          }
        }
        else if (lower.includes('how much food have i donated') || lower.includes('my donations') || lower.includes('how much have i donated')) {
          if (!user) {
            reply = "🔒 You must be logged in as a Donor to view your donation statistics. Please log in or create an account.";
          } else if (isAdmin) {
            reply = "⚡ You are logged in as an Admin. Admins oversee all donations but do not make individual ones.";
          } else {
            const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
            const data = res.data?.data || res.data;
            const donations = data?.recentDonations || data?.donations || [];
            const total = donations.length;
            const pending = donations.filter(d => d.status === 'pending').length;
            const approved = donations.filter(d => d.status === 'approved').length;
            const done = donations.filter(d => d.status === 'done').length;

            reply = `📦 **Your Donation Statistics:**\n\n• **Total Created:** ${total} request(s)\n• **Completed/Served:** ${done} ✅\n• **Approved (Accepted by NGO):** ${approved} 🚚\n• **Pending Review:** ${pending} ⏳\n\nThank you for your generous support! You are making a huge difference in ${user.city || 'your city'}.`;
          }
        } 
        else if (lower.includes('donation history') || lower.includes('my donation history')) {
          if (!user) {
            reply = "🔒 Please log in as a Donor to view your donation history.";
          } else if (isAdmin) {
            reply = "⚡ Admins can view all global donations on the Admin Panel.";
          } else {
            const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
            const data = res.data?.data || res.data;
            const donations = data?.recentDonations || data?.donations || [];
            if (donations.length === 0) {
              reply = "You haven't made any food donations yet. Click 'Donate Food' to start your first donation!";
            } else {
              const list = donations.slice(0, 3).map((d, index) => {
                const items = (d.foodItemDetails || []).map(f => `${f.foodName} (${f.quantity}${f.quantityType})`).join(', ');
                return `${index + 1}. **#${String(d._id).slice(-6).toUpperCase()}** - Status: **${d.status.toUpperCase()}**\n   _${items || 'Food items'}_`;
              }).join('\n\n');
              reply = `📜 **Your 3 Most Recent Donations:**\n\n${list}\n\nTo view all donations, please check your main dashboard.`;
            }
          }
        } 
        else if (lower.includes('ngo status') || lower.includes('check my ngo') || lower.includes('approved')) {
          if (!user) {
            reply = "🔒 Please log in to check NGO registration status.";
          } else {
            const res = await api.get('/aahar/ngo-food-requests/ngo-status');
            const ngo = res.data?.ngo;
            if (!ngo) {
              reply = "🏢 No NGO registration was found linked to your account. You can register an NGO on the **'NGO Register'** page.";
            } else {
              const status = ngo.isApproved ? "Approved ✅" : "Pending Review ⏳";
              reply = `🏢 **NGO Registration Details:**\n\n• **NGO Name:** ${ngo.ngoName}\n• **Status:** ${status}\n• **Operating City:** ${ngo.ngoCity}\n• **Registered Email:** ${ngo.ngoEmail}\n\n${ngo.isApproved ? "You can access the NGO Portal via the sidebar or dropdown to create food requests." : "Our admin team is reviewing your documents. You will receive access once approved."}`;
            }
          }
        } 
        else if (lower.includes('profile') || lower.includes('profile info') || lower.includes('my info')) {
          if (!user) {
            reply = "🔒 You must be logged in to view your profile info.";
          } else {
            const status = user.isVerified ? "Verified User ✓" : "Unverified (Verification Pending)";
            reply = `👤 **Your Profile Information:**\n\n• **Name:** ${user.firstName} ${user.surname || ''}\n• **Email:** ${user.email}\n• **Operating City:** ${user.city || 'Not set'}\n• **Account Type:** ${isAdmin ? 'Admin ⚡' : 'User'}\n• **Status:** ${status}`;
          }
        } 
        else if (lower.includes('admin dashboard') || lower.includes('admin info')) {
          if (!isAdmin) {
            reply = "🔒 This information is restricted to system administrators.";
          } else {
            reply = "⚡ **Admin Commands & Actions:**\nAs an admin, you can:\n• Verify users' Aadhaar documents\n• Approve or reject NGO partnership requests\n• Oversee active food donations and check system analytics";
          }
        } 
        else if (lower.includes('food safe') || lower.includes('safety') || lower.includes('expired') || lower.includes('quality') || lower.includes('is the food safe')) {
          reply = "🛡️ **Food Safety Guidelines:**\n\n• **Freshness**: Donors must specify the preparation time and estimated shelf life/expiry time for all donations.\n• **Verification**: Our admin team reviews donor identity via Aadhaar.\n• **NGO Pickups**: NGO volunteers physically inspect the food's aroma and temperature during pickup.\n• **Food Categories**: We support packaged food, cooked meals, bakery items, fresh fruits & vegetables. Expired, spoiled, or stale food is strictly prohibited.";
        }
        else if (lower.includes('free') || lower.includes('cost') || lower.includes('charge') || lower.includes('payment') || lower.includes('fee')) {
          reply = "🆓 **Yes, Aahaar is 100% Free!**\n\nThere are no registration fees, platform charges, or pick-up fees for either donors or NGOs. Our mission is entirely humanitarian: to bridge the gap between food waste and hunger in our communities.";
        }
        else if (lower.includes('who benefits') || lower.includes('who gets') || lower.includes('beneficiaries')) {
          reply = "👥 **Who Benefits from Aahaar?**\n\nAll accepted food donations are picked up by registered local NGO partners. They distribute it directly to shelter homes, orphanage centers, old age homes, slum areas, and daily wage workers in need in your city.";
        }
        else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('greetings')) {
          reply = `Hello ${user ? user.firstName : 'there'}! I'm your Aahaar Assistant. How can I help you? You can ask me things like 'Show public statistics', 'How do I donate food?', or check your own account data!`;
        } 
        else if (lower.includes('contact') || lower.includes('support') || lower.includes('help')) {
          reply = "📞 **Contact Aahaar Support:**\n• 📧 **Email:** support@aahaar.org\n• 📱 **Phone:** +91 98765 43210\n• 🕒 **Hours:** 9:00 AM - 6:00 PM IST (Mon-Sat)";
        } 
        else {
          reply = "I'm not sure I understand that query. Please try clicking one of the preset questions below, or ask something like 'Show public statistics', 'How do I donate food?', or 'Check my NGO status'.";
        }
      } catch (err) {
        console.error(err);
        reply = "Sorry, I ran into an error fetching your live data. Make sure you are logged in and connected to the internet, then try again.";
      } finally {
        addMessage('bot', reply);
        setIsTyping(false);
      }
    }, 800);
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: 'var(--grad-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 58,
          height: 58,
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(249,115,22,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          animation: 'float 3s ease-in-out infinite',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
        title="Aahaar Chatbot"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: 94,
            right: 24,
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            height: '520px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-accent)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,191,36,0.15))',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--grad-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Aahaar Assistant</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Online · Resolves queries instantly</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Chat Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: 'var(--bg-primary)',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    background: m.sender === 'user' ? 'var(--grad-primary)' : 'var(--bg-card-alt)',
                    color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    whiteSpace: 'pre-line',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {m.text}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {m.sender === 'user' ? 'You' : 'Assistant'}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-card-alt)', border: '1px solid var(--border-color)', borderRadius: '16px 16px 16px 2px', maxWidth: 80 }}>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: '2px' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Questions Panel */}
          <div
            style={{
              padding: '12px 16px 6px',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none', // hide for Firefox
            }}
          >
            {getPresetQuestions().map((q, index) => (
              <button
                key={index}
                onClick={() => handleSend(q)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(249,115,22,0.07)',
                  border: '1px solid var(--border-accent)',
                  borderRadius: '99px',
                  color: 'var(--color-orange)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--grad-primary)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(249,115,22,0.07)';
                  e.currentTarget.style.color = 'var(--color-orange)';
                  e.currentTarget.style.borderColor = 'var(--border-accent)';
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Type your question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                margin: 0,
                padding: '10px 14px',
                fontSize: '0.85rem',
                borderRadius: '99px',
                border: '1px solid var(--border-color)',
                flex: 1,
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{
                padding: '10px 16px',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ➔
            </button>
          </form>
        </div>
      )}
    </>
  );
}
