import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Drama, UserPlus, Trash2, Save, LogOut, Calendar, Clock, Infinity, CheckCircle, XCircle, Search } from 'lucide-react';

export default function UserManager() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersFarm, setUsersFarm] = useState([]);
  const [newUser, setNewUser] = useState('');
  const [newUserFarm, setNewUserFarm] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('lifetime');
  const [selectedDurationFarm, setSelectedDurationFarm] = useState('lifetime');
  const [activeTab, setActiveTab] = useState('users');
  const [saveStatus, setSaveStatus] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Added for more complexity: search feature

  // API URL - usa a mesma origem em produção
  const API_URL = '/api';

  const fetchUsersFromServer = useCallback(async () => {
    if (!authToken) return;

    try {
      const [usersRes, farmRes] = await Promise.all([
        fetch(`${API_URL}/users`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_URL}/usersfarm`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (farmRes.ok) {
        const data = await farmRes.json();
        setUsersFarm(data.usersFarm);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }, [authToken]);

  const validateToken = useCallback(async (token) => {
    try {
      const response = await fetch(`${API_URL}/validate-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShowLogin(false);
      } else {
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      validateToken(authToken);
      fetchUsersFromServer();
    }

    const userInterval = setInterval(() => {
      if (authToken) fetchUsersFromServer();
    }, 30000);

    return () => {
      clearInterval(userInterval);
    };
  }, [authToken, fetchUsersFromServer, validateToken]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email e senha são obrigatórios');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        setShowLogin(false);
        setError('');
        setEmail('');
        setPassword('');
      } else {
        const data = await response.json();
        setError(data.error || 'Falha no login');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }

    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setShowLogin(true);
    setEmail('');
    setPassword('');
  };

  const addUser = async () => {
    const list = activeTab;
    const username = list === 'users' ? newUser.trim() : newUserFarm.trim();
    const duration = list === 'users' ? selectedDuration : selectedDurationFarm;

    if (!username) {
      alert('Por favor, insira um username');
      return;
    }

    try {
      const endpoint = list === 'users' ? '/users/add' : '/usersfarm/add';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ username, duration })
      });

      if (response.ok) {
        await fetchUsersFromServer();
        if (list === 'users') setNewUser('');
        else setNewUserFarm('');
        alert(`✅ ${username} adicionado com sucesso!`);
      } else {
        const data = await response.json();
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      alert('❌ Erro ao adicionar usuário');
    }
  };

  const removeUser = async (list, username) => {
    if (!window.confirm(`Tem certeza que deseja remover ${username}?`)) return;

    try {
      const endpoint = list === 'users' ? `/users/${username}` : `/usersfarm/${username}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        await fetchUsersFromServer();
        alert(`✅ ${username} removido com sucesso!`);
      } else {
        alert('❌ Erro ao remover usuário');
      }
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('❌ Erro ao remover usuário');
    }
  };

  const formatTimeRemaining = (expiration) => {
    if (!expiration) return 'Vitalício';

    const now = new Date();
    const exp = new Date(expiration);
    const diff = exp - now;

    if (diff <= 0) return 'Expirado';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const getDurationIcon = (duration) => {
    switch (duration) {
      case 'daily': return <Clock className="w-4 h-4" />;
      case 'weekly': return <Calendar className="w-4 h-4" />;
      case 'monthly': return <Calendar className="w-4 h-4" />;
      case 'lifetime': return <Infinity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getDurationColor = (duration) => {
    switch (duration) {
      case 'daily': return 'text-yellow-400';
      case 'weekly': return 'text-blue-400';
      case 'monthly': return 'text-purple-400';
      case 'lifetime': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const exportToGitHub = async () => {
    setSaveStatus('salvando');

    const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN || '';
    const REPO_OWNER = 'Aephic';
    const REPO_NAME = 'dnmenu';
    const BRANCH = 'main';

    if (!GITHUB_TOKEN) {
      alert('Token do GitHub não configurado. Configure REACT_APP_GITHUB_TOKEN nas variáveis de ambiente.');
      setSaveStatus('erro');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      const usersContent = users.map(u => u.username).join('\n');
      const usersFarmContent = usersFarm.map(u => u.username).join('\n');

      console.log('Iniciando sincronização com GitHub...');

      const usersGetResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      );

      if (!usersGetResponse.ok) {
        throw new Error(`Erro ao buscar arquivo users: ${usersGetResponse.status}`);
      }

      const usersData = await usersGetResponse.json();

      const usersPutResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: 'Atualizar lista de usuários via DNMenu Manager',
            content: btoa(unescape(encodeURIComponent(usersContent))),
            branch: BRANCH,
            sha: usersData.sha
          })
        }
      );

      if (!usersPutResponse.ok) {
        throw new Error(`Erro ao atualizar users: ${usersPutResponse.status}`);
      }

      const usersFarmGetResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      );

      if (!usersFarmGetResponse.ok) {
        throw new Error(`Erro ao buscar arquivo usersfarm: ${usersFarmGetResponse.status}`);
      }

      const usersFarmData = await usersFarmGetResponse.json();

      const usersFarmPutResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: 'Atualizar lista de usersfarm via DNMenu Manager',
            content: btoa(unescape(encodeURIComponent(usersFarmContent))),
            branch: BRANCH,
            sha: usersFarmData.sha
          })
        }
      );

      if (!usersFarmPutResponse.ok) {
        throw new Error(`Erro ao atualizar usersfarm: ${usersFarmPutResponse.status}`);
      }

      console.log('Sincronização completa!');
      setSaveStatus('salvo');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar no GitHub:', error);
      alert(`Erro ao sincronizar com GitHub: ${error.message}\n\nVerifique o console para mais detalhes.`);
      setSaveStatus('erro');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const filteredUsers = (activeTab === 'users' ? users : usersFarm).filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showLogin) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center p-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-800 rounded-full opacity-10 blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-700 rounded-full opacity-10 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900/20 to-transparent animate-slide"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent to-purple-900/20 animate-slide-fast"></div>
        </div>

        <motion.div
          className="relative bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-purple-800 animate-glow"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-center mb-6">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-50 animate-pulse-slow"></div>
              <div className="relative bg-gradient-to-br from-purple-700 to-purple-900 p-5 rounded-full">
                <Drama className="w-10 h-10 text-purple-300 animate-spin-slow" />
              </div>
            </motion.div>
          </div>

          <h1 className="text-4xl font-black text-center bg-gradient-to-r from-purple-200 to-purple-400 bg-clip-text text-transparent mb-2">
            DNMenu Manager
          </h1>
          <p className="text-gray-400 text-center mb-8 font-medium">
            Sistema de Gerenciamento de Acesso
          </p>

          <div className="space-y-5">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-purple-900/50 border border-purple-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all duration-300 hover:border-purple-600 hover:scale-105"
                placeholder="seu@email.com"
              />
            </motion.div>

            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-purple-900/50 border border-purple-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all duration-300 hover:border-purple-600 hover:scale-105"
                placeholder="********"
              />
            </motion.div>

            {error && (
              <motion.p
                className="text-red-400 text-sm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-4 rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 animate-gradient-x"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
              {isLoading && <Clock className="w-5 h-5 animate-spin" />}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Main manager interface (more complex with search, cards, animations)
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-50">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-800 rounded-full blur-3xl animate-bounce-slow"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-700 rounded-full blur-3xl animate-bounce-slow" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <header className="relative flex justify-between items-center mb-10">
        <motion.h1
          className="text-4xl font-black bg-gradient-to-r from-purple-200 to-purple-400 bg-clip-text text-transparent"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          DNMenu Manager
        </motion.h1>
        <motion.button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-300 hover:text-purple-300 transition-colors"
          whileHover={{ scale: 1.1 }}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </motion.button>
      </header>

      <motion.div
        className="flex gap-6 mb-8"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-purple-700 text-white shadow-lg' : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('usersFarm')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'usersFarm' ? 'bg-purple-700 text-white shadow-lg' : 'bg-purple-900/50 text-gray-300 hover:bg-purple-800'}`}
        >
          Users Farm
        </button>
      </motion.div>

      <motion.div
        className="bg-black/60 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-purple-800 animate-glow"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex gap-4">
            <input
              value={activeTab === 'users' ? newUser : newUserFarm}
              onChange={(e) => activeTab === 'users' ? setNewUser(e.target.value) : setNewUserFarm(e.target.value)}
              className="flex-1 bg-purple-900/50 border border-purple-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all duration-300 hover:scale-105"
              placeholder="Adicionar username"
            />
            <select
              value={activeTab === 'users' ? selectedDuration : selectedDurationFarm}
              onChange={(e) => activeTab === 'users' ? setSelectedDuration(e.target.value) : setSelectedDurationFarm(e.target.value)}
              className="bg-purple-900/50 border border-purple-700 rounded-xl p-4 text-gray-200 focus:border-purple-500 focus:outline-none transition-all duration-300 hover:scale-105"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="lifetime">Vitalício</option>
            </select>
            <motion.button
              onClick={addUser}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-xl hover:from-purple-500 hover:to-purple-600 flex items-center gap-2 animate-gradient-x"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="w-5 h-5" />
              Adicionar
            </motion.button>
          </div>

          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-purple-900/50 border border-purple-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all duration-300 pl-10"
              placeholder="Buscar usuário..."
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.username}
              className="bg-purple-900/30 border border-purple-800 p-6 rounded-xl flex flex-col justify-between transition-all hover:bg-purple-900/50 hover:shadow-purple-500/20 hover:scale-105"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex justify-between items-start">
                <span className="text-lg font-bold text-purple-200">{user.username}</span>
                <motion.button
                  onClick={() => removeUser(activeTab, user.username)}
                  className="text-red-400 hover:text-red-300"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className={getDurationColor(user.duration)}>{formatTimeRemaining(user.expiration)}</span>
                {getDurationIcon(user.duration)}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={exportToGitHub}
        className="mt-10 w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-4 rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all duration-300 flex items-center justify-center gap-2 animate-gradient-x"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Save className="w-5 h-5" />
        Salvar no GitHub {saveStatus === 'salvando' ? '...' : ''}
        {saveStatus === 'salvo' && <CheckCircle className="w-5 h-5 text-green-400" />}
        {saveStatus === 'erro' && <XCircle className="w-5 h-5 text-red-400" />}
      </motion.button>
    </motion.div>
  );
}