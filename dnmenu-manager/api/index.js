const crypto = require('crypto');

// Armazenamento em memória
const validTokens = new Map();
let users = [];
let usersFarm = [];
let isInitialized = false;

// Configurações
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD_SALT = process.env.PASSWORD_SALT || 'default-salt-change-me';
const ADMIN_PASSWORD_HASH = hashPassword(process.env.ADMIN_PASSWORD || 'change-me');

// Configurações do GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'Aephic';
const REPO_NAME = 'dnmenu';

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
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
        console.log('❌ Sem header de autorização');
        return false;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ Token não encontrado no header');
        return false;
    }

    if (!validTokens.has(token)) {
        console.log('❌ Token inválido ou não encontrado na memória');
        return false;
    }

    const tokenData = validTokens.get(token);
    if (tokenData.expiresAt < Date.now()) {
        console.log('❌ Token expirado');
        validTokens.delete(token);
        return false;
    }

    console.log('✅ Token válido');
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

// Função para carregar dados do GitHub
async function loadFromGitHub() {
    if (!GITHUB_TOKEN) {
        console.log('⚠️ GITHUB_TOKEN não configurado, pulando carregamento do GitHub');
        return;
    }

    try {
        console.log('🔄 Carregando dados do GitHub...');

        // Carregar users
        try {
            const usersResponse = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`,
                {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                }
            );

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const usersContent = Buffer.from(usersData.content, 'base64').toString('utf8');
                const usernames = usersContent.split('\n').filter(u => u.trim());

                users = usernames.map(username => ({
                    username: username.trim(),
                    duration: 'lifetime',
                    expiration: null,
                    addedAt: new Date().toISOString()
                }));

                console.log(`✅ Carregados ${users.length} users do GitHub`);
            } else {
                console.log('⚠️ Arquivo security/users não encontrado no GitHub');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar users:', error.message);
        }

        // Carregar usersfarm
        try {
            const usersFarmResponse = await fetch(
                `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`,
                {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                }
            );

            if (usersFarmResponse.ok) {
                const usersFarmData = await usersFarmResponse.json();
                const usersFarmContent = Buffer.from(usersFarmData.content, 'base64').toString('utf8');
                const usernames = usersFarmContent.split('\n').filter(u => u.trim());

                usersFarm = usernames.map(username => ({
                    username: username.trim(),
                    duration: 'lifetime',
                    expiration: null,
                    addedAt: new Date().toISOString()
                }));

                console.log(`✅ Carregados ${usersFarm.length} usersfarm do GitHub`);
            } else {
                console.log('⚠️ Arquivo security/usersfarm não encontrado no GitHub');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usersfarm:', error.message);
        }

        console.log(`✅ Inicialização completa: ${users.length} users, ${usersFarm.length} usersfarm`);
    } catch (error) {
        console.error('❌ Erro geral ao carregar do GitHub:', error);
    }
}

// Handler principal
module.exports = async (req, res) => {
    // Inicializar dados do GitHub na primeira requisição
    if (!isInitialized) {
        await loadFromGitHub();
        isInitialized = true;
    }

    // CORS Headers
    const allowedOrigins = [
        'https://dnmenu.vercel.app',
        'http://localhost:3000',
        'http://localhost:5000'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS,PUT,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, url } = req;
    const path = url.split('?')[0];

    console.log(`[${new Date().toISOString()}] ${method} ${path}`);

    // ROTAS PÚBLICAS

    // Health check
    if (method === 'GET' && path === '/api/health') {
        return res.status(200).json({
            status: 'ok',
            users: users.length,
            usersFarm: usersFarm.length,
            timestamp: new Date().toISOString(),
            tokensAtivos: validTokens.size,
            githubConfigured: !!GITHUB_TOKEN
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

                console.log(`✅ Login bem-sucedido para ${email}. Tokens ativos: ${validTokens.size}`);

                return res.status(200).json({
                    token,
                    expiresIn: 24 * 60 * 60
                });
            }

            console.log(`❌ Credenciais inválidas para ${email}`);
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        } catch (error) {
            console.error('Erro no login:', error);
            return res.status(500).json({ error: 'Erro interno no servidor' });
        }
    }

    // ROTAS PROTEGIDAS

    if (!verifyToken(req)) {
        console.log(`❌ Acesso negado para ${path}`);
        return res.status(401).json({ error: 'Não autorizado' });
    }

    // Logout
    if (method === 'POST' && path === '/api/logout') {
        const token = req.headers.authorization?.split(' ')[1];
        validTokens.delete(token);
        console.log(`✅ Logout realizado. Tokens ativos: ${validTokens.size}`);
        return res.status(200).json({ success: true });
    }

    // Validar token
    if (method === 'GET' && path === '/api/validate-token') {
        return res.status(200).json({ valid: true });
    }

    // Obter users
    if (method === 'GET' && path === '/api/users') {
        users = users.filter(u => {
            if (!u.expiration) return true;
            return new Date(u.expiration) > new Date();
        });
        console.log(`✅ Retornando ${users.length} users`);
        return res.status(200).json({ users });
    }

    // Obter usersfarm
    if (method === 'GET' && path === '/api/usersfarm') {
        usersFarm = usersFarm.filter(u => {
            if (!u.expiration) return true;
            return new Date(u.expiration) > new Date();
        });
        console.log(`✅ Retornando ${usersFarm.length} usersfarm`);
        return res.status(200).json({ usersFarm });
    }

    // Adicionar user
    if (method === 'POST' && path === '/api/users/add') {
        try {
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
            console.log(`✅ User adicionado: ${username} (${duration}). Total: ${users.length}`);
            return res.status(201).json({ success: true, user: newUser });
        } catch (error) {
            console.error('Erro ao adicionar user:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }
    }

    // Adicionar userfarm
    if (method === 'POST' && path === '/api/usersfarm/add') {
        try {
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
            console.log(`✅ UserFarm adicionado: ${username} (${duration}). Total: ${usersFarm.length}`);
            return res.status(201).json({ success: true, user: newUser });
        } catch (error) {
            console.error('Erro ao adicionar userfarm:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }
    }

    // Remover user
    if (method === 'DELETE' && path.startsWith('/api/users/')) {
        const username = decodeURIComponent(path.replace('/api/users/', ''));
        const initialLength = users.length;
        users = users.filter(u => u.username !== username);

        if (users.length < initialLength) {
            console.log(`✅ User removido: ${username}. Total: ${users.length}`);
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover userfarm
    if (method === 'DELETE' && path.startsWith('/api/usersfarm/')) {
        const username = decodeURIComponent(path.replace('/api/usersfarm/', ''));
        const initialLength = usersFarm.length;
        usersFarm = usersFarm.filter(u => u.username !== username);

        if (usersFarm.length < initialLength) {
            console.log(`✅ UserFarm removido: ${username}. Total: ${usersFarm.length}`);
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Rota não encontrada
    console.log(`❌ Rota não encontrada: ${method} ${path}`);
    return res.status(404).json({ error: 'Rota não encontrada' });
};