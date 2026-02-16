/**
 * bot.js - TVK WhatsApp Bot Logic
 * 
 * Flow:
 * 1. Welcome → Ask EPIC Number
 * 2. Verify EPIC → Show Booth/Assembly
 * 3. Menu: Issue | Suggestion | Volunteer | Updates
 * 4. Handle each option with proper responses
 */

const {
    getVoterCollection,
    getMemberRequestsCollection,
    getGrievancesCollection,
    getLogsCollection,
    getSuggestionsCollection,
    getVolunteersCollection,
    getSubscribersCollection
} = require('./db');

// ─── Session Management ────────────────────────────────
const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function createSession(phoneNumber) {
    const session = {
        phoneNumber,
        step: 'WELCOME',
        verifiedVoter: null,
        tempData: {},
        lastActivity: Date.now()
    };
    sessions.set(phoneNumber, session);
    return session;
}

function getSession(phoneNumber) {
    const session = sessions.get(phoneNumber);
    if (session && (Date.now() - session.lastActivity) > SESSION_TIMEOUT) {
        sessions.delete(phoneNumber);
        return null;
    }
    if (session) session.lastActivity = Date.now();
    return session;
}

function clearSession(phoneNumber) {
    sessions.delete(phoneNumber);
}

// ─── Issue Categories ──────────────────────────────────
const CATEGORIES = {
    '1': 'Water & Drainage',
    '2': 'Roads & Infrastructure',
    '3': 'Electricity',
    '4': 'Public Transport',
    '5': 'Education',
    '6': 'Healthcare',
    '7': 'Women Safety',
    '8': 'Employment',
    '9': 'Others'
};

