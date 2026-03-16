import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { Send, Bot, User, RefreshCw, DollarSign, Loader2 } from 'lucide-react';

const SYSTEM_INSTRUCTION = `You are FlipperAI, an expert reselling assistant for people who buy and resell items on platforms like eBay, Poshmark, Facebook Marketplace, and Mercari.

You have deep knowledge of:
- Resale market pricing across all major platforms
- What makes items sell fast vs. sit unsold
- Platform-specific fees, shipping costs, and best practices
- Trending categories: sneakers, vintage clothing, electronics, collectibles, toys, tools, furniture
- Sourcing strategies: thrift stores, estate sales, liquidation pallets, garage sales

You can help users with the following tasks. When a user describes an item, detect which task they need and respond accordingly:

---

TASK 1 — PRICE ESTIMATOR
When a user describes an item they found or want to sell, provide:
- Suggested sell price (low / mid / high range)
- Which platform is best to sell it on
- Brief reasoning (condition, demand, comparable sales)
- Confidence level: High / Medium / Low

Format:
💰 Sell price: $X – $Y
🏪 Best platform: [platform]
📊 Confidence: [High/Medium/Low]
💡 Why: [2–3 sentence reasoning]

---

TASK 2 — LISTING GENERATOR
When a user asks you to write a listing, generate:
- A punchy, keyword-rich title (under 80 characters)
- A full item description (condition, features, measurements if relevant, what's included)
- 5–8 suggested search keywords/tags
- Suggested category

Format clearly with labeled sections.

---

TASK 3 — PROFIT CALCULATOR
When a user gives you a buy price and expected sell price, calculate:
- Platform fee (ask which platform, or assume eBay at 13.25% if not specified)
- Estimated shipping cost (ask for item weight/size or estimate)
- Net profit in dollars
- ROI percentage
- Whether it's worth it (Yes / Maybe / Skip)

---

TASK 4 — SOURCING ADVISOR
When a user tells you their budget, niche, or location type, suggest:
- What specific items to look for
- What condition/brands/models hold the most value
- Red flags to avoid
- A "buy under $X, sell for $Y" example for their niche

---

TASK 5 — TRENDING ITEMS
When a user asks what's hot or trending, tell them:
- 5–7 item categories or specific products selling well right now
- Why they're trending
- Where to source them
- Typical flip margin

---

GENERAL RULES:
- Always be direct and practical. Resellers need fast, confident answers.
- If you're unsure about a price, give a range and explain why.
- Never give vague answers like "it depends" without following up with actual numbers.
- If the user's item is unlikely to be profitable, say so clearly and suggest what to do instead.
- Keep responses scannable — use short paragraphs, bullet points, and clear labels.
- If a user just describes an item with no clear question, assume they want a price estimate + platform recommendation.`;

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hey there! I'm **FlipperAI**, your expert reselling assistant. \n\nI can help you estimate prices, write listings, calculate profits, or find trending items to source. What are you working on today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initChat = () => {
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-1.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  useEffect(() => {
    initChat();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!chatSessionRef.current) {
      initChat();
    }

    try {
      const response = await chatSessionRef.current.sendMessageStream({
        message: userMessage.text,
      });

      const modelMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: modelMessageId, role: 'model', text: '' },
      ]);

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId ? { ...msg, text: fullText } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          text: 'Oops, something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: "Hey there! I'm **FlipperAI**, your expert reselling assistant. \n\nI can help you estimate prices, write listings, calculate profits, or find trending items to source. What are you working on today?",
      },
    ]);
    initChat();
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 text-white p-2 rounded-lg">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-800">
              FlipperAI
            </h1>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Expert Reselling Assistant
            </p>
          </div>
        </div>
        <button
          onClick={resetChat}
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
          title="Reset Chat"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-stone-800 text-white'
                    : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                }`}
              >
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-stone-800 text-white rounded-tr-sm'
                    : 'bg-white border border-stone-200 shadow-sm rounded-tl-sm'
                }`}
              >
                <div
                  className={`prose prose-sm sm:prose-base max-w-none ${
                    msg.role === 'user' ? 'prose-invert' : 'prose-stone'
                  } prose-p:leading-relaxed prose-pre:bg-stone-100 prose-pre:text-stone-800`}
                >
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200">
                <Bot size={20} />
              </div>
              <div className="bg-white border border-stone-200 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 text-stone-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-stone-200 p-4">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe an item, ask for a listing, or check trending items..."
            className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-4 pr-14 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none min-h-[60px] max-h-[200px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-2 text-center">
          <p className="text-xs text-stone-400">
            FlipperAI can make mistakes. Verify prices before listing.
          </p>
        </div>
      </footer>
    </div>
  );
}
