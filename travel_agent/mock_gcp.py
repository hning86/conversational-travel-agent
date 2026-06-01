import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class GCPLogCollector:
    """Collects and structures backend operation logs to send to the frontend console."""
    def __init__(self):
        self.logs: List[Dict[str, str]] = []

    def log(self, component: str, message: str, payload: Any = None):
        log_entry = {
            "component": component,
            "message": message,
            "timestamp": "12:00:00"
        }
        if payload is not None:
            log_entry["payload"] = json.dumps(payload, indent=2)
        self.logs.append(log_entry)

    def get_logs(self) -> List[Dict[str, str]]:
        return self.logs

# --- Mock BigQuery ---
class MockBigQuery:
    def __init__(self, logger: GCPLogCollector):
        self.logger = logger
        self.users = {
            "user_laura": {
                "user_id": "user_laura",
                "name": "Laura",
                "loyalty_status": "Genius Level 3",
                "discount_multiplier": 0.85, # 15% discount
                "home_airport": "AMS (Amsterdam Schiphol)",
                "past_bookings": [
                    {
                        "destination": "Rome, Italy",
                        "hotel": "Hotel Raphael - Relais & Châteaux (Boutique Art Hotel)",
                        "rating": 5,
                        "review": "Absolutely loved the boutique art collection and rooftop terrace. Fine dining was divine!"
                    }
                ],
                "preferences": {
                    "accommodation_type": "Boutique Art Hotels",
                    "dining": "Fine dining & Michelin stars",
                    "transport": "KLM Preferred Flyer, Road-trip routes",
                    "pet_details": {
                        "name": "Buster",
                        "breed": "Golden Retriever",
                        "size": "Large"
                    }
                }
            }
        }

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        self.logger.log("BigQuery", f"Executing analytical query: SELECT * FROM `booking-dw.customer_analytics.profiles` WHERE user_id = '{user_id}'")
        profile = self.users.get(user_id)
        if profile:
            self.logger.log("BigQuery", "Query returned 1 row. Profile loaded successfully.", payload={
                "name": profile["name"],
                "loyalty": profile["loyalty_status"],
                "preferences": profile["preferences"]
            })
            return profile
        self.logger.log("BigQuery", f"User {user_id} not found.")
        return {}

# --- Mock Cloud Firestore ---
class MockFirestore:
    def __init__(self, logger: GCPLogCollector):
        self.logger = logger
        # Put session file inside backend directory
        self.session_file = os.path.join(os.path.dirname(__file__), "session_state.json")

    def get_session(self, session_id: str) -> Dict[str, Any]:
        self.logger.log("Firestore", f"Retrieving document: sessions/{session_id}")
        if os.path.exists(self.session_file):
            try:
                with open(self.session_file, "r") as f:
                    data = json.load(f)
                    state = data.get(session_id, {})
                    self.logger.log("Firestore", f"Found session state for {session_id}.", payload=state)
                    return state
            except Exception:
                pass
        self.logger.log("Firestore", f"Session {session_id} not found. Creating brand new session document.")
        return {"current_turn": 0, "history": []}

    def save_session(self, session_id: str, state: Dict[str, Any]):
        self.logger.log("Firestore", f"Writing document: sessions/{session_id}", payload=state)
        data = {}
        if os.path.exists(self.session_file):
            try:
                with open(self.session_file, "r") as f:
                    data = json.load(f)
            except Exception:
                pass
        data[session_id] = state
        with open(self.session_file, "w") as f:
            json.dump(data, f, indent=2)
        self.logger.log("Firestore", f"Successfully synced state to sessions/{session_id}")

