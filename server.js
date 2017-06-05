const WebSocket = require("ws");

const server = new WebSocket.Server({ port: 8080 });

function heartbeat() {
  this.isAlive = true;
}

server.broadcast = function broadcast(data) {
  server.clients.forEach(function each(client) {
    if(client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

server.on("connection", function connection(sock) {
  sock.isAlive = true;
  sock.on("pong", heartbeat);
  sock.on("message", function incoming(data) {
    server.clients.forEach(function each(client) {
      if(client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

const interval = setInterval(function ping() {
  server.clients.forEach(function each(sock) {
    if(sock.isAlive === false) {
      return sock.terminate();
    }
    sock.isAlive = false;
    sock.ping("", false, true);
  });
}, 30000);
