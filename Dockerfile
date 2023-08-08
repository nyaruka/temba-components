FROM node:16-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV DEBIAN_FRONTEND=noninteractive

RUN apt update -qq \
  && apt install -qq -y --no-install-recommends \
  chromium

WORKDIR /code

COPY ./ ./

RUN yarn install

EXPOSE 3010

CMD ["yarn", "start"]