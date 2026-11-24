# Chatbot UI backend

## Setup

From this directory, install dependencies and create a local environment file:

```sh
npm install
Copy-Item .env.example .env
```

Start the development server with `npm run dev`, or use `npm start` for a regular start. The API listens on port 3000 by default and exposes `GET /api/health`.

Set `PORT` and `CLIENT_URL` in `.env` to override the defaults.
