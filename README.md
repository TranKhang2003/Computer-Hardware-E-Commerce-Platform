
# Tài khoản test
Email: admin@gmail.com
Mật khẩu: admin1234

# 🖥️ Computer Store – Fullstack Application

Ứng dụng bán máy tính gồm Frontend (React + Vite), Backend (Node.js + Express), MongoDB, Redis, Authentication (Google + Facebook), AWS S3, VNPay, chạy bằng Docker Compose.

# 1. Công nghệ sử dụng
Backend
Node.js + Express
MongoDB + mongoose
Redis (cache, rate limit, session)
JWT Authentication
OAuth2 (Google, Facebook)
AWS S3 Upload
VNPay Payment Gateway
Frontend
React + Vite
Zustand
Axios
TailwindCSS
Infrastructure
Docker & Docker Compose
MongoDB 7
Redis 7
Nginx (serve frontend)


# 📦 2. Yêu cầu hệ thống
# Cần cài đặt:
Docker ≥ 24.x
Docker Compose ≥ v2.x
# Kiểm tra:
docker -v
docker compose version

# 🚀 3. Hướng dẫn chạy project

# Bước 1: Khởi chạy Docker

Trong thư mục Dockerhub chạy :

docker compose up --build -d


# Bước 2 : Import dữ liệu
docker cp .\computer-store.products.json computer-store-mongodb:/data/products.json
docker exec -i computer-store-mongodb mongoimport --db computer-store --collection products --jsonArray --file /data/products.json --username admin --password admin123 --authenticationDatabase admin

docker cp .\computer-store.users.json computer-store-mongodb:/data/users.json
docker exec -i computer-store-mongodb mongoimport --db computer-store --collection users --jsonArray --file /data/users.json --username admin --password admin123 --authenticationDatabase admin


docker cp .\computer-store.brands.json computer-store-mongodb:/data/brands.json
docker exec -i computer-store-mongodb mongoimport --db computer-store --collection brands --jsonArray --file /data/brands.json --username admin --password admin123 --authenticationDatabase admin


docker cp .\computer-store.categories.json computer-store-mongodb:/data/categories.json
docker exec -i computer-store-mongodb mongoimport --db computer-store --collection categories --jsonArray --file /data/categories.json --username admin --password admin123 --authenticationDatabase admin

docker cp .\computer-store.orders.json computer-store-mongodb:/data/orders.json
docker exec -i computer-store-mongodb mongoimport --db computer-store --collection orders --jsonArray --file /data/orders.json --username admin --password admin123 --authenticationDatabase admin


# 🔧 4. Environment variables chính

Các biến quan trọng nằm trong service backend:

MongoDB
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/computer-store?authSource=admin
Redis
REDIS_URL=redis://:redis123@redis:6379

JWT
JWT_SECRET=...
JWT_EXPIRE=7d

Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=...
EMAIL_PASSWORD=...

AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=computerstore

OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

VNPay
VNP_TMN_CODE=...
VNP_HASH_SECRET=...
