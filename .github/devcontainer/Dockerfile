FROM "mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye"

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install chromium fonts-noto-color-emoji dnsutils curl -y --no-install-recommends -qq

# bun manages JS dependencies and runs package scripts
RUN npm install -g bun

USER node
