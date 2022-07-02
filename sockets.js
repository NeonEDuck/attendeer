export default function(io) {
    io.on('connection', (socket) => {
        socket.on('join-call', (callId, userId) => {
            console.log(`join-call ${callId} ${userId}`)
            socket.join(callId);
            socket.broadcast.to(callId).emit('user-connected', socket.id, userId);

            socket.on('throw-offer', (socketId, data) => {
                console.log(`throw-offer ${socketId} ${data}`)
                socket.to(socketId).emit('catch-offer', socket.id, data);
            });

            socket.on('throw-answer', (socketId, data) => {
                console.log(`throw-answer ${socketId} ${data}`)
                socket.to(socketId).emit('catch-answer', socket.id, data);
            });

            socket.on('throw-candidate', (socketId, data) => {
                console.log(`throw-candidate ${socketId} ${data}`)
                socket.to(socketId).emit('catch-candidate', data);
            });

            socket.on('disconnect', () => {
                socket.broadcast.to(callId).emit('user-disconnected', userId);
            });

            socket.on('leave-call', () => {
                socket.broadcast.to(callId).emit('user-disconnected', userId);
            });
        });
    });
};