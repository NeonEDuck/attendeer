export default function(io) {
    io.on('connection', (socket) => {
        socket.on('join-call', (classId, userId) => {
            console.log(`join-call ${classId} ${userId}`)
            socket.join(classId);
            socket.broadcast.to(classId).emit('user-connected', socket.id, userId);

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
                socket.broadcast.to(classId).emit('catch-notify-dismiss', data);
            });

            socket.on('throw-disable-notify-dismiss', () => {
                console.log(`throw-disable-notify-dismiss`)
                socket.broadcast.to(classId).emit('catch-disable-notify-dismiss');
            });

            socket.on('throw-enable-notify-dismiss', () => {
                console.log(`throw-enable-notify-dismiss`)
                socket.broadcast.to(classId).emit('catch-enable-notify-dismiss');
            });

            socket.on('throw-dismiss-class', (data) => {
                console.log(`throw-dismiss-class`)
                socket.broadcast.to(classId).emit('catch-dismiss-class', data);
            });

            socket.on('throw-request-status', () => {
                console.log(`throw-request-status`)
                socket.broadcast.to(classId).emit('catch-request-status', socket.id);
            });

            socket.on('throw-inform-status', (socketId, data) => {
                console.log(`throw-inform-status`)
                socket.to(socketId).emit('catch-inform-status', data);
            });

            socket.on('throw-alert-start', (recordId) => {
                console.log(`throw-alert-start`)
                socket.broadcast.to(classId).emit('catch-alert-start', recordId);
            });

            socket.on('throw-text-message', (messageId) => {
                console.log(`throw-text-message`)
                socket.to(socket.id).emit('catch-text-message', messageId);
                socket.broadcast.to(classId).emit('catch-text-message', messageId);
            });

            socket.on('disconnect', () => {
                socket.broadcast.to(classId).emit('user-disconnected', userId);
            });

            socket.on('leave-call', () => {
                socket.broadcast.to(classId).emit('user-disconnected', userId);
            });
        });
    });
};