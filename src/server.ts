// Note: setTimeout(), setInterval(), and clearInterval() may be obsolete soon
// in modern browsers
import * as ws from "ws";

const MAX_PLAYERS = 3;
const MAX_MESSAGE_LENGTH = 300;
const MAX_TIME_UNTIL_GAME_START = 10;

type WebSocket = ws & {
  isAlive?: boolean
};

let players = new Array<Player>();

enum Role {
  Sheep = "Sheep",
  Wolf = "Wolf",
  None = "None"
}

class Player {
  username: string;
  sock: WebSocket;
  role: Role;

  constructor(username: string, sock: WebSocket) {
    this.username = username;
    this.sock = sock;
    this.role = Role.None;

    this.sock.isAlive = true;
    this.sock.on("pong", heartbeat);
  }
}

const MAX_WOLVES = 1;

class Game {
  inProgress: boolean;
  roles: Array<Role>;

  constructor() {
    this.inProgress = false;
    this.roles = new Array<Role>();

    for(let i = 0; i < MAX_WOLVES; i++) {
      this.roles.push(Role.Wolf);
    }

    for(let i = 0; i < MAX_PLAYERS - MAX_WOLVES; i++) {
      this.roles.push(Role.Sheep);
    }
  }

  shuffleRoles() {
    for(let i = 0; i < this.roles.length; i++) {
      let temp = this.roles[i];
      let j = Math.floor(Math.random() * this.roles.length);
      this.roles[i] = this.roles[j];
      this.roles[j] = temp;
    }
  }

  assignRoles() {
    for(let i = 0; i < this.roles.length; i++) {
      players[i].role = this.roles[i];
      console.log("Player: " + players[i].username + ", " + "Role: " + String(this.roles[i]));
    }
  }
}

function broadcast(message: string) {
  for(let player of players) {
    if(player.sock.readyState === ws.OPEN) {
      player.sock.send(message);
    }
  }
}

let timeRemaining: number;
let countDownInterval: NodeJS.Timer;
let game = new Game();

function countDown() {
  if(timeRemaining <= 0) {
    game.inProgress = true;
    game.shuffleRoles();
    game.assignRoles();
    clearInterval(countDownInterval);
    return;
  }
  let message = {
    type: "tick",
    time: String(timeRemaining)
  };
  broadcast(JSON.stringify(message));
  timeRemaining--;
}

const server = new ws.Server({
  port: 8080,
  clientTracking: true
});

server.on("connection", function connection(sock: WebSocket) {
  if(players.length >= MAX_PLAYERS || game.inProgress) {
    let message = {
      type: "fullLobby",
      message: "Sorry, this lobby is currently full. Please try again later."
    };
    sock.send(JSON.stringify(message));
    sock.close();
    return;
  }

  let player = new Player("", sock);
  players.push(player);

  if(players.length == MAX_PLAYERS) {
    let message = {
      type: "startCountDown"
    };
    broadcast(JSON.stringify(message));
    timeRemaining = MAX_TIME_UNTIL_GAME_START;
    countDownInterval = setInterval(countDown, 1000);
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
      clearInterval(countDownInterval);
    }
  });
});

server.on("error", function(e) {
  console.log("The server has experienced an error and has shut down");
  server.close()
});

function heartbeat(this: WebSocket) {
  this.isAlive = true;
}

const playerCountInterval = setInterval(function ping() {
  for(let player of players) {
    if(!player.sock.isAlive) {
      return player.sock.close();
    }
    player.sock.isAlive = false;
    player.sock.ping("", false, true);
  }
}, 1000);
