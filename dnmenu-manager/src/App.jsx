import React, { useState, useEffect, useCallback } from 'react';
import { Drama, UserPlus, Trash2, LogOut, Calendar, Clock, Infinity, XCircle, Github, Loader2, Check } from 'lucide-react';

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

      if (!usersRes.ok) throw new Error(`Users fetch failed: ${usersRes.status}`);
      if (!farmRes.ok) throw new Error(`UsersFarm fetch failed: ${farmRes.status}`);

      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      const farmData = await farmRes.json();
      setUsersFarm(farmData.usersFarm || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      if (error.message.includes('401')) {
        alert('Sessão expirada. Faça login novamente.');
        handleLogout();
      }
    }
  }, [authToken]);

  const validateToken = useCallback(async (token) => {
    if (!token) {
      setShowLogin(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setShowLogin(false);
      } else if (response.status === 401) {
        alert('Token expirado. Faça login novamente.');
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setShowLogin(true);
      } else {
        throw new Error('Erro na validação');
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

    return () => clearInterval(userInterval);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        setShowLogin(false);
        setEmail('');
        setPassword('');
      } else {
        const data = await response.json();
        setError(data.error || 'Falha no login');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError('Erro de conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      }
    } catch (error) {
      console.error('Erro ao logout:', error);
    }

    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setShowLogin(true);
    setUsers([]);
    setUsersFarm([]);
  };

  const addUser = async () => {
    const list = activeTab;
    const username = list === 'users' ? newUser.trim() : newUserFarm.trim();
    const duration = list === 'users' ? selectedDuration : selectedDurationFarm;

    if (!username) {
      alert('Insira um username');
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
        list === 'users' ? setNewUser('') : setNewUserFarm('');
        alert(`✅ ${username} adicionado!`);
      } else if (response.status === 401) {
        alert('Sessão expirada. Login novamente.');
        handleLogout();
      } else {
        const data = await response.json();
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      alert('❌ Erro ao adicionar');
    }
  };

  const removeUser = async (list, username) => {
    if (!window.confirm(`Remover ${username}?`)) return;

    try {
      const endpoint = list === 'users' ? `/users/${encodeURIComponent(username)}` : `/usersfarm/${encodeURIComponent(username)}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        await fetchUsersFromServer();
        alert(`✅ ${username} removido!`);
      } else if (response.status === 401) {
        alert('Sessão expirada. Login novamente.');
        handleLogout();
      } else {
        alert('❌ Erro ao remover');
      }
    } catch (error) {
      console.error('Erro ao remover:', error);
      alert('❌ Erro ao remover');
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
      alert('GitHub token não configurado.');
      setSaveStatus('erro');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      const usersContent = users.map(u => u.username).join('\n');
      const usersFarmContent = usersFarm.map(u => u.username).join('\n');

      const usersGetResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      );

      if (!usersGetResponse.ok) throw new Error('Erro ao buscar users');

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
            message: 'Atualizar users',
            content: btoa(unescape(encodeURIComponent(usersContent))),
            branch: BRANCH,
            sha: usersData.sha
          })
        }
      );

      if (!usersPutResponse.ok) throw new Error('Erro ao atualizar users');

      const usersFarmGetResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        }
      );

      if (!usersFarmGetResponse.ok) throw new Error('Erro ao buscar usersfarm');

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
            message: 'Atualizar usersfarm',
            content: btoa(unescape(encodeURIComponent(usersFarmContent))),
            branch: BRANCH,
            sha: usersFarmData.sha
          })
        }
      );

      if (!usersFarmPutResponse.ok) throw new Error('Erro ao atualizar usersfarm');

      setSaveStatus('salvo');
    } catch (error) {
      console.error('Erro no GitHub sync:', error);
      alert(`Erro no sync: ${error.message}`);
      setSaveStatus('erro');
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-700">
          <div className="flex justify-center mb-6">
            <Drama className="w-12 h-12 text-indigo-500" />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-100 mb-2">
            DNMenu Manager
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Gerenciamento de Acesso Profissional
          </p>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="admin@dnmenu.com"
              disabled={isLoading}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="••••••••"
              disabled={isLoading}
            />

            {error && (
              <div className="bg-red-800/50 border border-red-700 rounded-lg p-2 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-gray-100">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Drama className="w-6 h-6 text-indigo-500" />
            DNMenu Manager
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-4 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
            <button
              onClick={exportToGitHub}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition focus:ring-2 focus:ring-indigo-500"
              title="Sincronizar com GitHub"
            >
              {saveStatus === 'salvando' ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : saveStatus === 'salvo' ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : saveStatus === 'erro' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Github className="w-5 h-5 text-gray-300" />
              )}
            </button>
          </div>
        </header>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex mb-6 gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('usersfarm')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${activeTab === 'usersfarm' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Users Farm
            </button>
          </div>

          <div className="mb-6 flex gap-3">
            <input
              value={activeTab === 'users' ? newUser : newUserFarm}
              onChange={(e) => activeTab === 'users' ? setNewUser(e.target.value) : setNewUserFarm(e.target.value)}
              placeholder="Username"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <select
              value={activeTab === 'users' ? selectedDuration : selectedDurationFarm}
              onChange={(e) => activeTab === 'users' ? setSelectedDuration(e.target.value) : setSelectedDurationFarm(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="lifetime">Vitalício</option>
            </select>
            <button
              onClick={addUser}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-lg transition"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="space-y-2">
            {(activeTab === 'users' ? users : usersFarm).map((user) => (
              <div
                key={user.username}
                className="bg-gray-700 border border-gray-600 rounded-lg p-4 flex items-center justify-between hover:border-indigo-500 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md bg-gray-600 ${getDurationColor(user.duration)}`}>
                    {getDurationIcon(user.duration)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-100">{user.username}</p>
                    <p className="text-sm text-gray-400">
                      Expira: <span className="text-indigo-400">{formatTimeRemaining(user.expiration)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeUser(activeTab, user.username)}
                  className="text-red-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}