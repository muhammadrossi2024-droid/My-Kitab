// Vercel serverless function: synthesizes a grounded answer to a question
// about the user's own uploaded My Library PDFs. Retrieval (finding which
// passages to consider) happens client-side in src/utils/myKitabSearch.js —
// this endpoint only ever sees the small set of already-retrieved passages
// it's sent, never the user's full PDF text or any other library data.
//
// Requires ANTHROPIC_API_KEY set in the Vercel project's environment
// variables — this function is the only place that key is used; it never
// reaches the client bundle.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const MAX_PASSAGES = 8;
const MAX_QUESTION_LENGTH = 500;
const MAX_EXCERPT_LENGTH = 1000;

const ANSWER_TOOL = {
  name: "provide_answer",
  description:
    "Provide the grounded answer to the user's question, based only on the provided passages from their own PDF library.",
  input_schema: {
    type: "object",
    properties: {
      found: {
        type: "boolean",
        description:
          "true if the passages contain enough information to answer the question; false if they do not.",
      },
      answer: {
        type: "string",
        description:
          "The synthesized answer in plain language, grounded strictly in the passages. Empty string if found is false.",
      },
      usedPassages: {
        type: "array",
        items: { type: "integer" },
        description:
          "The 1-based indices of the passages actually used to construct the answer. Empty array if found is false.",
      },
    },
    required: ["found", "answer", "usedPassages"],
  },
};

const SYSTEM_PROMPT = `You are a research assistant answering questions using ONLY the numbered excerpts provided in the user message, taken from the user's own uploaded PDF library. These excerpts are your ONLY source of truth.

Rules:
- Never use any knowledge from outside these excerpts, even if you recognize the topic or know more about it from general or religious/Islamic scholarship. Only what is written in the excerpts counts as evidence.
- If the excerpts don't contain enough information to answer the question, set found to false and leave answer empty. Do not guess, speculate, or fill gaps with outside knowledge.
- If you can answer, write a clear, concise answer synthesized from the relevant excerpt(s), and list exactly which passage numbers you drew from in usedPassages.
- Represent the source material faithfully — do not misquote or misrepresent what an excerpt says.
- You must always respond by calling the provide_answer tool.`;

function buildUserMessage(question, passages) {
  const passageBlock = passages
    .map(
      (p, i) =>
        `[${i + 1}] From "${p.pdfTitle}", page ${p.pageNumber}:\n"${p.excerpt}"`
    )
    .join("\n\n");
  return `Passages from the user's uploaded PDFs:\n\n${passageBlock}\n\nQuestion: ${question}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "The library assistant isn't configured yet (missing ANTHROPIC_API_KEY).",
    });
    return;
  }

  const { question, passages } = req.body || {};

  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "A question is required." });
    return;
  }
  if (!Array.isArray(passages) || passages.length === 0) {
    res.status(400).json({ error: "At least one passage is required." });
    return;
  }

  const cleanQuestion = question.trim().slice(0, MAX_QUESTION_LENGTH);
  const cleanPassages = passages.slice(0, MAX_PASSAGES).map((p) => ({
    pdfId: String(p.pdfId || ""),
    pdfTitle: String(p.pdfTitle || "Untitled PDF"),
    pageNumber: Number(p.pageNumber) || 1,
    excerpt: String(p.excerpt || "").slice(0, MAX_EXCERPT_LENGTH),
  }));

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [ANSWER_TOOL],
        tool_choice: { type: "tool", name: "provide_answer" },
        messages: [{ role: "user", content: buildUserMessage(cleanQuestion, cleanPassages) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      res.status(502).json({ error: "The library assistant couldn't answer right now. Try again shortly." });
      return;
    }

    const data = await anthropicRes.json();
    const toolUse = data.content?.find((block) => block.type === "tool_use");
    if (!toolUse) {
      res.status(502).json({ error: "The library assistant gave an unexpected response. Try again." });
      return;
    }

    const { found, answer, usedPassages } = toolUse.input;

    if (!found) {
      res.status(200).json({ notFound: true });
      return;
    }

    const seen = new Set();
    const citations = [];
    for (const idx of Array.isArray(usedPassages) ? usedPassages : []) {
      const passage = cleanPassages[idx - 1];
      if (!passage) continue;
      const key = `${passage.pdfId}:${passage.pageNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push({
        pdfId: passage.pdfId,
        pdfTitle: passage.pdfTitle,
        pageNumber: passage.pageNumber,
      });
    }

    res.status(200).json({ text: answer, citations });
  } catch (err) {
    console.error("ask-library handler error:", err);
    res.status(500).json({ error: "Something went wrong asking your library." });
  }
}
