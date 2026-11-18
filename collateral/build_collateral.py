#!/usr/bin/env python3
"""Builds KPI DRIVER collateral HTML (company profile, two SOWs, AI Suite flyer).
   python3 build_collateral.py && node render.js   -> PDFs in collateral/"""
import math
from pathlib import Path

HERE = Path(__file__).parent
IMG = "../../src/assets/img/"
FONTS = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"
PHONE, EMAIL, WEB = "+1 786-404-9848", "info@kpidriver.com", "www.kpidriver.com"
GEAR = '<div class="gear"><i></i><i></i><i></i><i></i></div>'


def tach(lit=0.8):
    cols = [(237, 32, 36), (234, 140, 28), (252, 175, 23), (69, 182, 73)]
    def col(p):
        x = p * 3; i = min(2, int(x)); f = x - i
        return ",".join(str(round(cols[i][k] + (cols[i + 1][k] - cols[i][k]) * f)) for k in range(3))
    a0, sw, R, out = math.pi * 0.82, math.pi * 1.36, 470, []
    for i in range(97):
        p = i / 96; a = a0 + sw * p; major = i % 8 == 0; r1 = R - (34 if major else 18)
        out.append(f'<line x1="{500 + math.cos(a) * r1:.1f}" y1="{500 + math.sin(a) * r1:.1f}" x2="{500 + math.cos(a) * R:.1f}" y2="{500 + math.sin(a) * R:.1f}" stroke="rgba({col(p)},{(0.95 if major else 0.7) if p <= lit else 0.16})" stroke-width="{3.5 if major else 1.8}"/>')
    an = a0 + sw * lit
    out.append(f'<line x1="{500 + math.cos(an) * 260:.1f}" y1="{500 + math.sin(an) * 260:.1f}" x2="{500 + math.cos(an) * 480:.1f}" y2="{500 + math.sin(an) * 480:.1f}" stroke="#e9eef5" stroke-width="4" stroke-linecap="round"/>')
    for k in (0.78, 0.62):
        out.append(f'<circle cx="500" cy="500" r="{R * k:.0f}" fill="none" stroke="rgba(255,255,255,.07)"/>')
    return f'<svg class="tach" viewBox="0 0 1000 1000">{"".join(out)}</svg>'


def foot(doc, n, paper=False):
    logo = "logo-dark-text.svg" if paper else "logo-light-text.svg"
    return f'<div class="foot"><img src="{IMG}{logo}" alt="KPI DRIVER"><span>{doc}</span><span>{n:02d}</span></div>'


def slide(body, doc, n, cls=""):
    return f'<section class="slide {cls}">{body}{foot(doc, n, "paper" in cls)}</section>'


def _grad(m):
    """Per-letter gauge gradient (print-safe: avoids background-clip artefacts in PDF)."""
    cols = [(237, 32, 36), (234, 140, 28), (252, 175, 23), (69, 182, 73)]
    txt = m.group(1); n = max(1, len([c for c in txt if c != " "]) - 1); out = []; k = 0
    for ch in txt:
        if ch == " ": out.append(" "); continue
        x = k / n * 3; i = min(2, int(x)); f = x - i; k += 1
        out.append(f'<span style="color:rgb({",".join(str(round(cols[i][j] + (cols[i + 1][j] - cols[i][j]) * f)) for j in range(3))})">{ch}</span>')
    return "".join(out)


def page(title, slides, extra_cls=""):
    import re
    slides = [re.sub(r'<span class="grad">([^<]+)</span>', _grad, s) for s in slides]
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{title}</title><link rel="stylesheet" href="{FONTS}"><link rel="stylesheet" href="deck.css"></head><body class="{extra_cls}">{"".join(slides)}</body></html>'


def cover(kicker, title, sub, doc):
    return f'''<section class="slide cover">{tach()}
<img class="logo" src="{IMG}logo-light-text.svg" alt="KPI DRIVER">
<p class="eyebrow">{kicker}</p><h1>{title}</h1>{GEAR}
<p class="lede">{sub}</p>
<div class="contact"><div><b>Phone</b>{PHONE}</div><div><b>Web</b>{WEB}</div><div><b>Email</b>{EMAIL}</div></div>
<div class="foot"><span>Make The Gear Shift!</span><span>{doc}</span><span>01</span></div></section>'''


