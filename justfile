set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

default: ci

ci: lint typecheck test build

lint:
    npm run lint

typecheck:
    npm run typecheck

test:
    npm test

build:
    npm run build

dev:
    npm run dev

migrate:
    npm run migrate

db-check:
    npm run db:check

docker-build:
    docker build -t codescout:latest .

docker-up:
    docker compose up --build -d

docker-down:
    docker compose down
