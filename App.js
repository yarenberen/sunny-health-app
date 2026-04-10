import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './App.css';
import { motion, AnimatePresence } from "framer-motion"; // AnimatePresence eklendi

function App() {
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authData, setAuthData] = useState({ email: '', password: '' });
  const [view, setView] = useState('analyze'); 

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('xray');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (user) {
      const userSpecificKey = `history_${user.email}`;
      const savedHistory = JSON.parse(localStorage.getItem(userSpecificKey)) || [];
      setHistory(savedHistory);
    } else {
      setHistory([]);
    }
  }, [user]);

  const handleAuth = (e) => {
    e.preventDefault();
    if (authData.email && authData.password) {
      setUser({ email: authData.email });
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setResult(null);
    setFile(selectedFile);
    if (selectedFile) {
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    try {
      const response = await fetch('http://127.0.0.1:5001/predict', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);

      const yeniKayit = {
        id: Date.now(),
        tarih: new Date().toLocaleString(),
        tur: mode === 'xray' ? 'Röntgen' : 'Tomografi',
        sonuc: data.status,
        guven: data.confidence
      };

      const userSpecificKey = `history_${user.email}`;
      const mevcutGecmis = JSON.parse(localStorage.getItem(userSpecificKey)) || [];
      const güncelGecmis = [...mevcutGecmis, yeniKayit];

      setHistory(güncelGecmis);
      localStorage.setItem(userSpecificKey, JSON.stringify(güncelGecmis));
    } catch (error) {
      alert("Backend bağlantı hatası!");
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Normal', value: history.filter(h => h.sonuc.includes('Normal')).length },
    { name: 'Riskli', value: history.filter(h => !h.sonuc.includes('Normal')).length },
  ];
  const COLORS = ['#00C49F', '#FF4444'];

  // --- ANIMASYON DEĞİŞKENLERİ ---
  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  if (!user) {
    return (
      <div className="auth-wrapper">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="auth-container"
        >
          <h2>☀️ SUNNY {isLoginView ? 'Giriş' : 'Kayıt'}</h2>
          <form onSubmit={handleAuth}>
            <input type="email" placeholder="E-posta" onChange={(e) => setAuthData({ ...authData, email: e.target.value })} required />
            <input type="password" placeholder="Şifre" onChange={(e) => setAuthData({ ...authData, password: e.target.value })} required />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit" 
              className="auth-btn"
            >
              {isLoginView ? 'Giriş Yap' : 'Kayıt Ol'}
            </motion.button>
          </form>
          <p onClick={() => setIsLoginView(!isLoginView)} style={{cursor:'pointer', marginTop:'10px'}}>
            {isLoginView ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten üye misin? Giriş Yap'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-brand">SUNNY</div>
        <div className="nav-links">
          <button className={view === 'analyze' ? 'active-nav' : ''} onClick={() => setView('analyze')}>Analiz Yap</button>
          <button className={view === 'reports' ? 'active-nav' : ''} onClick={() => setView('reports')}>Sağlık Raporlarım</button>
          <button onClick={() => { setUser(null); setPreview(null); setResult(null); }} className="logout-btn">Çıkış</button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.main 
          key={view}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4 }}
          className="dashboard"
        >
          {view === 'analyze' ? (
            <div className="analyze-section">
              <div className="control-panel">
                <h2>Akciğer Analiz Uzmanı</h2>
                <div className="mode-selection">
                  <label>Analiz Türü: </label>
                  <select value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} className="mode-select">
                    <option value="xray">🩻 Röntgen (X-Ray)</option>
                    <option value="ct">🌀 Tomografi (CT-Scan)</option>
                  </select>
                </div>

                <div className="upload-box">
                  <input type="file" id="ai-upload" onChange={handleFileChange} hidden />
                  <motion.label 
                    whileHover={{ scale: 1.02 }}
                    htmlFor="ai-upload" 
                    className="dropzone"
                  >
                    {preview ? <img src={preview} alt="Önizleme" /> : "Görüntü Yükle"}
                  </motion.label>
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0px 0px 8px rgb(0,210,255)" }}
                    whileTap={{ scale: 0.95 }}
                    className="run-btn" 
                    onClick={handleUpload} 
                    disabled={loading || !file}
                  >
                    {loading ? "Analiz Ediliyor..." : "SUNNY Analizini Başlat"}
                  </motion.button>
                </div>
              </div>

              {result && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`result-card ${result.status.includes('Normal') ? 'success' : 'danger'}`}
                >
                  <h3>Teşhis: {result.status}</h3>
                  <p>Güven: {result.confidence}</p>
                  <div className="bar-container"><div className="bar-fill" style={{ width: result.confidence }}></div></div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="reports-section">
              <h2 className="section-title">🩺 {user.email} - Sağlık Raporları</h2>
              
              {history.length > 0 ? (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="chart-container" 
                    style={{ width: '100%', height: 300 }}
                  >
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <div className="history-list">
                    <h3>Geçmiş Analizler</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Tür</th>
                          <th>Sonuç</th>
                          <th>Güven</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().map((item, index) => (
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            key={item.id}
                          >
                            <td>{item.tarih}</td>
                            <td>{item.tur}</td>
                            <td className={item.sonuc.includes('Normal') ? 'text-success' : 'text-danger'}>{item.sonuc}</td>
                            <td>{item.guven}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p>Henüz bir analiz yapmamışsınız. "Analiz Yap" sayfasından başlayabilirsiniz.</p>
                </div>
              )}
            </div>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default App;