import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Bot, User, Send, Sparkles, HelpCircle, Armchair, Building, Info } from 'lucide-react';

export default function AiChatPanel({ activeRole, onAiNavigation }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Welcome to the Ethara Workspace AI Assistant! I am connected to the production database and can perform real-time lookups, compile utilization metrics, and coordinate seat allocations.\n\nHere are some of the things you can ask me:\n- Where sits Ronald Ward?\n- What is the occupancy rate of the Engineering department?\n- Find a free seat near Project Apollo\n- Who sits at seat FL3-Z-C-S102?\n- List onboarding employees\n\n*(HR/Admin roles can also execute commands like "Allocate seat FL1-Z-A-S010 to EMP-10100" or "Release seat FL1-Z-A-S010")*',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setQuery('');
    setLoading(true);

    try {
      const res = await api.queryAI(text);
      const botMsg = {
        sender: 'bot',
        text: res.response_text,
        timestamp: new Date(),
        intent: res.intent,
        entities: res.entities,
        data: res.data
      };
      setMessages(prev => [...prev, botMsg]);

      // Trigger visual navigation
      if (res.entities) {
        let floor = null;
        let zone = null;
        let seatCode = null;

        if (res.entities.floor) floor = Number(res.entities.floor);
        if (res.entities.zone) zone = res.entities.zone;
        if (res.entities.seat_code) {
          seatCode = res.entities.seat_code;
          const m = seatCode.match(/FL([1-5])-Z-([A-D])/);
          if (m) {
            floor = Number(m[1]);
            zone = m[2];
          }
        }

        if (floor || zone || seatCode) {
          onAiNavigation({ floor, zone, seatCode });
        }
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please make sure the backend is active.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-xl border border-ethara-border/50 h-[calc(100vh-12rem)] flex flex-col justify-between overflow-hidden">
      
      {/* Header Info */}
      <div className="p-4 border-b border-slate-200 dark:border-ethara-border/40 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-ethara-primary">
            <Bot className="w-4 h-4 animate-pulse-soft" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
              Ethara Workspace AI Agent
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <span className="text-[10px] text-slate-500 block">Session Role: {activeRole}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-50/20 dark:bg-transparent">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm flex-shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-2 max-w-[70%]">
              <div className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-ethara-primary text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-ethara-border/40 text-slate-700 dark:text-slate-300 rounded-tl-none'
              }`}>
                {msg.text}
              </div>

              {/* Data Card Representation */}
              {msg.sender === 'bot' && msg.data && msg.data.length > 0 && (
                <div className="grid grid-cols-1 gap-2.5 mt-2">
                  {msg.intent === 'find_employee_seat' && msg.data.map((emp, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-ethara-border/50 rounded-lg text-xs space-y-1.5 shadow-sm">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</div>
                      <div className="text-slate-500">{emp.employee_id} • {emp.role} ({emp.department})</div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-ethara-border/20 pt-1.5 mt-1 font-mono text-[11px]">
                        <span className="text-slate-400">Assigned Desk:</span>
                        <span className="text-ethara-primary font-bold">{emp.seat_code || 'Unallocated'}</span>
                      </div>
                    </div>
                  ))}

                  {msg.intent === 'find_seat_occupant' && msg.data.map((seat, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-ethara-border/50 rounded-lg text-xs space-y-1 shadow-sm">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{seat.seat_code} ({seat.status})</div>
                      {seat.employee_id ? (
                        <>
                          <div className="text-slate-700 dark:text-slate-300 font-semibold mt-1 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Occupant: {seat.name}
                          </div>
                          <div className="text-slate-500 ml-4.5">{seat.employee_id} • {seat.role} ({seat.department})</div>
                        </>
                      ) : (
                        <div className="text-slate-500 italic mt-0.5">Vacant / Available</div>
                      )}
                    </div>
                  ))}

                  {msg.intent === 'floor_occupancy' && msg.data.map((fl, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-ethara-border/50 rounded-lg text-xs space-y-2 shadow-sm">
                      <div className="font-bold text-slate-800 dark:text-slate-200">Floor {fl.floor} Seating Utilization</div>
                      <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-ethara-primary h-full" style={{ width: `${fl.occupancy_rate}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400">
                        <div>Total Slots: {fl.total_seats}</div>
                        <div>Utilization: {fl.occupancy_rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-ethara-primary/20 border border-ethara-primary/30 flex items-center justify-center text-ethara-primary text-sm flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}

          </div>
        ))}

        {loading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm flex-shrink-0 animate-bounce">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-xl text-xs bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-ethara-border/40 text-slate-550 dark:text-slate-400 flex items-center gap-1.5 shadow-sm">
              Analyzing parameters
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce delay-300" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Roster */}
      <div className="p-4 border-t border-slate-200 dark:border-ethara-border/50 bg-slate-50 dark:bg-slate-900/30 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Query employee seats, floor statistics, or trigger allocations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="w-full bg-ethara-input border border-ethara-border rounded-lg pl-3 pr-10 py-3 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-ethara-primary disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            className="absolute right-2.5 top-2.5 p-1.5 bg-ethara-primary disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-lg hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