# --- Mock Vertex AI Search ---
class MockVertexAISearch:
    def __init__(self, logger: GCPLogCollector):
        self.logger = logger
        
        self.hotels_index = [
            {
                "id": "paris_1",
                "name": "L'Hôtel Paris",
                "city": "Paris",
                "description": "Historical, high-end boutique art hotel in Saint-Germain-des-Prés, boasting original artworks, Michelin dining, and private courtyards.",
                "rating": 4.9,
                "reviews_count": 890,
                "price_level": 4,
                "base_price": 420,
                "tags": ["art", "boutique", "fine-dining", "romantic", "parking"],
                "photos": [
                    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1549294413-26f195afcbce?auto=format&fit=crop&w=400&q=80"
                ]
            },
            {
                "id": "bruges_1",
                "name": "Hotel Heritage - Relais & Châteaux",
                "city": "Bruges",
                "description": "Sophisticated, historic art-filled hotel in Bruges center. Includes private parking, exquisite local dining, and quiet romantic charm.",
                "rating": 4.8,
                "reviews_count": 520,
                "price_level": 3,
                "base_price": 280,
                "tags": ["art", "quiet", "historic", "romantic", "parking", "fine-dining"],
                "photos": [
                    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80"
                ]
            },
            {
                "id": "london_hoxton",
                "name": "The Hoxton, Shoreditch",
                "city": "London",
                "description": "Vibrant, pet-friendly hub in Shoreditch. Ground-floor patio rooms offer direct park access. Highly welcoming to large dogs, pet fee included, next to an off-leash lawn park.",
                "rating": 9.2,
                "reviews_count": 1240,
                "price_level": 3,
                "base_price": 270,
                "tags": ["pet-friendly", "large-dog", "london", "shoreditch", "park-access", "lively"],
                "photos": [
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80"
                ]
            },
            {
                "id": "london_pet_2",
                "name": "Rosewood London",
                "city": "London",
                "description": "Ultra-luxury hotel in central London with pet-friendly services. However, has a strict 15kg weight limit for canine companions.",
                "rating": 9.4,
                "reviews_count": 1800,
                "price_level": 5,
                "base_price": 600,
                "tags": ["pet-friendly", "luxury", "weight-limit-15kg"],
                "photos": ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80"]
            }
        ]

        self.flights_index = [
            {
                "id": "klm_1007",
                "airline": "KLM Royal Dutch Airlines",
                "flight_no": "KL1007",
                "origin": "AMS (Amsterdam)",
                "destination": "LHR (London Heathrow)",
                "departure": "Friday, June 12, 18:40",
                "arrival": "Friday, June 12, 19:00",
                "class": "Economy Comfort (KLM Crown Lounge Access)",
                "price": 140,
                "status": "Direct Flight - Fits historical KLM preferred schedule"
            }
        ]

    def vector_search_hotels(self, query: str, user_profile: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        project_id = os.getenv("GCP_PROJECT", "ninghai-ccai")
        location = os.getenv("GCP_LOCATION", "us-central1")
        
        log_msg = f"Initiating Vector Search on endpoint 'projects/{project_id}/locations/{location}/indexEndpoints/endpoint-hotels-vector-01' with query: '{query}'"
        if user_profile:
            log_msg += f" | Influenced by BigQuery profile preferences for '{user_profile.get('name', 'user')}'"
        self.logger.log("VertexAI Search", log_msg)
        
        keywords = query.lower().split()
        scored_hotels = []
        for hotel in self.hotels_index:
            score = 0.0
            description_lower = hotel["description"].lower()
            name_lower = hotel["name"].lower()
            
            if "pet" in keywords or "dog" in keywords:
                if "pet-friendly" in hotel["tags"]:
                    score += 5.0
                if "large-dog" in hotel["tags"] and ("large dog" in query.lower() or "retriever" in query.lower() or "buster" in query.lower()):
                    score += 10.0
                if "weight-limit" in "".join(hotel["tags"]) or "weight limit" in description_lower:
                    if "retriever" in query.lower() or "large" in query.lower():
                        score -= 8.0
            
            if "art" in keywords:
                if "art" in hotel["tags"]:
                    score += 4.0
            if "park" in keywords:
                if "park-access" in hotel["tags"]:
                    score += 4.0
            if "london" in keywords or "shoreditch" in keywords:
                if hotel["city"].lower() == "london":
                    score += 6.0
            if "paris" in keywords:
                if hotel["city"].lower() == "paris":
                    score += 6.0
            if "bruges" in keywords:
                if hotel["city"].lower() == "bruges":
                    score += 6.0
            
            # Boost scores based on BigQuery user profile preferences
            if user_profile:
                preferences = user_profile.get("preferences", {})
                
                # 1. Accommodation preference boost (e.g. Boutique Art Hotels)
                acc_pref = preferences.get("accommodation_type", "").lower()
                if "art" in acc_pref and "art" in hotel["tags"]:
                    score += 3.0
                if "boutique" in acc_pref and "boutique" in hotel["tags"]:
                    score += 3.0
                
                # 2. Dining preference boost (e.g. Fine dining)
                dining_pref = preferences.get("dining", "").lower()
                if "fine dining" in dining_pref and "fine-dining" in hotel["tags"]:
                    score += 2.0
                
                # 3. Pet details preferences boost
                pet_pref = preferences.get("pet_details", {})
                if pet_pref and "pet-friendly" in hotel["tags"]:
                    score += 2.0
                    
            if score > 0.1:
                scored_hotels.append((score, hotel))
                
        scored_hotels.sort(key=lambda x: x[0], reverse=True)
        results = [hotel for score, hotel in scored_hotels]
        
        self.logger.log("VertexAI Search", f"Vector index scan complete. Retrieved {len(results)} matches.", payload=results)
        return results

    def vector_search_flights(self, origin: str, destination: str, preferred_airline: str = "KLM") -> List[Dict[str, Any]]:
        project_id = os.getenv("GCP_PROJECT", "ninghai-ccai")
        location = os.getenv("GCP_LOCATION", "us-central1")
        self.logger.log("VertexAI Search", f"Initiating Flight Vector Query (projects/{project_id}/locations/{location}): origin='{origin}', destination='{destination}', preferred='{preferred_airline}'")
        results = [
            f for f in self.flights_index 
            if "ams" in f["origin"].lower() and "lhr" in f["destination"].lower() and preferred_airline.lower() in f["airline"].lower()
        ]
        self.logger.log("VertexAI Search", f"Flight index matching complete. Found {len(results)} direct connections.", payload=results)
        return results

# --- Mock Secret Manager ---
class MockSecretManager:
    def __init__(self, logger: GCPLogCollector):
        self.logger = logger
        self.secrets = {
            "booking-api-key": "bk_live_sec_prod_902187319a823f9c",
            "klm-partner-token": "klm_p_token_2026_ff8923a1",
            "vertex-ai-project-id": os.getenv("GCP_PROJECT", "ninghai-ccai")
        }

    def get_secret(self, key_name: str) -> str:
        project_id = os.getenv("GCP_PROJECT", "ninghai-ccai")
        self.logger.log("SecretManager", f"Accessing secret: projects/{project_id}/secrets/{key_name}/versions/latest")
        secret = self.secrets.get(key_name, "MOCK_KEY")
        masked = secret[:6] + "..." + secret[-4:] if len(secret) > 10 else "******"
        self.logger.log("SecretManager", f"Secret accessed successfully. Token: {masked}")
        return secret
