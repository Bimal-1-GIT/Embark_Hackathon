import React, { useState, useRef, useEffect } from 'react';

const EXAMPLE_PROMPTS = [
  "What if Kulekhani reservoir drops 10% this week?",
  "What happens to Kathmandu if the Dhalkebar–Muzaffarpur line trips tonight?",
  "What if all Terai industries run double shifts during Dashain week?",
  "कुलेखानी जलाशयको पानी १०% घट्यो भने के हुन्छ?",
];

export default function WhatIfChat({ onSendMessage }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Namaste! I am AI REGO, your Nepal grid intelligence assistant. Ask me any what-if scenario about Nepal\'s electricity grid.\n\nनमस्ते! म AI REGO हुँ, तपाईंको नेपाल ग्रिड बुद्धिमत्ता सहायक। नेपालको विद्युत ग्रिडको बारेमा कुनै पनि "ke hola" प्रश्न सोध्नुहोस्।',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    const question = text || input.trim();
    if (!question || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);

    try {
      const response = await onSendMessage(question);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">
          AI REGO Chat / AI च्याट
        </h3>
        <p className="text-[10px] text-slate-500">
          What-If Scenario Analysis — Bilingual EN/NP
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[350px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-crimson/20 border border-crimson/30 text-slate-200'
                  : 'bg-slate-700/60 border border-slate-600 text-slate-300'
              }`}
            >
              {msg.role === 'assistant' && (
                <p className="text-[10px] text-crimson font-semibold mb-1">AI REGO</p>
              )}
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2">
              <p className="text-[10px] text-crimson font-semibold mb-1">AI REGO</p>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example prompts */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-slate-500 mb-1.5">Try asking / प्रश्न सोध्नुहोस्:</p>
          <div className="flex flex-wrap gap-1">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors text-left"
              >
                {prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a what-if scenario... / प्रश्न सोध्नुहोस्..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-crimson transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-crimson hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
