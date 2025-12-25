const crypto = require('crypto');

// Armazenamento em memória (para Vercel Serverless Functions)
// NOTA: Em produção real, use um banco de dados (MongoDB, PostgreSQL, etc.)
const validTokens = new Map();
let users = [];
let usersFarm = [];

// Configurações
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD_SALT = process.env.PASSWORD_SALT || 'default-salt-change-me';
const ADMIN_PASSWORD_HASH = hashPassword(process.env.ADMIN_PASSWORD || 'change-me');

function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password + PASSWORD_SALT)
        .digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function verifyToken(req) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !validTokens.has(token)) {
        return false;
    }

    const tokenData = validTokens.get(token);
    if (tokenData.expiresAt < Date.now()) {
        validTokens.delete(token);
        return false;
    }

    return true;
}

function calculateExpiration(duration) {
    const now = new Date();
    switch (duration) {
        case 'daily':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        case 'monthly':
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        case 'lifetime':
            return null;
        default:
            return null;
    }
}

// Handler principal para Vercel Serverless Functions
module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://dnmenu.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { method, url } = req;
    const path = url.split('?')[0];

    // ROTAS PÚBLICAS

    // Health check
    if (method === 'GET' && path === '/api/health') {
        return res.status(200).json({
            status: 'ok',
            users: users.length,
            usersFarm: usersFarm.length,
            timestamp: new Date().toISOString()
        });
    }

    // Login
    if (method === 'POST' && path === '/api/login') {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email e senha são obrigatórios' });
            }

            const passwordHash = hashPassword(password);

            if (email === ADMIN_EMAIL && passwordHash === ADMIN_PASSWORD_HASH) {
                const token = generateToken();
                const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

                validTokens.set(token, { expiresAt });

                // Limpar tokens expirados
                for (const [key, value] of validTokens.entries()) {
                    if (value.expiresAt < Date.now()) {
                        validTokens.delete(key);
                    }
                }

                return res.status(200).json({
                    token,
                    expiresIn: 24 * 60 * 60
                });
            }

            return res.status(401).json({ error: 'Email ou senha incorretos' });
        } catch (error) {
            console.error('Erro no login:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    // ROTAS PROTEGIDAS (requerem autenticação)

    if (!verifyToken(req)) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    // Logout
    if (method === 'POST' && path === '/api/logout') {
        const token = req.headers.authorization?.split(' ')[1];
        validTokens.delete(token);
        return res.status(200).json({ success: true });
    }

    // Validar token
    if (method === 'GET' && path === '/api/validate-token') {
        return res.status(200).json({ valid: true });
    }

    // Obter users
    if (method === 'GET' && path === '/api/users') {
        // Filtrar usuários expirados
        users = users.filter(u => {
            if (!u.expiration) return true;
            return new Date(u.expiration) > new Date();
        });
        return res.status(200).json({ users });
    }

    // Obter usersfarm
    if (method === 'GET' && path === '/api/usersfarm') {
        // Filtrar usuários expirados
        usersFarm = usersFarm.filter(u => {
            if (!u.expiration) return true;
            return new Date(u.expiration) > new Date();
        });
        return res.status(200).json({ usersFarm });
    }

    // Adicionar user
    if (method === 'POST' && path === '/api/users/add') {
        const { username, duration } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username é obrigatório' });
        }

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }

        const newUser = {
            username,
            duration,
            expiration: calculateExpiration(duration),
            addedAt: new Date().toISOString()
        };

        users.push(newUser);
        return res.status(201).json({ success: true, user: newUser });
    }

    // Adicionar userfarm
    if (method === 'POST' && path === '/api/usersfarm/add') {
        const { username, duration } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username é obrigatório' });
        }

        if (usersFarm.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }

        const newUser = {
            username,
            duration,
            expiration: calculateExpiration(duration),
            addedAt: new Date().toISOString()
        };

        usersFarm.push(newUser);
        return res.status(201).json({ success: true, user: newUser });
    }

    // Remover user
    if (method === 'DELETE' && path.startsWith('/api/users/')) {
        const username = path.replace('/api/users/', '');
        const initialLength = users.length;
        users = users.filter(u => u.username !== username);

        if (users.length < initialLength) {
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover userfarm
    if (method === 'DELETE' && path.startsWith('/api/usersfarm/')) {
        const username = path.replace('/api/usersfarm/', '');
        const initialLength = usersFarm.length;
        usersFarm = usersFarm.filter(u => u.username !== username);

        if (usersFarm.length < initialLength) {
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Rota não encontrada
    return res.status(404).json({ error: 'Rota não encontrada' });
};