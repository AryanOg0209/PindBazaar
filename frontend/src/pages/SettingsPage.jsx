import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import { askAdvisor } from '../services/aiApi';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('advisor');

  // Kisan AI Advisor State
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🙏 I am Kisan AI, your agricultural advisor. Ask me anything about crops, weather, market prices, government schemes, or farming techniques! (You can also type in Hindi/Punjabi/Hinglish)' }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    orderAlerts: true,
    marketUpdates: false,
    darkMode: false,
    language: 'en',
    whatsappAlerts: false,
  });

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const data = await askAdvisor(userMsg.content, history);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I could not connect to the AI. Please try again.' }]);
    } finally { setChatLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0 }}>⚙️ Settings & Kisan AI</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: 14 }}>Manage your preferences and chat with your AI farming advisor</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            {[['advisor','🤖 Kisan AI Advisor'],['notifications','🔔 Notifications'],['account','👤 Account']].map(([v,l]) => (
              <button key={v} onClick={() => setActiveTab(v)}
                style={{ padding: '8px 18px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: activeTab===v ? '#1B4332' : 'transparent', color: activeTab===v ? 'white' : '#64748B' }}>
                {l}
              </button>
            ))}
          </div>

          {/* KISAN AI ADVISOR */}
          {activeTab === 'advisor' && (
            <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,.08)', overflow: 'hidden', height: 600, display: 'flex', flexDirection: 'column' }}>
              {/* Chat Header */}
              <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', padding: '18px 24px', color: 'white', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Kisan AI Advisor</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Powered by Claude claude-opus-4-5 • Ask in Hindi, Punjabi, or English</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, background: '#F8FAFC' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 10 }}>
                    {m.role === 'assistant' && (
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
                    )}
                    <div style={{
                      maxWidth: '72%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: m.role === 'user' ? '#1B4332' : 'white',
                      color: m.role === 'user' ? 'white' : '#0F172A',
                      fontSize: 14, lineHeight: 1.6, fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {[0,1,2].map(d => (
                        <div key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1', animation: `pulse 1.2s ${d*0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Suggestions */}
              <div style={{ padding: '8px 16px', background: 'white', display: 'flex', gap: 8, overflowX: 'auto', borderTop: '1px solid #F1F5F9' }}>
                {['Best fertiliser for wheat?', 'MSP 2024-25 rates?', 'Paddy price prediction', 'PM-Kisan scheme details', 'Pest control for cotton'].map(q => (
                  <button key={q} onClick={() => { setInput(q); }}
                    style={{ whiteSpace: 'nowrap', padding: '6px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#166534', cursor: 'pointer' }}>
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', background: 'white', display: 'flex', gap: 10, borderTop: '1px solid #F1F5F9' }}>
                <input
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about crops, prices, schemes... (Press Enter to send)"
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, outline: 'none' }}
                />
                <button onClick={sendMessage} disabled={!input.trim() || chatLoading}
                  style={{ width: 48, height: 48, borderRadius: 12, background: input.trim() ? '#1B4332' : '#E2E8F0', color: 'white', border: 'none', fontSize: 20, cursor: input.trim() ? 'pointer' : 'default', transition: 'background .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ➤
                </button>
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }`}</style>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <h3 style={{ margin: '0 0 20px', fontWeight: 800 }}>Notification Preferences</h3>
              {[
                { key: 'notifications', label: 'Push Notifications', desc: 'Receive in-app alerts for activity' },
                { key: 'orderAlerts', label: 'Order Alerts', desc: 'Get notified when your jobs are updated' },
                { key: 'marketUpdates', label: 'Market Updates', desc: 'Daily mandi price updates' },
                { key: 'whatsappAlerts', label: 'WhatsApp Alerts', desc: 'Receive order notifications on WhatsApp' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{desc}</div>
                  </div>
                  <div onClick={() => setSettings(s => ({...s, [key]: !s[key]}))}
                    style={{ width: 48, height: 26, borderRadius: 13, background: settings[key] ? '#1B4332' : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: settings[key] ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'left .2s' }} />
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'block' }}>LANGUAGE</label>
                <select value={settings.language} onChange={e => setSettings(s => ({...s, language: e.target.value}))}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}>
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                </select>
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Account Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    ['Phone', user?.phone],
                    ['Role', user?.role?.toUpperCase()],
                    ['Status', user?.status?.toUpperCase()],
                    ['Account ID', user?.id?.slice(0,16)+'...'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{k}</span>
                      <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#DC2626' }}>Danger Zone</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B' }}>Actions here cannot be undone easily.</p>
                <button onClick={handleLogout}
                  style={{ padding: '12px 24px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>
                  🚪 Logout from PindBazaar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
