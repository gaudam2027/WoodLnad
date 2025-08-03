const registerSocketEvents = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Admin Events
    socket.on('register-admin', () => {
      socket.join('admins');
      console.log('Admin joined room: admins');
    });

    socket.on('user-logged-or-signedup', ({ username }) => {
      io.to('admins').emit('notify-admin', { message: `${username} has logged in.` });
    });

    // User Events
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('some-user-event', (data) => {
      // handle other user events here
    });

    socket.on('stock-update', ({ productId, remainingStock }) => {
      // Broadcast to all clients except the one who sent it
      socket.broadcast.emit('updateStock', { productId, remainingStock });
    });

    // Shared Events
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};

module.exports = {registerSocketEvents}
