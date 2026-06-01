from google.adk import Agent, Workflow

# --- Define ADK 2.0 Agents ---

router_agent = Agent(
    name="router_orchestrator",
    model="gemini-2.5-flash",
    instruction="""
    You are 'Dot', the premier Booking.com conversational companion.
    Your role is to orchestrate the travel planning experience for travelers.
    You coordinate with specialized agents (Hotels, Flights, Policy) to fulfill requests.
    Keep responses friendly, structured, concise, and professional, aligning with Booking.com's premium brand.
    """
)

hotels_agent = Agent(
    name="hotels_agent",
    model="gemini-2.5-flash",
    instruction="""
    You are the Booking.com Hotels Specialist. 
    You leverage Vertex AI Vector Search to find accommodations that match subtle customer requests (e.g. large pets, ground floor access, art interests).
    Ensure you filter out options that fail strict requirements (like pet weight limits).
    """
)

flights_agent = Agent(
    name="flights_agent",
    model="gemini-2.5-flash",
    instruction="""
    You are the Booking.com Flights Specialist.
    Your job is to find flights that align with the user's preferred times, airlines (like KLM), and home airport constraints.
    """
)

policy_agent = Agent(
    name="policy_agent",
    model="gemini-2.5-flash",
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
