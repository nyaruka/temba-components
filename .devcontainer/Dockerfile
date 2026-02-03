FROM "mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye"

# The rest of our environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

# Add minio configuration
ENV MINIO_ENDPOINT=http://minio:9000
ENV MINIO_PUBLIC_ENDPOINT=http://localhost:9000
ENV MINIO_ACCESS_KEY=root
ENV MINIO_SECRET_KEY=tembatemba
ENV MINIO_BUCKET=temba-attachments

RUN apt-get update \
    && apt-get install chromium fonts-noto-color-emoji dnsutils curl -y --no-install-recommends -qq

USER node