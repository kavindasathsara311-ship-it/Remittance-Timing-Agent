import { useEffect, useRef, useState } from 'react';
import ChatBubble from './ChatBubble';
import ScenarioPicker from './ScenarioPicker';
import Icon from './Icon';
import { getConversation } from '../services/api';
import { getCoachResponse } from '../services/aiCoach';
import { t } from '../i18n/strings';

/* =============================================================================
 * CoachChatPanel — the chat-style coach. The agent messages the family
 * proactively (no user input needed for MVP). Selecting a scenario replays that
 * conversation with a natural "typing" cadence. The composer is now interactive
 * to allow free-form questions powered by Gemini.
 * ===========================================================================*/

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function CoachChatPanel({ className = '' }) {
  const [scenario, setScenario] = useState('good_time');
  const [nonce, setNonce] = useState(0); // bump to replay the same scenario
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  /* Play (or replay) a conversation whenever the scenario changes. */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Reset to greeting + a divider naming the scenario about to play.
      setMessages([
        { id: 'intro', message: t.coach.introBubble, tone: 'info', showAvatar: true, role: 'model' },
        { id: `divider-${scenario}`, type: 'divider', label: t.scenarios[scenario].title },
      ]);
      setTyping(true);
      await sleep(450);
      if (cancelled) return;

      let convo = [];
      try {
        convo = await getConversation(scenario);
      } catch {
        convo = [{ id: 'err', message: t.common.somethingWrong, tone: 'info' }];
      }
      if (cancelled) return;

      for (let i = 0; i < convo.length; i++) {
        setTyping(true);
        await sleep(650 + Math.random() * 350);
        if (cancelled) return;
        setTyping(false);
        setMessages((prev) => [...prev, { ...convo[i], showAvatar: false, role: 'model' }]);
        await sleep(160);
        if (cancelled) return;
      }
      setTyping(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [scenario, nonce]);

  /* Keep the newest message in view. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const handleSelect = (key) => {
    if (key === scenario) setNonce((n) => n + 1); // replay same scenario
    else setScenario(key);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    
    // Add user message
    const userMessageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMessageId, message: text, role: 'user', tone: 'info', showAvatar: false }]);
    
    setTyping(true);
    
    // Call Gemini API
    const responseText = await getCoachResponse(text, messages);
    
    setTyping(false);
    
    // Add coach message
    setMessages(prev => [...prev, { id: `coach-${Date.now()}`, message: responseText, role: 'model', tone: 'info', showAvatar: false }]);
  };

  return (
    <div className={`card flex h-full flex-col overflow-hidden ${className}`}>
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-outline-variant/40 px-4 py-3 md:px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
          <Icon name="smart_toy" className="text-[22px]" />
        </span>
        <div className="min-w-0">
          <h2 className="font-headline-md text-[18px] leading-tight text-on-surface">
            {t.coach.panelHeading}
          </h2>
          <p className="truncate font-label-sm text-label-sm font-normal text-on-surface-variant">
            {t.coach.subtitle}
          </p>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full bg-good-container px-2.5 py-1 font-label-sm text-label-sm text-on-good-container sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          online
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="chat-container flex-1 overflow-y-auto px-4 py-4 md:px-5"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {messages.map((m) =>
            m.type === 'divider' ? (
              <div key={m.id} className="my-1 flex items-center justify-center gap-3">
                <span className="h-px flex-1 bg-outline-variant/40" />
                <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-label-sm text-on-surface-variant">
                  {m.label}
                </span>
                <span className="h-px flex-1 bg-outline-variant/40" />
              </div>
            ) : (
              <ChatBubble
                key={m.id}
                message={m.message}
                tone={m.tone}
                showAvatar={m.showAvatar}
                time={m.showAvatar ? t.common.justNow : undefined}
                isUser={m.role === 'user'}
              />
            )
          )}

          {typing && <TypingBubble />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer area */}
      <div className="border-t border-outline-variant/40 bg-surface-container-lowest/60 px-4 py-3 md:px-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <ScenarioPicker active={scenario} onSelect={handleSelect} />

          <form onSubmit={handleSend} className="flex items-center gap-2 rounded-xl border-2 border-outline-variant/40 bg-surface-container-lowest p-1.5 transition-colors focus-within:border-secondary/50">
            <span className="p-2 text-outline">
              <Icon name="add_circle" className="text-[22px]" />
            </span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask your coach anything..."
              className="w-full bg-transparent px-1 font-body-md text-on-surface outline-none placeholder:text-outline"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || typing}
              aria-label={t.coach.send}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-on-secondary ${
                !inputText.trim() || typing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-secondary/90 hover:shadow-md'
              } transition-all`}
            >
              <Icon name="send" filled className="text-[20px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex max-w-[88%] items-start gap-3 md:max-w-2xl">
      <div className="h-10 w-10 flex-shrink-0 rounded-full opacity-0" aria-hidden="true" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 shadow-soft">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
        <span className="sr-only">{t.coach.typing}</span>
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant/60"
      style={{ animationDelay: delay }}
    />
  );
}

