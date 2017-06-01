const WebSocket = require("ws");

const serv = new WebSocket.Server({ port: 8080 });

function heartbeat() {
  this.isAlive = true;
}

serv.broadcast = function broadcast(data) {
  serv.clients.forEach(function each(client) {
    if(client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

serv.on("connection", function connection(sock) {
  sock.isAlive = true;
  sock.on("pong", heartbeat);
  sock.on("message", function incoming(data) {
    serv.clients.forEach(function each(client) {
      if(client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

const interval = setInterval(function ping() {
  serv.clients.forEach(function each(sock) {
    if(sock.isAlive === false) {
      return sock.terminate();
    }
    sock.isAlive = false;
    sock.ping("", false, true);
  });
}, 30000);
