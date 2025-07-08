import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

// ✅ Keep socket outside the component — runs once
const socket = io("http://localhost:3000");

function App() {
    const [board, setBoard] = useState(Array(9).fill(""));
    const [player, setPlayer] = useState(null);
    const [turn, setTurn] = useState("X");
    const [status, setStatus] = useState("Waiting for opponent...");
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        // ✅ Set up socket listeners
        socket.on("player-assign", (symbol) => {
            setPlayer(symbol);
            setStatus(`You are Player ${symbol}`);
            setConnected(true); // ✅ mark connected once assigned
        });

        socket.on("update-board", ({ board, currentTurn }) => {
            setBoard(board);
            setTurn(currentTurn);
            setGameOver(false);

            // 👇 Fix: if we haven't been assigned a symbol, assign now
            if (!player) {
                socket.emit("request-symbol"); // custom event
            }
        });

        socket.on("game-over", ({ winner }) => {
            setGameOver(true);
            setStatus(winner === "draw" ? "It's a draw!" : `${winner} wins!`);
        });

        socket.on("player-disconnected", () => {
            // ✅ Only react to disconnect if already connected before
            if (connected) {
                setStatus("Opponent left the game.");
                setGameOver(true);
                setConnected(false);
            }
        })

        socket.on("room-full", () => {
            setStatus("Room is full. Try again later.");
        });

        // ✅ Cleanup only listeners, NOT socket connection
        return () => {
            socket.off("player-assign");
            socket.off("update-board");
            socket.off("game-over");
            socket.off("player-disconnected");
            socket.off("room-full");
        };
    }, []);

    const handleClick = (i) => {
        if (board[i] !== "" || turn !== player || gameOver) return;
        socket.emit("make-move", { index: i });
    };

    const restart = () => {
        socket.emit("restart");
    };

    return (
        <div className="container">
            <h1>Tic Tac Toe</h1>
            <p className="status">{status}</p>
            <div className="board">
                {board.map((cell, i) => (
                    <div key={i} className="cell" onClick={() => handleClick(i)}>
                        {cell}
                    </div>
                ))}
            </div>
            {gameOver && <button onClick={restart} className="restart-btn">Restart</button>}
        </div>
    );
}

export default App;