def thanks(line, doc, n):
    return slide(f'''{tach(0.92)}<p class="eyebrow">Thank you</p><h1 style="font-size:92px">Make the <span class="grad">gear shift.</span></h1>{GEAR}
<p class="lede">{line}</p>
<div class="contact" style="margin-top:14px"><div><b>Phone</b>{PHONE}</div><div><b>Email</b>{EMAIL}</div><div><b>Web</b>{WEB}</div>
<div><b>LinkedIn</b>/company/kpi-driver</div><div><b>YouTube</b>@KPI_DRIVER</div><div><b>Instagram</b>@kpi_driver</div>
<div><b>Facebook</b>/KPI_DRIVER</div><div><b>Linktree</b>linktr.ee/KPI_DRIVER</div><div><b>X · TikTok</b>KPI DRIVER</div></div>''', doc, n)


def cards(items, cols, cls=""):
    return f'<div class="cols c{cols}">' + "".join(f'<div class="card {cls} {c}">{h}</div>' for c, h in items) + "</div>"


TOOLS = [
    ("Capture &amp; Coach", "Every call makes your team better.", [
        ("AI Notes Taker", "Captures every call, logs the details, fills the right fields and updates the CRM record. No manual input."),
        ("AI Sales Coach", "Scores every call for Lead and Acquisition Managers with 30+ dynamic scoring structures and tiered deductions. Daily, weekly and monthly reports."),
        ("AI Training Coach", "Practice 10+ scenarios every day with feedback on communication, objection handling and conversion."),
    ]),
    ("Find &amp; Qualify", "Better data. Faster decisions.", [
        ("AI Underwriting", "Multi-source, with a mode for however much data you have. Reads condition from photos. Add or remove comps and notes, rerun anytime."),
        ("AI Skiptracing", "Phone numbers and emails from an address, an APN, or an address plus owner name. DNC-check existing contacts from one dropdown."),
        ("AI Data Enrichment", "Pulls available property data for the address into your CRM and shows exactly which fields changed."),
    ]),
    ("Know &amp; Grow", "See where the money is, and where it is leaking.", [
        ("AI Dashboard", "KPIs you did not know existed, plus a full accounting section."),
        ("AI Insights", "Talks with your CRM and the whole Suite. Takes actions and runs routines for you."),
        ("AI Projections", "Forecast the months ahead from your real KPIs, accounting and insights."),
    ]),
]
NURTURE = ["No Motivation", "High Asking", "Long Timeline", "No Equity", "Listed", "Not Interested", "Not Ready To Sell", "Trying Traditional Sale", "Property Or Financial Issue Pending"]
TEAM = [("brandy", "Brandy Pollack", "Chief Executive Officer", "30+ years in real estate investing. Keeps KPI DRIVER's strategy tied to client success."),
        ("ahmed", "Ahmed Ramy", "Chief Operations & Technology Officer", "Leads development of the KPI tracking engine, automations and integrations."),
        ("anas", "Anas Abid", "Tech &amp; Support Lead", "Oversees technical support from onboarding to daily operations."),
        ("jan", "Jan Arpilleda", "Lead Account Manager", "Runs onboarding strategy sessions and ongoing optimization with clients."),
        ("mostafa", "Mostafa Kourany", "Accounting &amp; Financial Advisor", "Leads bookkeeping and financial advisory, bringing financial insight into KPI dashboards.")]
STAGES = [("Capture", "Every lead from every channel lands in one pipeline.", ""), ("Acquisitions", "Negotiate, offer and get the property under contract.", ""),
          ("Nurture", "Backup for acquisitions. Revives stalled leads and hands them back to close.", "--acc:var(--amber)"),
          ("Dispositions", "Market the deal to buyers, agents and investors.", ""), ("Transaction Coordination", "Contract to close, with documents signed in the platform.", ""),
          ("Contractors &amp; Vendors", "Repairs, renovations and vendor jobs tracked to the deal.", ""), ("Owned &amp; Rentals", "Tenants, leases, income and maintenance for what you keep.", ""),
          ("KPI Tracking", "Performance across every pipeline in one dashboard.", "--acc:var(--green)")]


