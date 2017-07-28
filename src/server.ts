// Note: setTimeout(), setInterval(), and clearInterval() may be obsolete soon
// in modern browsers

import * as ws from "ws";

const MAX_PLAYERS = 3;
const NUM_WOLVES = 1;
const NUM_SHEEP = 2;

const MAX_MESSAGE_LENGTH = 300;

const SECOND = 1000;
const TIME_UNTIL_GAME_START = 10;
const DAY_DURATION = 7;
const SUDDEN_DEATH_DURATION = 15;
const NIGHT_DURATION = 25;

type WebSocket = ws & {
  isAlive?: boolean
};

enum Role {
  Sheep = "Sheep",
  Wolf = "Wolf",
  None = "None"
}

enum Phase {
  PreGame,
  Day,
  SuddenDeath,
  Night,
  PostGame
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

let players = new Array<Player>();
let sheep = new Array<Player>();
let wolves = new Array<Player>();

let countDownInterval: NodeJS.Timer;

class Game {
  phase: Phase;
  roles: Array<Role>;
  timeRemaining: number;

  constructor() {
    this.phase = Phase.PreGame;
    this.roles = this.createRoleList();
    this.timeRemaining = TIME_UNTIL_GAME_START;
  }

  start() {
    this.shuffleRoles();
    this.assignRoles();

    let message = {
      message: "You are a Sheep!"
    }
    broadcast(sheep, JSON.stringify(message));
    message = {
      message: "Stay hidden...you are a wolf."
    }
    broadcast(wolves, JSON.stringify(message));
  }

  createRoleList() {
    let roles = new Array<Role>();
    for(let i = 0; i < NUM_WOLVES; i++) {
      roles.push(Role.Wolf);
    }
    for(let i = 0; i < NUM_SHEEP; i++) {
      roles.push(Role.Sheep);
    }

    return roles;
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
      let role = this.roles[i]
      players[i].role = role;
      switch(role) {
        case Role.Sheep:
          sheep.push(players[i]);
          break;
        case Role.Wolf:
          wolves.push(players[i]);
          break;
        default:
          // Something went wrong
          break;
      }
    }
  }

  cyclePhase() {
    // Use types for the messages to help hide/reveal elements for the players
    // for each phase respectively
    let message;
    switch(this.phase) {
      case Phase.PreGame:
        this.start();
        this.phase = Phase.Day;
        message = {
          message: "It is day. Find the wolves before time runs out!"
        };
        broadcast(players, JSON.stringify(message));
        this.timeRemaining = DAY_DURATION;
        break;
      case Phase.Day:
        this.phase = Phase.SuddenDeath;
        message = {
          message: "It is sudden death. Good luck..."
        };
        broadcast(players, JSON.stringify(message));
        this.timeRemaining = SUDDEN_DEATH_DURATION;
        break;
      case Phase.SuddenDeath:
        this.phase = Phase.Night;
        message = {
          message: "It is night, and the wolves are hunting..."
        };
        broadcast(players, JSON.stringify(message));
        this.timeRemaining = NIGHT_DURATION;
        break;
      case Phase.Night:
        this.phase = Phase.Day;
        message = {
          message: "It is day. Find the wolves before time runs out!"
        };
        broadcast(players, JSON.stringify(message));
        this.timeRemaining = DAY_DURATION;
        break;
      case Phase.PostGame:
        // Don't forget to broadcast the winning team
        message = {
          message: "The game is over"
        };
        broadcast(players, JSON.stringify(message));
        break;
      default:
        // Oh, fuck...
        break;
    }
    message = {
      type: "startCountDown"
    };
    broadcast(players, JSON.stringify(message));
    countDownInterval = setInterval(countDown, SECOND);
  }
}

function broadcast(channel: Array<Player>, message: string) {
  for(let player of channel) {
    if(player.sock.readyState === ws.OPEN) {
      player.sock.send(message);
    }
  }
}

let game = new Game();

function countDown() {
  if(game.timeRemaining <= 0) {
    clearInterval(countDownInterval);
    let message = {
      type: "stopCountDown"
    };
    broadcast(players, JSON.stringify(message));
    game.cyclePhase();
    return;
  }
  let message = {
    type: "tick",
    time: String(game.timeRemaining)
  };
  broadcast(players, JSON.stringify(message));
  game.timeRemaining--;
}

const server = new ws.Server({
  port: 8080,
  clientTracking: true
});

server.on("connection", function connection(sock: WebSocket) {
  // Consider breaking this into two different if() statements to send a unique
  // message
  if(players.length >= MAX_PLAYERS || game.phase != Phase.PreGame) {
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
    broadcast(players, JSON.stringify(message));
    countDownInterval = setInterval(countDown, SECOND);
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
        broadcast(players, JSON.stringify(joinMessage));
        break;
      case "chat":
        // Consider using a switch statement to determine the channel
        message.message = message.message.substring(0, MAX_MESSAGE_LENGTH);
        message.message = player.username + ": " + message.message;
        broadcast(players, JSON.stringify(message));
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
    broadcast(players, JSON.stringify(message));

    let i = players.indexOf(player);
    players.splice(i, 1);

    if(players.length < MAX_PLAYERS && game.phase == Phase.PreGame) {
      let message = {
        type: "stopCountDown"
      };
      game.timeRemaining = TIME_UNTIL_GAME_START;
      broadcast(players, JSON.stringify(message));
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
}, SECOND);
