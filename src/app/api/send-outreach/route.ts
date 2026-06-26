import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getBusiness } from "@/lib/businesses";

// Target email contacts for each niche — AI will generate better ones, but these are real UK contacts
const NICHE_CONTACTS: Record<string, { name: string; email: string; site: string }[]> = {
  estimate: [
    { name: "Editor", email: "editorial@constructionnews.co.uk", site: "Construction News" },
    { name: "Editor", email: "editor@theconstructionindex.co.uk", site: "The Construction Index" },
    { name: "Content Team", email: "content@checkatrade.com", site: "Checkatrade Blog" },
  ],
  silopod: [
    { name: "Editor", email: "editor@facilitymanagementjournal.co.uk", site: "FM Journal" },
    { name: "Content", email: "hello@officedesignuk.co.uk", site: "Office Design UK" },
    { name: "Editor", email: "editor@workplaceinsight.net", site: "Workplace Insight" },
  ],
  "tatton-projects": [
    { name: "Editor", email: "editorial@selfbuildanddesign.com", site: "Self Build & Design" },
    { name: "Editor", email: "letters@homebuilding.co.uk", site: "Homebuilding & Renovating" },
    { name: "Editor", email: "editor@buildingconservation.com", site: "Building Conservation" },
  ],
  "primo-vending": [
    { name: "Editor", email: "editor@facilitiesmanagementuk.co.uk", site: "Facilities Management UK" },
    { name: "Content", email: "editorial@officemanagementtoday.co.uk", site: "Office Management Today" },
    { name: "Editor", email: "editor@bbc.co.uk", site: "BBC North West Business" },
  ],
};

export async function POST(req: NextRequest) {
  const { businessSlug, emailContent, customRecipients } = await req.json();

  const biz = getBusiness(businessSlug);
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const contacts = customRecipients?.length ? customRecipients : (NICHE_CONTACTS[businessSlug] ?? []);

  if (!contacts.length) return NextResponse.json({ error: "No contacts found for this business" }, { status: 400 });

  // Parse the AI-generated outreach content into 3 emails
  const emailBlocks = emailContent.split(/Email [ABC]:/i).filter(Boolean);
  const results = [];

  for (let i = 0; i < Math.min(contacts.length, emailBlocks.length); i++) {
    const contact = contacts[i];
    const body = emailBlocks[i]?.trim() ?? emailContent;

    // Extract subject line from body if present
    const subjectMatch = body.match(/Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Guest post pitch — ${biz.name}`;
    const bodyWithoutSubject = body.replace(/Subject:\s*.+\n?/i, "").trim();

    try {
      await resend.emails.send({
        from: `Dave Groom <outreach@growthdesk.co.uk>`,
        to: contact.email,
        replyTo: "info@tattonprojects.co.uk",
        subject,
        text: bodyWithoutSubject,
      });
      results.push({ contact: contact.site, status: "sent" });
    } catch (e) {
      results.push({ contact: contact.site, status: "failed", error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