def suite_slide(doc, n):
    cols = "".join(f'<div class="card s"><h3 class="g">{g}</h3><p style="margin-bottom:6px">{s}</p>' + "".join(f'<h4 style="margin-top:8px">{t}</h4><p>{d}</p>' for t, d in ts) + "</div>" for g, s, ts in TOOLS)
    return slide(f'<p class="eyebrow">The AI Suite · access included · pay-as-you-go</p><h2>Nitro for your <span class="g">CRM engine.</span></h2><div class="cols c3 grow tight">{cols}</div>', doc, n)


def profile():
    D = "Company Profile"; s = [cover("Company Profile", 'Your real estate business. <span class="grad">In a higher gear.</span>', "The command center for real estate investors and their teams: a CRM for the whole operation, KPI tracking across every pipeline, and the AI Suite included.", D)]
    s.append(slide(f'''<div class="split grow"><div style="display:grid;gap:22px"><p class="eyebrow">Company overview</p><h2>Built by investors, <span class="bl">for investors.</span></h2>{GEAR}</div>
<div style="display:grid;gap:18px"><p>KPI DRIVER is a real estate business operations platform, developed over three years by investors, for investors. It brings every stage of the real estate cycle, from lead generation to post-closing, into one system.</p>
<p>Most CRMs stop at lead management. KPI DRIVER runs the whole operation, with dedicated pipelines for Acquisitions, Dispositions, Transaction Coordination, Contractor and Vendor Management, and Rental Oversight.</p>
<p>KPI tracking across all of it gives owners and managers clarity, control and the confidence to make data-backed moves. The AI Suite adds intelligence where it helps.</p></div></div>''', D, 2, "paper"))
    s.append(slide('''<p class="eyebrow">Mission and vision</p><div class="cols c2 grow" style="align-items:stretch"><div class="card"><span class="tag">Mission</span><h2 style="font-size:44px">Empower real estate professionals with intelligent KPI tracking and automation.</h2><p style="font-size:23px">We give real estate businesses deep insight, streamlined processes and better decisions at every stage of the investment cycle. By bringing data, automation and performance metrics into one platform, we help professionals work efficiently, act with confidence and reach more profitable outcomes with less guesswork.</p></div>
<div class="card s"><span class="tag">Vision</span><h2 style="font-size:44px">Set the standard for how real estate operations run.</h2><p style="font-size:23px">We aim to replace the clutter of disconnected tools with a single, integrated growth engine: streamlined workflows, unified data and long-term success across the entire real estate lifecycle.</p></div></div>''', D, 3))
    why = [("", '<span class="num">01</span><h3>All-in-one CRM</h3><p>Acquisitions, dispositions, transaction coordination, contractor management and rentals in one system. No more disconnected tools.</p>'),
           ("", '<span class="num">02</span><h3>KPI tracking and analytics</h3><p>Real-time dashboards give visibility into every pipeline, so decisions follow data at every stage.</p>'),
           ("", '<span class="num">03</span><h3>Multi-pipeline workflows</h3><p>Purpose-built workflows for each part of the business, so teams run efficiently without overlap or confusion.</p>'),
           ("", '<span class="num">04</span><h3>Built-in productivity tools</h3><p>Document signing, task automations, drip campaigns, and SMS, email and calls keep your team connected and deals moving.</p>'),
           ("s", '<span class="num">05</span><h3>AI Suite included</h3><p>Nine AI tools supplied alongside the CRM. No additional AI Suite subscription. Use them when you need them and pay for what you use.</p>'),
           ("", '<span class="num">06</span><h3>Investor-centric design</h3><p>Every system and feature is built by experienced real estate investors for real-world usability.</p>')]
    s.append(slide(f'<p class="eyebrow">Why KPI DRIVER</p><h2>Six reasons teams make the shift.</h2><div class="grow">{cards(why, 3)}</div>', D, 4, "paper"))
    st = "".join(f'<div class="stage" style="{c}"><b>{a}</b><span>{b}</span></div>' for a, b, c in STAGES)
    s.append(slide(f'<p class="eyebrow">The KPI DRIVER journey</p><h2>From first lead to the property you keep.</h2><p class="lede">Each team works its own pipeline. The deal stays one record, and every stage reports into the same KPIs.</p><div class="cols c4 grow" style="gap:16px;align-content:start">{st}</div>', D, 5))
    inc = ["Dedicated account manager: onboarding, ongoing support and strategy sessions", "CRM migration with data integrity maintained", "Automations: workflows, triggers, alerts and integrations", "Communication and reputation management: two-way messaging, calls, reviews, web chat",
           "Lead generation and marketing tools: email and SMS campaigns, funnels, outreach", "Nurture campaigns: long- and short-term drips", "Operations tools: scheduling, tasks, document signatures", "Built-in pipelines and the KPI dashboard", "Mobile app for iOS and Android", "Access to the AI Suite (usage pay-as-you-go)"]
    s.append(slide(f'''<p class="eyebrow">How you engage</p><h2>Two offerings. <span class="a">One decision.</span></h2>
<div class="split grow" style="grid-template-columns:6fr 5fr;gap:28px"><div class="card"><span class="tag">Enterprise Optimization Suite</span><h3>CRM + AI Suite access</h3><ul class="t" style="grid-template-columns:1fr 1fr;gap:8px 20px">{"".join(f"<li style='font-size:18.5px'>{i}</li>" for i in inc)}</ul></div>
<div style="display:grid;gap:20px"><div class="card ag"><span class="tag">Enterprise Optimization Suite + AI Agent</span><h3>Everything above, plus the AI Agent</h3><p>A separate, optional offering. The AI Agent follows up with new and older leads by AI voice, SMS, email and iMessage, on the rules you set.</p></div>
<div class="card s"><h4>How AI Suite pricing works</h4><p>Access is included with no additional AI Suite subscription. Usage is optional and pay-as-you-go, tracked in a billing dashboard.</p></div></div></div>''', D, 6, "paper"))
    s.append(suite_slide(D, 7))
    addons = ["Dedicated accountant", "Slack integration", "Third-party integrations (ReadyMode, QuickBooks, Twilio, Kixie and more)", "Custom landing pages", "Custom automations", "Custom drip campaigns", "AI Review Bot"]
    s.append(slide(f'''<p class="eyebrow">AI Nurture · AI Agent · add-on services</p><h2>Never let a lead <span class="a">go cold.</span></h2>
<div class="cols c3 grow"><div class="card s"><span class="tag">No AI Agent needed</span><h3>AI Nurture</h3><p>Backup for your acquisition managers. Reads the conversation and your notes, builds a tailored 60-day SMS and email campaign for that seller, and revives the lead so acquisitions can close it.</p><h4 style="margin-top:8px">Nurture Pipeline</h4><p>10+ situational six-month drips matched to why the deal stalled.</p></div>
<div class="card ag"><span class="tag">Optional</span><h3>AI Agent</h3><p>Runs on your rules. Set the guardrails once and it decides when and how to follow up with new and older leads.</p><ul class="t" style="--acc:var(--amber)"><li>AI voice, SMS, email, iMessage</li><li>Number remediation and BYOC</li><li>Try it: call +1 786-786-8382</li></ul></div>
<div class="card"><span class="tag">Scoped with you</span><h3>Add-on services</h3><ul class="t">{"".join(f"<li style='font-size:21px'>{a}</li>" for a in addons)}</ul></div></div>''', D, 8, "paper"))
    ppl = "".join(f'<div class="person"><img src="{IMG}team/{i}.webp" alt=""><h3>{n}</h3><span class="role">{r}</span><p>{b}</p></div>' for i, n, r, b in TEAM)
    s.append(slide(f'<p class="eyebrow">Meet the drivers</p><h2>The people you will work with.</h2><div class="cols c5 grow" style="align-content:center">{ppl}</div>', D, 9))
    s.append(thanks("Thank you for taking the time to learn about KPI DRIVER. We look forward to helping you gear up, scale and grow with confidence.", D, 10))
    return page("KPI DRIVER Company Profile", s)


