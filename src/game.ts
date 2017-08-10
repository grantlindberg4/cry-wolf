function rejectClient(message: string) {
  alert(message);
  sock.close();
}

function showCharacters() {
  let characterTokens = document.getElementsByClassName("character");
  for(let i = 0; i < characterTokens.length; i++) {
    let character = <HTMLElement>characterTokens[i];
    character.style.display = "flex";
  }
}

function showSelectedCharacters(characters: Array<boolean>) {
  let characterTokens = document.getElementsByClassName("character");
  for(let i = 0; i < characters.length; i++) {
    let character = <HTMLElement>characterTokens[i];
    if(characters[i]) {
      character.style.display = "none";
    }
    else {
      character.style.borderColor = "White";
    }
  }
}

function logMessage(type: string, message: string) {
  let post = document.createElement("p");
  post.classList.add(type);
  post.innerText = message;
  let log = document.getElementById("log")!;
  log.appendChild(post);
}

function selectCharacter(i: number) {
  let characterTokens = document.getElementsByClassName("character");
  let character = <HTMLElement>characterTokens[i];
  character.style.borderColor = "Orange";
}

function deselectCharacter(i: number) {
  let characterTokens = document.getElementsByClassName("character");
  let character = <HTMLElement>characterTokens[i];
  character.style.borderColor = "White";
}

function startTimer() {
  let timer = document.getElementById("timer")!;
  timer.style.visibility = "visible";
  let time = document.createElement("h1");
  timer.appendChild(time);
}

function stopTimer() {
  let timer = document.getElementById("timer")!;
  timer.style.visibility = "hidden";
}

function tick(time: string) {
  let timer = document.getElementById("timer")!;
  let currTime = timer.children[0];
  currTime.textContent = time;
}

function createWebSocket(username: string) {
  const URL = "ws://localhost:8080";
  let sock = new WebSocket(URL);

  sock.addEventListener("open", function(event) {
    let message = {
      type: "join",
      username: username
    };
    sock.send(JSON.stringify(message));
  });

  sock.addEventListener("error", function() {
    rejectClient("The server is currently unavailable. Please try later.");
  });

  sock.addEventListener("message", function(event) {
    let message = JSON.parse(event.data);
    switch(message.type) {
      case "join":
        logMessage("join-message", message.message);
        break;
      case "leave":
        logMessage("leave-message", message.message);
        break;
      case "chat":
        logMessage("chat-message", message.message);
        break;
      case "showCharacters":
        showCharacters();
        return;
      case "phaseAnnouncement":
        logMessage("phase-announcement", message.message);
        break;
      case "characterSelection":
        selectCharacter(message.index);
        break;
      case "characterDeselection":
        deselectCharacter(message.index);
        break;
      case "startCountDown":
        startTimer();
        break;
      case "stopCountDown":
        stopTimer();
        break;
      case "tick":
        tick(message.time);
        break;
      case "roleAssignment":
        logMessage("role-assignment", message.message);
        break;
      case "gameStart":
        showSelectedCharacters(message.characters);
        break;
      case "fullLobby":
        rejectClient(message.message);
        break;
      case "gameInProgress":
        rejectClient(message.message);
        break;
      default:
        // Something went wrong
        break;
    }
  });

  sock.addEventListener("close", function(e) {
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

    window.location.replace("index.html");
  });

  let sendButton = <HTMLElement>document.getElementById("send-button");
  sendButton.addEventListener("click", sendMessage);

  let exitButton = <HTMLElement>document.getElementById("exit-button");
  exitButton.addEventListener("click", function exit() {
    window.location.replace("index.html");
  });

  let characterTokens = document.getElementsByClassName("character");
  for(let i = 0; i < characterTokens.length; i++) {
    let character = <HTMLElement>characterTokens[i];
    character.addEventListener("click", function() {
      let message = {
        type: "characterSelection",
        index: i
      };
      sock.send(JSON.stringify(message));
    });
  }

  return sock;
}

function sendMessage() {
  let messageBox = <HTMLInputElement>document.getElementById("message");
  if(messageBox.value.trim() != "") {
    let message = {
      type: "chat",
      message: messageBox.value
    };
    sock.send(JSON.stringify(message));
  }
  messageBox.value = "";
}

let sock: WebSocket;

window.addEventListener("load", function() {
  // Make sure the username cannot be empty string
  let username = <string>prompt("Enter your username");
  sock = createWebSocket(username);
});

window.addEventListener("keydown", function(event) {
  if(event.defaultPrevented) {
    return;
  }
  switch(event.key) {
    case "Enter":
      sendMessage();
      break;
    default:
      return;
  }
  event.preventDefault();
}, true);
