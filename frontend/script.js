/**
 * Booking.com | 2026 AI Vision Demo Platform
 * Core Frontend Interactivity and Multi-Agent Orchestration Bridge
 */

const API_BASE_URL = window.location.origin.includes("localhost:3000") || window.location.origin.includes("127.0.0.1:3000")
    ? "http://localhost:8000"
    : window.location.origin;
const SESSION_ID = "laura_session_2026";

// Chat UI elements
const chatHistory = document.getElementById("chatHistory");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const consoleLogs = document.getElementById("consoleLogs");
const headerTripStatus = document.getElementById("headerTripStatus");
const resetDemoBtn = document.getElementById("resetDemoBtn");

// Scenario message presets
const SCENARIO_PRESETS = {
    1: "I'm looking for a romantic weekend getaway driving from Amsterdam",
    2: "Actually, my sister in London just had a baby, so I want to go to London instead. No car, and I'll fly. Oh, and I'm bringing Buster (my Golden Retriever)!",
    3: "Wait, do I need any special passport or vaccine papers for Buster to enter the UK now that Brexit happened?",
    4: "How far is the Hoxton Shoreditch from my sister's place at 42 Rivington Street? Can Buster and I easily walk there?",
    5: "That's perfect. Let's book the flight and lock in the double standard room at the Hoxton!"
};

// SVG element mapping
const SVG_NODES = {
    ui: document.getElementById("node-ui"),
    orch: document.getElementById("node-orch"),
    sub: document.getElementById("node-sub"),
    bq: document.getElementById("node-bq"),
    fs: document.getElementById("node-fs"),
    vs: document.getElementById("node-vs"),
    sm: document.getElementById("node-sm")
};

const SVG_LINKS = {
    ui_orch: document.getElementById("link-ui-orch"),
    orch_sub: document.getElementById("link-orch-sub"),
    orch_bq: document.getElementById("link-orch-bq"),
    orch_fs: document.getElementById("link-orch-fs"),
    sub_vs: document.getElementById("link-sub-vs"),
    sub_sm: document.getElementById("link-sub-sm")
};

// Global state
let isTyping = false;
let logPlaybackInterval = null;

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
    setupTabListeners();
    setupChatListeners();
    
    // Check backend connection status
    checkBackendHealth();
});

// --- Talk-Track Tab Controls ---
function switchTab(turn) {
    // 1. Remove active class from all tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    // 2. Add active class to the current tab button
    const activeBtn = document.getElementById(`tabBtn${turn}`);
    if (activeBtn) {
        activeBtn.classList.add("active");
    }
    
    // 3. Remove active class from all track panes
    document.querySelectorAll(".track-pane").forEach(pane => {
        pane.classList.remove("active");
    });
    // 4. Add active class to the current track pane
    const activePane = document.getElementById(`trackPane${turn}`);
    if (activePane) {
        activePane.classList.add("active");
    }
}

function setCurrentStep(turn) {
    switchTab(turn);
}

function setupTabListeners() {
    // Direct inline onclick bindings are used, no dynamic setup needed.
}

// --- Dynamic Input Height Adjustment ---
function adjustInputHeight() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
}

// --- Chat listeners ---
function setupChatListeners() {
    sendBtn.addEventListener("click", () => handleManualSend());
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleManualSend();
        }
    });
    chatInput.addEventListener("input", adjustInputHeight);
    
    resetDemoBtn.addEventListener("click", () => resetDemoScenario());
}

// --- Backend health check ---
async function checkBackendHealth() {
    const statusText = document.getElementById("logConnectionStatus");
    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        const data = await res.json();
        if (data.status === "ok") {
            statusText.textContent = "Online";
            statusText.style.color = "#10b981";
            appendLogLine("system", "Connected to local GCP-ADK 2.0 microservices at localhost:8000.");
        }
    } catch (err) {
        statusText.textContent = "Offline";
        statusText.style.color = "#ef4444";
        appendLogLine("system", "WARNING: Backend offline. Please start FastAPI (uvicorn app:app) on port 8000.", null);
    }
}

