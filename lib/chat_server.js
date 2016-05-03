var socketio = require('socket.io'),
    io,
    guestNumber = 1,
    nickNames = {},
    namesUsed = [],
    currentRoom = {};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', { //event.emit from client
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room){
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', { room : room }); //event.emir from client
  socket.broadcast.to(room).emit('message', {
    text : nickNames[socket.id] + ' has joined the room' + room +  '.'
  });

  var usersInRoom = io.sockets.clients(room);
  if(usersInRoom.length > 1 ) {
    var usersInRoomSummary = 'Users currently in this room ' + room + ':';
    for(var index in usersInRoom) {
      userSocketId = usersInRoom[index].id;
      if(userSocketId != socket.id) {
        if (index > 1) {
          usersInRoomSummary = ';';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary = '.';
    socket.emit('message',  { text: usersInRoomSummary });
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed){
  socket.on('nameAttempt', function(name){
    if(name.indeOf('Guest') === 0 ) {
      socket.emit('nameResult', {
        success : false,
        message : "You can't use Guest name"
      });
    } else {
      if(namesUsed.indexOf(name) === -1) {
        var previusName = nickNames[socket.id];
        var previusNameIndex = namesUsed.indexOf(previusName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previusName];
        socket.emit('nameResult', {
          success : true,
          message : name
        });
        socket.broadcast.to(currentRoom[socket.id].emit('message',{
          text : previusName + 'is now known as:' + name + '.'
        }));
      } else {
          socket.emit('nameResult', {
            success: false,
            message : 'That name is already i use.'
          });
      }
    }
  });
}

function handleMessageBroadcasting(socket){
  socket.on('message',  function(socket){
    socket.broadcast.to(message.room).emit('message',{
      text : nickNames[socket.id] + ': ' + message.text
    });
  });
}

function handleRoomJoining(socket){
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  })
}

function handleClientDisconnection(socket){
  socket.on('disconnect', function(socket){
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}

exports.listen = function(server){
   io = socketio.listen(server);

   io.set('log level', 1);

   io.sockets.on('connection', function(socket){
     guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

     joinRoom(socket, 'Lobby');

     handleMessageBroadcasting(socket, nickNames);

     handleNameChangeAttempts(socket, nickNames, namesUsed);

     handleRoomJoining(socket);

     socket.on('rooms', function(){
      socket.emit('rooms', io.sockets.manager.rooms);
     });

     handleClientDisconnection(socket, nickNames, namesUsed);
   });
}
