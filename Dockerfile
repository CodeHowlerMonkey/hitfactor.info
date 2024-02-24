FROM node:20.11
WORKDIR /
COPY . .
RUN npm ci
EXPOSE 3000
CMD ["npm", "run", "prod"]
