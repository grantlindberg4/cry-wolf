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
    console.log("An error has occurred with client: " + username);
    alert("The server is currently unavailable. Please try later.");
  });

  sock.addEventListener("message", function(event) {
    // console.log(event.data);
    let data = JSON.parse(event.data);
    let type = data.type;
    let message = document.createElement("p");
    let timer = document.getElementById("timer")!;
    let characters = document.getElementsByClassName("character");
    let character;
    let i;
    let time;
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
      case "showCharacters":
        for(let i = 0; i < characters.length; i++) {
          character = <HTMLElement>characters[i];
          character.style.display = "flex";
        }
        return;
      case "phaseAnnouncement":
        message.classList.add("phase-announcement");
        break;
      case "characterSelection":
        i = data.index;
        character = <HTMLElement>characters[i];
        character.style.borderWidth = "20px";
        character.style.borderColor = "Orange";
        console.log(event.data);
        return;
      case "characterDeselection":
        i = data.index;
        character = <HTMLElement>characters[i];
        character.style.borderWidth = "0px";
        character.style.borderColor = "White";
        console.log(event.data);
        return;
      case "startCountDown":
        timer.style.visibility = "visible";
        time = document.createElement("h1");
        timer.appendChild(time);
        return;
      case "stopCountDown":
        timer.style.visibility = "hidden";
        return;
      case "tick":
        time = timer.children[0];
        time.textContent = data.time;
        return;
      case "roleAssignment":
        message.classList.add("role-assignment");
        break;
      case "gameStart":
        let selectedCharacters = data.characters;
        for(let i = 0; i < characters.length; i++) {
          console.log("gameStart " + i);
          let currentCharacter = <HTMLElement>characters[i];
          if(selectedCharacters[i]) {
            currentCharacter.style.display = "none";
          }
          else {
            currentCharacter.style.borderWidth = "0px";
            currentCharacter.style.borderColor = "White";
          }
        }
        console.log(event.data);
        return;
      case "fullLobby":
        alert(data.message);
        sock.close();
        return;
      default:
        // Something went wrong
        break;
    }
    message.innerText = data.message;
    let log = document.getElementById("log")!;
    log.appendChild(message);
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

  // Change onclick to be event listener for consistency
  let sendButton = <HTMLElement>document.getElementById("send-button");
  sendButton.onclick = function() {
    let messageBox = <HTMLInputElement>document.getElementById("message");
    if(messageBox.value.trim() != "") {
      let message = {
        type: "chat",
        message: messageBox.value
      };
      sock.send(JSON.stringify(message));
      messageBox.value = "";
    }
  };

  let exitButton = <HTMLElement>document.getElementById("exit-button");
  exitButton.onclick = function() {
    window.location.replace("index.html");
  };

  let characters = document.getElementsByClassName("character");
  console.log("Num characters " + characters.length);
  for(let i = 0; i < characters.length; i++) {
    let character = <HTMLElement>characters[i];
    character.onclick = function() {
      let message = {
        type: "characterSelection",
        index: i
      };
      sock.send(JSON.stringify(message));
      console.log("Set up " + i);
    }
  }

  return sock;
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
      let messageBox = <HTMLInputElement>document.getElementById("message");
      if(messageBox.value.trim() != "") {
        let message = {
          type: "chat",
          message: messageBox.value
        };
        sock.send(JSON.stringify(message));
        messageBox.value = "";
      }
      break;
    default:
      return;
  }
  event.preventDefault();
}, true);