def framework(rows, doc, n):
    heads = ["Client responsibilities", "KPI DRIVER responsibilities", "Assumptions", "Acceptance criteria"]
    c = "".join(f'<div class="card {"s" if i == 3 else ""}"><h3>{h}</h3><ul class="t">{"".join(f"<li style=\'font-size:21px\'>{x}</li>" for x in r)}</ul></div>' for i, (h, r) in enumerate(zip(heads, rows)))
    return slide(f'<p class="eyebrow">Engagement framework</p><h2>Who does what.</h2><div class="cols c4 grow auto">{c}</div>', doc, n, "paper")


def accept(doc, n, what):
    return slide(f'''<p class="eyebrow">Acceptance</p><h2>Agreed and accepted.</h2><p class="lede">By signing below, both parties accept this Statement of Work for {what}. It is governed by the Service Agreement between the Client and KPI DRIVER, LLC.</p>
<div class="sign grow" style="align-content:center"><div><h3>Client</h3><p><span></span><label>Company</label></p><p><span></span><label>Name and title</label></p><p><span></span><label>Signature · date</label></p></div>
<div><h3>KPI DRIVER, LLC</h3><p><span></span><label>Name and title</label></p><p><span></span><label>Signature · date</label></p><p class="fine" style="margin-top:8px">All prices are subject to processing fees. Usage fees are billed separately.</p></div></div>''', doc, n, "paper")