// ─── ID Generators ─────────────────────────────────────
function generateId(prefix) {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${num}`;
}

// ─── Logging ───────────────────────────────────────────
async function logAction(action, data) {
    try {
        const logs = await getLogsCollection();
        await logs.insertOne({ action, ...data, timestamp: new Date() });
    } catch (e) {
        console.error('Log error:', e.message);
    }
}

// ═══════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════

async function handleMessage(phoneNumber, message) {
    const input = message.trim();
    let session = getSession(phoneNumber);

    await logAction('incoming_message', { phoneNumber, message: input });

    // Reset commands
    const resetWords = ['hi', 'hello', 'start', 'menu', 'reset', 'vanakkam'];
    if (resetWords.includes(input.toLowerCase())) {
        session = createSession(phoneNumber);
        session.step = 'ASK_EPIC';
        return getWelcomeMessage();
    }

    // No session? Start new
    if (!session) {
        session = createSession(phoneNumber);
        session.step = 'ASK_EPIC';
        return getWelcomeMessage();
    }

    // Route based on current step
    switch (session.step) {
        case 'WELCOME':
        case 'ASK_EPIC':
            return await handleEpicVerification(session, input);

        case 'VERIFIED_MENU':
            return handleMainMenu(session, input);

        case 'ISSUE_CATEGORY':
            return handleIssueCategory(session, input);

        case 'ISSUE_DESCRIPTION':
            return await handleIssueDescription(session, input);

        case 'SUGGESTION_TEXT':
            return await handleSuggestionText(session, input);

        default:
            session.step = 'ASK_EPIC';
            return getWelcomeMessage();
    }
}

// ═══════════════════════════════════════════════════════
// WELCOME MESSAGE (The "Banger" Style)
// ═══════════════════════════════════════════════════════

function getWelcomeMessage() {
    const textMsg = `🌟 *TAMILAGA VETTRI KAZHAGAM* 🌟
🚩 *Kavundampalayam Constituency* 🚩

*Vanakkam* 🙏

This is the official WhatsApp of *Venkatraman*
(TVK Candidate — Kavundampalayam)

---
"I want to stay directly connected with every voter in our constituency to build a better future together."
---

To begin, please enter your *EPIC Number* (Voter ID).

Example: *WJB1079656*`;

    // Construct media URL from webhook URL base
    const baseUrl = process.env.WHATSAPP_WEBHOOK_URL.split('/api')[0];

    // Return single combined image message
    return {
        type: 'image',
        link: `${baseUrl}/assets/welcome%20banger%201.jpg`,
        caption: textMsg
    };
}

// ═══════════════════════════════════════════════════════
// STEP 1: EPIC VERIFICATION
// ═══════════════════════════════════════════════════════

async function handleEpicVerification(session, input) {
    const voterId = input.toUpperCase().trim();

    // Validate format (alphanumeric, 6-12 characters)
    if (!/^[A-Z0-9]{6,12}$/.test(voterId)) {
        return `❌ *Invalid EPIC number format.*

Please enter a valid EPIC number (Voter ID).
Example: *WJB1079656*`;
    }

    try {
        const voterCollection = await getVoterCollection();
        const voter = await voterCollection.findOne({ voterId: voterId });

        await logAction('epic_verification', {
            phoneNumber: session.phoneNumber,
            voterId,
            found: !!voter
        });

        if (voter) {
            session.verifiedVoter = {
                voterId: voter.voterId,
                name: voter.name,
                age: voter.age,
                gender: voter.gender,
                area: voter.area,
                district: voter.district,
                assemblyName: voter.assemblyName,
                partNumber: voter.partNumber,
                relationName: voter.relationName
            };
            session.step = 'VERIFIED_MENU';

            return [
                {
                    type: 'text',
                    text: `✅ *Verification Successful*\n\n👤 *Name:* ${voter.name}\n📍 *Booth:* ${voter.partNumber || 'N/A'}\n🏛️ *Assembly:* ${voter.assemblyName || 'N/A'}`
                },
                {
                    type: 'interactive',
                    interactive: {
                        type: 'list',
                        header: { type: 'text', text: 'Main Menu' },
                        body: { text: 'How would you like to connect with us?' },
                        footer: { text: 'TVK Voter Support' },
                        action: {
                            button: 'Select Option',
                            sections: [
                                {
                                    title: 'Available Services',
                                    rows: [
                                        { id: '1', title: '🔴 Raise an Issue', description: 'Report civic or local problems' },
                                        { id: '2', title: '💡 Share Suggestion', description: 'Give your ideas for improvement' },
                                        { id: '3', title: '🤝 Volunteer with Us', description: 'Register as a TVK volunteer' },
                                        { id: '4', title: '📢 Campaign Updates', description: 'Subscribe to our latest news' }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ];
        } else {
            return `❌ *EPIC number not found in our database.*

Please check your Voter ID and try again.
Example: *WJB1079656*`;
        }
    } catch (error) {
        console.error('Verification error:', error);
        return `⚠️ *System Error*\n\nPlease try again in a moment.`;
    }
}

// ═══════════════════════════════════════════════════════
// STEP 2: MAIN MENU
// ═══════════════════════════════════════════════════════

function handleMainMenu(session, input) {
    switch (input) {
        case '1':
            session.step = 'ISSUE_CATEGORY';
            return {
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: '📝 Report an Issue' },
                    body: { text: 'Select the category that best describes your concern.' },
                    footer: { text: 'TVK Voter Support' },
                    action: {
                        button: 'Select Category',
                        sections: [
                            {
                                title: 'Common Categories',
                                rows: Object.entries(CATEGORIES).map(([id, title]) => ({
                                    id: id,
                                    title: `${id}. ${title}`,
                                    description: `Report issues related to ${title}`
                                }))
                            }
                        ]
                    }
                }
            };

        case '2':
            session.step = 'SUGGESTION_TEXT';
            return `💡 *Share a Suggestion*

Please share your suggestion in less than 250 characters.`;

        case '3':
            return handleVolunteer(session);

        case '4':
            return handleCampaignUpdates(session);

        default:
            return `❓ Please reply with a valid option:

1️⃣ Raise an Issue
2️⃣ Share a Suggestion
3️⃣ Volunteer with Us
4️⃣ Receive Campaign Updates

_Reply with 1, 2, 3, or 4_`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 1: RAISE AN ISSUE
// ═══════════════════════════════════════════════════════

function handleIssueCategory(session, input) {
    const category = CATEGORIES[input];

    if (!category) {
        return `❌ Invalid selection. Please reply with a number (1-9):

1️⃣ Water & Drainage
2️⃣ Roads & Infrastructure
3️⃣ Electricity
4️⃣ Public Transport
5️⃣ Education
6️⃣ Healthcare
7️⃣ Women Safety
8️⃣ Employment
9️⃣ Others`;
    }

    session.tempData.category = category;
    session.step = 'ISSUE_DESCRIPTION';

    return `📝 *Category:* ${category}

Please describe your issue in detail (max 250 characters).`;
}

async function handleIssueDescription(session, input) {
    if (input.length < 5) {
        return `⚠️ Please provide more detail about your issue (at least 5 characters).`;
    }

    if (input.length > 250) {
        return `⚠️ Your message is too long (${input.length} characters). Please keep it under 250 characters.`;
    }

    const ticketId = generateId('GRV');

    try {
        const collection = await getGrievancesCollection();
        const grievance = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            category: session.tempData.category,
            message: input,
            area: session.verifiedVoter.area,
            district: session.verifiedVoter.district,
            assemblyName: session.verifiedVoter.assemblyName,
            partNumber: session.verifiedVoter.partNumber,
            status: 'Open',
            ticketId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await collection.insertOne(grievance);

        await logAction('grievance_created', {
            phoneNumber: session.phoneNumber,
            voterId: session.verifiedVoter.voterId,
            ticketId,
            category: session.tempData.category
        });

        // Reset session
        clearSession(session.phoneNumber);

        return `✅ *Thank you for sharing your concern.*

📋 *Category:* ${session.tempData.category}
🎫 *Ticket ID:* ${ticketId}

Your grievances are taken seriously and our ward member or organiser will get in touch with you shortly.

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Grievance error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 2: SHARE A SUGGESTION
// ═══════════════════════════════════════════════════════

async function handleSuggestionText(session, input) {
    if (input.length < 5) {
        return `⚠️ Please provide more detail (at least 5 characters).`;
    }

    if (input.length > 250) {
        return `⚠️ Your suggestion is too long (${input.length} characters). Please keep it under 250 characters.`;
    }

    const suggestionId = generateId('SUG');

    try {
        const collection = await getSuggestionsCollection();
        const suggestion = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            message: input,
            area: session.verifiedVoter.area,
            district: session.verifiedVoter.district,
            assemblyName: session.verifiedVoter.assemblyName,
            partNumber: session.verifiedVoter.partNumber,
            status: 'Pending',
            suggestionId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await collection.insertOne(suggestion);

        await logAction('suggestion_created', {
            phoneNumber: session.phoneNumber,
            voterId: session.verifiedVoter.voterId,
            suggestionId
        });

        clearSession(session.phoneNumber);

        return `✅ *Thank you for your valuable suggestion.*

📝 *Suggestion ID:* ${suggestionId}

Our ward member or organiser will get in touch with you shortly if required.

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Suggestion error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 3: VOLUNTEER
// ═══════════════════════════════════════════════════════

async function handleVolunteer(session) {
    const volunteerId = generateId('VOL');

    try {
        const collection = await getVolunteersCollection();

        // Check if already registered
        const existing = await collection.findOne({ phoneNumber: session.phoneNumber });
        if (existing) {
            clearSession(session.phoneNumber);
            return `✅ You are already registered as a volunteer! (ID: ${existing.volunteerId})

Our booth or ward organiser will get in touch with you shortly.

_Send *Hi* anytime to start again._`;
        }

        const volunteer = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            area: session.verifiedVoter.area,
            district: session.verifiedVoter.district,
            assemblyName: session.verifiedVoter.assemblyName,
            partNumber: session.verifiedVoter.partNumber,
            status: 'Pending',
            volunteerId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await collection.insertOne(volunteer);

        await logAction('volunteer_registered', {
            phoneNumber: session.phoneNumber,
            voterId: session.verifiedVoter.voterId,
            volunteerId
        });

        clearSession(session.phoneNumber);

        return `✅ *Thank you for your interest in volunteering with TVK.*

🤝 *Volunteer ID:* ${volunteerId}

Our booth or ward organiser will get in touch with you shortly.

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Volunteer error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 4: CAMPAIGN UPDATES
// ═══════════════════════════════════════════════════════

async function handleCampaignUpdates(session) {
    const subId = generateId('SUB');

    try {
        const collection = await getSubscribersCollection();

        // Check if already subscribed
        const existing = await collection.findOne({ phoneNumber: session.phoneNumber });
        if (existing) {
            clearSession(session.phoneNumber);
            return `✅ You are already subscribed to campaign updates!

Our booth or ward organiser will get in touch with you shortly.

_Send *Hi* anytime to start again._`;
        }

        const subscriber = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            area: session.verifiedVoter.area,
            district: session.verifiedVoter.district,
            assemblyName: session.verifiedVoter.assemblyName,
            partNumber: session.verifiedVoter.partNumber,
            status: 'Active',
            subscriberId: subId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await collection.insertOne(subscriber);

        await logAction('subscriber_registered', {
            phoneNumber: session.phoneNumber,
            voterId: session.verifiedVoter.voterId,
            subscriberId: subId
        });

        clearSession(session.phoneNumber);

        return `✅ *Thank you.*

📢 *Subscriber ID:* ${subId}

You will receive campaign updates from us. Our booth or ward organiser will get in touch with you shortly.

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Subscriber error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// STATUS CHECK (for API)
// ═══════════════════════════════════════════════════════

async function checkStatus(id) {
    const upperId = id.toUpperCase().trim();

    try {
        if (upperId.startsWith('GRV')) {
            const col = await getGrievancesCollection();
            const data = await col.findOne({ ticketId: upperId });
            return data ? { found: true, type: 'grievance', data } : { found: false };
        }
        if (upperId.startsWith('SUG')) {
            const col = await getSuggestionsCollection();
            const data = await col.findOne({ suggestionId: upperId });
            return data ? { found: true, type: 'suggestion', data } : { found: false };
        }
        if (upperId.startsWith('VOL')) {
            const col = await getVolunteersCollection();
            const data = await col.findOne({ volunteerId: upperId });
            return data ? { found: true, type: 'volunteer', data } : { found: false };
        }
        if (upperId.startsWith('SUB')) {
            const col = await getSubscribersCollection();
            const data = await col.findOne({ subscriberId: upperId });
            return data ? { found: true, type: 'subscriber', data } : { found: false };
        }
        return { found: false };
    } catch (error) {
        console.error('Status check error:', error);
        return { found: false };
    }
}

module.exports = { handleMessage, checkStatus };
