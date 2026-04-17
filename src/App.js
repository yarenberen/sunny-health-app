import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';
import { motion, AnimatePresence } from "framer-motion";

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
  
  // Isı Haritası Kontrolü
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (user) {
      const userSpecificKey = `history_${user.email}`;
      let savedHistory = JSON.parse(localStorage.getItem(userSpecificKey)) || [];
      const cleanedHistory = savedHistory.map(item => {
        if (item.isCorrect === undefined || item.isCorrect === null) {
          return { ...item, isCorrect: null };
        }
        return item;
      });
      setHistory(cleanedHistory);
    }
  }, [user]);

  const updateFeedback = (id, isCorrect) => {
    const userSpecificKey = `history_${user.email}`;
    const updatedHistory = history.map(item => item.id === id ? { ...item, isCorrect } : item);
    setHistory(updatedHistory);
    localStorage.setItem(userSpecificKey, JSON.stringify(updatedHistory));
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (authData.email && authData.password) setUser({ email: authData.email });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setResult(null);
    setShowHeatmap(false);
    setFile(selectedFile);
    if (selectedFile) setPreview(URL.createObjectURL(selectedFile));
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
        id: data.analysis_id || Date.now(),
        tarih: new Date().toLocaleString(),
        tur: mode === 'xray' ? 'Röntgen' : 'Tomografi',
        sonuc: data.status,
        guven: data.confidence,
        img: data.archive_url, // Arşivlenen resim
        isCorrect: null
      };

      const userSpecificKey = `history_${user.email}`;
      const güncelGecmis = [...history, yeniKayit];
      setHistory(güncelGecmis);
      localStorage.setItem(userSpecificKey, JSON.stringify(güncelGecmis));
    } catch (error) {
      alert("Backend bağlantı hatası! Lütfen Flask'ın 5001 portunda çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  };

  const validatedData = history.filter(h => h.isCorrect !== null);
  const accuracy = validatedData.length > 0 
    ? ((validatedData.filter(h => h.isCorrect === true).length / validatedData.length) * 100).toFixed(1) 
    : "100";

  const chartData = [
    { name: 'Normal', value: history.filter(h => h.sonuc.includes('Normal')).length },
    { name: 'Riskli', value: history.filter(h => !h.sonuc.includes('Normal')).length },
  ];
  const COLORS = ['#00C49F', '#FF4444'];

  if (!user) {
    return (
      <div className="auth-wrapper">
        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="auth-container">
          <h2>☀️ SUNNY {isLoginView ? 'Giriş' : 'Kayıt'}</h2>
          <form onSubmit={handleAuth}>
            <input type="email" placeholder="E-posta" onChange={(e) => setAuthData({ ...authData, email: e.target.value })} required />
            <input type="password" placeholder="Şifre" onChange={(e) => setAuthData({ ...authData, password: e.target.value })} required />
            <button type="submit" className="auth-btn">{isLoginView ? 'Giriş Yap' : 'Kayıt Ol'}</button>
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
      <nav className="navbar no-print">
        <div className="nav-brand">☀️ SUNNY</div>
        <div className="nav-links">
          <button className={view === 'analyze' ? 'active-nav' : ''} onClick={() => setView('analyze')}>Analiz Yap</button>
          <button className={view === 'reports' ? 'active-nav' : ''} onClick={() => setView('reports')}>Sağlık Raporlarım</button>
          <button onClick={() => { setUser(null); setResult(null); }} className="logout-btn">Çıkış</button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.main key={view} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="dashboard">
          
          {view === 'analyze' ? (
            <div className="analyze-section">
              <div className="control-panel no-print">
                <h2>Akciğer Analiz Uzmanı</h2>
                <select value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} className="mode-select">
                  <option value="xray">🩻 Röntgen (X-Ray)</option>
                  <option value="ct">🌀 Tomografi (CT-Scan)</option>
                </select>
                <div className="upload-box">
                  <input type="file" id="ai-upload" onChange={handleFileChange} hidden />
                  <label htmlFor="ai-upload" className="dropzone">
                    {preview ? <img src={preview} alt="Önizleme" /> : "Görüntü Yükle"}
                  </label>
                  <button className="run-btn" onClick={handleUpload} disabled={loading || !file}>
                    {loading ? "SUNNY Analiz Ediyor..." : "Analizi Başlat"}
                  </button>
                </div>
              </div>

              {result && (
                <motion.div layoutId="result" className={`result-card print-area ${result.status.includes('Normal') ? 'success' : 'danger'}`}>
                  <div className="report-header">
                    <h3>SUNNY AI Tıbbi Analiz Raporu</h3>
                    <p>Analiz ID: {result.analysis_id}</p>
                  </div>
                  
                  <div className="diagnostic-viewer">
                    <img 
                      src={showHeatmap ? result.heatmap_url : result.archive_url} 
                      alt="Diagnosis" 
                      className="main-img"
                    />
                    <div className="side-info">
                      <h4>TEŞHİS: {result.status}</h4>
                      <p className="confidence">Güven Skoru: {result.confidence}</p>
                      <div className="btn-group no-print">
                        <button onClick={() => setShowHeatmap(!showHeatmap)} className="heatmap-toggle">
                          {showHeatmap ? "Normal Görünüm" : "AI Odak Noktasını Gör (Heatmap)"}
                        </button>
                        <button onClick={() => window.print()} className="print-btn">Raporu Yazdır (PDF)</button>
                      </div>
                    </div>
                  </div>
                  <p className="disclaimer">Not: Bu bir yapay zeka tahminidir, resmi teşhis yerine geçmez.</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="reports-section">
              <div className="stats-grid">
                <div className="accuracy-box">
                  <h4>🛡️ SUNNY Güvenirlik Skoru</h4>
                  <div className="accuracy-value">%{accuracy}</div>
                </div>
                <div className="chart-box" style={{height: 200}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={50} outerRadius={70} dataKey="value">
                        {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="history-list">
                <h3>Geçmiş ve Doktor Onayları</h3>
                <table>
                  <thead>
                    <tr><th>Tarih</th><th>Tür</th><th>Sonuç</th><th>Görüntü</th><th>Doktor Onayı</th></tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((item) => (
                      <tr key={item.id}>
                        <td>{item.tarih}</td>
                        <td>{item.tur}</td>
                        <td className={item.sonuc.includes('Normal') ? 'text-success' : 'text-danger'}>{item.sonuc}</td>
                        <td><a href={item.img} target="_blank" rel="noreferrer">Görüntüle</a></td>
                        <td>
                          {item.isCorrect === null ? (
                            <div className="btn-group-mini">
                              <button onClick={() => updateFeedback(item.id, true)}>✔️</button>
                              <button onClick={() => updateFeedback(item.id, false)}>❌</button>
                            </div>
                          ) : (
                            <span className={item.isCorrect ? "badge-success" : "badge-danger"}>
                              {item.isCorrect ? "Onaylandı" : "Hatalı"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default App;