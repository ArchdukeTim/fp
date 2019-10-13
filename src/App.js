import React from "react";
import Modal from "react-modal";
import shortid from "shortid";
import "./App.css";

import io from "socket.io-client";

const socket = io();

const RED = "#ff6666";
const BLU = "#4d79ff";
//would normally come from database but this is for testing
//list of ALL words

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      menuOpen: true,
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
    socket.on("closeModal", this.closeMenu.bind(this));
    socket.on("updatedRoles", (roles, selectedRole) => {
      this.setState({roleIsAvailable: roles, selectedRole: selectedRole});
    });
  }

  closeMenu() {
    this.setState({menuOpen: false});
  }

  updateUsername(username) {
    this.setState({username: username});
  }

  selectRole(role) {
    if (this.state.selectedRole === role) {
      // User is clicking their role again
      socket.emit("roleSelection", "");
    } else {
      socket.emit("roleSelection", role);
    }
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div>
            <h1>Codenames</h1>
            {!this.state.menuOpen ?
              <div id="yourTeam">{this.state.selectedRole}</div> :
              null}
          </div>
          <Modals/>
        </header>
        {this.state.menuOpen ?
          <Menu selectedRole={this.state.selectedRole}
                selectRole={this.selectRole.bind(this)}
                updateUsername={this.updateUsername.bind(this)}
                roleIsAvailable={this.state.roleIsAvailable}/>
          : <Game selectedRole={this.state.selectedRole}
                  username={this.state.username}/>}
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
      console.log("all selected");
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
      <div className="menu-body">
        <input
          placeholder="Username"
          id="menuName"
          autoComplete="off"
          onBlur={(e) => this.props.updateUsername(e.target.value)}
        />
        <img
          src="detective.png"
          alt="Trulli"
          width="270"
          height="333"
        />
        <div className="roleSelector">
          <button
            className={"role red" +
            (this.props.selectedRole === "rspymaster" ? " selected" : "")}
            id="rspymaster"
            disabled={!this.props.roleIsAvailable.rspymaster &&
            this.props.selectedRole !== "rspymaster"}
            onClick={() => {
              this.selectRole("rspymaster");
            }}
          >
            Red Spymaster
          </button>
          <button
            className={"role blue" +
            (this.props.selectedRole === "bspymaster" ? " selected" : "")}
            id="bspymaster"
            disabled={!this.props.roleIsAvailable.bspymaster &&
            this.props.selectedRole !== "bspymaster"}
            onClick={() => this.selectRole("bspymaster")}
          >
            Blue Spymaster
          </button>
          <button
            className={"role red" +
            (this.props.selectedRole === "rdetective" ? " selected" : "")}
            id="rdetective"
            disabled={!this.props.roleIsAvailable.rdetective &&
            this.props.selectedRole !== "rdetective"}
            onClick={() => this.selectRole("rdetective")}
          >
            Red Detective
          </button>
          <button
            className={"role blue" +
            (this.props.selectedRole === "bdetective" ? " selected" : "")}
            id="bdetective"
            disabled={!this.props.roleIsAvailable.bdetective &&
            this.props.selectedRole !== "bdetective"}
            onClick={() => this.selectRole("bdetective")}
          >
            Blue Detective
          </button>
        </div>
        <div className="statusButtons">
          <button
            id="playBtn"
            disabled={!this.state.readyToPlay}
            className="status play"
            onClick={() => socket.emit("startGame")}
          >
            Play
          </button>
          <button className="status reset">
            Reset
          </button>
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
      <div className="button card" style={{
        backgroundColor: this.props.revealedColor,
        borderColor: this.props.border,
      }} onClick={() => socket.emit("guessed", this.props.value)}>
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
             viewBox="0 0 100 80">
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                fill="black">{this.props.value}</text>
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
        {this.props.cards.map(card => {
          return this.renderCard(card);
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
      cards: [],
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

        <button className="Reset"
                onClick={() => socket.emit("resetAll")}>RESET
        </button>
      </div>
    );
  }
}

function getBrowserData() {
  return {user: sessionStorage.getItem("userInfo") || "USER" + Math.random()};
}

export default App;
