import { useState, useEffect, useRef } from "react";

const COUNCIL = [
  {
    id: "vc",
    name: "The Investor",
    title: "Ex-YC Partner, 14 exits",
    avatar: "💰",
    color: "#C9A84C",
    accent: "#FFD700",
    prompt: `You are a brutal, experienced startup investor. You've seen 10,000 pitches. You funded Calm and Headspace competitors. You know what kills mental health apps. Evaluate "Khaali" — an anonymous app for broken Indian men to write letters, throw them in a bottle, have strangers catch them, and chat for 7 days before the conversation self-destructs. Also has daily check-ins with AI reflection and monthly pattern reports. Be brutally honest. What's the real market opportunity? What will kill it? What's the moat? Is this fundable? 4-6 sentences. No fluff. Speak like you're in a partner meeting.`
  },
  {
    id: "psych",
    name: "The Psychologist",
    title: "Clinical Psychologist, Men's Mental Health",
    avatar: "🧠",
    color: "#4C8BC9",
    accent: "#6BB8FF",
    prompt: `You are a clinical psychologist specializing in men's mental health in India. You've treated men who've never spoken about their pain before. Evaluate "Khaali" — an anonymous app where broken Indian men write unsent letters, get AI reflection, throw them anonymously, strangers catch and optionally chat for 7 days, then it self-destructs. Daily check-ins. Monthly AI pattern reports. What does this get psychologically right? What is genuinely dangerous? What's missing? 4-6 sentences. Be clinically honest, not politically correct.`
  },
  {
    id: "user",
    name: "The Broken Man",
    title: "Target user. 28. Lost job, divorced, estranged from father.",
    avatar: "🪨",
    color: "#888",
    accent: "#AAAAAA",
    prompt: `You are a 28-year-old Indian man. You lost your job 6 months ago. Your marriage fell apart. Your father hasn't spoken to you in 2 years. You bottle everything. You don't go to therapy — it feels like admitting defeat. Someone shows you "Khaali" — an app where you write what you can't say, get AI to reflect it back, throw it anonymously like a bottle in the sea, and maybe a stranger catches it and you talk for 7 days before it disappears. Would you use this? What would stop you from downloading it? What would make you delete it? Speak as that man. Raw. 4-6 sentences.`
  },
  {
    id: "competitor",
    name: "The Competitor",
    title: "Founder of a rival wellness app",
    avatar: "⚔️",
    color: "#C94C4C",
    accent: "#FF6B6B",
    prompt: `You are a founder of an existing Indian mental wellness app (think YourDOST, Wysa, or similar). Someone just showed you "Khaali" — a men-only anonymous letter-writing + bottle mechanic + ephemeral chat app for broken Indian men. You are threatened. But you're also honest. What does Khaali have that you don't? Where will they fail? What would you copy immediately? What's their actual defensible advantage? 4-6 sentences. Be competitive but honest.`
  },
  {
    id: "product",
    name: "The Product Critic",
    title: "10 years building consumer social apps",
    avatar: "🔧",
    color: "#4CC98B",
    accent: "#6BFFB8",
    prompt: `You are a senior product designer with 10 years building consumer social apps — you worked on anonymous social, mental health, and community products. Evaluate "Khaali" — men-only anonymous app: write unsent letters, AI reflects back, bottle mechanic (throw/catch by strangers), 7-day ephemeral chats, daily check-ins, monthly AI pattern reports, bilingual Hindi/English. What's the one product decision that will make or break this? What feature is a trap that sounds good but will destroy retention? What's genuinely clever here? 4-6 sentences. No praise without critique.`
  }
];

