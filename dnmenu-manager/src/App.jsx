import React, { useState, useEffect, useCallback } from 'react';
import { Drama, UserPlus, Trash2, Save, LogOut, Calendar, Clock, Infinity, CheckCircle, XCircle } from 'lucide-react';

export default function UserManager() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
        setIsLoggedIn(true);
        setShowLogin(false);
      } else {
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setIsLoggedIn(false);
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setIsLoggedIn(false);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      validateToken(authToken);
      fetchUsersFromServer();
    }

    // Intervalo para atualizar dados do servidor
    const userInterval = setInterval(() => {
      if (authToken) fetchUsersFromServer();
    }, 30000); // A cada 30 segundos

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
        setTimeout(() => setIsLoggedIn(true), 300);
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
    setIsLoggedIn(false);
    setTimeout(() => {
      setShowLogin(true);
      setEmail('');
      setPassword('');
    }, 300);
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
        alert(`${username} adicionado com sucesso!`);
      } else {
        const data = await response.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário');
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
      } else {
        alert('Erro ao remover usuário');
      }
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('Erro ao remover usuário');
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
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      const usersContent = users.map(u => u.username).join('\n');
      const usersFarmContent = usersFarm.map(u => u.username).join('\n');

      console.log('Iniciando sincronização com GitHub...');

      // Atualizar arquivo users
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

      // Atualizar arquivo usersfarm
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
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Erro ao exportar para GitHub:', error);
      alert(`Erro ao exportar: ${error.message}`);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md shadow-2xl border border-white/20">
          <div className="flex justify-center mb-6">
            <Drama className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-6">Login Admin</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-white/5 border border-white/20 rounded p-3 text-white placeholder-gray-400 mb-4 focus:outline-none focus:border-indigo-400"
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-white/5 border border-white/20 rounded p-3 text-white placeholder-gray-400 mb-6 focus:outline-none focus:border-indigo-400"
          />

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <Drama className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">DNMenu Manager</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600/50 hover:bg-red-600 text-white px-4 py-2 rounded transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 rounded font-medium transition ${activeTab === 'users'
              ? 'bg-indigo-600 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('usersfarm')}
            className={`flex-1 py-3 rounded font-medium transition ${activeTab === 'usersfarm'
              ? 'bg-indigo-600 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
          >
            Users Farm
          </button>
        </div>

        <div className="mb-6">
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Adicionar username Roblox"
              value={activeTab === 'users' ? newUser : newUserFarm}
              onChange={(e) => activeTab === 'users' ? setNewUser(e.target.value) : setNewUserFarm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addUser()}
              className="flex-1 bg-white/5 border border-white/20 rounded p-3 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-400"
            />
            <select
              value={activeTab === 'users' ? selectedDuration : selectedDurationFarm}
              onChange={(e) => activeTab === 'users' ? setSelectedDuration(e.target.value) : setSelectedDurationFarm(e.target.value)}
              className="bg-white/5 border border-white/20 rounded p-3 text-white focus:outline-none focus:border-indigo-400"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="lifetime">Vitalício</option>
            </select>
            <button
              onClick={addUser}
              className="bg-green-600 text-white px-6 py-3 rounded font-medium hover:bg-green-700 transition flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10">
                  <th className="p-4 text-left text-gray-300">Username</th>
                  <th className="p-4 text-left text-gray-300">Duração</th>
                  <th className="p-4 text-left text-gray-300">Tempo Restante</th>
                  <th className="p-4 text-left text-gray-300">Adicionado em</th>
                  <th className="p-4 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'users' ? users : usersFarm).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">
                      Nenhum usuário cadastrado
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'users' ? users : usersFarm).map((user, index) => (
                    <tr
                      key={index}
                      className={`border-t border-white/10 hover:bg-white/5 transition ${user.expiration && new Date(user.expiration) < new Date() ? 'opacity-50' : ''
                        }`}
                    >
                      <td className="p-4 text-white">{user.username}</td>
                      <td className="p-4">
                        <span className={`flex items-center space-x-2 ${getDurationColor(user.duration)}`}>
                          {getDurationIcon(user.duration)}
                          <span>{user.duration.charAt(0).toUpperCase() + user.duration.slice(1)}</span>
                        </span>
                      </td>
                      <td className="p-4 text-white">{formatTimeRemaining(user.expiration)}</td>
                      <td className="p-4 text-gray-400">
                        {new Date(user.addedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => removeUser(activeTab, user.username)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={exportToGitHub}
            disabled={saveStatus === 'salvando'}
            className={`flex items-center space-x-2 px-6 py-3 rounded font-medium transition ${saveStatus === 'success' ? 'bg-green-600 text-white' :
              saveStatus === 'error' ? 'bg-red-600 text-white' :
                'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
          >
            {saveStatus === 'salvando' ? (
              <>
                <Save className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Salvo!</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <XCircle className="w-4 h-4" />
                <span>Erro</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Exportar para GitHub</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}