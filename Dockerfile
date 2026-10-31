FROM node:26-alpine AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY angular.json tsconfig.json ngsw-config.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.15.2-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=web /app/dist ./dist
RUN useradd --create-home trader
USER trader
EXPOSE 8765
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8765"]
