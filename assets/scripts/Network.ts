const socket = new WebSocket('ws://localhost:3000');
const handlers = new Map<string, (data?: any) => void>();

socket.onmessage = (e) => {
    let { event, data } = JSON.parse(e.data);
    handlers.get(event)?.(data);
};


const Net = {
    on: (event: string, cb: (data?: any) => void) => handlers.set(event, cb),
    off: (event: string) => handlers.delete(event),
    emit: (event: string, data?: any) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ event, data }))
    }
};
export default Net;