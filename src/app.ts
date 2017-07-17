class Player {
  username: string;
  sock: WebSocket;

  constructor(username: string, sock: WebSocket) {
    this.username = username;
    this.sock = sock;
  }

  sendMessage() {
    let messageBox = (<HTMLInputElement>document.getElementById("message"));
    let message = {
      type: "chat",
      message: this.username + ": " + messageBox.value
    };
    this.sock.send(JSON.stringify(message));
    messageBox.value = "";
  }
}

let connectionAttempts = 1;
let player: Player;

function createPlayer() {
  const URL = "ws://localhost:8080";
  let log = document.getElementById("log");

  let username = <string>prompt("Enter your username");
  let sock = new WebSocket(URL);
  player = new Player(username, sock);

  player.sock.addEventListener("open", function(event) {
    connectionAttempts = 1;
    let message = {
      type: "join",
      message: player.username + " has joined!"
    };
    player.sock.send(JSON.stringify(message));
  });

  player.sock.addEventListener("message", function(event) {
    console.log(event.data);
    let data = JSON.parse(event.data);
    let type = data.type;
    let message = document.createElement("p");
    switch(type) {
      case "join":
        message.classList.add("join-message");
        break;
      case "leave":
        message.classList.add("leave-message");
        break;
      case "chat":
        message.classList.add("chat-message");
        break;
      default:
        // Something went wrong
        break;
    }
    message.innerText = data.message;
    let log = <HTMLElement>document.getElementById("log");
    log.appendChild(message);
  });

  player.sock.addEventListener("close", function(e) {
    let reason;
    switch(e.code) {
      case 1000:
        reason = "Normal closure";
        break;
      case 1001:
        reason = "The endpoint is going away";
        break;
      case 1002:
        reason = "Protocol error";
        break;
      case 1003:
        reason = "The endpoint is receiving data of an unacceptable type";
        break;
      case 1004:
        reason = "Reserved. A meaning might be defined in the future";
        break;
      case 1005:
        reason = "The connection was closed abnormally";
        break;
      case 1006:
        reason = "No status code provided";
        break;
      case 1007:
        reason = "A message was received that contains inconsistent data";
        break;
      case 1008:
        reason = "A message was received that violates its policy";
        break;
      case 1009:
        reason = "A data frame that was received was too large";
        break;
      case 1010:
        reason = "Missing extension";
        break;
      case 1011:
        reason = "The server was unable to fulfill a request";
        break;
      case 1012:
        reason = "Service restart";
        break;
      case 1013:
        reason = "Try again later";
        break;
      case 1014:
        reason = "Reserved for future use by WebSocket standard";
        break;
      case 1015:
        reason = "Failure to perform a TLS handshake";
        break;
      default:
        reason = "Unknown error";
        break;
    }
    console.log("Error: " + reason);

    let waitTime = generateWaitTime(connectionAttempts);
    setTimeout(function() {
      connectionAttempts += 1;
      player = createPlayer();
    }, waitTime);
  });

  let sendButton = <HTMLElement>document.getElementById("send-button");

  sendButton.onclick = function() {
    let messageBox = (<HTMLInputElement>document.getElementById("message"));
    if(messageBox.value.trim() != "") {
      player.sendMessage();
    }
  };

  return player;
}

function generateWaitTime(k: number) {
  const MAX_WAIT_TIME = 30;

  let waitTime = 1;
  for(let i = 0; i < k; i++) {
    waitTime *= 2;
  }
  waitTime = (waitTime - 1)*1000;
  if(waitTime > MAX_WAIT_TIME*1000) {
    waitTime = MAX_WAIT_TIME*1000;
  }

  return Math.random() * waitTime;
}

window.addEventListener("load", function() {
  player = createPlayer();
});

window.addEventListener("keydown", function(event) {
  if(event.defaultPrevented) {
    return;
  }
  switch(event.key) {
    case "Enter":
      let messageBox = (<HTMLInputElement>document.getElementById("message"));
      if(messageBox.value.trim() != "") {
        player.sendMessage();
      }
      break;
    default:
      return;
  }
  event.preventDefault();
}, true);

window.addEventListener("unload", function(event) {
  let message = {
    type: "leave",
    message: player.username + " has left!"
  };
  player.sock.send(JSON.stringify(message));
});
