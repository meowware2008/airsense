FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=5000

WORKDIR /app

# Install security updates and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
COPY ml/requirements.txt /app/ml/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt -r /app/ml/requirements.txt

# Copy application code
COPY backend /app/backend
COPY ml /app/ml
COPY worker /app/worker

# Create non-root user and set permissions
RUN useradd -m -u 1001 airsense && \
    chown -R airsense:airsense /app

USER airsense

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health/live || exit 1

CMD ["python", "backend/wsgi.py"]
