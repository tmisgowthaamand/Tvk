/**
 * server.js - TVK Voter Support System
 * 
 * Complete API for WhatsApp Bot + Admin Dashboard
 * 
 * DB1 (voter_db)  → READ ONLY  - Voter verification
 * DB2 (member_db) → WRITE      - Grievances, suggestions, volunteers, subscribers, logs
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const {
    connectVoterDB,
    connectMemberDB,
    getVoterCollection,
    getMemberRequestsCollection,
    getGrievancesCollection,
    getLogsCollection,
    getSuggestionsCollection,
    getVolunteersCollection,
    getSubscribersCollection,
    closeConnections
} = require('./db');

const { handleMessage, checkStatus } = require('./bot');

const app = express();

// ─── Middleware ──────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: { success: false, error: 'Too many requests. Please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// ═══════════════════════════════════════════════════════
// VOTERS (DB1 - READ ONLY)
// ═══════════════════════════════════════════════════════

app.get('/api/voters', async (req, res) => {
    try {
        const collection = await getVoterCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { voterId: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        if (req.query.district) filter.district = req.query.district;
        if (req.query.gender) filter.gender = req.query.gender.toUpperCase();

        const [voters, total] = await Promise.all([
            collection.find(filter).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: voters,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/verify-voter', async (req, res) => {
    try {
        const { voterId } = req.body;
        if (!voterId) return res.status(400).json({ success: false, error: 'voterId is required' });

        const collection = await getVoterCollection();
        const voter = await collection.findOne({ voterId: voterId.toUpperCase().trim() });

        if (voter) {
            res.json({ success: true, data: voter });
        } else {
            res.status(404).json({ success: false, error: 'Voter ID not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// GRIEVANCES (Issues)
// ═══════════════════════════════════════════════════════

app.get('/api/grievances', async (req, res) => {
    try {
        const collection = await getGrievancesCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.search) {
            filter.$or = [
                { voterName: { $regex: req.query.search, $options: 'i' } },
                { ticketId: { $regex: req.query.search, $options: 'i' } },
                { message: { $regex: req.query.search, $options: 'i' } },
                { phoneNumber: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [data, total] = await Promise.all([
            collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter)
        ]);

        res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/grievances/:id', async (req, res) => {
    try {
        const collection = await getGrievancesCollection();
        const { status, resolution } = req.body;
        const updateData = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (resolution) updateData.resolution = resolution;
        if (status === 'Resolved') updateData.resolvedAt = new Date();

        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// SUGGESTIONS
// ═══════════════════════════════════════════════════════

app.get('/api/suggestions', async (req, res) => {
    try {
        const collection = await getSuggestionsCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.search) {
            filter.$or = [
                { voterName: { $regex: req.query.search, $options: 'i' } },
                { suggestionId: { $regex: req.query.search, $options: 'i' } },
                { message: { $regex: req.query.search, $options: 'i' } },
                { phoneNumber: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [data, total] = await Promise.all([
            collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter)
        ]);

        res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/suggestions/:id', async (req, res) => {
    try {
        const collection = await getSuggestionsCollection();
        const { status, notes } = req.body;
        const updateData = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (notes) updateData.adminNotes = notes;

        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// VOLUNTEERS
// ═══════════════════════════════════════════════════════

app.get('/api/volunteers', async (req, res) => {
    try {
        const collection = await getVolunteersCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.search) {
            filter.$or = [
                { voterName: { $regex: req.query.search, $options: 'i' } },
                { volunteerId: { $regex: req.query.search, $options: 'i' } },
                { phoneNumber: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [data, total] = await Promise.all([
            collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter)
        ]);

        res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/volunteers/:id', async (req, res) => {
    try {
        const collection = await getVolunteersCollection();
        const { status, notes } = req.body;
        const updateData = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (notes) updateData.adminNotes = notes;

        const result = await collection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// SUBSCRIBERS (Campaign Updates)
// ═══════════════════════════════════════════════════════

app.get('/api/subscribers', async (req, res) => {
    try {
        const collection = await getSubscribersCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.search) {
            filter.$or = [
                { voterName: { $regex: req.query.search, $options: 'i' } },
                { phoneNumber: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        const [data, total] = await Promise.all([
            collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            collection.countDocuments(filter)
        ]);

        res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// ADMIN NOTIFY (Send WhatsApp message to user)
// ═══════════════════════════════════════════════════════

app.post('/api/admin/notify', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({ success: false, error: 'phoneNumber and message are required' });
        }

        // Format phone number - ensure it has country code
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

        await sendWhatsAppMessage(formattedPhone, message);

        const logs = await getLogsCollection();
        await logs.insertOne({
            action: 'admin_notify',
            phoneNumber: formattedPhone,
            message,
            timestamp: new Date()
        });

        res.json({ success: true, message: `Notification sent to ${formattedPhone}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// STATUS CHECK
// ═══════════════════════════════════════════════════════

app.get('/api/status/:referenceId', async (req, res) => {
    try {
        const result = await checkStatus(req.params.referenceId);
        if (result.found) {
            res.json({ success: true, ...result });
        } else {
            res.status(404).json({ success: false, error: 'ID not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// WHATSAPP WEBHOOK
// ═══════════════════════════════════════════════════════

function handleWebhookVerify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`🔔 Webhook verify: mode=${mode}`);

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('✅ Webhook verified!');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Verification failed');
        res.sendStatus(403);
    }
}

async function handleWebhookMessage(req, res) {
    try {
        const body = req.body;
        console.log('\n📨 ═══ WEBHOOK ═══');
        console.log('Body:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messages = value?.messages;
            const contacts = value?.contacts;

            if (messages && messages.length > 0) {
                const msg = messages[0];
                const phoneNumber = msg.from;
                const contactName = contacts?.[0]?.profile?.name || 'Unknown';

                let messageText = '';
                if (msg.type === 'text') {
                    messageText = msg.text?.body || '';
                } else if (msg.type === 'interactive') {
                    messageText = msg.interactive?.button_reply?.id ||
                        msg.interactive?.list_reply?.id ||
                        msg.interactive?.button_reply?.title ||
                        msg.interactive?.list_reply?.title || '';
                } else {
                    messageText = `[${msg.type} message]`;
                }

                console.log(`📱 ${contactName} (${phoneNumber}): "${messageText}"`);

                const botResponse = await handleMessage(phoneNumber, messageText);

                // If bot response is array (multiple messages)
                if (Array.isArray(botResponse)) {
                    for (const chunk of botResponse) {
                        await sendWhatsAppMessage(phoneNumber, chunk);
                    }
                } else {
                    await sendWhatsAppMessage(phoneNumber, botResponse);
                }
            }

            const statuses = value?.statuses;
            if (statuses && statuses.length > 0) {
                console.log(`📊 Status: ${statuses[0]?.status}`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.sendStatus(200);
    }
}

app.get('/webhook', handleWebhookVerify);
app.post('/webhook', handleWebhookMessage);
app.get('/api/webhook/whatsapp', handleWebhookVerify);
app.post('/api/webhook/whatsapp', handleWebhookMessage);


// ─── Send WhatsApp Message ─────────────────────────────

async function sendWhatsAppMessage(to, content) {
    try {
        const token = process.env.WHATSAPP_API_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        // Determine if content is string (text) or object (templated/image)
        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to
        };

        if (typeof content === 'string') {
            payload.type = 'text';
            payload.text = { preview_url: false, body: content };
        } else if (content.type === 'image') {
            payload.type = 'image';
            payload.image = { link: content.link, caption: content.caption };
        } else if (content.type === 'interactive') {
            payload.type = 'interactive';
            payload.interactive = content.interactive;
        } else if (content.type === 'text') {
            payload.type = 'text';
            payload.text = { preview_url: false, body: content.text };
        }

        if (!token || token === 'your_whatsapp_api_token_here') {
            console.log(`📤 [SIM] To ${to}: ${JSON.stringify(content)}`);
            return;
        }

        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        console.log(`📤 Sending to ${to} (${payload.type})...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);
        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Sent to ${to}! ID: ${data.messages?.[0]?.id}`);
        } else {
            console.error(`❌ API error (${response.status}):`, JSON.stringify(data));
        }
    } catch (error) {
        console.error('❌ Send error:', error.message);
    }
}


// ═══════════════════════════════════════════════════════
// CHAT SIMULATOR
// ═══════════════════════════════════════════════════════

app.post('/api/chat', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({ success: false, error: 'phoneNumber and message required' });
        }

        const reply = await handleMessage(phoneNumber, message);
        res.json({ success: true, reply });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});


// ═══════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════

app.get('/api/admin/dashboard', async (req, res) => {
    try {
        const [voterCol, grievanceCol, suggestionCol, volunteerCol, subscriberCol] = await Promise.all([
            getVoterCollection(),
            getGrievancesCollection(),
            getSuggestionsCollection(),
            getVolunteersCollection(),
            getSubscribersCollection()
        ]);

        const [
            totalVoters,
            totalGrievances, openGrievances, resolvedGrievances,
            totalSuggestions, pendingSuggestions,
            totalVolunteers, pendingVolunteers, approvedVolunteers,
            totalSubscribers,
            recentGrievances, recentSuggestions, recentVolunteers
        ] = await Promise.all([
            voterCol.countDocuments(),
            grievanceCol.countDocuments(),
            grievanceCol.countDocuments({ status: 'Open' }),
            grievanceCol.countDocuments({ status: 'Resolved' }),
            suggestionCol.countDocuments(),
            suggestionCol.countDocuments({ status: 'Pending' }),
            volunteerCol.countDocuments(),
            volunteerCol.countDocuments({ status: 'Pending' }),
            volunteerCol.countDocuments({ status: 'Approved' }),
            subscriberCol.countDocuments(),
            grievanceCol.find().sort({ createdAt: -1 }).limit(5).toArray(),
            suggestionCol.find().sort({ createdAt: -1 }).limit(5).toArray(),
            volunteerCol.find().sort({ createdAt: -1 }).limit(5).toArray()
        ]);

        res.json({
            success: true,
            data: {
                totalVoters,
                grievances: { total: totalGrievances, open: openGrievances, resolved: resolvedGrievances },
                suggestions: { total: totalSuggestions, pending: pendingSuggestions },
                volunteers: { total: totalVolunteers, pending: pendingVolunteers, approved: approvedVolunteers },
                subscribers: { total: totalSubscribers },
                recentGrievances,
                recentSuggestions,
                recentVolunteers
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ═══════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
    try {
        const db1 = await connectVoterDB();
        const db2 = await connectMemberDB();
        await db1.command({ ping: 1 });
        await db2.command({ ping: 1 });
        res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ success: false, status: 'unhealthy', error: error.message });
    }
});


// ─── Page Routes ────────────────────────────────────────

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


// ═══════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectVoterDB();
        await connectMemberDB();

        app.listen(PORT, () => {
            console.log(`\n🚀 TVK Voter Support System on http://localhost:${PORT}`);
            console.log(`📱 App ID: ${process.env.WHATSAPP_APP_ID || 'not set'}`);
            console.log(`📱 Phone: ${process.env.WHATSAPP_PHONE_NUMBER_ID || 'not set'}`);
            console.log(`\n📡 Webhooks: /webhook & /api/webhook/whatsapp`);
            console.log(`🌐 Dashboard: http://localhost:${PORT}/admin`);
            console.log(`💬 Chat Sim: http://localhost:${PORT}/\n`);
        });
    } catch (error) {
        console.error('💥 Failed:', error.message);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await closeConnections();
    process.exit(0);
});

startServer();
