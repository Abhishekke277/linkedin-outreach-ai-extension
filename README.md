# LinkedIn Outreach AI (Chrome Extension — Manifest V3)

A lightweight Chrome extension that scrapes LinkedIn profile context and generates tailored outreach messages across **Networking**, **Job Opportunity**, **Referral**, and **Collaboration** workflows.

## Key Features & Engineering Improvements
- **Resilient Profile Scraping (`content_script.js`):** Extracts name, headline, role, company, skills, and activity while stripping unread notification prefixes (e.g., `(7)`) and filtering out sidebar/tagline false positives.
- **Resume & Sender Context Integration (`background.js`):** Incorporates the user's saved bio and sanitized PDF resume metadata into Job and Referral outreach templates, supporting both offline Free Mode and optional Anthropic Claude API mode.
- **3-Layer Deep Mode Pipeline:** Structures raw DOM data into normalized profile JSON (`L1`), extracts top personalization hooks (`L2`), and synthesizes tailored messages (`L3`).
- **Actionable UX & Local History (`popup.js`, `utils/cache.js`):** Includes a live 300-character LinkedIn connection invite limit indicator (`Invite ok` vs `Long msg`) and tracks the last 5 contacts with message type and tone metadata.
- **Privacy & Settings Controls (`popup.html`, `popup.js`, `popup.css`):** Stores user settings locally in `chrome.storage.local` with dedicated controls to remove an uploaded resume or clear all saved settings and API key data anytime.

## Tech Stack
- JavaScript (ES6+), HTML5, CSS3
- Chrome Extension APIs (Manifest V3: `activeTab`, `storage`, `tabs`, `scripting`)
- Anthropic Messages API (optional BYOK mode)

## How to Run Locally
1. Clone this repository or download the source folder.
2. Open `chrome://extensions` in Google Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the project root directory containing `manifest.json`.
4. Navigate to any `linkedin.com/in/` profile page and click the **Outreach AI** extension icon.