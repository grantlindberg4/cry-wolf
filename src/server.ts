// Note: setTimeout(), setInterval(), and clearInterval() may be obsolete soon
// in modern browsers

import * as ws from "ws";

// Eventually this will be sorted into an enum of setups
const MAX_PLAYERS = 3;
const NUM_WOLVES = 1;
const NUM_SHEEP = 2;
const NUM_CHARACTERS = 15;

const MAX_MESSAGE_LENGTH = 300;

const SECOND = 1000;
const TIME_UNTIL_GAME_START = 15;
const DAY_DURATION = 7;
const SUDDEN_DEATH_DURATION = 15;
const NIGHT_DURATION = 25;

type WebSocket = ws & {
  isAlive?: boolean
};

enum Role {
  Sheep = "Sheep",
  Wolf = "Wolf",
  None = "None" // I would eventually like to remove this variant if possible
}

enum Phase {
  PreGame,
  CharacterSelection,
  Day,
  SuddenDeath,
  Night,
  PostGame
}

let characters = new Array<boolean>(NUM_CHARACTERS);
characters.fill(true);

function findAvailableCharacter(): number {
  for(let i = 0; i < characters.length; i++) {
    if(characters[i]) {
      characters[i] = false;
      return i;
    }
  }

  // Uh oh...
  return -1;
}

class Player {
  username: string;
  sock: WebSocket;
  character: number;
  role: Role;

  constructor(username: string, sock: WebSocket) {
    this.username = username;
    this.sock = sock;
    this.character = findAvailableCharacter();
    this.role = Role.None;

    this.sock.isAlive = true;
    this.sock.on("pong", heartbeat);
  }
}

// Add a graveyard channel
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

    let message;
    message = {
      type: "gameStart",
      characters: characters
    };
    broadcast(players, JSON.stringify(message));
    message = {
      type: "roleAssignment",
      message: "You are a Sheep!"
    }
    broadcast(sheep, JSON.stringify(message));
    message = {
      type: "roleAssignment",
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

  // Possibly look up a better algorithm for this
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

  initDayPhase() {
    this.phase = Phase.Day;
    let message;
    message = {
      type: "phaseAnnouncement",
      message: "It is day. Find the wolves before time runs out!"
    };
    broadcast(players, JSON.stringify(message));
    message = {
      type: "showSuspicions"
    };
    broadcast(players, JSON.stringify(message));
    this.timeRemaining = DAY_DURATION;
  }

  initSuddenDeathPhase() {
    this.phase = Phase.SuddenDeath;
    let message;
    message = {
      type: "phaseAnnouncement",
      message: "It is sudden death. Good luck..."
    };
    broadcast(players, JSON.stringify(message));
    message = {
      type: "hideSuspicions"
    };
    broadcast(players, JSON.stringify(message));
    this.timeRemaining = SUDDEN_DEATH_DURATION;
  }

  initNightPhase() {
    this.phase = Phase.Night;
    let message;
    message = {
      type: "phaseAnnouncement",
      message: "It is night, and the wolves are hunting..."
    };
    broadcast(players, JSON.stringify(message));
    message = {
      type: "hideSuspicions"
    };
    broadcast(players, JSON.stringify(message));
    this.timeRemaining = NIGHT_DURATION;
  }

  initPostGame() {
    // Don't forget to broadcast the winning team
    let message = {
      type: "phaseAnnouncement",
      message: "The game is over"
    };
    broadcast(players, JSON.stringify(message));
  }

  cyclePhase() {
    // Use types for the messages to help hide/reveal elements for the players
    // for each phase respectively
    switch(this.phase) {
      case Phase.PreGame:
        this.start();
        this.initDayPhase();
        break;
      case Phase.Day:
        this.initSuddenDeathPhase();
        break;
      case Phase.SuddenDeath:
        this.initNightPhase();
        break;
      case Phase.Night:
        this.initDayPhase();
        break;
      case Phase.PostGame:
        this.initPostGame();
        break;
      default:
        // Oh, fuck...
        break;
    }

    startTimer();
  }
}

