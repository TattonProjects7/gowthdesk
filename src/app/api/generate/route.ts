import { NextRequest, NextResponse } from "next/server";
import { getBusiness } from "@/lib/businesses";

const PROMPTS: Record<string, (b: ReturnType<typeof getBusiness>, extra: string) => string> = {
  keywords: (b, _) => `
You are an expert UK SEO strategist. Research and list 20 SEO keywords that the business "${b!.name}" (${b!.url}) should target to climb Google rankings.

Business details:
- Description: ${b!.description}
- Niche: ${b!.niche}
- Target audience: ${b!.audience}
- Location: ${b!.location}
- Main competitors: ${b!.competitors.join(", ")}

For each keyword provide:
1. The keyword phrase
2. Search intent (informational / commercial / transactional / local)
3. Estimated monthly UK searches (low/medium/high)
4. Difficulty (easy/medium/hard)
5. Why it suits this business

Format as a clean numbered list. Include a mix of: short-tail, long-tail, local, and question-based keywords. Focus on UK searches.`,

  blog: (b, extra) => `
You are an expert SEO content writer. Write a full, publish-ready SEO blog post for the website ${b!.url} (${b!.name}).

Business: ${b!.description}
Target audience: ${b!.audience}
Location: ${b!.location}
${extra ? `Additional instruction: ${extra}` : "Choose the best keyword topic yourself based on search demand."}

Requirements:
- 1,200–1,500 words
- H1 title (include target keyword)
- H2 and H3 subheadings throughout
- Natural keyword usage — not stuffed
- Written for UK readers (British spelling)
- Helpful, expert tone — not salesy
- End with a clear call to action
- Include an SEO meta title (under 60 chars) and meta description (under 155 chars) at the top

Write the full post now.`,

  guest: (b, extra) => `
You are an expert content marketer. Write a guest post article that can be pitched to and published on OTHER websites to build backlinks to ${b!.url} (${b!.name}).

Business: ${b!.description}
Niche: ${b!.niche}
${extra ? `Topic focus: ${extra}` : "Choose a topic that will interest editors in related industries."}

Requirements:
- 900–1,100 words
- Must provide genuine value to readers on a THIRD-PARTY website (not just promote ${b!.name})
- Naturally mention and link to ${b!.url} once or twice where relevant
- H1 title, clear H2 subheadings
- British English, professional tone
- Written as if by an industry expert, not an advert
- At the top: suggest 5 types of websites that would publish this (e.g. industry blogs, trade magazines, etc.)

Write the full article now.`,

  sites: (b, _) => `
You are a link-building expert. Find 15 real, specific websites and blogs where "${b!.name}" (${b!.url}) could submit a guest post or get a backlink.

Business: ${b!.description}
Niche: ${b!.niche}
Target audience: ${b!.audience}
Location: ${b!.location}

For each site provide:
1. Website name and URL
2. Why they would accept a guest post from this niche
3. What topic angle would work best
4. How to contact them (look for "write for us", "guest post", or contact page)
5. Domain authority estimate (high/medium)

Focus on real UK industry publications, trade magazines, business blogs, local directories, and relevant niche sites. Include a mix of free listings, guest post opportunities, and press/media outlets.`,

  outreach: (b, extra) => `
You are an expert outreach specialist. Write 3 different cold outreach emails to pitch a guest post from "${b!.name}" to a website editor or blog owner.

Business: ${b!.name} — ${b!.tagline}
Website: ${b!.url}
${extra ? `Target site type: ${extra}` : `Target: editors of UK trade blogs, industry magazines, or business sites in the ${b!.niche} space`}

Each email should:
- Be short (150–200 words max)
- Have a punchy subject line
- Feel personal, not template-y
- Pitch 2–3 specific article ideas relevant to their audience
- Not oversell — just start a conversation
- End with a clear, low-friction CTA

Label them Email A, Email B, Email C with slightly different tones (friendly, professional, direct).`,

  metatags: (b, _) => `
You are an SEO specialist. Write optimised meta titles and meta descriptions for the 6 most important pages on ${b!.url} (${b!.name}).

Business: ${b!.description}
Audience: ${b!.audience}
Location: ${b!.location}

Pages to cover:
1. Homepage
2. Products/Services page
3. About page
4. Pricing page (if applicable)
5. Blog/Resources page
6. Contact page

For each page provide:
- Page name
- Meta title (max 60 characters — include primary keyword)
- Meta description (max 155 characters — include keyword + CTA)
- Primary keyword being targeted

British spelling. Optimised for UK Google searches. Make each one compelling enough to improve click-through rate.`,

  schema: (b, _) => `
You are a technical SEO expert. Write JSON-LD structured data (schema markup) for ${b!.url} (${b!.name}) to help Google display rich results.

Business: ${b!.description}
Location: ${b!.location}

Generate the following schema types as valid JSON-LD:
1. Organization schema (name, url, logo, contact, social profiles)
2. LocalBusiness schema (if applicable — address, phone, opening hours)
3. WebSite schema with SearchAction
4. One example FAQPage schema with 5 real FAQs a customer might search

Format as clean, copy-pasteable JSON-LD blocks with a <script type="application/ld+json"> wrapper for each. Add a note on which page each block should go on.`,

  directories: (b, _) => `
You are a UK SEO and link-building expert. List 30 specific UK online directories, citation sites and listing platforms where "${b!.name}" (${b!.url}) should submit their business RIGHT NOW to build backlinks and climb Google.

Business: ${b!.description}
Niche: ${b!.niche}
Location: ${b!.location}

For each directory provide:
1. Directory name
2. Exact URL to submit (the submission/add listing page, not just the homepage)
3. Cost (Free / Paid / Freemium)
4. Why it matters for SEO (domain authority, niche relevance, local signal)
5. What category/section to list under

Include a mix of:
- Universal UK directories (Yell, Yelp UK, Thomson Local, FreeIndex, etc.)
- Industry-specific directories for this niche
- Local/regional directories for ${b!.location}
- Google Business Profile (always first)
- Review platforms (Trustpilot, Google Reviews, etc.)
- Social profiles that count as citations (LinkedIn Company Page, Facebook Business, etc.)

Mark the top 10 as PRIORITY — do these first for fastest ranking impact.
Be specific — give real working URLs not placeholders.`,

  actionplan: (b, _) => `
You are a UK SEO consultant. Create a detailed 90-day action plan to help "${b!.name}" (${b!.url}) climb Google search rankings.

Business: ${b!.description}
Niche: ${b!.niche}
Location: ${b!.location}
Target audience: ${b!.audience}
Competitors: ${b!.competitors.join(", ")}

Structure it as:

## WEEK 1-2: FOUNDATIONS (Quick wins, takes 2-3 hours total)
- Exact tasks to do immediately
- Technical fixes
- Free directory submissions

## WEEK 3-4: CONTENT LAUNCH
- First blog posts to write (give exact titles)
- Where to publish them
- On-page SEO fixes

## MONTH 2: LINK BUILDING
- Guest post strategy
- Outreach targets
- Social signals

## MONTH 3: SCALE & TRACK
- Content calendar
- How to measure progress (which tools, which metrics)
- Next 90-day priorities

For each task: say exactly what to do, how long it takes, and what Google ranking impact to expect (low/medium/high).

Be specific to this business — mention their actual URL, niche and location throughout. No generic advice.`,

  googlebusiness: (b, _) => `
You are a local SEO expert. Write all the content needed to fully optimise a Google Business Profile for ${b!.name} (${b!.url}).

Business: ${b!.description}
Location: ${b!.location}
Target audience: ${b!.audience}

Write:
1. Business description (750 characters max — keyword-rich, compelling)
2. 5 Google Business posts (each 150–200 words, one for each of: offer, product highlight, FAQ, behind-the-scenes, review request)
3. 10 Q&As to add to the profile (question + detailed answer)
4. List of 10 best business categories to select
5. 15 attribute keywords to add

British spelling. Local SEO focused. Include location keywords naturally.`,
};

export async function POST(req: NextRequest) {
  const { businessSlug, type, extra = "" } = await req.json();

  const biz = getBusiness(businessSlug);
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const promptFn = PROMPTS[type];
  if (!promptFn) return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: promptFn(biz, extra) }],
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.error?.message ?? "OpenAI error" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ content: data.choices[0].message.content });
}