// --- Core Turn Triggering (The Presenter's Magic Wand) ---
async function triggerTurn(turnNum) {
    if (isTyping) return;
    
    // Auto activate the correct talk-track tab first
    setCurrentStep(turnNum);
    
    const queryText = SCENARIO_PRESETS[turnNum];
    if (!queryText) return;
    
    isTyping = true;
    chatInput.value = "";
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // Simulate natural typing speed inside input field
    let i = 0;
    const speed = 15; // ms per char (fast but visible)
    
    function typeChar() {
        if (i < queryText.length) {
            chatInput.value += queryText.charAt(i);
            i++;
            adjustInputHeight();
            chatInput.scrollTop = chatInput.scrollHeight;
            setTimeout(typeChar, speed);
        } else {
            // Typing complete, submit message
            setTimeout(() => {
                chatInput.disabled = false;
                sendBtn.disabled = false;
                isTyping = false;
                submitChatMessage(queryText);
                chatInput.value = "";
                adjustInputHeight();
            }, 300);
        }
    }
    
    typeChar();
}

function handleManualSend() {
    const text = chatInput.value.trim();
    if (!text || isTyping) return;
    submitChatMessage(text);
    chatInput.value = "";
    adjustInputHeight();
}

// --- Submit and Process Message ---
async function submitChatMessage(message) {
    // 1. Render User Message
    appendUserMessage(message);
    
    // 2. Clear any active SVG lights and highlight UI-to-Orchestrator pathway
    resetSvgHighlights();
    highlightSvgPath("ui", "ui_orch", "orch");
    
    // 3. Show Dot's typing indicator
    showTypingIndicator();
    
    // 4. Send Request to FastAPI backend
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: SESSION_ID,
                message: message
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
        }
        
        const result = await response.json();
        
        // 5. Playback detailed GCP architecture logs
        playGcpArchitectureLogs(result.logs, () => {
            // 6. Once logs finish playing back, render Dot's premium response and cards
            hideTypingIndicator();
            renderDotResponse(result.response, result.cards, result.turn);
            
            // Adjust trip status banner dynamically in the header
            updateTripHeader(result.turn);
            
            // Auto-advance to the next turn's speaker panel to guide the presenter!
            if (result.turn < 5) {
                setTimeout(() => {
                    setCurrentStep(result.turn + 1);
                }, 1200); // Smooth delay for reading before unfolding the next turn card
            }
        });
        
    } catch (err) {
        hideTypingIndicator();
        appendDotMessage(`Oops, I encountered a connection issue calling the local agent backend. Make sure uvicorn is running on port 8000! (Error: ${err.message})`);
        appendLogLine("system", `ERROR executing ADK workflow: ${err.message}`);
    }
}

// --- Render Chat Messages ---
function appendUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper user";
    
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.innerHTML = `<p>${escapeHtml(text)}</p>`;
    
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    scrollToBottom(chatHistory);
}

function showTypingIndicator() {
    typingIndicator.classList.remove("hidden");
    scrollToBottom(chatHistory);
}

function hideTypingIndicator() {
    typingIndicator.classList.add("hidden");
}

function renderDotResponse(text, cards, turn) {
    // Create Dot text bubble
    const wrapper = document.createElement("div");
    wrapper.className = "msg-wrapper dot";
    
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.innerHTML = `<p>${text}</p>`;
    
    // If rich cards are present, create card container and append them
    if (cards && cards.length > 0) {
        const cardAttachment = document.createElement("div");
        cardAttachment.className = "card-attachment";
        
        // If there are exactly two hotel_proposals (Turn 1), wrap them in the rich-cards-row grid
        if (cards.length === 2 && cards[0].type === "hotel_proposal") {
            const rowDiv = document.createElement("div");
            rowDiv.className = "rich-cards-row";
            
            cards.forEach(card => {
                const cardHtml = generateCardHtml(card);
                rowDiv.appendChild(cardHtml);
            });
            cardAttachment.appendChild(rowDiv);
        } else {
            // Otherwise render stacked cards
            cards.forEach(card => {
                const cardHtml = generateCardHtml(card);
                cardAttachment.appendChild(cardHtml);
            });
        }
        
        bubble.appendChild(cardAttachment);
    }
    
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    scrollToBottom(chatHistory);
}

