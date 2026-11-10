FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
COPY ml/requirements.txt /app/ml/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt -r /app/ml/requirements.txt

COPY backend /app/backend
COPY ml /app/ml
COPY worker /app/worker

RUN useradd -m -u 1001 airsense && \
    chown -R airsense:airsense /app

USER airsense

CMD ["python", "worker/worker.py"]
