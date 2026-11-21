import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';

const copilotSuggestions = {
  Ask: ['Which fees need attention?', 'Summarize attendance today', 'How is my tuition center doing?'],
  Insights: ['What is changing in enrollment?', 'Give me a fee collection summary', 'Which batch has the best attendance?'],
  Actions: ['Draft a friendly fee reminder', 'Suggest a plan to improve attendance', 'What should I focus on this week?'],
  Generate: ['Create a short parent update', 'Write a student welcome message', 'Draft a monthly progress note'],
};

const DashboardCopilot = memo(forwardRef(({ user, onAsk }, ref) => {
  const [copilotMode, setCopilotMode] = useState('Ask');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const askingRef = useRef(false);

  const submit = useCallback(async (rawQuestion) => {
    const cleanQuestion = rawQuestion.trim();
    if (!cleanQuestion || askingRef.current) return;
    askingRef.current = true;
    setQuestion(cleanQuestion);
    setAsking(true);
    setAnswer('');
    try {
      setAnswer(await onAsk(cleanQuestion));
    } catch (error) {
      setAnswer(error.response?.data?.message || 'Copilot is unavailable. Please try again.');
    } finally {
      askingRef.current = false;
      setAsking(false);
    }
  }, [onAsk]);

  useImperativeHandle(ref, () => ({
    openMode: (mode) => {
      setCopilotMode(mode);
      setAnswer('');
    },
    ask: (prompt, mode = 'Ask') => {
      setCopilotMode(mode);
      void submit(prompt);
    },
  }), [submit]);

  return <section className="copilot-card">
    <div className="copilot-heading"><span className="copilot-mark">✳</span><div><h3>Tuition Copilot</h3><span>AI ASSISTANT</span></div><span className="online-dot" title="Ready" /></div>
    <div className="copilot-tabs">{Object.keys(copilotSuggestions).map((mode) => <button key={mode} type="button" className={copilotMode === mode ? 'selected' : ''} onClick={() => { setCopilotMode(mode); setAnswer(''); }}>{mode}</button>)}</div>
    <p className="copilot-greeting">Hi {user?.name?.split(' ')[0] || 'there'}! I can help you understand your tuition data and plan your next steps.</p>
    <div className={`copilot-answer${answer || asking ? '' : ' is-empty'}`} aria-live="polite">{asking && !answer ? 'Thinking…' : answer || 'Copilot replies will appear here.'}</div>
    <div className="copilot-prompts">{copilotSuggestions[copilotMode].map((prompt) => <button type="button" key={prompt} onClick={() => { setQuestion(prompt); void submit(prompt); }}>{prompt}<span>›</span></button>)}</div>
    <form className="copilot-input" onSubmit={(event) => { event.preventDefault(); void submit(question); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your tuition center…" aria-label="Ask Tuition Copilot" maxLength={600} /><button type="submit" disabled={asking || !question.trim()} aria-label="Send question">➤</button></form>
    <p className="copilot-privacy">Uses your aggregated figures only</p>
  </section>;
}));

export default DashboardCopilot;
