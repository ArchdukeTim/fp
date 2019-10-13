const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const app = express();
const server = require("http").createServer(app);
const fs = require("fs");
const session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true,
  }),
  sharedsession = require("express-socket.io-session");
const socketio = require("socket.io");
const io = socketio.listen(server);
io.origins('*:*');
const RED = "#ff6666";
const BLU = "#4d79ff";
io.use(sharedsession(session));

app.use(logger("dev"));
app.use(session);
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'build/index.html'));
});


app.applyPort = function(port) {
  server.listen(port);
  let message = "listening on port: " + port;
  console.log(message);
};
app.applyPort(process.env.PORT || 8080);

module.exports = app;

///connections and usages
let game = {
  clientList: [],
  boardState: [],
  hints: [],
  roles: {
    rspymaster: "",
    bspymaster: "",
    rdetective: "",
    bdetective: "",
  },
  currentTurn: null,
  guessesRemaining: 0,
};

function resetVars() {
  game = {
    clientList: [],
    boardState: [],
    hints: [],
    roles: {
      bspymaster: "",
      rspymaster: "",
      bdetective: "",
      rdetective: "",
    },
    currentTurn: null,
    guessesRemaining: 0,
  };
  io.sockets.emit("reset");
}

function turnAfter(role) {
  switch (role) {
    case "bdetective":
      return "rspymaster";
    case "rspymaster":
      return "rdetective";
    case "rdetective":
      return "bspymaster";
    case "bspymaster":
      return "bdetective";
  }
}

function updateAll() {
  sendBoardUpdate();
  sendClueUpdate();
}

function sendRoleState() {
  game.clientList.forEach((client) => {
    io.to(client.connection)
      // Boolean list representing available roles
      .emit("updatedRoles", Object.keys(game.roles).reduce((result, key) => { result[key] = game.roles[key] === ""; return result}, {}),  client.role);
  });
}

function sendBoardUpdate() {
  let redLeft = game.boardState.filter(
    (card) => card.revealedColor !== card.borderColor && card.borderColor ===
      RED).length;
  let bluLeft = game.boardState.filter(
    (card) => card.revealedColor !== card.borderColor && card.borderColor ===
      BLU).length;
  let detectiveList = game.boardState.map(card => {
    return {
      word: card.word,
      borderColor: card.revealedColor,
      revealedColor: card.revealedColor,
    };
  });
  game.clientList.forEach(c => {
    if (c.role.endsWith("spymaster")) {
      io.to(c.connection)
        .emit("updateBoardState", game.boardState, redLeft, bluLeft);
    } else {
      io.to(c.connection)
        .emit("updateBoardState", detectiveList, redLeft, bluLeft);
    }
  });
}

function sendClueUpdate() {
  //io.sockets.emit("updateCluestate", clueLog);
}

function isTurn(id) {
  console.log("Current Turn", game.currentTurn);
  game.clientList.forEach((c) => {
    if (c.connection === id) {
      console.log(c.role, game.currentTurn, c.role === game.currentTurn);
      debugger
      return c.role === game.currentTurn;
    }
  });
}

function nextTurn() {
  console.log("before", game.currentTurn);
  game.currentTurn = turnAfter(game.currentTurn);
  console.log("after", game.currentTurn);
  game.clientList.forEach(function(cli) {
    if (cli.role === game.currentTurn) {
      io.to(cli.connection).emit("your turn");
    } else {
      io.to(cli.connection).emit("lockup", getClient(game.currentTurn));
    }
  });
}

io.on("connect", function(client) {
  console.log("establishing connection with", client.id);
  console.log("all clients", game.clientList);
  client.send(client.id);
});

