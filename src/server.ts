import * as ws from "ws";

const MAX_MESSAGE_LENGTH = 300;

type WebSocket = ws & {
  isAlive?: boolean
};

const server = new ws.Server({ port: 8080, clientTracking: true });

function heartbeat(this: WebSocket) {
  this.isAlive = true;
}

let numPlayers = 0;

server.on("connection", function connection(sock: WebSocket) {
  sock.isAlive = true;
  sock.on("pong", heartbeat);
  numPlayers++;
  if(numPlayers >= 3) {
    let message = {
      type: "startCountDown"
    };
    server.clients.forEach(function each(client: WebSocket) {
      if(client.readyState === ws.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  sock.on("message", function incoming(data: string) {
    let info = JSON.parse(data);
    info.message = info.message.substring(0, MAX_MESSAGE_LENGTH);
    server.clients.forEach(function each(client: WebSocket) {
      if(client.readyState === ws.OPEN) {
        client.send(JSON.stringify(info));
      }
    });
  });

  sock.on("close", function() {
    numPlayers--;
    let message = {
      type: "stopCountDown"
    };
    server.clients.forEach(function each(client: WebSocket) {
      if(client.readyState === ws.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
});

server.on("error", function(e) {
  console.log("The server has experienced an error and has shut down");
});

const playerCountInterval = setInterval(function ping() {
  server.clients.forEach(function each(sock: WebSocket) {
    if(!sock.isAlive) {
      return sock.close();
    }
    sock.isAlive = false;
    sock.ping("", false, true);
  });
}, 1000);