function appendDotMessage(text) {
    renderDotResponse(text, [], 0);
}

// --- Rich Cards HTML Generators ---
function generateCardHtml(card) {
    const cardDiv = document.createElement("div");
    
    switch (card.type) {
        case "hotel_proposal":
            cardDiv.className = "rich-hotel-card";
            cardDiv.innerHTML = `
                <div class="photo-carousel">
                    <img src="${card.images[0]}" class="carousel-slide" alt="${card.name}">
                    <div class="carousel-overlay">${card.city}</div>
                </div>
                <div class="hotel-info-block">
                    <div class="hotel-headline">
                        <h5>${card.name}</h5>
                        <span class="hotel-price">${card.price}</span>
                    </div>
                    <div class="hotel-review-score">
                        <span class="score-num">${card.rating}</span>
                        <span>(${card.reviews} reviews)</span>
                    </div>
                    <div class="hotel-tagline">${card.tagline}</div>
                    <p class="hotel-desc">${card.description}</p>
                </div>
            `;
            break;
            
        case "hotel_card":
            cardDiv.className = "london-detail-card";
            cardDiv.innerHTML = `
                <div class="photo-carousel">
                    <img src="${card.images[0]}" class="carousel-slide" alt="${card.name}">
                    <div class="carousel-overlay">${card.badge}</div>
                </div>
                <div class="hotel-info-block">
                    <div class="hotel-headline">
                        <h5>${card.name}</h5>
                        <span class="hotel-price">${card.price}</span>
                    </div>
                    <div class="hotel-review-score">
                        <span class="score-num">${card.rating}</span>
                        <span>(${card.reviews} reviews)</span>
                    </div>
                    <div class="hotel-tagline">${card.tagline}</div>
                    <div class="details-list">
                        ${card.details.map(bullet => `<div class="detail-bullet">${bullet}</div>`).join('')}
                    </div>
                </div>
            `;
            break;
            
        case "flight_card":
            cardDiv.className = "rich-flight-card";
            cardDiv.innerHTML = `
                <div class="airline-badge">
                    <span>✈️ ${card.airline}</span>
                </div>
                <div class="flight-times-row">
                    <div class="airport-col">
                        <span class="airport-code">AMS</span>
                        <span class="airport-time">18:40</span>
                    </div>
                    <div class="flight-duration">
                        <span>Direct</span>
                        <span>1h 20m</span>
                    </div>
                    <div class="airport-col" style="text-align: right;">
                        <span class="airport-code">LHR</span>
                        <span class="airport-time">19:00</span>
                    </div>
                </div>
                <div class="flight-meta-details">
                    <span>${card.flight_no} • ${card.class}</span>
                    <span class="matching-pref">${card.price}</span>
                </div>
                <div class="flight-tagline" style="font-size: 0.72rem; color: #10b981; margin-top: 8px; font-weight: 500;">
                    ✓ ${card.schedule_match}
                </div>
            `;
            break;
            
        case "policy_card":
            cardDiv.className = "rich-policy-card";
            cardDiv.innerHTML = `
                <div class="policy-card-title">${card.title}</div>
                <div class="policy-card-subtitle">${card.subtitle}</div>
                <div class="policy-checklist">
                    ${card.items.map(item => `
                        <div class="policy-item ${item.checked ? 'checked' : 'unchecked'} ${item.highlight ? 'highlight' : ''}">
                            <span class="checkbox-visual"></span>
                            <span class="policy-text">${item.text}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-card-action" onclick="alert('AHC Checklist PDF sent to ${card.email}!')">
                    📧 ${card.action_label}
                </button>
            `;
            break;
            
        case "receipt_card":
            cardDiv.className = "rich-receipt-card";
            cardDiv.innerHTML = `
                <div class="receipt-header">
                    <span class="receipt-title">✓ Booking Confirmed</span>
                    <span class="receipt-status">${card.status}</span>
                </div>
                <div class="receipt-row bold">
                    <span>${card.hotel}</span>
                    <span style="color: var(--booking-yellow); font-size: 1.05rem;">${card.final_price}</span>
                </div>
                <div class="receipt-row">
                    <span>Room: ${card.room}</span>
                    <span>Dates: ${card.dates}</span>
                </div>
                <div class="receipt-row" style="color: #10b981; font-weight: 500; font-size: 0.72rem;">
                    <span>✨ ${card.special_request}</span>
                </div>
                <div class="receipt-row total">
                    <span>Original Price: <del>${card.original_price}</del></span>
                    <span>${card.discount}</span>
                </div>
            `;
            break;
            
        case "dining_card":
            cardDiv.className = "rich-dining-card";
            cardDiv.innerHTML = `
                <div class="dining-title">${card.title}</div>
                <div class="pubs-list">
                    ${card.pubs.map(pub => `
                        <div class="pub-item">
                            <div class="pub-header">
                                <span>${pub.name}</span>
                                <span class="pub-rating">★ ${pub.rating}</span>
                            </div>
                            <div class="pub-meta">${pub.distance}</div>
                            <p class="pub-desc">${pub.desc}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
            
        case "map_card":
            cardDiv.className = "rich-map-card";
            cardDiv.innerHTML = `
                <div class="map-card-title">${card.title}</div>
                <div class="map-card-subtitle">🗺️ ${card.origin} ➔ ${card.destination}</div>
                <div class="map-card-details">
                    <div class="map-bullet">🚶‍♂️ <strong>Distance:</strong> ${card.distance} (${card.duration})</div>
                    <div class="map-bullet">${card.dog_friendly}</div>
                </div>
                <!-- Premium Google Maps Mockup SVG -->
                <svg viewBox="0 0 400 200" class="map-svg" style="width: 100%; border-radius: 14px; background: #151618; border: 1px solid rgba(255,255,255,0.12); box-shadow: inset 0 0 20px rgba(0,0,0,0.8);">
                    <!-- LANDMASS -->
                    <rect width="100%" height="100%" fill="#151618" />
                    
                    <!-- BUILDING FOOTPRINTS (Sleek urban geometries) -->
                    <polygon points="10,15 120,15 120,50 10,50" fill="#222326" stroke="#2e3033" stroke-width="0.5" />
                    <polygon points="10,60 70,60 70,110 10,110" fill="#222326" stroke="#2e3033" stroke-width="0.5" />
                    <polygon points="295,15 390,15 390,85 295,85" fill="#222326" stroke="#2e3033" stroke-width="0.5" />
                    <polygon points="10,155 140,155 140,190 10,190" fill="#222326" stroke="#2e3033" stroke-width="0.5" />
                    <polygon points="190,135 390,135 390,190 190,190" fill="#222326" stroke="#2e3033" stroke-width="0.5" />
                    
                    <!-- PARKS & VEGETATION (Google Maps dark navigation style) -->
                    <!-- Rivington Playground -->
                    <rect x="135" y="15" width="85" height="60" rx="8" fill="#152c20" stroke="#2b5f43" stroke-width="1" />
                    <!-- Tiny Trees/Bushes mockups inside park -->
                    <circle cx="155" cy="35" r="3" fill="#34a853" opacity="0.7" />
                    <circle cx="165" cy="45" r="4" fill="#34a853" opacity="0.7" />
                    <circle cx="195" cy="30" r="3" fill="#34a853" opacity="0.7" />
                    <circle cx="185" cy="55" r="5" fill="#34a853" opacity="0.7" />
                    <text x="177" y="48" text-anchor="middle" fill="#a3e635" font-size="7" font-family="Outfit" font-weight="bold" opacity="0.9">Rivington Playground</text>
                    
                    <!-- STREET LAYOUT -->
                    <!-- Charlotte Road -->
                    <path d="M 170 110 L 170 200" stroke="#3c4043" stroke-width="18" stroke-linecap="round" />
                    <path d="M 170 110 L 170 200" stroke="#202124" stroke-width="14" stroke-linecap="round" />
                    
                    <!-- Garden Walk -->
                    <path d="M 260 0 L 260 110" stroke="#3c4043" stroke-width="18" stroke-linecap="round" />
                    <path d="M 260 0 L 260 110" stroke="#202124" stroke-width="14" stroke-linecap="round" />
                    
                    <!-- Great Eastern St -->
                    <path d="M 20 200 L 110 0" stroke="#3c4043" stroke-width="28" stroke-linecap="round" />
                    <path d="M 20 200 L 110 0" stroke="#202124" stroke-width="22" stroke-linecap="round" />
                    <!-- Lane divider dashes for arterial Great Eastern St -->
                    <path d="M 20 200 L 110 0" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="4,6" />
                    
                    <!-- Rivington St -->
                    <path d="M 70 110 L 400 110" stroke="#3c4043" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M 70 110 L 400 110" stroke="#202124" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
                    
                    <!-- STREET NAME LABELS -->
                    <text x="335" y="114" fill="rgba(255,255,255,0.35)" font-size="7.5" font-family="Outfit" font-weight="bold" letter-spacing="0.5">RIVINGTON ST</text>
                    <text x="175" y="160" fill="rgba(255,255,255,0.25)" font-size="7" font-family="Outfit" transform="rotate(90, 175, 160)">CHARLOTTE RD</text>
                    <text x="52" y="55" fill="rgba(255,255,255,0.25)" font-size="7.5" font-family="Outfit" transform="rotate(-64, 52, 55)">GREAT EASTERN ST</text>
                    <text x="264" y="45" fill="rgba(255,255,255,0.2)" font-size="7" font-family="Outfit" transform="rotate(90, 264, 45)">GARDEN WALK</text>
                    
                    <!-- PEDESTRIAN WALKING ROUTE (Google Maps cobalt blue navigation style) -->
                    <!-- Blue casing glow -->
                    <path d="M 60 140 L 73 110 L 320 110" stroke="#1a73e8" stroke-width="7" opacity="0.3" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Vibrant Blue Core line -->
                    <path d="M 60 140 L 73 110 L 320 110" stroke="#4285f4" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Walking footprint dots -->
                    <path d="M 60 140 L 73 110 L 320 110" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2,8" stroke-linecap="round" stroke-linejoin="round" />
                    
                    <!-- GOOGLE MAPS TEARDROP PIN 1: The Hoxton (Hotel Category Blue) -->
                    <circle cx="60" cy="140" r="12" fill="none" stroke="#1a73e8" stroke-width="1.5" opacity="0.4" />
                    <!-- Shadow -->
                    <ellipse cx="60" cy="140" rx="4" ry="1.5" fill="rgba(0,0,0,0.5)" />
                    <!-- Teardrop Path -->
                    <path d="M 60 140 C 56 136 50 129 50 123 C 50 117 54.5 112 60 112 C 65.5 112 70 117 70 123 C 70 129 64 136 60 140 Z" fill="#1a73e8" stroke="#ffffff" stroke-width="1" />
                    <!-- Bed Icon -->
                    <circle cx="60" cy="123" r="4" fill="#1a73e8" />
                    <text x="60" y="126" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="bold">🛏️</text>
                    <!-- Label card -->
                    <rect x="20" y="94" width="80" height="14" rx="3" fill="#1a73e8" />
                    <text x="60" y="104" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="bold" font-family="Outfit">The Hoxton, Shoreditch</text>
                    
                    <!-- GOOGLE MAPS TEARDROP PIN 2: Sister's Flat (Home Category Red) -->
                    <circle cx="320" cy="110" r="12" fill="none" stroke="#ea4335" stroke-width="1.5" opacity="0.4" />
                    <!-- Shadow -->
                    <ellipse cx="320" cy="110" rx="4" ry="1.5" fill="rgba(0,0,0,0.5)" />
                    <!-- Teardrop Path -->
                    <path d="M 320 110 C 316 106 310 99 310 93 C 310 87 314.5 82 320 82 C 325.5 82 330 87 330 93 C 330 99 324 106 320 110 Z" fill="#ea4335" stroke="#ffffff" stroke-width="1" />
                    <!-- Home Icon -->
                    <circle cx="320" cy="93" r="4" fill="#ea4335" />
                    <text x="320" y="96" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="bold">🏠</text>
                    <!-- Label card -->
                    <rect x="285" y="64" width="70" height="14" rx="3" fill="#ea4335" />
                    <text x="320" y="74" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="bold" font-family="Outfit">Sister's Flat</text>
                    
                    <!-- FLOATING SEARCH CARD (Google Maps Trademark UI) -->
                    <rect x="15" y="15" width="110" height="26" rx="6" fill="#202124" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                    <text x="24" y="31" fill="rgba(255,255,255,0.6)" font-size="8" font-family="Outfit">🔍 Search Google Maps</text>
                    <!-- Floating blue direction button -->
                    <circle cx="112" cy="28" r="8" fill="#1a73e8" />
                    <text x="112" y="31" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="bold">➔</text>
                    
                    <!-- FLOATING ZOOM CONTROLS -->
                    <rect x="365" y="130" width="20" height="40" rx="4" fill="#202124" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                    <line x1="365" y1="150" x2="385" y2="150" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                    <text x="375" y="142" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="10" font-weight="bold">+</text>
                    <text x="375" y="162" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="10" font-weight="bold">-</text>
                    
                    <!-- GOOGLE WATERMARK LOGO -->
                    <text x="16" y="188" fill="rgba(255,255,255,0.35)" font-size="10.5" font-family="Times New Roman" font-weight="bold" font-style="italic" letter-spacing="0.5">Google</text>
                </svg>
            `;
            break;
            
        default:
            cardDiv.textContent = JSON.stringify(card);
    }
    
    return cardDiv;
}

// --- Dynamic Log Playback & Svg Active State Monitor ---
function playGcpArchitectureLogs(logs, onComplete) {
    if (logPlaybackInterval) {
        clearInterval(logPlaybackInterval);
    }
    
    let index = 0;
    const logDivider = document.createElement("div");
    logDivider.className = "log-line system";
    logDivider.textContent = `---------------------- Session Step Executing ----------------------`;
    consoleLogs.appendChild(logDivider);
    
    logPlaybackInterval = setInterval(() => {
        if (index < logs.length) {
            const entry = logs[index];
            
            // 1. Print log line in console window
            const logClass = getLogClassForComponent(entry.component);
            appendLogLine(logClass, `[${entry.component}] ${entry.message}`, entry.payload);
            
            // 2. Illuminate corresponding SVG nodes & flow links
            resetSvgHighlights();
            lightSvgElementsForComponent(entry.component);
            
            index++;
        } else {
            // Finished playing logs
            clearInterval(logPlaybackInterval);
            logPlaybackInterval = null;
            
            // Ensure client and orchestrator stay lit as resting state
            resetSvgHighlights();
            SVG_NODES.ui.classList.add("active");
            SVG_NODES.orch.classList.add("active");
            SVG_LINKS.ui_orch.classList.add("active");
            
            if (onComplete) onComplete();
        }
    }, 450); // Speed of system processing animation (450ms fits nicely with the speaker flow)
}

function getLogClassForComponent(comp) {
    const c = comp.toLowerCase();
    if (c.includes("bigquery")) return "bq";
    if (c.includes("firestore")) return "fs";
    if (c.includes("search") || c.includes("vector")) return "vs";
    if (c.includes("secret")) return "sm";
    if (c.includes("adk") || c.includes("agent") || c.includes("orchestrator")) return "adk";
    return "system";
}

function appendLogLine(cssClass, text, payload = null) {
    const line = document.createElement("div");
    line.className = `log-line ${cssClass}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    consoleLogs.appendChild(line);
    
    if (payload) {
        const code = document.createElement("pre");
        code.className = "log-payload";
        code.textContent = payload;
        consoleLogs.appendChild(code);
    }
    
    scrollToBottom(consoleLogs);
}

function lightSvgElementsForComponent(comp) {
    const c = comp.toLowerCase();
    
    // Always keep active the main flow
    SVG_NODES.ui.classList.add("active");
    SVG_NODES.orch.classList.add("active");
    SVG_LINKS.ui_orch.classList.add("active");
    
    if (c.includes("bigquery")) {
        SVG_NODES.bq.classList.add("active");
        SVG_LINKS.orch_bq.classList.add("active");
    } else if (c.includes("firestore")) {
        SVG_NODES.fs.classList.add("active");
        SVG_LINKS.orch_fs.classList.add("active");
    } else if (c.includes("search") || c.includes("vector")) {
        SVG_NODES.sub.classList.add("active");
        SVG_LINKS.orch_sub.classList.add("active");
        SVG_NODES.vs.classList.add("active");
        SVG_LINKS.sub_vs.classList.add("active");
    } else if (c.includes("secret")) {
        SVG_NODES.sub.classList.add("active");
        SVG_LINKS.orch_sub.classList.add("active");
        SVG_NODES.sm.classList.add("active");
        SVG_LINKS.sub_sm.classList.add("active");
    } else if (c.includes("agent")) { // Specialized Agents (Hotels, Flights, Policy)
        SVG_NODES.sub.classList.add("active");
        SVG_LINKS.orch_sub.classList.add("active");
    }
}

function resetSvgHighlights() {
    Object.values(SVG_NODES).forEach(node => {
        if (node) node.classList.remove("active");
    });
    Object.values(SVG_LINKS).forEach(link => {
        if (link) link.classList.remove("active");
    });
}

function highlightSvgPath(node1, link, node2) {
    if (SVG_NODES[node1]) SVG_NODES[node1].classList.add("active");
    if (SVG_LINKS[link]) SVG_LINKS[link].classList.add("active");
    if (SVG_NODES[node2]) SVG_NODES[node2].classList.add("active");
}

// --- Header Trip Status Dynamic Updates ---
function updateTripHeader(turn) {
    switch (turn) {
        case 1:
            headerTripStatus.textContent = "Amsterdam -> Paris / Bruges";
            break;
        case 2:
        case 3:
        case 4:
            headerTripStatus.textContent = "Amsterdam -> London (Shoreditch) 🐶";
            break;
        case 5:
            headerTripStatus.textContent = "London (Confirmed) • June 12-14";
            headerTripStatus.style.backgroundColor = "var(--success-green)";
            break;
        default:
            headerTripStatus.textContent = "Amsterdam -> Choose Getaway";
            headerTripStatus.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    }
}

// --- Reset Demo Scenario ---
async function resetDemoScenario() {
    if (logPlaybackInterval) {
        clearInterval(logPlaybackInterval);
        logPlaybackInterval = null;
    }
    
    appendLogLine("system", "Sending reset request to local session orchestrator...");
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: SESSION_ID })
        });
        
        const data = await response.json();
        
        if (data.status === "success") {
            // Reset chat history except first bubble
            chatHistory.innerHTML = `
                <div class="msg-wrapper dot">
                    <div class="msg-bubble">
                        <p>Hello Laura! Ready to plan your next weekend getaway? I've loaded your profile and am ready when you are. Where is your travel inspiration leading you?</p>
                    </div>
                </div>
            `;
            
            // Clear Console logs
            consoleLogs.innerHTML = `<div class="log-line system">-- Session state reset. Ready for Turn 1... --</div>`;
            
            // Reset SVG
            resetSvgHighlights();
            SVG_NODES.ui.classList.add("active");
            
            // Reset talk track back to Turn 1 and activate Tab 1
            switchTab(1);
            
            // Reset Chat Input height
            chatInput.value = "";
            adjustInputHeight();
            
            // Reset Trip Status header
            updateTripHeader(0);
            
            appendLogLine("system", "Demo reset successfully! Session cache cleared.");
        }
    } catch (err) {
        appendLogLine("system", `ERROR trying to reset local session state: ${err.message}`);
        alert("Could not contact FastAPI server to reset session state. Make sure it is running on port 8000!");
    }
}

// --- Utility Helpers ---
function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
