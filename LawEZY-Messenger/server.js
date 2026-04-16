const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8081;

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
    status: { type: String, enum: ['AWAITING_REPLY', 'LOCKED_REPLY', 'ACTIVE', 'ENDED'], default: 'AWAITING_REPLY' },
    tokensGranted: { type: Number, default: 0 },
    tokensConsumed: { type: Number, default: 0 },
    isAppointmentPaid: { type: Boolean, default: false },
    proUid: String,
    createdAt: { type: Date, default: Date.now },
    lastUpdateAt: { type: Date, default: Date.now }
}, { collection: 'chat_sessions' });

const ChatMessageSchema = new mongoose.Schema({
    chatSessionId: String,
    senderId: String,
    receiverId: String,
    type: { type: String, default: 'TEXT' },
    content: String,
    isLocked: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'chat_messages' });

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

// --- MISSION CONTROL SERVER ---

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS.split(','),
        methods: ["GET", "POST"]
    }
});

// --- INTERNAL BRIDGES ---
app.post('/api/internal/emit-notification', (req, res) => {
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
    // Identity Resolution: Support 'uid' (Public Institutional), 'id' (Hex Storage), and 'sub' (Email)
    const institutionalId = socket.user.id || socket.user.sub;
    const publicUid = socket.user.uid;
    console.log(`📡 [HANDSHAKE] Secure connection established: ${socket.id} (Hex ID: ${institutionalId}, Public UID: ${publicUid})`);

    // 🛡️ Join Global Personal Rooms for discovery/paging/notification delivery
    socket.join(institutionalId);
    if (publicUid) {
        socket.join(publicUid);
    }

    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`👥 [INTERNAL] Entity ${publicUid || institutionalId} joined session room: ${sessionId}`);
    });


    socket.on('send_message', async (data, callback) => {
        const { chatSessionId, receiverId, content, type } = data;
        const senderId = socket.user.id || socket.user.sub || data.senderId;

        try {
            // 1. Fetch Session from MongoDB
            const session = await ChatSession.findById(chatSessionId);
            if (!session) {
                const err = `Channel logic error: session ${chatSessionId} missing`;
                if (callback) callback({ success: false, error: err });
                return;
            }

            // 2. Identity Verification
            const isAuthorized = (senderId === session.userId || senderId === session.professionalId || senderId === socket.user.id);
            if (!isAuthorized) {
                console.warn(`⚠️ [SECURITY] Unauthorized send attempt by ${senderId} in session ${chatSessionId}`);
            }

            // 3. AI Safety Guard
            if (!session.isAppointmentPaid) {
                try {
                    const aiResult = await axios.post(`${process.env.AI_SERVICE_URL}/check-safety`, { content }, { timeout: 2000 });
                    if (aiResult.data.status === 'BLOCKED') {
                        if (callback) callback({ success: false, error: 'Message blocked: Contact information detected.' });
                        return;
                    }
                } catch (aiErr) { }
            }

            // 4. Save Message
            const newMessage = new ChatMessage({
                chatSessionId,
                senderId,
                receiverId,
                content,
                type,
                timestamp: new Date()
            });

            await newMessage.save();
            session.lastUpdateAt = new Date();
            
            // 5. Financial Governance (Institutional Quota Ledger)
            const authId = socket.user.id || socket.user.sub || socket.user.email;
            
            if (senderId === authId || senderId === socket.user.id || senderId === socket.user.sub) {
                // 👨‍⚖️ EXPERT BYPASS [V2.1 - Robust Handshake]
                const rawRole = (socket.user.role || '').toUpperCase();
                const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'];
                
                // MULTI-LAYER IDENTITY FAIL-SAFE 
                const isProfessional = 
                    proRoles.some(role => rawRole.includes(role)) || 
                    (senderId === session.professionalId) ||
                    (['LA', 'CA', 'CF'].some(sfx => senderId.endsWith(sfx))); // Institutional Suffix Backup
                
                console.log(`🕵️ [DEBUG] senderId: ${senderId} | proId: ${session.professionalId} | isPro: ${isProfessional} | rawRole: ${rawRole}`);

                if (!isProfessional) {
                    console.log(`🛡️ [GOVERNANCE] Processing ledger for Client: ${senderId}`);
                    try {
                        const [wallets] = await mysqlPool.execute('SELECT * FROM wallets WHERE id = ? OR user_id = ?', [senderId, senderId]);
                        
                        if (wallets.length > 0) {
                            const wallet = wallets[0];
                            const freeChatTokens = wallet.free_chat_tokens !== undefined ? wallet.free_chat_tokens : (wallet.freeChatTokens || 0);
                            const tokenBalance = wallet.token_balance !== undefined ? wallet.token_balance : (wallet.tokenBalance || 0);
                            let isUnlimitedRaw = wallet.is_unlimited !== undefined ? wallet.is_unlimited : wallet.isUnlimited;
                            let isUnlimited = false;
                            if (Buffer.isBuffer(isUnlimitedRaw)) {
                                isUnlimited = isUnlimitedRaw[0] === 1;
                            } else {
                                isUnlimited = !!isUnlimitedRaw;
                            }

                            if (!isUnlimited) {
                                let quotaDeducted = false;
                                if (freeChatTokens > 0) {
                                    const column = wallet.free_chat_tokens !== undefined ? 'free_chat_tokens' : 'freeChatTokens';
                                    await mysqlPool.execute(`UPDATE wallets SET ${column} = ${column} - 1 WHERE id = ?`, [wallet.id]);
                                    quotaDeducted = true;
                                } else if (tokenBalance > 0) {
                                    const column = wallet.token_balance !== undefined ? 'token_balance' : 'tokenBalance';
                                    await mysqlPool.execute(`UPDATE wallets SET ${column} = ${column} - 1 WHERE id = ?`, [wallet.id]);
                                    quotaDeducted = true;
                                }

                                if (quotaDeducted) {
                                    session.tokensConsumed += 1;
                                    const txnRef = `TXN-LZY-${Date.now()}`;
                                    await mysqlPool.execute(
                                        'INSERT INTO financial_transactions (id, transaction_id, description, amount, status, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                        [txnRef, txnRef, `Messenger Quota: Session ${chatSessionId.substring(0,8)}`, -1.0, 'COMPLETED', new Date(), senderId]
                                    );
                                } else {
                                    console.warn(`🛑 [GOVERNANCE] Quota Exhausted for ${senderId}`);
                                    await ChatMessage.findByIdAndDelete(newMessage._id);
                                    io.to(chatSessionId).emit('quota_exhausted_alert', { 
                                        userId: senderId, 
                                        message: "Institutional units exhausted. Please refill credits." 
                                    });
                                    if (callback) callback({ success: false, error: 'INSTITUTIONAL_QUOTA_EXHAUSTED' });
                                    return;
                                }
                            }
                        } else {
                            console.error(`❌ [IDENTITY_LEDGER_MISSING] No wallet entry found for Institutional ID/Email: [${senderId}]. Handshake denied.`);
                            await ChatMessage.findByIdAndDelete(newMessage._id);
                            if (callback) callback({ success: false, error: 'IDENTITY_LEDGER_MISSING' });
                            return;
                        }
                    } catch (sqlErr) {
                        console.error('❌ [SQL ERROR]', sqlErr.message);
                    }
                } else {
                    console.log(`👨‍⚖️ [GOVERNANCE] Expert Bypass [V2.1]: ${senderId} (${rawRole})`);
                }
            }

            await session.save();
            if (callback) callback({ success: true, message: newMessage });
            io.to(chatSessionId).emit('new_message', newMessage);
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
