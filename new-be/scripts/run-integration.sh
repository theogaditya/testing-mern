set -e
docker compose up -d
echo 'Waiting for database to be ready.............'
 ./scripts/wait-for-it.sh localhost:5432
echo 'Database is ready!!!!!!!!!!!!!'
npx prisma migrate dev 
npx prisma generate
bun run build
npx vitest ./test/integration.test.ts --run
docker compose down