from .agent_graph import router_agent, hotels_agent, flights_agent, policy_agent, booking_workflow

# Expose root_agent for the ADK CLI runner/loader
root_agent = router_agent
