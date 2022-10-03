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

            socket.on('throw-notify-dismiss', (data) => {
                console.log(`throw-notify-dismiss ${data}`)
                socket.broadcast.to(callId).emit('catch-notify-dismiss', data);
            });

            socket.on('throw-disable-notify-dismiss', () => {
                console.log(`throw-disable-notify-dismiss`)
                socket.broadcast.to(callId).emit('catch-disable-notify-dismiss');
            });

            socket.on('throw-enable-notify-dismiss', () => {
                console.log(`throw-enable-notify-dismiss`)
                socket.broadcast.to(callId).emit('catch-enable-notify-dismiss');
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