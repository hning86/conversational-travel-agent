from google.adk import Agent, Workflow
from .mock_tools import (
    lookup_user_preferences,
    search_hotels,
    search_flights,
    lookup_travel_policy
)




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
    Use the 'search_flights' tool to find flight schedules and pricing that align with the user's preferred times, airlines (like KLM), and home airport constraints.
    """,
    tools=[search_flights]
)

policy_agent = Agent(
    name="policy_agent",
    model="gemini-3.1-flash-lite",
    instruction="""
    You are the Travel Policy Advisor.
    Use the 'lookup_travel_policy' tool to query official policy indexes and document libraries to answer travel compliance questions (such as Brexit animal health guidelines or visa regulations).
    Always be accurate, authoritative, and helpful, and offer actionable checklists based on document details.
    """,
    tools=[lookup_travel_policy]
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
