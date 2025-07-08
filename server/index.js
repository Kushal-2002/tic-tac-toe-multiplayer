const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // React default port
        methods: ["GET", "POST"]
    }
});

let players = {};
let currentTurn = "X";
let board = Array(9).fill("");

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    if (Object.keys(players).length < 2) {
        const symbol = Object.values(players).includes("X") ? "O" : "X";
        players[socket.id] = symbol;
        socket.emit("player-assign", symbol);
        io.emit("update-board", { board, currentTurn });
    } else {
        socket.emit("room-full");
        return;
    }
    socket.on("request-symbol", () => {
        if (players[socket.id]) {
            socket.emit("player-assign", players[socket.id]);
        }
    });
    socket.on("make-move", ({ index }) => {
        if (board[index] === "" && players[socket.id] === currentTurn) {
            board[index] = currentTurn;
            currentTurn = currentTurn === "X" ? "O" : "X";
            io.emit("update-board", { board, currentTurn });
            checkWinner();
        }
    });

    socket.on("restart", () => {
        board = Array(9).fill("");
        currentTurn = "X";
        io.emit("update-board", { board, currentTurn });
    });

    socket.on("disconnect", (reason) => {
        console.log(`A user disconnected: ${socket.id} | Reason: ${reason}`);

        delete players[socket.id];

        const playerCount = Object.keys(players).length;

        if (playerCount < 2) {
            board = Array(9).fill("");
            currentTurn = "X";
            io.emit("player-disconnected"); // notify remaining user
        }
    });

    function checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (let [a, b, c] of winPatterns) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                io.emit("game-over", { winner: board[a] });
                return;
            }
        }

        if (!board.includes("")) {
            io.emit("game-over", { winner: "draw" });
        }
    }
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));