'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrapeProfile') {
    scrapeWithScroll().then(profile => {
      sendResponse({ success: true, data: profile });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});

async function scrapeWithScroll() {
  window.scrollTo(0, 800);  await wait(500);
  window.scrollTo(0, 1600); await wait(500);
  window.scrollTo(0, 2400); await wait(600);
  window.scrollTo(0, 0);    await wait(300);
  return scrapeProfile();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function scrapeProfile() {
  const clean = (str) => (str || '').replace(/\s+/g, ' ').trim();
  const allSections = Array.from(document.querySelectorAll('section'));

  function getSection(heading) {
    return allSections.find(s =>
      s.querySelector('h2')?.innerText?.trim().toLowerCase().includes(heading.toLowerCase())
    ) || null;
  }

  function getTexts(section) {
    if (!section) return [];
    return Array.from(section.querySelectorAll('p, span'))
      .filter(el => el.children.length === 0)
      .map(el => clean(el.innerText))
      .filter(t => t.length > 2 && !/^[·•\s]+$/.test(t));
  }

  // ── NAME ──────────────────────────────────────────────────────────────────
  const rawH1 = clean(document.querySelector('main h1, h1')?.innerText);
  const rawDocTitle = clean(document.title.split('|')[0]).replace(/^\(\d+\)\s*/, '');
  const name = (rawH1 || rawDocTitle).replace(/^\(\d+\)\s*/, '').trim();

  // ── HEADLINE ──────────────────────────────────────────────────────────────
  let headline = null;
  const topCard = document.querySelector('main section');
  if (topCard) {
    const candidates = Array.from(topCard.querySelectorAll('div, p, span'))
      .filter(el => el.children.length === 0)
      .map(el => clean(el.innerText))
      .filter(t =>
        t.length > 8 &&
        t.length < 220 &&
        t !== name &&
        !/^\d+(st|nd|rd|th)$|^contact info$|connections|followers|mutual/i.test(t)
      );
    headline = candidates.find(t =>
      t.includes('|') || t.includes('@') || /\bat\b/i.test(t) ||
      /manager|engineer|analyst|developer|designer|founder|director|lead|specialist|consultant|intern|fellow|trainee/i.test(t)
    ) || candidates[0] || null;
  }

  // ── LOCATION ──────────────────────────────────────────────────────────────
  let location = null;
  for (const sec of allSections) {
    if (sec.querySelector('h1')) {
      const pTags = Array.from(sec.querySelectorAll('p, span'))
        .filter(p => p.children.length === 0)
        .map(p => clean(p.innerText))
        .filter(t => t.length > 3);
      const locEl = pTags.find(t =>
        t.includes(',') && t.length < 60 && !t.includes('|') && !t.includes('@')
      );
      if (locEl) { location = locEl; break; }
    }
  }

  // ── ABOUT ─────────────────────────────────────────────────────────────────
  let about = null;
  const aboutSection = getSection('About');
  if (aboutSection) {
    const texts = getTexts(aboutSection);
    const longText = texts.find(t => t.length > 80 && !t.includes('Experience') && !t.includes('Skills'));
    if (longText) about = longText;
  }

  // ── EXPERIENCE ────────────────────────────────────────────────────────────
  const experienceEntries = [];
  const expSection = getSection('Experience');
  if (expSection) {
    const pTags = Array.from(expSection.querySelectorAll('p'))
      .filter(p => p.children.length === 0)
      .map(p => clean(p.innerText))
      .filter(t => t.length > 2 && t !== 'Experience');

    let i = 0;
    while (i < pTags.length) {
      const title   = pTags[i];
      const company = pTags[i+1] || null;
      const dur     = pTags[i+2] || null;

      if (/^\d{4}|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(title)) {
        i++; continue;
      }

      experienceEntries.push({
        title,
        company:   company ? company.split('·')[0].trim() : null,
        duration:  dur && /\d{4}|present|yr|mos|mo\b/i.test(dur) ? dur : null,
        isCurrent: experienceEntries.length === 0
      });

      i += /remote|onsite|on-site|hybrid|india|bengaluru|mumbai|delhi/i.test(pTags[i+3] || '')
        ? 4 : 3;
    }
  }

  const currentEntry   = experienceEntries[0] || null;
  const currentTitle   = currentEntry?.title   || extractFromHeadline(headline, 'title');
  const currentCompany = currentEntry?.company || extractFromHeadline(headline, 'company');
  const pastCompanies  = [...new Set(
    experienceEntries.slice(1).map(e => e.company).filter(Boolean)
  )];

  // ── SKILLS ────────────────────────────────────────────────────────────────
  const skills = [];
  const skillsSection = getSection('Skills');
  if (skillsSection) {
    const texts = getTexts(skillsSection);
    texts.filter(t =>
      t !== 'Skills' &&
      t.length < 60 &&
      t.length > 2 &&
      !/\d{4}|follower|connection|endorsement|endorse|show all|see all|dialog|window|escape/i.test(t)
    ).forEach(t => skills.push(t));
  }

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  const educationEntries = [];
  const eduSection = getSection('Education');
  if (eduSection) {
    const pTags = Array.from(eduSection.querySelectorAll('p'))
      .filter(p => p.children.length === 0)
      .map(p => clean(p.innerText))
      .filter(t => t.length > 2 && t !== 'Education');
    for (let i = 0; i < pTags.length; i += 3) {
      if (pTags[i]) educationEntries.push(
        [pTags[i], pTags[i+1]].filter(Boolean).join(' — ')
      );
    }
  }

  // ── RECENT POSTS ──────────────────────────────────────────────────────────
  const recentPosts = [];
  const activitySection = getSection('Activity');
  if (activitySection) {
    Array.from(activitySection.querySelectorAll('span[dir="ltr"], p'))
      .map(el => clean(el.innerText))
      .filter(t =>
        t.length > 50 && t.length < 450 &&
        !t.includes('• 1st') && !t.includes('• 2nd') && !t.includes('• 3rd') && !t.includes(' | ') &&
        !/followers|reactions|comments|reposts|dialog|window|escape|cancel|close|notifications|premium|people you may/i.test(t)
      )
      .forEach(t => { if (!recentPosts.includes(t)) recentPosts.push(t); });
  }

  return {
    name,
    headline,
    currentTitle,
    currentCompany,
    location,
    about,
    recentPosts:       recentPosts.slice(0, 3),
    experienceEntries: experienceEntries.slice(0, 5),
    pastCompanies:     pastCompanies.slice(0, 4),
    educationEntries:  educationEntries.slice(0, 3),
    skills:            skills.slice(0, 10),
    profileUrl:        window.location.href.split('?')[0],
    rawTitle:          document.title
  };
}

function extractFromHeadline(headline, field) {
  if (!headline) return null;
  const atMatch = headline.match(/^(.+?)\s+(?:at|@)\s+([^|·]+)$/i);
  if (atMatch) return field === 'title' ? atMatch[1].trim() : atMatch[2].trim();
  const pipeMatch = headline.match(/^(.+?)\s*[|·]\s*(.+)$/);
  if (pipeMatch) {
    if (field === 'title') return pipeMatch[1].trim();
    const candidate = pipeMatch[2].trim();
    // Only treat as company if it's short and doesn't look like a tagline/bio
    if (candidate.length <= 35 && !/passionate|experienced|building|creating|learning|aspiring|enthusiast/i.test(candidate)) {
      return candidate;
    }
  }
  return null;
}