const KHAALI_CONTEXT = `
App: Khaali (meaning "empty" in Hindi)
Target: Indian men exclusively. Men who are broken — by love, family, job loss, failure.
Core insight: Men bottle everything. They have no communities, no permission to be vulnerable.

Features:
1. Write unsent letters (to ex, parents, self, anyone) — AI reflects it back before sealing
2. Bottle mechanic: throw letter anonymously into a pool. Strangers can catch or release it.
3. If caught: 7-day ephemeral anonymous chat. Then it self-destructs completely.
4. Daily check-in: one question per day ("What are you carrying today?") — private streak
5. Monthly AI pattern report: surfaces their own words back, shows what they carried most
6. Crisis filter: letters flagged as suicidal never enter the pool — routed to helplines
7. Bilingual: English default, Hindi optional
8. Zero identity: no name, no photo, device UUID only
9. Nothing stored after chat expiry. Marketed as a trust feature.

Founder: Young Indian engineer, built this because he needed it. Broken by love, family, friends.
`;

export default function KhaaliCouncil() {
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [started, setStarted] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const abortRefs = useRef({});

  const askMember = async (member) => {
    setLoading(prev => ({ ...prev, [member.id]: true }));
    setResponses(prev => ({ ...prev, [member.id]: "" }));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Here is the full context of what you are evaluating:\n\n${KHAALI_CONTEXT}`,
          messages: [{ role: "user", content: member.prompt }]
        })
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "No response.";
      setResponses(prev => ({ ...prev, [member.id]: text }));
    } catch (err) {
      setResponses(prev => ({ ...prev, [member.id]: "Failed to reach the council." }));
    } finally {
      setLoading(prev => ({ ...prev, [member.id]: false }));
    }
  };

  const conveneCouncil = async () => {
    setStarted(true);
    setAllDone(false);
    setResponses({});
    
    for (const member of COUNCIL) {
      await askMember(member);
    }
    setAllDone(true);
  };

  const doneCount = Object.keys(responses).filter(k => !loading[k] && responses[k]).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0B",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#E8E0D0",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Grain texture overlay */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        pointerEvents: "none", zIndex: 0
      }} />

      {/* Water ripple bg */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "35vh",
        background: "linear-gradient(to top, rgba(20,40,80,0.15), transparent)",
        pointerEvents: "none"
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            fontSize: 11, letterSpacing: 6, color: "#666",
            textTransform: "uppercase", marginBottom: 16, fontFamily: "monospace"
          }}>
            Khaali — Council Session
          </div>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 400, margin: 0,
            lineHeight: 1.1,
            color: "#F5EFE0",
            letterSpacing: "-0.02em"
          }}>
            What does the council say?
          </h1>
          <p style={{
            marginTop: 16, color: "#666",
            fontSize: 15, fontStyle: "italic", fontFamily: "monospace"
          }}>
            5 voices. No flattery. Real verdict.
          </p>

          {!started ? (
            <button
              onClick={conveneCouncil}
              style={{
                marginTop: 36,
                background: "transparent",
                border: "1px solid #C9A84C",
                color: "#C9A84C",
                padding: "14px 40px",
                fontSize: 13,
                letterSpacing: 4,
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "monospace",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                e.target.style.background = "#C9A84C20";
                e.target.style.boxShadow = "0 0 20px #C9A84C30";
              }}
              onMouseLeave={e => {
                e.target.style.background = "transparent";
                e.target.style.boxShadow = "none";
              }}
            >
              Convene the Council
            </button>
          ) : (
            <div style={{ marginTop: 32 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                color: "#666", fontSize: 13, fontFamily: "monospace"
              }}>
                {allDone ? (
                  <span style={{ color: "#4CC98B" }}>✓ Council has spoken — {doneCount} of {COUNCIL.length}</span>
                ) : (
                  <>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#C9A84C",
                      display: "inline-block",
                      animation: "pulse 1.5s ease-in-out infinite"
                    }} />
                    Gathering verdicts — {doneCount} of {COUNCIL.length}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Council Cards */}
        {started && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {COUNCIL.map((member, idx) => {
              const isLoading = loading[member.id];
              const response = responses[member.id];
              const isExpanded = activeCard === member.id;
              const isDone = response && !isLoading;

              return (
                <div
                  key={member.id}
                  style={{
                    border: `1px solid ${isExpanded ? member.color + "60" : "#1E1E22"}`,
                    background: isExpanded ? "#0E0E12" : "#0C0C0F",
                    transition: "all 0.3s ease",
                    cursor: isDone ? "pointer" : "default",
                    transform: isExpanded ? "scale(1.005)" : "scale(1)",
                    boxShadow: isExpanded ? `0 0 40px ${member.color}15` : "none",
                  }}
                  onClick={() => isDone && setActiveCard(isExpanded ? null : member.id)}
                >
                  {/* Card Header */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    padding: "20px 24px", gap: 16
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: `${member.color}15`,
                      border: `1px solid ${member.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, flexShrink: 0
                    }}>
                      {isLoading ? (
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${member.color}40`,
                          borderTopColor: member.color,
                          display: "inline-block",
                          animation: "spin 0.8s linear infinite"
                        }} />
                      ) : member.avatar}
                    </div>

                    {/* Name + title */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 600,
                        color: isDone ? member.accent : "#555",
                        fontFamily: "'Georgia', serif",
                        transition: "color 0.3s"
                      }}>
                        {member.name}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#444",
                        fontFamily: "monospace", marginTop: 2, letterSpacing: 0.5
                      }}>
                        {member.title}
                      </div>
                    </div>

                    {/* Status / expand */}
                    <div style={{ flexShrink: 0 }}>
                      {isLoading && (
                        <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>
                          deliberating...
                        </span>
                      )}
                      {isDone && (
                        <span style={{
                          fontSize: 11, color: member.color,
                          fontFamily: "monospace", letterSpacing: 1
                        }}>
                          {isExpanded ? "▲ close" : "▼ read"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview line when collapsed */}
                  {isDone && !isExpanded && (
                    <div style={{
                      padding: "0 24px 16px 84px",
                      fontSize: 13, color: "#444",
                      fontStyle: "italic", fontFamily: "monospace",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                    }}>
                      "{response.slice(0, 120)}..."
                    </div>
                  )}

                  {/* Full response */}
                  {isDone && isExpanded && (
                    <div style={{
                      padding: "8px 24px 28px 84px",
                      borderTop: `1px solid ${member.color}20`
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: "#C8C0B4",
                        fontFamily: "'Georgia', serif",
                        whiteSpace: "pre-wrap"
                      }}>
                        {response}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Final summary prompt */}
        {allDone && (
          <div style={{
            marginTop: 48,
            borderTop: "1px solid #1E1E22",
            paddingTop: 32,
            textAlign: "center"
          }}>
            <div style={{
              fontSize: 11, letterSpacing: 4, color: "#444",
              fontFamily: "monospace", textTransform: "uppercase", marginBottom: 12
            }}>
              The council has spoken
            </div>
            <p style={{
              color: "#555", fontSize: 13, fontStyle: "italic",
              fontFamily: "'Georgia', serif", maxWidth: 480, margin: "0 auto"
            }}>
              Now you decide. Build it anyway.
            </p>
            <button
              onClick={conveneCouncil}
              style={{
                marginTop: 24,
                background: "transparent",
                border: "1px solid #333",
                color: "#555",
                padding: "10px 28px",
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
              onMouseEnter={e => e.target.style.borderColor = "#666"}
              onMouseLeave={e => e.target.style.borderColor = "#333"}
            >
              Reconvene
            </button>
          </div>
        )}

        {/* Bottom label */}
        <div style={{
          marginTop: 64, textAlign: "center",
          fontSize: 11, color: "#2A2A2E",
          fontFamily: "monospace", letterSpacing: 3
        }}>
          KHAALI — कुछ चीज़ें कही नहीं जा सकतीं
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0B; }
        ::-webkit-scrollbar-thumb { background: #2A2A2E; }
      `}</style>
    </div>
  );
}