io.on("connection", function(socket) {

  socket.on("setInitState", function(state, browserCache, playerOne) {
    console.log("session for: ", browserCache, "socket", socket.id);
    let user = browserCache.user;
    let found = false;
    game.clientList.forEach(function(element) {
      if (element.name && element.name === user) {
        console.log(
          "updating " + user + " connection from ",
          element.connection,
          "to",
          socket.id,
        );
        element.connection = socket.id;
        //io.sockets.emit("displayUser", user);
        found = true;
      }
    });
    if (!found) {
      console.log("adding client", user, "with socket", socket.id);
      game.clientList.push({name: user, connection: socket.id, role: ""});
      //io.sockets.emit("displayUser", "New User");
    }

    //The first user that connects sets the base cards
    if (game.boardState.length < 1) {
      console.log("state set to", state, playerOne);
      game.boardState = state;
      game.currentTurn = playerOne;
      console.log("Starting turn: ", game.currentTurn);
    } else {
      sendRoleState();
    }
  });

  socket.on("roleSelection", function(role, name) {
    setRoleAndName(socket.id, role, name);
    if (Object.values(game.roles).every((role) => role !== '')) {
      io.sockets.emit("allSelectedStatus");
    }
  });

  socket.on("button selected", function(state) {
    game.boardState = state;
    //io.sockets.emit("update hints", full_msg, msg);
    //socket.broadcast.emit("update hints", full_msg, msg);
    sendBoardUpdate();
  });

  socket.on("clue sent", function(clue) {
    //clueLog.push(clue);
    sendClueUpdate();
  });

  socket.on("hintSubmission", (sender, clue, amt) => {
    game.hints.push({sender: sender, clue: clue, amt: amt});
    io.sockets.emit("hintHistory", game.hints);
    if (amt !== 0) {
      game.guessesRemaining = amt + 1;
    } else {
      nextTurn();
    }
    nextTurn();

  });

  socket.on("guessed", word => {
    if (isTurn(socket.id)) {
      console.log("out of order");
    }
    if (game.currentTurn.endsWith("spymaster")) return;
    console.log(word);
    game.boardState.forEach(card => {
      if (card.word === word) {
        card.revealedColor = card.borderColor;
        if (game.currentTurn.startsWith("r") && card.borderColor === RED) {
          game.guessesRemaining--;
        } else if (game.currentTurn.startsWith("b") && card.borderColor ===
          BLU) {
          game.guessesRemaining--;
        } else {
          game.guessesRemaining = 0;
        }
        if (game.guessesRemaining === 0) {
          nextTurn();
        }
      }
    });
    sendBoardUpdate();
  });

  socket.on("startGame", function() {
    sendBoardUpdate();
    if (Object.values(game.roles).every((role) => role !== '')) {
      io.sockets.emit("closeModal");
      game.clientList.forEach(c => {
        if (c.role === game.currentTurn) {
          console.log("your turn: " + c.role);
          io.to(c.connection).emit("your turn");
        }
      });
    }
  });

  socket.on("resetRoles", () => {
    game.roleState = {
      bspymaster: "",
      rspymaster: "",
      bdetective: "",
      rdetective: "",
    };
    io.sockets.emit("resetRoles");
  });

  socket.on("nextTurn", nextTurn);

  socket.on("resetAll", resetVars);

});

function setRoleAndName(socketID, role, name) {
  if (game.roles[role] === "") {
    let client = game.clientList.filter((c) => c.connection === socketID)[0];
    client.role = role;
    client.name = name;
    game.roles[role] = socketID;
  }
  sendRoleState()
}

function getClient(role) {
  game.clientList.forEach(function(element) {
    if (element.role === role) {
      return element;
    }
  });
}

function getCurrentDate() {
  let currentDate = new Date();
  let day = (currentDate.getDate() < 10 ? "0" : "") + currentDate.getDate();
  let month =
    (currentDate.getMonth() + 1 < 10 ? "0" : "") +
    (currentDate.getMonth() + 1);
  let year = currentDate.getFullYear();
  let hour = (currentDate.getHours() < 10 ? "0" : "") + currentDate.getHours();
  let minute =
    (currentDate.getMinutes() < 10 ? "0" : "") + currentDate.getMinutes();
  let second =
    (currentDate.getSeconds() < 10 ? "0" : "") + currentDate.getSeconds();
  return (
    year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second
  );
}