def table(rows):
    return '<table><tr><th style="width:27%">Deliverable</th><th>Description</th><th style="width:22%">Timeline</th></tr>' + "".join(f'<tr><td>{a}</td><td>{b}</td><td class="tm">{c}</td></tr>' for a, b, c in rows) + "</table>"


def sow_eos():
    D = "Scope of Work · Enterprise Optimization Suite"
    s = [cover("Scope of Work", 'Enterprise <span class="grad">Optimization Suite</span>', "Implementation of KPI DRIVER's CRM, KPI dashboard and AI Suite access for your real estate business.", D)]
    s.append(slide(f'''<div class="split grow"><div style="display:grid;gap:22px"><p class="eyebrow">Project objectives</p><h2>One optimized ecosystem for the <span class="bl">whole business.</span></h2>{GEAR}</div>
<div style="display:grid;gap:16px;font-size:19.5px"><p>This Statement of Work ("SOW") defines the objectives, scope, deliverables and mutual commitments for deploying the Enterprise Optimization Suite, KPI DRIVER's real estate growth platform for businesses that need precision, customization and operational visibility.</p>
<p>The Suite brings acquisitions, dispositions, transaction coordination, contractor and vendor management, rental oversight and tailored KPI tracking into one system, with access to the AI Suite included.</p>
<p>We partner with your team to migrate existing systems, build pipelines around your workflows, implement automations and deliver the analytics that show where the opportunities are. Dedicated account management, personalized onboarding and continuous optimization come with it.</p></div></div>''', D, 2, "paper"))
    sv = [("Advanced KPI dashboard", "Custom dashboards across every pipeline."), ("Dedicated account management", "Onboarding, support and strategy sessions."), ("CRM migration", "Existing data moved with integrity maintained."),
          ("Automations", "Workflows, triggers, alerts and integrations."), ("Communication &amp; reputation", "Two-way messaging, calls, reviews, web chat."), ("Lead generation &amp; marketing", "Email and SMS campaigns, funnels, outreach."),
          ("Nurture campaigns", "Long- and short-term drips that revive leads for acquisitions."), ("Operational tools", "Scheduling, tasks, document signatures."), ("Built-in pipelines", "Nurture, Acquisitions, Dispositions, TC, Contractors &amp; Vendors, Owned &amp; Rentals."),
          ("Mobile app", "CRM, conversations and tasks on iOS and Android."), ("AI Suite access", "Nine AI tools. No additional subscription. Usage is optional and pay-as-you-go."), ("Optional: AI Agent", "Separate offering, covered by its own SOW.")]
    c = [("s" if i == 10 else "ag" if i == 11 else "", f'<span class="num">{i + 1:02d}</span><h4>{a}</h4><p style="font-size:17.5px">{b}</p>') for i, (a, b) in enumerate(sv)]
    s.append(slide(f'<p class="eyebrow">Scope of work · services provided</p><h2>What is included.</h2><div class="grow tight">{cards(c, 4)}</div>', D, 3).replace('class="card ', 'style="padding:14px 18px;gap:5px" class="card '))
    rows = [("Discovery &amp; planning", "Gathering the required details.", "1–2 days"), ("A2P 10DLC submission", "Registration so text messages work through the native phone system (LeadConnector).", "1–2 weeks"),
            ("CRM setup", "Deploying automations and putting everything needed in place.", "1 week"), ("Dashboard creation", "Deploying and connecting the KPI dashboard.", "1 week"),
            ("User Q&amp;A", "Gathering user questions after your team watches the training videos.", "1 meeting"), ("Data migration", "Once everything is agreed, we migrate existing data, if any. Usually over a weekend.", "1–3 days"),
            ("Optimization &amp; final review", "Any required fixes or special requests.", "By complexity")]
    s.append(slide(f'<p class="eyebrow">Deliverables</p><h2>Most steps run in parallel. <span class="g">ETA 2–3 weeks.</span></h2><div class="grow">{table(rows)}</div>', D, 4))
    s.append(slide('''<p class="eyebrow">Pricing structure</p><h2>Simple base. Usage billed as you go.</h2>
<div class="cols c3 grow auto"><div class="card"><span class="tag">One-time setup fee</span><p class="price">$2,997</p><p>Covers implementation as described in this SOW.</p></div>
<div class="card"><span class="tag">Monthly recurring fee</span><p class="price">$497<small>base</small></p><p class="price" style="font-size:44px;color:var(--amber)">$647<small>with AI Agent</small></p><p>Plus usage fees.</p></div>
<div class="card s"><span class="tag">Yearly · 2 months off</span><p class="price">$7,997<small>base</small></p><p class="price" style="font-size:44px;color:var(--amber)">$9,497<small>with AI Agent</small></p><p>First year includes the one-time setup fee. Each year after: $5,000 (base) or $6,500 (with AI Agent).</p></div></div>
<p class="fine"><b>Usage fees</b> are billed separately and depend on communication (email, calls, SMS), AI tools, integrations and add-on services. See the detailed breakdown in the Service Agreement. AI Suite access carries no additional subscription; you pay only for the AI usage you choose. All prices are subject to processing fees.</p>''', D, 5, "paper"))
    s.append(framework([["Provide access to your current CRM and relevant business data.", "Assign a primary point of contact for approvals and collaboration.", "Ensure timely payments and communication."],
                        ["Deliver the services in this SOW and the contract with professionalism and timeliness.", "Provide support during and after implementation.", "Maintain data confidentiality and system integrity."],
                        ["Custom work not specified here may require a change request.", "Timelines may shift with client responsiveness or additional requirements.", "Requests outside this SOW and the contract are subject to a separate fee."],
                        ["All services promised are fully functional.", "The client confirms receipt and operational readiness.", "KPI dashboards accurately reflect real-time business metrics."]], D, 6))
    s.append(accept(D, 7, "the Enterprise Optimization Suite"))
    s.append(thanks("Thank you for the opportunity to present the Enterprise Optimization Suite. Our goal is a smooth transition, streamlined operations and measurable results.", D, 8))
    return page("KPI DRIVER — Enterprise Optimization Suite Scope of Work", s)


