import React from "react";
import Modal from "react-modal";
import shortid from "shortid";
import "./App.css";

import socketIOClient from "socket.io-client";
import {SSL_OP_SINGLE_DH_USE} from "constants";

const socket = socketIOClient("localhost:8080");

const RED = "#ff6666";
const BLU = "#4d79ff";
//would normally come from database but this is for testing
//list of ALL words
let allReady = false;
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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalOpen: true,
      selectedRole: "",
      username: "",
      roleIsAvailable: {
        rspymaster: true,
        rdetective: true,
        bspymaster: true,
        bdetective: true,
      },

    };

    console.log("App");
    socket.on("closeModal", this.closeModal.bind(this));
    socket.on("updatedRoles", (roles, selectedRole) => {
      this.setState({roleIsAvailable: roles, selectedRole: selectedRole});
    });
  }

  closeModal() {
    this.setState({modalOpen: false});
  }

  selectRole(role, name) {
    socket.emit("roleSelection", role, name);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div>
            <h1>Codenames</h1>
            <div id="yourTeam"></div>
          </div>
          <Modals/>
        </header>
        {this.state.modalOpen && (
          <Menu selectRole={this.selectRole.bind(this)}
                roleIsAvailable={this.state.roleIsAvailable}/>
        )}
        <Game selectedRole={this.state.selectedRole}/>
        <div className="test1">
          <button className="Reset"
                  onClick={() => socket.emit("resetAll")}>RESET
          </button>
        </div>
      </div>
    );
  }
}

class Menu extends React.Component {
  constructor(props) {
    super(props);

    this.selectRole = props.selectRole;
    this.state = {
      modalIsOpen: true,
      readyToPlay: false,
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    socket.on("allSelectedStatus", () => {
      this.setState({readyToPlay: true});
    });
  }

  openModal() {
    this.setState({modalIsOpen: true});
  }

  closeModal() {
    this.setState({modalIsOpen: false});
  }

  render() {
    return (
      <div className="codenames">
        <div className="modal-menu">
          <Modal
            shouldCloseOnOverlayClick={false}
            isOpen={this.state.modalIsOpen}
            onRequestClose={this.closeModal}
            style={{content: {backgroundColor: "#282c34", padding: 0}}}
          >
            <div id="myModal" className="modal">
              <div className="modal-content">
                <div className="modal-header-menu">
                  <div>Codenames</div>
                </div>
                <div className="modal-body-menu">
                  <input
                    placeholder="Username"
                    id="menuName"
                    autoComplete="off"
                    onChange={(e) => this.setState({username: e.target.value})}
                  />
                  <img
                    className="center"
                    src="detective.png"
                    alt="Trulli"
                    width="270"
                    height="333"
                  />
                  <button
                    className="role red"
                    id="rspymaster"
                    disabled={!this.props.roleIsAvailable.rspymaster}
                    onClick={() => {
                      this.selectRole("rspymaster", this.state.username);
                    }}
                  >
                    Red Team Spymaster
                  </button>
                  <button
                    className="role blue"
                    id="bspymaster"
                    disabled={!this.props.roleIsAvailable.bspymaster}
                    onClick={() => this.selectRole("bspymaster",
                      this.state.username)}
                  >
                    Blue Team Spymaster
                  </button>
                  <button
                    className="role red"
                    id="rdetective"
                    disabled={!this.props.roleIsAvailable.rdetective}
                    onClick={() => this.selectRole("rdetective",
                      this.state.username)}
                  >
                    Red Team Detective
                  </button>
                  <button
                    className="role blue"
                    id="bdetective"
                    disabled={!this.props.roleIsAvailable.bdetective}
                    onClick={() => this.selectRole("bdetective",
                      this.state.username)}
                  >
                    Blue Team Detective
                  </button>
                  <button
                    id="playBtn"
                    disabled={!this.state.readyToPlay}
                    className="status play"
                    onClick={() => socket.emit("startGame")}
                  >
                    Play
                  </button>
                  <button className="status reset" onClick={() => resetMenu(this)}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    );
  }
}

Modal.setAppElement("#root");

class Modals extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalIsOpen: false,
    };

    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  openModal() {
    this.setState({modalIsOpen: true});
  }

  closeModal() {
    this.setState({modalIsOpen: false});
  }

  render() {
    return (
      <div>
        <button className="modalButton" onClick={this.openModal}>
          i
        </button>
        <Modal isOpen={this.state.modalIsOpen} onRequestClose={this.closeModal}>
          <div id="myModal" className="modal">
            <div className="modal-content">
              <span className="close" onClick={this.closeModal}>
                &times;
              </span>
              <br/>
              <br/>
              <div className="modal-header">
                <div>How to Play:</div>
                <br/>
              </div>
              <div className="modal-body">
                <img
                  className="spyImage"
                  src="spy.png"
                  width="270"
                  height="333"
                />
                <p>
                  On the board there are 25 tiles, each of which have the
                  codename of different secret agent. Each agent is either a
                  blue team agent, red team agent, a civilian, or the assassin.
                  The game is played with two teams, a red team and a blue team.
                  Both teams have one spymaster and one detective.
                  <br/>
                  <br/>
                  At the beginning of the game, only the spymasters can see the
                  position of the agents (displayed by the border of the cards).
                  The spymasters will each take turns giving clues to their
                  team's detective on which agents belong to their team. These
                  clues will include a one word hint and the amount of agents
                  that the hint relates to. The detective will then guess which
                  word the clue relates to by clicking on a codename tile. If
                  the detective guesses correctly then they will be able to
                  continue guessing until they have guessed the amount specified
                  by the spymaster. If the detective's guesses are all correct,
                  they will get a free guess which they can choose to make or
                  pass. If the detective guesses incorrectly it becomes the
                  other teams turn. If any detective guesses the assassin then
                  their team atomatically loses the game.
                  <br/>
                  <br/>A team wins the game if their detective can find all of
                  their team's agents or if the other team accidentally finds
                  the assassin. Good Luck!
                </p>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}

class Card extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      word: this.props.word,
      borderColor: this.props.border,
    };
  }

  render() {
    return (
      <div className="button card" onClick={() => socket.emit("guessed", this.props.value)} >
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 80">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="black">{this.props.value}</text>
        </svg>
      </div>
    );
  }
}

