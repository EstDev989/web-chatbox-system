from __future__ import annotations

import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder="static", template_folder="templates")

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chatbox.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")
    rank = db.Column(db.String(30), default="New")
    color = db.Column(db.String(30), default="white")
    status = db.Column(db.String(20), default="active")
    mute_until = db.Column(db.DateTime, nullable=True)
    ban_until = db.Column(db.DateTime, nullable=True)
    message_count = db.Column(db.Integer, default=0)


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    color = db.Column(db.String(30), default="white")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def get_rank_for_message_count(count: int) -> str:
    if count >= 250:
        return "Legend"
    if count >= 150:
        return "Diamond"
    if count >= 75:
        return "Gold"
    if count >= 30:
        return "Silver"
    if count >= 10:
        return "Bronze"
    return "New"


def create_demo_admin() -> None:
    admin = User.query.filter_by(username="admin").first()
    if not admin:
        admin = User(
            username="admin",
            password_hash=generate_password_hash("admin123"),
            role="admin",
            rank="Legend",
            color="#ffd166",
            status="active",
            message_count=0,
        )
        db.session.add(admin)
        db.session.commit()


def generate_bot_reply(text: str) -> str:
    message = (text or "").lower()
    if "hello" in message or "hi" in message:
        return "Hello! Welcome to the chat room. Want to play Snake, Bird Shooter, or Pizza Maker?"
    if "rank" in message:
        return "Your rank increases as you chat. Ranks: New, Bronze, Silver, Gold, Diamond, Legend."
    if "snake" in message:
        return "Snake is live in the games panel. Use the arrow keys to play."
    if "bird" in message or "shoot" in message:
        return "Bird Shooter is ready. Click the birds to score points."
    if "pizza" in message:
        return "Pizza Maker is ready. Match the customer order to win."
    if "youtube" in message or "spotify" in message or "music" in message:
        return "Use the media buttons at the top to open YouTube, Spotify, or music links."
    if "admin" in message:
        return "Admins can mute, kick, ban, change colors, and adjust ranks."
    if "help" in message:
        return "Try commands like: !mute user 5, !kick user, !ban user, !color user red"
    return "I am the chat bot. Ask me about ranks, games, music, or admin tools."


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/register", methods=["POST"])
def api_register():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    color = payload.get("color") or "white"

    if not username:
        return jsonify({"error": "Username is required."}), 400
    if len(password) < 3:
        return jsonify({"error": "Password must be at least 3 characters."}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists."}), 409

    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        color=color,
        rank="New",
        role="user",
        status="active",
        message_count=0,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "success": True,
        "user": {
            "username": user.username,
            "role": user.role,
            "rank": user.rank,
            "color": user.color,
        },
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Invalid username or password."}), 401
    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password."}), 401

    now = datetime.utcnow()
    if user.ban_until and user.ban_until > now:
        return jsonify({"error": f"You are banned until {user.ban_until.strftime('%Y-%m-%d %H:%M')}"}), 403
    if user.status == "banned":
        return jsonify({"error": "You are banned from the chat room."}), 403
    if user.mute_until and user.mute_until > now:
        return jsonify({"error": f"You are muted until {user.mute_until.strftime('%Y-%m-%d %H:%M')}"}), 403

    return jsonify({
        "success": True,
        "user": {
            "username": user.username,
            "role": user.role,
            "rank": user.rank,
            "color": user.color,
        },
    })


@app.route("/api/messages")
def api_messages():
    rows = Message.query.order_by(Message.id.asc()).limit(100).all()
    return jsonify([
        {
            "id": row.id,
            "username": row.username,
            "content": row.content,
            "color": row.color,
            "created_at": row.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for row in rows
    ])


@app.route("/api/users")
def api_users():
    users = User.query.order_by(User.message_count.desc(), User.username.asc()).all()
    return jsonify([
        {
            "username": user.username,
            "role": user.role,
            "rank": user.rank,
            "color": user.color,
            "status": user.status,
            "message_count": user.message_count,
        }
        for user in users
    ])


@app.route("/api/chat", methods=["POST"])
def api_chat():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    text = (payload.get("message") or "").strip()

    if not username or not text:
        return jsonify({"error": "Username and message are required."}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found."}), 404

    now = datetime.utcnow()
    if user.ban_until and user.ban_until > now:
        return jsonify({"error": "You are banned."}), 403
    if user.status == "banned":
        return jsonify({"error": "You are banned."}), 403
    if user.mute_until and user.mute_until > now:
        return jsonify({"error": "You are muted."}), 403

    message = Message(username=user.username, content=text, color=user.color)
    db.session.add(message)
    user.message_count = (user.message_count or 0) + 1
    user.rank = get_rank_for_message_count(user.message_count)
    db.session.commit()

    if not text.lower().startswith("!"):
        bot_reply = Message(username="Bot", content=generate_bot_reply(text), color="#7ae582")
        db.session.add(bot_reply)
        db.session.commit()

    return jsonify({"success": True, "message": {
        "id": message.id,
        "username": message.username,
        "content": message.content,
        "color": message.color,
        "created_at": message.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }})


@app.route("/api/admin", methods=["POST"])
def api_admin():
    payload = request.get_json(silent=True) or {}
    admin_name = (payload.get("admin") or "").strip()
    action = (payload.get("action") or "").lower()
    target_name = (payload.get("target") or "").strip()
    value = (payload.get("value") or "").strip()
    duration_minutes = int(payload.get("duration") or 5)

    admin = User.query.filter_by(username=admin_name).first()
    if not admin or admin.role != "admin":
        return jsonify({"error": "Only admin can use admin actions."}), 403

    target = User.query.filter_by(username=target_name).first()
    if not target:
        return jsonify({"error": "Target user not found."}), 404

    if action == "ban":
        target.status = "banned"
        target.ban_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    elif action == "kick":
        target.status = "kicked"
        target.mute_until = datetime.utcnow() + timedelta(minutes=1)
    elif action == "mute":
        target.status = "muted"
        target.mute_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    elif action == "color":
        target.color = value or "#ffffff"
    elif action == "rank":
        target.rank = value or "Bronze"
    else:
        return jsonify({"error": "Unknown admin action."}), 400

    db.session.commit()
    return jsonify({"success": True, "action": action, "target": target.username})


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()})


with app.app_context():
    db.create_all()
    create_demo_admin()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
