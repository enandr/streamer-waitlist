const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const waitingList = [];
io.on('connection', (socket) => {
    const id = socket.id;
    console.log(id);
    waitingList.push(id)
    console.log(waitingList)
    setTimeout(() => {
        io.to(id).emit('joined','you joined the list')
    },2000)


    socket.on('message', (message) =>     {
        console.log(message);
        io.emit('message', `${socket.id.substr(0,2)} said ${message}` );
    });
});
io.on('disconnect', (socket) => {
    console.log('a user disconnected');
});

http.listen(8080, () => console.log('listening on http://localhost:8080') );
