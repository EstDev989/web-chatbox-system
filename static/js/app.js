const state = {
    user: null,
    messages: [],
    users: [],
};

const mediaLinks = {
    youtube: 'https://www.youtube.com',
    spotify: 'https://open.spotify.com',
    music: 'https://www.youtube.com/results?search_query=lofi+music',
};

function fetchJson(url, options = {}) {
    return fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    }).then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.error || 'Request failed');
        }
        return json;
    });
}

function setStatus(message, isError = false) {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#fca5a5' : '#7dd3fc';
}

function renderMessages() {
    const container = document.getElementById('messages');
    if (!container) return;
    container.innerHTML = '';

    state.messages.forEach((msg) => {
        const node = document.createElement('div');
        node.className = 'message';
        node.style.borderLeftColor = msg.color || '#38bdf8';
        node.innerHTML = `
            <strong style="color:${msg.color || '#fff'};">${msg.username}</strong>
            <div>${escapeHtml(msg.content)}</div>
        `;
        container.appendChild(node);
    });
    container.scrollTop = container.scrollHeight;
}

function renderUsers() {
    const list = document.getElementById('userList');
    if (!list) return;

    list.innerHTML = '';
    state.users.forEach((user) => {
        const item = document.createElement('li');
        item.innerHTML = `
            <div style="color:${user.color || '#fff'}; font-weight: 700;">${user.username}</div>
            <small>Rank: ${user.rank} | ${user.role} | ${user.status}</small>
        `;
        list.appendChild(item);
    });
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateUserState(user) {
    state.user = user;
    const welcome = document.getElementById('welcomeUser');
    if (welcome) {
        welcome.textContent = user ? `${user.username} / ${user.rank}` : 'Guest';
    }
    const loginBox = document.getElementById('loginBox');
    const chatBox = document.getElementById('chatBox');
    const adminBox = document.getElementById('adminBox');

    if (user) {
        loginBox.classList.add('hidden');
        chatBox.classList.remove('hidden');
        if (user.role === 'admin') {
            adminBox.classList.remove('hidden');
        }
    } else {
        loginBox.classList.remove('hidden');
        chatBox.classList.add('hidden');
        adminBox.classList.add('hidden');
    }
}

async function loadMessages() {
    try {
        const data = await fetchJson('/api/messages');
        state.messages = data;
        renderMessages();
    } catch (error) {
        console.error(error);
    }
}

async function loadUsers() {
    try {
        const data = await fetchJson('/api/users');
        state.users = data;
        renderUsers();
    } catch (error) {
        console.error(error);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const color = document.getElementById('registerColor').value || '#ffffff';

    try {
        const result = await fetchJson('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, color }),
        });
        setStatus('Account created! You can log in now.');
        document.getElementById('registerForm').reset();
        updateUserState(null);
        console.log(result);
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const result = await fetchJson('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        setStatus('Logged in successfully.');
        updateUserState(result.user);
        loadUsers();
        document.getElementById('loginForm').reset();
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function handleChat(event) {
    event.preventDefault();
    if (!state.user) {
        setStatus('Log in first to chat.', true);
        return;
    }

    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    try {
        await fetchJson('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ username: state.user.username, message }),
        });
        input.value = '';
        await loadMessages();
        await loadUsers();
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function handleAdminAction(event) {
    event.preventDefault();
    if (!state.user || state.user.role !== 'admin') {
        setStatus('Only admin can use admin tools.', true);
        return;
    }

    const action = document.getElementById('adminAction').value;
    const target = document.getElementById('adminTarget').value.trim();
    const value = document.getElementById('adminValue').value.trim();
    const duration = Number(document.getElementById('adminDuration').value || 5);

    try {
        await fetchJson('/api/admin', {
            method: 'POST',
            body: JSON.stringify({
                admin: state.user.username,
                action,
                target,
                value,
                duration,
            }),
        });
        setStatus('Admin action completed.');
        await loadUsers();
    } catch (error) {
        setStatus(error.message, true);
    }
}

function bindMediaButtons() {
    document.querySelectorAll('[data-media]').forEach((button) => {
        button.addEventListener('click', () => {
            const type = button.dataset.media;
            window.open(mediaLinks[type], '_blank');
        });
    });
}

function init() {
    bindMediaButtons();
    updateUserState(null);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('chatForm').addEventListener('submit', handleChat);
    document.getElementById('adminForm').addEventListener('submit', handleAdminAction);
    loadMessages();
    loadUsers();
    setInterval(loadMessages, 2000);
    setInterval(loadUsers, 5000);

    initSnakeGame();
    initBirdGame();
    initPizzaGame();
}

window.addEventListener('DOMContentLoaded', init);

function initSnakeGame() {
    const canvas = document.getElementById('snakeCanvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    let snake = [{ x: 10, y: 10 }];
    let direction = { x: 1, y: 0 };
    let food = { x: 5, y: 5 };
    let score = 0;
    let loop = null;

    function resetGame() {
        snake = [{ x: 10, y: 10 }];
        direction = { x: 1, y: 0 };
        food = { x: 5, y: 5 };
        score = 0;
    }

    function placeFood() {
        food = {
            x: Math.floor(Math.random() * 19),
            y: Math.floor(Math.random() * 19),
        };
    }

    function update() {
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            resetGame();
            return;
        }

        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                resetGame();
                return;
            }
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            placeFood();
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < snake.length; i++) {
            ctx.fillStyle = i === 0 ? '#22c55e' : '#4ade80';
            ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
        }

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px Arial';
        ctx.fillText('Score: ' + score, 12, 18);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' && direction.y !== 1) direction = { x: 0, y: -1 };
        if (event.key === 'ArrowDown' && direction.y !== -1) direction = { x: 0, y: 1 };
        if (event.key === 'ArrowLeft' && direction.x !== 1) direction = { x: -1, y: 0 };
        if (event.key === 'ArrowRight' && direction.x !== -1) direction = { x: 1, y: 0 };
    });

    function gameLoop() {
        update();
        draw();
    }

    if (loop) clearInterval(loop);
    loop = setInterval(gameLoop, 120);
}

function initBirdGame() {
    const canvas = document.getElementById('birdCanvas');
    const ctx = canvas.getContext('2d');
    let birds = [];
    let score = 0;
    let lastSpawn = 0;

    function spawnBird() {
        birds.push({
            x: Math.random() * (canvas.width - 50),
            y: Math.random() * 180 + 20,
            radius: 18 + Math.random() * 12,
            speedX: 1 + Math.random() * 2,
            speedY: Math.random() * 1.6 - 0.8,
        });
    }

    function tick() {
        const now = performance.now();
        if (now - lastSpawn > 800) {
            spawnBird();
            lastSpawn = now;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        birds.forEach((bird, index) => {
            bird.x += bird.speedX;
            bird.y += bird.speedY;

            if (bird.x > canvas.width || bird.x < 0) bird.speedX *= -1;
            if (bird.y > canvas.height - 60 || bird.y < 20) bird.speedY *= -1;

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#111827';
            ctx.fillRect(bird.x - 6, bird.y - 2, 12, 4);
        });

        ctx.fillStyle = '#f8fafc';
        ctx.font = '18px Arial';
        ctx.fillText('Score: ' + score, 12, 24);
    }

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let i = birds.length - 1; i >= 0; i--) {
            const bird = birds[i];
            const dx = bird.x - x;
            const dy = bird.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bird.radius + 5) {
                birds.splice(i, 1);
                score += 10;
                break;
            }
        }
    });

    setInterval(tick, 30);
}

function initPizzaGame() {
    const orderBox = document.getElementById('pizzaOrder');
    const pizzaStatus = document.getElementById('pizzaStatus');
    const ingredientButtons = document.querySelectorAll('[data-ingredient]');
    const recipe = ['cheese', 'sauce', 'pepperoni', 'mushroom', 'pineapple'];
    let order = [];
    let total = 0;

    function buildOrder() {
        order = recipe.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        orderBox.textContent = 'Order: ' + order.join(', ');
        total = 0;
        pizzaStatus.textContent = 'Make the pizza!';
        ingredientButtons.forEach((button) => {
            button.classList.remove('selected');
        });
    }

    ingredientButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const ingredient = button.dataset.ingredient;
            if (!order.includes(ingredient)) {
                pizzaStatus.textContent = 'Wrong ingredient!';
                return;
            }
            total += 1;
            button.classList.add('selected');
            if (total === order.length) {
                pizzaStatus.textContent = 'Perfect pizza! Great job!';
                setTimeout(buildOrder, 1000);
            } else {
                pizzaStatus.textContent = 'Nice! Keep going...';
            }
        });
    });

    buildOrder();
}
