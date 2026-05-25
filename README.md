# snoRNA-BIU

## Quick start
1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `docker-compose up -d postgres`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run import:data`.
8. Run `docker-compose up -d --build`.

Frontend: `http://localhost:3000`  
API: `http://localhost:4000/health`
