# Booking.com AI Travel Companion — 2026 Vision Platform

A fully interactive multi-agent travel planning simulation utilizing the **Google Agent Development Kit (ADK 2.0)** and **FastAPI**. This prototype demonstrates the next-generation conversational capabilities of **Dot**, the Booking.com conversational companion, seamlessly orchestrating specialized sub-agents to fulfill rich, contextual customer itineraries while integrating mock GCP databases.

![Booking.com 2026 AI Vision Demo Screenshot](images/travel_agent_screenshot.png)

---

## 🏗️ System Architecture

The following diagram illustrates the request lifecycle and interactions between the user interface, backend orchestration runner, the **ADK 2.0** multi-agent workflow, and simulated Google Cloud Platform (GCP) services:

```mermaid
graph TD
    User[🌐 Frontend Web Client] <-->|HTTP POST /api/chat| AppAPI[⚡ FastAPI App: app.py]
    
    subgraph Backend Orchestration [Backend Orchestration Layer]
        direction TB
        AppAPI <-->|Invokes| Runner[🏃‍♂️ Agent Runner: agent_runner.py]
    end
    
    subgraph travel_agent [travel_agent package]
        direction TB
        Workflow[🧩 ADK 2.0 Workflow]
        Dot[🤖 Orchestrator: 'Dot' router_agent]
        
        subgraph Agents [Specialized Agents]
            Hotels[🏨 Hotels Specialist hotels_agent]
            Flights[✈️ Flights Specialist flights_agent]
            Policy[📜 Policy Specialist policy_agent]
        end
        
        subgraph Tools [Agentic Tools]
            pref_tool[lookup_user_preferences]
            hotel_tool[search_hotels]
            flight_tool[search_flights]
            policy_tool[lookup_travel_policy]
        end
        
        Workflow --> Dot
        Dot -->|Routes Turn| Hotels
        Dot -->|Routes Turn| Flights
        Dot -->|Routes Turn| Policy
        
        Hotels -->|Calls| pref_tool
        Hotels -->|Calls| hotel_tool
        Flights -->|Calls| flight_tool
        Policy -->|Calls| policy_tool
    end
    
    Runner <-->|Queries Agent State & Profiles| travel_agent
    
    subgraph Mock GCP System [Mock Google Cloud Platform]
        direction LR
        BQ[(📊 BigQuery: Customer Analytics)]
        FS[(🔥 Firestore: Session State)]
        VS[(🔍 Vertex AI Search: Vector Index)]
        SM[🔑 Secret Manager: API Keys]
    end
    
    Runner -->|1. Pre-fetch profile 'user_laura'| BQ
    Runner <-->|2. Load/Save state| FS
    Runner -->|4. Secure credentials fetch| SM
    
    pref_tool -->|Queries Profile| BQ
    hotel_tool -->|Queries Preferences| BQ
    hotel_tool -->|Vector Scan| VS
    flight_tool -->|Vector Scan| VS
    policy_tool -->|Vector Scan| VS
    
    style travel_agent fill:#e8f0fe,stroke:#1a73e8,stroke-width:2px
    style Mock GCP System fill:#fef7e0,stroke:#f9ab00,stroke-width:2px
    style Backend Orchestration fill:#e6f4ea,stroke:#137333,stroke-width:2px
```

---

## 🗂️ Repository Directory Structure

The project is cleanly divided into three primary packages, separating pure agent definition, backend API orchestration, and modern frontend interface:

```text
booking_companion_demo/
├── travel_agent/              # 🤖 Pure Google ADK 2.0 Agent definitions
│   ├── __init__.py
│   ├── agent_graph.py         # Core Agents & Workflow topology definition
│   └── mock_tools.py          # GCP Mock databases & agent tools definitions
├── backend/                   # ⚡ Web Server & Execution Orchestration
│   ├── app.py                 # FastAPI route handlers & CORS configurations
│   ├── agent_runner.py        # run_booking_agent scenario runner & business logic
│   ├── pyproject.toml         # Python dependencies & uv environment manager
│   └── session_state.json     # Locally persisted session file
├── frontend/                  # 🎨 User Interface (HTML5, CSS3, Vanilla JS)
│   ├── index.html             # Semantic interface & console logger layout
│   ├── style.css              # Vibrant CSS (harmonious colors & card animations)
│   └── script.js              # Async client logic & reactive state mapping
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Python 3.12+**
- **uv** (Fast Python package manager and run tool)
- **Node.js** (or any local web server/VS Code Live Server to serve the frontend)

### 2. Setup & Run the Backend

First, navigate to the `backend` directory:

```bash
cd backend
```

Run the FastAPI server using `uv`:

```bash
uv run uvicorn app:app --reload --port 8000
```

The backend server will start running locally at `http://localhost:8000`.

### 3. Run the Frontend

You can serve the `frontend` directory using a simple local server. For example, navigate to `frontend` and run:

```bash
npx -y serve -p 3000 .
```

Open your browser and navigate to `http://localhost:3000` to interact with **Dot**.

---

## 🧬 Core Multi-Agent Roles

### 1. **Dot Orchestrator (`router_agent`)**
The premier Booking.com companion responsible for analyzing incoming messages, pre-fetching BigQuery loyalty statistics, handling state transitions, and routing specific goals to downstream specialized experts.

### 2. **Hotels Specialist (`hotels_agent`)**
Leverages **Vertex AI Vector Search** to discover boutique accommodations based on subtle preferences (such as art, proximity to off-leash parks, and patio access), dynamically filtering out hotels that violate absolute constraints (e.g., strict canine weight limits).

### 3. **Flights Specialist (`flights_agent`)**
Cross-references available flight indexes to map direct travel schedules aligning with historical preferred airlines (like KLM) and departing timings.

### 4. **Travel Policy Advisor (`policy_agent`)**
A RAG-enabled specialist designed to retrieve complex border entry parameters, generating actionable compliance checklists (e.g., Animal Health Certificate rules post-Brexit).
