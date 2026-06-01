from typing import Dict, Any, List
from google.adk import Agent, Workflow
from .mock_gcp import GCPLogCollector, MockBigQuery, MockVertexAISearch

# Initialize a shared log collector for tool execution logging
shared_collector = GCPLogCollector()

# --- Define Agentic Tools ---

def lookup_user_preferences(user_id: str) -> Dict[str, Any]:
    """
    Retrieves the customer profile, loyalty tier, and historical travel preferences from BigQuery.
    
    Args:
        user_id: The unique identifier of the customer, e.g. 'user_laura'.
    """
    bq = MockBigQuery(shared_collector)
    return bq.get_user_profile(user_id)

def search_hotels(query: str, user_id: str) -> List[Dict[str, Any]]:
    """
    Performs a semantic vector search matching hotel catalog parameters, 
    automatically applying scoring boosts based on the user's BigQuery profile preferences.
    
    Args:
        query: The description of desired accommodation features (e.g. 'boutique art hotel', 'pet friendly').
        user_id: The customer identifier used to load search ranking preferences.
    """
    bq = MockBigQuery(shared_collector)
    vector_search = MockVertexAISearch(shared_collector)
    
    # Fetch profile from BigQuery to influence search results
    profile = bq.get_user_profile(user_id)
    return vector_search.vector_search_hotels(query, user_profile=profile)


# --- Define ADK 2.0 Agents ---

router_agent = Agent(
    name="router_orchestrator",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are 'Dot', the premier Booking.com conversational companion.
    Your role is to orchestrate the travel planning experience for travelers.
    You coordinate with specialized agents (Hotels, Flights, Policy) to fulfill requests.
    Keep responses friendly, structured, concise, and professional, aligning with Booking.com's premium brand.
    """
)

hotels_agent = Agent(
    name="hotels_agent",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are the Booking.com Hotels Specialist. 
    Use the 'lookup_user_preferences' tool to look up customer preferences, and use 'search_hotels' to find accommodations that match subtle customer requests (e.g. large pets, ground floor access, art interests).
    Always make sure you utilize user_id (e.g. 'user_laura') to influence Vector Search rankings based on user profile preferences.
    Ensure you filter out options that fail strict requirements (like pet weight limits).
    """,
    tools=[lookup_user_preferences, search_hotels]
)

flights_agent = Agent(
    name="flights_agent",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are the Booking.com Flights Specialist.
    Your job is to find flights that align with the user's preferred times, airlines (like KLM), and home airport constraints.
    """
)

policy_agent = Agent(
    name="policy_agent",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are the Travel Policy Advisor.
    You query official policy indexes to answer travel compliance questions (such as Brexit animal health guidelines or visa regulations).
    Always be accurate, authoritative, and helpful, and offer actionable checklists.
    """
)

# --- Define the ADK 2.0 Workflow ---
booking_workflow = Workflow(
    name="seamless_weekend_getaway_workflow",
    edges=[
        ("START", router_agent),
        (router_agent, hotels_agent),
        (router_agent, flights_agent),
        (router_agent, policy_agent)
    ]
)
