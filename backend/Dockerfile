# ── Stage 1: Python deps ───────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim

# System deps: Node.js 20, FFmpeg, Chromium (for Puppeteer)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends \
        nodejs \
        ffmpeg \
        chromium \
        fonts-liberation fonts-noto-color-emoji \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy backend source
COPY . .

# Install Node deps for puppeteer renderer (uses package.json in /app/puppeteer)
# The puppeteer dir is mounted via Railway volume or baked in at build time.
# We only install if package.json exists.
RUN if [ -f puppeteer/package.json ]; then \
        cd puppeteer && npm ci --omit=dev; \
    fi

# Output directories (persisted via Railway volume in production)
RUN mkdir -p output/jobs output/scripts output/audio output/video \
             output/scenes output/subtitles output/images output/texts

EXPOSE 8000

# Use $PORT from Railway, fall back to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
