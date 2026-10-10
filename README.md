# Web Chatbox with Games

A full stack web chat room with:
- AJAX-powered live chat
- Python Flask backend
- MySQL-ready database configuration
- user ranks and leaderboard
- admin tools: ban, kick, mute, color, rank
- chatbot support
- mini games: Snake, Bird Shooter, Pizza Maker
- media buttons for YouTube, Spotify, and music links

## Features

- Chat room with live updates
- Modern dark UI
- User login and registration
- Rank progression
- Admin login (`admin` / `admin123`)
- Color names and custom theme styling
- Snake canvas game
- Bird shooting arcade game
- Pizza ordering browser game
- Media shortcuts and links

## Run locally

1. Create a virtual environment
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Start the app
   ```bash
   python app.py
   ```

4. Open in browser
   ```text
   http://localhost:5000
   ```

## MySQL setup

The app supports MySQL by setting the `DATABASE_URL` environment variable.

Example:
```bash
export DATABASE_URL="mysql+pymysql://username:password@localhost/chatbox"
python app.py
```

If you do not set it, the app falls back to a local SQLite database.

## Admin login

- Username: `admin`
- Password: `admin123`

## Game controls

- Snake: arrow keys
- Bird shooter: click birds
- Pizza maker: click ingredients to match the order

## Project structure

```text
app.py
requirements.txt
README.md
static/
  css/styles.css
  js/app.js
templates/
  index.html
database/
  schema.sql
```
