//const http = require('http').createServer();

const io = require('socket.io')(4444, {
    cors: { origin: "*" ,methods: ["GET", "POST"]}
});
const waitingList = [];
let adminId = '';
let clients;
const sendWaitingListSize = () => {
    clients = io.sockets.adapter.rooms.get('waiting');
    clients !== undefined ? io.to(adminId).emit('waitingCount',clients.size) : io.to(adminId).emit('waitingCount', 0);
}

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
    },10000)
    /*setTimeout(() => {
        io.to(id).emit('hasBeenChosen',true);
        socket.leave('waiting');
        socket.join('players');
        socket.emit('hostHasChosen', true)
    },2000)*/
    socket.on('isAdmin', () => {
        if (adminId === '') {
            socket.leave('waiting');
            adminId = id;
            const index = waitingList.indexOf(adminId)
            if (index) {
                waitingList.splice(index)
            }
            io.to(adminId).emit('youAreAdmin',true)
            sendWaitingListSize();
        }
        else {
            io.to(id).emit('youAreAdmin',false)
        }
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

//http.listen(42630, () => console.log('listening on http://localhost:42630') );
