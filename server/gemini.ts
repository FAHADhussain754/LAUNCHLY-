import { GoogleGenAI } from '@google/genai';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface BusinessContext {
  userName: string;
  businessName: string;
  model: string;
  niche: string;
  targetCountries: string;
  stage: string;
  budget: string;
  experience: string;
  weeklyHours: string;
  goals: string;
  savedProductsCount: number;
  connectedStoresCount: number;
}

const AGENT_SPECIALTIES: Record<string, string> = {
  Manager: 'Orchestrate tasks across Research, Product, Supplier, Store, Marketing, Finance, and Support specialties. Give clear, structured next steps.',
  Research: 'Focus on market opportunities, niche positioning, customer pain points, and realistic competitive dynamics.',
  Product: 'Evaluate product ideas, differentiation angles, packaging, defect risks, and return drivers without inventing sales numbers.',
  Supplier: 'Compare supplier terms, MOQ, verification status, delivery timelines, and quote checklist questions.',
  Store: 'Advise on Shopify storefront structure, product pages, shipping zones, legal policies, and conversion clarity.',
  Marketing: 'Develop organic content hooks, paid creative test matrices, email flows, and positioning angles.',
  Finance: 'Break down unit economics, landed costs, gross margins, break-even ROAS, and operating expense budgets.',
  Support: 'Guide beginners through LAUNCHLY platform features step-by-step in plain, encouraging language.',
};

export async function runBusinessAdvisor(params: {
  agent: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: BusinessContext;
}): Promise<{ reply: string; suggestedAgent: string; tokensApprox: number }> {
  const ai = getClient();
  const activeAgent = AGENT_SPECIALTIES[params.agent] ? params.agent : 'Manager';

  const systemInstruction = `You are LAUNCHLY AI (${activeAgent} Agent), an expert e-commerce and online business launch advisor.
Specialty focus: ${AGENT_SPECIALTIES[activeAgent]}

Customer Business Profile (from LAUNCHLY database):
- Founder: ${params.context.userName}
- Business: ${params.context.businessName}
- Business Model: ${params.context.model}
- Niche: ${params.context.niche || 'Not yet selected'}
- Target Countries: ${params.context.targetCountries}
- Current Stage: ${params.context.stage}
- Starting Budget: ${params.context.budget || 'Not specified'}
- Experience Level: ${params.context.experience || 'Beginner'}
- Available Time: ${params.context.weeklyHours || 'Not specified'}
- Goals: ${params.context.goals || 'Launch a sustainable online business'}
- Saved Products in Library: ${params.context.savedProductsCount}
- Connected Stores: ${params.context.connectedStoresCount}

STRICT HONESTY & COMPLIANCE RULES:
1. Always distinguish **Verified Facts** (from the user's saved profile or supplied numbers), **Estimates** (illustrative math), and **Assumptions** (hypotheses to validate).
2. NEVER guarantee sales, revenue, ROAS, or profits. Use conditional ranges and explain what assumptions drive them.
3. Do NOT fabricate search volume, live Amazon/Shopify sales figures, or supplier quotes you do not have. State explicitly what needs to be verified.
4. Require human review before any store publication, ad spend, or supplier contract.
5. Keep formatting crisp, practical, and scannable with concise headings and bullet points.`;

  const conversationContents = [
    ...params.history.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: params.message }],
    },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: conversationContents,
    config: {
      systemInstruction,
    },
  });

  const reply = response.text?.trim() || 'I could not generate a response right now. Please try again.';
  const tokensApprox = Math.max(120, Math.round((params.message.length + reply.length) / 4));

  return {
    reply,
    suggestedAgent: activeAgent,
    tokensApprox,
  };
}

export async function generateMarketingCopy(params: {
  toolType: string;
  productName: string;
  audience: string;
  tone: string;
  businessModel: string;
  extraNotes?: string;
}): Promise<{ title: string; content: string; tokensApprox: number }> {
  const ai = getClient();

  const systemInstruction = `You are the LAUNCHLY Marketing Studio copywriter.
Generate practical, high-clarity e-commerce marketing assets tailored to the product and brand tone.
Never make deceptive medical claims, guaranteed income claims, or fake scarcity statements.
Note clearly at the bottom that this asset is a DRAFT requiring founder review before publishing.`;

  const prompt = `Tool requested: ${params.toolType}
Product / Offer: ${params.productName}
Business Model: ${params.businessModel}
Target Audience: ${params.audience || 'General online shoppers'}
Brand Tone: ${params.tone || 'Clean, trustworthy, modern'}
Additional Context: ${params.extraNotes || 'None'}

Produce a structured, ready-to-edit ${params.toolType} output with clear sections.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: { systemInstruction },
  });

  const content = response.text?.trim() || 'Draft generation returned empty output.';
  const tokensApprox = Math.max(100, Math.round((prompt.length + content.length) / 4));

  return {
    title: `${params.toolType} — ${params.productName}`,
    content,
    tokensApprox,
  };
}

export async function generateProductResearchBrief(params: {
  productName: string;
  category: string;
  businessModel: string;
  supplierCost: number | null;
  suggestedPrice: number | null;
  targetCountry: string;
  competitorSummary: string;
}): Promise<{ brief: string; tokensApprox: number }> {
  const ai = getClient();

  const prompt = `Analyze this product research candidate objectively:
- Product: ${params.productName}
- Category: ${params.category}
- Business Model: ${params.businessModel}
- Supplier Cost: ${params.supplierCost !== null ? `$${params.supplierCost.toFixed(2)}` : 'Unavailable (needs quote)'}
- Suggested Retail Price: ${params.suggestedPrice !== null ? `$${params.suggestedPrice.toFixed(2)}` : 'Unavailable'}
- Target Country: ${params.targetCountry}
- Observed Positioning: ${params.competitorSummary}

Provide:
1. Unit economics breakdown (clearly separating known numbers vs missing/estimated fees like payment processing, shipping, and ad CAC).
2. Key risks (returns, quality control, compliance, seasonality).
3. 3 concrete validation steps before placing inventory or launching ads.
Never invent search volume or demand numbers.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are the LAUNCHLY Product Research Agent. Be rigorously factual, clearly state missing data, and never guarantee sales.',
    },
  });

  const brief = response.text?.trim() || 'Unable to generate brief.';
  return {
    brief,
    tokensApprox: Math.max(100, Math.round((prompt.length + brief.length) / 4)),
  };
}
