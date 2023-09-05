FROM "mcr.microsoft.com/devcontainers/typescript-node:1-16-bullseye"

RUN apt-get update \
    && apt-get install chromium fonts-noto-color-emoji -y --no-install-recommends -qq

# The rest of our environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /workspaces/temba-components
RUN yarn install
USER node

RUN echo 'Is this thing on?'
RUN ls -l
RUN ls -ls node_modules