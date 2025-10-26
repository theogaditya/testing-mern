docker compose up -d
echo 'Waiting for database to be ready...'
./scripts/wait-for-it.sh "postgresql://postgres:admin123@localhost:5432/postgres"
echo 'Database is ready!'
npx prisma migrate dev 
npx prisma generate
npm run build
npm run test
docker compose down