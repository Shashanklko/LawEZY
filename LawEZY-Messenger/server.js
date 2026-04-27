const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:8080,https://lawezy-sigma.vercel.app,https://lawezy.in,https://www.lawezy.in").split(',').map(o => o.trim());

app.use(express.json());

const PORT = process.env.MESSENGER_PORT || 8081;

// --- INSTITUTIONAL DATABASES ---

// 1. MySQL Pool (Auth/Wallet Ledger)
const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false } // Required for institutional TiDB Cloud connectivity
});

// 2. MongoDB (Chat Sessions/Messages)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🛡️ [MONGODB] Connected to Institutional Chat Ledger'))
    .catch(err => console.error('❌ [MONGODB] Connection Failure:', err));

// --- DATA SCHEMAS (Mirroring Java Entities) ---

const ChatSessionSchema = new mongoose.Schema({
    userId: String,
    professionalId: String,
    status: { type: String, enum: ['AWAITING_REPLY', 'LOCKED_REPLY', 'ACTIVE', 'ENDED', 'RESOLVED'], default: 'AWAITING_REPLY' },
    tokensGranted: { type: Number, default: 0 },
    tokensConsumed: { type: Number, default: 0 },
    isAppointmentPaid: { type: Boolean, default: false },
    expiryTime: { type: Date }, // New: Window expiry
    trialEnded: { type: Boolean, default: false }, // New: Trial tracker
    textChatFee: { type: Number, default: 100 }, // New: Metadata cache
    chatDurationMinutes: { type: Number, default: 20 }, // New: Metadata cache
    createdAt: { type: Date, default: Date.now },
    lastUpdateAt: { type: Date, default: Date.now, expires: 7776000 } // 90 days auto-purge
}, { collection: 'chat_sessions' });

const ChatMessageSchema = new mongoose.Schema({
    chatSessionId: String,
    senderId: String,
    receiverId: String,
    type: { type: String, default: 'TEXT' },
    content: String,
    fileMetadata: {
        fileId: String,
        fileName: String,
        contentType: String,
        size: Number,
        downloadUrl: String
    },
    isLocked: { type: Boolean, default: false },
    tempId: String, // High-fidelity reconciliation for Optimistic UI
    timestamp: { type: Date, default: Date.now, expires: 7776000 } // 90 days auto-purge
}, { collection: 'chat_messages' });

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

// --- MISSION CONTROL SERVER ---

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

// --- INTERNAL BRIDGES (Protected) ---
app.post('/api/internal/emit-notification', (req, res) => {
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_SECRET || 'lawezy-institutional-internal-grid-secret-2025';

    if (internalSecret !== expectedSecret) {
        console.warn('⚠️ [SECURITY] Unauthorized internal bridge attempt blocked.');
        return res.status(403).json({ error: 'Forbidden: Invalid Institutional Secret' });
    }

    const { userId, notification } = req.body;
    if (userId && notification) {
        io.to(userId).emit('notification_received', notification);
        console.log(`📡 [BRIDGE] Dispatched notification pulse to user: ${userId}`);
        return res.status(200).send({ status: 'OK' });
    }
    res.status(400).send({ error: 'Missing userId or notification payload' });
});

// --- JWT SHIELD ---

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: Token missing"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid Token"));
        socket.user = decoded; // The Java backend encodes user details in JWT
        next();
    });
});

// --- EVENT HANDLERS ---

io.on('connection', (socket) => {
    // Identity Resolution: Support 'id' (Hex Storage) and 'sub' (Email)
    const institutionalId = socket.user.id || socket.user.sub;
    console.log(`📡 [HANDSHAKE] Secure connection established: ${socket.id} (Institutional ID: ${institutionalId})`);

    // 🛡️ Join Global Personal Rooms for discovery/paging/notification delivery
    socket.join(institutionalId);

    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`👥 [INTERNAL] Entity ${institutionalId} joined session room: ${sessionId}`);
    });


    socket.on('send_message', async (data, callback) => {
        const { chatSessionId, receiverId, content, type, fileMetadata, tempId } = data;
        const senderId = socket.user.id || socket.user.sub;

        try {
            // 1. Fetch Session from MongoDB (Critical Path)
            const session = await ChatSession.findById(chatSessionId);
            if (!session) {
                if (callback) callback({ success: false, error: 'Session not found' });
                return;
            }

            // 2. Authorization & Status Check
            if (session.status === 'RESOLVED' || session.status === 'ENDED') {
                if (callback) callback({ success: false, error: 'SESSION_CLOSED' });
                return;
            }

            // 3. Start Parallel Tasks: AI Guard, Message Prep, Session Prep
            const tasks = [];
            
            // Task A: AI Safety Guard (Conditional)
            let aiCheckPromise = Promise.resolve({ data: { status: 'OK' } });
            if (!session.isAppointmentPaid && type === 'TEXT' && content && content.trim() !== '') {
                const aiUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';
                aiCheckPromise = axios.post(`${aiUrl}/api/ai/guard`, { query: content }, { timeout: 1500 })
                    .catch(() => ({ data: { status: 'OK' } })); // Fail-open on timeout
            }
            tasks.push(aiCheckPromise);

            // 4. Billing & Status Calculations (Sync)
            const now = new Date();
            const rawRole = (socket.user.role || '').toUpperCase();
            const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL', 'ADMIN', 'MASTER_ADMIN'];
            const isProfessional = proRoles.some(role => rawRole.includes(role)) || (senderId === session.professionalId);

            // Time-Based Billing Logic
            if (isProfessional && session.status === 'AWAITING_REPLY' && type === 'TEXT') {
                session.expiryTime = new Date(now.getTime() + 5 * 60000); // 5 Minutes
                session.trialEnded = true;
                session.status = 'ACTIVE';
            }

            if (!isProfessional && !session.isAppointmentPaid && session.expiryTime && now > session.expiryTime) {
                if (callback) callback({ success: false, error: 'SESSION_EXPIRED' });
                return;
            }

            // 5. Wait for AI Guard before proceeding to Save/Emit
            const aiResult = await aiCheckPromise;
            if (aiResult.data.status === 'BLOCKED') {
                if (callback) callback({ success: false, error: 'BLOCKED_CONTACT_INFO' });
                return;
            }

            // 6. Save Message and Update Session in Parallel
            const newMessage = new ChatMessage({
                chatSessionId,
                senderId,
                receiverId,
                content,
                type,
                fileMetadata,
                tempId, // Pass back tempId for frontend reconciliation
                timestamp: now
            });

            if (isProfessional && session.status === 'LOCKED_REPLY' && !session.isAppointmentPaid) {
                newMessage.isLocked = true;
            }

            session.lastUpdateAt = now;

            await Promise.all([
                newMessage.save(),
                session.save()
            ]);

            // 7. Instant Broadcast
            const broadcastPayload = {
                ...newMessage.toObject(),
                id: newMessage._id,
                tempId: tempId // Explicitly ensure tempId is passed for frontend reconciliation
            };

            if (callback) callback({ success: true, data: broadcastPayload });
            io.to(chatSessionId).emit('new_message', broadcastPayload);
            io.to(receiverId).emit('discovery_sync', { chatSessionId });

        } catch (err) {
            console.error('❌ [MESSENGER ERROR]', err);
            if (callback) callback({ success: false, error: 'Institutional handshake failed.' });
        }
    });

    socket.on('delete_chat', (sessionId) => {

        io.to(sessionId).emit('chat_deleted', sessionId);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [OFFLINE] Disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 [LAW-EZY MESSENGER] Active on Port ${PORT}`);
});
