const URL = "ws://localhost:8080";
const MAX_WAIT_TIME = 30;

let connectionAttempts = 1;


function createWebSocket(username) {
  let log = document.getElementById("log");

  sock = new WebSocket(URL);

  sock.addEventListener("open", function(event) {
    connectionAttempts = 1;
    sock.send(username + " has joined!");
  });

  sock.addEventListener("message", function(event) {
    console.log(event.data);
    let message = document.createElement("p");
    message.innerText = event.data;
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

    let waitTime = generateWaitTime(connectionAttempts);
    setTimeout(function() {
      connectionAttempts += 1;
      createWebSocket();
    }, waitTime);
  });

  document.getElementById("send-button").onclick = function() {
    if(document.getElementById("message").value.trim() != "") {
      sendMessage(sock, username);
    }
  };

  return sock;
}

function sendMessage(sock, username) {
  let message = username + ": " + document.getElementById("message").value;
  sock.send(message);
  document.getElementById("message").value = "";
}

function generateWaitTime(k) {
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

let sock;
let username;

window.addEventListener("load", function() {
  username = prompt("Enter your username");
  sock = createWebSocket(username);
});

window.addEventListener("keydown", function(event) {
  if(event.defaultPrevented) {
    return;
  }
  switch(event.key) {
    case "Enter":
      if(document.getElementById("message").value.trim() != "") {
        sendMessage(sock, username);
      }
      break;
    default:
      return;
  }
  event.preventDefault();
}, true);

window.addEventListener("unload", function(event) {
  sock.send(username + " has left");
});
