from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- 1. MODELLERİ YÜKLE ---
# Eğitimde kaydettiğimiz isimlerle yüklüyoruz
model_xray = tf.keras.models.load_model('models/sunny_xray_expert.h5')
model_ct = tf.keras.models.load_model('models/sunny_ct_expert.h5')

def prepare_image(file_path):
    img = cv2.imread(file_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) # Modeller RGB eğitildi
    img = cv2.resize(img, (224, 224))
    img = img / 255.0
    return np.expand_dims(img, axis=0)

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "Dosya gönderilmedi"}), 400
    
    file = request.files['file']
    # React'ten gelen 'mode' bilgisini al (varsayılan: xray)
    mode = request.form.get('mode', 'xray') 

    if file:
        filename = secure_filename(file.filename)
        upload_dir = "static/uploads"
        if not os.path.exists(upload_dir): os.makedirs(upload_dir)
        
        path = os.path.join(upload_dir, filename)
        file.save(path)
        
        prepared_img = prepare_image(path)

        # --- MOD SEÇİMİ VE ANALİZ ---
        if mode == 'xray':
            # Röntgen Modeli Tahmini
            prediction = model_xray.predict(prepared_img)
            # Sigmoid aktivasyon kullanıldıysa tek bir değer döner
            prob = float(prediction[0][0])
            
            # DÜZELTME: 0.5'ten BÜYÜKSE Zatürre (1), KÜÇÜKSE Normal (0)
            if prob > 0.5:
                status = "Zatürre (Pneumonia)"
                confidence = prob * 100
            else:
                status = "Normal"
                confidence = (1 - prob) * 100
            
            all_probs = {
                "normal": (1 - prob), 
                "pneumonia": prob, 
                "cancer": 0.0
            }
        

        else:
            # Tomografi Modeli (Categorical: Kanser vs Normal)
            prediction = model_ct.predict(prepared_img)
            # Not: Eğitimdeki klasör sırasına göre indexleri kontrol et (Genelde 0:Cancer, 1:Normal)
            class_names = ["Akciğer Kanseri (Lung Cancer)", "Normal"]
            class_index = np.argmax(prediction[0])
            
            status = class_names[class_index]
            confidence = float(prediction[0][class_index]) * 100
            all_probs = {
                "cancer": float(prediction[0][0]),
                "normal": float(prediction[0][1]),
                "pneumonia": 0.0
            }

        return jsonify({
            "status": status,
            "confidence": f"%{confidence:.2f}",
            "mode_used": mode,
            "all_probabilities": all_probs
        })

if __name__ == '__main__':
    # 5000 yerine 5001 kullanıyoruz
    app.run(debug=True, port=5001, host='0.0.0.0')