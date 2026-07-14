import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from travel_agent.mock_tools import GCPLogCollector, MockBigQuery, MockFirestore, MockVertexAISearch, MockSecretManager

async def run_booking_agent(session_id: str, query: str) -> Dict[str, Any]:
    """
    Simulates executing the ADK 2.0 workflow turns.
    Leverages mock GCP databases to pre-fetch context, update session state, 
    semantically fetch records, and collect detailed system logs.
    """
    # 1. Initialize Log Collector
    collector = GCPLogCollector()
    
    # 2. Initialize mock GCP instances
    bq = MockBigQuery(collector)
    firestore = MockFirestore(collector)
    vector_search = MockVertexAISearch(collector)
    secret_manager = MockSecretManager(collector)
    
    # 3. Load Session State from Firestore
    session_state = firestore.get_session(session_id)
    current_turn = session_state.get("current_turn", 0)
    
    # 4. Pre-fetch Laura's Profile from BigQuery
    collector.log("ADK 2.0", f"Orchestrator pre-fetching customer profile for 'user_laura' to inject into the LLM context window.")
    profile = bq.get_user_profile("user_laura")
    
    # 5. Detect Scenario Turn based on Query Keywords (Dynamic matching in reverse order to avoid overlapping keyword conflicts)
    query_lower = query.lower()
    detected_turn = 1
    
    if "book" in query_lower or "lock in" in query_lower or "standard room" in query_lower:
        detected_turn = 5
    elif "how far" in query_lower or "rivington" in query_lower or "walk" in query_lower or "distance" in query_lower:
        detected_turn = 4
    elif "passport" in query_lower or "brexit" in query_lower or "border" in query_lower or "ahc" in query_lower:
        detected_turn = 3
    elif "sister" in query_lower or "london" in query_lower or "retriever" in query_lower or "buster" in query_lower:
        detected_turn = 2
    else:
        detected_turn = current_turn + 1 if current_turn < 5 else 1

    collector.log("ADK 2.0", f"State transition analyzer matched user message. Session Turn detected: Turn {detected_turn}")
    
    # 6. Process the Turn logic with ADK Agents & Mock GCP Systems
    response_text = ""
    cards = []
    
    if detected_turn == 1:
        collector.log("ADK 2.0", f"Routing request to Hotels Agent to search romantic getaways from Amsterdam matching: Art, Fine Dining, Parking.")
        
        # Query Vector Search for art + romantic + parking in Paris/Brussels
        collector.log("Hotels Agent", "Invoking Vector Search for Paris & Brussels options matching 'boutique art hotel'.")
        paris_results = vector_search.vector_search_hotels("Paris boutique art hotel fine-dining parking drive AMS", user_profile=profile)
        bruges_results = vector_search.vector_search_hotels("Brussels historic art hotel parking drive AMS", user_profile=profile)
        
        # Save state in Firestore
        session_state["current_turn"] = 1
        session_state["city_options"] = ["Paris", "Brussels"]
        session_state["needs_parking"] = True
        firestore.save_session(session_id, session_state)
        
        response_text = (
            "A romantic getaway sounds great, Laura! Since you loved that boutique art hotel in Rome last year "
            "(Hotel Raphael), I’m leaning towards Paris or Brussels for this trip. Both have great driving routes "
            "from Amsterdam. Paris has world-class museums, while Brussels offers a quieter, historic vibe. Do either of those appeal?"
        )
        
        cards = [
            {
                "type": "hotel_proposal",
                "city": "Paris",
                "name": "Park Hyatt Paris-Vendôme",
                "rating": 4.9,
                "reviews": 890,
                "price": "€420/night",
                "tagline": "World-class art & Michelin dining in Saint-Germain",
                "description": "Perfect for your love of art and good food. Valet parking included.",
                "guest_review": "An absolute masterpiece of a hotel. The artistic details and michelin-star food made our romantic getaway unforgettable!",
                "videos": [
                    {"title": "Paris Ultimate Art & Luxury Guide", "author": "Wanderlust Vlogs", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1549294413-26f195afcbce?auto=format&fit=crop&w=400&q=80"
                ]
            },
            {
                "type": "hotel_proposal",
                "city": "Brussels",
                "name": "Hotel Heritage (SLH Hyatt Partner)",
                "rating": 4.8,
                "reviews": 520,
                "price": "€280/night",
                "tagline": "Quiet romantic charm & fine local art",
                "description": "Secluded medieval elegance, exquisite restaurant, private courtyard parking.",
                "guest_review": "Felt like stepping into a romantic fairy tale. The private courtyard and fine art collection are breathtaking.",
                "videos": [
                    {"title": "Brussels Hidden Medieval Gems Vlog", "author": "Travel with Sam", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80"
                ]
            }
        ]
        
    elif detected_turn == 2:
        collector.log("ADK 2.0", "Laura pivoted! Dropping Paris/Brussels sub-routines. Initializing London search workflow.")
        
        # Update Firestore
        session_state["current_turn"] = 2
        session_state["target_city"] = "London"
        session_state["has_pet"] = True
        session_state["pet_name"] = "Buster"
        session_state["pet_breed"] = "Golden Retriever"
        session_state["needs_parking"] = False
        firestore.save_session(session_id, session_state)
        
        # 1. Hotels Agent queries Vector Search
        collector.log("Hotels Agent", "Searching Shoreditch London pet-friendly accommodations (no weight limits) near parks.")
        london_hotels = vector_search.vector_search_hotels("London Shoreditch pet friendly large dog spacious park access", user_profile=profile)
        collector.log("Hotels Agent", "Filtering search results. Removed 'Rosewood London': weight limit (15kg) is too strict for Laura's Golden Retriever (32kg).")
        
        # 2. Flights Agent queries Vector Search
        collector.log("Flights Agent", "Searching flight schedules: AMS to LHR matching user preferred airline (KLM) & Friday evening schedule.")
        london_flights = vector_search.vector_search_flights("AMS", "LHR", "KLM")
        
        response_text = (
            "London it is! I've updated your trip. Since Buster is a larger dog, I skipped the hotels with strict weight limits. "
            "I found three great pet-friendly options near your sister in Shoreditch. Andaz London is my top pick for you—they "
            "have spacious ground-floor rooms and are right next to an off-leash park. Also, I see you usually prefer flying KLM; "
            "they have a direct flight on Friday evening that fits your usual schedule. Want to see the details?"
        )
        
        cards = [
            {
                "type": "hotel_card",
                "name": "Andaz London Liverpool Street",
                "rating": 9.2,
                "reviews": 1240,
                "badge": "Globalist Option",
                "price": "€270/night",
                "tagline": "Dog-friendly ground floor rooms",
                "details": [
                    "🐶 Ground floor room with direct garden patio access",
                    "🌳 Adjacent to Hackney off-leash lawn park",
                    "🚫 No weight limits, pet welcome kit provided"
                ],
                "guest_review": "Absolutely the best dog-friendly hotel in London! The ground-floor garden room was perfect for Buster and the staff treated him like royalty.",
                "videos": [
                    {"title": "The Andaz London Liverpool Street Room Tour & Pet Review", "author": "BarkVloggers", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                    {"title": "Exploring Shoreditch with a Golden Retriever", "author": "London Doggo Guide", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
                ],
                "images": [
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80"
                ]
            },
            {
                "type": "flight_card",
                "airline": "KLM Royal Dutch Airlines",
                "flight_no": "KL1007",
                "from": "Amsterdam (AMS)",
                "to": "London Heathrow (LHR)",
                "times": "Friday, 18:40 - 19:00 (Direct)",
                "class": "Economy Comfort (Crown Lounge Access)",
                "price": "€140",
                "schedule_match": "Matches your typical Friday evening departures"
            }
        ]
        
    elif detected_turn == 3:
        collector.log("ADK 2.0", "Transactional booking workflow PAUSED. Routing question to RAG-enabled Policy Agent.")
        
        # Policy Agent queries official pet rules
        collector.log("Policy Agent", "Performing semantic search on Brexit Pet Travel Policy document library...")
        collector.log("Policy Agent", "Matches found in 'UK-GOV-Pet-Entry-2026.pdf': Animal Health Certificate (AHC) required within 10 days of travel for EU dogs.")
        
        # Update Firestore
        session_state["current_turn"] = 3
        session_state["policy_checked"] = True
        firestore.save_session(session_id, session_state)
        
        response_text = (
            "Good question. Yes, you will need an Animal Health Certificate (AHC) issued within 10 days of your trip. "
            "I've sent the UK government checklist to your email. Should we still lock in the Andaz while you review that?"
        )
        
        cards = [
            {
                "type": "policy_card",
                "title": "UK Pet Entry Checklist (Post-Brexit)",
                "subtitle": "Animal Health Certificate (AHC) Requirements",
                "items": [
                    {"text": "Microchip (ISO 11784/11785 compliant)", "checked": True},
                    {"text": "Valid Rabies Vaccination (>21 days before entry)", "checked": True},
                    {"text": "AHC issued by vet within 10 days of UK arrival", "checked": False, "highlight": True},
                    {"text": "Tapeworm treatment (1-5 days before entry, by vet)", "checked": False}
                ],
                "action_label": "Email Official Checklist PDF",
                "email": "laura.v@hyatt-member.com"
            }
        ]
        
    elif detected_turn == 4:
        collector.log("ADK 2.0", "Spatial query received. Routing request to Mapping Agent to compute pedestrian route from Andaz London to 18 Hoxton Square.")
        
        # Simulate Spatial calculation and log
        collector.log("Mapping Agent", "Invoking Google Map Grounding tool to retrieve real-time pedestrian walking paths and calculate precise travel times...")
        collector.log("Mapping Agent", "Route computed successfully: 0.7 miles (approx 14 mins walk). 100% pedestrian sidewalks, passing Hoxton Square park.")
        
        # Save state in Firestore
        session_state["current_turn"] = 4
        session_state["sister_address"] = "18 Hoxton Square"
        session_state["distance_to_sister"] = "0.7 miles"
        session_state["walk_time"] = "14 minutes"
        firestore.save_session(session_id, session_state)
        
        response_text = (
            "Great news! Andaz London Liverpool Street is very close to your sister's place at 18 Hoxton Square. "
            "It's a scenic 0.7-mile walk, which takes about 14 minutes. The entire route is along flat, dog-friendly "
            "pedestrian sidewalks, and you'll walk right past the green Hoxton Square park—perfect for a stroll with Buster! "
            "I've mapped it out for you below. Shall we go ahead and lock in your flight and hotel room?"
        )
        
        cards = [
            {
                "type": "map_card",
                "title": "Route to Sister's Flat",
                "origin": "Andaz London Liverpool Street",
                "destination": "18 Hoxton Square",
                "distance": "0.7 miles",
                "duration": "14 mins walk",
                "dog_friendly": "🐾 100% pedestrian paths • passes Hoxton Square park"
            }
        ]
        
    elif detected_turn == 5:
        collector.log("ADK 2.0", "Resuming transaction flow. Pulling secure booking credentials from Secret Manager.")
        api_key = secret_manager.get_secret("hyatt-api-key")
        
        # Loyalty Discount Applied
        collector.log("ADK 2.0", f"Applying Customer Loyalty Logic: {profile['loyalty_status']} applies 15% discount.")
        original_price = 540
        discounted_price = int(original_price * profile["discount_multiplier"])
        saved = original_price - discounted_price
        
        # Firestore Update
        session_state["current_turn"] = 5
        session_state["booking_completed"] = True
        firestore.save_session(session_id, session_state)
        
        # Proactively query local dining guides for Saturday night
        collector.log("ADK 2.0", "Proactively searching local Shoreditch database for high-rated, dog-friendly gastropubs.")
        pubs = [
            {"name": "The Crown & Shuttle", "rating": "4.6", "distance": "2 mins walk from hotel", "desc": "Beautiful heated garden patio, very welcoming to dogs."},
            {"name": "The Princess of Shoreditch", "rating": "4.7", "distance": "5 mins walk from hotel", "desc": "Award-winning gastropub. Dogs allowed in ground floor bar area."}
        ]
        collector.log("ADK 2.0", "Found 2 prime matching venues near Shoreditch high street.", payload=pubs)
        
        response_text = (
            f"Done! I've reserved a room at the Andaz, Shoreditch for June 12-14. I automatically applied your "
            f"Globalist discount, saving you 15% (saved €{saved}!). I also added a note to the hotel requesting "
            f"a dog bed for Buster. Since you mentioned loving good food, would you like me to find some "
            f"dog-friendly gastropubs near the hotel for Saturday night?"
        )
        
        cards = [
            {
                "type": "receipt_card",
                "hotel": "Andaz London Liverpool Street",
                "dates": "June 12 - 14, 2026 (2 Nights)",
                "room": "Double Standard Room (Ground Floor)",
                "special_request": "Dog bed requested for Buster (Golden Retriever)",
                "original_price": f"€{original_price}",
                "discount": f"-€{saved} (Globalist 15% Applied)",
                "final_price": f"€{discounted_price}",
                "status": "Confirmed & Guaranteed with World of Hyatt"
            },
            {
                "type": "dining_card",
                "title": "Dog-Friendly Gastropubs nearby",
                "pubs": pubs
            }
        ]
        
    return {
        "turn": detected_turn,
        "response": response_text,
        "cards": cards,
        "logs": collector.get_logs()
    }
