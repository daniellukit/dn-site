import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Drama, UserPlus, Trash2, LogOut, Calendar, Clock, Infinity, CheckCircle, XCircle, Search, Github } from 'lucide-react';
import { supabase } from './supabase';

export default function UserManager() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedReseller, setSelectedReseller] = useState('Reseller 1');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersFarm, setUsersFarm] = useState([]);
  const [newUser, setNewUser] = useState('');
  const [newUserFarm, setNewUserFarm] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('lifetime');
  const [selectedDurationFarm, setSelectedDurationFarm] = useState('lifetime');
  const [activeTab, setActiveTab] = useState('users');
  const [saveStatus, setSaveStatus] = useState('');
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userListId, setUserListId] = useState(null);

  const fetchUserLists = useCallback(async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from('user_lists')
      .select('*')
      .eq('owner_id', session.user.id)
      .eq('reseller', selectedReseller)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar listas:', error);
      return;
    }

    if (data) {
      setUserListId(data.id);
      const parsedUsers = data.users ? data.users.split(',').map(str => {
        const [username, duration, expiration] = str.split('|');
        return { username, duration: duration || 'lifetime', expiration: expiration || null };
      }) : [];
      setUsers(parsedUsers);

      const parsedFarm = data.users_farm ? data.users_farm.split(',').map(str => {
        const [username, duration, expiration] = str.split('|');
        return { username, duration: duration || 'lifetime', expiration: expiration || null };
      }) : [];
      setUsersFarm(parsedFarm);
    } else {
      const { data: newData, error: insertError } = await supabase
        .from('user_lists')
        .insert({ owner_id: session.user.id, reseller: selectedReseller, users: '', users_farm: '' })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar lista:', insertError);
      } else {
        setUserListId(newData.id);
        setUsers([]);
        setUsersFarm([]);
      }
    }
  }, [session, selectedReseller]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchUserLists();
    }
  }, [session, fetchUserLists]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsers([]);
    setUsersFarm([]);
    setUserListId(null);
  };

  const calculateExpiration = (duration) => {
    const now = new Date();
    if (duration === 'lifetime') return null;
    if (duration === 'daily') now.setDate(now.getDate() + 1);
    if (duration === 'weekly') now.setDate(now.getDate() + 7);
    if (duration === 'monthly') now.setDate(now.getDate() + 30);
    return now.toISOString();
  };

  const updateListsInSupabase = async (newUsers, newFarm) => {
    const usersStr = newUsers.map(u => `${u.username}|${u.duration}|${u.expiration || ''}`).join(',');
    const farmStr = newFarm.map(u => `${u.username}|${u.duration}|${u.expiration || ''}`).join(',');

    const { error } = await supabase
      .from('user_lists')
      .update({ users: usersStr, users_farm: farmStr })
      .eq('id', userListId)
      .eq('reseller', selectedReseller);

    if (error) {
      console.error('Erro ao atualizar listas:', error);
      alert('❌ Erro ao salvar mudanças');
      return false;
    }
    return true;
  };

  const addUser = async () => {
    const isUsersTab = activeTab === 'users';
    const username = isUsersTab ? newUser.trim() : newUserFarm.trim();
    if (!username) return alert('Por favor, insira um username');

    const duration = isUsersTab ? selectedDuration : selectedDurationFarm;
    const expiration = calculateExpiration(duration);

    const newEntry = { username, duration, expiration };
    const currentList = isUsersTab ? users : usersFarm;
    const newList = [...currentList, newEntry];

    const success = await updateListsInSupabase(
      isUsersTab ? newList : users,
      isUsersTab ? usersFarm : newList
    );

    if (success) {
      if (isUsersTab) {
        setUsers(newList);
        setNewUser('');
      } else {
        setUsersFarm(newList);
        setNewUserFarm('');
      }
      alert(`✅ ${username} adicionado com sucesso!`);
    }
  };

  const removeUser = async (tab, username) => {
    if (!window.confirm(`Tem certeza que deseja remover ${username}?`)) return;

    const isUsersTab = tab === 'users';
    const currentList = isUsersTab ? users : usersFarm;
    const newList = currentList.filter(u => u.username !== username);

    const success = await updateListsInSupabase(
      isUsersTab ? newList : users,
      isUsersTab ? usersFarm : newList
    );

    if (success) {
      if (isUsersTab) setUsers(newList);
      else setUsersFarm(newList);
      alert(`✅ ${username} removido com sucesso!`);
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
      alert('Token do GitHub não configurado.');
      setSaveStatus('erro');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      const usersContent = users.map(u => u.username).join('\n');
      const usersFarmContent = usersFarm.map(u => u.username).join('\n');

      const usersGetRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
      });
      if (!usersGetRes.ok) throw new Error('Failed to fetch users SHA');
      const usersData = await usersGetRes.json();

      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/users`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Atualizar users via DNMenu Manager',
          content: btoa(unescape(encodeURIComponent(usersContent))),
          branch: BRANCH,
          sha: usersData.sha
        })
      });

      const farmGetRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
      });
      if (!farmGetRes.ok) throw new Error('Failed to fetch usersfarm SHA');
      const farmData = await farmGetRes.json();

      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/security/usersfarm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Atualizar usersfarm via DNMenu Manager',
          content: btoa(unescape(encodeURIComponent(usersFarmContent))),
          branch: BRANCH,
          sha: farmData.sha
        })
      });

      setSaveStatus('salvo');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Erro ao exportar para GitHub:', error);
      alert('❌ Erro ao exportar para GitHub');
      setSaveStatus('erro');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const filteredUsers = (activeTab === 'users' ? users : usersFarm).filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length + usersFarm.length;
  const activeTokens = [...users, ...usersFarm].filter(u => u.expiration === null || new Date(u.expiration) > new Date()).length;

  if (!session) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-purple-950 flex items-center justify-center p-4 overflow-hidden relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-[150%] h-[150%] bg-purple-800 rounded-full opacity-20 blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-[150%] h-[150%] bg-purple-600 rounded-full opacity-20 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900/40 to-transparent animate-slide"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent to-purple-900/40 animate-slide-fast"></div>
        </div>

        <motion.div
          className="relative bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 w-full max-w-xl border border-purple-700/60 animate-glow z-10"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-50 animate-pulse-slow"></div>
              <div className="relative bg-gradient-to-br from-purple-800 to-purple-600 p-6 rounded-full shadow-xl">
                <Drama className="w-12 h-12 text-purple-200 animate-spin-slow" />
              </div>
            </motion.div>
          </div>

          <h1 className="text-5xl font-extrabold text-center bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent mb-4">
            DNMenu Manager
          </h1>
          <p className="text-gray-300 text-center mb-12 font-semibold text-lg tracking-wide">
            Gerencie seus acessos com segurança e eficiência
          </p>

          <div className="space-y-6">
            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <label className="block text-sm font-bold text-gray-200 mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-purple-900/30 border border-purple-600 rounded-2xl p-4 text-gray-100 placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-all duration-300 hover:border-purple-500 hover:scale-102 shadow-md"
                placeholder="seu@email.com"
              />
            </motion.div>

            <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <label className="block text-sm font-bold text-gray-200 mb-2 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-purple-900/30 border border-purple-600 rounded-2xl p-4 text-gray-100 placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-all duration-300 hover:border-purple-500 hover:scale-102 shadow-md"
                placeholder="********"
              />
            </motion.div>

            <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <label className="block text-sm font-bold text-gray-200 mb-2 uppercase tracking-wider">
                Reseller
              </label>
              <select
                value={selectedReseller}
                onChange={(e) => setSelectedReseller(e.target.value)}
                className="w-full bg-purple-900/30 border border-purple-600 rounded-2xl p-4 text-gray-100 focus:border-purple-400 focus:outline-none transition-all duration-300 hover:border-purple-500 hover:scale-102 shadow-md"
              >
                <option value="Reseller 1">Reseller 1</option>
                <option value="Reseller 2">Reseller 2</option>
                <option value="Reseller 3">Reseller 3</option>
                <option value="Reseller 4">Reseller 4</option>
              </select>
            </motion.div>

            {error && (
              <motion.p
                className="text-red-500 text-sm text-center font-medium"
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
              className="w-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-bold py-4 rounded-2xl hover:from-purple-500 hover:to-purple-300 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 animate-gradient-x shadow-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
              {isLoading && <Clock className="w-5 h-5 animate-spin" />}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-purple-950 p-8 overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-1/3 -left-1/3 w-2/3 h-2/3 bg-purple-700 rounded-full blur-3xl animate-bounce-slow"></div>
        <div className="absolute -bottom-1/3 -right-1/3 w-2/3 h-2/3 bg-purple-500 rounded-full blur-3xl animate-bounce-slow" style={{ animationDelay: '0.7s' }}></div>
      </div>

      <header className="relative flex justify-between items-center mb-12">
        <motion.h1
          className="text-5xl font-extrabold bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          DNMenu Manager - {selectedReseller}
        </motion.h1>
        <motion.button
          onClick={handleLogout}
          className="flex items-center gap-3 text-gray-300 hover:text-purple-300 transition-colors text-lg font-semibold"
          whileHover={{ scale: 1.05 }}
        >
          <LogOut className="w-6 h-6" />
          Sair
        </motion.button>
      </header>

      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="bg-gradient-to-br from-purple-900/50 to-black/50 p-6 rounded-2xl shadow-lg border border-purple-700/30 text-center">
          <h3 className="text-2xl font-bold text-purple-300">Usuários Totais</h3>
          <p className="text-4xl font-extrabold text-white mt-2">{totalUsers}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-black/50 p-6 rounded-2xl shadow-lg border border-purple-700/30 text-center">
          <h3 className="text-2xl font-bold text-purple-300">Tokens Ativos</h3>
          <p className="text-4xl font-extrabold text-white mt-2">{activeTokens}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-black/50 p-6 rounded-2xl shadow-lg border border-purple-700/30 text-center">
          <h3 className="text-2xl font-bold text-purple-300">Última Atualização</h3>
          <p className="text-4xl font-extrabold text-white mt-2">{new Date().toLocaleDateString()}</p>
        </div>
      </motion.div>

      <motion.div
        className="flex gap-8 mb-10"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setActiveTab('users')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-md ${activeTab === 'users' ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-white' : 'bg-purple-900/40 text-gray-300 hover:bg-purple-800/60'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('usersFarm')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-md ${activeTab === 'usersFarm' ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-white' : 'bg-purple-900/40 text-gray-300 hover:bg-purple-800/60'}`}
        >
          Users Farm
        </button>
      </motion.div>

      <motion.div
        className="bg-gradient-to-br from-purple-900/60 to-black/60 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-purple-700/40 animate-glow"
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex gap-5">
            <input
              value={activeTab === 'users' ? newUser : newUserFarm}
              onChange={(e) => activeTab === 'users' ? setNewUser(e.target.value) : setNewUserFarm(e.target.value)}
              className="flex-1 bg-purple-900/40 border border-purple-600 rounded-2xl p-5 text-gray-100 placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-all duration-300 hover:border-purple-500 hover:scale-102 shadow-sm"
              placeholder="Adicionar username"
            />
            <select
              value={activeTab === 'users' ? selectedDuration : selectedDurationFarm}
              onChange={(e) => activeTab === 'users' ? setSelectedDuration(e.target.value) : setSelectedDurationFarm(e.target.value)}
              className="bg-purple-900/40 border border-purple-600 rounded-2xl p-5 text-gray-100 focus:border-purple-400 focus:outline-none transition-all duration-300 hover:border-purple-500 hover:scale-102 shadow-sm"
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="lifetime">Vitalício</option>
            </select>
            <motion.button
              onClick={addUser}
              className="bg-gradient-to-r from-purple-600 to-purple-400 text-white px-8 py-5 rounded-2xl hover:from-purple-500 hover:to-purple-300 flex items-center gap-3 animate-gradient-x shadow-md"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <UserPlus className="w-6 h-6" />
              Adicionar
            </motion.button>
          </div>

          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-purple-900/40 border border-purple-600 rounded-2xl p-5 text-gray-100 placeholder-gray-400 focus:border-purple-400 focus:outline-none transition-all duration-300 pl-12 shadow-sm"
              placeholder="Buscar usuário..."
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.username}
              className="bg-gradient-to-br from-purple-900/50 to-black/50 border border-purple-700/50 p-8 rounded-2xl flex flex-col justify-between transition-all hover:bg-purple-900/70 hover:shadow-purple-400/40 hover:scale-105 shadow-md animate-glow"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex justify-between items-start">
                <span className="text-xl font-bold text-purple-200">{user.username}</span>
                <motion.button
                  onClick={() => removeUser(activeTab, user.username)}
                  className="text-red-400 hover:text-red-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                >
                  <Trash2 className="w-6 h-6" />
                </motion.button>
              </div>
              <div className="mt-6 flex items-center gap-3 text-base">
                <span className={getDurationColor(user.duration) + ' font-semibold'}>{formatTimeRemaining(user.expiration)}</span>
                {getDurationIcon(user.duration)}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={exportToGitHub}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-purple-600 to-purple-400 p-4 rounded-full shadow-lg hover:from-purple-500 hover:to-purple-300 transition-all duration-300 flex items-center justify-center animate-gradient-x"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Salvar no GitHub"
      >
        {saveStatus === 'salvando' ? (
          <Clock className="w-6 h-6 animate-spin text-white" />
        ) : saveStatus === 'salvo' ? (
          <CheckCircle className="w-6 h-6 text-green-200" />
        ) : saveStatus === 'erro' ? (
          <XCircle className="w-6 h-6 text-red-200" />
        ) : (
          <Github className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </motion.div>
  );
}