function startTimer(): void {
  let message = {
    type: "startCountDown"
  };
  broadcast(players, JSON.stringify(message));
  countDownInterval = setInterval(countDown, SECOND);
}

function stopTimer(): void {
  clearInterval(countDownInterval);
  let message = {
    type: "stopCountDown"
  };
  broadcast(players, JSON.stringify(message));
}

// Consider adding this to the game class
// Here is where information from chat messages will be copied into the
// transcript
function broadcast(channel: Array<Player>, message: string): void {
  for(let player of channel) {
    if(player.sock.readyState === ws.OPEN) {
      player.sock.send(message);
    }
  }
}

let game = new Game();

function countDown(): void {
  if(game.timeRemaining <= 0) {
    stopTimer();
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

function playerCanJoin(sock: WebSocket): boolean {
  if(players.length >= MAX_PLAYERS) {
    let message = {
      type: "fullLobby",
      message: "Sorry, this lobby is currently full. Please try again later."
    };
    sock.send(JSON.stringify(message));
    sock.close();
    return false;
  }
  if(game.phase != Phase.PreGame) {
    let message = {
      type: "gameInProgress",
      message: "The game you are trying to join is currently in progress."
    };
    sock.send(JSON.stringify(message));
    sock.close();
    return false;
  }

  return true;
}

function sendJoinMessage(username: string): void {
  let joinMessage = {
    type: "join",
    message: username + " has joined!"
  };
  broadcast(players, JSON.stringify(joinMessage));
}

function deselectCharacter(player: Player, i: number): void {
  characters[player.character] = true;
  let message = {
    type: "characterDeselection",
    index: player.character
  };
  broadcast(players, JSON.stringify(message));
}

function selectCharacter(player: Player, i: number): void {
  player.character = i;
  characters[player.character] = false;
  let message = {
    type: "characterSelection",
    index: i
  };
  broadcast(players, JSON.stringify(message));
}

function formatPost(username: string, message: string): string {
  message = message.substring(0, MAX_MESSAGE_LENGTH);
  return username + ": " + message;
}

function showSelectedCharacters(): void {
  for(let i = 0; i < characters.length; i++) {
    if(!characters[i]) {
      let message = {
        type: "characterSelection",
        index: i
      };
      broadcast(players, JSON.stringify(message));
    }
  }
}

const server = new ws.Server({
  port: 8080,
  clientTracking: true
});

server.on("connection", function connection(sock: WebSocket): void {
  if(!playerCanJoin(sock)) {
    return;
  }

  let player = new Player("", sock);
  players.push(player);
  showSelectedCharacters();

  if(players.length == MAX_PLAYERS) {
    startTimer();
  }

  player.sock.on("message", function incoming(data: string): void {
    let message = JSON.parse(data);
    switch(message.type) {
      case "join":
        player.username = message.username;
        sendJoinMessage(player.username);
        break;
      case "characterSelection":
        let i = message.index;
        if(characters[i]) {
          deselectCharacter(player, i);
          selectCharacter(player, i);
        }
        break;
      case "chat":
        // Consider using a switch statement to determine the channel
        message.message = formatPost(player.username, message.message);
        broadcast(players, JSON.stringify(message));
        break;
      default:
        // Something went wrong
        break;
    }
  });

  player.sock.on("close", function(): void {
    characters[player.character] = true;
    let message;
    message = {
      type: "characterDeselection",
      index: player.character
    };
    broadcast(players, JSON.stringify(message));
    message = {
      type: "leave",
      message: player.username + " has left!"
    };
    broadcast(players, JSON.stringify(message));

    let i = players.indexOf(player);
    players.splice(i, 1);

    if(players.length < MAX_PLAYERS && game.phase == Phase.PreGame) {
      stopTimer();
      game.timeRemaining = TIME_UNTIL_GAME_START;
    }
  });
});

server.on("error", function(e): void {
  console.log("The server has experienced an error and has shut down");
  server.close()
});

function heartbeat(this: WebSocket): void {
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
