import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

# --- 1. GENEL PARAMETRELER ---
IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 32
EPOCHS = 15

def build_model(output_classes, activation_type):
    """Her iki mod için ortak mimariyi kuran fonksiyon"""
    model = Sequential([
        Input(shape=(IMG_HEIGHT, IMG_WIDTH, 3)), # Yeni nesil giriş katmanı
        Conv2D(32, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(output_classes, activation=activation_type)
    ])
    return model

# Modellerin kaydedileceği klasörü oluştur
if not os.path.exists('models'):
    os.makedirs('models')

# --- 2. MODEL A: RÖNTGEN UZMANI (Normal vs Zatürre) ---
print("\n--- AŞAMA 1: Röntgen (X-Ray) Modeli Eğitiliyor ---")

# Röntgen için özel DataGen
xray_gen = ImageDataGenerator(rescale=1./255, shear_range=0.2, zoom_range=0.2, horizontal_flip=True)
xray_test_gen = ImageDataGenerator(rescale=1./255)

train_xray = xray_gen.flow_from_directory(
    'data/train', # data/train/NORMAL ve data/train/PNEUMONIA
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary' # 2 sınıf
)

test_xray = xray_test_gen.flow_from_directory(
    'data/test',
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary'
)

model_xray = build_model(1, 'sigmoid') # 2 sınıf için sigmoid
model_xray.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

model_xray.fit(train_xray, epochs=EPOCHS, validation_data=test_xray)
model_xray.save('models/sunny_xray_expert.h5')
print("✅ Röntgen modeli kaydedildi: models/sunny_xray_expert.h5")


# --- 3. MODEL B: TOMOGRAFİ UZMANI (Normal vs Kanser) ---
print("\n--- AŞAMA 2: Tomografi (CT-Scan) Modeli Eğitiliyor ---")

# Tomografi klasör yapısını kontrol et (data/ct/train)
train_ct = xray_gen.flow_from_directory(
    'data/ct/train', # data/ct/train/Malignant, Normal vb.
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical' # 3 sınıf (Normal, Malignant, Benign)
)

test_ct = xray_test_gen.flow_from_directory(
    'data/ct/test',
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical'
)

# Sınıf sayısını otomatik alalım (Normal, Malignant, Bengin -> 3)
num_ct_classes = len(train_ct.class_indices)

model_ct = build_model(num_ct_classes, 'softmax') # Çoklu sınıf için softmax
model_ct.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

model_ct.fit(train_ct, epochs=EPOCHS, validation_data=test_ct)
model_ct.save('models/sunny_ct_expert.h5')
print(f"✅ Tomografi modeli ({num_ct_classes} sınıf) kaydedildi: models/sunny_ct_expert.h5")

print("\n🚀 TÜM SİSTEM HAZIR! SUNNY artık çift uzmanlığa sahip.")