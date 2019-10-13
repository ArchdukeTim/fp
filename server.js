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
const io = require("socket.io")(server);
const port = process.env.PORT || 8080;
const RED = "#ff6666";
const BLU = "#4d79ff";
io.use(sharedsession(session));

app.use(logger("dev"));
app.use(session);
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "build")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build/index.html"));
});

module.exports = app;

let allWords = [
  "wall",
  "back",
  "orange",
  "crash",
  "hawk",
  "kiwi",
  "lab",
  "ice cream",
  "india",
  "theater",
  "plane",
  "parachute",
  "telescope",
  "match",
  "police",
  "post",
  "ray",
  "kid",
  "wind",
  "box",
  "knife",
  "church",
  "bell",
  "lemon",
  "triangle",
  "cap",
  "jam",
  "organ",
  "engine",
  "agent",
  "buck",
  "day",
  "doctor",
  "ball",
];
///connections and usages
let game = {
  clientList: [],
  boardState: [],
  hints: [],
  _roles: new Proxy({
    bspymaster: "",
    rspymaster: "",
    bdetective: "",
    rdetective: "",
  }, {
    set: (obj, prop, value) => {
      obj[prop] = value;
      sendRoleState();
    },
  }),
  get roles() {
    return this._roles;
  },
  set roles(roles) {
    this._roles = roles;
    sendRoleState();
  },
  currentTurn: null,
  guessesRemaining: 0,
};
function generateGame() {
  //for setting board words
  for (let i = 0; i < 25; i++) {
    game.boardState[i] = {revealedColor: "whitesmoke"};
    let useCheck = false;
    let counter = Math.floor(Math.random() * allWords.length);
    for (let j = 0; j < game.boardState.length; j++) {
      if (game.boardState[j].word === allWords[counter]) {
        useCheck = true;
      }
    }
    if (!useCheck) {
      game.boardState[i].word = allWords[counter];
    } else {
      i--;
    }
  }
  //for words to teams
  if (Math.floor(Math.random() * 2) === 0) {
    setTeam(RED, 9);
    setTeam(BLU, 8);
    game.currentTurn = "rspymaster";
  } else {
    setTeam(RED, 8);
    setTeam(BLU, 9);
    game.currentTurn = "bspymaster";
  }
  setTeam("black", 1);
  setTeam("tan", 7);

  function setTeam(color, amount) {
    for (let j = 0; j < amount; j++) {
      let index = Math.floor(Math.random() * game.boardState.length);
      if (game.boardState[index].borderColor == null) {
        game.boardState[index].borderColor = color;
      } else {
        j--;
      }
    }
  }
}
generateGame();

function resetVars() {
  game = {
    clientList: [],
    boardState: [],
    hints: [],
    _roles: new Proxy({
      bspymaster: "",
      rspymaster: "",
      bdetective: "",
      rdetective: "",
    }, {
      set: (obj, prop, value) => {
        obj[prop] = value;
        sendRoleState();
      },
    }),
    get roles() {
      return this._roles;
    },
    set roles(roles) {
      this._roles = roles;
      sendRoleState();
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

function sendRoleState() {
  game.clientList.forEach((client) => {
    io.to(client.connection)
    // Boolean list representing available roles
      .emit("updatedRoles", Object.keys(game.roles).reduce((result, key) => {
        result[key] = game.roles[key] === "";
        return result;
      }, {}), client.role);
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
    console.log(c);
    if (c.role.endsWith("spymaster")) {
      io.to(c.connection)
        .emit("updateBoardState", game.boardState, redLeft, bluLeft);
    } else {
      io.to(c.connection)
        .emit("updateBoardState", detectiveList, redLeft, bluLeft);
    }
  });
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
  game.clientList.push({name: "", connection: client.id, role: ""});
  console.log("all clients", game.clientList);
  client.send(client.id);
});

io.on("connection", function(socket) {
  console.log(socket.id, "connected");
  sendRoleState();
  socket.on("disconnect", () => {
    console.log("disconnecting", socket.id);
    let client = game.clientList.filter(
      (client) => client.connection === socket.id)[0];
    if (client.role) {
      game.roles[client.role] = "";
    }
    game.clientList = game.clientList.filter(
      (client) => client.connection !== socket.id);
    if (game.clientList.length === 0) {
      resetVars();
      generateGame();
    }
  });

  socket.on("setInitState", function(state, browserCache, playerOne) {
    console.log("session for: ", browserCache, "socket", socket.id);
    let found = false;
    game.clientList.forEach(function(client) {
      if (client.connection === socket.id) {
        found = true;
      }
    });
    if (!found) return;

    //The first user that connects sets the base cards
    if (game.boardState.length < 1) {
      console.log("state set to", state, playerOne);
      game.boardState = state;
      game.currentTurn = playerOne;
    }
  });

  socket.on("roleSelection", function(role) {
    setRole(socket.id, role);
    if (Object.values(game.roles).every((role) => role !== "")) {
      io.sockets.emit("allSelectedStatus");
    }
  });

  socket.on("button selected", function(state) {
    game.boardState = state;
    //io.sockets.emit("update hints", full_msg, msg);
    //socket.broadcast.emit("update hints", full_msg, msg);
    sendBoardUpdate();
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
    if (Object.values(game.roles).every((role) => role !== "")) {
      io.sockets.emit("closeModal");
      sendBoardUpdate();
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

function setRole(socketID, role) {
  let client = game.clientList.filter((c) => c.connection === socketID)[0];

  if (!client) {
    console.log("no client");
    return;
  }

  // clear old role
  if (client.role) {
    game.roles[client.role] = "";
    client.role = "";
  }

  if (role === "") {
    // clearing role selection for user
    client.role = "";
    game.roles[role] = "";
  } else {
    if (game.roles[role] === "") {
      client.role = role;
      game.roles[role] = socketID;
    }
  }
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

server.listen(port);
