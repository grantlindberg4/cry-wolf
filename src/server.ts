import * as ws from "ws";

const MAX_MESSAGE_LENGTH = 300;

type WebSocket = ws & {
  isAlive?: boolean
};

class Player {
  username: string;
  sock: WebSocket;

  constructor(username: string, sock: WebSocket) {
    this.username = username;
    this.sock = sock;
  }
}

const server = new ws.Server({
  port: 8080,
  clientTracking: true
});

function heartbeat(this: WebSocket) {
  this.isAlive = true;
}

let players = new Array<Player>();

function broadcast(message: string) {
  for(let player of players) {
    if(player.sock.readyState === ws.OPEN) {
      player.sock.send(message);
    }
  }
}

const MAX_PLAYERS = 3;

server.on("connection", function connection(sock: WebSocket) {
  let player = new Player("", sock);
  player.sock.isAlive = true;
  player.sock.on("pong", heartbeat);

  players.push(player);

  if(players.length >= MAX_PLAYERS) {
    let message = {
      type: "startCountDown"
    };
    broadcast(JSON.stringify(message));
  }
  player.sock.on("message", function incoming(data: string) {
    let message = JSON.parse(data);
    switch(message.type) {
      case "join":
        player.username = message.username;
        let joinMessage = {
          type: "join",
          message: player.username + " has joined!"
        };
        broadcast(JSON.stringify(joinMessage));
        break;
      case "chat":
        message.message = message.message.substring(0, MAX_MESSAGE_LENGTH);
        message.message = player.username + ": " + message.message;
        broadcast(JSON.stringify(message));
        break;
      default:
        // Something went wrong
        break;
    }
  });

  player.sock.on("close", function() {
    let message = {
      type: "leave",
      message: player.username + " has left!"
    };
    broadcast(JSON.stringify(message));

    let i = players.indexOf(player);
    players.splice(i, 1);

    // Should always be the case, but performing check regardless
    if(players.length < MAX_PLAYERS) {
      let message = {
        type: "stopCountDown"
      };
      broadcast(JSON.stringify(message));
    }
  });
});

server.on("error", function(e) {
  console.log("The server has experienced an error and has shut down");
  server.close()
});

const playerCountInterval = setInterval(function ping() {
  for(let player of players) {
    if(!player.sock.isAlive) {
      return player.sock.close();
    }
    player.sock.isAlive = false;
    player.sock.ping("", false, true);
  }
}, 1000);
