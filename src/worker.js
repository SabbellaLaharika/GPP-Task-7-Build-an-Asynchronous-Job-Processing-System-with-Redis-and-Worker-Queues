console.log('Worker started...');

// Keep process alive for now
setInterval(() => {
    console.log('Worker heartbeat');
}, 60000);
