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

  // --- KULLANICI VERİLERİNİ YÜKLE ---
  useEffect(() => {
    if (user) {
      const userSpecificKey = `history_${user.email}`;
      let savedHistory = JSON.parse(localStorage.getItem(userSpecificKey)) || [];
      const cleanedHistory = savedHistory.map(item => ({
        ...item,
        isCorrect: (item.isCorrect === undefined || item.isCorrect === null) ? true : item.isCorrect
      }));
      setHistory(cleanedHistory);
      localStorage.setItem(userSpecificKey, JSON.stringify(cleanedHistory));
    } else {
      setHistory([]);
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
      console.log("SUNNY Analiz Sonucu:", data); // Konsolda veriyi kontrol et kanki
      setResult(data);

      const yeniKayit = {
        id: Date.now(),
        tarih: new Date().toLocaleString(),
        tur: mode === 'xray' ? 'Röntgen' : 'Tomografi',
        sonuc: data.status,
        guven: data.confidence,
        isCorrect: null 
      };

      const userSpecificKey = `history_${user.email}`;
      const güncelGecmis = [...history, yeniKayit];
      setHistory(güncelGecmis);
      localStorage.setItem(userSpecificKey, JSON.stringify(güncelGecmis));
    } catch (error) {
      console.error(error);
      alert("Backend bağlantı hatası! Flask sunucusunun 5001 portunda çalıştığından emin ol.");
    } finally {
      setLoading(false);
    }
  };

  const validatedData = history.filter(h => h.isCorrect !== null);
  const accuracy = validatedData.length > 0 
    ? ((validatedData.filter(h => h.isCorrect === true).length / validatedData.length) * 100).toFixed(1) 
    : "100";

  const chartData = [
    { name: 'Normal', value: history.filter(h => h.sonuc && h.sonuc.includes('Normal')).length },
    { name: 'Riskli', value: history.filter(h => h.sonuc && !h.sonuc.includes('Normal')).length },
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
      <nav className="navbar">
        <div className="nav-brand">SUNNY AI</div>
        <div className="nav-links">
          <button className={view === 'analyze' ? 'active-nav' : ''} onClick={() => setView('analyze')}>Analiz Yap</button>
          <button className={view === 'reports' ? 'active-nav' : ''} onClick={() => setView('reports')}>Sağlık Raporlarım</button>
          <button onClick={() => { setUser(null); setPreview(null); setResult(null); }} className="logout-btn">Çıkış</button>
        </div>
      </nav>
 

      <AnimatePresence mode="wait">
        <motion.main key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="dashboard">
          
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
                  <label htmlFor="ai-upload" className="dropzone">
                    {preview ? <img src={preview} alt="Önizleme" className="preview-img" /> : "Görüntü Yükle"}
                  </label>
                  <button className="run-btn" onClick={handleUpload} disabled={loading || !file}>
                    {loading ? "SUNNY Analiz Ediyor..." : "Analizi Başlat"}
                  </button>
                </div>
              </div>

              {result && (
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="analysis-results-container">
                  <div className="visual-results">
                    <div className="result-img-box">
                      <h4>Orijinal Görüntü</h4>
                      <div className="img-wrapper">
                         <img src={preview} alt="Orijinal" />
                      </div>
                    </div>
                    {result.heatmap_url && (
                      <div className="result-img-box highlight">
                        <h4>Yapay Zeka Odak Noktası (Heatmap)</h4>
                        <div className="img-wrapper">
                           <img src={result.heatmap_url} alt="Heatmap" className="heatmap-img" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`result-card ${result.status.includes('Normal') ? 'success' : 'danger'}`}>
                    <div className="result-header">
                      <div className="title-group">
                        <h3>Teşhis: {result.status}</h3>
                        <p className="timestamp">{new Date().toLocaleTimeString()}</p>
                      </div>
                      <span className="confidence-badge">Güven: {result.confidence}</span>
                    </div>
                    
                    <div className="ai-comment-box">
                      <h4>🤖 SUNNY Tıbbi Yorumu</h4>
                      <p className="ai-text">"{result.ai_comment}"</p>
                    </div>

                    <div className="disclaimer-text">
                      ⚠️ Bu rapor yapay zeka tarafından üretilmiştir. Kesin tanı için radyolog onaylı raporunuzu bekleyiniz.
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="reports-section">
               {/* Raporlar Kısmı Aynı Kalıyor */}
               <div className="accuracy-box">
                <h4>🛡️ SUNNY Güvenlik Skoru</h4>
                <div className="accuracy-value">%{accuracy}</div>
                <p>Doktor onaylı verilere dayanmaktadır.</p>
              </div>

              <div className="history-list">
                <h3>Geçmiş Analizler</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Tür</th>
                      <th>Teşhis</th>
                      <th>Doktor Onayı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((item) => (
                      <tr key={item.id}>
                        <td>{item.tarih}</td>
                        <td>{item.tur}</td>
                        <td className={item.sonuc && item.sonuc.includes('Normal') ? 'text-success' : 'text-danger'}>
                          {item.sonuc}
                        </td>
                        <td>
                          {item.isCorrect === null ? (
                            <div className="btn-group">
                              <button onClick={() => updateFeedback(item.id, true)} className="btn-ok">✔️</button>
                              <button onClick={() => updateFeedback(item.id, false)} className="btn-no">❌</button>
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