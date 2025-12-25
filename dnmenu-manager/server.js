const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://dnmenu.vercel.app'],
  credentials: true
}));

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Armazenar tokens válidos
const validTokens = new Map();

// Arquivo de dados
const usersFile = path.join(__dirname, 'data', 'users.json');
const usersFarmFile = path.join(__dirname, 'data', 'usersfarm.json');

// Garantir que diretório data existe
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Funções de persistência
const loadUsers = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Erro ao carregar ${filePath}:`, error);
  }
  return [];
};

const saveUsers = (filePath, users) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error(`Erro ao salvar ${filePath}:`, error);
  }
};

// Carregar dados ao iniciar
let users = loadUsers(usersFile);
let usersFarm = loadUsers(usersFarmFile);

// Limpar usuários expirados periodicamente
setInterval(() => {
  const now = new Date();

  users = users.filter(u => {
    if (!u.expiration) return true;
    return new Date(u.expiration) > now;
  });

  usersFarm = usersFarm.filter(u => {
    if (!u.expiration) return true;
    return new Date(u.expiration) > now;
  });

  saveUsers(usersFile, users);
  saveUsers(usersFarmFile, usersFarm);
}, 60000); // A cada 1 minuto

// Credenciais
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD_HASH = hashPassword(process.env.ADMIN_PASSWORD || 'change-me');

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'default-salt'))
    .digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  next();
}

// ENDPOINTS DE AUTENTICAÇÃO

app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const passwordHash = hashPassword(password);

  if (email === ADMIN_EMAIL && passwordHash === ADMIN_PASSWORD_HASH) {
    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    validTokens.set(token, { expiresAt });

    for (const [key, value] of validTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        validTokens.delete(key);
      }
    }

    return res.json({
      token,
      expiresIn: 24 * 60 * 60
    });
  }

  res.status(401).json({ error: 'Email ou senha incorretos' });
});

app.post('/api/logout', verifyToken, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  validTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/validate-token', verifyToken, (req, res) => {
  res.json({ valid: true });
});

// ENDPOINTS DE USUÁRIOS

// Obter lista de usuários
app.get('/api/users', verifyToken, (req, res) => {
  res.json({ users });
});

app.get('/api/usersfarm', verifyToken, (req, res) => {
  res.json({ usersFarm });
});

// Adicionar usuário
app.post('/api/users/add', verifyToken, (req, res) => {
  const { username, duration } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username é obrigatório' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const calculateExpiration = (dur) => {
    const now = new Date();
    switch (dur) {
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
  };

  const newUser = {
    username,
    duration,
    expiration: calculateExpiration(duration),
    addedAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(usersFile, users);

  res.status(201).json({ success: true, user: newUser });
});

app.post('/api/usersfarm/add', verifyToken, (req, res) => {
  const { username, duration } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username é obrigatório' });
  }

  if (usersFarm.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const calculateExpiration = (dur) => {
    const now = new Date();
    switch (dur) {
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
  };

  const newUser = {
    username,
    duration,
    expiration: calculateExpiration(duration),
    addedAt: new Date().toISOString()
  };

  usersFarm.push(newUser);
  saveUsers(usersFarmFile, usersFarm);

  res.status(201).json({ success: true, user: newUser });
});

// Remover usuário
app.delete('/api/users/:username', verifyToken, (req, res) => {
  const { username } = req.params;

  const initialLength = users.length;
  users = users.filter(u => u.username !== username);

  if (users.length < initialLength) {
    saveUsers(usersFile, users);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Usuário não encontrado' });
});

app.delete('/api/usersfarm/:username', verifyToken, (req, res) => {
  const { username } = req.params;

  const initialLength = usersFarm.length;
  usersFarm = usersFarm.filter(u => u.username !== username);

  if (usersFarm.length < initialLength) {
    saveUsers(usersFarmFile, usersFarm);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Usuário não encontrado' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.length,
    usersFarm: usersFarm.length
  });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.length,
    usersFarm: usersFarm.length
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor seguro rodando na porta ${PORT}`);
  console.log(`📊 Users: ${users.length} | UsersFarm: ${usersFarm.length}`);
  console.log('📁 Dados salvos em: data/users.json e data/usersfarm.json');
});
