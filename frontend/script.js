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
    4: "How far is the Hoxton Shoreditch from my sister's place at 18 Hoxton Square? Can Buster and I easily walk there?",
    5: "That's perfect. Let's book the flight and lock in the double standard room at the Hoxton!"
};

// SVG element mapping (Monitor panel removed, stubbed safely to prevent errors)
const dummyElement = {
    classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
    }
};
const SVG_NODES = new Proxy({}, { get: () => dummyElement });
const SVG_LINKS = new Proxy({}, { get: () => dummyElement });

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
                    <img src="${card.images[0]}" class="carousel-slide" alt="${card.name}" onload="scrollToBottom(document.getElementById('chatHistory'))">
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
                    <img src="${card.images[0]}" class="carousel-slide" alt="${card.name}" onload="scrollToBottom(document.getElementById('chatHistory'))">
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
                <!-- Dynamic Google Maps Lighter Mockup SVG (Extracted to map_mockup.svg for high maintainability) -->
                <img src="/map_mockup.svg?v=${Date.now()}" class="map-svg" style="width: 100%; border-radius: 14px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.05); height: auto; display: block;" alt="Route to Sister's Flat" onload="scrollToBottom(document.getElementById('chatHistory'))" />
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
    // GCP Monitor removed
}

function resetSvgHighlights() {
    // GCP Monitor removed
}

function highlightSvgPath(node1, link, node2) {
    // GCP Monitor removed
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
