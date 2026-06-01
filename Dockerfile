# Use Python 3.12-slim as base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set the working directory
WORKDIR /app

# Copy the dependencies definition files first to leverage Docker layer caching
COPY backend/pyproject.toml backend/uv.lock ./backend/

# Install dependencies using uv globally inside container
RUN uv pip install --system -r backend/pyproject.toml

# Copy the rest of the application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY travel_agent/ ./travel_agent/

# Expose the port (Cloud Run defaults to 8080, but listens on whatever $PORT env var is set to)
EXPOSE 8080

# Start FastAPI app using uvicorn, reading $PORT environment variable
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8080}"]
