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
    '2': 'Roads & Infra',
    '3': 'Electricity',
    '4': 'Public Transport',
    '5': 'Education',
    '6': 'Healthcare',
    '7': 'Women Safety',
    '8': 'Employment',
    '9': 'Others'
};

const PARTICIPATION_OPTIONS = {
    '1': 'Volunteer @ Booth',
    '2': 'Organise Meetings',
    '3': 'Spread Information',
    '4': 'Future Coordination'
};

// ─── ID Generators ─────────────────────────────────────
function generateId(prefix) {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${num}`;
}

async function logAction(action, data) {
    try {
        const logs = await getLogsCollection();
        await logs.insertOne({ action, ...data, timestamp: new Date() });
    } catch (e) {
        console.error('Log error:', e.message);
    }
}

// ─── Reverse Geocoding ─────────────────────────────────
async function getAddressFromCoords(lat, lng) {
    if (!process.env.GOOGLE_MAPS_API_KEY) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            return data.results[0].formatted_address;
        }
    } catch (e) {
        console.error('Geocode error:', e.message);
    }
    return null;
}

// ═══════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════

async function handleMessage(phoneNumber, message, data = null) {
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

        case 'ISSUE_LOCATION':
            return await handleIssueLocation(session, input, data);

        case 'SUGGESTION_TEXT':
            return await handleSuggestionText(session, input);

        case 'SUGGESTION_LOCATION':
            return await handleSuggestionLocation(session, input, data);

        case 'PARTICIPATION_TYPE':
            return await handleParticipationType(session, input);

        case 'VOLUNTEER_LOCATION':
            return await handleVolunteerLocation(session, input, data);

        case 'STAY_INFORMED_LOCATION':
            return await handleStayInformedLocation(session, input, data);

        default:
            session.step = 'ASK_EPIC';
            return getWelcomeMessage();
    }
}

// ═══════════════════════════════════════════════════════
// WELCOME MESSAGE (The "Banger" Style)
// ═══════════════════════════════════════════════════════

function getWelcomeMessage() {
    const textMsg = `Vanakkam 🙏

This is the official WhatsApp of *Venkatraman*, TVK Candidate – *Kavundampalayam*.

We are building a structured, booth-level understanding of issues in this constituency so that future priorities are based on real voter input.

To continue, please enter your *EPIC number* (Voter ID number).

Example: *ABC1234567*`;

    // Construct media URL from webhook URL base (robustly get origin)
    let baseUrl = process.env.WHATSAPP_WEBHOOK_URL;
    try {
        const url = new URL(baseUrl);
        baseUrl = url.origin;
    } catch (e) {
        // Fallback to old logic if URL parsing fails
        baseUrl = baseUrl.split('/api')[0].split('/webhook')[0];
    }

    // Return single combined image message
    return {
        type: 'image',
        link: `${baseUrl}/assets/political_banner.png`,
        caption: textMsg
    };
}

// ═══════════════════════════════════════════════════════
// STEP 1: EPIC VERIFICATION
// ═══════════════════════════════════════════════════════

async function handleEpicVerification(session, input) {
    const voterId = input.toUpperCase().trim();

    // Validate format (alphanumeric, 6-12 characters)
    if (!/^[A-Z0-9]{6,15}$/.test(voterId)) {
        return `Please enter a valid EPIC number in the correct format.\nExample: *ABC1234567*`;
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
                relationName: voter.relationName,
                parliamentName: voter.parliamentName
            };
            session.step = 'VERIFIED_MENU';

            const welcomeVerified = `Thank you, *${voter.name}*.

We have identified you as a voter from:

📍 *Booth:* ${voter.partNumber || 'N/A'}
🏛️ *Assembly:* ${voter.assemblyName || 'N/A'}
🏛️ *Parliament:* ${voter.parliamentName || 'N/A'}

We are documenting concerns booth-wise so that real priorities are shaped by people like you.

This system is designed to ensure that each booth’s voice is heard clearly and documented responsibly.

How would you like to engage today?`;

            return {
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: 'Voter Engagement' },
                    body: { text: welcomeVerified },
                    footer: { text: 'TVK Voter Support' },
                    action: {
                        button: 'Select Option',
                        sections: [
                            {
                                title: 'Main Menu',
                                rows: [
                                    { id: '1', title: '🔴 Report local issue', description: 'Report civic or local problems' },
                                    { id: '2', title: '💡 Ideas & Improvements', description: 'Give your ideas' },
                                    { id: '3', title: '🤝 Participate', description: 'Collaborate with us' },
                                    { id: '4', title: '📢 Stay informed', description: 'Get campaign updates' }
                                ]
                            }
                        ]
                    }
                }
            };
        } else {
            return `We could not locate this EPIC number in our constituency records.

Please verify and enter again.
If you believe this is an error, you may contact your booth-level representative.`;
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
            const welcomeIssue = `Thank you, *${session.verifiedVoter.name}*.

Please select the area where you are facing a concern:`;
            return {
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: '📝 Report an Issue' },
                    body: { text: welcomeIssue },
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
            return `We believe strong constituencies are built not just by solving issues, but by listening to constructive ideas.

Please share your suggestion in up to 250 characters.`;

        case '3':
            session.step = 'PARTICIPATION_TYPE';
            return {
                type: 'interactive',
                interactive: {
                    type: 'list',
                    header: { type: 'text', text: '🤝 Participate' },
                    body: { text: `That’s encouraging to hear, *${session.verifiedVoter.name}*.\n\nHow would you like to participate?` },
                    footer: { text: 'TVK Voter Support' },
                    action: {
                        button: 'Select Mode',
                        sections: [
                            {
                                title: 'Options',
                                rows: Object.entries(PARTICIPATION_OPTIONS).map(([id, title]) => ({
                                    id: id,
                                    title: title
                                }))
                            }
                        ]
                    }
                }
            };

        case '4':
            session.step = 'STAY_INFORMED_LOCATION';
            const stayLocMsg = `Please share your location (Pin or Live Location) to receive updates specific to your area.

You may also type *SKIP* or use the button below.`;
            return {
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: stayLocMsg },
                    action: {
                        buttons: [
                            { type: 'reply', reply: { id: 'SKIP', title: 'SKIP' } }
                        ]
                    }
                }
            };

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

    const msg = `Please describe the situation briefly (up to 250 characters).

Specific details help us understand recurring patterns in your booth.

You may also type *SKIP*.`;

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: msg },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'SKIP', title: 'SKIP' } }
                ]
            }
        }
    };
}

async function handleIssueDescription(session, input) {
    const isSkip = input.toUpperCase() === 'SKIP';
    const messageContent = isSkip ? 'SKIPPED' : input;

    if (!isSkip && input.length < 3) {
        return `⚠️ Please provide more detail or type *SKIP*.`;
    }

    if (!isSkip && input.length > 250) {
        return `⚠️ Your message is too long (${input.length} characters). Please keep it under 250 characters.`;
    }

    session.tempData.description = messageContent;
    session.step = 'ISSUE_LOCATION';

    const locMsg = `To help us identify the exact spot and resolve it faster, please share the location of the issue (Pin or Live Location).

You may also type *SKIP* or use the button below.`;

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: locMsg },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'SKIP', title: 'SKIP' } }
                ]
            }
        }
    };
}

async function handleIssueLocation(session, input, data) {
    const isSkip = input.toUpperCase() === 'SKIP';
    const location = isSkip ? null : data;

    if (!isSkip && input !== '[location]') {
        return `Please share your location (Pin or Live Location) or type *SKIP*.`;
    }

    const ticketId = generateId('GRV');

    try {
        let actualAddress = null;
        if (location) {
            actualAddress = await getAddressFromCoords(location.latitude, location.longitude);
        }

        const collection = await getGrievancesCollection();
        const grievance = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            category: session.tempData.category,
            message: session.tempData.description,
            location: location, // { latitude, longitude }
            latitude: location ? location.latitude : null,
            longitude: location ? location.longitude : null,
            googleMapsLink: location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : null,
            actualAddress: actualAddress,
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
            category: session.tempData.category,
            hasLocation: !!location,
            latitude: location?.latitude,
            longitude: location?.longitude
        });

        // Reset session
        clearSession(session.phoneNumber);

        const locationPart = actualAddress ? `\n📍 *Exact Spot:* ${actualAddress}` : '';

        let responseMsg = `Thank you, *${session.verifiedVoter.name}*.

Your concern from Booth ${session.verifiedVoter.partNumber} has been successfully recorded.`;

        if (location) {
            responseMsg += `\n\n✅ *Location Received:* ${locationPart}\n\n*Our field team will visit this spot soon to verify and solve the issue.*`;
        } else {
            responseMsg += `\n\nOur ward organiser will connect with you shortly for further details.`;
        }

        responseMsg += `\n\nYour active participation helps us build a better ${session.verifiedVoter.assemblyName || 'constituency'}.

_Send *Hi* anytime to start again._`;

        return responseMsg;
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

    session.tempData.suggestion = input;
    session.step = 'SUGGESTION_LOCATION';

    const sugLocMsg = `Please share the location related to your suggestion (Pin or Live Location) so we can understand the context better.

You may also type *SKIP* or use the button below.`;

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: sugLocMsg },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'SKIP', title: 'SKIP' } }
                ]
            }
        }
    };
}

async function handleSuggestionLocation(session, input, data) {
    const isSkip = input.toUpperCase() === 'SKIP';
    const location = isSkip ? null : data;

    if (!isSkip && input !== '[location]') {
        return `Please share a location (Pin or Live Location) or type *SKIP*.`;
    }

    const suggestionId = generateId('SUG');

    try {
        let actualAddress = null;
        if (location) {
            actualAddress = await getAddressFromCoords(location.latitude, location.longitude);
        }

        const collection = await getSuggestionsCollection();
        const suggestion = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            message: session.tempData.suggestion,
            location: location,
            latitude: location ? location.latitude : null,
            longitude: location ? location.longitude : null,
            googleMapsLink: location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : null,
            actualAddress: actualAddress,
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
            suggestionId,
            hasLocation: !!location
        });

        clearSession(session.phoneNumber);

        const locationPart = actualAddress ? `\n📍 *Location:* ${actualAddress}` : '';

        return `Thank you, *${session.verifiedVoter.name}*.${location ? ' Your location has been noted.' : ''}

Your suggestion from Booth ${session.verifiedVoter.partNumber} has been recorded.${locationPart}

All ideas are reviewed collectively to guide long-term planning for ${session.verifiedVoter.assemblyName || 'N/A'}.
${location ? '\n*Our team will visit the area soon to evaluate this.*' : ''}

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Suggestion error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 3: VOLUNTEER
// ═══════════════════════════════════════════════════════

function handleParticipationType(session, input) {
    const type = PARTICIPATION_OPTIONS[input] || input;
    session.tempData.participationType = type;
    session.step = 'VOLUNTEER_LOCATION';

    const volLocMsg = `Please share your location (Pin or Live Location) so our local organiser can reach you easily.

You may also type *SKIP* or use the button below.`;

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: volLocMsg },
            action: {
                buttons: [
                    { type: 'reply', reply: { id: 'SKIP', title: 'SKIP' } }
                ]
            }
        }
    };
}

