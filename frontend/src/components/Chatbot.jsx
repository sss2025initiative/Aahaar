import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';

// Comprehensive intents configuration
const ALL_INTENTS = [
  {
    id: 'greeting',
    question: '👋 Say Hello',
    keywords: ['hello', 'hi', 'hey', 'greetings', 'yo', 'good morning', 'good afternoon', 'good evening', 'start'],
    roles: ['all'],
    getReply: (user) => `Hello ${user ? user.firstName : 'there'}! I'm your Aahaar Assistant. How can I help you today? You can ask me about creating donations, checking NGO status, routing logistics, or platform statistics!`
  },
  {
    id: 'about',
    question: '🌾 What is Aahaar?',
    keywords: ['what is aahaar', 'about aahaar', 'about', 'aahaar definition', 'aahar', 'platform'],
    roles: ['all'],
    getReply: () => "🌾 **Aahaar** is a secure surplus food rescue and donation orchestration platform. We connect verified donors (restaurants, wedding halls, individuals) with verified local NGO partners to prevent food waste and feed those in need in real-time. Together, we match food supply with community demand!"
  },
  {
    id: 'how_it_works',
    question: '🔄 How does Aahaar work?',
    keywords: ['how does it work', 'how does aahaar work', 'how aahar work', 'workflow', 'process', 'steps', 'mechanism'],
    roles: ['all'],
    getReply: () => "🔄 **How Aahaar Works:**\n\n1. **Verification**: Donors register and verify their Aadhaar card. NGOs register and upload verification certificates.\n2. **Donation Creation**: A verified donor lists surplus food details (category, quantity, and expiration time) and submits.\n3. **Real-time Alert**: Nearby verified NGOs receive instant dashboard alerts.\n4. **Acceptance**: An NGO reviews and accepts the donation.\n5. **Fulfillment**: The NGO picks up the food and delivers it, marking the process as completed!"
  },
  {
    id: 'donate_food',
    question: '🍱 How do I donate food?',
    keywords: ['how do i donate', 'how to donate', 'donate food', 'create donation', 'give food', 'submit donation'],
    roles: ['all'],
    getReply: () => "🍱 **How to Donate Food:**\n1. Ensure you have registered an account and your Aadhaar verification is approved on your dashboard.\n2. Click the **'Donate Food'** link or button.\n3. List the food items, quantity, category, and expiration time.\n4. Submit the donation. Verified NGOs in your city will be notified in real-time to review and pick it up!"
  },
  {
    id: 'register_ngo',
    question: '🏢 How can an NGO register?',
    keywords: ['ngo register', 'register ngo', 'how can an ngo register', 'join ngo', 'ngo sign up', 'onboard ngo'],
    roles: ['all'],
    getReply: () => "🏢 **NGO Registration:**\n1. Go to the **'NGO Register'** page.\n2. Fill in the NGO details, operating city, and contact info.\n3. Upload your Registration Certificate and Director/Owner PAN Card.\n4. Input the Certificate and PAN card numbers for verification.\n5. Click Submit. Our Admin team will review and approve the request within 2-3 business days."
  },
  {
    id: 'public_stats',
    question: '📊 Show public statistics',
    keywords: ['stats', 'statistics', 'analytics', 'total', 'active', 'count', 'system stats', 'meals served'],
    roles: ['all'],
    getReply: async () => {
      const res = await api.get('/aahar/stats/getStats');
      const stats = res.data?.data || res.data;
      if (stats) {
        return `📊 **Aahaar Real-time Statistics:**\n\n• 📦 **Total Donations:** ${stats.totalDonations || 0}\n• 🍱 **Meals Served:** ${stats.mealsServed || 0}\n• 🏢 **NGO Partners:** ${stats.totalNgos || 0}\n• 👥 **Active Users:** ${stats.totalUsers || 0}\n\nThank you to our generous donors and NGO partners for making this impact possible! ❤️`;
      }
      return "Sorry, I couldn't load the real-time statistics right now. Please try again in a moment.";
    }
  },
  {
    id: 'food_safety',
    question: '🛡️ Is the food safe & verified?',
    keywords: ['safe', 'safety', 'quality', 'verify', 'verification', 'expired', 'stale', 'spoil', 'freshness'],
    roles: ['all'],
    getReply: () => "🛡️ **Food Safety Guidelines:**\n\n• **Freshness**: Donors must specify the preparation time and estimated shelf life/expiry time for all donations.\n• **Verification**: Our admin team reviews donor identity via Aadhaar.\n• **NGO Pickups**: NGO volunteers physically inspect the food's aroma and temperature during pickup.\n• **Food Categories**: We support packaged food, cooked meals, bakery items, fresh fruits & vegetables. Expired, spoiled, or stale food is strictly prohibited."
  },
  {
    id: 'free_to_use',
    question: '🆓 Is Aahaar free to use?',
    keywords: ['free', 'cost', 'charge', 'price', 'money', 'payment', 'fee', 'chargeable'],
    roles: ['all'],
    getReply: () => "🆓 **Yes, Aahaar is 100% Free!**\n\nThere are no registration fees, platform charges, or pick-up fees for either donors or NGOs. Our mission is entirely humanitarian: to bridge the gap between food waste and hunger in our communities."
  },
  {
    id: 'beneficiaries',
    question: '👥 Who benefits from Aahaar?',
    keywords: ['who benefits', 'who gets', 'beneficiaries', 'recipient', 'people', 'feed', 'distribute', 'needy', 'poor'],
    roles: ['all'],
    getReply: () => "👥 **Who Benefits from Aahaar?**\n\nAll accepted food donations are picked up by registered local NGO partners. They distribute it directly to shelter homes, orphanage centers, old age homes, slum areas, and daily wage workers in need in your city."
  },
  {
    id: 'contact_support',
    question: '📞 Contact Aahaar support',
    keywords: ['contact', 'support', 'phone', 'email', 'help', 'address', 'number'],
    roles: ['all'],
    getReply: () => "📞 **Contact Aahaar Support:**\n• 📧 **Email:** support@aahaar.org\n• 📱 **Phone:** +91 98765 43210\n• 🕒 **Hours:** 9:00 AM - 6:00 PM IST (Mon-Sat)"
  },
  // Unregistered / General Users
  {
    id: 'documents_required',
    question: '📄 What documents are required for verification?',
    keywords: ['document', 'verification document', 'documents required', 'aadhaar', 'pan card', 'certificate', 'upload', 'verify docs'],
    roles: ['all'],
    getReply: () => "📄 **Required Verification Documents:**\n\n• **For Donors**: A clear photo/scan of your **Aadhaar Card** for identity validation.\n• **For NGOs**: Your **NGO Registration Certificate** and Director/Owner **PAN Card**.\n\nAll documents are securely uploaded to AWS S3 and verified by our admin team before you can create donations or accept requests."
  },
  {
    id: 'register_or_login',
    question: '🔑 Where can I log in or register?',
    keywords: ['login', 'register', 'sign up', 'where to log in', 'create account', 'start registration'],
    roles: ['all'],
    getReply: () => "🔑 **Account Access & Registration:**\n\n• You can access the **Login** and **Register** pages using the buttons in the navigation bar at the top right of the page.\n• If you are registering as a donor, simply choose the default user register. If you are representing an NGO, click the **'NGO Register'** option in the navigation menu."
  },
  // Donor Specific
  {
    id: 'donation_history',
    question: '📜 Show my donation history',
    keywords: ['history', 'previous', 'past', 'my donations', 'donated', 'recent donations', 'donation history'],
    roles: ['donor'],
    getReply: async (user, ngo, donorId) => {
      if (!user) return "🔒 Please log in as a Donor to view your donation history.";
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      const donations = data?.recentDonations || data?.donations || [];
      if (donations.length === 0) {
        return "You haven't made any food donations yet. Click 'Donate Food' to start your first donation!";
      } else {
        const list = donations.slice(0, 3).map((d, index) => {
          const items = (d.foodItemDetails || []).map(f => `${f.foodName} (${f.quantity}${f.quantityType})`).join(', ');
          return `${index + 1}. **#${String(d._id).slice(-6).toUpperCase()}** - Status: **${d.status.toUpperCase()}**\n   _${items || 'Food items'}_`;
        }).join('\n\n');
        return `📜 **Your 3 Most Recent Donations:**\n\n${list}\n\nTo view all donations, please check your main dashboard.`;
      }
    }
  },
  {
    id: 'success_rate',
    question: '📈 What is my donation success rate?',
    keywords: ['success', 'rate', 'percentage', 'performance', 'success rate', 'rate of success'],
    roles: ['donor'],
    getReply: async (user, ngo, donorId) => {
      if (!user) return "🔒 Please log in as a Donor to check your donation success rate.";
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      const donations = data?.recentDonations || data?.donations || [];
      const total = donations.length;
      const approved = donations.filter(d => d.status === 'approved' || d.status === 'done').length;
      const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
      return `📈 **Your Donation Success Rate:**\n\n• **Total Donations:** ${total}\n• **Accepted / Completed:** ${approved}\n• **Success Rate:** **${rate}%**\n\n${rate >= 80 ? "Excellent work! You are a superstar donor! 🌟" : "Your contributions are helping feed the hungry. Thank you! ❤️"}`;
    }
  },
  {
    id: 'food_donated_stats',
    question: '📦 How much food have I donated?',
    keywords: ['how much', 'food donated', 'donated stats', 'total donated', 'my food donated', 'quantity donated'],
    roles: ['donor'],
    getReply: async (user, ngo, donorId) => {
      if (!user) return "🔒 You must be logged in as a Donor to view your donation statistics.";
      const res = await api.get(`/aahar/user-stats/getDashboardStats/${donorId}`);
      const data = res.data?.data || res.data;
      const donations = data?.recentDonations || data?.donations || [];
      const total = donations.length;
      const pending = donations.filter(d => d.status === 'pending').length;
      const approved = donations.filter(d => d.status === 'approved').length;
      const done = donations.filter(d => d.status === 'done').length;
      return `📦 **Your Donation Statistics:**\n\n• **Total Created:** ${total} request(s)\n• **Completed/Served:** ${done} ✅\n• **Approved (Accepted by NGO):** ${approved} 🚚\n• **Pending Review:** ${pending} ⏳\n\nThank you for your generous support! You are making a huge difference in ${user.city || 'your city'}.`;
    }
  },
  {
    id: 'tax_benefits_calculation',
    question: '🧾 How are tax benefits calculated?',
    keywords: ['tax', 'tax benefits', 'exemption', 'tax benefit certificate', '80g', 'calculate tax benefits', 'tax deduction'],
    roles: ['donor'],
    getReply: () => "📜 **Tax Benefits Calculation:**\n\nUnder applicable non-profit tax regulations, your tax benefits are calculated dynamically based on:\n1. The estimated commercial value of the food categories donated (e.g. Cooked Meals vs Grains/Dry Rations).\n2. The total quantity (KG/units) verified during distribution.\n3. Complete pickup and delivery certification by the assigned NGO partner.\n\nOnce fulfilled, an itemized Tax Exemption Certificate is generated automatically and is downloadable via your Donor Dashboard!"
  },
  {
    id: 'donate_non_food',
    question: '📦 Can I donate non-food items?',
    keywords: ['non food', 'non-food items', 'donate clothes', 'other donations', 'books', 'money donation'],
    roles: ['donor'],
    getReply: () => "📦 **Donation Scope Policy:**\n\n• Aahaar is strictly designed for **surplus food rescue and redistribution** to optimize logistics and directly target hunger and food waste.\n• We accept Cooked Meals, Packed/Dry Rations, Bakery Goods, and Fresh Produce.\n• We do **not** support donations of clothes, books, money, or other non-food items at this time. Please contact registered local NGOs directly if you wish to donate non-food items."
  },
  // NGO Specific
  {
    id: 'ngo_request_count',
    question: '📋 How many requests have I made?',
    keywords: ['requests count', 'ngo requests', 'how many requests', 'request count', 'my request count'],
    roles: ['ngo'],
    getReply: async (user) => {
      if (!user) return "🔒 Please log in as an NGO Representative to see your request count.";
      const res = await api.get('/aahar/ngo-food-requests/my-requests');
      const reqs = res.data?.requests || [];
      const total = reqs.length;
      const pending = reqs.filter(r => r.status === 'pending').length;
      const approved = reqs.filter(r => r.status === 'approved').length;
      const fulfilled = reqs.filter(r => r.status === 'fulfilled').length;
      const rejected = reqs.filter(r => r.status === 'rejected').length;
      return `📋 **Your NGO Request Summary:**\n\n• **Total Requests Made:** ${total}\n• **Pending Review:** ${pending} ⏳\n• **Approved (Awaiting pickup):** ${approved} ✅\n• **Completed (Delivered):** ${fulfilled} 🚚\n• **Rejected:** ${rejected} ❌\n\nKeep coordinating food drives to help the community! 🌾`;
    }
  },
  {
    id: 'ngo_recent_requests',
    question: '📋 Show my recent food requests',
    keywords: ['recent requests', 'my food requests', 'recent food requests', 'recent food', 'show my requests'],
    roles: ['ngo'],
    getReply: async (user) => {
      if (!user) return "🔒 Please log in as an NGO Representative to check your food requests.";
      const res = await api.get('/aahar/ngo-food-requests/my-requests');
      const reqs = res.data?.requests || [];
      if (reqs.length === 0) {
        return "You haven't made any food requests yet. You can submit one in the NGO Portal dashboard!";
      } else {
        const list = reqs.slice(0, 3).map((r, index) => {
          const items = (r.foodItemsNeeded || []).map(f => `${f.foodName} (${f.quantity}${f.quantityType})`).join(', ');
          return `${index + 1}. Request for: **${items || 'Food items'}**\n   Status: **${r.status.toUpperCase()}**\n   Created: ${new Date(r.createdAt).toLocaleDateString('en-IN')}`;
        }).join('\n\n');
        return `📋 **Your 3 Most Recent Food Requests:**\n\n${list}\n\nTo view all requests, please navigate to the NGO Portal.`;
      }
    }
  },
  {
    id: 'ngo_status',
    question: '🏢 Check my NGO status',
    keywords: ['ngo status', 'check ngo status', 'ngo verification', 'approved ngo', 'ngo approved', 'is my ngo verified'],
    roles: ['ngo', 'all'],
    getReply: async (user) => {
      if (!user) return "🔒 Please log in to check NGO registration status.";
      const res = await api.get('/aahar/ngo-food-requests/ngo-status');
      const ngo = res.data?.ngo;
      if (!ngo) {
        return "🏢 No NGO registration was found linked to your account. You can register an NGO on the **'NGO Register'** page.";
      } else {
        const status = ngo.isApproved ? "Approved ✅" : "Pending Review ⏳";
        return `🏢 **NGO Registration Details:**\n\n• **NGO Name:** ${ngo.ngoName}\n• **Status:** ${status}\n• **Operating City:** ${ngo.ngoCity}\n• **Registered Email:** ${ngo.ngoEmail}\n\n${ngo.isApproved ? "You can access the NGO Portal via the sidebar or dropdown to create food requests." : "Our admin team is reviewing your documents. You will receive access once approved."}`;
      }
    }
  },
  {
    id: 'ngo_request_food',
    question: '🌾 How do I request food?',
    keywords: ['request food', 'create food request', 'how to request food', 'submit request', 'ngo food request'],
    roles: ['ngo'],
    getReply: () => "🌾 **How to Request Food:**\n\n1. Ensure your NGO verification status is **Approved** by the admin team.\n2. Navigate to your **NGO Dashboard**.\n3. Click **'Create Food Request'** to specify what categories and quantities of food your distribution drive needs.\n4. Nearby donors and admins will see your request, and admins can assign matching donations to you."
  },
  {
    id: 'ngo_spoiled_food',
    question: '⚠️ What if a donation is spoiled?',
    keywords: ['spoiled', 'bad food', 'rotten food', 'rejected food', 'quality standards', 'damaged donation'],
    roles: ['ngo'],
    getReply: () => "⚠️ **Handling Spoiled/Substandard Food:**\n\n• **Safety First**: Do not distribute food that does not meet freshness standards. During physical inspection at pickup:\n1. If the food smells stale, is sour, or looks spoiled, **reject the pickup on-site**.\n2. Update the donation status on your dashboard to **Rejected** and write a brief description of the safety concern.\n3. Admin will review the case, log the violation, and handle the donor account classification."
  },
  // Admin Specific
  {
    id: 'admin_dashboard_info',
    question: '⚡ Show admin dashboard info',
    keywords: ['admin dashboard', 'admin info', 'admin actions', 'admin control', 'system admin'],
    roles: ['admin'],
    getReply: () => "⚡ **Admin Commands & Actions:**\nAs an admin, you can:\n• Verify users' Aadhaar documents\n• Approve or reject NGO partnership requests\n• Oversee active food donations and check system analytics"
  },
  {
    id: 'admin_verify_user',
    question: '👥 How do I verify a user?',
    keywords: ['verify user', 'approve user', 'user verification', 'review aadhaar', 'document check'],
    roles: ['admin'],
    getReply: () => "👥 **User & Donor Verification Workflow:**\n\n1. Log in to the **Admin Dashboard**.\n2. Locate the **'User Management'** section.\n3. Click on a user's details to review their submitted identity documents (e.g. Aadhaar Card link hosted on S3).\n4. Click **'Verify'** to approve. The user's status updates immediately, enabling them to make donations."
  },
  {
    id: 'admin_assign_ngo',
    question: '🚚 How to assign food requests?',
    keywords: ['assign request', 'assign ngo', 'assign food requests', 'assign donation', 'logistic matching'],
    roles: ['admin'],
    getReply: () => "🚚 **Routing Logistics (Donation Assignment):**\n\n1. Log in to the **Admin Dashboard**.\n2. Navigate to **'Pending Donations'**.\n3. Choose an approved donation list.\n4. Click **'Assign NGO'** and choose from the list of nearest registered, verified NGOs in that operating city.\n5. Click Submit. The NGO will receive a real-time pickup notification!"
  },
  // Common Profile
  {
    id: 'profile_info',
    question: '👤 What is my registered profile info?',
    keywords: ['profile', 'profile info', 'my info', 'user info', 'account details', 'my details'],
    roles: ['donor', 'ngo'],
    getReply: (user) => {
      if (!user) return "🔒 You must be logged in to view your profile info.";
      const status = user.isVerified ? "Verified User ✓" : "Unverified (Verification Pending)";
      return `👤 **Your Profile Information:**\n\n• **Name:** ${user.firstName} ${user.surname || ''}\n• **Email:** ${user.email}\n• **Operating City:** ${user.city || 'Not set'}\n• **Status:** ${status}`;
    }
  }
];

