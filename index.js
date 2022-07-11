const randomWords = require('random-words');
const io = require("socket.io")(process.env.PORT || 42630,{
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const waitingList = [];
let roomList = [];
let clients;
const roomPrefix = 'game-room-'

setInterval(() => {
    const allRooms = io.sockets.adapter.rooms;
    const newRoomList = [];
    allRooms.forEach((val,key) => {
        if (key.includes(roomPrefix)) {
            newRoomList.push({roomName: key.split(roomPrefix)[1], waitingSize:allRooms.get(key).size});
        }
    })
    roomList = newRoomList;
    io.to('waiting').emit('roomList',roomList);
    io.to('admins').emit('keepAlive');
},1000)

io.on('connection', (socket) => {
    const id = socket.id;
    const myRoomList = [];
    function joinARoom(roomName) {
        socket.join(roomName)
        myRoomList.push(roomName);
    }

    function leaveARoom(roomName) {
        socket.leave(roomName);
        myRoomList.splice(myRoomList.findIndex((room) => {
            return room === roomName;
        }),1);
    }
    waitingList.push(id)
    joinARoom('waiting');
    io.to(id).emit('joined','you joined the list')

    socket.on('getRoomCounts',(data) => {
        const roomSize = io.sockets.adapter.rooms.get(`${roomPrefix}${data}`)?.size - 1 || 0;
        io.to(id).emit('getRoomCounts',roomSize);
    })

    socket.on('createRoom',() => {
        const roomCode = randomWords({ exactly: 3, join: '-' });
        io.to(id).emit('roomCode',roomCode);
        console.log(myRoomList);
        leaveARoom('waiting');
        console.log(myRoomList);
        joinARoom(`${roomPrefix}${roomCode}`)
        joinARoom('admins')
        console.log(myRoomList);
    })

    socket.on('joinNewRoom',(data) => {
        socket.leave('waiting');
        socket.join(`${roomPrefix}${data}`)
    })

    /*socket.on('isAdmin', () => {
            socket.leave('waiting');
            const index = waitingList.indexOf(adminId)
            if (index) {
                waitingList.splice(index)
            }
            sendWaitingListSize();
    });*/

    socket.on('adminControl', (data) => {
        socket.to('players').emit('roomCode',data)
    });

    socket.on('addAllToPlayers', async (data) => {
        const clients = await io.in("waiting").fetchSockets();
        if (clients !== undefined) {
            clients.forEach(client => {
                console.log(client.id)
                client.leave('waiting');
                client.join('players');
                io.to(client.id).emit('hasBeenChosen',true);
            })
            io.to('players').to('waiting').emit('hostHasChosen', true);
        }
    });

    socket.on('disconnect', () => {
        const index = waitingList.indexOf(id)
        if (index) {
            waitingList.splice(index)
        }
        socket.leave('players')
        socket.leave('waiting')
    });
});

//http.listen(process.env.PORT || 42630, () => console.log('listening') );