async function handleVolunteerLocation(session, input, data) {
    const isSkip = input.toUpperCase() === 'SKIP';
    const location = isSkip ? null : data;

    if (!isSkip && input !== '[location]') {
        return `Please share your location (Pin or Live Location) or type *SKIP*.`;
    }

    const volunteerId = generateId('VOL');

    try {
        let actualAddress = null;
        if (location) {
            actualAddress = await getAddressFromCoords(location.latitude, location.longitude);
        }

        const collection = await getVolunteersCollection();

        const volunteer = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            area: session.verifiedVoter.area,
            district: session.verifiedVoter.district,
            assemblyName: session.verifiedVoter.assemblyName,
            partNumber: session.verifiedVoter.partNumber,
            parliamentName: session.verifiedVoter.parliamentName,
            participationType: session.tempData.participationType,
            location: location,
            latitude: location ? location.latitude : null,
            longitude: location ? location.longitude : null,
            googleMapsLink: location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : null,
            actualAddress: actualAddress,
            status: 'Pending',
            volunteerId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await collection.insertOne(volunteer);
        await logAction('volunteer_registered', {
            phoneNumber: session.phoneNumber,
            type: session.tempData.participationType,
            hasLocation: !!location
        });

        clearSession(session.phoneNumber);

        const locationPart = actualAddress ? `\n📍 *Location:* ${actualAddress}` : '';

        return `Thank you, *${session.verifiedVoter.name}*.${location ? ' Your location has been recorded.' : ''}

Our organiser from Booth ${session.verifiedVoter.partNumber} will contact you with next steps.${locationPart}

*Our team will connect with you soon at your booth.*

_Send *Hi* anytime to start again._`;
    } catch (error) {
        console.error('Participation error:', error);
        return `⚠️ *System Error*\n\nPlease try again.`;
    }
}

