FROM node:10
WORKDIR /home/app/
COPY package*.json ./
USER node
RUN npm install
COPY --chown=node:node . .
#
# EXPOSE 8080
#
CMD ./launch.sh