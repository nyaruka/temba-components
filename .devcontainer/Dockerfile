FROM "mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye"

# The rest of our environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install chromium fonts-noto-color-emoji dnsutils curl -y --no-install-recommends -qq

USER node