export default function Chatbot() {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  // Determine NGO affiliation status
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
      // Wrap setState in an asynchronous task to avoid cascading render warnings
      const timer = setTimeout(() => {
        setNgo(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, isAdmin]);

  // Check if intent is allowed for the current user's role
  const isIntentAllowed = (intent) => {
    if (intent.roles.includes('all')) return true;
    if (intent.roles.includes('donor') && user && !isAdmin && !ngo) return true;
    if (intent.roles.includes('ngo') && ngo) return true;
    if (intent.roles.includes('admin') && isAdmin) return true;
    return false;
  };

  // Get active preset/default suggestions when input box is empty
  const getDefaultPresetQuestions = () => {
    const common = ["What is Aahaar?", "How does Aahaar work?", "Show public statistics"];
    if (!user) {
      return [...common, "How do I donate food?", "How can an NGO register?", "What documents are required for verification?"];
    }
    if (isAdmin) {
      return [...common, "Show admin dashboard info", "How do I verify a user?", "How to assign food requests?"];
    }
    if (ngo) {
      return [
        "How does Aahaar work?",
        "Check my NGO status",
        "How many requests have I made?",
        "How do I request food?",
        "What if a donation is spoiled?",
        "Show public statistics",
      ];
    }
    return [
      "How does Aahaar work?",
      "How much food have I donated?",
      "Show my donation history",
      "What is my donation success rate?",
      "How are tax benefits calculated?",
      "Show public statistics",
    ];
  };

  // Get filtered suggestions dynamically as the user types
  const getSuggestions = () => {
    const query = inputText.trim().toLowerCase();
    if (!query) {
      const presets = getDefaultPresetQuestions();
      return ALL_INTENTS.filter(intent => {
        if (!isIntentAllowed(intent)) return false;
        const qClean = intent.question.replace(/[^\w\s]/g, '').trim().toLowerCase();
        return presets.some(p => p.replace(/[^\w\s]/g, '').trim().toLowerCase().includes(qClean) || qClean.includes(p.replace(/[^\w\s]/g, '').trim().toLowerCase()));
      });
    }

    return ALL_INTENTS.filter(intent => {
      if (!isIntentAllowed(intent)) return false;
      const questionText = intent.question.toLowerCase();
      const matchesText = questionText.includes(query);
      const matchesKeywords = intent.keywords.some(kw => kw.includes(query) || query.includes(kw));
      return matchesText || matchesKeywords;
    }).slice(0, 5);
  };

  const parseIntent = (text) => {
    const lower = text.toLowerCase().trim();
    const validIntents = ALL_INTENTS.filter(isIntentAllowed);

    let bestIntent = null;
    let highestScore = 0;

    validIntents.forEach(intent => {
      let score = 0;
      const qText = intent.question.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const textClean = lower.replace(/[^\w\s]/g, '').trim();
      if (textClean === qText) {
        score += 150;
      } else if (qText.includes(textClean) && textClean.length > 3) {
        score += 40;
      }

      intent.keywords.forEach(kw => {
        if (lower.includes(kw)) {
          score += kw.split(' ').length * 15;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestIntent = intent;
      }
    });

    return highestScore >= 12 ? bestIntent : null;
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
  };

  const handleSend = async (textToSend) => {
    const text = textToSend?.trim() || inputText.trim();
    if (!text) return;
    setInputText('');
    addMessage('user', text);
    setIsTyping(true);

    const matchedIntent = parseIntent(text);

    setTimeout(async () => {
      let reply = "";
      try {
        if (matchedIntent) {
          reply = await matchedIntent.getReply(user, ngo, donorId);
        } else {
          reply = `I'm not sure I understand that query. 

💡 **Here are some keywords you can try:**
• Type **'donate'** or **'donations'** to see how to contribute.
• Type **'ngo'** or **'register'** to check status or register a partnership.
• Type **'stats'** or **'statistics'** to view platform impact stats.
• Type **'profile'** to see details.

Or simply select one of the matching options below!`;
        }
      } catch (err) {
        console.error("Chatbot Error:", err);
        reply = "Sorry, I ran into an error fetching your live data. Make sure you are logged in and connected to the internet, then try again.";
      } finally {
        addMessage('bot', reply);
        setIsTyping(false);
      }
    }, 650);
  };

  // Dynamic welcome message helper (declarative)
  const getWelcomeMessage = () => {
    let welcomeText = "👋 Welcome to Aahaar! I'm your assistant. You can ask me how to register an NGO, how to donate food, or view our public statistics. Log in or register to unlock personalized tools!";
    if (user) {
      if (isAdmin) {
        welcomeText = `⚡ Welcome back, Administrator ${user.firstName}! You can check overall platform metrics, approve verifications, or ask about administrative logistics.`;
      } else if (ngo) {
        welcomeText = `🏢 Hello Representative of **${ngo.ngoName}**! Thank you for partnering with Aahaar. Ask me about your request count, recent requests, or NGO verification status.`;
      } else {
        welcomeText = `👋 Hi ${user.firstName}! Thank you for being an Aahaar donor. Ask me about your donation history, success rate, total food donated, or how to create a new donation!`;
      }
    }
    return { sender: 'bot', text: welcomeText };
  };

  const displayMessages = [getWelcomeMessage(), ...messages];
  const activeSuggestions = getSuggestions();

  return (
    <>
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

      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            bottom: 94,
            right: 24,
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            height: '540px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border-accent)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Online · Responds instantly</div>
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
            {displayMessages.map((m, idx) => (
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

          <div
            style={{
              padding: '12px 16px 6px',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{inputText.trim() ? '💡 Matching options:' : '👉 Suggested queries:'}</span>
              {inputText.trim() && (
                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>({activeSuggestions.length} found)</span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                paddingBottom: 4,
              }}
            >
              {activeSuggestions.length > 0 ? (
                activeSuggestions.map((intent, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(intent.question.replace(/^[\uE000-\uF8FF\u2700-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\uD83E[\uDD00-\uDFFF]/g, '').trim())}
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
                    {intent.question}
                  </button>
                ))
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 0' }}>
                  No matching options. Press enter to ask custom question!
                </span>
              )}
            </div>
          </div>

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
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ask or type keywords (e.g. ngo, stats)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  margin: 0,
                  padding: '10px 36px 10px 14px',
                  fontSize: '0.85rem',
                  borderRadius: '99px',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                }}
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
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
