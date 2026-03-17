# Railway’a deploy

## 1. Projeyi Railway’a bağlama

- [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
- Bu repoyu seçin (veya CLI ile `railway link`)

## 2. Ortam değişkenleri

Service → **Variables** bölümüne ekleyin:

| Değişken       | Açıklama |
|----------------|----------|
| `MONGODB_URI`  | MongoDB bağlantı adresi (Atlas veya Railway MongoDB eklentisi) |
| `JWT_SECRET`   | JWT imza anahtarı (güçlü, rastgele bir string) |

İsteğe bağlı: `JWT_EXPIRE`, `NODE_ENV`. `PORT` Railway tarafından otomatik atanır.

## 3. Build ve çalıştırma

- **Root Directory:** Boş bırakın (proje kökündeki `package.json` kullanılır).
- Build: `npm install` (root + backend bağımlılıkları).
- Start: `npm start` → backend sunucusu çalışır.

## 4. MongoDB

- **Seçenek A:** Railway → **+ New** → **Database** → **MongoDB**  
  Oluşan `MONGODB_URI` değişkenini projeye bağlayın.
- **Seçenek B:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster oluşturup connection string’i `MONGODB_URI` olarak ekleyin.

## 5. Domain

Service → **Settings** → **Networking** → **Generate Domain** ile public URL alın. Uygulama bu adreste API + frontend olarak tek adreste çalışır.