// ═══════════════════════════════════════════════════════
// OPTION 4: CAMPAIGN UPDATES
// ═══════════════════════════════════════════════════════

async function handleStayInformedLocation(session, input, data) {
    const isSkip = input.toUpperCase() === 'SKIP';
    const location = isSkip ? null : data;

    if (!isSkip && input !== '[location]') {
        return `Please share your location (Pin or Live Location) or type *SKIP*.`;
    }

    const subId = generateId('SUB');

    try {
        let actualAddress = null;
        if (location) {
            actualAddress = await getAddressFromCoords(location.latitude, location.longitude);
        }

        const collection = await getSubscribersCollection();

        const subscriber = {
            voterId: session.verifiedVoter.voterId,
            voterName: session.verifiedVoter.name,
            phoneNumber: session.phoneNumber,
            location: location,
            latitude: location ? location.latitude : null,
            longitude: location ? location.longitude : null,
            googleMapsLink: location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : null,
            actualAddress: actualAddress,
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
            subscriberId: subId,
            hasLocation: !!location
        });

        clearSession(session.phoneNumber);

        const locationPart = actualAddress ? `\n📍 *Location:* ${actualAddress}` : '';

        return `Thank you, *${session.verifiedVoter.name}*.${location ? ' Your location has been received.' : ''}

You will receive updates relevant to Booth ${session.verifiedVoter.partNumber} and ${session.verifiedVoter.assemblyName || 'N/A'}.${locationPart}

We aim to keep communication transparent and focused on constituency priorities.
*Our team will reach out to you soon.*

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