def sow_agent():
    D = "Scope of Work · AI Agent"
    s = [cover("Scope of Work", 'KPI DRIVER <span class="grad">AI Agent</span>', "Implementation of a bilingual AI Agent that follows up with your leads on the rules you set.", D)]
    s.append(slide(f'''<div class="split grow"><div style="display:grid;gap:22px"><p class="eyebrow">Project objectives</p><h2>Runs on <span class="a">your rules.</span></h2>{GEAR}<p class="fine">Hear it first: call <b>+1 786-786-8382</b> and talk to our AI Agent.</p></div>
<div style="display:grid;gap:16px"><p>This Statement of Work ("SOW") outlines the deployment of a bilingual (English and Spanish) AI Agent that handles voice and chat interactions for lead engagement, 24/7.</p>
<p>The objective is to automate pre-qualification of prospects, respond in real time and streamline appointment scheduling through conversational workflows. You set the guardrails once, and the agent decides when and how to follow up with new and older leads.</p>
<ul class="t" style="--acc:var(--amber)"><li>Channels: AI voice, SMS, email and iMessage</li><li>Bilingual communication, lead screening and automated booking</li><li>Number remediation and bring-your-own-carrier (BYOC)</li><li>Your team stays focused on high-value opportunities</li></ul></div></div>''', D, 2, "paper"))
    sv = [("Strategy &amp; architecture design", "How the agent fits your lead flow and rules."), ("Workflow automation setup", "The automations the agent runs on."), ("AI training &amp; knowledge base", "Training the agent on your business."),
          ("CRM &amp; system integrations", "Connecting your CRM and other systems."), ("Conversational AI: chat &amp; voice", "Voice, SMS, email and iMessage conversations."), ("Lead qualification &amp; routing", "Screening prospects and routing them to your team."),
          ("Task automation &amp; execution", "Booking and follow-up tasks handled for you."), ("Analytics &amp; performance dashboard", "Visibility into what the agent is doing."), ("Continuous optimization &amp; scaling", "Refinement based on feedback and usage.")]
    c = [("ag", f'<span class="num">{i + 1:02d}</span><h4>{a}</h4><p>{b}</p>') for i, (a, b) in enumerate(sv)]
    s.append(slide(f'<p class="eyebrow">Scope of work</p><h2>What is included.</h2><div class="grow tight">{cards(c, 3)}</div>', D, 3).replace('class="card ag', 'style="padding:14px 20px;gap:5px" class="card ag'))
    rows = [("Discovery &amp; planning", "Requirements gathering and use-case definition.", "1–5 days"), ("AI design &amp; architecture", "System design, workflows and integration planning.", "1–5 days"), ("Development &amp; configuration", "AI Agent setup and automation building.", "1–5 days"),
            ("Integration setup", "Connecting the CRM, APIs and external systems.", "1–5 days"), ("Testing &amp; QA", "Functional testing and performance validation.", "1–5 days"), ("Deployment", "Launch of the AI Agent into production.", "1–5 days"),
            ("Training &amp; handover", "User onboarding and documentation.", "1 session"), ("Optimization", "Refinements based on feedback and usage.", "Ongoing")]
    s.append(slide(f'<p class="eyebrow">Deliverables</p><h2>Most steps run in parallel. <span class="a">ETA 1–5 days.</span></h2><div class="grow">{table(rows).replace("padding:12px 18px", "")}</div>', D, 4).replace("<td>", '<td style="padding:9px 18px">').replace('<td class="tm">', '<td class="tm" style="padding:9px 18px">'))
    s.append(slide('''<p class="eyebrow">Pricing structure</p><h2>A flat base. Usage by the message and the minute.</h2>
<div class="cols c4 grow auto"><div class="card ag"><span class="tag">One-time setup fee</span><p class="price">$497</p><p>Free if bundled at CRM setup.</p></div>
<div class="card ag"><span class="tag">Monthly recurring fee</span><p class="price">$147</p><p>Per month.</p></div>
<div class="card ag"><span class="tag">Text</span><p class="price">$0.05</p><p>Per message segment.</p></div>
<div class="card ag"><span class="tag">Call</span><p class="price">$0.15</p><p>Per minute.</p></div></div>
<p class="fine">All prices are subject to processing fees. The AI Agent is a separate, optional offering available with the Enterprise Optimization Suite + AI Agent.</p>''', D, 5, "paper"))
    s.append(framework([["Provide access to systems, tools and relevant data.", "Assign a primary point of contact.", "Ensure timely approvals and communication.", "Participate in testing and feedback cycles."],
                        ["Deliver all services outlined in this SOW.", "Ensure system performance and reliability.", "Provide onboarding and support.", "Maintain data security and confidentiality."],
                        ["Scope changes may require a formal change request.", "Timelines depend on client responsiveness.", "Additional features outside scope may incur extra costs."],
                        ["The AI Agent performs agreed tasks accurately.", "Automations function as designed.", "Integrations operate without critical issues.", "The client confirms operational readiness."]], D, 6))
    s.append(accept(D, 7, "the AI Agent"))
    s.append(thanks("Thank you for the opportunity to present the KPI DRIVER AI Agent. We are excited to put it to work on your follow-up.", D, 8))
    return page("KPI DRIVER — AI Agent Scope of Work", s)