class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      log: [],
      clue: "",
    };
    socket.on("hintHistory", hints => {
      this.setState({log: hints});
    });
  }

  submitHint(amount) {
    if (this.state.clue === "") {
      return;
    }
    socket.emit("hintSubmission", this.props.role, this.state.clue, amount);
  }

  createAmounts() {
    let table = [];
    for (let i = 0; i < 10; i++) {
      table.push(
        <div
          key={i}
          onClick={() => this.submitHint(i)}
          className={"amount" + (i <= this.props.wordsLeft ? "" : " disabled")}
        >
          {i}
        </div>,
      );
    }
    return table;
  }

  render() {
    return (
      <div className="chat">
        <div className="chat-container">
          <div className="log">
            {this.state.log.map((hint, index) => {
              return (
                <div key={index} className="clue"
                     style={{color: hint.sender.startsWith("r") ? RED : BLU}}>
                  {hint.clue} : {hint.amt}
                </div>
              );
            })}
          </div>
          {this.props.role.endsWith("spymaster") && (
            <div className={"hintSubmission"}>
              <input
                placeholder="Clue"
                onChange={e => this.setState({clue: e.target.value})}
                id="msg"
              />
              <div className={"amountInput"}>{this.createAmounts()}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

class Board extends React.Component {

  renderCard(card) {
    return (
      <Card
        key={shortid.generate()}
        value={card.word}
        border={card.borderColor}
        revealedColor={card.revealedColor}
      />
    );
  }

  render() {
    return (
      <div key={shortid.generate()} className="board">
        {[0, 1, 2, 3, 4].map(n => {
          return (
            <div key={shortid.generate()} className="board-row">
              {" "}
              {[0, 1, 2, 3, 4].map(m => {
                return this.renderCard(this.props.cards[n * 5 + m]);
              })}
            </div>
          );
        })}
      </div>
    );
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    let firstteam = Math.floor(Math.random() * 2);
    this.state = {
      cards: setBoard(firstteam),
      redLeft: firstteam === 0 ? 9 : 8,
      bluLeft: firstteam === 1 ? 9 : 8,
      firstteam: firstteam,
      disabled: true,
    };
    socket.on("updateBoardState", (bs, redLeft, bluLeft) => {
      console.log("Received update board state");
      console.log(bs);
      this.setState({cards: bs, redLeft: redLeft, bluLeft: bluLeft});
    });
    socket.on("lockup", () => {
      //banner to other player name
      this.setState({disabled: true});
    });
    socket.on("your turn", lastTurnData => {
      this.setState({disabled: false});
    });
  }

  render() {
    return (
      <div className={"game" + (this.state.disabled ? " disabled-events" : "")}>
        <Board cards={this.state.cards}/>
        <Chat role={this.props.selectedRole}
              wordsLeft={this.props.selectedRole.startsWith("r") ?
                this.state.redLeft :
                this.state.bluLeft}/>
        <br/>
        <br/>
      </div>
    );
  }
}

function makeGray(btn, selected) {
  let redspy = document.getElementById("rspymaster");
  let reddet = document.getElementById("rdetective");
  let bluespy = document.getElementById("bspymaster");
  let bluedet = document.getElementById("bdetective");
  bluespy.disabled = true;
  redspy.disabled = true;
  reddet.disabled = true;
  bluedet.disabled = true;

  let b = document.getElementById(btn);
  let teamColor = b.style.backgroundColor;
  let roleData = b.innerHTML.split("Team");
  b.style.backgroundColor = "gray";
  b.style.borderColor = "gold";
  selected.state.selectedRole = btn;
  selected.selectRole(btn);

  let nameInput = document.getElementById("menuName");
  let name = nameInput.value || selected.state.selectedRole;
  nameInput.disabled = true;
  sessionStorage.setItem("userInfo", name);
  socket.emit("roleSelection", selected.state.selectedRole, name);

  let whoYouAre = document.getElementById("yourTeam");
  console.log(teamColor);
  whoYouAre.style.backgroundColor = getColor(roleData[0]);
  whoYouAre.innerHTML = name + " (<i>" + roleData[1] + "</i> )";
}

function getColor(color) {
  if (color === "Blue ") {
    console.log("blue");
    return BLU;
  } else {
    return RED;
  }
}

function resetMenu(play) {
  let redspy = document.getElementById("rspymaster");
  let reddet = document.getElementById("rdetective");
  let bluespy = document.getElementById("bspymaster");
  let bluedet = document.getElementById("bdetective");
  redspy.style.backgroundColor = "#ff6666";
  redspy.style.borderColor = "black";
  redspy.disabled = false;
  bluespy.style.backgroundColor = "#4d79ff";
  bluespy.style.borderColor = "black";
  bluespy.disabled = false;
  reddet.style.backgroundColor = "#ff6666";
  reddet.style.borderColor = "black";
  reddet.disabled = false;
  bluedet.style.backgroundColor = "#4d79ff";
  bluedet.style.borderColor = "black";
  bluedet.disabled = false;

  socket.emit("resetRoles");
}

function closeMenu(play) {
  let u = document.getElementById("menuName");
  let redspy = document.getElementById("rspymaster");
  let reddet = document.getElementById("rdetective");
  let bluespy = document.getElementById("bspymaster");
  let bluedet = document.getElementById("bdetective");
  let username = u.value;
  if (allReady) {
    play.closeModal();
    socket.emit("startGame");
  }
}

//takes full list of words and picks 25 unique for a game
function setBoard(order) {
  let cards = [];

  //for setting board words
  for (let i = 0; i < 25; i++) {
    cards[i] = {revealedColor: "whitesmoke"};
    let useCheck = false;
    let counter = Math.floor(Math.random() * allWords.length);
    for (let j = 0; j < cards.length; j++) {
      if (cards[j].word === allWords[counter]) {
        useCheck = true;
      }
    }
    if (!useCheck) {
      cards[i].word = allWords[counter];
    } else {
      i--;
    }
  }
  //for words to teams
  setTeam(RED, order);

  setTeam(BLU, order);

  setTeam("black", order);

  setTeam("tan", order);

  function setTeam(type, order) {
    let amount = 7;
    if (type === "black") {
      amount = 1;
    }
    if ((order === 0 && type === RED) || (order === 1 && type === BLU)) {
      amount += 2;
    } else if (
      (order === 1 && type === RED) ||
      (order === 0 && type === BLU)
    ) {
      amount++;
    }

    for (let j = 0; j < amount; j++) {
      let counter = Math.floor(Math.random() * 25);
      if (cards[counter].borderColor == null) {
        cards[counter].borderColor = type;
      } else {
        j--;
      }
    }
  }

  socket.emit("setInitState", cards, getBrowserData(),
    order === 0 ? "rspymaster" : "bspymaster");
  return cards;
}

//send out message to set initial state if it hasnt already
window.onload = function() {
  console.log("the sessionstorage: ", sessionStorage.getItem("userInfo"));
};

function getBrowserData() {
  return {user: sessionStorage.getItem("userInfo") || "USER" + Math.random()};
}

function getBoardState() {
  let cards = [];
  let collectedCards = document.getElementsByClassName("card");
  const NUM_CARDS_ROW = 5;
  for (let i = 0; i < NUM_CARDS_ROW; i++) {
    for (let j = 0; j < NUM_CARDS_ROW; j++) {
      let selCard = collectedCards[i * NUM_CARDS_ROW + j];
      if (selCard) {
        cards[i * NUM_CARDS_ROW + j] = {
          word: selCard.innerHTML,
          revealedColor: selCard.style.backgroundColor,
          borderColor: selCard.style.borderColor,
        };
      }
    }
  }
  return cards;
}

socket.on("allSelectedStatus", function(status) {
  if (status) {
    allReady = true;
    document.getElementById("playBtn").classList.add("good-to-go");
  }
});

socket.on("updateRoleState", function(rs) {
  for (let role in rs) {
    if (rs.hasOwnProperty(role) && rs[role]) {
      console.log("greying role", role);
      let button = document.getElementById(role);
      button.style.backgroundColor = "grey";
      button.disabled = true;
    }
  }
});

socket.on("resetRoles", () => {
  let redspy = document.getElementById("rspymaster");
  let reddet = document.getElementById("rdetective");
  let bluespy = document.getElementById("bspymaster");
  let bluedet = document.getElementById("bdetective");

  redspy.style.backgroundColor = "#ff6666";
  redspy.style.borderColor = "black";
  redspy.disabled = false;
  bluespy.style.backgroundColor = "#4d79ff";
  bluespy.style.borderColor = "black";
  bluespy.disabled = false;
  reddet.style.backgroundColor = "#ff6666";
  reddet.style.borderColor = "black";
  reddet.disabled = false;
  bluedet.style.backgroundColor = "#4d79ff";
  bluedet.style.borderColor = "black";
  bluedet.disabled = false;

  document.getElementById("menuName").disabled = false;

  allReady = false;
  document.getElementById("playBtn").classList.remove("good-to-go");
});

export default App;
