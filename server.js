const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 8080 });

function heartbeat() {
  this.isAlive = true;
}

server.on("connection", function connection(sock) {
  sock.isAlive = true;
  sock.on("pong", heartbeat);
  sock.on("message", function incoming(data) {
    let info = JSON.parse(data);
    server.clients.forEach(function each(client) {
      if(client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(info));
      }
    });
  });
});

const interval = setInterval(function ping() {
  server.clients.forEach(function each(sock) {
    if(!sock.isAlive) {
      return sock.terminate();
    }
    sock.isAlive = false;
    sock.ping("", false, true);
  });
}, 30000);