def flyer():
    D = "AI Suite · Founder Access"
    groups = "".join(f'<div><div class="grp"><h2 class="g">{g}</h2><span>{s}</span></div><div class="cols c3" style="gap:12px">' + "".join(f'<div class="card s"><span class="num">{i:02d}</span><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(ts, start=k * 3 + 1)) + "</div></div>" for k, (g, s, ts) in enumerate(TOOLS))
    p1 = f'''<section class="slide flyer">{tach()}<div style="display:flex;justify-content:space-between;align-items:center"><img src="{IMG}logo-light-text.svg" style="height:44px" alt="KPI DRIVER"><span class="tag" style="color:var(--green)">AI Suite · Founder Access</span></div>
<p class="eyebrow">Introducing the KPI DRIVER AI Suite</p><h1>We went quiet.<br><span class="grad">We didn’t stop.</span></h1><p class="lede" style="max-width:520px">Nine new AI tools, built into the KPI DRIVER you already use.</p>{GEAR}
{groups}
<div class="foot"><span style="font-family:var(--d);font-size:20px;letter-spacing:.02em;color:var(--text)">Less clicking. <span class="g">More closing.</span></span><span>Rolling out January 2027 · Founder offer on the back</span></div></section>'''
    p2 = f'''<section class="slide flyer"><div style="display:flex;justify-content:space-between;align-items:center"><img src="{IMG}logo-light-text.svg" style="height:44px" alt="KPI DRIVER"><span class="tag" style="color:var(--green)">AI Suite · Founder Access</span></div>
<h1 style="font-size:56px">Never let a lead <span class="grad">go cold.</span></h1>
<div class="cols c2" style="gap:14px"><div class="card s"><span class="tag">No AI Agent needed</span><h2>AI Nurture</h2><p>Backup for your acquisition managers. A new pipeline stage that reads the conversation and your notes, builds a tailored 60-day campaign for that seller, and revives the lead so acquisitions can close it.</p><div class="chips"><span>Reads conversations</span><span>Reads your notes</span><span>Context-aware</span><span>60-day campaign</span><span>SMS + email</span><span>Auto-scheduled</span></div></div>
<div class="card"><span class="tag">Situational drips</span><h2>Nurture Pipeline</h2><p>10+ situational 6-month drips, matched to why the deal stalled:</p><div class="chips">{"".join(f"<span>{x}</span>" for x in NURTURE)}</div></div></div>
<div class="card ag" style="display:grid;grid-template-columns:3fr 2fr;gap:20px"><div style="display:grid;gap:6px"><span class="tag">The new AI Agent · optional</span><h2>Runs on <span class="a">your rules.</span></h2><p>Set the guardrails once, and it decides when and how to follow up with new and older leads. No micromanaging.</p><div class="chips"><span>AI Voice</span><span>SMS</span><span>Email</span><span>iMessage</span><span>Number Remediation</span><span>BYOC</span></div><p>Test it yourself: call <b style="color:var(--amber)">+1 786-786-8382</b></p></div>
<div style="display:grid;gap:10px;align-content:center"><div><h3>Already on AI Agent?</h3><p>Same subscription. One-time migration fee.</p></div><div><h3>New to AI Agent?</h3><p>One-time setup plus monthly subscription.</p></div></div></div>
<div class="card s grow" style="display:grid;grid-template-columns:2fr 3fr;gap:24px;align-items:center;background:linear-gradient(120deg,rgba(69,182,73,.16),var(--panel) 60%)"><div><span class="tag">Founder offer</span><p class="price" style="font-size:96px">$500</p><h3>One-time setup</h3></div>
<div style="display:grid;gap:10px"><h2>No new monthly subscription.</h2><p style="font-size:16px;color:var(--text)">Pay only for what you use, tracked in a clear billing dashboard.</p><p>Rolling out January 2027 · Founder offer expires 30 days after official launch.</p></div></div>
<div class="foot"><span style="font-family:var(--d);font-size:20px;letter-spacing:.02em;color:var(--text)">Interested? Just reply in the group chat.</span><span>Founder spots are limited</span></div></section>'''
    return page("KPI DRIVER AI Suite — Founder Access", [p1, p2])


if __name__ == "__main__":
    for name, html in [("company-profile", profile()), ("sow-enterprise-optimization-suite", sow_eos()), ("sow-ai-agent", sow_agent()), ("ai-suite-flyer", flyer())]:
        (HERE / "src" / f"{name}.html").write_text(html, encoding="utf8")
    print("collateral html written")
