//const http = require('http').createServer();

/*const io = require('socket.io')(http, {
    cors: { origin: "*" ,methods: ["GET", "POST"]}
});*/
const randomWords = require('random-words');
const io = require("socket.io")(process.env.PORT || 42630,{
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const waitingList = [];
let roomList = [];
let adminId = '';
let clients;
const sendWaitingListSize = () => {
    clients = io.sockets.adapter.rooms.get('waiting');
    clients !== undefined ? io.to(adminId).emit('waitingCount',clients.size) : io.to(adminId).emit('waitingCount', 0);
}

setInterval(() => {
    const allRooms = io.sockets.adapter.rooms;
    const newRoomList = [];
    allRooms.forEach((val,key) => {
        if (key.includes('room-')) {
            newRoomList.push(key.split('room-')[1]);
            //console.log(allRooms.get(key).size);
        }
        //key.includes('room-') && newRoomList.push(key.split('room-')[1])
    })
    roomList = newRoomList;
    io.to('waiting').emit('roomList',roomList)
},1000)

io.on('connection', (socket) => {
    const id = socket.id;
    waitingList.push(id)
    socket.join('waiting')
    io.to(id).emit('joined','you joined the list')
    if (adminId) {
        sendWaitingListSize();
    }
    setInterval(() => {
        socket.emit('keepAlive',true)
    },1000)
    socket.on('createRoom',() => {
        const roomCode = randomWords({ exactly: 3, join: '-' });
        io.to(id).emit('roomCode',roomCode);
        socket.join(`room-${roomCode}`);
    })
    socket.on('joinNewRoom',(data) => {
        console.log(data)
        socket.leave('waiting');
        socket.join(`room-${data}`)
    })
    socket.on('isAdmin', () => {
            socket.leave('waiting');
            const index = waitingList.indexOf(adminId)
            if (index) {
                waitingList.splice(index)
            }
            sendWaitingListSize();
    });
    socket.on('adminControl', (data) => {
        if (id !== adminId) {
            return;
        }
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
            sendWaitingListSize();
        }
    });

    socket.on('disconnect', () => {
        const index = waitingList.indexOf(id)
        if (index) {
            waitingList.splice(index)
        }
        if (id === adminId) {
            adminId = '';

        }
        socket.leave('players')
        socket.leave('waiting')
        if (adminId) {
            sendWaitingListSize();
        }
    });
});

//http.listen(process.env.PORT || 42630, () => console.log('listening') );
