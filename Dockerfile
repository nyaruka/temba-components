FROM node:16-bullseye-slim

# Install dependencies
RUN apt-get clean && apt-get update -qq && apt-get install -qq -y --no-install-recommends chromium fonts-noto-color-emoji
# RUN apk update && apk upgrade
# RUN apk add --update chromium font-noto-emoji

# Set the locale
# RUN locale-gen --no-purge en_US.UTF-8
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# The rest of our environment
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /code
# COPY ./package*.json .
# COPY ./yarn.lock .

RUN yarn install
COPY /. /.

EXPOSE 3010

# CMD ["yarn", "start"]