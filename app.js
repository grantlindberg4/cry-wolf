const URL = "ws://localhost:8080";
const MAX_WAIT_TIME = 30;

var connectionAttempts = 1;


function createWebSocket() {
  var log = document.getElementById("log");

  var sock = new WebSocket(URL);

  sock.addEventListener("open", function(event) {
    connectionAttempts = 1;
    sock.send("A new client has joined!");
  });

  sock.addEventListener("message", function(event) {
    console.log(event.data);
    var message = document.createElement("p");
    message.innerText = event.data;
    log.appendChild(message);
  });

  sock.addEventListener("close", function(e) {
    var reason = "Unknown error";
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
    }
    console.log("Error: " + reason);

    var waitTime = generateWaitTime(connectionAttempts);
    setTimeout(function() {
      connectionAttempts += 1;
      createWebSocket();
    }, waitTime);
  });

  document.getElementById("send-button").onclick = function() {
    var text = document.getElementById("text").value;
    sock.send(text);
  };
}

function generateWaitTime(k) {
  var waitTime = (Math.pow(2, k) - 1)*1000;
  if(waitTime > MAX_WAIT_TIME*1000) {
    waitTime = MAX_WAIT_TIME*1000;
  }

  return Math.random() * waitTime;
}

window.addEventListener("load", function() {
  createWebSocket();
});
