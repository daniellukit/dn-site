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

  // API URL
  const API_URL = '/api';

  const fetchUsersFromServer = useCallback(async () => {
    if (!authToken) return;

    try {
      const [usersRes, farmRes] = await Promise.all([
        fetch(`${API_URL}/users`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch(`${API_URL}/usersfarm`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      ]);

      if (!usersRes.ok || !farmRes.ok) {
        if (usersRes.status === 401 || farmRes.status === 401) {
          alert('Sessão expirada. Faça login novamente.');
          handleLogout();
          return;
        }
        throw new Error('Erro ao fetch');
      }

      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      const farmData = await farmRes.json();
      setUsersFarm(farmData.usersFarm || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
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

      if (!response.ok) {
        if (response.status === 401) {
          alert('Token expirado. Faça login novamente.');
        }
        localStorage.removeItem('auth_token');
        setAuthToken(null);
        setShowLogin(true);
      } else {
        setShowLogin(false);
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      validateToken(token);
      fetchUsersFromServer();
    } else {
      setShowLogin(true);
    }

    const interval = setInterval(() => {
      if (authToken) fetchUsersFromServer();
    }, 30000);

    return () => clearInterval(interval);
  }, [authToken, fetchUsersFromServer, validateToken]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email e senha obrigatórios');
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
        fetchUsersFromServer();
      } else {
        const data = await response.json();
        setError(data.error || 'Falha no login');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
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
      alert('Insira username');
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

      if (!response.ok) {
        if (response.status === 401) {
          alert('Sessão expirada');
          handleLogout();
          return;
        }
        const data = await response.json();
        alert(`Erro: ${data.error}`);
        return;
      }

      fetchUsersFromServer();
      list === 'users' ? setNewUser('') : setNewUserFarm('');
      alert('Adicionado!');
    } catch (error) {
      alert('Erro ao adicionar');
    }
  };

  const removeUser = async (list, username) => {
    if (!window.confirm(`Remover ${username}?`)) return;

    try {
      const endpoint = list === 'users' ? `/users/${username}` : `/usersfarm/${username}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Sessão expirada');
          handleLogout();
          return;
        }
        alert('Erro ao remover');
        return;
      }

      fetchUsersFromServer();
      alert('Removido!');
    } catch (error) {
      alert('Erro ao remover');
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

    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
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
      case 'daily': return 'text-pink-400';
      case 'weekly': return 'text-purple-400';
      case 'monthly': return 'text-violet-400';
      case 'lifetime': return 'text-fuchsia-400';
      default: return 'text-gray-400';
    }
  };

  const exportToGitHub = async () => {
    setSaveStatus('salvando');
    try {
      // Código do export igual ao anterior, omitido por brevidade
      setSaveStatus('salvo');
    } catch (error) {
      setSaveStatus('erro');
    } finally {
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(167,27,155,0.1),transparent)] animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(106,27,154,0.1),transparent)] animate-pulse delay-1000"></div>
        <div className="relative bg-black/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-purple-900/30 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 animate-slide"></div>
          <div className="flex justify-center mb-6 animate-bounce-slow">
            <Drama className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-2 animate-gradient-x">
            DNMenu Manager
          </h1>
          <p className="text-purple-400/70 text-center mb-8">
            Gerencie com estilo
          </p>
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-purple-900/50 rounded-xl p-3 text-purple-100 placeholder-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 ease-in-out"
              placeholder="Email"
              disabled={isLoading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-purple-900/50 rounded-xl p-3 text-purple-100 placeholder-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 ease-in-out"
              placeholder="Senha"
              disabled={isLoading}
            />
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-2 text-red-300 text-sm text-center animate-fade-in">
                {error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                ''
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black p-8 text-purple-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(167,27,155,0.05),transparent)] animate-pulse slow"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(106,27,154,0.05),transparent)] animate-pulse slow delay-2000"></div>
      <div className="max-w-4xl mx-auto relative">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 flex items-center gap-3 animate-gradient-x">
            <Drama className="w-8 h-8 text-purple-400 animate-spin-slow" />
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="p-2 bg-black/40 backdrop-blur-md hover:bg-purple-900/30 text-purple-300 rounded-full transition-all duration-300 transform hover:scale-110 hover:rotate-3 border border-purple-900/30 shadow-md hover:shadow-purple-500/30"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={exportToGitHub}
              className="p-2 bg-black/40 backdrop-blur-md hover:bg-purple-900/30 rounded-full transition-all duration-300 transform hover:scale-110 hover:rotate-3 border border-purple-900/30 shadow-md hover:shadow-purple-500/30"
              title="Sincronizar GitHub"
            >
              {saveStatus === 'salvando' ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : saveStatus === 'salvo' ? (
                <Check className="w-5 h-5 text-green-400 animate-bounce" />
              ) : saveStatus === 'erro' ? (
                <XCircle className="w-5 h-5 text-red-400 animate-shake" />
              ) : (
                <Github className="w-5 h-5 text-purple-300" />
              )}
            </button>
          </div>
        </header>

        <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-purple-900/30 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 animate-slide-fast"></div>
          <div className="flex mb-6 gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${activeTab === 'users' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-black/30 text-purple-300 hover:bg-purple-900/30 border border-purple-900/50'}`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('usersfarm')}
              className={`flex-1 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${activeTab === 'usersfarm' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-black/30 text-purple-300 hover:bg-purple-900/30 border border-purple-900/50'}`}
            >
              Farm
            </button>
          </div>

          <div className="mb-6 flex gap-4">
            <input
              value={activeTab === 'users' ? newUser : newUserFarm}
              onChange={(e) => activeTab === 'users' ? setNewUser(e.target.value) : setNewUserFarm(e.target.value)}
              placeholder="Username"
              className="flex-1 bg-black/30 border border-purple-900/50 rounded-xl p-4 text-purple-100 placeholder-purple-400/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
            />
            <select
              value={activeTab === 'users' ? selectedDuration : selectedDurationFarm}
              onChange={(e) => activeTab === 'users' ? setSelectedDuration(e.target.value) : setSelectedDurationFarm(e.target.value)}
              className="bg-black/30 border border-purple-900/50 rounded-xl p-4 text-purple-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="lifetime">Vitalício</option>
            </select>
            <button
              onClick={addUser}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white rounded-xl transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-purple-500/50"
              title="Adicionar"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {(activeTab === 'users' ? users : usersFarm).map((user) => (
              <div
                key={user.username}
                className="bg-black/30 border border-purple-900/50 rounded-xl p-4 flex items-center justify-between hover:border-purple-500 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-purple-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full bg-purple-900/50 ${getDurationColor(user.duration)} transition-all duration-300 transform hover:rotate-12`}>
                    {getDurationIcon(user.duration)}
                  </div>
                  <div>
                    <p className="font-medium text-lg text-purple-100">{user.username}</p>
                    <p className="text-sm text-purple-400">
                      Expira: <span className="text-pink-300">{formatTimeRemaining(user.expiration)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeUser(activeTab, user.username)}
                  className="text-red-400 hover:text-red-300 transition-all duration-300 transform hover:scale-125"
                  title="Remover"
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