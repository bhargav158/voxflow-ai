/**
 * VoxFlow — Contact Directory
 * Centralized name/email mappings used by automation flows.
 */

const CONTACTS = [
  {
    name: 'Madhumitha',
    email: 'madhumithats1708@gmail.com',
    keywords: ['madhumitha', 'madhumita', 'madhu', 'shashi'],
  },
  {
    name: 'Trisha',
    email: 'trishats2906@gmail.com',
    keywords: ['trisha'],
  },
  {
    name: 'Dr. Sujith',
    email: 'dr.sujith@example.com',
    keywords: ['dr sujith', 'dr. sujith', 'sujith', 'sujit'],
  },
];

export function getContacts() {
  return CONTACTS;
}

export function findContactByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  return CONTACTS.find((contact) => contact.email.toLowerCase() === normalized) || null;
}

export function findBestContactByText(text) {
  if (!text) return null;
  const normalized = String(text).toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const contact of CONTACTS) {
    let score = 0;
    for (const keyword of contact.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += Math.max(1, keyword.length);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = contact;
    }
  }

  return bestScore > 0 ? best : null;
}

