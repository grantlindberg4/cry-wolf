import * as ws from "ws";

const MAX_MESSAGE_LENGTH = 300;

type WebSocket = ws & {
  isAlive?: boolean
};

const server = new ws.Server({ port: 8080 });

function heartbeat(this: WebSocket) {
  this.isAlive = true;
}

server.on("connection", function connection(sock: WebSocket) {
  sock.isAlive = true;
  sock.on("pong", heartbeat);
  sock.on("message", function incoming(data: string) {
    let info = JSON.parse(data);
    info.message = info.message.substring(0, MAX_MESSAGE_LENGTH);
    server.clients.forEach(function each(client: WebSocket) {
      if(client.readyState === ws.OPEN) {
        client.send(JSON.stringify(info));
      }
    });
  });
});

const interval = setInterval(function ping() {
  server.clients.forEach(function each(sock: WebSocket) {
    if(!sock.isAlive) {
      return sock.terminate();
    }
    sock.isAlive = false;
    sock.ping("", false, true);
  });
}, 30000);
