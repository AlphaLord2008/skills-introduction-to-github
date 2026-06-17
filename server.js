const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const users = {}; // socket.id -> { lat, lon, role, name, charger, battery }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (data) => {
    users[socket.id] = {
      id: socket.id,
      lat: data.lat,
      lon: data.lon,
      role: data.role, // 'seeker' or 'helper'
      name: data.name || 'Anonymous',
      charger: data.charger || 'USB-C',
      battery: data.battery || null,
      avatar: data.avatar || '⚡'
    };
    io.emit('users_update', Object.values(users));
  });

  socket.on('location_update', (data) => {
    if (users[socket.id]) {
      users[socket.id].lat = data.lat;
      users[socket.id].lon = data.lon;
      io.emit('users_update', Object.values(users));
    }
  });

  socket.on('offer_help', (data) => {
    io.to(data.targetId).emit('help_offered', {
      fromId: socket.id,
      fromName: users[socket.id]?.name || 'Someone',
      charger: users[socket.id]?.charger
    });
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('users_update', Object.values(users));
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ChargeLink server running on port ${PORT}`));
